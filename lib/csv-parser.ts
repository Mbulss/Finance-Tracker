/**
 * CSV Parser supporting:
 * - Quoted fields with commas.
 * - Escaped quotes ("").
 * - Indonesian month translation (since ID months differ from EN).
 * - Indonesian type labels (Pemasukan -> income, Pengeluaran -> expense).
 */

const ID_MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, jun: 5,
  jul: 6, agu: 7, ags: 7, sep: 8, okt: 9, nov: 10, des: 11
};

export interface ParsedCSVRow {
  created_at?: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  note: string;
}

/**
 * Splits a CSV line correctly by comma, respecting quotes.
 */
function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i+1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      currentField += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      result.push(currentField.trim());
      currentField = "";
    } else {
      currentField += char;
    }
  }
  result.push(currentField.trim());
  return result;
}

/**
 * Parses Indonesian date like "24 Mar 2026" or "1 Mei 2026"
 */
function parseIndonesianDate(str: string): string {
  if (!str) return new Date().toISOString();
  // Standard format: d MMM yyyy
  const parts = str.split(" ");
  if (parts.length < 3) return new Date(str).toISOString(); // Fallback to builtin

  const day = parseInt(parts[0], 10);
  const monthStr = parts[1].toLowerCase().replace(/\./g, ""); // "Mei", "Mei."
  const year = parseInt(parts[2], 10);

  const monthIdx = ID_MONTHS[monthStr] ?? ID_MONTHS[monthStr.slice(0, 3)];
  if (monthIdx !== undefined) {
    const date = new Date(year, monthIdx, day, 12, 0, 0); // Noon to avoid DST issues
    return date.toISOString();
  }
  
  return new Date(str).toISOString();
}

/**
 * The main parser from string to array of ParsedCSVRow objects.
 */
export function parseTransactionsCSV(csvText: string): ParsedCSVRow[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map(h => h.toLowerCase());
  
  // Create mapping of core field names to column indices
  const colMap = {
    date: headers.findIndex(h => h.includes("tanggal") || h.includes("date")),
    type: headers.findIndex(h => h.includes("tipe") || h.includes("type")),
    amount: headers.findIndex(h => h.includes("jumlah") || h.includes("amount") || h.includes("nominal")),
    category: headers.findIndex(h => h.includes("kategori") || h.includes("category")),
    note: headers.findIndex(h => h.includes("catatan") || h.includes("note")),
  };

  const rows: ParsedCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = splitCSVLine(lines[i]);
    const typeLabel = values[colMap.type]?.toLowerCase() ?? "";
    const type = typeLabel.includes("pemasukan") || typeLabel.includes("income") ? "income" : "expense";
    
    const amountStr = values[colMap.amount]?.replace(/\D/g, "") ?? "0";
    const amount = parseInt(amountStr, 10) || 0;

    const dateStr = values[colMap.date] ?? "";
    const category = values[colMap.category] || "Other";
    const note = values[colMap.note] || "";

    if (amount > 0) {
      rows.push({
        created_at: parseIndonesianDate(dateStr),
        type,
        amount,
        category,
        note,
      });
    }
  }

  return rows;
}
