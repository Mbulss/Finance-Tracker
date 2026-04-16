"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastContext";
import type { TransactionType } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { formatAmountDisplay, parseAmountInput } from "@/lib/utils";
import { SelectDropdown } from "@/components/SelectDropdown";
import { CategoryManagerModal } from "./CategoryManagerModal";

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
  customCategories?: { id: string; name: string; type: "income" | "expense" }[];
  hiddenCategories?: { category_name: string; type: "income" | "expense" }[];
  onRefreshCategories?: () => void;
}

export function AddTransactionForm({ userId, onSuccess, onOptimisticAdd, onOptimisticFail, prefill, onPrefillApplied, customCategories = [], hiddenCategories = [], onRefreshCategories }: AddTransactionFormProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pots, setPots] = useState<{ id: string; name: string }[]>([]);
  const [saveToSavings, setSaveToSavings] = useState(false);
  const [selectedPotId, setSelectedPotId] = useState<string>("__umum__");
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [supabase] = useState(() => createClient());
  const { showToast } = useToast();

  const allCategories = type === "income" ? CATEGORIES.income : CATEGORIES.expense;
  const filteredDefaultCategories = allCategories.filter(
    (cat) => !hiddenCategories.some((h) => h.category_name === cat && h.type === type)
  );

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

  // Sync category selection when hidden state changes or type changes
  useEffect(() => {
    const available = [
      ...filteredDefaultCategories,
      ...customCategories.filter(c => c.type === type).map(c => c.name)
    ];
    if (category && !available.includes(category)) {
      setCategory(""); // Reset if current selection becomes hidden
    } else if (!category && available.length > 0) {
      // Don't auto-select if user wants to be forced, 
      // but usually apps auto-select the first one.
      // User said "kalau ga dipilih gabisa input", let's keep it empty to force.
    }
  }, [type, hiddenCategories, customCategories]);

  useEffect(() => {
    if (!prefill) return;
    setType(prefill.type);
    setAmount(formatAmountDisplay(String(prefill.amount)));
    if (CATEGORIES.income.includes(prefill.category as any) || CATEGORIES.expense.includes(prefill.category as any)) {
      setCategory(prefill.category);
    } else {
      // Fallback if not in predefined list (e.g. from photo)
      setCategory(prefill.category);
    }
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
    if (!category) {
      setError("Pilih kategori terlebih dahulu.");
      return;
    }
    setLoading(true);
    const tempId = "opt-" + Date.now();
    const optimisticRow = {
      id: tempId,
      user_id: userId,
      type,
      amount: num,
      category: category,
      note: note.trim() || "",
      created_at: new Date().toISOString(),
    };
    onOptimisticAdd?.(optimisticRow);
    try {
      const { error: err } = await supabase.from("transactions").insert({
        user_id: userId,
        type,
        amount: num,
        category: category,
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
      setSaveToSavings(false);
      // Let it be reset via useEffect
      showToast(saveToSavings ? "Setoran ke tabungan berhasil!" : "Transaksi disimpan");
      onSuccess();
    } catch (e) {
      onOptimisticFail?.(tempId);
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setLoading(false);
    }
  }

  const availableCategories = [
    ...filteredDefaultCategories.map(c => ({ value: c, label: c })),
    ...customCategories.filter(c => c.type === type).map(c => ({ value: c.name, label: c.name }))
  ];
  const availableCount = availableCategories.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex rounded-xl bg-slate-100 dark:bg-slate-700 p-1">
        <button
          type="button"
          onClick={() => {
            setType("expense");
            setCategory(""); 
          }}
          className={`flex-1 min-h-[48px] rounded-lg py-3 sm:py-2 text-sm font-medium transition ${type === "expense" ? "bg-card dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow soft" : "text-muted dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
        >
          Pengeluaran
        </button>
        <button
          type="button"
          onClick={() => {
            setType("income");
            setCategory(""); 
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
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Kategori</label>
          <button
            type="button"
            onClick={() => setShowCategoryManager(true)}
            className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
          >
            Kelola
          </button>
        </div>
        <SelectDropdown
          value={category}
          onChange={setCategory}
          options={availableCategories}
          placeholder={availableCount === 0 ? "⚠️ Kelola Kategori..." : "Pilih Kategori"}
          hideAllOption={true}
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
        disabled={loading || !parseAmountInput(amount) || parseAmountInput(amount) <= 0 || !category}
        className="h-14 w-full rounded-2xl bg-primary text-base font-black uppercase tracking-widest text-white shadow-xl shadow-primary/30 transition-all hover:bg-primary-hover hover:scale-[1.02] active:scale-95 disabled:opacity-50"
      >
        {loading ? "Menyimpan..." : "Tambah Transaksi"}
      </button>

      <CategoryManagerModal
        userId={userId}
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        type={type}
        categories={customCategories}
        hiddenCategories={hiddenCategories}
        onRefresh={() => {
          onRefreshCategories?.();
        }}
      />
    </form>
  );
}
