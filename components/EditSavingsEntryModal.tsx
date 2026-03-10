"use client";

import { useState, useEffect } from "react";
import type { SavingsEntry, SavingsPot } from "@/components/TabunganContent";
import { formatAmountDisplay, parseAmountInput } from "@/lib/utils";

interface EditSavingsEntryModalProps {
  entry: SavingsEntry | null;
  pots: SavingsPot[];
  onClose: () => void;
  onSave: (
    id: string,
    data: { type: "deposit" | "withdraw"; amount: number; note: string; pot_id: string | null }
  ) => void | Promise<void>;
}

export function EditSavingsEntryModal({ entry, pots, onClose, onSave }: EditSavingsEntryModalProps) {
  const [type, setType] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [potId, setPotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!entry) return;
    setType(entry.type);
    setAmount(formatAmountDisplay(String(entry.amount)));
    setNote(entry.note || "");
    setPotId(entry.pot_id ?? null);
    setError("");
  }, [entry]);

  if (!entry) return null;

  const num = parseAmountInput(amount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entry || !num || num <= 0) return;
    setLoading(true);
    setError("");
    try {
      await Promise.resolve(
        onSave(entry.id, {
          type,
          amount: num,
          note: note.trim(),
          pot_id: potId ?? null,
        })
      );
      onClose();
    } catch {
      setError("Gagal menyimpan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 dark:bg-black/60" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-md rounded-2xl border border-border dark:border-slate-600 bg-card dark:bg-slate-800 p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Edit Riwayat</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            aria-label="Tutup"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {pots.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Celengan</label>
              <select
                value={potId ?? "__umum__"}
                onChange={(e) => setPotId(e.target.value === "__umum__" ? null : e.target.value)}
                className="w-full min-h-[48px] rounded-xl border border-border dark:border-slate-600 bg-card dark:bg-slate-700 px-4 py-3 text-slate-800 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="__umum__">Umum</option>
                {pots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-700 p-1">
            <button
              type="button"
              onClick={() => setType("deposit")}
              className={`flex-1 min-h-[48px] rounded-lg py-2 text-sm font-medium transition ${
                type === "deposit"
                  ? "bg-card dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow"
                  : "text-muted dark:text-slate-400"
              }`}
            >
              Setor
            </button>
            <button
              type="button"
              onClick={() => setType("withdraw")}
              className={`flex-1 min-h-[48px] rounded-lg py-2 text-sm font-medium transition ${
                type === "withdraw"
                  ? "bg-card dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow"
                  : "text-muted dark:text-slate-400"
              }`}
            >
              Tarik
            </button>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Jumlah (Rp)</label>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(formatAmountDisplay(e.target.value))}
              placeholder="0"
              required
              className="w-full min-h-[48px] rounded-xl border border-border dark:border-slate-600 bg-card dark:bg-slate-700 px-4 py-3 text-slate-800 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Catatan (opsional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Mis. dari gaji bulanan"
              className="w-full min-h-[48px] rounded-xl border border-border dark:border-slate-600 bg-card dark:bg-slate-700 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {error && <p className="text-sm text-expense">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border border-border dark:border-slate-600 py-3 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !num || num <= 0}
              className="flex-1 rounded-xl bg-primary py-3 font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
