import ExcelJS from "exceljs";

// ── Constants ──────────────────────────────────────────────────────────────
const REQUIRED_HEADERS = [
  "Title",
  "First Name",
  "Last Name",
  "Gender",
  "Company Email",
  "Mobile Number",
  "Date of Birth",
  "Language",
];

// Fields that must not be empty in any data row
const MANDATORY_FIELDS = [
  "First Name",
  "Last Name",
  "Company Email",
  "Mobile Number",
  "Language",
];

// ── Types ──────────────────────────────────────────────────────────────────
export interface FaultyRecord {
  rowNumber: number; // 1-based, relative to data rows (excludes header)
  data: Record<string, string>;
  reasons: string[];
}

export interface XlsxValidationResult {
  valid: boolean;
  error?: string;
  csvBlob?: Blob;
  csvFile?: File;
  rowCount?: number;        // total valid rows
  faultyRecords?: FaultyRecord[];
}

// ── Helpers ────────────────────────────────────────────────────────────────
function normalizeHeader(h: unknown): string {
  return String(h ?? "").trim();
}

function cellToString(val: unknown): string {
  if (val === null || val === undefined) return "";
  // ExcelJS may return rich-text objects

  if (typeof val === "object" && "richText" in (val as object)) {
    
    return (val as { richText: { text: string }[] }).richText
      .map((r) => r.text)
      .join("");
  }
  return String(val).trim();
}

function csvEscape(str: string): string {
  return /[,"\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// ── Core utility ──────────────────────────────────────────────────────────
export async function validateAndConvertXlsx(
  file: File
): Promise<XlsxValidationResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return { valid: false, error: "The file is empty." };
    }

    // ── Extract rows ─────────────────────────────────────────────────────
    const rows: unknown[][] = [];
    worksheet.eachRow((row) => {
        const rawValues = Array.isArray(row.values) ? (row.values as unknown[]).slice(1) : [];

        const normalizedValues = rawValues.map((cell) => {
            // ExcelJS hyperlink cells come as { text, hyperlink } — unwrap to plain value
            if (
                cell !== null &&
                typeof cell === "object" &&
                "text" in (cell as object) &&
                "hyperlink" in (cell as object)
            ) {
                return (cell as { text: string; hyperlink: string }).text;
            }
            return cell;
        });

        rows.push(normalizedValues);
    });

    if (rows.length === 0) {
      return { valid: false, error: "The file is empty." };
    }

    // ── Header validation ────────────────────────────────────────────────
    const fileHeaders: string[] = rows[0].map(normalizeHeader);

    const missingHeaders = REQUIRED_HEADERS.filter(
      (required) => !fileHeaders.includes(required)
    );

    if (missingHeaders.length > 0) {
      return {
        valid: false,
        error: `Missing required column(s): ${missingHeaders.join(", ")}`,
      };
    }

    // ── Map header → column index ────────────────────────────────────────
    const headerIndexMap: Record<string, number> = {};
    fileHeaders.forEach((h, i) => {
      headerIndexMap[h] = i;
    });

    // ── Collect all non-blank data rows ──────────────────────────────────
    const allDataRows = rows
      .slice(1)
      .map((row, i) => ({ row, originalIndex: i + 2 })) // +2: 1 for header, 1 for 1-based
      .filter(({ row }) =>
        row.some((cell) => cellToString(cell) !== "")
      );

    if (allDataRows.length === 0) {
      return {
        valid: false,
        error: "The file must contain at least one data row.",
      };
    }

    // ── Validate rows ────────────────────────────────────────────────────
    const phonesSeen = new Map<string, number>(); // phone → first row number
    const faultyRecords: FaultyRecord[] = [];
    const validRows: string[][] = [];

    allDataRows.forEach(({ row, originalIndex }, dataIndex) => {
      const reasons: string[] = [];

      // Build a readable record for the faulty report
      const recordData: Record<string, string> = {};
      REQUIRED_HEADERS.forEach((h) => {
        recordData[h] = cellToString(row[headerIndexMap[h]]);
      });

      // 1. Empty mandatory fields
      MANDATORY_FIELDS.forEach((field) => {
        if (recordData[field] === "") {
          reasons.push(`"${field}" is empty`);
        }
      });

      // 2. Duplicate Mobile Number
      const phone = recordData["Mobile Number"];
      if (phone !== "") {
        if (phonesSeen.has(phone)) {
          reasons.push(
            `Duplicate "Mobile Number" (first seen at row ${phonesSeen.get(phone)})`
          );
        } else {
          phonesSeen.set(phone, originalIndex);
        }
      }

      if (reasons.length > 0) {
        faultyRecords.push({
          rowNumber: dataIndex + 1,
          data: recordData,
          reasons,
        });
      } else {
        validRows.push(
          REQUIRED_HEADERS.map((h) => csvEscape(recordData[h]))
        );
      }
    });

    // ── Build CSV from valid rows only ───────────────────────────────────
    const csvLines = [
      REQUIRED_HEADERS.map(csvEscape).join(","),
      ...validRows.map((r) => r.join(",")),
    ];
    const csvContent = csvLines.join("\n");

    
    const csvBlob = new Blob([csvContent], { type: "text/csv" });
    const csvFile = new File(
      [csvBlob],
      file.name.replace(/\.[^.]+$/, ".csv"),
      { type: "text/csv" }
    );

    return {
      valid: true,
      csvBlob,
      csvFile,
      rowCount: validRows.length,
      faultyRecords,
    };
  } catch (err) {
    return {
      valid: false,
      error: "Failed to parse file. Please upload a valid .xlsx file.",
    };
  }
}