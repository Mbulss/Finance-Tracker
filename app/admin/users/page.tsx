"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { getAllUsers, deleteUser, resetUserData } from "@/app/actions/admin-actions";
import Link from "next/link";

/** Component to display and manage the full user list with search and pagination */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setBySort] = useState("newest"); // newest, online, inactive, status
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const sortOptions = [
    { id: "newest", label: "Latest Joined", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
    { id: "online", label: "Recently Active", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /> },
    { id: "inactive", label: "Least Active", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> },
    { id: "status", label: "Group by Status", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /> },
  ];

  const currentSort = sortOptions.find(o => o.id === sortBy);

  useEffect(() => {
    async function load() {
      try {
        const data = await getAllUsers();
        setUsers(data);
      } catch (err) {
        console.error("Failed to load users:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Close sorting on outside click
  useEffect(() => {
    if (!isSortOpen) return;
    const handle = () => setIsSortOpen(false);
    window.addEventListener("click", handle);
    return () => window.removeEventListener("click", handle);
  }, [isSortOpen]);

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === "online") {
        const d_a = a.last_sign_in || a.created_at;
        const d_b = b.last_sign_in || b.created_at;
        return new Date(d_b).getTime() - new Date(d_a).getTime();
    }
    if (sortBy === "inactive") {
        const d_a = a.last_sign_in || a.created_at;
        const d_b = b.last_sign_in || b.created_at;
        return new Date(d_a).getTime() - new Date(d_b).getTime();
    }
    if (sortBy === "status") return a.status.localeCompare(b.status);
    return 0;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Sync current page if search filters out items
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [search, totalPages, currentPage, sortBy]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in text-sans relative">
        <div className="mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <Link href="/admin" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
               </Link>
               <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                 User <span className="text-primary">Directory</span>
               </h1>
            </div>
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-12">
              Viewing all {users.length} registered members
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative group sm:w-80">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-sm font-black text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-xl shadow-slate-200/50 dark:shadow-none"
              />
            </div>

            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="w-full sm:w-60 flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-sm font-black text-slate-900 dark:text-white hover:border-primary/50 transition-all shadow-xl shadow-slate-200/50 dark:shadow-none"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {currentSort?.icon}
                  </svg>
                  <span>{currentSort?.label}</span>
                </div>
                <svg className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isSortOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isSortOpen && (
                <div className="absolute top-full right-0 mt-3 w-64 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-2xl z-50 py-3 animate-fade-in-up origin-top overflow-hidden">
                  <div className="px-5 py-2 mb-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Sort Users By</span>
                  </div>
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setBySort(opt.id);
                        setIsSortOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-5 py-4 text-sm font-black transition-all ${
                        sortBy === opt.id 
                        ? "text-primary bg-primary/5" 
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <svg className={`w-4 h-4 ${sortBy === opt.id ? "text-primary" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {opt.icon}
                        </svg>
                        {opt.label}
                      </div>
                      {sortBy === opt.id && (
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Email Address</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Joined Date</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Last Seen</th>
                  <th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Node Status</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-8 py-7"><div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded-lg"></div></td>
                      <td className="px-8 py-7"><div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded-lg"></div></td>
                      <td className="px-8 py-7"><div className="h-4 w-28 bg-slate-100 dark:bg-slate-800 rounded-lg"></div></td>
                      <td className="px-8 py-7 text-right"><div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded-lg ml-auto"></div></td>
                    </tr>
                  ))
                ) : paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                      <td className="px-8 py-6">
                        <span className="text-sm font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                          {user.email}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                          {new Date(user.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                           {user.last_sign_in ? new Date(user.last_sign_in).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "Never"}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase ${
                          user.status === "ACTIVE" 
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : user.status === "INACTIVE"
                          ? "bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                          : "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setIsResetting(user.id)}
                              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-all"
                              title="Reset Data"
                            >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                            <button 
                              onClick={() => setIsDeleting(user.id)}
                              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                              title="Delete Account"
                            >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                         </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center">
                       <div className="flex flex-col items-center gap-2">
                          <svg className="w-12 h-12 text-slate-200 dark:text-slate-800 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} />
                          </svg>
                          <p className="text-sm font-black text-slate-400">No matching users found.</p>
                       </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest order-2 sm:order-1">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-4 order-1 sm:order-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:border-primary hover:text-primary transition-all shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:border-primary hover:text-primary transition-all shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleting && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-10 max-w-md w-full shadow-2xl animate-scale-in">
                 <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 mb-6 mx-auto">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 </div>
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white text-center uppercase tracking-tighter leading-none mb-4">Critical Deletion</h3>
                 <p className="text-sm font-bold text-slate-500 dark:text-slate-400 text-center mb-8">
                    You are about to permanently delete <span className="text-slate-900 dark:text-white italic">{users.find(u => u.id === isDeleting)?.email}</span>. This action is irreversible and will purge all associated records.
                 </p>
                 <div className="flex gap-4">
                    <button 
                       disabled={actionLoading}
                       onClick={() => setIsDeleting(null)}
                       className="flex-1 px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                    >
                       Safe Exit
                    </button>
                    <button 
                       disabled={actionLoading}
                       onClick={async () => {
                          setActionLoading(true);
                          try {
                             await deleteUser(isDeleting);
                             setUsers(u => u.filter(user => user.id !== isDeleting));
                             setIsDeleting(null);
                          } finally {
                             setActionLoading(false);
                          }
                       }}
                       className="flex-1 px-6 py-4 rounded-2xl bg-rose-600 text-white text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                       {actionLoading ? "Purging..." : "Confirm Delete"}
                    </button>
                 </div>
              </div>
           </div>
        )}

        {/* Reset Confirmation Modal */}
        {isResetting && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-10 max-w-md w-full shadow-2xl animate-scale-in">
                 <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-6 mx-auto">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                 </div>
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white text-center uppercase tracking-tighter leading-none mb-4">Account Reset</h3>
                 <p className="text-sm font-bold text-slate-500 dark:text-slate-400 text-center mb-8">
                    Clear all financial history for <span className="text-slate-900 dark:text-white italic">{users.find(u => u.id === isResetting)?.email}</span>? Identity will remain, but all transactions will be zeroed.
                 </p>
                 <div className="flex gap-4">
                    <button 
                       disabled={actionLoading}
                       onClick={() => setIsResetting(null)}
                       className="flex-1 px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                    >
                       Abort
                    </button>
                    <button 
                       disabled={actionLoading}
                       onClick={async () => {
                          setActionLoading(true);
                          try {
                             await resetUserData(isResetting);
                             setIsResetting(null);
                          } finally {
                             setActionLoading(false);
                          }
                       }}
                       className="flex-1 px-6 py-4 rounded-2xl bg-amber-500 text-white text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                       {actionLoading ? "Resetting..." : "Confirm Reset"}
                    </button>
                 </div>
              </div>
           </div>
        )}
      </div>
    </DashboardLayout>
  );
}
