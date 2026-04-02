import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { parseBankTransactionEmail } from "@/lib/bank-email-parser";
import { detectCategory } from "@/lib/category-rules";

// Endpoint ini akan dipanggil oleh Vercel Cron secara berkala (mis: setiap 1 jam)
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const CRON_SECRET = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "") || new URL(req.url).searchParams.get("secret");

  if (CRON_SECRET && token !== CRON_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.local");
    return NextResponse.json({ error: "Missing Google Client credentials in env" }, { status: 500 });
  }

  const adminClient = createSupabaseAdmin();

  // 1. Ambil semua token user yang sudah "Connect Google" dari database
  const { data: integrations, error } = await adminClient
    .from("user_integrations")
    .select("*")
    .eq("provider", "google");

  if (error || !integrations) {
    return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 });
  }

  const results = [];

  // 2. Lakukan iterasi untuk setiap user
  for (const integration of integrations) {
    const seenTagsInBatch = new Set<string>();
    try {
      // 3. Tukar refresh_token lama menjadi access_token baru dari Google API
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: integration.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (!tokenRes.ok) {
        results.push({ userId: integration.user_id, status: "token_failed" });
        continue;
      }

      const { access_token } = await tokenRes.json();
      if (!access_token) continue;

      // 4. Buka Gmail user menggunakan akses sementara (access_token)
      // Tarik 10 transaksi terakhir (newer_than:1d memastikan hanya mengecek email 24 jam terakhir agar cepat)
      const query = encodeURIComponent("from:(noreply.livin@bankmandiri.co.id OR bca.co.id) newer_than:1d");
      const gmailApi = "https://gmail.googleapis.com/gmail/v1/users/me/messages";
      
      const listRes = await fetch(`${gmailApi}?q=${query}&maxResults=10`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      if (!listRes.ok) {
        results.push({ userId: integration.user_id, status: "gmail_fetch_failed" });
        continue;
      }

      const listData = await listRes.json();
      const messages = listData.messages || [];

      let insertedCount = 0;
      
      for (const msg of messages) {
        const msgRes = await fetch(`${gmailApi}/${msg.id}?format=full`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        if (!msgRes.ok) continue;
        
        const msgData = await msgRes.json();
        let subject = "";
        let from = "";
        
        const headers = msgData.payload?.headers || [];
        for (const h of headers) {
          if (h.name.toLowerCase() === "subject") subject = h.value;
          if (h.name.toLowerCase() === "from") from = h.value;
        }

        let plainText = "";
        
        if (msgData.payload?.body?.data) {
          plainText = Buffer.from(msgData.payload.body.data, "base64url").toString("utf8");
        } else if (msgData.payload?.parts) {
          const processParts = (parts: any[]) => {
            for (const p of parts) {
              if (p.mimeType === "text/plain" && p.body?.data) {
                 plainText = Buffer.from(p.body.data, "base64url").toString("utf8");
              } else if (p.mimeType === "text/html" && p.body?.data && !plainText) {
                const html = Buffer.from(p.body.data, "base64url").toString("utf8");
                plainText = html
                  .replace(/<br\s*\/?>/gi, "\n")
                  .replace(/<\/?(div|p|tr|td|th|li|h[1-6])[^>]*>/gi, "\n")
                  .replace(/<[^>]+>/g, " ")
                  .replace(/&nbsp;/gi, " ")
                  .replace(/[ \t]+/g, " ")
                  .replace(/\n\s*\n/g, "\n");
              } else if (p.parts) {
                processParts(p.parts);
              }
            }
          };
          processParts(msgData.payload.parts);
        }

        if (!plainText) continue;

        const parsed = parseBankTransactionEmail({ from, subject, text: plainText });
        if (!parsed) continue;

        const providerTag = parsed.referenceId
          ? `[email:${parsed.provider}:${parsed.referenceId}]`
          : `[email:${parsed.provider}:no-ref:${parsed.amount}:${parsed.occurredAtISO}]`;
          
        const noteBase = `${parsed.merchantName}${parsed.merchantLocation ? ` (${parsed.merchantLocation})` : ""}${parsed.qrisRef ? ` QRIS:${parsed.qrisRef}` : ""}`;
        const note = `${noteBase} ${providerTag}`.slice(0, 200);

        const categoryInfo = `${parsed.merchantName} ${parsed.merchantLocation || ""}`.trim();
        const category = detectCategory(parsed.type, categoryInfo);

        // Dedup via notes reference (Always check)
        const { data: existing } = await adminClient
          .from("transactions")
          .select("id")
          .eq("user_id", integration.user_id)
          .ilike("note", `%${providerTag}%`)
          .limit(1);
          
        if (existing && existing.length > 0) continue; // skip, already exists in DB
        
        // Dedup within same batch (e.g. if Gmail returns duplicate messages)
        if (seenTagsInBatch.has(providerTag)) continue;
        seenTagsInBatch.add(providerTag);

        // 5. Simpan transaksi ke database Dashboard
        const { error: insertError } = await adminClient.from("transactions").insert({
          user_id: integration.user_id,
          type: parsed.type,
          amount: parsed.amount,
          category,
          note,
          created_at: parsed.occurredAtISO,
        });
        
        if (!insertError) insertedCount++;
      }

      // Update waktu sinkronisasi terakhir untuk admin logging
      await adminClient.from("user_integrations").update({ last_synced_at: new Date().toISOString() }).eq("id", integration.id);

      results.push({ userId: integration.user_id, status: "success", inserted: insertedCount });
    } catch (e: any) {
      results.push({ userId: integration.user_id, status: "error", message: e.message });
    }
  }

  return NextResponse.json({ processed: integrations.length, results });
}
