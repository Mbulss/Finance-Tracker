"use client";

import { useRef, useState } from "react";
import { useToast } from "@/components/ToastContext";
import type { PrefillFromPhoto } from "./AddTransactionForm";

interface AddFromPhotoProps {
  onParsed: (data: PrefillFromPhoto) => void;
  customCategories?: { id: string; name: string; type: "income" | "expense" }[];
  hiddenCategories?: { category_name: string; type: "income" | "expense" }[];
}

function processFile(
  file: File,
  onParsed: AddFromPhotoProps["onParsed"],
  showToast: (msg: string, type?: "success" | "error") => void,
  setLoading: (v: boolean) => void,
  customCategories: AddFromPhotoProps["customCategories"] = [],
  hiddenCategories: AddFromPhotoProps["hiddenCategories"] = []
) {
  if (!file.type.startsWith("image/")) {
    showToast("Pilih file gambar (foto struk/transfer)", "error");
    return;
  }
  setLoading(true);
  (async () => {
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const { data } = await Tesseract.recognize(file, "ind+eng", {
        logger: () => {},
      });
      const text = data?.text?.trim() ?? "";
      if (text.length < 5) {
        showToast("Teks tidak terbaca. Coba foto lebih jelas.", "error");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/parse-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: text.slice(0, 8000),
          customCategories,
          hiddenCategories
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.ok && json.amount != null) {
        const amount =
          typeof json.amount === "string"
            ? parseInt(json.amount.replace(/\./g, "").replace(/,/g, ""), 10) || 0
            : Number(json.amount);
        if (amount > 0) {
          onParsed({
            amount,
            type: json.type === "income" ? "income" : "expense",
            category: json.category ?? (json.type === "income" ? "Other" : "Other"),
            note: (json.note ?? "Dari foto").slice(0, 200),
          });
          showToast("Isian dari foto sudah diisi. Cek dan simpan di form.");
          setLoading(false);
          return;
        }
      }

      const errMsg =
        json?.error ??
        (res.status === 503
          ? "API AI belum di-set (OPENROUTER_API_KEY). Dapatkan gratis di openrouter.ai/keys"
          : res.status === 429
            ? "Quota AI habis. Coba lagi nanti atau isi manual."
            : "AI tidak bisa membaca nominal. Coba foto lebih jelas atau isi manual.");
      showToast(errMsg, "error");
    } catch (err) {
      showToast("Gagal membaca foto. Coba lagi.", "error");
    } finally {
      setLoading(false);
    }
  })();
}

export function AddFromPhoto({ onParsed, customCategories = [], hiddenCategories = [] }: AddFromPhotoProps) {
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  function handleFileFromInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    processFile(file, onParsed, showToast, setLoading, customCategories, hiddenCategories);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file, onParsed, showToast, setLoading, customCategories, hiddenCategories);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDrag(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !loading && fileInputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !loading) fileInputRef.current?.click();
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      aria-label="Unggah foto struk atau bukti transfer"
      className={`
        relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed
        bg-gradient-to-b from-slate-50 to-slate-100/80 dark:from-slate-800/60 dark:to-slate-800/40
        p-6 text-center transition-all duration-200
        hover:border-primary/40 hover:bg-primary/5 dark:hover:border-primary/30 dark:hover:bg-primary/10
        focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background
        ${drag ? "border-primary bg-primary/10 dark:bg-primary/20 scale-[1.01]" : "border-slate-200 dark:border-slate-600"}
        ${loading ? "pointer-events-none opacity-90" : ""}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileFromInput}
        className="hidden"
        aria-hidden
      />

      {loading ? (
        <>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 dark:bg-primary/30" aria-hidden>
            <svg className="h-6 w-6 animate-spin text-primary dark:text-sky-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">AI membaca foto...</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Tunggu sebentar</p>
        </>
      ) : (
        <>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 dark:bg-primary/25 text-primary dark:text-sky-400 ring-2 ring-primary/20 dark:ring-primary/30" aria-hidden>
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h3" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {drag ? "Lepas foto di sini" : "Tambah dari foto dengan AI"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[260px]">
            {drag ? "AI bakal isi transaksi otomatis" : "Seret foto atau ketuk — AI bakal isi transaksi otomatis"}
          </p>
        </>
      )}
    </div>
  );
}
