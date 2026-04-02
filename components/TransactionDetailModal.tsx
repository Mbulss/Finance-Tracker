"use client";

import { createPortal } from "react-dom";
import { useEffect } from "react";
import type { Transaction } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export function TransactionDetailModal({ transaction, onClose }: TransactionDetailModalProps) {
  useEffect(() => {
    if (transaction) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [transaction]);

  if (!transaction) return null;

  const isEmailSync = transaction.note?.includes("[email:");
  // Extract provider and reference if possible
  const emailMatch = transaction.note?.match(/\[email:([^:]+):([^\]]+)\]/);
  const provider = emailMatch ? emailMatch[1] : null;

  // Clean note (remove the [email:...] tag for display)
  const displayNote = transaction.note?.replace(/\[email:[^\]]+\]/g, "").trim() || "Tidak ada catatan";

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 cursor-default">
      <div
        className="absolute inset-0 bg-slate-900/60 dark:bg-black/90 backdrop-blur-md animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-[340px] sm:max-w-lg overflow-hidden rounded-[2.5rem] border border-white/20 dark:border-slate-700/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-5 sm:p-8 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Decorative Background Elements */}
        <div className={`absolute -right-24 -top-24 h-64 w-64 rounded-full blur-[100px] opacity-20 ${transaction.type === "income" ? "bg-emerald-500" : "bg-rose-500"}`} aria-hidden />
        <div className="absolute -left-24 -bottom-24 h-48 w-48 rounded-full bg-primary/10 blur-[80px]" aria-hidden />

        <div className="relative space-y-4 sm:space-y-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className={`w-1.5 h-1.5 rounded-full ${transaction.type === "income" ? "bg-emerald-500" : "bg-rose-500"}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {transaction.type === "income" ? "Pemasukan" : "Pengeluaran"}
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Detail Transaksi</h3>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Amount Large Display */}
          <div className="text-center py-2 sm:py-6">
            <p className={`text-2xl sm:text-5xl font-black tracking-tighter ${transaction.type === "income" ? "text-emerald-500" : "text-rose-500"}`}>
              {transaction.type === "income" ? "+" : "-"} {formatCurrency(transaction.amount)}
            </p>
            <p className="mt-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {transaction.category}
            </p>
          </div>

          {/* Information Grid */}
          <div className="space-y-4">
            <div className="p-5 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Catatan Lengkap</span>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed italic">
                  "{displayNote}"
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tanggal</span>
                  <p className="text-xs font-black text-slate-700 dark:text-slate-300">
                    {formatDate(transaction.created_at)}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Waktu</span>
                  <p className="text-xs font-black text-slate-700 dark:text-slate-300">
                    {new Date(transaction.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} WIB
                  </p>
                </div>
              </div>
            </div>

            {isEmailSync && (
              <div className="p-5 rounded-[1.5rem] bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 flex items-center gap-4">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg ring-4 ring-indigo-500/10">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Sumber Data</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Auto-Sync Gmail ({provider?.toUpperCase() || "Bank"})</p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/25"
          >
            Tutup Detail
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
