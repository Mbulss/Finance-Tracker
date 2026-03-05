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
      <p className="text-sm text-muted dark:text-slate-400">
        Hubungkan akun Telegram ke dashboard ini. Transaksi yang kamu kirim lewat bot akan masuk ke akun kamu.
      </p>

      {/* Section: Link otomatis — satu tombol, klik langsung ke bot */}
      <section
        id="otomatis"
        className="rounded-2xl border-2 border-primary/20 dark:border-primary/30 bg-primary/5 dark:bg-primary/10 p-4 shadow-card sm:p-6"
      >
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">
          <span className="text-xl" aria-hidden>⚡</span>
          Link otomatis
        </h2>
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <strong>Catatan:</strong> Hanya bisa di <strong>aplikasi Telegram</strong> (HP/desktop), tidak di Telegram Web.
        </div>
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
        {error && <p className="mt-2 text-sm text-expense">{error}</p>}
      </section>

      {/* Section: Link manual */}
      <section
        id="link-manual"
        className="rounded-2xl border-2 border-border dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 p-4 shadow-card sm:p-6"
      >
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">
          <span className="text-xl" aria-hidden>✏️</span>
          Link manual
        </h2>
        <p className="mb-2 text-sm text-muted dark:text-slate-400">
          Kalau link otomatis tidak bisa (misalnya pakai Telegram Web), pakai cara ini: buat kode lalu kirim perintah ke bot @{TELEGRAM_BOT_USERNAME}.
        </p>
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-100/80 px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
          <strong>Catatan:</strong> Link manual bisa dipakai di <strong>Telegram Web</strong> maupun aplikasi Telegram (HP/desktop). Cocok kalau kamu pakai browser.
        </div>
        {!code ? (
          <>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="rounded-xl border border-border dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50"
            >
              {loading ? "Memuat..." : "Buat kode"}
            </button>
            {error && <p className="mt-2 text-sm text-expense">{error}</p>}
          </>
        ) : (
          <div className="rounded-xl border border-border dark:border-slate-600 bg-white dark:bg-slate-800 p-4">
            <p className="mb-2 text-sm text-muted dark:text-slate-400">Kirim ke bot Telegram:</p>
            <p className="mb-2 font-mono text-lg font-bold tracking-wider text-primary">
              /link {code}
            </p>
            <p className="mb-3 text-xs text-muted dark:text-slate-500">Kode berlaku 10 menit.</p>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
            >
              Buat kode baru
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
