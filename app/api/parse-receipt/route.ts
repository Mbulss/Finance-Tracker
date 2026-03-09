import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

interface AIChatResult { content: string; provider: string }

async function callAIWithFallback(
  systemPrompt: string,
  userMsg: string,
  maxTokens = 120
): Promise<AIChatResult | null> {
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMsg },
  ];

  // 1) Gemini Flash
  if (GEMINI_API_KEY) {
    try {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${GEMINI_API_KEY}` },
          body: JSON.stringify({ model: "gemini-2.5-flash", messages, max_tokens: maxTokens, temperature: 0 }),
        }
      );
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const c = (data?.choices?.[0]?.message?.content ?? "").trim();
        if (c) return { content: c, provider: "gemini" };
      } else console.log(`[parse-receipt] Gemini error ${res.status}`);
    } catch (e) { console.log("[parse-receipt] Gemini failed:", e); }
  }

  // 2) Groq
  if (GROQ_API_KEY) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages, max_tokens: maxTokens, temperature: 0 }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const c = (data?.choices?.[0]?.message?.content ?? "").trim();
        if (c) return { content: c, provider: "groq" };
      } else console.log(`[parse-receipt] Groq error ${res.status}`);
    } catch (e) { console.log("[parse-receipt] Groq failed:", e); }
  }

  // 3) OpenRouter
  if (OPENROUTER_API_KEY) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://localhost",
        },
        body: JSON.stringify({ model: "openrouter/auto", messages, max_tokens: maxTokens, temperature: 0 }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const c = (data?.choices?.[0]?.message?.content ?? "").trim();
        if (c) return { content: c, provider: "openrouter" };
      } else console.log(`[parse-receipt] OpenRouter error ${res.status}`);
    } catch (e) { console.log("[parse-receipt] OpenRouter failed:", e); }
  }

  return null;
}

/* ─── Parse angka IDR: handle kedua format ─── */
// Indonesia: "40.000,00" → 40000  |  Internasional: "40,000.00" → 40000
function parseIDR(raw: string): number {
  let s = raw.trim();
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma < lastDot) {
      // Format internasional: 40,000.00 → koma=ribuan, titik=desimal
      s = s.replace(/\.\d{1,2}$/, "");
      s = s.replace(/,/g, "");
    } else {
      // Format Indonesia: 40.000,00 → titik=ribuan, koma=desimal
      s = s.replace(/,\d{1,2}$/, "");
      s = s.replace(/\./g, "");
    }
  } else if (lastComma > -1) {
    // Koma saja: "40,000" (ribuan) vs "40,50" (desimal)
    if (/,\d{3}$/.test(s)) s = s.replace(/,/g, "");
    else s = s.replace(/,\d{1,2}$/, "");
  } else if (lastDot > -1) {
    // Titik saja: "40.000" (ribuan) vs "40.50" (desimal)
    if (/\.\d{3}/.test(s)) s = s.replace(/\./g, "");
    else s = s.replace(/\.\d{1,2}$/, "");
  }

  s = s.replace(/[.,]/g, "");
  const n = parseInt(s, 10);
  return (!Number.isNaN(n) && n >= 100 && n <= 100_000_000) ? n : 0;
}

/* ─── Ambil angka tepat setelah keyword di baris ─── */
function pickNumberAfter(line: string, keyword: RegExp): number {
  const re = new RegExp(keyword.source + "[\\s:]*[Rp\\s]*([\\d][\\d.,]*)", "i");
  const m = line.match(re);
  if (!m?.[1]) return 0;
  return parseIDR(m[1]);
}

/* ─── Angka terbesar ≥100 ≤100jt dari baris ─── */
function pickBiggest(line: string): number {
  const matches = line.match(/\d[\d.,]*/g);
  if (!matches) return 0;
  let best = 0;
  for (const m of matches) {
    const n = parseIDR(m);
    if (n > best) best = n;
  }
  return best;
}

/* ─── Baris alamat? ─── */
function isAddress(line: string): boolean {
  const l = line.toLowerCase();
  const addr = /\b(jl\b|ji\b|jalan|komplek|blok|gedung|lantai|rt\b|rw\b|kel\b|kec\b|kota\b|kabupaten|provinsi)/i.test(l);
  const city = /\b(jakarta|bandung|surabaya|medan|semarang|yogya|bogor|depok|tangerang|bekasi|makassar|malang|solo|denpasar|ciganjur|jagakarsa|kemang|sudirman|kuningan|senayan|menteng|kelapa\s*gading|cilandak|pondok\s*indah)/i.test(l);
  if (addr && city) return true;
  if (addr && /,/.test(line)) return true;
  if (city && /,/.test(line) && /\d/.test(line)) return true;
  return false;
}

/* ─── Baris noise? ─── */
function isNoise(line: string): boolean {
  if (line.length < 3 || line.length > 55) return true;
  if (/^[\*=\-–—]+$/.test(line)) return true;
  if (/^\d+$/.test(line)) return true;
  if (/\d{2}[:\-\/\.]\d{2}/.test(line)) return true;
  if (/^(jl\b|ji\b|jalan|rt\b|rw\b|no\.|npwp|telp|tel\b|fax|email|www|http|sms|call|p\.\d|f\.\d)/i.test(line)) return true;
  if (/\b(www\.|\.com|\.co\.id|\.id\/|\.net|\.org|delivery\.)\b/i.test(line)) return true;
  if (/[\[\]{}]/.test(line)) return true;
  if (/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|senin|selasa|rabu|kamis|jumat|sabtu|minggu)\b/i.test(line)) return true;
  if (/^(table|guest|meja)\b/i.test(line)) return true;
  if (/^(pt\b|cv\b)/i.test(line)) return true;
  if (/^(perdagangan)/i.test(line)) return true;
  if (/^[A-Z0-9]{8,}$/.test(line)) return true;
  if (/^\d{5,}/.test(line)) return true;  // baris mulai dengan nomor panjang (ID transaksi, POS)
  if (/\b(closed|void|settlement|cashier|kasir|operator)\b/i.test(line)) return true;
  if (!/[a-zA-Z]{3,}/.test(line)) return true;
  if (/©/.test(line)) return true;
  if (isAddress(line)) return true;
  return false;
}

/* ─── Merchant terlihat seperti OCR garbage? ─── */
function isGarbage(s: string): boolean {
  if (!s || s.length < 3) return true;
  if (!/[a-zA-Z]{4,}/.test(s)) return true;
  const letters = (s.match(/[a-zA-Z]/g) || []).length;
  if (letters / s.length < 0.6) return true;
  if (/[=|{}\[\]\\<>~^]/.test(s)) return true;
  if (/\b(www|\.com|\.co\.id|\.id|\.net|\.org|http)\b/i.test(s)) return true;
  if (/\d{5,}/.test(s)) return true;  // nomor transaksi/POS ID (5+ digit berturutan)
  const words = s.split(/\s+/).filter(Boolean);
  const shortWords = words.filter((w) => w.replace(/[^a-zA-Z]/g, "").length <= 2).length;
  if (words.length >= 4 && shortWords / words.length > 0.5) return true;
  return false;
}

/* ─── Brand map: OCR sering salah baca, map ke nama yang benar ─── */
const BRAND_MAP: Record<string, string> = {
  indomarco: "Indomaret", indomaret: "Indomaret",
  alfamart: "Alfamart", alfamidi: "Alfamidi",
  starbucks: "Starbucks", kfc: "KFC",
  mcdonald: "McDonald's", hokben: "HokBen",
  jco: "J.CO", chatime: "Chatime", mixue: "Mixue",
  solaria: "Solaria", richeese: "Richeese",
};

const BRANDS_REGEX = /\b(indomarco|indomaret|alfamart|alfamidi|lawson|circle\s*k|family\s*mart|starbucks|kfc|mcdonald|burger\s*king|hokben|yoshinoya|j\.?co|chatime|mixue|pizza\s*hut|domino|sushi|warung|resto|cafe|kedai|bakery|kopitiam|solaria|es\s*teler|geprek|ayam|bakso|mie\s*gacoan|richeese)\b/i;

/* ─── Bersihkan merchant ─── */
function cleanMerchant(line: string, brandMatch?: RegExpMatchArray): string {
  let cleaned = line.replace(/@/g, " ").replace(/\s+/g, " ").trim();

  if (brandMatch?.index !== undefined) {
    cleaned = cleaned.slice(brandMatch.index).trim();
  }

  cleaned = cleaned
    .replace(/^[^a-zA-Z]+/, "")
    .replace(/[^a-zA-Z)]+$/, "")
    .replace(/\s*[-–—]\s*(jakarta|bandung|surabaya|medan|semarang|yogya|bogor|depok|tangerang|bekasi|jagakarsa|kemang|ciganjur|cilandak|kelapa\s*gading).*$/i, "")
    .trim();

  if (isGarbage(cleaned)) return "";
  return cleaned.slice(0, 45);
}

/* ─── Cari brand name yang dikenal dari teks (cek seluruh teks) ─── */
function findKnownBrand(text: string): string {
  const t = text.toLowerCase();
  for (const [key, name] of Object.entries(BRAND_MAP)) {
    if (t.includes(key)) return name;
  }
  return "";
}

/* ─── Fallback: ambil nama item pesanan dari struk ─── */
function findItemHint(lines: string[]): string {
  // Cari baris yang punya nama item + angka harga (pola item di struk)
  // Skip header (3 baris pertama) dan footer (5 baris terakhir)
  const start = Math.min(3, lines.length);
  const end = Math.max(start, lines.length - 5);
  let bestItem = "";
  let bestPrice = 0;

  for (let i = start; i < end; i++) {
    const line = lines[i];
    if (isNoise(line) || isAddress(line)) continue;
    // Item line biasanya: "Nama Item   12.000" atau "2x Nama Item 24.000"
    const priceMatch = line.match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,})\s*$/);
    if (!priceMatch) continue;
    // Ambil bagian teks (bukan angka) — strip qty: "1x ", "2 ", "1 "
    let name = line.slice(0, priceMatch.index).replace(/^\d+\s*[xX×]?\s+/, "").trim();
    name = name.replace(/[\d.,]+\s*$/, "").trim();
    if (name.length < 3) continue;
    if (/^(qty|jumlah|subtotal|total|diskon|tax|ppn|pax)/i.test(name)) continue;
    const price = parseInt(priceMatch[1].replace(/[.,]/g, ""), 10);
    if (price > bestPrice) { bestPrice = price; bestItem = name; }
  }

  if (bestItem) {
    return bestItem.length > 30 ? bestItem.slice(0, 30).trim() : bestItem;
  }
  return "";
}

/* ─── EXTRACT HINTS ─── */
function extractHints(text: string) {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);

  // ── TOTAL ──
  let totalAmount = 0;
  let subtotalAmount = 0;

  // Kumpulkan SEMUA angka dari baris Total (ambil terbesar, bukan pertama)
  const totalCandidates: number[] = [];

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const upper = line.toUpperCase();

    if (/\bSUB\s*TOTAL\b/.test(upper)) {
      if (!subtotalAmount) subtotalAmount = pickNumberAfter(line, /sub\s*total/) || pickBiggest(line);
      continue;
    }

    if (/\bTOTAL\b/.test(upper)) {
      const n = pickNumberAfter(line, /total/) || pickBiggest(line);
      if (n >= 100) {
        totalCandidates.push(n);
        console.log(`[parse-receipt] TOTAL line: "${line}" → ${n}`);
      }
    }
  }

  // Ambil total terbesar (bukan pertama) — OCR sering salah baca angka jadi lebih kecil
  if (totalCandidates.length > 0) {
    totalAmount = Math.max(...totalCandidates);
  }

  // Jika total == 0 tapi subtotal ada → pakai subtotal
  if (!totalAmount && subtotalAmount > 0) {
    totalAmount = subtotalAmount;
  }

  // Fallback: Transfer Amount / HARGA JUAL / TUNAI / IDR / Jumlah / Nominal
  if (!totalAmount) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      let n = 0;
      if (/transfer\s*amount/i.test(line)) n = pickNumberAfter(line, /transfer\s*amount/) || pickBiggest(line);
      else if (/harga\s*jual/i.test(line)) n = pickNumberAfter(line, /harga\s*jual/) || pickBiggest(line);
      else if (/\btunai\b/i.test(line)) n = pickNumberAfter(line, /tunai/) || pickBiggest(line);
      else if (/\bidr\b/i.test(line)) n = pickNumberAfter(line, /idr/) || pickBiggest(line);
      else if (/\bjumlah\b/i.test(line)) n = pickNumberAfter(line, /jumlah/) || pickBiggest(line);
      else if (/\bnominal\b/i.test(line)) n = pickNumberAfter(line, /nominal/) || pickBiggest(line);
      if (n >= 100) { totalAmount = n; break; }
    }
  }

  // Sanity check: cari angka terbesar di bawah struk (skip noise → hindari tanggal/waktu jadi angka)
  let biggestBottom = 0;
  const bottomStart = Math.floor(lines.length * 0.4);
  for (let i = bottomStart; i < lines.length; i++) {
    if (isNoise(lines[i])) continue;
    const n = pickBiggest(lines[i]);
    if (n > biggestBottom) biggestBottom = n;
  }

  // Juga cek harga item: cari angka terbesar dari baris item (area tengah struk)
  // Jika ada item lebih mahal dari detected total → total pasti salah
  let biggestItem = 0;
  for (let i = 2; i < Math.max(2, lines.length - 4); i++) {
    if (isNoise(lines[i])) continue;
    // Baris item: ada angka di akhir yang terformat (separator ribuan)
    const priceMatch = lines[i].match(/(\d{1,3}(?:[.,]\d{3})+)\s*$/);
    if (priceMatch) {
      const n = parseIDR(priceMatch[1]);
      if (n > biggestItem) biggestItem = n;
    }
  }

  // Jika total < harga satu item → total pasti salah (OCR misread)
  if (totalAmount > 0 && biggestItem > totalAmount) {
    console.log(`[parse-receipt] total ${totalAmount} < item terbesar ${biggestItem}, cari ulang`);
    // Cari angka terformat terbesar dari SEMUA non-noise lines
    let biggestFormatted = 0;
    for (let i = 0; i < lines.length; i++) {
      if (isNoise(lines[i])) continue;
      const fmatch = lines[i].match(/\d{1,3}(?:[.,]\d{3})+/g);
      if (fmatch) {
        for (const fm of fmatch) {
          const n = parseIDR(fm);
          if (n > biggestFormatted) biggestFormatted = n;
        }
      }
    }
    if (biggestFormatted > totalAmount) {
      totalAmount = biggestFormatted;
    } else if (subtotalAmount > totalAmount) {
      totalAmount = subtotalAmount;
    }
    console.log(`[parse-receipt] corrected total: ${totalAmount}`);
  }

  // Last resort: belum ketemu total sama sekali
  if (!totalAmount && biggestBottom >= 100) {
    totalAmount = biggestBottom;
    console.log(`[parse-receipt] last resort biggest: ${totalAmount}`);
  }

  // ── MERCHANT ──
  let merchant = "";
  const isTransfer = /transfer|beneficiary|penerima/i.test(text);

  // 0) Transfer bank → ambil nama penerima
  if (isTransfer) {
    for (const line of lines) {
      const beneficiary = line.match(/(?:beneficiary\s*name|nama\s*penerima|penerima)[:\s]+(.+)/i);
      if (beneficiary?.[1]) {
        const name = beneficiary[1].trim().replace(/\d+/g, "").trim();
        if (name.length >= 3) { merchant = `Transfer ke ${name}`; break; }
      }
    }
  }

  // 1) Cek known brand di seluruh teks (paling reliable)
  if (!merchant) merchant = findKnownBrand(text);

  // 2) Brand regex di 10 baris pertama (skip alamat)
  if (!merchant) {
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      if (isAddress(lines[i])) continue;
      const m = lines[i].match(BRANDS_REGEX);
      if (m) {
        const cleaned = cleanMerchant(lines[i], m);
        if (cleaned && !isGarbage(cleaned)) { merchant = cleaned; break; }
      }
    }
  }

  // 3) Baris pertama yang bukan noise & bukan garbage
  if (!merchant) {
    for (let i = 0; i < Math.min(6, lines.length); i++) {
      if (isNoise(lines[i])) continue;
      const cleaned = cleanMerchant(lines[i]);
      if (cleaned && !isGarbage(cleaned)) { merchant = cleaned; break; }
    }
  }

  // 4) Fallback: ambil nama item paling mahal dari struk
  let itemHint = "";
  if (!merchant) {
    itemHint = findItemHint(lines);
  }

  // Log bottom lines untuk debugging OCR
  const tail = lines.slice(-8).map((l, i) => `  ${lines.length - 8 + i}: ${l}`).join("\n");
  console.log(`[parse-receipt] bottom lines:\n${tail}`);
  console.log("[parse-receipt] hints:", { totalAmount, subtotalAmount, biggestBottom, merchant, itemHint, lineCount: lines.length });
  return { totalAmount, merchant, itemHint };
}

/* ─── Kategori dari keyword ─── */
function guessCategory(text: string): string {
  if (/warung|resto|cafe|kopi|coffee|food|makan|bakery|starbucks|kfc|mcdonald|hokben|yoshinoya|pizza|sushi|solaria|chatime|mixue|es\s*teler|geprek|ayam|bakso|mie\s*gacoan|richeese/i.test(text)) return "Food";
  if (/indomarco|indomaret|alfamart|alfamidi|minimarket|mart\b|toko|shop/i.test(text)) return "Shopping";
  if (/listrik|pln|air|pdam|internet|wifi|telkom|pulsa|token/i.test(text)) return "Bills";
  if (/grab|gojek|uber|taxi|taksi|bus|kereta|mrt|lrt|transjakarta|parkir/i.test(text)) return "Transport";
  return "Other";
}

const SYSTEM_PROMPT = `Parse struk/transfer Indonesia → JSON saja.
{"amount":NUMBER,"type":"expense"|"income","category":"STRING","note":"STRING"}
note = nama toko/restoran. Jika tidak ada, tulis nama item utama. BUKAN alamat, tanggal, jam, kota. Maks 30 karakter.
category: Food/Transport/Shopping/Bills/Health/Entertainment/Other (expense)`;

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY && !GROQ_API_KEY && !OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "Belum ada API key AI. Set GEMINI_API_KEY, GROQ_API_KEY, atau OPENROUTER_API_KEY." },
      { status: 503 }
    );
  }

  let body: { text?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Body harus JSON" }, { status: 400 });
  }

  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 8000) {
    return NextResponse.json({ error: "Teks kosong atau terlalu panjang" }, { status: 400 });
  }

  const hints = extractHints(text);

  let aiCategory = "";
  let aiNote = "";
  try {
    const merchantInfo = hints.merchant || hints.itemHint || "?";
    const userMsg = hints.totalAmount > 0
      ? `Amount=${hints.totalAmount}. Merchant="${merchantInfo}". Tentukan category. Perbaiki note jadi nama toko/restoran/item saja.\n\n${text.slice(0, 3000)}`
      : `Cari total akhir (bukan subtotal) dan nama toko/restoran.\n\n${text.slice(0, 4000)}`;

    const result = await callAIWithFallback(SYSTEM_PROMPT, userMsg, 120);

    if (result) {
      console.log(`[parse-receipt] ${result.provider} raw:`, result.content);
      let jsonStr = result.content;
      const b1 = jsonStr.indexOf("{");
      const b2 = jsonStr.lastIndexOf("}");
      if (b1 !== -1 && b2 > b1) jsonStr = jsonStr.slice(b1, b2 + 1);
      try {
        const parsed = JSON.parse(jsonStr);
        if (typeof parsed.category === "string") aiCategory = parsed.category;
        if (typeof parsed.note === "string" && parsed.note.trim()) aiNote = parsed.note.trim();
        if (!hints.totalAmount && typeof parsed.amount !== "undefined") {
          const n = typeof parsed.amount === "number" ? parsed.amount : parseInt(String(parsed.amount).replace(/[.,\s]/g, ""), 10);
          if (!Number.isNaN(n) && n >= 100 && n <= 100_000_000) hints.totalAmount = n;
        }
      } catch { /* ignore */ }
    }
  } catch (e) {
    console.error("[parse-receipt] AI error:", e);
  }

  const amount = hints.totalAmount;
  if (!amount || amount <= 0) {
    return NextResponse.json(
      { error: "Nominal tidak terbaca. Coba foto lebih jelas atau isi manual." },
      { status: 422 }
    );
  }

  const isIncome = /transfer\s*masuk|kredit|gaji|salary|deposit/i.test(text);
  const type = isIncome ? "income" : "expense";
  const validCats = type === "income"
    ? ["Salary", "Freelance", "Investment", "Gift", "Other"]
    : ["Food", "Transport", "Shopping", "Bills", "Health", "Entertainment", "Other"];

  let category = aiCategory && validCats.includes(aiCategory) ? aiCategory : guessCategory(text);
  if (!validCats.includes(category)) category = validCats[0];

  const noteOk = (n: string) =>
    n && n.length >= 3 && !isGarbage(n) && !/\d{2}[:\-\/\.]\d{2}/.test(n) && !isAddress(n) && !/©/.test(n);

  let note = "Dari foto";
  if (aiNote && noteOk(aiNote)) note = aiNote;
  else if (hints.merchant && noteOk(hints.merchant)) note = hints.merchant;
  else if (hints.itemHint) note = hints.itemHint;

  console.log("[parse-receipt] result:", { amount, type, category, note });
  return NextResponse.json({ amount, type, category, note: note.slice(0, 200) });
}
