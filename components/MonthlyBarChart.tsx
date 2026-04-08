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
} from "recharts";
import type { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface MonthlyBarChartProps {
  transactions: Transaction[];
  /** Jika true, tampilkan semua bulan (untuk mode "Semua waktu"). Jika false, 6 bulan terakhir. */
  showAllMonths?: boolean;
  showAmounts?: boolean;
}

export function MonthlyBarChart({ transactions, showAllMonths = false, showAmounts = true }: MonthlyBarChartProps) {
  const byMonth = transactions.reduce<
    Record<string, { month: string; income: number; expense: number }>
  >((acc, t) => {
    const d = new Date(t.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
    if (!acc[key]) acc[key] = { month: label, income: 0, expense: 0 };
    if (t.type === "income") acc[key].income += Number(t.amount);
    else acc[key].expense += Number(t.amount);
    return acc;
  }, {});

  const sorted = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b));
  const data = showAllMonths ? sorted.map(([, v]) => v) : sorted.slice(-6).map(([, v]) => v);

  if (data.length === 0) {
    return (
      <div className="flex h-[280px] flex-col items-center justify-center rounded-[2rem] bg-slate-50/50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-700 text-center p-6">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 text-slate-300 dark:text-slate-600">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Belum ada data bulanan</p>
        <p className="mt-2 text-[10px] font-bold text-slate-300 dark:text-slate-500 max-w-[160px]">Statistik bulanan akan muncul secara otomatis.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-end gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#059669]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pemasukan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#dc2626]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pengeluaran</span>
        </div>
      </div>
      <div className="h-[220px] sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap="25%" barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} strokeOpacity={0.15} />
            <XAxis 
              dataKey="month" 
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
            <Bar dataKey="income" fill="#059669" name="Pemasukan" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expense" fill="#dc2626" name="Pengeluaran" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
