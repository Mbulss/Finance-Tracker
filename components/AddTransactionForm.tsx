"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastContext";
import type { TransactionType } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { formatAmountDisplay, parseAmountInput } from "@/lib/utils";

interface AddTransactionFormProps {
  userId: string;
  onSuccess: () => void;
  onOptimisticAdd?: (t: { id: string; user_id: string; type: "income" | "expense"; amount: number; category: string; note: string; created_at: string }) => void;
  onOptimisticFail?: (tempId: string) => void;
}

export function AddTransactionForm({ userId, onSuccess, onOptimisticAdd, onOptimisticFail }: AddTransactionFormProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES.expense[0]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();
  const { showToast } = useToast();

  const categories = type === "income" ? CATEGORIES.income : CATEGORIES.expense;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const num = parseAmountInput(amount);
    if (!num || num <= 0) {
      setError("Masukkan jumlah yang valid.");
      return;
    }
    setLoading(true);
    const tempId = "opt-" + Date.now();
    const optimisticRow = {
      id: tempId,
      user_id: userId,
      type,
      amount: num,
      category: category || categories[0],
      note: note.trim() || "",
      created_at: new Date().toISOString(),
    };
    onOptimisticAdd?.(optimisticRow);
    try {
      const { error: err } = await supabase.from("transactions").insert({
        user_id: userId,
        type,
        amount: num,
        category: category || categories[0],
        note: note.trim() || "",
      });
      if (err) throw err;
      setAmount("");
      setNote("");
      setCategory(categories[0]);
      showToast("Transaksi disimpan");
      onSuccess();
    } catch (e) {
      onOptimisticFail?.(tempId);
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex rounded-xl bg-slate-100 dark:bg-slate-700 p-1">
        <button
          type="button"
          onClick={() => {
            setType("expense");
            setCategory(CATEGORIES.expense[0]);
          }}
          className={`flex-1 min-h-[48px] rounded-lg py-3 sm:py-2 text-sm font-medium transition ${type === "expense" ? "bg-card dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow soft" : "text-muted dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
        >
          Pengeluaran
        </button>
        <button
          type="button"
          onClick={() => {
            setType("income");
            setCategory(CATEGORIES.income[0]);
          }}
          className={`flex-1 min-h-[48px] rounded-lg py-3 sm:py-2 text-sm font-medium transition ${type === "income" ? "bg-card dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow soft" : "text-muted dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
        >
          Pemasukan
        </button>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Jumlah (Rp)</label>
        <input
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(formatAmountDisplay(e.target.value))}
          placeholder="25.000"
          required
          className="w-full min-h-[48px] rounded-xl border border-border dark:border-slate-600 bg-card dark:bg-slate-800 dark:text-slate-100 px-4 py-3 text-base sm:text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Kategori</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full min-h-[48px] rounded-xl border border-border dark:border-slate-600 bg-card dark:bg-slate-800 dark:text-slate-100 px-4 py-3 text-base sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Catatan (opsional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Contoh: Kopi, bensin, dll"
          className="w-full min-h-[48px] rounded-xl border border-border dark:border-slate-600 bg-card dark:bg-slate-800 dark:text-slate-100 px-4 py-3 text-base sm:text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      {error && <p className="text-sm text-expense">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full min-h-[48px] rounded-xl bg-primary py-3 font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-hover hover:shadow-primary/30 disabled:opacity-50 active:scale-[0.98]"
      >
        {loading ? "Menyimpan..." : "Tambah Transaksi"}
      </button>
    </form>
  );
}
