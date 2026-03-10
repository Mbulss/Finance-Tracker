"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Transaction } from "@/lib/types";
import { getMonthKey } from "@/lib/utils";
import { exportTransactionsToCSV } from "@/lib/export-csv";
import { SummaryCards } from "./SummaryCards";
import { AddTransactionForm, type PrefillFromPhoto } from "./AddTransactionForm";
import { AddFromPhoto } from "./AddFromPhoto";
import { TransactionTable } from "./TransactionTable";
import { ExpensePieChart } from "./ExpensePieChart";
import { MonthlyBarChart } from "./MonthlyBarChart";
import { MonthPicker } from "./MonthPicker";
import { useToast } from "./ToastContext";
import { SkeletonCard, SkeletonTable } from "./Skeleton";

interface DashboardProps {
  userId: string;
}

export function Dashboard({ userId }: DashboardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodType, setPeriodType] = useState<"all" | "month">("month");
  const [monthFilter, setMonthFilter] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [liveUpdated, setLiveUpdated] = useState(false);
  const [optimisticTransactions, setOptimisticTransactions] = useState<Transaction[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const [prefillFromPhoto, setPrefillFromPhoto] = useState<PrefillFromPhoto | null>(null);
  const liveUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();
  const { showToast } = useToast();

  const fetchTransactions = useCallback(async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error) setTransactions(data ?? []);
    setOptimisticTransactions([]);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    fetchTransactions();

    const channel = supabase
      .channel(`transactions:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` },
        () => {
          fetchTransactions();
          if (liveUpdateTimeoutRef.current) clearTimeout(liveUpdateTimeoutRef.current);
          setLiveUpdated(true);
          liveUpdateTimeoutRef.current = setTimeout(() => {
            setLiveUpdated(false);
            liveUpdateTimeoutRef.current = null;
          }, 3000);
        }
      )
      .subscribe();

    return () => {
      if (liveUpdateTimeoutRef.current) clearTimeout(liveUpdateTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [fetchTransactions, supabase, userId]);

  const filteredByMonth =
    periodType === "all"
      ? transactions
      : transactions.filter((t) => getMonthKey(new Date(t.created_at)) === monthFilter);

  const optimisticInPeriod =
    periodType === "all"
      ? optimisticTransactions
      : optimisticTransactions.filter((t) => getMonthKey(new Date(t.created_at)) === monthFilter);
  const displayedForTable = [...filteredByMonth, ...optimisticInPeriod]
    .filter((t) => !pendingDeleteIds.has(t.id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const income = filteredByMonth.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = filteredByMonth.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;

  const handleDelete = async (id: string) => {
    setPendingDeleteIds((prev) => new Set(prev).add(id));
    const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", userId);
    if (error) {
      setPendingDeleteIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchTransactions();
      showToast("Gagal menghapus transaksi", "error");
      return;
    }
    await fetchTransactions();
    setPendingDeleteIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleEdit = async (
    id: string,
    data: { type: "income" | "expense"; amount: number; category: string; note: string }
  ) => {
    const { data: updatedRows, error } = await supabase
      .from("transactions")
      .update({
        type: data.type,
        amount: Number(data.amount),
        category: data.category,
        note: data.note ?? "",
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id");
    if (error) {
      showToast(error.message ?? "Gagal menyimpan perubahan transaksi", "error");
      throw error;
    }
    if (!updatedRows?.length) {
      showToast("Transaksi tidak ditemukan atau tidak bisa diubah.", "error");
      throw new Error("No rows updated");
    }
    await fetchTransactions();
    showToast("Transaksi diperbarui");
  };

  const handleExportCSV = () => {
    exportTransactionsToCSV(
      filteredByMonth,
      periodType === "all" ? "transaksi-semua.csv" : `transaksi-${monthFilter}.csv`
    );
  };

  const periodLabel =
    periodType === "all"
      ? "Semua waktu"
      : (() => {
          const [y, m] = monthFilter.split("-").map(Number);
          return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
        })();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Selamat pagi" : hour < 18 ? "Selamat siang" : "Selamat malam";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between animate-fade-in-up">
        <div className="flex flex-wrap items-start gap-3 min-w-0">
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary dark:text-sky-400">{greeting} 👋</p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 sm:text-3xl">Dashboard</h1>
            <p className="mt-1 text-sm text-muted dark:text-slate-400">Ringkasan keuangan kamu</p>
          </div>
          {liveUpdated && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 dark:bg-primary/25 px-3 py-2 text-xs font-medium text-primary dark:text-sky-400 animate-fade-in shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-primary dark:bg-sky-400" />
              Data diperbarui
            </span>
          )}
        </div>
        <div className="flex flex-col gap-3 w-full sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-700 p-1 shadow-sm w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setPeriodType("all")}
              className={`flex-1 sm:flex-none min-h-[44px] rounded-lg px-4 py-3 sm:py-2.5 text-sm font-medium transition ${
                periodType === "all"
                  ? "bg-card dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow soft"
                  : "text-muted dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              Semua waktu
            </button>
            <button
              type="button"
              onClick={() => setPeriodType("month")}
              className={`flex-1 sm:flex-none min-h-[44px] rounded-lg px-4 py-3 sm:py-2.5 text-sm font-medium transition ${
                periodType === "month"
                  ? "bg-card dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow soft"
                  : "text-muted dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              Per bulan
            </button>
          </div>
          {periodType === "month" && (
            <div className="w-full sm:w-auto">
              <MonthPicker value={monthFilter} onChange={setMonthFilter} />
            </div>
          )}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredByMonth.length === 0}
            className="min-h-[44px] w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-border dark:border-slate-600 bg-card dark:bg-slate-800 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-card disabled:opacity-50 active:scale-[0.98]"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </header>

      {loading ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 p-4 sm:p-6">
            <div className="h-5 w-48 rounded-lg bg-slate-200 dark:bg-slate-600 animate-pulse mb-4" />
            <SkeletonTable rows={6} />
          </div>
        </>
      ) : (
        <div className="animate-fade-in-up" style={{ animationDelay: "0.1s", opacity: 0, animationFillMode: "forwards" }}>
          <SummaryCards
            transactions={transactions}
            monthFilter={periodType === "all" ? "all" : monthFilter}
          />
        </div>
      )}

      {!loading && balance < 0 && filteredByMonth.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <span className="font-medium">Saldo negatif</span> — cek grafik kategori untuk lihat pengeluaran terbesar.
        </div>
      )}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 p-4 sm:p-6 shadow-card transition-shadow hover:shadow-card-hover dark:hover:shadow-card-hover animate-fade-in-up" style={{ animationDelay: "0.15s", opacity: 0, animationFillMode: "forwards" }}>
          <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">Tambah Transaksi</h2>
          <AddFromPhoto onParsed={setPrefillFromPhoto} />
          <div className="mt-4">
            <AddTransactionForm
              userId={userId}
              onSuccess={fetchTransactions}
              onOptimisticAdd={(t) => setOptimisticTransactions((prev) => [...prev, t])}
              onOptimisticFail={(tempId) => {
                setOptimisticTransactions((prev) => prev.filter((x) => x.id !== tempId));
                showToast("Gagal menyimpan transaksi", "error");
              }}
              prefill={prefillFromPhoto}
              onPrefillApplied={() => setPrefillFromPhoto(null)}
            />
          </div>
        </section>
        <section className="flex flex-col rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 p-4 sm:p-6 shadow-card transition-shadow hover:shadow-card-hover dark:hover:shadow-card-hover animate-fade-in-up" style={{ animationDelay: "0.2s", opacity: 0, animationFillMode: "forwards" }}>
          <h2 className="mb-2 text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">Pengeluaran per Kategori</h2>
          <p className="mb-4 text-sm text-muted dark:text-slate-400">{periodLabel}</p>
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full">
              <ExpensePieChart transactions={filteredByMonth} />
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 p-4 sm:p-6 shadow-card transition-shadow hover:shadow-card-hover dark:hover:shadow-card-hover animate-fade-in-up" style={{ animationDelay: "0.25s", opacity: 0, animationFillMode: "forwards" }}>
        <h2 className="mb-2 text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">Pemasukan vs Pengeluaran</h2>
        <p className="mb-4 text-sm text-muted dark:text-slate-400">
          {periodType === "all" ? "Semua waktu (per bulan)" : "6 bulan terakhir"}
        </p>
        <MonthlyBarChart
          transactions={transactions}
          showAllMonths={periodType === "all"}
        />
      </section>

      <section className="rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 p-4 sm:p-6 overflow-hidden shadow-card transition-shadow hover:shadow-card-hover dark:hover:shadow-card-hover animate-fade-in-up" style={{ animationDelay: "0.3s", opacity: 0, animationFillMode: "forwards" }}>
        <h2 className="mb-2 text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">Daftar Transaksi</h2>
        <p className="mb-4 text-sm text-muted dark:text-slate-400">{periodLabel}</p>
        <TransactionTable
          transactions={displayedForTable}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      </section>
    </div>
  );
}
