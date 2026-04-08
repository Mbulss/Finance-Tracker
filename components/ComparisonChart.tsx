"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";
import type { Transaction } from "@/lib/types";
import { formatCurrency, getMonthKey } from "@/lib/utils";

interface ComparisonChartProps {
  transactions: Transaction[];
  currentMonth: string; // "YYYY-MM"
  showAmounts?: boolean;
}

export function ComparisonChart({ transactions, currentMonth, showAmounts = true }: ComparisonChartProps) {
  // 1. Calculate Previous Month Key
  const [year, month] = currentMonth.split("-").map(Number);
  const prevDate = new Date(year, month - 2, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const getStats = (mKey: string) => {
    const list = transactions.filter(t => getMonthKey(new Date(t.created_at)) === mKey);
    const income = list.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expense = list.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const label = new Date(mKey + "-01").toLocaleDateString("id-ID", { month: "long" });
    return { label, income, expense };
  };

  const currentStats = getStats(currentMonth);
  const prevStats = getStats(prevMonth);

  const data = [
    { name: prevStats.label, income: prevStats.income, expense: prevStats.expense, isCurrent: false },
    { name: currentStats.label + " (Sekarang)", income: currentStats.income, expense: currentStats.expense, isCurrent: true },
  ];

  const diffExpense = currentStats.expense - prevStats.expense;
  const percentChange = prevStats.expense > 0 ? (diffExpense / prevStats.expense) * 100 : 0;

  const isEmpty = currentStats.expense === 0 && prevStats.expense === 0 && currentStats.income === 0 && prevStats.income === 0;

  if (isEmpty) {
    return (
      <div className="flex h-[280px] flex-col items-center justify-center rounded-[2rem] bg-slate-50/50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-700 text-center p-6">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 text-slate-300 dark:text-slate-600">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Menunggu Data Bulan Depan</p>
        <p className="mt-2 text-[10px] font-bold text-slate-300 dark:text-slate-500 max-w-[200px]">Data perbandingan akan muncul otomatis setelah kamu punya riwayat transaksi minimal 2 bulan.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 gap-4 mb-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analisis Perbandingan</p>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
            {prevStats.expense === 0 ? (
               <span className="text-blue-500 font-black">Bulan Pertama Kamu 🚀</span>
            ) : percentChange > 0 ? (
               <span className="text-red-500 font-black">Naik {percentChange.toFixed(0)}% </span>
            ) : (
               <span className="text-emerald-500 font-black">Turun {Math.abs(percentChange).toFixed(0)}% </span>
            )}
            {prevStats.expense > 0 && "vs bulan lalu"}
          </h4>
        </div>
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center sm:justify-end gap-3 mb-1">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#059669]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pemasukan</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#dc2626]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pengeluaran</span>
                </div>
            </div>
            <div className="text-left sm:text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selisih Belanja</p>
                <p className={`text-sm font-black ${diffExpense > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {diffExpense > 0 ? '+' : ''}{showAmounts ? formatCurrency(diffExpense) : 'Rp ******'}
                </p>
            </div>
        </div>
      </div>

      <div className="h-[260px] min-h-[220px] sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 10, left: -25, bottom: 0 }} barCategoryGap="25%" barGap={8}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} strokeOpacity={0.15} />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 10, fontWeight: 'bold' }} 
              stroke="#94a3b8" 
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              tickFormatter={(v) => {
                if (!showAmounts) return "****";
                return (v >= 1e6 ? `${(v / 1e6).toFixed(0)}jt` : `${(v / 1e3).toFixed(0)}k`);
              }}
              tick={{ fontSize: 10, fontWeight: 'bold' }}
              stroke="#94a3b8"
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '1.25rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
              formatter={(value: number) => showAmounts ? formatCurrency(value) : "Rp ******"} 
            />
            <Bar dataKey="income" name="Pemasukan" fill="#059669" radius={[6, 6, 0, 0]}>
               {data.map((entry, index) => (
                  <Cell key={`cell-in-${index}`} fill={entry.isCurrent ? "#059669" : "#05966930"} />
               ))}
            </Bar>
            <Bar dataKey="expense" name="Pengeluaran" fill="#dc2626" radius={[6, 6, 0, 0]}>
               {data.map((entry, index) => (
                  <Cell key={`cell-ex-${index}`} fill={entry.isCurrent ? "#dc2626" : "#dc262630"} />
               ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
