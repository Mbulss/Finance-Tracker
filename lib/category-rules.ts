/**
 * Simple keyword-based category detection for Telegram messages.
 * Used by both web (optional) and Telegram webhook.
 */

const EXPENSE_KEYWORDS: Record<string, string[]> = {
  Food: [
    "kopi", "ngopi", "makan", "makanan", "food", "restaurant", "warung", "coffee", "lunch", "dinner", "snack",
    "sarapan", "jajan", "kuliner", "gofood", "grabfood", "traveloka eats", "minuman", "cemilan",
    "mixue", "kopikenangan", "janjijiwa", "starbucks", "mcdonalds", "kfc", "hokben", "solaria", "fore", "chatime", "dum dum",
  ],
  Transport: [
    "bensin", "transport", "grab", "gojek", "ojek", "taxi", "parkir", "tol", "gas", "angkot",
    "transjakarta", "krl", "tiket", "toll", "spbu", "pertamina", "shell", "total", "kai", "bluebird",
  ],
  Shopping: [
    "belanja", "shopping", "market", "mall", "tokopedia", "shopee", "lazada", "toko",
    "indomaret", "alfamart", "alfamidi", "hypermart", "superindo", "miniso", "guardian", "watson", "grandlucky",
  ],
  Bills: ["listrik", "internet", "pulsa", "bills", "tagihan", "pln", "wifi", "bpjs", "pdam", "netflix", "spotify"],
  Health: ["obat", "dokter", "health", "apotek", "klinik", "rumah sakit", "medical", "vitamin"],
  Entertainment: ["nonton", "game", "entertainment", "hobi", "bioskop", "streaming", "youtube", "premium", "langganan"],
  Other: [],
};

const INCOME_KEYWORDS: Record<string, string[]> = {
  Salary: ["gaji", "salary", "gajian", "gaji bulanan", "payroll"],
  Freelance: ["freelance", "project", "client", "side hustle", "proyek", "honor"],
  Investment: ["dividen", "investment", "saham", "profit", "return", "capital gain"],
  Gift: ["gift", "hadiah", "bonus", "thr", "angpao", "duit saku"],
  Other: [],
};

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function matchCategory(note: string, keywordsMap: Record<string, string[]>): string {
  const n = normalize(note);
  if (!n) return "Other";

  for (const [category, keywords] of Object.entries(keywordsMap)) {
    if (category === "Other") continue;
    if (keywords.some((kw) => n.includes(kw.toLowerCase()))) return category;
  }
  return "Other";
}

export function detectCategory(type: "income" | "expense", note: string): string {
  return type === "income"
    ? matchCategory(note, INCOME_KEYWORDS)
    : matchCategory(note, EXPENSE_KEYWORDS);
}
