"use client";

import type { Transaction } from "@/lib/types";
import { formatCurrency, getMonthKey } from "@/lib/utils";
import { CountUp } from "./CountUp";

interface SummaryCardsProps {
  transactions: Transaction[];
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

export function SummaryCards({ transactions, monthFilter }: SummaryCardsProps) {
  const isAllTime = monthFilter === "all";
  const current = isAllTime
    ? transactions
    : transactions.filter((t) => getMonthKey(new Date(t.created_at)) === monthFilter);
  const income = sumByType(current, "income");
  const expense = sumByType(current, "expense");
  const balance = income - expense;

  const prevKey = isAllTime ? "" : getPrevMonthKey(monthFilter);
  const prevTransactions = isAllTime
    ? []
    : transactions.filter((t) => getMonthKey(new Date(t.created_at)) === prevKey);
  const prevIncome = sumByType(prevTransactions, "income");
  const prevExpense = sumByType(prevTransactions, "expense");
  const incomeDiff = prevIncome ? ((income - prevIncome) / prevIncome) * 100 : 0;
  const expenseDiff = prevExpense ? ((expense - prevExpense) / prevExpense) * 100 : 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <div className="relative overflow-hidden rounded-2xl border border-border dark:border-slate-700 bg-gradient-to-br from-card to-primary/5 dark:from-slate-800 dark:to-primary/10 p-4 shadow-card sm:p-6 transition-shadow hover:shadow-card-hover dark:hover:shadow-card-hover hover:shadow-glow dark:hover:shadow-glow-dark">
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-primary/10 dark:bg-primary/20 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted dark:text-slate-400">Total Saldo</p>
            <p className={`mt-1 text-xl font-bold font-mono tabular-nums sm:text-2xl animate-count-up ${balance >= 0 ? "text-slate-800 dark:text-slate-100" : "text-expense"}`}>
              <CountUp value={balance} formatter={(n) => formatCurrency(n)} />
            </p>
            <p className="mt-1 text-xs text-muted dark:text-slate-400">
              {isAllTime ? "Semua waktu" : "Bulan ini"}
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 dark:bg-primary/25 sm:h-12 sm:w-12 ring-2 ring-primary/20 dark:ring-primary/30">
            <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 p-4 shadow-card sm:p-6 transition-shadow hover:shadow-card-hover dark:hover:shadow-card-hover">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted dark:text-slate-400">Pemasukan</p>
            <p className="mt-1 text-xl font-bold font-mono tabular-nums text-income sm:text-2xl">
            <CountUp value={income} formatter={(n) => formatCurrency(n)} />
          </p>
            {prevIncome > 0 && (
              <p className={`mt-1 text-xs ${incomeDiff >= 0 ? "text-income" : "text-expense"}`}>
                {incomeDiff >= 0 ? "↑" : "↓"} {Math.abs(incomeDiff).toFixed(0)}% vs bulan lalu
              </p>
            )}
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-income/10 sm:h-12 sm:w-12">
            <svg className="h-6 w-6 text-income" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 p-4 shadow-card sm:p-6 transition-shadow hover:shadow-card-hover dark:hover:shadow-card-hover">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted dark:text-slate-400">Pengeluaran</p>
            <p className="mt-1 text-xl font-bold font-mono tabular-nums text-expense sm:text-2xl">
            <CountUp value={expense} formatter={(n) => formatCurrency(n)} />
          </p>
            {prevExpense > 0 && (
              <p className={`mt-1 text-xs ${expenseDiff <= 0 ? "text-income" : "text-expense"}`}>
                {expenseDiff <= 0 ? "↓" : "↑"} {Math.abs(expenseDiff).toFixed(0)}% vs bulan lalu
              </p>
            )}
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-expense/10 sm:h-12 sm:w-12">
            <svg className="h-6 w-6 text-expense" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
