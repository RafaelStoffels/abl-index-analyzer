// src/services/ablAnalyzer.ts
import JSZip from "jszip";
import type { UploadedFile } from "../types";

export type StatementType =
  | "FOR EACH"
  | "FOR FIRST"
  | "FOR LAST"
  | "FIND"
  | "FIND FIRST"
  | "FIND LAST";

export type AnalyzedStatement = {
  type: StatementType;
  table: string;
  line: number;
  raw: string;
  usedFields?: string[];
};

export type FileAnalysis = {
  fileName: string;
  statements: AnalyzedStatement[];
};

export function isSourceFile(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.endsWith(".p") ||
    lower.endsWith(".w") ||
    lower.endsWith(".i") ||
    lower.endsWith(".cls")
  );
}

export function isZipFile(name: string): boolean {
  return name.toLowerCase().endsWith(".zip");
}

export function extractStatementsFromSource(source: string): AnalyzedStatement[] {
  const results: AnalyzedStatement[] = [];
  const text = source;

  const forRegex =
    /\bFOR\s+(EACH|FIRST|LAST)\s+([A-Za-z0-9_\-]+)[^\r\n]*/gi;

  const findRegex =
    /\bFIND\s+(FIRST|LAST)?\s*([A-Za-z0-9_\-]+)[^\r\n]*/gi;

  // CAN-FIND ( FIRST tabela WHERE ... ) ou CAN-FIND (tabela WHERE ...)
  const canFindRegex =
    /\bcan-find\s*\(\s*(?:first\s+)?([A-Za-z0-9_\-]+)\s+where\s+([\s\S]*?)\)/gi;

  let match: RegExpExecArray | null;

  const getLineNumber = (index: number) => {
    const before = text.slice(0, index);
    return before.split(/\r\n|\r|\n/).length;
  };

  // ---------------------------
  // FOR EACH / FIRST / LAST
  // ---------------------------
  while ((match = forRegex.exec(text)) !== null) {
    const kind = match[1].toUpperCase();
    const table = match[2];
    const full = match[0].trim();
    const line = getLineNumber(match.index);

    let type: StatementType = "FOR EACH";
    if (kind === "FIRST") type = "FOR FIRST";
    if (kind === "LAST") type = "FOR LAST";

    results.push({ type, table, line, raw: full });
  }

  // ---------------------------
  // FIND / FIND FIRST / LAST
  // ---------------------------
  while ((match = findRegex.exec(text)) !== null) {
    const kind = (match[1] || "").toUpperCase();
    const table = match[2];
    const full = match[0].trim();
    const line = getLineNumber(match.index);

    let type: StatementType = "FIND";
    if (kind === "FIRST") type = "FIND FIRST";
    if (kind === "LAST") type = "FIND LAST";

    results.push({ type, table, line, raw: full });
  }

  // ---------------------------
  // CAN-FIND ( FIRST tabela WHERE ... )
  // ---------------------------
  while ((match = canFindRegex.exec(text)) !== null) {
    const table = match[1];
    const whereBlock = match[2];
    const full = match[0].trim();
    const line = getLineNumber(match.index);

    // Extract fields table.field WHERE
    const fieldRegex = new RegExp(`\\b${table}\\.([A-Za-z0-9_-]+)`, "gi");
    const usedFields: string[] = [];

    let f: RegExpExecArray | null;
    while ((f = fieldRegex.exec(whereBlock)) !== null) {
      const fieldName = f[1];
      if (!usedFields.includes(fieldName)) {
        usedFields.push(fieldName);
      }
    }

    results.push({
      type: "FIND",
      table,
      line,
      raw: full + " [CAN-FIND]",
      usedFields,
    });
  }

  return results;
}

async function readSourceFile(
  uploaded: UploadedFile,
  log?: (msg: string) => void
): Promise<FileAnalysis | null> {
  if (isZipFile(uploaded.name)) return null;
  if (!isSourceFile(uploaded.name)) {
    log?.(`Ignorando (não é fonte Progress): ${uploaded.name}`);
    return null;
  }

  log?.(`Lendo arquivo: ${uploaded.name}`);
  const text = await uploaded.file.text();
  const statements = extractStatementsFromSource(text);
  log?.(
    `Extraído: ${uploaded.name} (${statements.length} comando(s) FOR/FIND)`
  );

  return { fileName: uploaded.name, statements };
}

async function readSourceFilesFromZip(
  uploaded: UploadedFile,
  log?: (msg: string) => void
): Promise<FileAnalysis[]> {
  log?.(`Abrindo ZIP: ${uploaded.name}`);
  const zip = await JSZip.loadAsync(uploaded.file);
  const analyses: FileAnalysis[] = [];

  const entries = Object.values(zip.files);

  for (const entry of entries) {
    if (entry.dir) continue;
    if (!isSourceFile(entry.name)) continue;

    log?.(`Lendo arquivo dentro do ZIP: ${entry.name}`);
    const content = await entry.async("string");
    const statements = extractStatementsFromSource(content);

    analyses.push({
      fileName: entry.name,
      statements,
    });

    log?.(
      `Extraído de ZIP: ${entry.name} (${statements.length} comando(s) FOR/FIND)`
    );
  }

  return analyses;
}

export async function analyzeProgramFiles(
  programFiles: UploadedFile[],
  log?: (msg: string) => void
): Promise<FileAnalysis[]> {
  const allAnalyses: FileAnalysis[] = [];

  // Non-ZIPs
  for (const uploaded of programFiles) {
    if (!isZipFile(uploaded.name)) {
      const analysis = await readSourceFile(uploaded, log);
      if (analysis) allAnalyses.push(analysis);
    }
  }

  // ZIPs
  for (const uploaded of programFiles) {
    if (isZipFile(uploaded.name)) {
      const fromZip = await readSourceFilesFromZip(uploaded, log);
      allAnalyses.push(...fromZip);
    }
  }

  return allAnalyses;
}
