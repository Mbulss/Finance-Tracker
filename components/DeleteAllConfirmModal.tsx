"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

interface DeleteAllConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function DeleteAllConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}: DeleteAllConfirmModalProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const CONFIRM_PHRASE = "HAPUS SEMUA DATA";
  const isValid = confirmationText === CONFIRM_PHRASE;

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 cursor-default">
      <div
        className="absolute inset-0 bg-slate-900/60 dark:bg-black/90 backdrop-blur-md animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/20 dark:border-slate-700/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            onClose();
            setConfirmationText("");
          }}
          className="absolute right-6 top-6 z-50 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all shadow-soft"
          aria-label="Tutup"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Glow effects */}
        <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-rose-500/10 blur-[80px]" aria-hidden />
        <div className="absolute -left-24 -bottom-24 h-48 w-48 rounded-full bg-rose-500/5 blur-[60px]" aria-hidden />
        
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[2rem] bg-rose-500/10 text-rose-500 ring-4 ring-rose-500/5">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Hapus Semua Data?</h3>
          <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-relaxed">
            Seluruh riwayat transaksi kamu akan dihapus secara permanen. Tindakan ini tidak bisa dibatalkan.
          </p>
        </div>

        <div className="mb-6 space-y-4">
          <div className="rounded-3xl border border-rose-200/50 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/5 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-2 text-center">Tulis kalimat di bawah untuk konfirmasi:</p>
            <p className="text-center font-black text-slate-900 dark:text-white select-none mb-3">&quot;{CONFIRM_PHRASE}&quot;</p>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="Ketik di sini..."
              className="w-full h-12 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-center text-sm font-bold text-slate-900 dark:text-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all outline-none"
              autoFocus
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              if (isValid) {
                onConfirm();
                setConfirmationText("");
              }
            }}
            disabled={loading || !isValid}
            className="h-14 w-full rounded-2xl bg-rose-500 font-black text-xs uppercase tracking-widest text-white shadow-lg shadow-rose-500/25 hover:bg-rose-600 hover:shadow-rose-500/40 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
          >
            {loading ? "Menghapus..." : "Ya, Hapus Semua Data"}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              setConfirmationText("");
            }}
            disabled={loading}
            className="h-14 w-full rounded-2xl border border-border dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
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
