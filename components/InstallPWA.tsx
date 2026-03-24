"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export function InstallPWA({ onClose }: { onClose?: () => void }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    
    setIsIOS(isIOSDevice);
    setIsMobile(isMobileDevice);

    // Initial check (maybe it was caught earlier?)
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    // Listener for late-fired event
    const handler = () => {
      setDeferredPrompt((window as any).deferredPrompt);
    };

    window.addEventListener("pwa-prompt-available", handler);
    return () => window.removeEventListener("pwa-prompt-available", handler);
  }, []);

  async function handleInstallClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      setDeferredPrompt(null);
      onClose?.();
    } else {
      setShowModal(true);
    }
  }

  const Modal = () => (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 sm:p-6 cursor-default">
      <div 
        className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-fade-in"
        onClick={() => setShowModal(false)}
      />
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in">
        {/* Decorative Icon Fixed (Stroke instead of fill) */}
        <div className="absolute -top-6 -right-6 p-6 pointer-events-none opacity-[0.05] dark:opacity-[0.08]">
          <svg className="w-40 h-40 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
             <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>

        <div className="relative p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Install App</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{isMobile ? "Panduan Mobile" : "Panduan Desktop"}</p>
            </div>
            <button 
              onClick={() => setShowModal(false)}
              className="relative z-10 h-10 w-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
              aria-label="Tutup"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="space-y-6">
            {!isMobile ? (
              /* DESKTOP VIEW */
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-sm">1</span>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Klik ikon <span className="inline-flex py-1 px-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></span> (Install) di sebelah kanan <span className="text-primary italic">Address Bar</span> browser kamu.
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-sm">2</span>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Klik tombol <span className="text-primary">&quot;Install&quot;</span> pada popup yang muncul.</p>
                </div>
              </div>
            ) : isIOS ? (
              /* iOS VIEW */
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-sm">1</span>
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Ketuk ikon <span className="inline-flex py-1 px-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg"><svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg></span> atau <span className="text-primary font-black">↑</span> (Share)</p>
                    <p className="text-[11px] text-slate-500 italic">Biasanya ada di bagian bawah browser Safari.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-sm">2</span>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Pilih <span className="text-primary border-b-2 border-primary/20">&quot;Add to Home Screen&quot;</span> atau <span className="text-primary border-b-2 border-primary/20">&quot;Tambah ke Layar Utama&quot;</span></p>
                </div>
              </div>
            ) : (
              /* ANDROID / CHROME MOBILE VIEW */
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-sm">1</span>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Buka menu <span className="font-black text-xl">⋮</span> di pojok kanan atas Chrome</p>
                </div>
                <div className="flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-sm">2</span>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Pilih <span className="text-primary">&quot;Install App&quot;</span> atau <span className="text-primary">&quot;Instalkan aplikasi&quot;</span></p>
                </div>
              </div>
            )}
            
            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 text-center">
               <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed">
                 {isMobile ? "Aplikasi akan muncul bersama aplikasi lain di HP kamu!" : "Aplikasi akan muncul di Desktop / Launchpad kamu!"}
               </p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowModal(false)}
            className="w-full mt-8 py-5 rounded-3xl bg-primary text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 active:scale-95 transition-all"
          >
            SAYA MENGERTI
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleInstallClick}
        className="flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-all group"
      >
        <div className="h-5 w-5 flex items-center justify-center group-hover:scale-110 transition-transform">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <span className="tracking-tight">Install aplikasi</span>
      </button>

      {showModal && typeof document !== "undefined" && createPortal(<Modal />, document.body)}
    </div>
  );
}
