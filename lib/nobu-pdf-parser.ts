import { detectCategory } from "./category-rules";
import { type ParsedCSVRow } from "./csv-parser";

/**
 * Parses Nobu BOSS PDF extracted text.
 * 
 * Supports two text formats:
 * 
 * From pdf-parse (concatenated, no spaces):
 *   03/02/2026 00:00:00BUNGA TABUNGANIDR10.129,00CR10.207.961,00
 * 
 * From pdfjs-dist (with spaces):
 *   03/02/2026 00:00:00 BUNGA TABUNGAN IDR 10.129,00 CR 10.207.961,00
 */
export function parseNobuPDFText(text: string): ParsedCSVRow[] {
  const rows: ParsedCSVRow[] = [];

  const lines = text.split(/\n/);

  for (const line of lines) {
    // Try both formats:
    // Format 1 (pdfjs-dist, with spaces): date time description IDR amount DB/CR balance
    // Format 2 (pdf-parse, concatenated): date+time+description+IDR+amount+DB/CR+balance
    const match = line.match(
      /^(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2})\s*(.+?)\s*IDR\s*([\d.,]+)\s*(DB|CR)\s*([\d.,]+)$/
    );

    if (!match) continue;

    const [_, dateStr, description, amountStr, typeStr] = match;

    // Parse Date: MM/DD/YYYY HH:MM:SS -> ISO (Nobu uses MM/DD/YYYY)
    const dateParts = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
    if (!dateParts) continue;

    const [__, month, day, year, hh, mm, ss] = dateParts;
    const isoDate = `${year}-${month}-${day}T${hh}:${mm}:${ss}+07:00`;

    // Parse Amount: 1.100.000,00 -> 1100000
    const cleanAmount = amountStr.replace(/\./g, "").replace(",", ".");
    const amount = Math.floor(parseFloat(cleanAmount));

    // Determine Type
    const type = typeStr === "CR" ? "income" : "expense";

    // Note and Category
    const note = description.trim();
    const category = detectCategory(type, note);

    if (amount > 0) {
      try {
        const dateObj = new Date(isoDate);
        if (isNaN(dateObj.getTime())) continue;
        rows.push({
          created_at: dateObj.toISOString(),
          type,
          amount,
          category,
          note,
        });
      } catch {
        continue;
      }
    }
  }

  return rows;
}
