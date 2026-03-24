"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface ExpensePieChartProps {
  transactions: Transaction[];
}

const COLORS = [
  "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#14b8a6", "#ec4899", "#f97316", "#6366f1", "#84cc16",
];

function useIsMobile(breakpoint = 640) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return mobile;
}

export function ExpensePieChart({ transactions }: ExpensePieChartProps) {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  const expenseOnly = transactions.filter((t) => t.type === "expense");
  const byCategory = expenseOnly.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + Number(t.amount);
    return acc;
  }, {});
  
  const data = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .filter(item => item.value > 0) // Filter out 0 values
    .sort((a, b) => b.value - a.value);

  const totalExpense = data.reduce((acc, curr) => acc + curr.value, 0);

  if (data.length === 0) {
    return (
      <div className="flex h-[260px] flex-col items-center justify-center rounded-[2rem] bg-slate-50/50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-700 text-center p-6">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 text-slate-300 dark:text-slate-600">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          </svg>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Belum ada pengeluaran</p>
        <p className="mt-2 text-[10px] font-bold text-slate-300 dark:text-slate-500 max-w-[160px]">Tambahkan transaksi untuk melihat distribusi kategori.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="relative h-[240px] w-full shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={isMobile ? "60%" : "65%"}
              outerRadius={isMobile ? "80%" : "90%"}
              paddingAngle={4}
              dataKey="value"
              nameKey="name"
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} className="focus:outline-none" />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                fontSize: '11px',
                fontWeight: '900',
                textTransform: 'uppercase'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Total</span>
          <span className="text-sm font-black text-slate-900 dark:text-white mt-1">
             {totalExpense >= 1000000 ? `${(totalExpense / 1000000).toFixed(1)}jt` : formatCurrency(totalExpense).replace("Rp ", "")}
          </span>
        </div>
      </div>

      {/* Category Breakdown List */}
      <div className="mt-8 space-y-4 flex-1">
        <div className="h-px bg-slate-100 dark:bg-slate-800/50 w-full mb-6" />
        
        {data.slice(0, 5).map((item, i) => {
          const pct = ((item.value / totalExpense) * 100);
          return (
            <div key={item.name} className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-1">
                <div className="flex items-center gap-2">
                   <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                   <span className="text-slate-600 dark:text-slate-300">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{formatCurrency(item.value)}</span>
                  <span className="text-primary">{pct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800/50 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${pct}%`,
                    backgroundColor: COLORS[i % COLORS.length]
                  }}
                />
              </div>
            </div>
          );
        })}

        {data.length > 5 && (() => {
          const others = data.slice(5);
          const othersTotal = others.reduce((s, x) => s + x.value, 0);
          const othersPct = (othersTotal / totalExpense) * 100;
          return (
            <div className="pt-2 animate-in fade-in duration-500">
              <button 
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-1 py-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-all"
              >
                <div className="flex items-center gap-2">
                   <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                   <span className="text-slate-500">Lainnya ({others.length})</span>
                   <svg className={`h-3 w-3 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                </div>
                <div className="flex items-center gap-2 border-b border-dashed border-slate-200 dark:border-slate-700 pb-0.5">
                  <span className="text-slate-400">{formatCurrency(othersTotal)}</span>
                  <span className="text-primary/70">{othersPct.toFixed(0)}%</span>
                </div>
              </button>
              
              {!expanded && (
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800/50 overflow-hidden mt-2">
                  <div 
                    className="h-full rounded-full bg-slate-300 dark:bg-slate-600 opacity-50 transition-all duration-1000"
                    style={{ width: `${othersPct}%` }}
                  />
                </div>
              )}

              {expanded && (
                <div className="mt-4 space-y-4 pl-4 border-l-2 border-slate-100 dark:border-slate-800/50 animate-in slide-in-from-left-2 duration-300">
                  {others.map((item, idx) => {
                    const subPct = (item.value / totalExpense) * 100;
                    return (
                      <div key={item.name} className="space-y-1.5 opacity-80 hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest px-1">
                          <span className="text-slate-500">{item.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">{formatCurrency(item.value)}</span>
                            <span className="text-slate-500">{subPct.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="h-1 w-full rounded-full bg-slate-50 dark:bg-slate-900/50">
                          <div 
                            className="h-full rounded-full bg-slate-400 dark:bg-slate-600 transition-all duration-700"
                            style={{ width: `${subPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
