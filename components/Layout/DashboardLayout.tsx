"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ChatBot } from "@/components/ChatBot";
import { ActivityHeartbeat } from "@/components/ActivityHeartbeat";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Register Service Worker and Catch Install Prompt early
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/ServiceWorker.js")
        .then((reg) => console.log("Service Worker registered!", reg.scope))
        .catch((err) => console.log("Service Worker registration failed:", err));
    }

    const handler = (e: any) => {
      e.preventDefault();
      // Store globally for components to pick up
      (window as any).deferredPrompt = e;
      window.dispatchEvent(new Event("pwa-prompt-available"));
      console.log("Install prompt caught early (Global)!");
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return (
    <div className="min-h-screen bg-mesh">
      <ActivityHeartbeat />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="min-h-screen lg:pl-64 focus:outline-none overflow-x-hidden">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border dark:border-slate-700 bg-card/80 dark:bg-slate-800/80 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-md sm:px-6 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-1 rounded-xl text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Buka menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <img src="/logo.png" alt="" className="h-8 w-8 rounded-lg object-contain" />
          <span className="font-bold tracking-tight text-slate-800 dark:text-slate-100 truncate">Finance Tracker AI</span>
          <div className="ml-auto"><ThemeToggle /></div>
        </header>
        <div key={refreshKey} className="p-4 sm:p-6 lg:p-8 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
      </main>
      <ChatBot onTransactionAdded={() => setRefreshKey((k) => k + 1)} />
    </div>
  );
}
