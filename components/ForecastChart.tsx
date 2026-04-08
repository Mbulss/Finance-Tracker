"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList
} from "recharts";
import type { Transaction } from "@/lib/types";
import { formatCurrency, getMonthKey } from "@/lib/utils";

interface ForecastChartProps {
  transactions: Transaction[];
  currentMonth: string; // "YYYY-MM"
  showAmounts?: boolean;
}

export function ForecastChart({ transactions, currentMonth, showAmounts = true }: ForecastChartProps) {
  const [year, month] = currentMonth.split("-").map(Number);
  
  // 1. Calculate Actual Spend so far this month
  const currentMonthTransactions = transactions.filter(t => getMonthKey(new Date(t.created_at)) === currentMonth && t.type === "expense");
  const actualSpend = currentMonthTransactions.reduce((s, t) => s + Number(t.amount || 0), 0);

  // 2. Calculate Daily Average
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
  
  const daysInMonth = new Date(year, month, 0).getDate();
  const elapsedDays = isCurrentMonth ? today.getDate() : daysInMonth;
  const remainingDays = daysInMonth - elapsedDays;
  
  const dailyAvg = actualSpend / (elapsedDays || 1);
  const projectedExtra = dailyAvg * remainingDays;
  const finalProjected = actualSpend + projectedExtra;

  const data = [
    { name: "Sudah Terpakai", amount: actualSpend, fill: "#3b82f6", isLabel: true },
    { name: "Prediksi Akhir Bulan", amount: finalProjected, fill: "#3b82f640", isLabel: true }
  ];

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 gap-4 mb-8">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prakiraan Cike AI</p>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Daily Target: {showAmounts ? formatCurrency(dailyAvg) : "Rp ******"}
          </h4>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Prediksi</p>
          <p className="text-sm font-black text-primary">
            {showAmounts ? formatCurrency(finalProjected) : "Rp ******"}
          </p>
        </div>
      </div>

      <div className="h-[200px] sm:h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 60, left: 15, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" strokeOpacity={0.15} />
            <XAxis type="number" hide />
            <YAxis 
               type="category" 
               dataKey="name" 
               hide 
            />
            <Tooltip 
               cursor={{ fill: 'transparent' }}
               contentStyle={{ borderRadius: '1.25rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
               formatter={(val: number) => showAmounts ? formatCurrency(val) : "Rp ******"}
            />
            <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={32}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <LabelList 
                dataKey="name" 
                position="top" 
                offset={8}
                style={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              />
              <LabelList 
                dataKey="amount" 
                position="right" 
                formatter={(val: number) => showAmounts ? (val >= 1e6 ? `${(val/1e6).toFixed(1)}jt` : `${(val/1e3).toFixed(0)}k`) : "****"} 
                offset={10}
                style={{ fontSize: 11, fontWeight: 'black', fill: '#3b82f6' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 p-3 rounded-[1.25rem] bg-blue-500/5 border border-blue-500/10 backdrop-blur-sm">
        <div className="flex gap-3 items-center">
           <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
           </div>
           <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 leading-snug">
             {remainingDays > 0 ? (
               <>Estimasi: Butuh <span className="text-blue-500 font-black">Rp {showAmounts ? formatCurrency(projectedExtra).replace('Rp', '') : '******'}</span> lagi untuk sisa <span className="text-blue-500 font-black">{remainingDays} hari</span>. Tetap waspada!</>
             ) : (
               "Bulan ini selesai! Siapkan strategimu untuk bulan depan."
             )}
           </p>
        </div>
      </div>
    </div>
  );
}
