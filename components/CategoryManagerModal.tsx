"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "./ToastContext";
import { CATEGORIES } from "@/lib/types";

interface CategoryManagerModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  type: "income" | "expense";
  categories: { id: string; name: string; type: "income" | "expense" }[];
  hiddenCategories: { category_name: string; type: "income" | "expense" }[];
  onRefresh?: () => void;
}

export function CategoryManagerModal({
  userId,
  isOpen,
  onClose,
  type,
  categories,
  hiddenCategories,
  onRefresh,
}: CategoryManagerModalProps) {
  const [newName, setNewName] = useState("");
  const [activeTab, setActiveTab] = useState<"custom" | "default">("custom");
  const [loading, setLoading] = useState(false);
  const [supabase] = useState(() => createClient());
  const { showToast } = useToast();

  const filtered = categories.filter((c) => c.type === type);

  async function handleAdd() {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("custom_categories").insert({
        user_id: userId,
        name: newName.trim(),
        type: type,
      });
      if (error) throw error;
      setNewName("");
      showToast("Kategori ditambahkan");
      onRefresh?.();
    } catch (err: any) {
      showToast(err.message || "Gagal menambah kategori", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("custom_categories")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
      showToast("Kategori dihapus");
      onRefresh?.();
    } catch (err: any) {
      showToast(err.message || "Gagal menghapus kategori", "error");
    } finally {
      setLoading(false);
    }
  }

  async function toggleHideDefault(name: string) {
    setLoading(true);
    const isHidden = hiddenCategories.some(h => h.category_name === name && h.type === type);
    try {
      if (isHidden) {
        const { error } = await supabase
          .from("hidden_categories")
          .delete()
          .eq("user_id", userId)
          .eq("category_name", name)
          .eq("type", type);
        if (error) throw error;
        showToast("Kategori dimunculkan");
      } else {
        const { error } = await supabase.from("hidden_categories").insert({
          user_id: userId,
          category_name: name,
          type: type,
        });
        if (error) throw error;
        showToast("Kategori disembunyikan");
      }
      onRefresh?.();
    } catch (err: any) {
      showToast(err.message || "Gagal mengubah status kategori", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const defaultCats = type === "income" ? CATEGORIES.income : CATEGORIES.expense;

  const modalContent = (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 sm:p-6 cursor-default">
      <div
        className="absolute inset-0 bg-slate-900/60 dark:bg-black/90 backdrop-blur-md animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/20 dark:border-slate-700/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl animate-scale-in flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative mb-6">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight pr-8">
            Kelola Kategori {type === "income" ? "Masuk" : "Keluar"}
          </h3>
          <p className="mt-1 text-[9px] sm:text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-relaxed">
            Tambah atau hapus kategori kustom kamu
          </p>
          <button
            onClick={onClose}
            className="absolute -right-1 -top-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex gap-1 p-1 mb-6 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-border/20">
          <button
            onClick={() => setActiveTab("custom")}
            className={`flex-1 py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === "custom" ? "bg-white dark:bg-slate-700 shadow-lg text-primary" : "text-slate-400"}`}
          >
            Kustom
          </button>
          <button
            onClick={() => setActiveTab("default")}
            className={`flex-1 py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === "default" ? "bg-white dark:bg-slate-700 shadow-lg text-primary" : "text-slate-400"}`}
          >
            Bawaan
          </button>
        </div>

        {activeTab === "custom" ? (
          <>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nama kategori baru..."
                className="w-full h-14 sm:h-12 sm:flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 text-sm font-bold text-slate-900 dark:text-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <button
                onClick={handleAdd}
                disabled={loading || !newName.trim()}
                className="w-full h-14 sm:h-12 sm:w-auto sm:px-8 rounded-2xl bg-primary text-white font-black text-[11px] uppercase tracking-widest hover:bg-primary-hover shadow-lg shadow-primary/20 disabled:opacity-50 transition-all active:scale-95 whitespace-nowrap"
              >
                Tambah
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 scrollbar-none space-y-2">
              {categories.filter(c => c.type === type).length === 0 ? (
                <div className="py-8 text-center text-slate-400">Belum ada kategori kustom.</div>
              ) : (
                categories.filter(c => c.type === type).map((cat) => (
                  <div key={cat.id} className="group flex items-center justify-between p-4 rounded-3xl border border-border/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">{cat.name}</span>
                    <button onClick={() => handleDelete(cat.id)} disabled={loading} className="h-8 w-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2 scrollbar-none space-y-2">
            {defaultCats.map((name) => {
              const isHidden = hiddenCategories.some(h => h.category_name === name && h.type === type);
              return (
                <div key={name} className="group flex items-center justify-between p-4 rounded-3xl border border-border/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50">
                  <span className={`text-sm font-black uppercase tracking-tight transition-all ${isHidden ? "text-slate-300 dark:text-slate-600 line-through" : "text-slate-700 dark:text-slate-200"}`}>
                    {name}
                  </span>
                  <button
                    onClick={() => toggleHideDefault(name)}
                    disabled={loading}
                    className={`px-3 sm:px-4 py-2 rounded-xl font-black text-[8px] sm:text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${
                      isHidden 
                        ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-rose-500/10 hover:text-rose-500"
                    }`}
                  >
                    {isHidden ? "Munculkan" : "Sembunyikan"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6">
          <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-widest italic">
            {activeTab === "custom" ? "Kategori kustom bisa dihapus sepenuhnya." : "Kategori bawaan hanya bisa disembunyikan."}
          </p>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
