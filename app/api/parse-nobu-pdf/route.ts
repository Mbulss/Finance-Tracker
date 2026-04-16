import { NextRequest, NextResponse } from "next/server";
import { parseNobuPDFText } from "@/lib/nobu-pdf-parser";
import { execFile } from "child_process";
import path from "path";

function runPdfParser(base64Data: string, password?: string): Promise<{ text: string; numpages: number }> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "scripts", "parse-pdf.js");
    const args = password ? [scriptPath, password] : [scriptPath];

    const child = execFile("node", args, {
      maxBuffer: 100 * 1024 * 1024, // 100MB for large PDFs
    }, (error, stdout, stderr) => {
      try {
        const result = JSON.parse(stdout.trim());
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      } catch {
        reject(new Error(stderr || error?.message || "Failed to parse PDF"));
      }
    });

    // Write base64 data to stdin
    child.stdin?.write(base64Data);
    child.stdin?.end();
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const password = (formData.get("password") as string) || "";

    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "File PDF tidak ditemukan." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    let pdfResult;
    try {
      console.log("[parse-nobu] password received:", password ? `"${password}" (${password.length} chars)` : "(none)");
      pdfResult = await runPdfParser(base64Data, password || undefined);
    } catch (parseErr: any) {
      const msg = parseErr.message ?? "";
      console.log("[parse-nobu] parse error:", msg);
      if (msg === "password_required") {
        return NextResponse.json(
          {
            error: password
              ? "Password salah. Coba lagi."
              : "PDF ini dilindungi password. Masukkan password untuk membukanya.",
            needsPassword: true,
            wrongPassword: !!password,
          },
          { status: 422 }
        );
      }
      throw parseErr;
    }

    const rows = parseNobuPDFText(pdfResult.text);

    return NextResponse.json({ rows, pageCount: pdfResult.numpages });
  } catch (err: any) {
    console.error("Parse Nobu PDF error:", err);
    return NextResponse.json(
      { error: err.message ?? "Gagal membaca PDF." },
      { status: 500 }
    );
  }
}
