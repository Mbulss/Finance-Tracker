"use client";

import { useState } from "react";
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

type TypeFilter = "all" | "income" | "expense";

export function TransactionTable({ transactions, onDelete, onEdit }: TransactionTableProps) {
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
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
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted dark:text-slate-400">
            Menampilkan <span className="font-medium text-slate-700 dark:text-slate-300">{filtered.length}</span> transaksi
          </span>
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-700 p-1 w-full sm:w-auto">
            {(["all", "income", "expense"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter(type)}
                className={`flex-1 sm:flex-none min-h-[44px] rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  typeFilter === type
                    ? "bg-card dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm"
                    : "text-muted dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                {type === "all" ? "Semua" : type === "income" ? "Pemasukan" : "Pengeluaran"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-0 flex-1 sm:min-w-[180px]">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari catatan, kategori, atau nominal..."
              className="w-full min-h-[48px] rounded-xl border border-border dark:border-slate-600 bg-card dark:bg-slate-800 dark:text-slate-100 py-3 pl-10 pr-4 text-base sm:text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <SelectDropdown
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categories.map((c) => ({ value: c, label: c }))}
            placeholder="Semua kategori"
            className="w-full sm:w-auto"
          />
        </div>
      </div>
      <div className="-mx-1 overflow-x-auto overflow-touch rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 shadow-card scrollbar-thin sm:mx-0" style={{ WebkitOverflowScrolling: "touch" }}>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/50 text-left text-muted dark:text-slate-400">
              <th className="px-3 py-3 font-medium sm:px-4 sm:py-3.5">Tanggal</th>
              <th className="px-3 py-3 font-medium sm:px-4 sm:py-3.5">Tipe</th>
              <th className="px-3 py-3 font-medium sm:px-4 sm:py-3.5">Jumlah</th>
              <th className="hidden font-medium sm:table-cell sm:px-4 sm:py-3.5">Kategori</th>
              <th className="px-3 py-3 font-medium sm:px-4 sm:py-3.5">Catatan</th>
              <th className="w-20 px-3 py-3 text-right font-medium sm:w-24 sm:px-4 sm:py-3.5">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-border dark:border-slate-600 last:border-0 transition hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                <td className="whitespace-nowrap px-3 py-3 text-slate-700 dark:text-slate-300 sm:px-4 sm:py-3.5">{formatDate(t.created_at)}</td>
                <td className="px-3 py-3 sm:px-4 sm:py-3.5">
                  <span className={`font-medium ${t.type === "income" ? "text-income" : "text-expense"}`}>
                    {t.type === "income" ? "Pemasukan" : "Pengeluaran"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-medium tabular-nums sm:px-4 sm:py-3.5">
                  <span className={t.type === "income" ? "text-income" : "text-expense"}>
                    {t.type === "income" ? "+" : "-"}
                    {formatCurrency(Number(t.amount))}
                  </span>
                </td>
                <td className="hidden text-slate-700 dark:text-slate-300 sm:table-cell sm:px-4 sm:py-3.5">{t.category}</td>
                <td className="max-w-[120px] truncate px-3 py-3 text-slate-600 dark:text-slate-400 sm:max-w-[200px] sm:px-4 sm:py-3.5">{t.note || "—"}</td>
                <td className="px-2 py-3 text-right sm:px-4 sm:py-3.5">
                  <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                    {!t.id.startsWith("opt-") && (
                    <button
                      type="button"
                      onClick={() => setEditing(t)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-600 dark:text-slate-400 dark:hover:text-primary transition active:scale-95"
                      title="Edit"
                    >
                      <svg className="h-5 w-5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleting(t)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted hover:bg-red-50 hover:text-expense dark:hover:bg-red-900/30 dark:text-slate-400 dark:hover:text-expense transition active:scale-95"
                      title="Hapus"
                    >
                      <svg className="h-5 w-5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (search || categoryFilter !== "all" || typeFilter !== "all") && (
        <p className="mt-3 text-center text-sm text-muted dark:text-slate-400">Tidak ada transaksi yang cocok dengan filter.</p>
      )}
      <EditTransactionModal
        transaction={editing}
        onClose={() => setEditing(null)}
        onSave={(id, data) => { onEdit(id, data); setEditing(null); }}
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
