/**
 * Simple keyword-based category detection for Telegram messages.
 * Used by both web (optional) and Telegram webhook.
 */

const EXPENSE_KEYWORDS: Record<string, string[]> = {
  Food: [
    "kopi", "ngopi", "makan", "makanan", "food", "restaurant", "warung", "coffee", "lunch", "dinner", "snack",
    "sarapan", "jajan", "kuliner", "gofood", "grabfood", "traveloka eats", "minuman", "cemilan",
    "mixue", "kopikenangan", "janjijiwa", "starbucks", "mcdonalds", "kfc", "hokben", "solaria", "fore", "chatime", "dum dum",
    "keprabon", "nasi goreng", "mie goreng", "bakso", "mie ayam", "sate", "martabak", "bebek", "steak", "soto", "rawon", "pecel", 
    "padang", "warteg", "kantin", "food court", "shopeefood", "chateraise", "breadtalk", "jco", "rotio", "holland bakery", "mako", "sour sally", "llaollao", "yoshinoya", "marugame", "sushitei", "ichiban", "pepper lunch", "imperial kitchen", "ta wan", "din tai fung", "shihlin"
  ],
  Transport: [
    "bensin", "transport", "grab", "gojek", "ojek", "taxi", "parkir", "tol", "gas", "angkot",
    "transjakarta", "krl", "tiket", "toll", "spbu", "pertamina", "shell", "total", "kai", "bluebird",
    "e-money", "emoney", "maxim", "indrive", "garuda", "citilink", "lion air", "traveloka", "pegipegi", "damri"
  ],
  Shopping: [
    "belanja", "shopping", "market", "mall", "tokopedia", "shopee", "lazada", "toko",
    "indomaret", "alfamart", "alfamidi", "hypermart", "superindo", "miniso", "guardian", "watson", "grandlucky",
    "supermarket", "minimarket", "fashion", "baju", "celana", "sepatu", "uniqlo", "h&m", "zara", "ikea", "ace hardware", "informas", "gramedia", "eiger"
  ],
  Bills: [
    "listrik", "internet", "pulsa", "bills", "tagihan", "pln", "wifi", "bpjs", "pdam", "netflix", "spotify",
    "pajak", "asuransi", "ipp", "spp", "kost", "kontrakan", "cicilan", "kartu kredit", "paylater", "kredivo", "atome", "spaylater"
  ],
  Health: [
    "obat", "dokter", "health", "apotek", "klinik", "rumah sakit", "medical", "vitamin",
    "halodoc", "alodokter", "gym", "fitness", "masker", "dentist", "gigi"
  ],
  Entertainment: [
    "nonton", "game", "entertainment", "hobi", "bioskop", "streaming", "youtube", "premium", "langganan",
    "steam", "psn", "nintendo", "xbox", "codashop", "unipin", "top up game", "voucher", "karaoke", "dufan"
  ],
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
