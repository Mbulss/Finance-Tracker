const fs = require('fs');
// Mocking the bank email parser logic locally to test it
const text1 = `Top-up Berhasil
Halo HANIIF SATRIA WARDANA,
Berikut adalah detail transaksi Anda:
Penyedia Jasa
OVO
****0370
Tanggal
23 Mar 2026
Jam
16:15:14 WIB
Nominal Top-up
Rp 10.000,00
Biaya Transaksi
Rp 0,00
Total Transaksi
Rp 10.000,00
No. Referensi
702603231615101581`;

const text2 = ` Pembayaran Berhasil
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
 603632433848`;

const text3 = `Transfer dengan BI Fast
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

function parse(text) {
  const amountStr = findLineValue(text, /Nominal\\s+(?:Transaksi|Top-up|Transfer|Pembayaran)\\s*(?:[:\\s]+)?(.*)/i) || findLineValue(text, /Total\\s+(?:Transaksi|Pembayaran)\\s*(?:[:\\s]+)?(.*)/i);
  const datePart = findLineValue(text, /Tanggal\\s*(?:[:\\s]+)?(.*)/i);
  const timePart = findLineValue(text, /Jam\\s*(?:[:\\s]+)?(.*)/i);
  const merchantName = findLineValue(text, /(?:Penerima|Merchant|Penyedia\\s*Jasa|Tujuan)(?!\\s*Transaksi)\\s*(?:[:\\s]+)?(.*)/i) || findLineValue(text, /Tujuan\\s+Transaksi\\s*(?:[:\\s]+)?(.*)/i);
  const referenceId = findLineValue(text, /No\\.\\s*Referensi(?: BI Fast)?\\s*(?:[:\\s]+)?(.*)/i);
  return { amountStr, datePart, timePart, merchantName, referenceId };
}

console.log("TEST 1", parse(text1));
console.log("TEST 2", parse(text2));
console.log("TEST 3", parse(text3));
