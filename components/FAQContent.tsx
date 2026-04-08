"use client";

import { useState, useMemo, useEffect } from "react";
import { TELEGRAM_BOT_USERNAME } from "@/lib/constants";
import { SelectDropdown } from "./SelectDropdown";

const FAQ_ITEMS = [
  {
    id: "apa-itu",
    question: "Apa itu Finance Tracker AI?",
    icon: "💰",
    category: "Dasar",
    answer: `Finance Tracker AI adalah asisten keuangan pintar yang dirancang untuk mempermudah hidup Anda. Bukan sekadar pencatat biasa, aplikasi ini dilengkapi berbagai fitur canggih:

• **AI Receipt Scanner**: Cukup upload foto struk, AI akan membaca nominal dan kategorinya secara otomatis.
• **Gmail Auto-Sync**: Sinkronisasi otomatis dari email bank (BCA/Mandiri) langsung ke dashboard.
• **Telegram Bot**: Catat pengeluaran hanya dalam hitungan detik lewat chat Telegram.
• **Sistem Tabungan**: Kelola "uang dingin" dan buat celengan target (dana darurat, liburan, dll).
• **Cike AI**: Tanya tips keuangan atau minta ringkasan bulanan ke asisten AI kami.
• **Dashboard Interaktif**: Lihat perkembangan asetmu lewat grafik dan laporan yang estetik.

Semua data tersimpan aman dan bisa diakses dari perangkat mana saja (Web & PWA).`,
  },
  {
    id: "tambah-web",
    question: "Bagaimana cara menambah transaksi dari web?",
    icon: "➕",
    category: "Transaksi",
    answer: "Di halaman Dashboard, gunakan form \"Tambah Transaksi\": pilih tipe (Pemasukan/Pengeluaran), kategori, isi nominal (otomatis terformat dengan titik pemisah ribuan), dan catatan opsional. Lalu klik \"Simpan\". Transaksi bisa diedit atau dihapus dari tabel di bawah.",
  },
  {
    id: "link-telegram",
    question: "Bagaimana cara menghubungkan akun dengan Telegram?",
    icon: "🔗",
    category: "Integrasi",
    answer: `Buka menu Link Telegram di sidebar. Ada dua cara:

(1) Link otomatis — Paling gampang: buat kode, lalu klik "Buka bot & ketuk Start". Bot terbuka, ketuk Start, akun langsung terhubung. Catatan: Hanya bisa di aplikasi Telegram (HP/desktop), tidak di Telegram Web.

(2) Link manual — Buat kode, lalu kirim /link KODE ke bot @${TELEGRAM_BOT_USERNAME}. Catatan: Bisa dipakai di Telegram Web maupun app, cocok kalau pakai browser.

Kode berlaku 10 menit. Kalau bingung, buka halaman Link Telegram — kedua cara ada di sana dengan penjelasan lengkap.`,
  },
  {
    id: "pakai-bot",
    question: "Bagaimana cara pakai bot Telegram?",
    icon: "📱",
    category: "Integrasi",
    answer: `Setelah akun terhubung, buka @${TELEGRAM_BOT_USERNAME} and kirim /start. Pilih "Pemasukan" atau "Pengeluaran" → pilih kategori dari tombol → ketik nominal (oleh pakai rb/jt, misal 25rb atau 1jt) dan catatan. Atau ketik langsung format: +50000 gaji atau -25rb kopi.`,
  },
  {
    id: "ubah-password",
    question: "Bagaimana cara ubah password?",
    icon: "🔒",
    category: "Akun",
    answer: "Buka menu Akun di sidebar (di atas Keluar). Di section \"Ubah Password\", isi password lama (untuk konfirmasi), password baru, and konfirmasi password baru, lalu klik \"Ubah password\". Notifikasi hijau akan muncul jika berhasil. Kalau lupa password lama, pakai \"Lupa password?\" di halaman login untuk dapat link reset lewat email.",
  },
  {
    id: "email-sync",
    question: "Apa itu Email Auto-Sync dan cara pakainya?",
    icon: "✉️",
    category: "Integrasi",
    answer: `Email Auto-Sync adalah fitur paling canggih yang memungkinkan transaksi kamu tercatat secara otomatis hanya dari email notifikasi bank. 

1. Buka menu **Email Otomatis** di sidebar.
2. Klik tombol "HUBUNGKAN GMAIL" dan login dengan akun Google kamu.
3. Selesai! Sekarang, setiap ada email notifikasi transaksi masuk (misal dari BCA, Mandiri, dll), Finance Tracker AI akan otomatis membacanya dan memasukkannya ke Dashboard kamu tanpa perlu input manual sama sekali.

Fitur ini aman (menggunakan API resmi Google) dan hanya butuh setup sekali saja.`,
  },
  {
    id: "tambah-foto",
    question: "Bagaimana cara tambah transaksi dari foto?",
    icon: "📷",
    category: "Transaksi",
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
    category: "Transaksi",
    answer: "Ya. Di Dashboard, gunakan filter bulan jika perlu, lalu klik tombol \"Export CSV\". File CSV akan terunduh berisi transaksi yang tampil (dengan format nominal dan tanggal yang rpi), siap dibuka di Excel atau Google Sheets.",
  },
  {
    id: "kategori",
    question: "Kategori apa saja yang tersedia?",
    icon: "📂",
    category: "Dasar",
    answer: "Pemasukan: Salary, Freelance, Investment, Gift, Other. Pengeluaran: Food, Transport, Shopping, Bills, Health, Entertainment, Other. Semua kategori ini bisa dipilih baik di web maupun di bot Telegram.",
  },
  {
    id: "tabungan",
    question: "Apa itu Tabungan dan cara pakainya?",
    icon: "🐷",
    answer: `• Saldo di atas = total uang tabungan kamu (setor minus tarik).

• Celengan = bagi per tujuan: Umum, Dana darurat, Liburan, dll. Kamu bisa set target per celengan dan lihat progresnya.

• Setor / Tarik = catat setoran atau penarikan uang ke/dari tabungan. Pindahkan uang = pindah antar celengan (mis. dari Umum ke Dana darurat) tanpa tarik dulu — saldo total tetap sama.

• Di Telegram (kalau akun sudah di-link): /tabungan untuk cek saldo, setor 100rb atau tarik 50k untuk setor/tarik.`,
  },

  {
    id: "keamanan",
    question: "Apakah data saya aman dan di mana disimpan?",
    icon: "🛡️",
    category: "Dasar",
    answer: "Sangat aman! Semua data transaksi dan akun kamu disimpan di database terenkripsi milik Supabase (Google Cloud). Kami tidak membagikan data keuanganmu ke pihak ketiga mana pun. Kamu punya kontrol penuh untuk menghapus data atau akunmu kapan saja.",
  },
  {
    id: "multi-device",
    question: "Apakah saya bisa mengakses dari banyak perangkat?",
    icon: "💻",
    category: "Dasar",
    answer: "Tentu saja! Karena Finance Tracker AI berbasis web (PWA), kamu bisa buka dari browser laptop, tablet, maupun HP. Cukup login dengan akun yang sama, maka semua data akan langsung sinkron secara real-time.",
  },
  {
    id: "dark-mode",
    question: "Bagaimana cara mengganti ke Mode Gelap (Dark Mode)?",
    icon: "🌙",
    category: "Fitur",
    answer: "Cukup klik ikon Bulan/Matahari yang ada di sidebar (sebelah nama aplikasi) atau di bagian header pojok kanan atas (versi mobile). Aplikasi akan otomatis mengingat pilihan temamu untuk kunjungan berikutnya.",
  },
  {
    id: "salah-input",
    question: "Bagaimana jika saya salah input transaksi?",
    icon: "✏️",
    category: "Transaksi",
    answer: "Tenang, semua transaksi bisa diubah! Di Dashboard, scroll ke bawah ke bagian tabel 'Transaksi Terbaru'. Klik ikon pensil untuk mengedit nominal/kategori, atau ikon tempat sampah untuk menghapusnya. Saldo di grafik akan otomatis menyesuaikan.",
  },
];

const CATEGORIES = ["Semua", "Dasar", "Transaksi", "Integrasi", "Fitur", "Akun"];

// --- ANIMATED TYPEWRITER COMPONENT ---
function Typewriter({ phrases }: { phrases: string[] }) {
  const [index, setIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [speed, setSpeed] = useState(150);

  useEffect(() => {
    const handleType = () => {
      const fullText = phrases[index];
      setDisplayText(
        isDeleting
          ? fullText.substring(0, displayText.length - 1)
          : fullText.substring(0, displayText.length + 1)
      );

      if (!isDeleting && displayText === fullText) {
        setTimeout(() => setIsDeleting(true), 1500);
        setSpeed(100);
      } else if (isDeleting && displayText === "") {
        setIsDeleting(false);
        setIndex((prev) => (prev + 1) % phrases.length);
        setSpeed(150);
      }
    };

    const timer = setTimeout(handleType, speed);
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, index, phrases, speed]);

  return (
    <span className="text-slate-900 dark:text-white border-r-4 border-primary animate-blink pr-2">
      {displayText}
    </span>
  );
}

export function FAQContent() {
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredItems = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      const matchesSearch = item.question.toLowerCase().includes(search.toLowerCase()) || 
                            item.answer.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === "Semua" || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  if (!mounted) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-16 px-4 text-left">
      <div className="relative overflow-hidden rounded-[2.5rem] sm:rounded-[3.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-8 sm:p-14 lg:p-16 animate-fade-in-up">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none opacity-40 dark:opacity-20" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 text-center lg:text-left">
          <div className="space-y-8 flex-1">
            <div className="space-y-6">
               <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] border border-slate-200 dark:border-slate-700 mx-auto lg:mx-0 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Pusat Bantuan & FAQ
               </div>

               {/* Mobile Logo: Only visible on mobile/tablet */}
               <div className="lg:hidden shrink-0 relative group animate-float mx-auto">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-[40px] opacity-60" />
                  <div className="relative bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-xl ring-2 ring-slate-100 dark:ring-slate-800">
                      <div className="text-4xl">🤔</div>
                      <div className="absolute -bottom-1 -right-1 bg-primary text-white p-2.5 rounded-2xl shadow-lg">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                      </div>
                  </div>
               </div>

               <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight min-h-[1.2em]">
                 <Typewriter phrases={["Ada pertanyaan?", "Cari Jawaban?", "Butuh Panduan?", "Bantuan AI 24/7."]} />
               </h1>
               <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto lg:mx-0 font-medium text-lg leading-relaxed">
                 Temukan panduan lengkap dan jawaban cepat untuk memaksimalkan fitur Finance Tracker AI Anda. Tim kami siap membantu Anda kapan pun.
               </p>
            </div>

            {/* Search Bar & Categories Dropdown (Sleek Layout) */}
            <div className="flex flex-col sm:flex-row gap-4 mt-10 animate-fade-in [animation-delay:800ms] w-full max-w-2xl mx-auto lg:mx-0">
              <div className="flex-[2] relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari pertanyaan..."
                  className="w-full pl-12 pr-6 py-4 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-8 focus:ring-primary/5 focus:border-primary transition-all outline-none font-bold text-sm sm:text-base shadow-sm h-[60px]"
                />
                <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <div className="flex-1">
                <SelectDropdown
                  value={activeCategory}
                  onChange={setActiveCategory}
                  options={CATEGORIES.map(cat => ({ value: cat, label: cat.toUpperCase() }))}
                  placeholder="Kategori"
                  className="w-full h-[60px]"
                />
              </div>
            </div>
          </div>

          {/* Desktop Logo: Hidden on EVERYTHING EXCEPT Desktop (1024px+) */}
          <div className="hidden lg:flex shrink-0 relative group animate-float mx-auto lg:mx-0">
             <div className="absolute inset-0 bg-primary/20 rounded-full blur-[60px] sm:blur-[80px] group-hover:scale-110 transition-transform duration-700" />
             <div className="relative bg-white dark:bg-slate-800 p-8 sm:p-12 rounded-[3rem] sm:rounded-[4rem] shadow-2xl ring-2 ring-slate-100 dark:ring-slate-700 scale-100 sm:scale-105">
                <div className="text-5xl sm:text-7xl">🤔</div>
                <div className="absolute -bottom-2 -right-2 sm:-bottom-4 sm:-right-4 bg-primary text-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-2xl animate-bounce">
                   <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                </div>
             </div>
          </div>
        </div>
      </div>



      {/* FAQ List */}
      <div className="space-y-6 px-2">
        {filteredItems.length > 0 ? (
          filteredItems.map((item, index) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className={`group rounded-[2.5rem] border transition-all duration-500 animate-fade-in-up [animation-fill-mode:backwards] hover:-translate-y-1.5 hover:shadow-2xl ${
                  isOpen 
                    ? "border-primary bg-primary/5 dark:bg-primary/10 ring-8 ring-primary/5 shadow-2xl" 
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl shadow-md"
                }`}
                style={{ animationDelay: `${(index + 1) * 80}ms` }}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  className="flex w-full items-center gap-4 sm:gap-6 p-6 sm:p-10 text-left"
                  aria-expanded={isOpen}
                >
                  <span className={`flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-[1.25rem] sm:rounded-[1.75rem] text-xl sm:text-2xl transition-all ${isOpen ? "bg-white dark:bg-slate-800 shadow-lg scale-110" : "bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700 hover:rotate-12"}`}>
                    {item.icon}
                  </span>
                  <div className="flex-1 min-w-0 pr-8">
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 ${isOpen ? "text-primary" : "text-slate-400 dark:text-slate-500"}`}>
                      {item.category}
                    </p>
                    <h3 className={`text-base sm:text-xl font-black tracking-tight transition-colors leading-tight ${isOpen ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white"}`}>
                      {item.question}
                    </h3>
                  </div>
                  <span className={`flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${isOpen ? "rotate-180 bg-primary text-white shadow-lg" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"}`}>
                    <svg className="h-4 w-4 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                <div
                  className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <div className="overflow-hidden">
                    <div className="px-7 pb-8 pt-0 sm:px-14 sm:pb-14 ml-0 sm:ml-20">
                      <div className="h-0.5 w-full bg-slate-200 dark:bg-slate-800 mb-2 opacity-40 rounded-full" />
                      <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line font-medium text-left">
                        {item.answer.split(/(\*\*.*?\*\*)/g).map((part, i) => 
                          part.startsWith("**") && part.endsWith("**") ? (
                            <strong key={i} className="font-extrabold text-slate-900 dark:text-white">
                              {part.slice(2, -2)}
                            </strong>
                          ) : part
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-24 text-center space-y-6">
            <div className="flex justify-center text-slate-200 dark:text-slate-800 animate-bounce">
               <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-black text-slate-900 dark:text-white">Pertanyaan Tidak Ditemukan</p>
              <p className="text-base text-slate-400 dark:text-slate-500">Coba gunakan kata kunci lain atau pilih kategori Semua.</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Contact (Full Gmail Style) */}
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 sm:p-14 lg:p-16 text-center space-y-10 shadow-xl border border-slate-200 dark:border-slate-800 relative overflow-hidden animate-fade-in-up [animation-delay:1.2s] group">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none opacity-40 dark:opacity-20" />
        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
             <h3 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Masih punya pertanyaan?</h3>
             <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-lg max-w-2xl mx-auto leading-relaxed">
               Jangan ragu! Tim Cike AI kami siap membantu kebutuhan Anda 24 jam nonstop.
             </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-10">
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent("toggle-cike-ai"))}
              className="w-full sm:w-auto px-10 py-6 rounded-[2rem] bg-primary text-white font-black hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/30 relative overflow-hidden group/btn text-lg"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
              Tanya Cike AI Sekarang
            </button>
            <a 
              href="mailto:haniifsatriawardana91@gmail.com"
              className="w-full sm:w-auto px-10 py-6 rounded-[2rem] border-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-black hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-lg"
            >
              Email Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
