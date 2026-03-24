"use client";

import { useState, useEffect } from "react";
import type { SavingsEntry, SavingsPot } from "@/components/TabunganContent";
import { formatAmountDisplay, parseAmountInput } from "@/lib/utils";
import { SelectDropdown } from "./SelectDropdown";

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
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-6 cursor-default">
      <div 
        className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md animate-fade-in rounded-[2.5rem]" 
        onClick={onClose} 
        aria-hidden 
      />
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] border border-white/20 dark:border-slate-700/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-6 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Glow effects */}
        <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-primary/20 blur-[80px]" aria-hidden />
        <div className="absolute -left-24 -bottom-24 h-48 w-48 rounded-full bg-primary/10 blur-[60px]" aria-hidden />

        <div className="relative mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Edit Riwayat</h3>
            <p className="mt-0.5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Perbarui detail transaksi tabunganmu</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all shadow-soft"
            aria-label="Tutup"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="relative space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pots.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Celengan</label>
                <SelectDropdown
                  value={potId ?? "__umum__"}
                  onChange={(val) => setPotId(val === "__umum__" ? null : val)}
                  options={[
                    { value: "__umum__", label: "UMUM" },
                    ...pots.map(p => ({ value: p.id, label: p.name.toUpperCase() }))
                  ]}
                  placeholder="Pilih Celengan"
                  className="w-full h-12"
                />
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Jenis Transaksi</label>
              <div className="flex h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1.5 ring-1 ring-black/5 dark:ring-white/5">
                <button
                  type="button"
                  onClick={() => setType("deposit")}
                  className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    type === "deposit"
                      ? "bg-white dark:bg-slate-700 text-income shadow-md ring-1 ring-black/5 dark:ring-white/5 scale-[1.02]"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  Setor
                </button>
                <button
                  type="button"
                  onClick={() => setType("withdraw")}
                  className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    type === "withdraw"
                      ? "bg-white dark:bg-slate-700 text-expense shadow-md ring-1 ring-black/5 dark:ring-white/5 scale-[1.02]"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  Tarik
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nominal (Rp)</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400 transition-colors group-focus-within:text-primary">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(formatAmountDisplay(e.target.value))}
                placeholder="0"
                required
                className="w-full h-14 pl-12 pr-4 rounded-[1.25rem] border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-xl font-black tabular-nums text-slate-900 dark:text-white focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Catatan (Pesan)</label>
            <div className="relative group">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Deskripsi transaksi..."
                className="w-full h-12 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-expense/10 text-expense text-[10px] font-black uppercase tracking-widest animate-pulse-subtle ring-1 ring-expense/20">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-12 rounded-2xl border-2 border-slate-100 dark:border-slate-700 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all disabled:opacity-50 active:scale-95"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !num || num <= 0}
              className="flex-1 h-12 rounded-2xl bg-primary shadow-lg shadow-primary/25 font-black text-[10px] uppercase tracking-widest text-white hover:bg-primary-hover hover:shadow-primary/40 transition-all disabled:opacity-50 active:scale-95"
            >
              {loading ? "PROSES..." : "SIMPAN"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
