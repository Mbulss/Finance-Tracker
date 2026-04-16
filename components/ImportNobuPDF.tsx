"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastContext";
import { formatCurrency, formatDate } from "@/lib/utils";
import { type ParsedCSVRow } from "@/lib/csv-parser";
import { CATEGORIES } from "@/lib/types";
import { SelectDropdown } from "./SelectDropdown";

interface ImportNobuPDFProps {
  userId: string;
  onSuccess: () => void;
  customCategories?: { id: string; name: string; type: "income" | "expense" }[];
  hiddenCategories?: { category_name: string; type: "income" | "expense" }[];
}

export function ImportNobuPDF({ userId, onSuccess, customCategories = [], hiddenCategories = [] }: ImportNobuPDFProps) {
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [previewRows, setPreviewRows] = useState<ParsedCSVRow[] | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  
  // Custom Edit State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<ParsedCSVRow | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const [supabase] = useState(() => createClient());

  const getCategories = (type: "income" | "expense") => {
    let list: string[] = type === "income" ? [...CATEGORIES.income] : [...CATEGORIES.expense];
    customCategories.filter(c => c.type === type).forEach(c => {
      if (!list.includes(c.name)) list.push(c.name);
    });
    list.sort();
    const hiddenSet = new Set(hiddenCategories.filter(h => h.type === type).map(h => h.category_name));
    return list.filter(c => !hiddenSet.has(c));
  };
  const incomeCategories = getCategories("income");
  const expenseCategories = getCategories("expense");

  async function handleFile(file: File, pdfPassword?: string) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      showToast("Pilih file PDF mutasi Nobu BOSS.", "error");
      return;
    }

    setLoading(true);
    setPasswordError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (pdfPassword) {
        formData.append("password", pdfPassword);
      }

      const res = await fetch("/api/parse-nobu-pdf", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.needsPassword) {
          setPendingFile(file);
          setShowPasswordInput(true);
          if (json.wrongPassword) {
            setPasswordError("Password salah. Coba lagi.");
          }
          setPassword("");
          setLoading(false);
          return;
        }
        throw new Error(json.error ?? "Gagal membaca PDF.");
      }

      const rows: ParsedCSVRow[] = json.rows;

      if (!rows || rows.length === 0) {
        showToast("Tidak ditemukan transaksi Nobu BOSS dalam PDF ini.", "error");
      } else {
        setPreviewRows(rows);
        setShowPasswordInput(false);
        setPendingFile(null);
        setPassword("");
        setPasswordError("");
      }
    } catch (err: any) {
      console.error("PDF Parsing Error:", err);
      showToast("Gagal membaca file PDF. " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingFile || !password.trim()) return;
    handleFile(pendingFile, password.trim());
  }

  function handleCancelPassword() {
    setShowPasswordInput(false);
    setPendingFile(null);
    setPassword("");
    setPasswordError("");
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

      showToast(`Berhasil impor ${previewRows.length} transaksi Nobu!`, "success");
      setPreviewRows(null);
      onSuccess();
    } catch (err: any) {
      showToast("Gagal simpan data: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  function startEditRow(index: number) {
    if (!previewRows) return;
    setEditingIndex(index);
    setEditData(previewRows[index]);
  }

  function saveEditRow() {
    if (!previewRows || editingIndex === null || !editData) return;
    const newRows = [...previewRows];
    newRows[editingIndex] = editData;
    setPreviewRows(newRows);
    setEditingIndex(null);
    setEditData(null);
  }

  function handleDeleteRow(index: number) {
    if (!previewRows) return;
    const newRows = [...previewRows];
    newRows.splice(index, 1);
    
    if (newRows.length === 0) {
      setPreviewRows(null);
    } else {
      setPreviewRows(newRows);
    }
  }

  const previewModal = previewRows ? (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 sm:p-6 cursor-default">
      <div 
        className="absolute inset-0 bg-slate-900/60 dark:bg-black/90 backdrop-blur-md animate-fade-in" 
        onClick={() => !loading && setPreviewRows(null)} 
        aria-hidden 
      />
      <div className="relative w-full max-w-4xl overflow-hidden rounded-[2.5rem] border border-white/20 dark:border-slate-700/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl animate-scale-in">
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-center justify-between p-6 sm:p-8 border-b border-border/10 dark:border-slate-800">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Preview Mutasi Nobu</h3>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Ditemukan {previewRows.length} transaksi.</p>
            </div>
            <button 
              onClick={() => setPreviewRows(null)} 
              className="h-10 w-10 flex items-center justify-center rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 sm:p-8 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 bg-slate-50/30 dark:bg-transparent">
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto rounded-2xl border border-border/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm">
               <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-400 backdrop-blur-md">
                     <tr>
                        <th className="px-4 py-3.5 font-black uppercase tracking-widest border-b border-border/5 dark:border-slate-700/50">Tanggal</th>
                        <th className="px-4 py-3.5 font-black uppercase tracking-widest border-b border-border/5 dark:border-slate-700/50">Tipe/Kategori</th>
                        <th className="px-4 py-3.5 font-black uppercase tracking-widest text-right border-b border-border/5 dark:border-slate-700/50">Nominal</th>
                        <th className="px-4 py-3.5 font-black uppercase tracking-widest border-b border-border/5 dark:border-slate-700/50">Deskripsi</th>
                        <th className="px-4 py-3.5 font-black uppercase tracking-widest text-right border-b border-border/5 dark:border-slate-700/50 max-w-[50px]">Aksi</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-border/5 dark:divide-slate-800/50">
                     {previewRows.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                           <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 font-bold tracking-tighter whitespace-nowrap align-middle">{row.created_at ? formatDate(row.created_at) : "-"}</td>
                           <td className="px-4 py-3.5 align-middle">
                              <div className="flex flex-col gap-1 w-max">
                                 <span className={`px-2 py-0.5 w-max rounded-md font-black uppercase text-[9px] tracking-widest ${row.type === "income" ? "bg-income/10 text-income" : "bg-expense/10 text-expense"}`}>
                                    {row.type === "income" ? "MASUK" : "KELUAR"}
                                 </span>
                                 <span className="text-[10px] font-bold text-slate-500">{row.category || "Lainnya"}</span>
                              </div>
                           </td>
                           <td className="px-4 py-3.5 font-black text-slate-900 dark:text-white text-right tabular-nums whitespace-nowrap align-middle">{formatCurrency(row.amount)}</td>
                           <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 text-xs font-medium max-w-[200px] truncate align-middle">{row.note}</td>
                           <td className="px-4 py-3.5 text-right align-middle border-l border-border/5 dark:border-slate-700/50">
                              <div className="flex justify-end gap-1">
                                 <button
                                    onClick={() => startEditRow(i)}
                                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                    title="Edit baris"
                                 >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                 </button>
                                 <button
                                    onClick={() => handleDeleteRow(i)}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                                    title="Hapus baris"
                                 >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                 </button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            {/* Mobile Card View */}
            <div className="sm:hidden space-y-3">
               {previewRows.map((row, i) => (
                  <div key={i} className="flex flex-col p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 shadow-sm transition-all hover:scale-[1.01] relative group">
                     <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col">
                           <span className="font-black text-slate-900 dark:text-white text-base tabular-nums tracking-tight">
                              {formatCurrency(row.amount)}
                           </span>
                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                              {row.created_at ? formatDate(row.created_at) : "-"}
                           </span>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                           <span className={`px-2.5 py-1 rounded-lg font-black uppercase text-[9px] tracking-widest shadow-sm ${row.type === "income" ? "bg-income/10 text-income" : "bg-expense/10 text-expense"}`}>
                              {row.type === "income" ? "MASUK" : "KELUAR"}
                           </span>
                           <span className="text-[9px] font-black uppercase text-slate-500">{row.category || "Lainnya"}</span>
                        </div>
                     </div>
                     <div className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        {row.note}
                     </div>
                     <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-700/50 pt-3">
                        <button
                           onClick={() => handleDeleteRow(i)}
                           className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                           Hapus
                        </button>
                        <button
                           onClick={() => startEditRow(i)}
                           className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-primary/5 dark:hover:text-primary dark:hover:bg-primary/10 rounded-lg transition-colors"
                        >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                           Edit Data
                        </button>
                     </div>
                  </div>
               ))}
            </div>
          </div>

          <footer className="p-6 sm:p-8 border-t border-border/10 dark:border-slate-800 flex flex-col sm:flex-row gap-3 sm:gap-4 lg:bg-transparent">
             <button
                onClick={() => setPreviewRows(null)}
                disabled={loading}
                className="order-2 sm:order-1 w-full sm:flex-1 h-12 sm:h-14 rounded-2xl border-2 border-border/10 dark:border-slate-800 font-black text-[11px] sm:text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
             >
                BATAL
             </button>
             <button
                onClick={handleConfirmImport}
                disabled={loading}
                className="order-1 sm:order-2 w-full sm:flex-1 h-12 sm:h-14 rounded-2xl bg-primary text-white font-black text-[11px] sm:text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
             >
                {loading ? "MENYIMPAN..." : "SIMPAN SEMUA"}
             </button>
          </footer>
        </div>
      </div>
      
      {/* Edit Row Popup Modal */}
      {(editingIndex !== null && editData) && (
        <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-slate-900/40 dark:bg-black/60 animate-fade-in" onClick={() => setEditingIndex(null)}>
            <div className="relative w-full max-w-sm rounded-[2rem] border border-white/20 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-start mb-5">
                  <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">EDIT DATA</h4>
                  <button onClick={() => setEditingIndex(null)} className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
               </div>
               
               <div className="space-y-4">
                  <div className="flex gap-3">
                     <div className="flex-1 space-y-1.5 min-w-0">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tipe</label>
                        <SelectDropdown 
                           value={editData.type} 
                           onChange={(val) => setEditData({...editData, type: val as any, category: val === "income" ? incomeCategories[0] : expenseCategories[0]})} 
                           options={[
                              { value: "income", label: "MASUK" },
                              { value: "expense", label: "KELUAR" }
                           ]}
                           hideAllOption
                           className="w-full"
                           buttonClassName="!h-11 !min-w-0 !w-full !px-4 !bg-slate-50 dark:!bg-slate-800 !border-slate-200 dark:!border-slate-700 !text-xs"
                        />
                     </div>
                     <div className="flex-1 space-y-1.5 min-w-0">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Kategori</label>
                        <SelectDropdown 
                           value={editData.category || "Lainnya"} 
                           onChange={(val) => setEditData({...editData, category: val})} 
                           options={(editData.type === "income" ? incomeCategories : expenseCategories).map(cat => ({ value: cat, label: cat }))}
                           hideAllOption
                           placeholder="Lainnya"
                           className="w-full"
                           buttonClassName="!h-11 !min-w-0 !w-full !px-4 !bg-slate-50 dark:!bg-slate-800 !border-slate-200 dark:!border-slate-700 !text-xs"
                        />
                     </div>
                  </div>
                  
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nominal (Rp)</label>
                     <input 
                        type="text" 
                        value={editData.amount ? editData.amount.toLocaleString('id-ID') : ""} 
                        onChange={(e) => {
                           const val = e.target.value.replace(/\D/g, "");
                           setEditData({...editData, amount: val ? Number(val) : 0});
                        }} 
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-black tabular-nums text-slate-900 dark:text-white outline-none focus:border-primary transition-colors"
                     />
                  </div>
                  
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Deskripsi</label>
                     <textarea 
                        value={editData.note} 
                        onChange={(e) => setEditData({...editData, note: e.target.value})} 
                        rows={3}
                        className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-primary transition-colors resize-none"
                     />
                  </div>
               </div>
               
               <div className="mt-6 flex flex-col gap-2">
                  <button onClick={saveEditRow} className="h-12 w-full rounded-xl bg-primary text-white font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-transform shadow-lg shadow-primary/20">Simpan Perubahan</button>
                  <button onClick={() => setEditingIndex(null)} className="h-12 w-full rounded-xl border-2 border-slate-100 dark:border-slate-800 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Batal</button>
               </div>
            </div>
        </div>
      )}
    </div>
  ) : null;

  return (
    <>
      {/* Password input state */}
      {showPasswordInput ? (
        <form onSubmit={handlePasswordSubmit} className="relative flex flex-col items-center gap-4 rounded-[2.5rem] border-2 border-amber-400/50 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10 p-6 text-center transition-all">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-400">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">PDF Terkunci</p>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
              Masukkan password untuk membuka PDF ini.
            </p>
          </div>
          <div className="w-full max-w-xs flex flex-col gap-3">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
                placeholder="Password PDF..."
                autoFocus
                className={`w-full h-12 rounded-2xl border ${passwordError ? "border-rose-400 dark:border-rose-500" : "border-slate-200 dark:border-slate-700"} bg-white/80 dark:bg-slate-800/80 px-5 text-sm font-bold text-slate-900 dark:text-white text-center placeholder:text-slate-400 placeholder:text-[11px] focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none`}
              />
              {passwordError && (
                <p className="mt-1.5 text-[10px] font-bold text-rose-500">{passwordError}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancelPassword}
                className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 font-black text-[9px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading || !password.trim()}
                className="flex-1 h-10 rounded-xl bg-primary text-white font-black text-[9px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? "MEMBUKA..." : "BUKA PDF"}
              </button>
            </div>
          </div>
        </form>
      ) : (
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
            accept=".pdf"
            onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ""; }}
            className="hidden"
          />
          
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700/50 p-2.5 transition-transform group-hover:scale-110">
            {loading ? (
               <svg className="h-6 w-6 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : (
              <img src="/nobu logo.webp" alt="Nobu Bank" className="h-full w-full object-contain" />
            )}
          </div>
          <p className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">Impor PDF Nobu</p>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Support format Nobu BOSS — termasuk PDF ber-password.</p>
        </div>
      )}

      {previewModal && typeof document !== "undefined" && createPortal(previewModal, document.body)}
    </>
  );
}
