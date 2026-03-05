"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TELEGRAM_BOT_URL, TELEGRAM_BOT_USERNAME } from "@/lib/constants";
import { openTelegramUrl } from "@/lib/utils";
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
          fixed left-0 top-0 z-50 h-full w-64 border-r border-border bg-card dark:bg-slate-800 dark:border-slate-700 shadow-sidebar
          transition-transform duration-200 ease-out lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex h-full flex-col p-4 pl-[max(1rem,env(safe-area-inset-left))]">
          <div className="flex items-center justify-between px-2 py-4 lg:justify-start lg:gap-3">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="" className="h-10 w-10 shrink-0 rounded-xl object-contain" />
              <span className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">Finance Tracker</span>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200 lg:hidden"
                  aria-label="Tutup menu"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <nav className="flex-1 space-y-0.5 pt-6">
            <Link
              href="/"
              onClick={onClose}
              className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${pathname === "/" ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary" : "text-muted hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
            >
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </Link>
            <Link
              href="/tabungan"
              onClick={onClose}
              className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${pathname === "/tabungan" ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary" : "text-muted hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
            >
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v1.5c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125h-.375m0-1.5h.375c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125H3.375" />
              </svg>
              Tabungan
            </Link>
            <Link
              href="/link-telegram"
              onClick={onClose}
              className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${pathname === "/link-telegram" ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary" : "text-muted hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
            >
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Link Telegram
            </Link>
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                openTelegramUrl(TELEGRAM_BOT_URL);
                onClose?.();
              }}
              className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Buka Bot (@{TELEGRAM_BOT_USERNAME})
            </a>
            <Link
              href="/faq"
              onClick={onClose}
              className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${pathname === "/faq" ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary" : "text-muted hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
            >
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              FAQ
            </Link>
          </nav>
          <div className="space-y-0.5 border-t border-border pt-4">
            <InstallPWA onClose={onClose} />
            <Link
              href="/profile"
              onClick={onClose}
              className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${pathname === "/profile" ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary" : "text-muted hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
            >
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Akun
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Keluar
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
