"use client";

import { useState, useEffect } from "react";
import type { Transaction, TransactionType } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { formatAmountDisplay, parseAmountInput } from "@/lib/utils";
import { SelectDropdown } from "./SelectDropdown";

interface EditTransactionModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (id: string, data: { type: TransactionType; amount: number; category: string; note: string }) => void | Promise<void>;
}

export function EditTransactionModal({ transaction, onClose, onSave }: EditTransactionModalProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!transaction) return;
    setType(transaction.type);
    setAmount(formatAmountDisplay(String(transaction.amount)));
    setCategory(transaction.category);
    setNote(transaction.note || "");
    setError("");
  }, [transaction]);

  if (!transaction) return null;

  const categories = type === "income" ? CATEGORIES.income : CATEGORIES.expense;
  const num = parseAmountInput(amount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transaction || !num || num <= 0) return;
    setLoading(true);
    setError("");
    try {
      await Promise.resolve(onSave(transaction.id, { type, amount: num, category: category || categories[0], note: note.trim() }));
      onClose();
    } catch {
      setError("Gagal menyimpan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 rounded-[2.5rem]" 
        onClick={onClose} 
        aria-hidden 
      />
      <div
        className="relative w-full max-w-md rounded-[2.5rem] border border-border/50 dark:border-slate-700/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-500"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Edit Transaksi</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-0.5">Sesuaikan catatan keuanganmu</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white transition-all active:scale-95"
            aria-label="Tutup"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800/50 p-1 border border-border/20">
            <button
              type="button"
              onClick={() => { setType("expense"); setCategory(CATEGORIES.expense[0]); }}
              className={`flex-1 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${type === "expense" ? "bg-white dark:bg-slate-700 shadow-lg text-primary scale-[1.02]" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => { setType("income"); setCategory(CATEGORIES.income[0]); }}
              className={`flex-1 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${type === "income" ? "bg-white dark:bg-slate-700 shadow-lg text-primary scale-[1.02]" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
            >
              Pemasukan
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Jumlah (Rp)</label>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(formatAmountDisplay(e.target.value))}
                placeholder="25.000"
                required
                className="w-full h-12 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 px-5 text-sm font-bold text-slate-900 dark:text-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Kategori</label>
              <SelectDropdown
                value={category}
                onChange={setCategory}
                options={categories.map(c => ({ value: c, label: c.toUpperCase() }))}
                placeholder="Kategori"
                className="w-full h-12"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Catatan</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Makan siang..."
              className="w-full h-12 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 px-5 text-sm font-bold text-slate-900 dark:text-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
            />
          </div>

          {error && <p className="text-xs font-bold text-rose-500 text-center">{error}</p>}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={loading || !num || num <= 0}
              className="h-12 w-full rounded-2xl bg-primary font-black text-xs uppercase tracking-widest text-white shadow-lg shadow-primary/25 hover:bg-primary-hover hover:shadow-primary/40 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
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
        </form>
      </div>
    </div>
  );
}
