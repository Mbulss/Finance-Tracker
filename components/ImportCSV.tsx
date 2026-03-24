"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastContext";
import { parseTransactionsCSV, type ParsedCSVRow } from "@/lib/csv-parser";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ImportCSVProps {
  userId: string;
  onSuccess: () => void;
}

export function ImportCSV({ userId, onSuccess }: ImportCSVProps) {
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [previewRows, setPreviewRows] = useState<ParsedCSVRow[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const supabase = createClient();

  async function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      showToast("Pilih file CSV hasil export.", "error");
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const rows = parseTransactionsCSV(text);
      if (rows.length === 0) {
        showToast("File kosong atau tidak terbaca.", "error");
      } else {
        setPreviewRows(rows);
      }
    } catch {
      showToast("Gagal membaca file CSV.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmImport() {
    if (!previewRows) return;
    setLoading(true);
    try {
      const toInsert = previewRows.map(r => ({
        ...r,
        user_id: userId,
      }));

      const { error } = await supabase.from("transactions").insert(toInsert);
      if (error) throw error;

      showToast(`Berhasil impor ${previewRows.length} transaksi!`, "success");
      setPreviewRows(null);
      onSuccess();
    } catch (err: any) {
      showToast("Gagal simpan data: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !loading && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !loading) fileInputRef.current?.click();
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
        }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
        className={`relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[2.5rem] border-2 border-dashed
          bg-slate-50/50 dark:bg-slate-800/20 p-6 text-center transition-all duration-200
          hover:border-primary/40 hover:bg-primary/5 dark:hover:border-primary/30 dark:hover:bg-primary/10
          ${drag ? "border-primary bg-primary/10 dark:bg-primary/20 scale-[1.01]" : "border-slate-200 dark:border-slate-700"}
          ${loading ? "pointer-events-none opacity-50" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ""; }}
          className="hidden"
        />
        
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 dark:bg-primary/25 text-primary">
          {loading ? (
             <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          ) : (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
          )}
        </div>
        <p className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">Impor CSV</p>
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Pindahkan data antar perangkat dengan mudah.</p>
      </div>

      {/* Preview Modal */}
      {previewRows && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/90 backdrop-blur-xl" onClick={() => !loading && setPreviewRows(null)} />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[3rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="flex h-[90vh] flex-col">
                <header className="flex items-center justify-between p-8 border-b border-slate-100 dark:border-slate-800">
                   <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Konfirmasi Impor</h3>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Found {previewRows.length} transactions in file.</p>
                   </div>
                   <button onClick={() => setPreviewRows(null)} className="p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>
                </header>

                <div className="flex-1 overflow-y-auto p-8 space-y-4">
                   <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                         <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400">
                            <tr>
                               <th className="px-4 py-3 font-black uppercase tracking-widest">Tanggal</th>
                               <th className="px-4 py-3 font-black uppercase tracking-widest">Tipe</th>
                               <th className="px-4 py-3 font-black uppercase tracking-widest">Nominal</th>
                               <th className="px-4 py-3 font-black uppercase tracking-widest">Kategori</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {previewRows.map((row, i) => (
                               <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="px-4 py-3 text-slate-400 font-bold tracking-tighter">{row.created_at ? formatDate(row.created_at) : "-"}</td>
                                  <td className="px-4 py-3">
                                     <span className={`px-2 py-0.5 rounded-md font-black uppercase text-[9px] ${row.type === "income" ? "bg-income/10 text-income" : "bg-expense/10 text-expense"}`}>
                                        {row.type === "income" ? "MASUK" : "KELUAR"}
                                     </span>
                                  </td>
                                  <td className="px-4 py-3 font-black text-slate-900 dark:text-white">{formatCurrency(row.amount)}</td>
                                  <td className="px-4 py-3 text-slate-500 font-bold">{row.category}</td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>

                <footer className="p-8 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                   <button
                      onClick={() => setPreviewRows(null)}
                      disabled={loading}
                      className="flex-1 h-14 rounded-2xl border-2 border-slate-100 dark:border-slate-800 font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                   >
                      BATAL
                   </button>
                   <button
                      onClick={handleConfirmImport}
                      disabled={loading}
                      className="flex-1 h-14 rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                   >
                      {loading ? "MENYIMPAN..." : "SIMPAN SEMUA"}
                   </button>
                </footer>
             </div>
          </div>
        </div>
      )}
    </>
  );
}
