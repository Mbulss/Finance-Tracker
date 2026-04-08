export type BankEmailProvider = "mandiri" | "bca";

export type ParsedBankEmail = {
  provider: BankEmailProvider;
  type: "expense" | "income";
  amount: number;
  occurredAtISO: string; // ISO string with timezone, e.g. 2026-03-12T19:40:29+07:00
  merchantName: string;
  merchantLocation?: string;
  referenceId?: string;
  qrisRef?: string;
};

function normText(input: string): string {
  return input
    .replace(/\r/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findLineValue(text: string, label: RegExp): string {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(label);
    
    // Case 1: Value is on the same line as the label (e.g. "Amount: 10.000")
    if (m?.[1]) return m[1].trim();
    
    // Case 2: Label matches the line exactly, value might be 1 or 2 lines below
    if (label.test(line)) {
      // Check next line
      let next = lines[i + 1]?.trim();
      if (next === ":") {
        // BCA special: colon is on its own line, value is on the NEXT next line
        next = lines[i + 2]?.trim();
      }
      if (next) return next;
    }
  }
  return "";
}

function parseIDRAmount(raw: string): number {
  let s = raw.trim();
  s = s.replace(/^IDR\s*/i, "").replace(/^Rp\s*/i, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma < lastDot) {
      // 40,000.00
      s = s.replace(/\.\d{1,2}$/, "").replace(/,/g, "");
    } else {
      // 40.000,00
      s = s.replace(/,\d{1,2}$/, "").replace(/\./g, "");
    }
  } else if (lastComma > -1) {
    if (/,\d{3}$/.test(s)) s = s.replace(/,/g, "");
    else s = s.replace(/,\d{1,2}$/, "");
  } else if (lastDot > -1) {
    if (/\.\d{3}/.test(s)) s = s.replace(/\./g, "");
    else s = s.replace(/\.\d{1,2}$/, "");
  }

  s = s.replace(/[^\d]/g, "");
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  januari: 1,
  feb: 2,
  february: 2,
  februari: 2,
  mar: 3,
  march: 3,
  maret: 3,
  apr: 4,
  april: 4,
  mei: 5,
  may: 5,
  jun: 6,
  june: 6,
  juni: 6,
  jul: 7,
  july: 7,
  juli: 7,
  aug: 8,
  august: 8,
  agu: 8,
  agustus: 8,
  sep: 9,
  sept: 9,
  september: 9,
  okt: 10,
  oct: 10,
  october: 10,
  oktober: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
  des: 12,
  desember: 12,
};

function parseDateTimeWIB(datePart: string, timePart: string): string {
  const d = datePart.trim();
  const t = timePart.trim();

  // datePart: "12 Mar 2026" | "10 Mar 2026"
  const dm = d.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!dm) throw new Error("Unrecognized date format");
  const day = parseInt(dm[1], 10);
  const monthKey = dm[2].toLowerCase();
  const month = MONTHS[monthKey];
  const year = parseInt(dm[3], 10);
  if (!month) throw new Error("Unrecognized month");

  // timePart: "19:40:29" | "09:04:13 WIB" — strip optional WIB/WITA/WIT suffix
  const tm = t.replace(/\s*(WIB|WITA|WIT)\s*$/i, "").match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!tm) throw new Error("Unrecognized time format");
  const hh = tm[1];
  const mm = tm[2];
  const ss = tm[3] ?? "00";

  const yyyy = String(year).padStart(4, "0");
  const MM = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}+07:00`;
}

function ensureReasonableAmount(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 100 || n > 100_000_000) return 0;
  return Math.round(n);
}

function parseMandiri(textRaw: string): ParsedBankEmail | null {
  const text = normText(textRaw);
  if (!text) return null;

  const amountStr = findLineValue(text, /Nominal\s+(?:Transaksi|Top-up|Transfer|Pembayaran)\s*(?:[:\s]+)?(.*)/i) 
    || findLineValue(text, /Total\s+(?:Transaksi|Pembayaran)\s*(?:[:\s]+)?(.*)/i);
  const amount = ensureReasonableAmount(parseIDRAmount(amountStr));
  const datePart = findLineValue(text, /Tanggal\s*(?:[:\s]+)?(.*)/i);
  const timePart = findLineValue(text, /Jam\s*(?:[:\s]+)?(.*)/i);
  const merchantName = findLineValue(text, /(?:Penerima|Merchant|Penyedia\s*Jasa|Tujuan)(?!\s*Transaksi)\s*(?:[:\s]+)?(.*)/i)
    || findLineValue(text, /Tujuan\s+Transaksi\s*(?:[:\s]+)?(.*)/i);
  const merchantLocation = findLineValue(text, /([A-Z][A-Z\s.,'-]+-\s*ID)\s*$/i);
  const referenceId = findLineValue(text, /No\.\s*Referensi(?: BI Fast)?\s*(?:[:\s]+)?(.*)/i);
  const qrisRef = findLineValue(text, /No\.\s*Ref\.\s*QRIS\s*(?:[:\s]+)?(.*)/i);

  if (!amount || !datePart || !timePart || !merchantName) return null;

  let occurredAtISO: string;
  try {
    occurredAtISO = parseDateTimeWIB(datePart, timePart);
  } catch {
    return null;
  }
  const isIncome = /Incoming Transfer|Penerimaan|Kredit|Dana Masuk/i.test(textRaw + datePart + merchantName);

  return {
    provider: "mandiri",
    type: isIncome ? "income" : "expense",
    amount,
    occurredAtISO,
    merchantName: merchantName.trim().slice(0, 60),
    merchantLocation: merchantLocation ? merchantLocation.trim().slice(0, 80) : undefined,
    referenceId: referenceId ? referenceId.trim() : undefined,
    qrisRef: qrisRef ? qrisRef.trim() : undefined,
  };
}

function parseBCA(textRaw: string): ParsedBankEmail | null {
  const text = normText(textRaw);
  if (!text) return null;

  // BCA labels - using findLineValue which now handles multi-line colons
  const amountStr = findLineValue(text, /Transfer\s+Amount/i)
    || findLineValue(text, /Amount/i)
    || findLineValue(text, /Total\s+Payment/i);
  
  const amount = ensureReasonableAmount(parseIDRAmount(amountStr));

  const dateStr = findLineValue(text, /Transaction\s+Date/i);
  const dtm = dateStr.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s+(\d{2}:\d{2}:\d{2})/);
  
  let occurredAtISO = "";
  if (dtm) {
    try { 
      occurredAtISO = parseDateTimeWIB(`${dtm[1]} ${dtm[2]} ${dtm[3]}`, dtm[4]); 
    } catch { occurredAtISO = ""; }
  }

  const merchantName = findLineValue(text, /Beneficiary\s+Name/i)
    || findLineValue(text, /Payment\s+to/i);
  
  const merchantLocation = findLineValue(text, /Merchant\s+Location/i);
  
  const referenceId = findLineValue(text, /Reference\s+No/i) 
    || findLineValue(text, /\bRRN\b/i);
    
  const qrisRef = findLineValue(text, /QRIS\s*Ref/i);

  if (!amount || !occurredAtISO || !merchantName) return null;

  const isIncome = /Credit|Received from|Dana Masuk|Transfer Masuk/i.test(textRaw + merchantName);

  return {
    provider: "bca",
    type: isIncome ? "income" : "expense",
    amount,
    occurredAtISO,
    merchantName: merchantName.trim().slice(0, 60),
    merchantLocation: merchantLocation ? merchantLocation.trim().slice(0, 80) : undefined,
    referenceId: referenceId ? referenceId.trim() : undefined,
    qrisRef: qrisRef ? qrisRef.trim() : undefined,
  };
}

export function parseBankTransactionEmail(input: {
  from?: string;
  subject?: string;
  text: string;
}): ParsedBankEmail | null {
  const from = (input.from ?? "").toLowerCase();
  const subject = (input.subject ?? "").toLowerCase();
  const text = input.text ?? "";

  if (from.includes("@bankmandiri.co.id") || subject.includes("livin") || subject.includes("mandiri")) {
    return parseMandiri(text);
  }

  if (from.includes("@bca.co.id") || subject.includes("bca") || subject.includes("transaction journal")) {
    return parseBCA(text);
  }

  // fallback: try both
  return parseMandiri(text) ?? parseBCA(text);
}

