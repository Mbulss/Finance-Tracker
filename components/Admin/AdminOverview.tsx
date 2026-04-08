"use client";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface AdminOverviewProps {
  data: {
    stats: {
      totalUsers: number;
      newUsersLastWeek: number;
      totalTransactions: number;
      totalVolume: number;
      totalIncome: number;
      totalExpense: number;
    };
    growthData: any[];
    recentUsers: any[];
    topUsers: any[];
    systemHealth: {
      database: string;
      api: string;
      auth: string;
      lastBackup: string;
    };
  };
}

/** 
 * AdminOverview - A premium, high-performance command center for the Finance Tracker.
 * Features:
 * - Dynamic Welcome Banner with System Health
 * - Glassmorphic Statistic Cards
 * - Quick Action Panel
 * - Interactive Engagement Charts
 * - Recently Active User Monitoring
 */
export function AdminOverview({ data }: AdminOverviewProps) {
  const { stats, growthData, recentUsers, topUsers, systemHealth } = data;
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Auto-refresh the entire admin data every 1 minute
    const interval = setInterval(() => {
      router.refresh();
      console.log("Admin Dashboard auto-refreshed.");
    }, 60 * 1000); 

    return () => clearInterval(interval);
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="space-y-10 pb-20 animate-fade-in">
      {/* 1. Premium Adaptive Banner */}
      <div className="relative overflow-hidden rounded-[3rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 shadow-2xl shadow-slate-200/50 dark:shadow-none transition-colors duration-500">
        {/* Animated Background Orbs - Adjusted for theme compatibility */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
              Administrator Command Center
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
              Overview <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-sky-500">Analytics</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold max-w-md">
              Monitoring <span className="text-slate-900 dark:text-white">{stats.totalUsers}</span> active users across <span className="text-slate-900 dark:text-white">{stats.totalTransactions}</span> global transactions.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <QuickStatus label="Database" value={systemHealth.database} color="text-emerald-500" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />} />
             <QuickStatus label="Backup" value={systemHealth.lastBackup} color="text-sky-500" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />} />
          </div>
        </div>
      </div>

      {/* 2. Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Global Users" 
          value={stats.totalUsers} 
          subtext={`+${stats.newUsersLastWeek} Joined recently`} 
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
          color="bg-primary"
        />
        <StatCard 
          title="System Tx" 
          value={stats.totalTransactions.toLocaleString()} 
          subtext="Processed events" 
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
          color="bg-amber-500"
        />
        <StatCard 
          title="Market Volume" 
          value={formatCurrency(stats.totalVolume)} 
          subtext="Total flow tracked" 
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
          color="bg-emerald-500"
        />
        <StatCard 
          title="Profitability" 
          value={`${((stats.totalIncome / (stats.totalVolume || 1)) * 100).toFixed(0)}%`} 
          subtext="Global Income Ratio" 
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          color="bg-indigo-500"
        />
      </div>

      {/* 4. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartContainer title="Acquisition Pipeline" subtitle="User registration growth over 30 days">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.1} />
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#0f172a', borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)', color: '#fff' }}
                   itemStyle={{ color: '#0ea5e9', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="users" stroke="#0ea5e9" strokeWidth={4} fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Operational Velocity" subtitle="Daily transaction event volatility">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.1} />
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#0f172a', borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)', color: '#fff' }}
                   itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="transactions" stroke="#f59e0b" strokeWidth={4} dot={false} strokeLinecap="round" />
              </LineChart>
            </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* 5. Top Performers Section */}
      <div className="grid grid-cols-1 gap-8">
        <div className="rounded-[3rem] border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-10 shadow-2xl">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Top Performing Accounts</h3>
              <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-[0.2em]">Ranked by total market volume</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topUsers.map((user, idx) => (
              <div key={user.id} className="flex flex-col p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-primary/50 transition-all shadow-xl hover:-translate-y-1 group">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-black text-lg group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                    {idx + 1}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-black text-slate-900 dark:text-white truncate" title={user.email}>{user.email}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{user.txCount} Global Transactions</p>
                  </div>
                </div>
                <div className="mt-auto border-t border-slate-50 dark:border-slate-800 pt-6">
                  <p className="text-2xl font-black text-primary tracking-tighter leading-none">{formatCurrency(user.volume)}</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Total Contribution</p>
                </div>
              </div>
            ))}
            {topUsers.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
                <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} /></svg>
                <p className="font-bold uppercase tracking-widest text-xs">Awaiting market data...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Recently Active Table */}
      <div className="rounded-[3rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between p-10 gap-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none uppercase tracking-tighter">Live Activity</h3>
            <p className="text-[10px] font-black text-slate-400 mt-3 uppercase tracking-[0.2em]">Real-time user engagement monitoring</p>
          </div>
          <Link href="/admin/users" className="group flex items-center gap-3 px-6 py-4 rounded-2xl bg-primary text-white text-xs font-black shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
            USER DIRECTORY
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Email Address</th>
                <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Joined Date</th>
                <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Last Seen</th>
                <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentUsers.map(user => (
                <tr key={user.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-10 py-7">
                    <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">{user.email}</p>
                  </td>
                  <td className="px-10 py-7">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {new Date(user.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </td>
                  <td className="px-10 py-7">
                    <p className="text-xs font-black text-slate-900 dark:text-white">
                      {(() => {
                        const lastActive = user.metadata?.last_active_at || user.last_sign_in || user.created_at;
                        return new Date(lastActive).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                      })()}
                    </p>
                  </td>
                  <td className="px-10 py-7 text-right">
                    {(() => {
                        const lastActive = new Date(user.metadata?.last_active_at || user.last_sign_in || user.created_at);
                        const isOnline = (new Date().getTime() - lastActive.getTime()) < 10 * 60 * 1000; // 10 minutes
                        
                        return isOnline ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            ONLINE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            AWAY
                          </span>
                        )
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtext, icon, color }: { title: string; value: any; subtext: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="group relative overflow-hidden rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl transition-all hover:-translate-y-2 hover:shadow-2xl">
      <div className={`absolute top-0 right-0 w-32 h-32 ${color} opacity-[0.05] rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-700`} />
      <div className="flex items-center justify-between mb-6">
        <div className={`flex h-14 w-14 items-center justify-center rounded-[1.25rem] ${color}/10 text-slate-400 dark:text-slate-200 ring-1 ring-slate-100 dark:ring-slate-700 shadow-inner`}>
          {icon}
        </div>
        <div className="text-right">
           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</h4>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{subtext}</p>
      </div>
    </div>
  );
}

function QuickStatus({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 dark:bg-slate-800/20 border border-white/10 backdrop-blur-sm shadow-inner group">
      <svg className={`w-5 h-5 ${color} group-hover:scale-110 transition-transform`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {icon}
      </svg>
      <div>
        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
        <p className={`text-xs font-black ${color} tracking-tight`}>{value}</p>
      </div>
    </div>
  );
}

function ChartContainer({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[3rem] border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-10 shadow-2xl shadow-slate-200/50 dark:shadow-none group">
       <div className="mb-10">
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter group-hover:text-primary transition-colors">{title}</h3>
          <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-[0.2em]">{subtitle}</p>
       </div>
       <div className="h-[300px]">
          {children}
       </div>
    </div>
  );
}
