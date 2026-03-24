"use client";

import type { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { createPortal } from "react-dom";

interface DeleteConfirmModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function DeleteConfirmModal({
  transaction,
  onClose,
  onConfirm,
  loading = false,
}: DeleteConfirmModalProps) {
  if (!transaction) return null;

  const label =
    transaction.type === "income"
      ? `Pemasukan · ${transaction.category}`
      : `Pengeluaran · ${transaction.category}`;
  const amount =
    transaction.type === "income"
      ? `+${formatCurrency(Number(transaction.amount))}`
      : `-${formatCurrency(Number(transaction.amount))}`;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 cursor-default">
      <div
        className="absolute inset-0 bg-slate-900/60 dark:bg-black/90 backdrop-blur-md animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/20 dark:border-slate-700/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-6 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow effects */}
        <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-rose-500/10 blur-[80px]" aria-hidden />
        <div className="absolute -left-24 -bottom-24 h-48 w-48 rounded-full bg-rose-500/5 blur-[60px]" aria-hidden />
        <div className="mb-4 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-[2rem] bg-rose-500/10 text-rose-500 ring-4 ring-rose-500/5">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Hapus Transaksi?</h3>
          <p className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Tindakan ini tidak bisa dibatalkan.</p>
        </div>

        <div className="mb-6 rounded-3xl border border-border/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 p-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">{label}</p>
          <p className={`text-xl font-black tabular-nums ${transaction.type === "income" ? "text-emerald-500" : "text-rose-500"}`}>
            {amount}
          </p>
          {transaction.note && (
            <p className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 italic">&quot;{transaction.note}&quot;</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="h-12 w-full rounded-2xl bg-rose-500 font-black text-xs uppercase tracking-widest text-white shadow-lg shadow-rose-500/25 hover:bg-rose-600 hover:shadow-rose-500/40 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "Menghapus..." : "Ya, Hapus Sekarang"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-12 w-full rounded-2xl border border-border dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
