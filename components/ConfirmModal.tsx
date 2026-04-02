"use client";

import { createPortal } from "react-dom";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  loading?: boolean;
  children?: React.ReactNode;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Ya, hapus",
  cancelLabel = "Batal",
  variant = "danger",
  onConfirm,
  onClose,
  loading = false,
  children,
}: ConfirmModalProps) {
  if (!open) return null;

  async function handleConfirm() {
    await onConfirm();
  }

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 cursor-default">
      <div
        className="absolute inset-0 bg-slate-900/60 dark:bg-black/90 backdrop-blur-md animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/20 dark:border-slate-700/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-6 shadow-2xl animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        {/* Decorative background glow */}
        <div className={`absolute -right-16 -top-16 h-32 w-32 rounded-full blur-[60px] ${variant === "danger" ? "bg-expense/20" : "bg-primary/20"}`} aria-hidden />

        <div className="relative mb-6 flex flex-col items-center text-center">
          <div
            className={`mb-4 flex h-16 w-16 items-center justify-center rounded-[2rem] shadow-lg ring-1 transition-all ${
              variant === "danger" 
                ? "bg-expense/10 text-expense ring-expense/20 shadow-expense/20" 
                : "bg-primary/10 text-primary ring-primary/20 shadow-primary/20"
            }`}
          >
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={variant === "danger" 
                   ? "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                   : "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                }
              />
            </svg>
          </div>
          
          <h3 id="confirm-title" className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
            {title}
          </h3>
          {description && (
            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>

        {children && (
          <div className="relative mb-6 overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 ring-1 ring-black/5 dark:ring-white/5">
            {children}
          </div>
        )}

        <div className="relative flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-12 rounded-2xl border-2 border-slate-100 dark:border-slate-700 bg-white/50 dark:bg-transparent font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all disabled:opacity-50 active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white shadow-lg transition-all disabled:opacity-50 active:scale-95 ${
              variant === "danger"
                ? "bg-expense shadow-expense/25 hover:bg-red-600 hover:shadow-expense/40"
                : "bg-primary shadow-primary/25 hover:bg-primary-hover hover:shadow-primary/40"
            }`}
          >
            {loading ? "PROSES..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
