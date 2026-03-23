"use client";

import { useState } from "react";
import { TELEGRAM_BOT_USERNAME } from "@/lib/constants";

const FAQ_ITEMS = [
  {
    id: "apa-itu",
    question: "Apa itu Finance Tracker?",
    icon: "💰",
    answer: "Finance Tracker adalah aplikasi untuk mencatat pemasukan dan pengeluaran pribadi. Kamu bisa input transaksi lewat dashboard web atau lewat bot Telegram (@MbulssTracker_bot). Data disimpan aman per akun dan bisa dilihat dalam bentuk ringkasan, grafik, serta tabel.",
  },
  {
    id: "tambah-web",
    question: "Bagaimana cara menambah transaksi dari web?",
    icon: "➕",
    answer: "Di halaman Dashboard, gunakan form \"Tambah Transaksi\": pilih tipe (Pemasukan/Pengeluaran), kategori, isi nominal (otomatis terformat dengan titik pemisah ribuan), dan catatan opsional. Lalu klik \"Simpan\". Transaksi bisa diedit atau dihapus dari tabel di bawah.",
  },
  {
    id: "link-telegram",
    question: "Bagaimana cara menghubungkan akun dengan Telegram?",
    icon: "🔗",
    answer: `Buka menu Link Telegram di sidebar. Ada dua cara:

(1) Link otomatis — Paling gampang: buat kode, lalu klik "Buka bot & ketuk Start". Bot terbuka, ketuk Start, akun langsung terhubung. Catatan: Hanya bisa di aplikasi Telegram (HP/desktop), tidak di Telegram Web.

(2) Link manual — Buat kode, lalu kirim /link KODE ke bot @${TELEGRAM_BOT_USERNAME}. Catatan: Bisa dipakai di Telegram Web maupun app, cocok kalau pakai browser.

Kode berlaku 10 menit. Kalau bingung, buka halaman Link Telegram — kedua cara ada di sana dengan penjelasan lengkap.`,
  },
  {
    id: "pakai-bot",
    question: "Bagaimana cara pakai bot Telegram?",
    icon: "📱",
    answer: `Setelah akun terhubung, buka @${TELEGRAM_BOT_USERNAME} dan kirim /start. Pilih "Pemasukan" atau "Pengeluaran" → pilih kategori dari tombol → ketik nominal (boleh pakai rb/jt, misal 25rb atau 1jt) dan catatan. Atau ketik langsung format: +50000 gaji atau -25rb kopi.`,
  },
  {
    id: "ubah-password",
    question: "Bagaimana cara ubah password?",
    icon: "🔒",
    answer: "Buka menu Akun di sidebar (di atas Keluar). Di section \"Ubah Password\", isi password lama (untuk konfirmasi), password baru, dan konfirmasi password baru, lalu klik \"Ubah password\". Notifikasi hijau akan muncul jika berhasil. Kalau lupa password lama, pakai \"Lupa password?\" di halaman login untuk dapat link reset lewat email.",
  },
  {
    id: "tambah-foto",
    question: "Bagaimana cara tambah transaksi dari foto?",
    icon: "📷",
    answer: `Di halaman Dashboard, buka bagian "Tambah dari foto dengan AI" (di bawah form transaksi manual). Lalu:

1. Seret foto struk/bukti transfer ke area upload, atau ketuk area tersebut untuk memilih foto dari galeri.
2. AI akan otomatis membaca foto: mendeteksi nominal, kategori, dan nama toko/item.
3. Hasil bacaan AI langsung mengisi form transaksi. Cek sebentar apakah sudah benar, lalu klik "Simpan".

Tips agar hasil lebih akurat:
• Foto harus jelas dan tidak miring — pastikan angka total dan nama toko terbaca.
• Struk thermal (kertas panjang kasir) dan bukti transfer bank (BCA, Mandiri, dll) didukung.
• Jika nama toko tidak terdeteksi, AI akan mengambil nama item pesanan terbesar sebagai catatan.
• Hasil AI tidak selalu 100% akurat — selalu cek nominal dan catatan sebelum menyimpan.`,
  },
  {
    id: "export",
    question: "Bisakah export data transaksi?",
    icon: "📥",
    answer: "Ya. Di Dashboard, gunakan filter bulan jika perlu, lalu klik tombol \"Export CSV\". File CSV akan terunduh berisi transaksi yang tampil (dengan format nominal dan tanggal yang rapi), siap dibuka di Excel atau Google Sheets.",
  },
  {
    id: "kategori",
    question: "Kategori apa saja yang tersedia?",
    icon: "📂",
    answer: "Pemasukan: Salary, Freelance, Investment, Gift, Other. Pengeluaran: Food, Transport, Shopping, Bills, Health, Entertainment, Other. Semua kategori ini bisa dipilih baik di web maupun di bot Telegram.",
  },
  {
    id: "tabungan",
    question: "Apa itu Tabungan dan cara pakainya?",
    icon: "🐷",
    answer: `Tabungan di Finance Tracker adalah fitur "uang dingin" terpisah dari pemasukan/pengeluaran harian.

• Saldo di atas = total uang tabungan kamu (setor minus tarik).

• Celengan = bagi per tujuan: Umum, Dana darurat, Liburan, dll. Kamu bisa set target per celengan dan lihat progresnya.

• Setor / Tarik = catat setoran atau penarikan uang ke/dari tabungan. Pindahkan uang = pindah antar celengan (mis. dari Umum ke Dana darurat) tanpa tarik dulu — saldo total tetap sama.

• Di Telegram (kalau akun sudah di-link): /tabungan untuk cek saldo, setor 100rb atau tarik 50k untuk setor/tarik. Pengingat setor bisa dikirim ke Telegram tiap hari yang kamu pilih (atur di halaman Tabungan).`,
  },
  {
    id: "email-sync",
    question: "Bagaimana cara kerja Email Otomatis (Gmail API)?",
    icon: "✉️",
    answer: `Fitur ini membaca kotak masuk Gmail Anda, mencari email resi transfer dari Mandiri/BCA, lalu mengubahnya secara otomatis menjadi data pengeluaran di Dashboard.

• Privasi 100% Aman: Kode kami dirancang HANYA mencari dan membaca email pengirim dari domain bank resmi (@bankmandiri.co.id & bca.co.id). Email dari kolega, bos, atau teman Anda sama sekali tidak pernah diakses atau ditarik.
• Cara Pakai: Cukup buka halaman "Email Otomatis", klik Hubungkan. Jangan panik bila muncul peringatan merah "Google hasn't verified this app" (fitur ini masih dalam tahap pengetesan internal), silakan klik Advanced (Lanjutan) lalu klik Allow/Continue.
• Otomatis Masuk: Sesudah ditarik, datanya akan langsung memotong/menambah saldo di grafik Dashboard persis layaknya diketik manual!`,
  },
];

export function FAQContent() {
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0]?.id ?? null);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-primary/20 dark:border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/15 dark:to-primary/10 p-6 text-center shadow-card">
        <p className="text-4xl mb-2" aria-hidden>❓</p>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Pertanyaan yang sering diajukan</h2>
        <p className="mt-1 text-sm text-muted dark:text-slate-400 max-w-xl mx-auto">
          Cari jawaban singkat tentang cara pakai Finance Tracker. Klik pertanyaan untuk membuka jawabannya.
        </p>
      </div>

      <div className="space-y-3">
        {FAQ_ITEMS.map((item) => {
          const isOpen = openId === item.id;
          return (
            <div
              key={item.id}
              className="rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 shadow-card overflow-hidden transition-shadow hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="flex w-full items-center gap-4 p-4 sm:p-5 text-left focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-inset rounded-2xl"
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${item.id}`}
                id={`faq-question-${item.id}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-lg" aria-hidden>
                  {item.icon}
                </span>
                <span className="flex-1 font-medium text-slate-800 dark:text-slate-100">{item.question}</span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>
              <div
                id={`faq-answer-${item.id}`}
                role="region"
                aria-labelledby={`faq-question-${item.id}`}
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-border dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/50 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{item.answer}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-primary/30 dark:border-primary/40 bg-primary/5 dark:bg-primary/10 p-4 text-center">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Masih ada pertanyaan? Pastikan akun Telegram sudah terhubung dan coba fitur &quot;Cara pakai&quot; di bot.
        </p>
      </div>
    </div>
  );
}
