# Finance Tracker AI

Aplikasi **pencatat keuangan pribadi** yang modern: catat pemasukan & pengeluaran lewat **web** atau **Telegram**, lihat ringkasan & grafik, kelola **tabungan (celengan)**, dan dapat bantuan dari **AI asisten (Cike AI)**. Bisa dipakai di desktop dan mobile (layout responsif, PWA-ready).

---

## ✨ Fitur

| Fitur | Keterangan |
|-------|------------|
| **Dashboard** | Ringkasan bulanan (total pemasukan, pengeluaran, saldo), grafik pie pengeluaran per kategori, grafik bar per bulan, tabel transaksi dengan filter bulan & pagination. |
| **Tambah transaksi** | Input manual (tipe, kategori, nominal, catatan). Kategori: Pemasukan (Salary, Freelance, Investment, Gift, Other) dan Pengeluaran (Food, Transport, Shopping, Bills, Health, Entertainment, Other). |
| **Tambah dari foto (AI)** | Upload foto struk atau bukti transfer; AI baca nominal, kategori, dan nama toko/item lalu mengisi form. Cukup cek dan simpan. |
| **Edit & hapus** | Setiap transaksi bisa diedit atau dihapus dari tabel di dashboard. |
| **Tabungan (Celengan)** | Fitur tabungan terpisah: buat banyak celengan (Umum, Dana darurat, Liburan, dll), set target per celengan, setor/tarik, pindah uang antar celengan. Riwayat setor/tarik, edit entri, dan ringkasan total setor/tarik. Opsional: foto & deskripsi per celengan. |
| **Pengingat setor** | Jadwalkan pengingat setor tabungan ke Telegram per hari (misalnya setiap Senin). |
| **Telegram bot** | Kirim pesan seperti `+500000 gaji` atau `-25rb kopi` untuk catat transaksi; `/tabungan` cek saldo; `setor 100k` / `tarik 50k` untuk tabungan. Setelah akun di-link, bot pakai data kamu. |
| **Link Telegram** | Multi-user: setiap user daftar di web, lalu hubungkan akun dengan bot lewat kode (menu Link Telegram). |
| **Cike AI (chatbot)** | Asisten keuangan di dalam app: tanya ringkasan, tips, cara export, dll. Fokus konteks keuangan & aplikasi saja. |
| **Export CSV** | Unduh data transaksi (sesuai filter bulan) untuk Excel/Sheets. |
| **Ringkasan mingguan** | Cron mengirim ringkasan mingguan (pemasukan/pengeluaran/saldo/tabungan) ke Telegram. |
| **Tema gelap** | Dark mode didukung. |
| **Mobile-friendly** | Layout responsif; chat panel menyesuaikan saat keyboard terbuka (tanpa gap). |

---

## 🛠 Tech stack

- **Next.js 14** (App Router)
- **React** + **TypeScript**
- **TailwindCSS**
- **Supabase** (Auth, Database, Realtime)
- **Recharts** (grafik)
- **AI**: Gemini / Groq / OpenRouter (parsing struk & chatbot)
- **Vercel** (deployment & cron)

---

## 📋 Prasyarat

- **Node.js** 18+
- Akun **Supabase** (gratis)
- **Telegram Bot** (dari [@BotFather](https://t.me/BotFather))
- (Opsional) **API key** untuk AI: [Gemini](https://aistudio.google.com/apikey), [Groq](https://console.groq.com/keys), atau [OpenRouter](https://openrouter.ai/keys)

---

## 🚀 Setup

### 1. Clone & install

```bash
git clone <url-repo-kamu>
cd "Finance Tracker AI"
npm install
```

### 2. Supabase

1. Buat project di [supabase.com](https://supabase.com).
2. Buka **SQL Editor** dan jalankan script berikut **berurutan**:
   - **`supabase/schema.sql`** — tabel transaksi, auth, link Telegram.
   - **`supabase/schema-tabungan.sql`** — tabel tabungan (entri setor/tarik).
   - **`supabase/schema-tabungan-pots.sql`** — celengan, target, pengingat, foto/deskripsi.
3. (Opsional) **Realtime**: Database → Replication → aktifkan untuk `transactions`, `savings_entries`, `savings_pots` agar dashboard update live.
4. **URL & redirect (penting untuk email)**  
   Supabase Dashboard → **Authentication → URL Configuration**:
   - **Site URL**: URL production (mis. `https://your-app.vercel.app`).
   - **Redirect URLs**: tambahkan `https://your-app.vercel.app/**` dan `http://localhost:3000/**`.
5. **Google Login (opsional)**  
   Authentication → Providers → Google → Enable, lalu set Client ID & Secret dari [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Tambahkan authorized origins & redirect URI sesuai petunjuk Supabase.
6. Copy **Project URL** dan **anon key** dari Settings → API. Untuk webhook Telegram, copy juga **service_role** key (jangan bocor).

### 3. Environment variables

Copy `.env.example` ke `.env.local`:

```bash
cp .env.example .env.local
```

Isi di `.env.local`:

| Variable | Wajib | Keterangan |
|----------|--------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Project URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anon/public key Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (untuk webhook Telegram) |
| `TELEGRAM_BOT_TOKEN` | ✅ | Token dari @BotFather |
| `NEXT_PUBLIC_APP_URL` | Disarankan (production) | URL app tanpa trailing slash, untuk redirect auth (mis. `https://your-app.vercel.app`) |
| `TELEGRAM_SET_WEBHOOK_SECRET` | Opsional | Rahasia untuk endpoint set-webhook (agar hanya kamu yang bisa panggil) |
| `CRON_SECRET` | Opsional | Untuk cron ringkasan mingguan & pengingat setor (set di Vercel) |
| `GEMINI_API_KEY` | Opsional* | AI parsing struk & chatbot (prioritas 1) |
| `GROQ_API_KEY` | Opsional* | Fallback AI (prioritas 2) |
| `OPENROUTER_API_KEY` | Opsional* | Fallback AI (prioritas 3) |

\* Minimal set satu key AI agar fitur foto struk & Cike AI jalan. Tanpa AI, tetap bisa dipakai untuk transaksi manual & bot Telegram.

**Multi-user:** User daftar di web, lalu di menu **Link Telegram** buat kode dan kirim `/link KODE` ke bot. Tidak perlu isi `TELEGRAM_USER_ID` kalau pakai flow link.

### 4. Jalankan lokal

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Daftar / login (email atau Google), lalu pakai dashboard. User yang login Google bisa (opsional) set password lewat menu **Akun** agar bisa login email+password.

### 5. Telegram webhook (setelah deploy)

Setelah deploy ke Vercel (atau host HTTPS lain), set webhook **sekali**:

**Otomatis (disarankan):**  
Set env `TELEGRAM_SET_WEBHOOK_SECRET` di Vercel. Setelah deploy, buka di browser:

```
https://<domain-kamu>/api/telegram/set-webhook?secret=<nilai-TELEGRAM_SET_WEBHOOK_SECRET>
```

**Manual:**

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<DOMAIN_KAMU>/api/telegram/webhook"
```

---

## 📅 Cron (opsional)

- **Ringkasan mingguan**  
  Vercel cron memanggil `/api/cron/weekly-summary` (jadwal default: Senin 08:00 UTC). Set env `CRON_SECRET` di Vercel; request otomatis pakai header `Authorization: Bearer <CRON_SECRET>`.

- **Pengingat setor tabungan**  
  Cron harian memanggil `/api/cron/savings-reminder` (default 02:00 UTC). User yang mengaktifkan pengingat di halaman Tabungan akan dapat pesan di Telegram di hari yang dipilih.

Tes manual (ganti URL & secret):

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" "https://<domain-kamu>/api/cron/weekly-summary"
curl -H "Authorization: Bearer <CRON_SECRET>" "https://<domain-kamu>/api/cron/savings-reminder"
```

---

## 🌐 Deployment (Vercel)

1. Push repo ke GitHub, import project di [Vercel](https://vercel.com).
2. Tambahkan semua environment variables di Vercel (Settings → Environment Variables).
3. Deploy. Lalu set Telegram webhook seperti di atas.

---

## 📁 Struktur project

```
├── app/
│   ├── api/
│   │   ├── chat/              # Cike AI chatbot
│   │   ├── cron/               # weekly-summary, savings-reminder
│   │   ├── parse-receipt/     # AI baca foto struk
│   │   └── telegram/           # webhook, set-webhook, link-code
│   ├── auth/                   # Login, signup, update-password
│   ├── faq/                    # Halaman FAQ
│   ├── link-telegram/          # Link akun ke bot
│   ├── profile/                # Akun (ubah password, dll)
│   ├── tabungan/               # Tabungan & celengan
│   ├── layout.tsx
│   ├── page.tsx                # Dashboard (protected)
│   └── globals.css
├── components/
│   ├── Dashboard.tsx
│   ├── SummaryCards.tsx
│   ├── AddTransactionForm.tsx
│   ├── AddFromPhoto.tsx        # Upload foto struk
│   ├── TransactionTable.tsx
│   ├── ExpensePieChart.tsx
│   ├── MonthlyBarChart.tsx
│   ├── TabunganContent.tsx
│   ├── ChatBot.tsx             # Cike AI
│   ├── FAQContent.tsx
│   └── ...
├── lib/
│   ├── supabase/               # Client browser, server, admin
│   ├── types.ts
│   ├── category-rules.ts       # Keyword → kategori (Telegram)
│   ├── telegram-parser.ts      # Parse +50k gaji / -25rb kopi
│   └── parse-receipt-text.ts   # Helper parsing teks struk
├── supabase/
│   ├── schema.sql
│   ├── schema-tabungan.sql
│   ├── schema-tabungan-pots.sql
│   └── migrations/             # ALTER TABLE untuk kolom tambahan
├── .env.example
└── vercel.json                 # Cron config
```

---

## 📱 Format pesan Telegram

| Pesan | Arti |
|-------|------|
| `+500000 gaji` | Pemasukan 500.000, catatan "gaji" |
| `-25rb kopi` | Pengeluaran 25.000, catatan "kopi" (rb/jt/k didukung) |
| `/tabungan` | Balas dengan saldo tabungan |
| `setor 100k` / `setor 500rb` | Setor ke tabungan |
| `tarik 50k` | Tarik dari tabungan |
| `/link KODE` | Hubungkan chat ke akun web (setelah buat kode di Link Telegram) |

Atau Klik" Opsi Buttonnya
---

## 📄 License

MIT
