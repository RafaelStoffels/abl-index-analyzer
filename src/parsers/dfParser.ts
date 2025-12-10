// src/parsers/dfParser.ts
import type { UploadedFile } from "../types";

export type ParsedDf = {
  tables: Record<
    string,
    {
      fields: { name: string; type: string }[];
      indexes: { name: string; primary: boolean; fields: string[] }[];
    }
  >;
};

export function parseDf(dfText: string): ParsedDf {
  const lines = dfText.split(/\r?\n/);

  const result: ParsedDf = { tables: {} };
  let currentTable: string | null = null;
  let currentIndex: { name: string; primary: boolean; fields: string[] } | null =
    null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // ADD TABLE
    let m = trimmed.match(/^ADD TABLE\s+"([^"]+)"/i);
    if (m) {
      currentTable = m[1];
      if (!result.tables[currentTable]) {
        result.tables[currentTable] = { fields: [], indexes: [] };
      }
      currentIndex = null;
      continue;
    }

    // ADD FIELD
    m = trimmed.match(
      /^ADD FIELD\s+"([^"]+)"\s+OF\s+"([^"]+)"\s+AS\s+([A-Za-z0-9]+)/i
    );
    if (m) {
      const fieldName = m[1];
      const tableName = m[2];
      const fieldType = m[3].toLowerCase();

      if (!result.tables[tableName]) {
        result.tables[tableName] = { fields: [], indexes: [] };
      }

      result.tables[tableName].fields.push({
        name: fieldName,
        type: fieldType,
      });

      continue;
    }

    // ADD INDEX
    m = trimmed.match(/^ADD INDEX\s+"([^"]+)"\s+ON\s+"([^"]+)"/i);
    if (m) {
      const indexName = m[1];
      const tableName = m[2];

      currentIndex = {
        name: indexName,
        primary: false,
        fields: [],
      };

      if (!result.tables[tableName]) {
        result.tables[tableName] = { fields: [], indexes: [] };
      }

      result.tables[tableName].indexes.push(currentIndex);
      continue;
    }

    // PRIMARY
    if (currentIndex && /^PRIMARY$/i.test(trimmed)) {
      currentIndex.primary = true;
      continue;
    }

    // INDEX-FIELD
    m = trimmed.match(/^INDEX-FIELD\s+"([^"]+)"/i);
    if (m && currentIndex) {
      currentIndex.fields.push(m[1]);
      continue;
    }
  }

  return result;
}

export async function parseDfFiles(
  dfFiles: UploadedFile[],
  log?: (msg: string) => void
): Promise<ParsedDf[]> {
  const parsedList: ParsedDf[] = [];

  for (const uploaded of dfFiles) {
    log?.(`Lendo DF: ${uploaded.name}`);
    const text = await uploaded.file.text();
    const parsed = parseDf(text);
    parsedList.push(parsed);
    log?.(`DF processado: ${uploaded.name}`);
  }

  return parsedList;
}
