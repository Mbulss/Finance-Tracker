function normText(input) {
  return input
    .replace(/\r/g, "")
    .replace(/\x80/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findLineValue(text, label) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(label);
    if (m?.[1]) return m[1].trim(); 
    if (label.test(line)) {
      const next = lines[i + 1]?.trim();
      if (next) return next;
    }
  }
  return "";
}

function parseIDRAmount(raw) {
  let s = raw.trim();
  s = s.replace(/^IDR\s*/i, "").replace(/^Rp\s*/i, "");
  const n = parseInt(s.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function parse(textRaw) {
  const text = normText(textRaw);

  const amountStr = findLineValue(text, /Nominal\s+(?:Transaksi|Top-up|Transfer|Pembayaran)\s*(?:[:\s]+)?(.*)/i) || findLineValue(text, /Total\s+(?:Transaksi|Pembayaran)\s*(?:[:\s]+)?(.*)/i);
  const amount = parseIDRAmount(amountStr);
  const datePart = findLineValue(text, /Tanggal\s*(?:[:\s]+)?(.*)/i);
  const timePart = findLineValue(text, /Jam\s*(?:[:\s]+)?(.*)/i);
  const merchantName = findLineValue(text, /(?:Penerima|Merchant|Penyedia\s*Jasa|Tujuan)(?!\s*Transaksi)\s*(?:[:\s]+)?(.*)/i) || findLineValue(text, /Tujuan\s+Transaksi\s*(?:[:\s]+)?(.*)/i);
  
  if (!amount || !datePart || !timePart || !merchantName) {
		console.log("FILED", { amountStr, amount, datePart, timePart, merchantName });
		return null;
  }
  return "SUCCESS";
}

const input2 = ` Pembayaran Berhasil
Halo HANIIF SATRIA WARDANA,
Berikut adalah detail transaksi Anda dengan QR:
 Penerima
Coda Payments
 JAKARTA SELATAN - ID
 Tanggal
 23 Mar 2026
 Jam
 16:03:48 WIB
 Nominal Transaksi
 Rp 141.000,00
 No. Referensi
 2603231121559201208
 No. Ref. QRIS
 603632433848
 Merchant PAN
 9360091439590676648
 Customer PAN
 9360000812124856409
 Pengakuisisi
 GoPay
 Terminal ID
 A01
Sumber Dana
 HANIIF SATRIA WARDAN
 ****5640`;

const input3 = `Transfer dengan BI Fast
Berhasil
Halo HANIIF SATRIA WARDANA,
Berikut adalah detail transaksi Anda:
Penerima
HANIIF SATRIA WARDANA
 Bank Central Asia - 0562200469
Tanggal
23 Mar 2026
Jam
09:04:13 WIB
Nominal Transfer
Rp 2.000.000,00
Biaya Transfer
Rp 2.500,00
Total Transaksi
Rp 2.002.500,00
Tujuan Transaksi
Transfer Kekayaan
No. Referensi BI Fast
20260323BMRIIDJA010O0229176042`;

console.log("INPUT2:", parse(input2));
console.log("INPUT3:", parse(input3));
