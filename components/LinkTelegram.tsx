"use client";

import { useState, useEffect } from "react";
import { TELEGRAM_BOT_URL, TELEGRAM_BOT_USERNAME } from "@/lib/constants";
import { openTelegramUrl } from "@/lib/utils";

export function LinkTelegram() {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setCode(null);
    try {
      const res = await fetch("/api/telegram/link-code", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal buat kode");
      setCode(data.code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal buat kode");
    } finally {
      setLoading(false);
    }
  }

  // Scroll ke section otomatis kalau URL pakai hash #otomatis (dari sidebar)
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#otomatis") {
      document.getElementById("otomatis")?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
        <p className="font-medium text-slate-800 dark:text-slate-100 mb-2">Kenapa link Telegram?</p>
        <ul className="list-disc list-inside space-y-1 text-muted dark:text-slate-400">
          <li>Catat transaksi dari HP lewat bot — tanpa buka browser</li>
          <li>Format cepat: <span className="font-mono text-primary">+50rb gaji</span> atau <span className="font-mono text-primary">-25rb kopi</span></li>
          <li>Setor/tarik tabungan, cek saldo, dan dapat ringkasan mingguan lewat chat</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Card kiri: Link otomatis */}
        <section
          id="otomatis"
          className="flex flex-col rounded-2xl border-2 border-primary/20 dark:border-primary/30 bg-primary/5 dark:bg-primary/10 p-4 shadow-card sm:p-6"
        >
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">
          <span className="text-xl" aria-hidden>⚡</span>
          Link otomatis
        </h2>
        <p className="mb-3 text-sm text-muted dark:text-slate-400">
          Paling cepat: satu tombol, bot terbuka, ketuk Start — akun langsung terhubung.
        </p>
        <ul className="mb-4 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
          <li className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">1</span> Klik tombol di bawah</li>
          <li className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">2</span> Aplikasi Telegram terbuka</li>
          <li className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">3</span> Ketuk <strong>Start</strong> — selesai</li>
        </ul>
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <strong>Catatan:</strong> Hanya bisa di <strong>aplikasi Telegram</strong> (HP/desktop), tidak di Telegram Web.
        </div>
        <div className="flex flex-1 items-end justify-center">
          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              setError("");
              try {
                const res = await fetch("/api/telegram/link-code", { method: "POST" });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Gagal");
                openTelegramUrl(`${TELEGRAM_BOT_URL}?start=${data.code}`);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Gagal");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            {loading ? "Memuat..." : "Buka di Telegram"}
          </button>
        </div>
        {error && <p className="mt-2 text-center text-sm text-expense">{error}</p>}
        </section>

        {/* Card kanan: Link manual */}
        <section
          id="link-manual"
          className="flex flex-col rounded-2xl border-2 border-border dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 p-4 shadow-card sm:p-6"
        >
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">
          <span className="text-xl" aria-hidden>✏️</span>
          Link manual
        </h2>
        <p className="mb-3 text-sm text-muted dark:text-slate-400">
          Untuk Telegram Web atau kalau link otomatis tidak jalan: buat kode lalu kirim ke bot @{TELEGRAM_BOT_USERNAME}.
        </p>
        <ul className="mb-4 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
          <li className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-300 dark:bg-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200">1</span> Klik &quot;Buat kode&quot;</li>
          <li className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-300 dark:bg-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200">2</span> Buka bot di Telegram (Web atau app)</li>
          <li className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-300 dark:bg-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200">3</span> Kirim <strong>/link KODE</strong> (ganti KODE dengan kode yang muncul)</li>
        </ul>
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-100/80 px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
          <strong>Catatan:</strong> Bisa dipakai di <strong>Telegram Web</strong> dan aplikasi. Cocok kalau kamu pakai browser.
        </div>
        {!code ? (
          <>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="rounded-xl border border-border dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50"
              >
                {loading ? "Memuat..." : "Buat kode"}
              </button>
            </div>
            {error && <p className="mt-2 text-center text-sm text-expense">{error}</p>}
          </>
        ) : (
          <div className="rounded-xl border border-border dark:border-slate-600 bg-white dark:bg-slate-800 p-4 text-center">
            <p className="mb-2 text-sm text-muted dark:text-slate-400">Kirim ke bot Telegram:</p>
            <p className="mb-2 font-mono text-lg font-bold tracking-wider text-primary">
              /link {code}
            </p>
            <p className="mb-3 text-xs text-muted dark:text-slate-500">Kode berlaku 10 menit.</p>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
              >
                Buat kode baru
              </button>
            </div>
          </div>
        )}
        </section>
      </div>

      <section className="rounded-2xl border border-border dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 p-4 sm:p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <span aria-hidden>✅</span>
          Setelah terhubung
        </h3>
        <p className="text-sm text-muted dark:text-slate-400">
          Kirim pesan ke bot untuk catat transaksi (misalnya <span className="font-mono text-slate-700 dark:text-slate-300">+50000 gaji</span>, <span className="font-mono text-slate-700 dark:text-slate-300">-25000 kopi</span>), setor tabungan (<span className="font-mono text-slate-700 dark:text-slate-300">setor 100rb</span>), atau ketik <span className="font-mono text-slate-700 dark:text-slate-300">/tabungan</span> untuk cek saldo. Data langsung muncul di dashboard ini.
        </p>
      </section>
    </div>
  );
}
