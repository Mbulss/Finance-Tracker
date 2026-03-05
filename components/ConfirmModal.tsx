"use client";

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-md rounded-2xl border border-border dark:border-slate-600 bg-card dark:bg-slate-800 p-6 shadow-xl animate-fade-in-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <div className="mb-4 flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              variant === "danger" ? "bg-expense/10 dark:bg-expense/20" : "bg-slate-100 dark:bg-slate-700"
            }`}
          >
            <svg
              className={variant === "danger" ? "h-5 w-5 text-expense" : "h-5 w-5 text-slate-600 dark:text-slate-400"}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 id="confirm-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-muted dark:text-slate-400 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {children && <div className="mb-6">{children}</div>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-border dark:border-slate-600 py-3 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition active:scale-[0.98]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 rounded-xl py-3 font-medium text-white disabled:opacity-50 transition active:scale-[0.98] ${
              variant === "danger"
                ? "bg-expense hover:bg-expense/90"
                : "bg-primary hover:bg-primary-hover dark:bg-sky-600 dark:hover:bg-sky-500"
            }`}
          >
            {loading ? "Memproses..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
