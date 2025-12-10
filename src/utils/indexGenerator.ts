// src/utils/indexGenerator.ts

// Heuristics to identify field type based on schema or field name
function isLogicalField(tableSchema: any, field: string): boolean {
  const rawType =
    tableSchema?.fields?.[field]?.type ??
    tableSchema?.fields?.[field]?.dataType ??
    tableSchema?.fields?.[field]?.DATA_TYPE;

  const type =
    typeof rawType === "string" ? rawType.toUpperCase() : "";

  if (type.includes("LOGICAL") || type === "L") {
    return true;
  }

  // Progress/TOTVS naming convention: lg-flag, lg-restringe, etc.
  if (/^lg[-_]/i.test(field)) {
    return true;
  }

  return false;
}

function isDateField(tableSchema: any, field: string): boolean {
  const rawType =
    tableSchema?.fields?.[field]?.type ??
    tableSchema?.fields?.[field]?.dataType ??
    tableSchema?.fields?.[field]?.DATA_TYPE;

  const type =
    typeof rawType === "string" ? rawType.toUpperCase() : "";

  if (
    type.includes("DATE") ||
    type.includes("DATETIME") ||
    type === "D"
  ) {
    return true;
  }

  // Naming convention: dt-validade, dt-inicio, dt-fim, etc.
  if (/^dt[-_]/i.test(field)) {
    return true;
  }

  return false;
}

// Helper: filters fields for index creation
// - removes LOGICAL fields when there are already many important fields
// - ensures date/range fields appear after equality fields
// - avoids fat and low-selectivity indexes
export function filterFieldsForIndex(
  tableSchema: any,
  fields: string[]
): string[] {
  const equalityFields: string[] = [];
  const rangeFields: string[] = [];
  const logicalFields: string[] = [];

  const maxFieldsWithoutLogical = 7;

  for (const field of fields) {
    if (isLogicalField(tableSchema, field)) {
      logicalFields.push(field);
      continue;
    }

    if (isDateField(tableSchema, field)) {
      rangeFields.push(field);
      continue;
    }

    equalityFields.push(field);
  }

  const base = [...equalityFields, ...rangeFields];

  // if there are already enough relevant fields (keys + dates), skip logical fields
  if (base.length >= maxFieldsWithoutLogical) {
    return base;
  }

  const missing = maxFieldsWithoutLogical - base.length;
  return [...base, ...logicalFields.slice(0, missing)];
}


// ------------------------------------------------------
// DF GENERATION (only writes, does not decide logic)
// ------------------------------------------------------
export function generateIndexDF(
  table: string,
  fields: string[],
  indexName?: string,
  indexNum?: number
): string {
  const safeIndexName =
    indexName || `${table}__ai${Math.floor(Math.random() * 9000 + 1000)}`;
  const num = indexNum || 99;

  let df = `ADD INDEX "${safeIndexName}" ON "${table}"\n`;
  df += `  AREA "Schema Area"\n`;
  df += `  INDEX-NUM ${num}\n`;
  df += `  FOREIGN-NAME "${table}##${safeIndexName}"\n`;

  for (const field of fields) {
    df += `  INDEX-FIELD "${field}" ASCENDING\n`;
  }

  return df.trimEnd();
}
