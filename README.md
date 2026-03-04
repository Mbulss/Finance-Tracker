# Finance Tracker

A modern personal finance tracker with a web dashboard and Telegram bot. Add transactions manually or by sending messages like `-25000 kopi` or `+500000 gaji`.

## Tech Stack

- **Next.js 14** (App Router)
- **React** + **TypeScript**
- **TailwindCSS**
- **Supabase** (Database + Auth)
- **Recharts** (Pie & Bar charts)
- **Vercel** (deployment)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the contents of `supabase/schema.sql` (includes table for Telegram category buttons).
3. (Optional) Enable Realtime for `public.transactions` if you want live updates: Database → Replication → enable for `transactions`.
4. Copy **Project URL** and **anon key** from Settings → API. For the webhook, also copy **service_role** key (keep it secret).

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for Telegram webhook) |
| `TELEGRAM_BOT_TOKEN` | From [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_USER_ID` | (Optional) Fallback single user UUID — if set, unlinked Telegram chats use this user. For multi-user, each person links via dashboard **Link Telegram**. |

**Multi-user:** Each user signs up on the web app, then in the dashboard uses **Link Telegram** → "Buat kode" → sends `/link KODE` to the bot. Their Telegram is then linked to their account.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up or sign in, then use the dashboard.

### 5. Telegram webhook

After deploying to Vercel (or any HTTPS host), set the webhook **once**:

**Cara otomatis (disarankan):** Set env `TELEGRAM_SET_WEBHOOK_SECRET` di Vercel (opsional, untuk keamanan). Setelah deploy, buka di browser:

```
https://<domain-vercel-anda>/api/telegram/set-webhook?secret=RAHASIA_ANDA
```

(Ganti `<domain-vercel-anda>` dengan domain Vercel Anda, dan `RAHASIA_ANDA` dengan nilai yang sama seperti `TELEGRAM_SET_WEBHOOK_SECRET` di env. Kalau env `TELEGRAM_SET_WEBHOOK_SECRET` tidak di-set, endpoint bisa dipanggil tanpa `?secret=...`.) Webhook akan terdaftar ke URL deploy saat ini.

**Cara manual:** Jalankan di terminal (ganti token dan URL):

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://YOUR_VERCEL_URL/api/telegram/webhook"
```

Messages to the bot will be parsed and saved to the same `transactions` table.

**Message format:**

- `+500000 gaji` — income, 500000, note "gaji", category auto-detected (e.g. Salary)
- `-25000 kopi` — expense, 25000, note "kopi", category e.g. Food
- Multiple lines in one message are supported.

## Deployment (Vercel)

1. Push the repo to GitHub and import the project in [Vercel](https://vercel.com).
2. Add all environment variables in Vercel (Project → Settings → Environment Variables).
3. Deploy. Set the Telegram webhook to `https://<your-domain>/api/telegram/webhook`.

## Project structure

```
├── app/
│   ├── api/telegram/webhook/   # Telegram webhook handler
│   ├── auth/                   # Sign in / Sign up page
│   ├── layout.tsx
│   ├── page.tsx                # Dashboard (protected)
│   └── globals.css
├── components/
│   ├── Dashboard.tsx
│   ├── SummaryCards.tsx
│   ├── AddTransactionForm.tsx
│   ├── TransactionTable.tsx
│   ├── ExpensePieChart.tsx
│   └── MonthlyBarChart.tsx
├── lib/
│   ├── supabase/               # Browser, server, admin clients
│   ├── types.ts
│   ├── category-rules.ts       # Keyword → category for Telegram
│   └── telegram-parser.ts      # Parse +50000 gaji / -25000 kopi
├── supabase/
│   └── schema.sql
└── .env.example
```

## License

MIT
