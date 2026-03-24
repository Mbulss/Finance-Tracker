"use client";

import { useState, useEffect } from "react";

export function InstallPWA({ onClose }: { onClose?: () => void }) {
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt: () => Promise<void> } | null>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as unknown as { prompt: () => Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      setDeferredPrompt(null);
      onClose?.();
    } else {
      setShowHint((prev) => !prev);
    }
  }

  return (
    <div className="relative group px-1">
      <div className="absolute -inset-0.5 rounded-[1.75rem] opacity-20 group-hover:opacity-40 transition duration-500 blur-sm bg-gradient-to-r from-primary via-emerald-500 to-blue-500 animate-border-glow" />
      <div className="relative bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200/50 dark:border-slate-800/80 p-5 shadow-sm overflow-hidden isolate">
        {/* Background Accent */}
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
             <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v4m0 8v4m-8-8h4m8 0h4m-12-6a9 9 0 1118 0 9 9 0 01-18 0z" />
                </svg>
             </div>
             <div className="space-y-0.5">
                <h3 className="text-[11px] font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">Install App</h3>
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 leading-none">Better Experience</p>
             </div>
          </div>

          <button
            type="button"
            onClick={handleClick}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white shadow-sm transition-all active:scale-[0.97]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16v1a3 3 0 003 3h12a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {deferredPrompt ? "Install Sekarang" : "Buka Petunjuk"}
          </button>
        </div>

        {showHint && !deferredPrompt && (
          <div className="mt-4 animate-in slide-in-from-top-4 duration-300">
            <div className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/[0.03] p-4 text-[10px] space-y-3">
              <div className="flex gap-2.5">
                <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center text-white text-[8px] font-black">1</div>
                <p className="text-slate-600 dark:text-slate-400 leading-tight">
                  <span className="font-bold text-primary">Chrome:</span> Klik menu (⋮) lalu pilih <strong>Instalkan Aplikasi</strong>
                </p>
              </div>
              <div className="flex gap-2.5">
                <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center text-white text-[8px] font-black">2</div>
                <p className="text-slate-600 dark:text-slate-400 leading-tight">
                  <span className="font-bold text-primary">Safari:</span> Klik Bagikan ( <svg className="inline h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> ) lalu pilih <strong>Add to Home Screen</strong>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
