// src/parsers/indexAdvisor.ts
import type { FileAnalysis } from "./ablAnalyzer";
import type { ParsedDf } from "./dfParser";
import { generateIndexDF, filterFieldsForIndex } from "../utils/indexGenerator";

export type IndexMatchResult = {
  table: string;
  statement: string;
  usedFields: string[];
  bestIndex?: {
    name: string;
    fields: string[];
    matchCount: number;
    isPerfect: boolean;
  };
  warning?: string;
  suggestion?: string; // index suggestion in DF format
};

export function extractWhereFields(raw: string): string[] {
  const whereIndex = raw.toLowerCase().indexOf("where");
  if (whereIndex === -1) return [];

  const whereClause = raw.slice(whereIndex + 5);

  // optionally captures "table.field" or just "field" before any comparison operator
  const fieldRegex =
    /\b(?:[A-Za-z0-9_\-]+\.)?([A-Za-z0-9_\-]+)\s*(?:=|<>|>=|<=|>|<)/g;

  const fields: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = fieldRegex.exec(whereClause)) !== null) {
    const fieldName = match[1];
    fields.push(fieldName);
  }

  return fields;
}

/**
 * Evaluates table indexes based on filters found in Progress programs.
 * When no compatible index exists, generates a DF-format index suggestion.
 */
export function analyzeIndexUsage(
  programAnalysis: FileAnalysis[],
  dfList: ParsedDf[]
): IndexMatchResult[] {
  const results: IndexMatchResult[] = [];

  // No DF files loaded
  if (dfList.length === 0) {
    results.push({
      table: "",
      statement: "",
      usedFields: [],
      warning:
        "No DF file was loaded. Unable to analyze or suggest indexes.",
    });
    return results;
  }

  // Merge all DFs into a single table dictionary
  const tables: ParsedDf["tables"] = {};
  for (const df of dfList) {
    Object.assign(tables, df.tables);
  }

  for (const file of programAnalysis) {
    for (const st of file.statements) {
      const table = st.table;
      const statementText = st.raw;

      const dfTable = tables[table];
      if (!dfTable) {
        results.push({
          table,
          statement: statementText,
          usedFields: [],
          warning: `Table "${table}" does not exist in any loaded DF file.`,
        });
        continue;
      }

      // Fields used in WHERE:
      // 1) if the analyzer already extracted usedFields (ex: CAN-FIND), use them
      // 2) otherwise extract from raw text
      const collectedFields =
        st.usedFields && st.usedFields.length > 0
          ? st.usedFields
          : extractWhereFields(statementText);

      // remove duplicates while preserving order
      const used = Array.from(new Set(collectedFields));

      if (used.length === 0) {
        results.push({
          table,
          statement: statementText,
          usedFields: [],
          warning:
            "There are not enough WHERE filters to recommend or suggest an index.",
        });
        continue;
      }

      let bestMatch: IndexMatchResult["bestIndex"] | null = null;

      for (const idx of dfTable.indexes) {
        let matchCount = 0;

        for (let i = 0; i < idx.fields.length; i++) {
          const indexField = idx.fields[i];

          if (used.includes(indexField)) {
            matchCount++;
          } else {
            // prefix broke
            break;
          }
        }

        if (matchCount > 0) {
          const isPerfect = matchCount === used.length;

          if (!bestMatch || matchCount > bestMatch.matchCount) {
            bestMatch = {
              name: idx.name,
              fields: idx.fields,
              matchCount,
              isPerfect,
            };
          }
        }
      }

      if (!bestMatch) {
        // no compatible index: filter fields and suggest a new DF index
        const filteredFields = filterFieldsForIndex(dfTable, used);
        const suggestion = generateIndexDF(table, filteredFields);

        results.push({
          table,
          statement: statementText,
          usedFields: used, // what WHERE actually uses
          warning: "No compatible index found.",
          suggestion,
        });
      } else {
        results.push({
          table,
          statement: statementText,
          usedFields: used,
          bestIndex: bestMatch,
        });
      }
    }
  }

  return results;
}
