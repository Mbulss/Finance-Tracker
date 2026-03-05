"use client";

import { useState } from "react";
import { TELEGRAM_BOT_URL, TELEGRAM_BOT_USERNAME } from "@/lib/constants";

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

  return (
    <section id="link-telegram" className="rounded-2xl border-2 border-primary/20 dark:border-primary/30 bg-primary/5 dark:bg-primary/10 p-4 shadow-card sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">
            <span className="text-xl" aria-hidden>🔗</span>
            Link Telegram
          </h2>
          <p className="text-sm text-muted dark:text-slate-400">
            Hubungkan akun Telegram ke dashboard ini. Transaksi yang kamu kirim lewat bot akan masuk ke akun kamu.
          </p>
        </div>
        <a
          href={TELEGRAM_BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/20 dark:border-primary/50 dark:bg-primary/20 dark:text-sky-300 dark:hover:bg-primary/30"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
          Buka bot (@{TELEGRAM_BOT_USERNAME})
        </a>
      </div>
      {!code ? (
        <>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {loading ? "Memuat..." : "Buat kode"}
          </button>
          {error && <p className="mt-2 text-sm text-expense">{error}</p>}
        </>
      ) : (
        <div className="rounded-xl border border-border dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-4">
          <p className="mb-2 text-sm text-muted dark:text-slate-400">Kirim ke bot Telegram:</p>
          <p className="mb-2 font-mono text-lg font-bold tracking-wider text-primary">
            /link {code}
          </p>
          <p className="mb-2 text-xs text-muted dark:text-slate-500">Kode berlaku 10 menit. Setelah kirim, akun Telegram akan terhubung.</p>
          <a href={TELEGRAM_BOT_URL} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline dark:text-sky-400">
            Buka @{TELEGRAM_BOT_USERNAME} di Telegram →
          </a>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="mt-3 text-sm font-medium text-primary hover:underline disabled:opacity-50"
          >
            Buat kode baru
          </button>
        </div>
      )}
    </section>
  );
}
