import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;

export const maxDuration = 60;

/** Cron harian: kirim pengingat setor tabungan ke Telegram untuk user yang punya reminder di hari ini. */
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
  const dayOfWeek = new Date().getDay();

  const { data: reminders } = await supabase
    .from("savings_reminders")
    .select("user_id")
    .eq("enabled", true)
    .eq("day_of_week", dayOfWeek);

  if (!reminders?.length) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const userIds = Array.from(new Set(reminders.map((r) => r.user_id)));
  const { data: links } = await supabase
    .from("telegram_links")
    .select("chat_id, user_id")
    .in("user_id", userIds);

  if (!links?.length) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  let sent = 0;
  for (const { chat_id, user_id } of links) {
    try {
      const { data: entries } = await supabase
        .from("savings_entries")
        .select("type, amount")
        .eq("user_id", user_id);
      const balance = (entries ?? []).reduce(
        (sum, e) => sum + (e.type === "deposit" ? Number(e.amount) : -Number(e.amount)),
        0
      );
      const text =
        `🐷 <b>Pengingat setor tabungan</b>\n\n` +
        `Jangan lupa setor tabungan hari ini!\n\n` +
        `Saldo saat ini: <b>${fmt(balance)}</b>\n\n` +
        `Setor lewat bot: <code>setor 50rb</code> atau buka dashboard → Tabungan.`;

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
