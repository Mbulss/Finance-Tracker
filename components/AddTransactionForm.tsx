"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastContext";
import type { TransactionType } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { formatAmountDisplay, parseAmountInput } from "@/lib/utils";
import { SelectDropdown } from "@/components/SelectDropdown";

export type PrefillFromPhoto = {
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
};

interface AddTransactionFormProps {
  userId: string;
  onSuccess: () => void;
  onOptimisticAdd?: (t: { id: string; user_id: string; type: "income" | "expense"; amount: number; category: string; note: string; created_at: string }) => void;
  onOptimisticFail?: (tempId: string) => void;
  prefill?: PrefillFromPhoto | null;
  onPrefillApplied?: () => void;
}

export function AddTransactionForm({ userId, onSuccess, onOptimisticAdd, onOptimisticFail, prefill, onPrefillApplied }: AddTransactionFormProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES.expense[0]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pots, setPots] = useState<{ id: string; name: string }[]>([]);
  const [saveToSavings, setSaveToSavings] = useState(false);
  const [selectedPotId, setSelectedPotId] = useState<string>("__umum__");
  const supabase = createClient();
  const { showToast } = useToast();

  const categories = type === "income" ? CATEGORIES.income : CATEGORIES.expense;

  useEffect(() => {
    async function fetchPots() {
      const { data } = await supabase
        .from("savings_pots")
        .select("id, name")
        .eq("user_id", userId)
        .order("sort_order");
      if (data) setPots(data);
    }
    fetchPots();
  }, [userId, supabase]);

  useEffect(() => {
    if (!prefill) return;
    setType(prefill.type);
    setAmount(formatAmountDisplay(String(prefill.amount)));
    setCategory(prefill.category);
    setNote(prefill.note);
    onPrefillApplied?.();
  }, [prefill, onPrefillApplied]);

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

      // If "Kirim ke Tabungan" is checked, also insert into savings_entries
      if (type === "expense" && saveToSavings) {
        const { error: saveErr } = await supabase.from("savings_entries").insert({
          user_id: userId,
          type: "deposit",
          amount: num,
          pot_id: selectedPotId === "__umum__" ? null : selectedPotId,
          note: note.trim() ? `${note.trim()} (Auto Dashboard)` : "Dari Dashboard",
        });
        if (saveErr) console.error("Gagal simpan ke tabungan:", saveErr);
      }

      setAmount("");
      setNote("");
      setCategory(categories[0]);
      setSaveToSavings(false);
      showToast(saveToSavings ? "Setoran ke tabungan berhasil!" : "Transaksi disimpan");
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
        <SelectDropdown
          value={category}
          onChange={setCategory}
          options={categories.map(c => ({ value: c, label: c }))}
          placeholder="Pilih Kategori"
        />
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

      {type === "expense" && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-primary">Setor Tabungan?</p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Otomatis masuk ke celengan</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSaveToSavings(!saveToSavings)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${saveToSavings ? "bg-primary" : "bg-slate-300 dark:bg-slate-600"}`}
            >
              <span className={`absolute top-1 left-1 h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${saveToSavings ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          {saveToSavings && (
            <div className="mt-4 animate-in fade-in zoom-in-95 duration-200">
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-primary/70">Pilih Celengan</label>
              <SelectDropdown
                value={selectedPotId}
                onChange={setSelectedPotId}
                options={[
                  { value: "__umum__", label: "UMUM (STANDAR)" },
                  ...pots.map(p => ({ value: p.id, label: p.name.toUpperCase() }))
                ]}
                placeholder="Pilih Celengan..."
              />
            </div>
          )}
        </div>
      )}
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
