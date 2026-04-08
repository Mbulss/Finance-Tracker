"use client";

import { useMemo } from "react";
import type { Transaction } from "@/lib/types";
import { formatCurrency, getMonthKey } from "@/lib/utils";

interface SpendingInsightsProps {
  transactions: Transaction[];
  monthFilter: string;
  showAmounts?: boolean;
}

export function SpendingInsights({ transactions, monthFilter, showAmounts = true }: SpendingInsightsProps) {
  const isAllTime = monthFilter === "all";
  
  const insights = useMemo(() => {
    if (isAllTime) return null;

    const currentMonthTransactions = transactions.filter(t => getMonthKey(new Date(t.created_at)) === monthFilter);
    const prevMonth = (() => {
      const [y, m] = monthFilter.split("-").map(Number);
      const d = new Date(y, m - 2, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    })();
    const prevMonthTransactions = transactions.filter(t => getMonthKey(new Date(t.created_at)) === prevMonth);

    const income = currentMonthTransactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expense = currentMonthTransactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);



    // Top Category Change
    const getCategoryTotals = (txs: Transaction[]) => {
      const totals: Record<string, number> = {};
      txs.filter(t => t.type === "expense").forEach(t => {
        totals[t.category] = (totals[t.category] ?? 0) + Number(t.amount);
      });
      return totals;
    };

    const currentTotals = getCategoryTotals(currentMonthTransactions);
    const prevTotals = getCategoryTotals(prevMonthTransactions);

    const topCategory = Object.entries(currentTotals).sort((a, b) => b[1] - a[1])[0];
    let topCategoryInsight = null;
    if (topCategory) {
      const [cat, amt] = topCategory;
      const prevAmt = prevTotals[cat] ?? 0;
      const pctChange = prevAmt > 0 ? ((amt - prevAmt) / prevAmt) * 100 : 100;
      topCategoryInsight = { category: cat, amount: amt, pctChange };
    }

    return { topCategoryInsight, income, expense };
  }, [transactions, monthFilter, isAllTime]);

  if (!insights) return null;

  return (
    <div className="grid grid-cols-1 gap-6 pb-6">


      <div className="group relative overflow-hidden rounded-[2.5rem] border border-border/50 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-8 shadow-2xl transition-all">
         <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
         <div className="relative">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Pengeluaran Terbesar</h3>
            {insights.topCategoryInsight ? (
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{insights.topCategoryInsight.category}</p>
                  <p className={`text-xs font-black uppercase tracking-widest ${insights.topCategoryInsight.pctChange > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                    {insights.topCategoryInsight.pctChange > 0 ? "↑" : "↓"} {Math.abs(insights.topCategoryInsight.pctChange).toFixed(0)}% <span className="text-[8px] text-slate-400 ml-1 opacity-60">vs bln lalu</span>
                  </p>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-1000" 
                    style={{ width: `${Math.min(100, (insights.topCategoryInsight.amount / insights.expense) * 100)}%` }} 
                  />
                </div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em]">
                  Total: <span className="text-slate-800 dark:text-white">
                    {showAmounts ? formatCurrency(insights.topCategoryInsight.amount) : "Rp ******"}
                  </span> bulan ini
                </p>
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Belum ada data pengeluaran</p>
            )}
         </div>
      </div>
    </div>
  );
}
