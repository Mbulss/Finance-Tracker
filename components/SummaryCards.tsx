"use client";

import type { Transaction } from "@/lib/types";
import { formatCurrency, getMonthKey } from "@/lib/utils";
import { CountUp } from "./CountUp";

interface SummaryCardsProps {
  transactions: Transaction[];
  totalSavings: number;
  monthFilter: string;
}

function sumByType(transactions: Transaction[], type: "income" | "expense") {
  return transactions
    .filter((t) => t.type === type)
    .reduce((s, t) => s + Number(t.amount), 0);
}

function getPrevMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function SummaryCards({ transactions, totalSavings, monthFilter }: SummaryCardsProps) {
  const isAllTime = monthFilter === "all";
  const current = isAllTime
    ? transactions
    : transactions.filter((t) => getMonthKey(new Date(t.created_at)) === monthFilter);
  const income = sumByType(current, "income");
  const expense = sumByType(current, "expense");
  const balance = income - expense;
  const netWorth = balance + totalSavings;

  const prevKey = isAllTime ? "" : getPrevMonthKey(monthFilter);
  const prevTransactions = isAllTime
    ? []
    : transactions.filter((t) => getMonthKey(new Date(t.created_at)) === prevKey);
  const prevIncome = sumByType(prevTransactions, "income");
  const prevExpense = sumByType(prevTransactions, "expense");
  const incomeDiff = prevIncome ? ((income - prevIncome) / prevIncome) * 100 : 0;
  const expenseDiff = prevExpense ? ((expense - prevExpense) / prevExpense) * 100 : 0;

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Kekayaan Bersih */}
      <div className="group relative overflow-hidden rounded-[2.5rem] border border-border/50 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-8 shadow-2xl transition-all hover:scale-[1.02] hover:shadow-primary/20">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl group-hover:bg-primary/20 transition-colors" />
        <div className="relative space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Kekayaan Bersih</span>
            <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/30">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white tabular-nums">
              <CountUp value={netWorth} formatter={(n) => formatCurrency(n)} />
            </h3>
            <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saldo + Celengan</p>
          </div>
        </div>
      </div>

      {/* 2. Saldo */}
      <div className="group relative overflow-hidden rounded-[2.5rem] border border-border/50 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-8 shadow-2xl transition-all hover:scale-[1.02] hover:shadow-indigo-500/20">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl group-hover:bg-indigo-500/20 transition-colors" />
        <div className="relative space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Saldo</span>
            <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white tabular-nums">
              <CountUp value={balance} formatter={(n) => formatCurrency(n)} />
            </h3>
            <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pemasukan - Pengeluaran</p>
          </div>
        </div>
      </div>

      {/* 3. Pemasukan */}
      <div className="group relative overflow-hidden rounded-[2.5rem] border border-border/50 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-8 shadow-2xl transition-all hover:scale-[1.02] hover:shadow-income/20">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-income/5 blur-3xl group-hover:bg-income/10 transition-colors" />
        <div className="relative space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-income">Pemasukan</span>
            <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-income/10 text-income">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white tabular-nums">
              <CountUp value={income} formatter={(n) => formatCurrency(n)} />
            </h3>
            {prevIncome > 0 && (
              <p className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${incomeDiff >= 0 ? "text-income" : "text-expense"}`}>
                 {incomeDiff >= 0 ? "↑" : "↓"} {Math.abs(incomeDiff).toFixed(0)}% vs bln lalu
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 4. Pengeluaran */}
      <div className="group relative overflow-hidden rounded-[2.5rem] border border-border/50 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-8 shadow-2xl transition-all hover:scale-[1.02] hover:shadow-expense/20">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-expense/5 blur-3xl group-hover:bg-expense/10 transition-colors" />
        <div className="relative space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-expense">Pengeluaran</span>
            <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-expense/10 text-expense">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white tabular-nums">
              <CountUp value={expense} formatter={(n) => formatCurrency(n)} />
            </h3>
            {prevExpense > 0 && (
              <p className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${expenseDiff <= 0 ? "text-income" : "text-expense"}`}>
                {expenseDiff <= 0 ? "↓" : "↑"} {Math.abs(expenseDiff).toFixed(0)}% vs bln lalu
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
