import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { parseBankTransactionEmail } from "@/lib/bank-email-parser";
import { detectCategory } from "@/lib/category-rules";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: `Sesi login lokal tidak terdeteksi. Silakan Refresh (F5) halaman Web, lalu Sign-in lagi. Details: ${authError?.message}` }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { providerToken, transactionsToSave } = body;
  const adminClient = createSupabaseAdmin();

  // 1. ACTION: SAVE TRANSACTIONS TO DB
  if (transactionsToSave && Array.isArray(transactionsToSave)) {
    let insertedCount = 0;
    for (const trx of transactionsToSave) {
      const { error } = await adminClient.from("transactions").insert({
        user_id: user.id,
        type: trx.type,
        amount: trx.amount,
        category: trx.category,
        note: trx.note,
        created_at: trx.created_at,
      });
      if (!error) insertedCount++;
    }
    return NextResponse.json({ insertedCount, message: "Saved successfully" });
  }

  // 2. ACTION: PREVIEW TRANSACTIONS
  let effectiveToken = providerToken;

  if (!effectiveToken) {
    // Try to get refresh token from database
    const { data: integ } = await adminClient
      .from("user_integrations")
      .select("refresh_token")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .single();

    if (integ?.refresh_token) {
      try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: integ.refresh_token,
            grant_type: "refresh_token",
          }),
        });

        const tokens = await response.json();
        if (tokens.access_token) {
          effectiveToken = tokens.access_token;
        } else {
          console.error("Failed to refresh token", tokens);
        }
      } catch (e) {
        console.error("Refresh token exchange error", e);
      }
    }
  }

  if (!effectiveToken) {
    return NextResponse.json({ error: "No Gmail connection active. Please reconnect." }, { status: 400 });
  }

  const gmailApi = "https://gmail.googleapis.com/gmail/v1/users/me/messages";
  const query = encodeURIComponent("from:(noreply.livin@bankmandiri.co.id OR bca.co.id) newer_than:1d");
  
  const listRes = await fetch(`${gmailApi}?q=${query}&maxResults=15`, {
    headers: { Authorization: `Bearer ${effectiveToken}` },
  });

  if (!listRes.ok) {
    const errorText = await listRes.text();
    console.error("GMAIL API REJECTED:", listRes.status, errorText);
    
    if (listRes.status === 401) {
       return NextResponse.json({ 
         error: `Google menolak kunci Akses Anda (401). Analisis: 1) Ada kemungkinan Anda belum mengaktifkan layanan "Gmail API" di Google Cloud API Library, atau 2) Anda lupa nambahin scope gmail di Setingan Cloud, atau 3) Centang kotak login dilewatkan. Detail Error Google Resmi: ${errorText}` 
       }, { status: 401 });
    }
    if (listRes.status === 403) {
       return NextResponse.json({ 
         error: `Google Memblokir (403). Gmail API kemungkinan besar BELUM di-Enable di dasbor Google Cloud Anda. Detail Error: ${errorText}` 
       }, { status: 403 });
    }
    
    return NextResponse.json({ error: `Gagal menarik daftar email dari Google API: ${listRes.status} ${errorText}` }, { status: 500 });
  }

  const listData = await listRes.json();
  const messages = listData.messages || [];

  if (messages.length === 0) {
    return NextResponse.json({ preview: [], emailsChecked: 0 });
  }

  const previewList = [];
  const debugInfo = [];

  for (const msg of messages) {
    try {
    const msgRes = await fetch(`${gmailApi}/${msg.id}?format=full`, {
      headers: { Authorization: `Bearer ${effectiveToken}` },
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
    
    // Some emails might have 'data' directly in body
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

    if (!plainText) {
       debugInfo.push({ subject, reason: "No plain text body found" });
       continue;
    }

    const parsed = parseBankTransactionEmail({ from, subject, text: plainText });
    if (!parsed) {
       debugInfo.push({ subject, reason: "Regex parser did not match", snippet: plainText.substring(0, 150) });
       console.log("DEBUG GMAIL FAILED PARSE:", subject, "\nBODY:", plainText);
       continue;
    }

    const providerTag = parsed.referenceId
      ? `[email:${parsed.provider}:${parsed.referenceId}]`
      : `[email:${parsed.provider}:no-ref]`;
      
    const notePieces = [
      providerTag,
      parsed.merchantName,
      parsed.merchantLocation ? `(${parsed.merchantLocation})` : "",
      parsed.qrisRef ? `QRIS:${parsed.qrisRef}` : "",
    ].filter(Boolean);
    const note = notePieces.join(" ").slice(0, 200);

    const category = detectCategory(parsed.type, parsed.merchantName);

    // Dedup via notes reference
    if (parsed.referenceId) {
      const { data: existing } = await adminClient
        .from("transactions")
        .select("id")
        .eq("user_id", user.id)
        .ilike("note", `${providerTag}%`)
        .limit(1);
        
      if (existing && existing.length > 0) continue; // skip, already exists
    }

    previewList.push({
      id: parsed.referenceId || Math.random().toString(),
      type: parsed.type,
      amount: parsed.amount,
      category,
      note,
      created_at: parsed.occurredAtISO,
      merchantName: parsed.merchantName || "Tidak Diketahui",
    });
    } catch (e: any) {
      console.error("EMAIL PROCESSING ERROR:", msg.id, e?.message);
      debugInfo.push({ subject: msg.id, reason: "Unexpected error: " + e?.message });
    }
  }

  return NextResponse.json({ 
     preview: previewList, 
     emailsChecked: messages.length,
     debug: previewList.length === 0 ? debugInfo : undefined
  });
}
