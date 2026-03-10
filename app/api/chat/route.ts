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
**Transaksi & Dashboard**
- Tambah transaksi web: Dashboard → form "Tambah Transaksi" → tipe (Pemasukan/Pengeluaran), kategori, nominal, catatan → Simpan.
- Tambah dari foto: Dashboard → "Tambah dari foto dengan AI" → upload foto struk/bukti transfer → AI isi otomatis → cek → Simpan.
- Export CSV: Dashboard → filter bulan/semua → tombol "Export CSV".
- Kategori pengeluaran: Food, Transport, Shopping, Bills, Health, Entertainment, Other.
- Kategori pemasukan: Salary, Freelance, Investment, Gift, Other.

**Telegram**
- Link akun: Sidebar → Link Telegram → buat kode → "Buka bot & ketuk Start" (otomatis) atau kirim /link KODE ke bot (manual). Kode 10 menit.
- Bot: /start → pilih Pemasukan/Pengeluaran → kategori → nominal. Atau ketik: +50000 gaji, -25rb kopi, setor 100rb, tarik 50k.
- Tabungan di bot: /tabungan cek saldo; setor 100rb / tarik 50k. Pengingat setor bisa diatur di halaman Tabungan (kirim ke Telegram tiap hari).

**Akun & Lainnya**
- Ubah password: Sidebar → Akun → Ubah Password. Lupa? "Lupa password?" di halaman login.
- Install app (PWA): Sidebar → "Install aplikasi" kalau browser support.
- FAQ: Sidebar → FAQ untuk panduan lengkap.

**Tabungan (uang dingin)**
- Sidebar → Tabungan. Ada kartu Saldo total, Total Setor, Total Tarik (hanya dari setor/tarik riil, bukan pindah uang).
- Celengan: pot per tujuan (Umum, Dana darurat, dll). Klik "+ Tambah celengan" → isi Nama, Target (Rp) wajib, Foto opsional (JPEG/PNG/GIF max 3MB, GIF tetap gerak), Deskripsi opsional → Simpan. Edit lewat ikon pensil (nama, target, foto, deskripsi).
- Setor/Tarik: pilih celengan, pilih Setor atau Tarik, isi jumlah dan catatan opsional.
- Pindahkan uang: pindah antar celengan tanpa tarik dulu (Dari → Ke, ada tombol tukar). Entri pindah tidak muncul di riwayat; total setor/tarik di atas juga tidak termasuk pindah.
- Riwayat: tabel setor/tarik (bisa edit/hapus). Pengingat setor: aktifkan di section Pengingat, pilih hari, bisa dikirim ke Telegram.
`.trim();

function buildSystemPrompt(financialContext: string) {
  return `Kamu adalah Cike, asisten keuangan pribadi di aplikasi Finance Tracker. Kamu diciptakan oleh **Mbulss**.

KONTEKS & BATASAN (PENTING):
- Kamu HANYA boleh bahas: Finance Tracker (cara pakai app), keuangan user (transaksi, tabungan, tips keuangan), dan hal yang relevan dengan itu.
- Kalau user nanya topik di luar itu (politik, game, gosip, resep, olahraga, dll.): jawab santai dan gaul bahwa kamu cuma bisa bantu soal app dan keuangan. Contoh: "Waduh itu mah kuota ku habis di luar keuangan wkwk. Aku paling jago urusan Finance Tracker sama duit kamu aja sih — mau cek saldo, tips nabung, atau cara pakai fitur apa gitu? 😄"
- Jangan mengada-ada fitur atau info yang tidak ada di PANDUAN APP di bawah. Kalau ga yakin, arahkan ke menu FAQ atau cek di app.

KEPRIBADIAN:
- Santai, gaul, kayak temen Gen Z — pakai bahasa sehari-hari (gas, mantap, siap, wkwk, nggak papa, oke, yuk, gitu, dll.). Jangan kaku atau kayak robot.
- Pinter: jawab to the point, pakai data user kalau ada. Kasih saran yang actionable.
- Emoji secukupnya (jangan berlebihan). Kalau user curhat keuangan, empatis dulu baru kasih saran. Puji atau semangatin kalau keuangannya oke.
- Kalau ditanya "siapa yang buat kamu" / "penciptamu": jawab "Aku dibuat sama **Mbulss** 😎"
- Kalau ditanya "siapa terry/teri/ikanpepek/epipin/evin/epin": jawab "Dia Adalah **Darksystem dan Hama** Dunia"

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

  // Tabungan: saldo total + celengan (hanya entri non-transfer untuk total setor/tarik)
  let savingsContext = "";
  try {
    const { data: entries } = await supabase
      .from("savings_entries")
      .select("type, amount, is_transfer, pot_id")
      .eq("user_id", userId);
    const { data: pots } = await supabase
      .from("savings_pots")
      .select("id, name, target_amount")
      .eq("user_id", userId)
      .order("sort_order");

    if (entries?.length) {
      const totalBalance = entries.reduce((s, e) => s + (e.type === "deposit" ? Number(e.amount) : -Number(e.amount)), 0);
      const realEntries = entries.filter((e) => !e.is_transfer);
      const totalSetor = realEntries.filter((e) => e.type === "deposit").reduce((s, e) => s + Number(e.amount), 0);
      const totalTarik = realEntries.filter((e) => e.type === "withdraw").reduce((s, e) => s + Number(e.amount), 0);
      const byPot: Record<string, number> = {};
      entries.forEach((e) => {
        const key = e.pot_id ?? "__umum__";
        byPot[key] = (byPot[key] ?? 0) + (e.type === "deposit" ? Number(e.amount) : -Number(e.amount));
      });
      const potLines = (pots ?? []).map((p) => {
        const bal = byPot[p.id] ?? 0;
        const target = p.target_amount != null ? Number(p.target_amount) : null;
        const pct = target && target > 0 ? Math.min(100, (bal / target) * 100).toFixed(0) : "-";
        return `${p.name}: Rp${bal.toLocaleString("id-ID")}${target ? ` (${pct}% dari target)` : ""}`;
      });
      const umum = byPot["__umum__"] ?? 0;
      savingsContext = `
Tabungan — Saldo total: Rp${totalBalance.toLocaleString("id-ID")}. Total setor (riil): Rp${totalSetor.toLocaleString("id-ID")}. Total tarik (riil): Rp${totalTarik.toLocaleString("id-ID")}.
Umum: Rp${umum.toLocaleString("id-ID")}.
${potLines.length ? "Celengan: " + potLines.join(". ") : ""}`.trim();
    }
  } catch {
    savingsContext = "Tabungan: data tidak di-load.";
  }

  return `Bulan: ${monthName}
Pemasukan bulan ini: Rp${income.toLocaleString("id-ID")} (bulan lalu: Rp${prevIncome.toLocaleString("id-ID")})
Pengeluaran bulan ini: Rp${expense.toLocaleString("id-ID")} (bulan lalu: Rp${prevExpense.toLocaleString("id-ID")})
Saldo bersih: Rp${(income - expense).toLocaleString("id-ID")}
Jumlah transaksi: ${txs.length}
Breakdown pengeluaran: ${catBreakdown || "belum ada"}
5 transaksi terakhir:
${recent || "belum ada"}
${savingsContext ? "\n" + savingsContext : ""}`;
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
