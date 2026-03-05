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
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={handleClick}
        className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Install aplikasi
      </button>
      {showHint && !deferredPrompt && (
        <div className="rounded-xl border border-border dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400">
          <strong>Tambahkan ke layar utama:</strong>
          <br />
          • Chrome: menu (⋮) → &quot;Install app&quot; / &quot;Instalkan aplikasi&quot;
          <br />
          • Safari (iOS): tombol Bagikan → &quot;Add to Home Screen&quot;
        </div>
      )}
    </div>
  );
}
