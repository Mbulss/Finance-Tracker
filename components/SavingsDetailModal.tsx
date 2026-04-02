"use client";

import { createPortal } from "react-dom";
import { useEffect } from "react";
import type { SavingsEntry, SavingsPot } from "./TabunganContent";
import { formatCurrency, formatDate } from "@/lib/utils";

interface SavingsDetailModalProps {
  entry: SavingsEntry | null;
  pots: SavingsPot[];
  onClose: () => void;
}

export function SavingsDetailModal({ entry, pots, onClose }: SavingsDetailModalProps) {
  useEffect(() => {
    if (entry) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [entry]);

  if (!entry) return null;

  const potName = entry.pot_id 
    ? pots.find(p => p.id === entry.pot_id)?.name || "Umum"
    : "Umum";

  const isTransfer = entry.is_transfer;
  
  const modalContent = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 cursor-default">
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
        <div className={`absolute -right-24 -top-24 h-64 w-64 rounded-full blur-[100px] opacity-20 ${isTransfer ? "bg-primary" : entry.type === "deposit" ? "bg-emerald-500" : "bg-rose-500"}`} aria-hidden />
        <div className="absolute -left-24 -bottom-24 h-48 w-48 rounded-full bg-primary/10 blur-[80px]" aria-hidden />

        <div className="relative space-y-4 sm:space-y-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className={`w-1.5 h-1.5 rounded-full ${isTransfer ? "bg-primary" : entry.type === "deposit" ? "bg-emerald-500" : "bg-rose-500"}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {isTransfer ? "Pindah Saldo" : entry.type === "deposit" ? "Setoran Tabungan" : "Penarikan Tabungan"}
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Detail Aktivitas</h3>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all shadow-soft"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Amount Display */}
          <div className="text-center py-2 sm:py-6">
            <p className={`text-2xl sm:text-5xl font-black tracking-tighter ${isTransfer ? "text-primary" : entry.type === "deposit" ? "text-emerald-500" : "text-rose-500"}`}>
              {isTransfer ? "⇄" : entry.type === "deposit" ? "+" : "-"} {formatCurrency(Math.abs(entry.amount))}
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
               <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                  {potName}
               </span>
            </div>
          </div>

          {/* Detailed Info Section */}
          <div className="space-y-4">
            <div className="p-6 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Catatan</span>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 italic leading-relaxed">
                  {entry.note ? `"${entry.note}"` : "Tidak ada catatan"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200 dark:border-slate-700/50">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tanggal</span>
                  <p className="text-xs font-black text-slate-700 dark:text-slate-300">
                    {formatDate(entry.created_at)}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Waktu</span>
                  <p className="text-xs font-black text-slate-700 dark:text-slate-300">
                    {new Date(entry.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} WIB
                  </p>
                </div>
              </div>

              <div className="space-y-1 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</span>
                <div className="flex items-start gap-3 mt-1.5">
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 mt-0.5 ${isTransfer ? "bg-primary shadow-[0_0_8px_rgba(30,144,255,0.5)]" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"}`} />
                  <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest leading-relaxed">
                    {isTransfer ? "Pindah Dana Antar Celengan" : "Transaksi Saldo Mandiri"}
                  </p>
                </div>
              </div>
            </div>
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
