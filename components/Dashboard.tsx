"use client";

import { useState, useEffect, useOptimistic, useTransition, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
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
import { SpendingInsights } from "./SpendingInsights";
import { ImportCSV } from "./ImportCSV";

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
  const [savingsEntries, setSavingsEntries] = useState<{ amount: number; type: "deposit" | "withdraw"; created_at: string }[]>([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [syncingEmail, setSyncingEmail] = useState(false);
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
    
    // Fetch savings for Net Worth
    const { data: savingsData } = await supabase
      .from("savings_entries")
      .select("amount, type, created_at")
      .eq("user_id", userId);
    
    if (savingsData) {
      const total = savingsData.reduce((acc, curr) => {
        return acc + (curr.type === "deposit" ? Number(curr.amount) : -Number(curr.amount));
      }, 0);
      setTotalSavings(total);
      setSavingsEntries(savingsData as any);
    }
    
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    fetchTransactions();

    // Auto-sync email in background on mount
    const checkAndSyncEmail = async () => {
      try {
        const integRes = await fetch("/api/email/integration");
        const integJson = await integRes.json();
        
        if (integJson.integrated) {
          setSyncingEmail(true);
          // Trigger silent sync
          await fetch("/api/email/sync/manual", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}), // Backend will use refresh token
          });
        }
      } catch (err) {
        console.error("Auto-sync failed", err);
      } finally {
        setSyncingEmail(false);
        fetchTransactions(); // Refresh after sync
      }
    };

    checkAndSyncEmail();

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
  
  // Saldo kumulatif untuk peringatan saldo negatif
  const cumulativeTransactions = periodType === "all"
    ? transactions
    : transactions.filter((t) => getMonthKey(new Date(t.created_at)) <= monthFilter);
  const balance = cumulativeTransactions.reduce((acc, t) => acc + (t.type === "income" ? (Number(t.amount) || 0) : -(Number(t.amount) || 0)), 0);

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
    <>
      <div className="relative mx-auto max-w-6xl space-y-10 pb-20">
      {/* Decorative Background Elements - Optimized for scroll performance */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-transparent transform-gpu" aria-hidden>
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/10 dark:bg-primary/5 rounded-full blur-[80px] animate-pulse transform-gpu" />
        <div className="absolute top-[20%] -left-[10%] w-[30%] h-[30%] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-[70px] transform-gpu" />
        <div className="absolute bottom-[10%] right-[20%] w-[25%] h-[25%] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[60px] transform-gpu" />
      </div>

      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between animate-fade-in-up">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">{greeting}</span>
            {syncingEmail && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest animate-fade-in">
                <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Syncing Gmail...
              </span>
            )}
            {liveUpdated && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest animate-fade-in">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Updated
              </span>
            )}
          </div>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 dark:text-white uppercase transform-gpu">
            Ringkasan <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-sky-400 will-change-transform">Keuangan</span>
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest transform-gpu">
            Pantau arus kas dan kesehatan finansialmu
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-border/50 dark:border-slate-700/50 shadow-sm w-full sm:w-[220px] h-[52px]">
            <button
              type="button"
              onClick={() => setPeriodType("all")}
              className={`flex items-center justify-center px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                periodType === "all"
                  ? "bg-primary text-white shadow-lg shadow-primary/25"
                  : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setPeriodType("month")}
              className={`flex items-center justify-center px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                periodType === "month"
                  ? "bg-primary text-white shadow-lg shadow-primary/25"
                  : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              }`}
            >
              Bulanan
            </button>
          </div>
          {periodType === "month" && (
            <div className="w-full sm:w-auto p-1 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-border/50 dark:border-slate-700/50 shadow-sm h-[52px] flex items-center">
              <MonthPicker value={monthFilter} onChange={setMonthFilter} className="border-none bg-transparent shadow-none" />
            </div>
          )}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredByMonth.length === 0}
            className="w-full sm:w-auto h-[52px] px-6 rounded-2xl flex items-center justify-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-white border border-border/50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="w-full sm:w-auto h-[52px] px-6 rounded-2xl flex items-center justify-center gap-2 bg-primary text-white hover:bg-primary-hover transition-all font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8L12 3m0 0L7.5 7.5M12 3v13.5" />
            </svg>
            Impor CSV
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
        <>
          <div className="animate-fade-in-up transform-gpu backface-visibility-hidden" style={{ animationDelay: "0.1s" }}>
            <SummaryCards
              transactions={transactions}
              savingsEntries={savingsEntries}
              monthFilter={periodType === "all" ? "all" : monthFilter}
            />
          </div>
          
          {/* New Insights Section */}
          <div className="animate-fade-in-up transform-gpu backface-visibility-hidden" style={{ animationDelay: "0.12s" }}>
            <SpendingInsights 
              transactions={transactions} 
              monthFilter={periodType === "all" ? "all" : monthFilter} 
            />
          </div>
        </>
      )}

      {!loading && balance < 0 && filteredByMonth.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <span className="font-medium">Saldo negatif</span> — cek grafik kategori untuk lihat pengeluaran terbesar.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="group relative overflow-hidden rounded-[2.5rem] border border-border/50 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-8 shadow-2xl transition-all hover:shadow-primary/5 animate-fade-in-up transform-gpu backface-visibility-hidden" style={{ animationDelay: "0.15s" }}>
          <div className="absolute -right-24 -top-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors" />
          <h2 className="mb-6 text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Tambah Transaksi</h2>
          <AddFromPhoto onParsed={setPrefillFromPhoto} />
          <div className="mt-8">
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

        <section className="group relative overflow-hidden flex flex-col rounded-[2.5rem] border border-border/50 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-8 shadow-2xl transition-all hover:shadow-primary/5 animate-fade-in-up transform-gpu backface-visibility-hidden" style={{ animationDelay: "0.2s" }}>
          <div className="absolute -right-24 -bottom-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Pengeluaran Kategori</h2>
            <p className="mb-6 text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{periodLabel}</p>
          </div>
          <div className="flex flex-1 items-start justify-center">
            <div className="w-full mt-4">
              <ExpensePieChart transactions={filteredByMonth} />
            </div>
          </div>
        </section>
      </div>

      <section className="group relative overflow-hidden rounded-[2.5rem] border border-border/50 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-8 shadow-2xl transition-all hover:shadow-primary/5 animate-fade-in-up transform-gpu backface-visibility-hidden" style={{ animationDelay: "0.25s" }}>
        <div className="absolute -left-24 -top-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Tren Pemasukan vs Pengeluaran</h2>
        <p className="mb-8 text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
          {periodType === "all" ? "Seluruh data bulanan" : "6 bulan terakhir"}
        </p>
        <MonthlyBarChart
          transactions={transactions}
          showAllMonths={periodType === "all"}
        />
      </section>

      <section className="group relative rounded-[2.5rem] border border-border/50 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-8 shadow-2xl transition-all hover:shadow-primary/5 animate-fade-in-up transform-gpu backface-visibility-hidden" style={{ animationDelay: "0.3s" }}>
        <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] pointer-events-none">
          <div className="absolute -right-24 -top-24 w-64 h-64 bg-slate-500/5 rounded-full blur-3xl" />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter relative z-10">Riwayat Transaksi</h2>
        <p className="mb-8 text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 relative z-10">{periodLabel}</p>
        <TransactionTable
          transactions={displayedForTable}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />

      </section>

      </div>

      {/* Global Import Modal */}
      {showImport && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 cursor-default">
          <div
            className="absolute inset-0 bg-slate-900/60 dark:bg-black/90 backdrop-blur-md animate-fade-in"
            onClick={() => setShowImport(false)}
            aria-hidden
          />
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] border border-white/20 dark:border-slate-700/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
             {/* Glow effects */}
             <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-primary/20 blur-[80px]" aria-hidden />
             <div className="absolute -left-24 -bottom-24 h-48 w-48 rounded-full bg-primary/10 blur-[60px]" aria-hidden />

             <div className="relative flex items-center justify-between mb-8">
                <div>
                   <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Impor Data</h3>
                   <p className="mt-0.5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Upload file CSV hasil export kamu</p>
                </div>
                <button 
                  onClick={() => setShowImport(false)} 
                   className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all shadow-soft"
                >
                   <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
             <ImportCSV
                userId={userId}
                onSuccess={() => {
                   setShowImport(false);
                   fetchTransactions();
                }}
             />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
