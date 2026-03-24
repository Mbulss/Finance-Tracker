"use client";

import { useState, useEffect } from "react";
import type { Transaction } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { EditTransactionModal } from "./EditTransactionModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { SelectDropdown } from "./SelectDropdown";
import { useToast } from "./ToastContext";
import { EmptyState } from "./EmptyState";

interface TransactionTableProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (id: string, data: { type: "income" | "expense"; amount: number; category: string; note: string }) => void;
}

const PAGE_SIZE = 15;

type TypeFilter = "all" | "income" | "expense";

export function TransactionTable({ transactions, onDelete, onEdit }: TransactionTableProps) {
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [page, setPage] = useState(1);
  const { showToast } = useToast();

  const categories = Array.from(new Set(transactions.map((t) => t.category))).sort();
  const searchDigits = search.replace(/\D/g, "");
  const filtered = transactions.filter((t) => {
    const amountStr = String(Number(t.amount));
    const matchSearch =
      !search ||
      t.note?.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      (searchDigits.length > 0 && amountStr.includes(searchDigits));
    const matchCategory = categoryFilter === "all" || t.category === categoryFilter;
    const matchType = typeFilter === "all" || t.type === typeFilter;
    return matchSearch && matchCategory && matchType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages && totalPages >= 1) setPage(1);
  }, [totalPages, page]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, typeFilter]);

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon="transactions"
        title="Belum ada transaksi di periode ini"
        description="Tambah dari form di atas atau kirim lewat Telegram bot."
      />
    );
  }

  return (
    <>
      <div className="mb-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Total {filtered.length} Transaksi ditemukan
            </p>
          </div>
          <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-border/20 w-fit min-w-[240px]">
            {(["all", "income", "expense"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter(type)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  typeFilter === type
                    ? "bg-white dark:bg-slate-700 text-primary shadow-lg scale-[1.02]"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                {type === "all" ? "Semua" : type === "income" ? "Masuk" : "Keluar"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-8 relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari catatan, kategori, atau nominal..."
              className="w-full h-14 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl pl-12 pr-4 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
            />
          </div>
          <div className="sm:col-span-4">
            <SelectDropdown
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={categories.map((c) => ({ value: c, label: c }))}
              placeholder="Semua Kategori"
              className="w-full h-14"
            />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-none -mx-6 sm:-mx-10">
        <div className="inline-block min-w-full align-middle px-6 sm:px-10">
          <table className="min-w-[640px] w-full text-sm">
            <thead>
              <tr className="text-left border-b border-border/50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-slate-400">
                <th className="px-4 py-4 font-black text-[10px] uppercase tracking-[0.2em] first:rounded-tl-2xl">Tanggal</th>
                <th className="px-4 py-4 font-black text-[10px] uppercase tracking-[0.2em]">Tipe</th>
                <th className="px-4 py-4 font-black text-[10px] uppercase tracking-[0.2em]">Jumlah</th>
                <th className="hidden sm:table-cell px-4 py-4 font-black text-[10px] uppercase tracking-[0.2em]">Kategori</th>
                <th className="px-4 py-4 font-black text-[10px] uppercase tracking-[0.2em]">Catatan</th>
                <th className="px-4 py-4 font-black text-[10px] uppercase tracking-[0.2em] text-right last:rounded-tr-2xl">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 dark:divide-slate-700/50">
              {paginated.map((t) => (
                <tr key={t.id} className="group transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-4 font-bold text-[10px] text-slate-400 uppercase tracking-tighter whitespace-nowrap">
                     {formatDate(t.created_at)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`h-8 w-8 flex items-center justify-center rounded-lg font-bold text-xs ${t.type === "income" ? "bg-income/10 text-income" : "bg-expense/10 text-expense"}`}>
                        {t.type === "income" ? "↓" : "↑"}
                      </div>
                      <span className={`text-xs font-black uppercase tracking-widest ${t.type === "income" ? "text-income" : "text-expense"}`}>
                        {t.type === "income" ? "Masuk" : "Keluar"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 tabular-nums font-black text-sm">
                     <span className={t.type === "income" ? "text-income" : "text-expense"}>
                      {t.type === "income" ? "+" : "-"} {formatCurrency(Number(t.amount))}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-4 py-4">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border border-slate-200/50 dark:border-slate-700/50">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                     <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 italic max-w-[150px] truncate" title={t.note || ""}>
                       {t.note || "—"}
                     </p>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!t.id.startsWith("opt-") && (
                      <button
                        onClick={() => setEditing(t)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-primary/10 hover:text-primary text-slate-400 transition-all"
                        title="Edit"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      )}
                      <button
                        onClick={() => setDeleting(t)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-expense/10 hover:text-expense text-slate-400 transition-all"
                        title="Hapus"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {totalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border dark:border-slate-600 pt-4">
          <p className="text-sm text-muted dark:text-slate-400">
            Halaman {safePage} dari {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/80 dark:bg-slate-800/50 backdrop-blur-md border border-border dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:scale-95 active:scale-95"
              title="Halaman Sebelumnya"
              aria-label="Halaman Sebelumnya"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/80 dark:bg-slate-800/50 backdrop-blur-md border border-border dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:scale-95 active:scale-95"
              title="Halaman Selanjutnya"
              aria-label="Halaman Selanjutnya"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {filtered.length === 0 && (search || categoryFilter !== "all" || typeFilter !== "all") && (
        <p className="mt-3 text-center text-sm text-muted dark:text-slate-400">Tidak ada transaksi yang cocok dengan filter.</p>
      )}
      <EditTransactionModal
        transaction={editing}
        onClose={() => setEditing(null)}
        onSave={async (id, data) => { await onEdit(id, data); }}
      />
      <DeleteConfirmModal
        transaction={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const id = deleting.id;
          setDeleteLoading(true);
          try {
            await Promise.resolve(onDelete(id));
            showToast("Transaksi dihapus");
          } finally {
            setDeleting(null);
            setDeleteLoading(false);
          }
        }}
        loading={deleteLoading}
      />
    </>
  );
}
