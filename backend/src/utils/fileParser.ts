import Papa from "papaparse";

export type ColumnType = "text" | "number" | "boolean" | "date" | "json";

export interface ColumnDefinition {
  name: string;
  type: ColumnType;
  displayName: string;
}

export interface ParsedData {
  rows: Record<string, any>[];
  columns: ColumnDefinition[];
}

/**
 * Parse CSV file content
 */
export function parseCSV(fileContent: string): ParsedData {
  const result = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false, // We'll handle type detection ourselves
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    throw new Error(`CSV parsing error: ${result.errors[0].message}`);
  }

  const rows = result.data as Record<string, any>[];
  const columns = extractColumnSchema(rows);

  return { rows, columns };
}

/**
 * Parse TSV file content
 */
export function parseTSV(fileContent: string): ParsedData {
  const result = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    delimiter: "\t",
    dynamicTyping: false,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    throw new Error(`TSV parsing error: ${result.errors[0].message}`);
  }

  const rows = result.data as Record<string, any>[];
  const columns = extractColumnSchema(rows);

  return { rows, columns };
}

/**
 * Parse JSON file content (expects array of objects)
 */
export function parseJSON(fileContent: string): ParsedData {
  try {
    const data = JSON.parse(fileContent);

    if (!Array.isArray(data)) {
      throw new Error("JSON file must contain an array of objects");
    }

    if (data.length === 0) {
      return { rows: [], columns: [] };
    }

    // Flatten nested objects by creating dot-notation keys
    const flattenedRows = data.map((row) => flattenObject(row));
    const columns = extractColumnSchema(flattenedRows);

    return { rows: flattenedRows, columns };
  } catch (error) {
    throw new Error(
      `JSON parsing error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Flatten nested objects into dot-notation keys
 * Example: { user: { name: "John" } } => { "user.name": "John" }
 */
function flattenObject(
  obj: any,
  prefix: string = "",
  result: Record<string, any> = {}
): Record<string, any> {
  for (const key in obj) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (value === null || value === undefined) {
      result[newKey] = value;
    } else if (typeof value === "object" && !Array.isArray(value)) {
      // For nested objects, check if it looks like a JSON structure we want to keep intact
      // If it has many keys, flatten it. If it's simple (1-2 keys), keep as JSON
      const keys = Object.keys(value);
      if (keys.length > 2) {
        flattenObject(value, newKey, result);
      } else {
        result[newKey] = value;
      }
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Infer column types from data rows
 */
export function extractColumnSchema(data: Record<string, any>[]): ColumnDefinition[] {
  if (data.length === 0) {
    return [];
  }

  // Get all unique column names from all rows
  const columnNames = new Set<string>();
  data.forEach((row) => {
    Object.keys(row).forEach((key) => columnNames.add(key));
  });

  const columns: ColumnDefinition[] = [];

  columnNames.forEach((columnName) => {
    const type = inferColumnType(columnName, data);
    columns.push({
      name: columnName,
      type,
      displayName: formatDisplayName(columnName),
    });
  });

  // Sort columns alphabetically by name
  columns.sort((a, b) => a.name.localeCompare(b.name));

  return columns;
}

/**
 * Infer the type of a column from sample data
 */
function inferColumnType(columnName: string, data: Record<string, any>[]): ColumnType {
  // Sample up to 100 non-null values
  const samples: any[] = [];
  for (const row of data) {
    const value = row[columnName];
    if (value !== null && value !== undefined && value !== "") {
      samples.push(value);
      if (samples.length >= 100) break;
    }
  }

  if (samples.length === 0) {
    return "text"; // Default to text if all values are null/empty
  }

  // Check if all samples are objects (JSON)
  const allObjects = samples.every((v) => typeof v === "object" && !Array.isArray(v));
  if (allObjects) {
    return "json";
  }

  // Check if all samples are arrays (JSON)
  const allArrays = samples.every((v) => Array.isArray(v));
  if (allArrays) {
    return "json";
  }

  // Check if all samples can be parsed as JSON strings
  const jsonParseable = samples.every((v) => {
    if (typeof v !== "string") return false;
    try {
      const parsed = JSON.parse(v);
      return typeof parsed === "object";
    } catch {
      return false;
    }
  });
  if (jsonParseable) {
    return "json";
  }

  // Check for boolean values
  const booleanValues = new Set(["true", "false", "yes", "no", "1", "0"]);
  const allBooleans = samples.every((v) => {
    const strValue = String(v).toLowerCase();
    return booleanValues.has(strValue) || typeof v === "boolean";
  });
  if (allBooleans) {
    return "boolean";
  }

  // Check for numbers
  const allNumbers = samples.every((v) => {
    if (typeof v === "number") return true;
    if (typeof v === "string") {
      const num = Number(v);
      return !isNaN(num) && v.trim() !== "";
    }
    return false;
  });
  if (allNumbers) {
    return "number";
  }

  // Check for dates (ISO format, common date formats)
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}/, // MM/DD/YYYY
    /^\d{4}\/\d{2}\/\d{2}/, // YYYY/MM/DD
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO datetime
  ];

  const allDates = samples.every((v) => {
    if (typeof v !== "string") return false;
    // Check if matches date pattern
    const matchesPattern = datePatterns.some((pattern) => pattern.test(v));
    if (!matchesPattern) return false;
    // Verify it's a valid date
    const date = new Date(v);
    return !isNaN(date.getTime());
  });
  if (allDates) {
    return "date";
  }

  // Default to text
  return "text";
}

/**
 * Format column name into a display-friendly name
 * Example: "product_name" => "Product Name"
 */
function formatDisplayName(columnName: string): string {
  return columnName
    .split(/[_\-\.]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Parse file based on file type
 */
export function parseFile(fileContent: string, fileType: string): ParsedData {
  const normalizedType = fileType.toLowerCase();

  if (normalizedType === "csv" || normalizedType === "text/csv") {
    return parseCSV(fileContent);
  } else if (normalizedType === "tsv" || normalizedType === "text/tab-separated-values") {
    return parseTSV(fileContent);
  } else if (normalizedType === "json" || normalizedType === "application/json") {
    return parseJSON(fileContent);
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
}
