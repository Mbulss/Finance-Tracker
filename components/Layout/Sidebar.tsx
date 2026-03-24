"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InstallPWA } from "@/components/InstallPWA";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  return (
    <>
      {/* Overlay mobile */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden backdrop-blur-[2px]"
        aria-hidden
        onClick={onClose}
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none" }}
      />
      <aside
        className={`
          fixed left-0 top-0 z-50 h-full w-64 border-r border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md
          transition-transform duration-300 ease-in-out lg:translate-x-0
          ${isOpen ? "translate-x-0 shadow-2xl lg:shadow-none" : "-translate-x-full"}
        `}
      >
        <div className="flex h-full flex-col p-4 pl-[max(1rem,env(safe-area-inset-left))]">
          {/* Desktop Logo: Refined App Icon Style */}
          <div className="hidden lg:flex items-center gap-3 px-3 py-6 mb-2">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 overflow-hidden">
               <img src="/logo.png" alt="" className="h-7 w-7 object-contain scale-125" />
            </div>
            <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">Finance Tracker AI</span>
            <div className="ml-auto"><ThemeToggle /></div>
          </div>
          {/* Mobile: close button saja (logo di navbar, theme toggle di navbar kanan) */}
          <div className="flex items-center justify-between px-2 py-3 lg:hidden">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Menu</span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                aria-label="Tutup menu"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <nav className="flex-1 space-y-1 pt-2 lg:pt-4">
            {[
              { href: "/", label: "Dashboard", icon: <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
              { href: "/tabungan", label: "Tabungan", icon: <path d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v1.5c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125h-.375m0-1.5h.375c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125H3.375" /> },
              { href: "/email-sync", label: "Email Otomatis", icon: <path d="M24 4.5v15c0 .85-.65 1.5-1.5 1.5H21V7.39l-9 6.58-9-6.58V21H1.5C.65 21 0 20.35 0 19.5v-15c0-1.17 1.26-1.88 2.25-1.17L12 9.03l9.75-7.7C22.74 2.62 24 3.33 24 4.5z"/> },
              { href: "/link-telegram", label: "Link Telegram", icon: <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /> },
              { href: "/faq", label: "FAQ", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
            ].map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`group relative flex min-h-[48px] items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition-all ${
                    isActive 
                    ? "bg-primary/5 text-primary shadow-sm shadow-primary/5" 
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  {/* Active Indicator Bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-glow animate-fade-in" />
                  )}
                  
                  <svg 
                    className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-110 ${isActive ? "text-primary" : "text-slate-400 dark:text-slate-500"}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    {item.icon}
                  </svg>
                  <span className="tracking-tight">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          
          <div className="space-y-1 border-t border-slate-100 dark:border-slate-800 pt-6 mt-4">
            <InstallPWA onClose={onClose} />
            
            <Link
              href="/profile"
              onClick={onClose}
              className={`group relative flex min-h-[48px] items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition-all ${
                pathname === "/profile" 
                ? "bg-primary/5 text-primary" 
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
              }`}
            >
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Akun</span>
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="group flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-slate-500 transition-all hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Keluar</span>
            </button>

            {/* Version Label */}
            <div className="px-4 pb-2 pt-3 text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-300 dark:text-slate-600">
                Version 1.5.1
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
