import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { detectCategory } from "@/lib/category-rules";
import { parseBankTransactionEmail } from "@/lib/bank-email-parser";

const EMAIL_INGEST_SECRET = process.env.EMAIL_INGEST_SECRET;

type IngestBody = {
  secret?: string;
  userId?: string;
  from?: string;
  subject?: string;
  text?: string;
};

export async function POST(req: NextRequest) {
  if (!EMAIL_INGEST_SECRET) {
    return NextResponse.json({ error: "EMAIL_INGEST_SECRET missing" }, { status: 500 });
  }

  let body: IngestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.secret || body.secret !== EMAIL_INGEST_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const from = typeof body.from === "string" ? body.from.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (!text || text.length > 50_000) return NextResponse.json({ error: "text required" }, { status: 400 });

  const parsed = parseBankTransactionEmail({ from, subject, text });
  if (!parsed) {
    return NextResponse.json(
      { error: "Unsupported email format (Mandiri/BCA parser failed)" },
      { status: 422 }
    );
  }

  const providerTag = parsed.referenceId
    ? `[email:${parsed.provider}:${parsed.referenceId}]`
    : `[email:${parsed.provider}:no-ref:${parsed.amount}:${parsed.occurredAtISO}]`;

  const noteBase = `📧 ${parsed.merchantName}${parsed.merchantLocation ? ` (${parsed.merchantLocation})` : ""}${parsed.qrisRef ? ` QRIS:${parsed.qrisRef}` : ""}`;
  const note = `${noteBase} ${providerTag}`.slice(0, 200);

  const categoryInfo = `${parsed.merchantName} ${parsed.merchantLocation || ""}`.trim();
  const category = detectCategory(parsed.type, categoryInfo);

  const supabase = createSupabaseAdmin();

  // Dedup: always check for the providerTag in existing transactions
  const { data: existing } = await supabase
    .from("transactions")
    .select("id")
    .eq("user_id", userId)
    .ilike("note", `%${providerTag}%`)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ ok: true, duplicated: true });
  }

  const insert = {
    user_id: userId,
    type: parsed.type,
    amount: parsed.amount,
    category,
    note,
    created_at: parsed.occurredAtISO,
  };

  const { error } = await supabase.from("transactions").insert(insert);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, provider: parsed.provider, inserted: insert });
}

