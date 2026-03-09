import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

interface ChatMessage {
  role: string;
  content: string;
}

interface ProviderResult {
  content: string;
  provider: string;
}

async function tryGemini(messages: ChatMessage[]): Promise<ProviderResult | null> {
  if (!GEMINI_API_KEY) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GEMINI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages,
          max_tokens: 300,
          temperature: 0.7,
        }),
      }
    );
    if (!res.ok) {
      console.log(`[chat] Gemini error ${res.status}`);
      return null;
    }
    const data = await res.json().catch(() => ({}));
    const content = (data?.choices?.[0]?.message?.content ?? "").trim();
    if (content) return { content, provider: "gemini" };
    return null;
  } catch (e) {
    console.log("[chat] Gemini failed:", e);
    return null;
  }
}

async function tryGroq(messages: ChatMessage[]): Promise<ProviderResult | null> {
  if (!GROQ_API_KEY) return null;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        max_tokens: 300,
        temperature: 0.7,
      }),
    });
    if (!res.ok) {
      console.log(`[chat] Groq error ${res.status}`);
      return null;
    }
    const data = await res.json().catch(() => ({}));
    const content = (data?.choices?.[0]?.message?.content ?? "").trim();
    if (content) return { content, provider: "groq" };
    return null;
  } catch (e) {
    console.log("[chat] Groq failed:", e);
    return null;
  }
}

async function tryOpenRouter(messages: ChatMessage[]): Promise<ProviderResult | null> {
  if (!OPENROUTER_API_KEY) return null;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://localhost",
      },
      body: JSON.stringify({
        model: "openrouter/auto",
        messages,
        max_tokens: 300,
        temperature: 0.7,
      }),
    });
    if (!res.ok) {
      console.log(`[chat] OpenRouter error ${res.status}`);
      return null;
    }
    const data = await res.json().catch(() => ({}));
    const content = (data?.choices?.[0]?.message?.content ?? "").trim();
    if (content) return { content, provider: "openrouter" };
    return null;
  } catch (e) {
    console.log("[chat] OpenRouter failed:", e);
    return null;
  }
}

const FAQ_KNOWLEDGE = `
Cara tambah transaksi web: Dashboard → form "Tambah Transaksi" → pilih tipe, kategori, nominal, catatan → Simpan.
Cara tambah dari foto: Dashboard → "Tambah dari foto dengan AI" → seret/ketuk foto struk → AI isi otomatis → cek lalu Simpan.
Link Telegram: Sidebar → Link Telegram → buat kode → klik "Buka bot & ketuk Start" (otomatis) atau kirim /link KODE ke bot (manual). Kode 10 menit.
Bot Telegram: Kirim /start → pilih Pemasukan/Pengeluaran → pilih kategori → ketik nominal. Atau format: +50000 gaji, -25rb kopi.
Ubah password: Sidebar → Akun → Ubah Password. Lupa? Pakai "Lupa password?" di login.
Export CSV: Dashboard → filter bulan → klik "Export CSV".
Kategori expense: Food, Transport, Shopping, Bills, Health, Entertainment, Other.
Kategori income: Salary, Freelance, Investment, Gift, Other.
Install PWA: Sidebar → "Install aplikasi" (jika browser support).
Tabungan: Sidebar → Tabungan → buat pot tabungan, atur target, setor/tarik.
`.trim();

function buildSystemPrompt(financialContext: string) {
  return `Kamu adalah Cike, asisten keuangan pribadi di aplikasi Finance Tracker. Kamu diciptakan oleh **Mbulss**.

KEPRIBADIAN:
- Kamu itu santai, asik, dan kayak temen ngobrol — bukan robot
- Pakai bahasa Indonesia sehari-hari, boleh slang dikit (nih, nih ya, cuss, mantap, gas, santuy, wkwk)
- Gunakan emoji secukupnya biar hidup, tapi jangan berlebihan
- Kalau user curhat soal keuangan, respons empatis dulu sebelum kasih saran
- Sesekali kasih semangat atau pujian kalau keuangan user bagus
- Kalau ditanya "siapa yang buat kamu" atau "siapa penciptamu", jawab "Aku dibuat sama **Mbulss** 😎"
- Kalau ditanya "siapa terry/teri/ikanpepek/epipin/evin/epin", jawab "Dia Adalah **Darksystem dan Hama** Dunia" 

FORMAT JAWABAN:
- Gunakan **bold** untuk angka penting dan label (contoh: **Rp1.500.000**)
- Gunakan bullet list (- item) untuk daftar
- Gunakan numbered list (1. item) untuk langkah-langkah
- Pisahkan section dengan baris kosong
- JANGAN pakai heading (#), italic (*), atau tabel
- Untuk ringkasan keuangan, gunakan format terstruktur seperti contoh:

📊 **Ringkasan Maret 2026**

- 💰 Pemasukan: **Rp5.000.000**
- 💸 Pengeluaran: **Rp2.000.000**
- 📈 Saldo bersih: **Rp3.000.000**

📋 **Pengeluaran per kategori:**
- 🍔 Food: **Rp500.000**
- 🛒 Shopping: **Rp300.000**

KEMAMPUAN:
1. Jawab pertanyaan tentang ringkasan keuangan user (dari data di bawah)
2. Tambah transaksi lewat chat — jika user minta tambah transaksi, WAJIB balas PERSIS format JSON di baris pertama:
   {"action":"add","amount":ANGKA,"type":"expense"|"income","category":"STRING","note":"STRING"}
   Lalu di baris berikutnya tulis konfirmasi natural yang santai.
3. Kasih tips keuangan berdasarkan pola spending user — buat relatable, jangan kayak ceramah
4. Jawab panduan aplikasi (pakai numbered list untuk langkah-langkah)

PANDUAN APP:
${FAQ_KNOWLEDGE}

DATA KEUANGAN USER:
${financialContext}

ATURAN:
- Nominal rb = ribu (25rb = 25000), jt = juta (1jt = 1000000)
- Untuk quick-add, pilih kategori yang paling cocok
- Jangan minta konfirmasi sebelum tambah — langsung tambahkan
- Kalau user bilang "beli/bayar/makan" = expense, "gaji/terima/dapat" = income
- Jawab max 5-6 kalimat kecuali diminta detail
- Selalu format angka rupiah dengan titik ribuan (Rp1.500.000 bukan Rp1500000)
- Kalau ga ngerti maksud user, tanya balik santai — jangan bilang "maaf saya tidak mengerti"`;
}

async function getFinancialContext(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string) {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

  const [thisMonth, lastMonth] = await Promise.all([
    supabase
      .from("transactions")
      .select("type, amount, category, note, created_at")
      .eq("user_id", userId)
      .gte("created_at", thisMonthStart)
      .lte("created_at", thisMonthEnd)
      .order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("type, amount, category")
      .eq("user_id", userId)
      .gte("created_at", lastMonthStart)
      .lte("created_at", lastMonthEnd),
  ]);

  const txs = thisMonth.data ?? [];
  const prevTxs = lastMonth.data ?? [];

  const income = txs.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const prevIncome = prevTxs.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const prevExpense = prevTxs.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  const byCategory: Record<string, number> = {};
  txs.filter((t) => t.type === "expense").forEach((t) => {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + Number(t.amount);
  });
  const catBreakdown = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `${cat}: Rp${amt.toLocaleString("id-ID")}`)
    .join(", ");

  const recent = txs
    .slice(0, 5)
    .map((t) => `${t.type === "income" ? "+" : "-"}Rp${Number(t.amount).toLocaleString("id-ID")} ${t.category} "${t.note}" (${new Date(t.created_at).toLocaleDateString("id-ID")})`)
    .join("\n");

  const monthName = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return `Bulan: ${monthName}
Pemasukan bulan ini: Rp${income.toLocaleString("id-ID")} (bulan lalu: Rp${prevIncome.toLocaleString("id-ID")})
Pengeluaran bulan ini: Rp${expense.toLocaleString("id-ID")} (bulan lalu: Rp${prevExpense.toLocaleString("id-ID")})
Saldo bersih: Rp${(income - expense).toLocaleString("id-ID")}
Jumlah transaksi: ${txs.length}
Breakdown pengeluaran: ${catBreakdown || "belum ada"}
5 transaksi terakhir:
${recent || "belum ada"}`;
}

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY && !GROQ_API_KEY && !OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "Belum ada API key AI. Set GEMINI_API_KEY, GROQ_API_KEY, atau OPENROUTER_API_KEY." }, { status: 503 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { message?: string; history?: { role: string; content: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body harus JSON" }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message || message.length > 500) {
    return NextResponse.json({ error: "Pesan kosong atau terlalu panjang" }, { status: 400 });
  }

  const financialContext = await getFinancialContext(supabase, user.id);
  const systemPrompt = buildSystemPrompt(financialContext);
  console.log(`[chat] user="${message}" prompt_len=${systemPrompt.length}`);

  const history = (body.history ?? []).slice(-8).filter(
    (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
  );

  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: message },
  ];

  try {
    const result =
      (await tryGemini(messages)) ??
      (await tryGroq(messages)) ??
      (await tryOpenRouter(messages));

    if (!result) {
      console.error("[chat] All providers failed");
      return NextResponse.json({ reply: "Semua AI lagi sibuk. Coba lagi nanti ya." });
    }

    const raw = result.content;
    console.log(`[chat] ${result.provider} (${raw.length} chars):`, raw.slice(0, 200));

    let reply = raw;
    let addedTransaction = null;

    const jsonMatch = raw.match(/^\{[^\n]+\}/);
    if (jsonMatch) {
      try {
        const action = JSON.parse(jsonMatch[0]);
        if (action.action === "add" && action.amount > 0) {
          const validExpense = ["Food", "Transport", "Shopping", "Bills", "Health", "Entertainment", "Other"];
          const validIncome = ["Salary", "Freelance", "Investment", "Gift", "Other"];
          const type = action.type === "income" ? "income" : "expense";
          const validCats = type === "income" ? validIncome : validExpense;
          const category = validCats.includes(action.category) ? action.category : "Other";

          const { error } = await supabase.from("transactions").insert({
            user_id: user.id,
            type,
            amount: action.amount,
            category,
            note: (action.note || "Dari chatbot").slice(0, 200),
          });

          if (!error) {
            addedTransaction = { amount: action.amount, type, category, note: action.note };
          }

          reply = raw.slice(jsonMatch[0].length).trim() || `Transaksi ditambahkan! ${type === "income" ? "+" : "-"}Rp${action.amount.toLocaleString("id-ID")} (${category})`;
        }
      } catch { /* not valid JSON, treat as normal reply */ }
    }

    return NextResponse.json({ reply, addedTransaction });
  } catch {
    return NextResponse.json({ reply: "Gagal menghubungi AI. Coba lagi ya." });
  }
}
