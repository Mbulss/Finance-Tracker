/**
 * Standalone PDF text extractor.
 * Runs as a child process — completely outside Next.js webpack.
 * Uses pdfjs-dist which properly supports password-protected PDFs.
 *
 * Reads base64-encoded PDF from stdin.
 * Args: [password]
 * Output: JSON with { text, numpages } or { error }
 */

async function main() {
  try {
    const password = process.argv[2] || "";

    // Read all stdin as base64 string
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const base64Data = Buffer.concat(chunks).toString("utf-8").trim();

    if (!base64Data) {
      process.stdout.write(JSON.stringify({ error: "No data provided" }));
      process.exit(1);
    }

    const data = new Uint8Array(Buffer.from(base64Data, "base64"));

    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const docParams = { data };
    if (password) {
      docParams.password = password;
    }

    const pdf = await pdfjsLib.getDocument(docParams).promise;

    // Extract text from all pages, preserving line breaks
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // Build text with proper line breaks based on Y position
      let lastY = null;
      let lineText = "";
      for (const item of textContent.items) {
        if (!item.str) continue;
        const y = Math.round(item.transform[5]); // Y position
        if (lastY !== null && Math.abs(y - lastY) > 2) {
          // Y changed = new line
          fullText += lineText + "\n";
          lineText = "";
        }
        lineText += item.str;
        lastY = y;
      }
      if (lineText) fullText += lineText + "\n";
    }

    process.stdout.write(JSON.stringify({
      text: fullText,
      numpages: pdf.numPages,
    }));
  } catch (err) {
    const msg = (err.message || "").toLowerCase();
    if (msg.includes("password") || msg.includes("encrypted")) {
      process.stdout.write(JSON.stringify({ error: "password_required" }));
    } else {
      process.stdout.write(JSON.stringify({ error: err.message }));
    }
    process.exit(1);
  }
}

main();
