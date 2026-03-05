import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "") || request.nextUrl.searchParams.get("secret");
  if (CRON_SECRET && token !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN missing" }, { status: 500 });
  }

  const supabase = createSupabaseAdmin();
  const { data: links } = await supabase.from("telegram_links").select("chat_id, user_id");
  if (!links?.length) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const from = weekAgo.toISOString();

  let sent = 0;
  for (const { chat_id, user_id } of links) {
    try {
      const { data: tx } = await supabase
        .from("transactions")
        .select("type, amount")
        .eq("user_id", user_id)
        .gte("created_at", from);
      const income = (tx ?? []).filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const expense = (tx ?? []).filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

      const { data: savings } = await supabase
        .from("savings_entries")
        .select("type, amount")
        .eq("user_id", user_id);
      const tabungan = (savings ?? []).reduce((s, e) => s + (e.type === "deposit" ? Number(e.amount) : -Number(e.amount)), 0);

      const fmt = (n: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
      const text = `📊 <b>Ringkasan mingguan</b>\n\n` +
        `💰 Pemasukan: ${fmt(income)}\n` +
        `📉 Pengeluaran: ${fmt(expense)}\n` +
        `📈 Saldo: ${fmt(income - expense)}\n` +
        `🐷 Tabungan: ${fmt(tabungan)}`;

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id, text, parse_mode: "HTML" }),
      });
      sent++;
    } catch {
      // skip failed user
    }
  }

  return NextResponse.json({ ok: true, sent });
}
