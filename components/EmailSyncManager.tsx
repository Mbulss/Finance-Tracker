"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ConfirmModal } from "./ConfirmModal";
import { useToast } from "./ToastContext";
import { SelectDropdown } from "./SelectDropdown";

const EXPENSE_CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Health", "Entertainment", "Other"];
const INCOME_CATEGORIES = ["Salary", "Freelance", "Investment", "Gift", "Other"];

type PreviewItem = {
  id: string;
  type: "expense" | "income";
  amount: number;
  category: string;
  note: string;
  created_at: string;
  merchantName: string;
};

// --- ANIMATED TYPEWRITER COMPONENT ---
function Typewriter({ phrases }: { phrases: string[] }) {
  const [index, setIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [speed, setSpeed] = useState(150);

  useEffect(() => {
    const handleType = () => {
      const fullText = phrases[index];
      setDisplayText(
        isDeleting
          ? fullText.substring(0, displayText.length - 1)
          : fullText.substring(0, displayText.length + 1)
      );

      if (!isDeleting && displayText === fullText) {
        setTimeout(() => setIsDeleting(true), 1500);
        setSpeed(100);
      } else if (isDeleting && displayText === "") {
        setIsDeleting(false);
        setIndex((prev) => (prev + 1) % phrases.length);
        setSpeed(150);
      }
    };

    const timer = setTimeout(handleType, speed);
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, index, phrases, speed]);

  return (
    <span className="text-slate-900 dark:text-white border-r-4 border-primary animate-blink pr-2">
      {displayText}
    </span>
  );
}

// --- HOW IT WORKS MODAL COMPONENT ---
function HowItWorksModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl p-8 overflow-hidden animate-in zoom-in-95 duration-200 text-left">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Cara Pakai</h3>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="space-y-6">
            {[ 
              { step: 1, color: "orange", title: "Aktifkan Notifikasi Bank", desc: "Pastikan notifikasi resi di aplikasi bank (Livin/myBCA) sudah menyala agar email struk masuk ke Gmail Anda." },
              { step: 2, color: "blue", title: "Hubungkan Gmail", desc: "Klik 'Connect to Gmail' dan WAJIB centang kotak 'Read your email' di popup Google agar sistem bisa membaca resi." },
              { step: 3, color: "emerald", title: "Cek & Simpan", desc: "Klik 'Sync Manual', review struk yang ditemukan, edit jika perlu, lalu simpan ke Dashboard." }
            ].map((s) => (
              <div key={s.step} className="flex gap-5 group">
                <div className={`w-12 h-12 rounded-2xl ${
                  s.color === "orange" ? "bg-orange-100 dark:bg-orange-500/10 text-orange-600" :
                  s.color === "blue" ? "bg-blue-100 dark:bg-blue-500/10 text-blue-600" :
                  "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600"
                } flex items-center justify-center shrink-0 font-black shadow-sm group-hover:scale-110 transition-transform`}>{s.step}</div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-900 dark:text-white">{s.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button onClick={onClose} className="w-full py-4 rounded-2xl bg-primary text-white font-black shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95">
            Siap, Mulai Sekarang!
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmailSyncManager() {
  const [providerToken, setProviderToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewItem[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<PreviewItem>>({});
  const [mounted, setMounted] = useState(false);
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const supabase = createClient();
  const { showToast } = useToast();

  const fetchIntegration = useCallback(async (session: any) => {
    if (!session) { setProviderToken(null); return; }
    const isManualUnlink = localStorage.getItem("gmail_disconnected") === "true";
    if (isManualUnlink) { setProviderToken(null); return; }
    if (session.provider_token) setProviderToken(session.provider_token);
    if (session.provider_refresh_token) {
      try {
        await fetch("/api/email/integration", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: session.provider_refresh_token }),
        });
      } catch (e) { console.error("Failed to save refresh token", e); }
    }
    try {
      const res = await fetch("/api/email/integration");
      const json = await res.json();
      if (!json.integrated && !session.provider_token) { setProviderToken(null); }
    } catch (e) { console.error("Integration check failed", e); }
  }, []);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data }) => fetchIntegration(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") { setProviderToken(null); localStorage.removeItem("gmail_disconnected"); } 
      else { fetchIntegration(session); }
    });
    return () => subscription.unsubscribe();
  }, [supabase, fetchIntegration]);

  async function handleConnect() {
    setLoading(true);
    localStorage.removeItem("gmail_disconnected");
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: "https://www.googleapis.com/auth/gmail.readonly",
        queryParams: { access_type: "offline", prompt: "consent" },
        redirectTo: window.location.origin + "/email-sync",
      },
    });
    setLoading(false);
  }

  async function handleUnlink() {
    setShowUnlinkModal(false); 
    setLoading(true);
    try {
      const res = await fetch("/api/email/integration", { method: "DELETE" });
      if (res.ok) { 
        setProviderToken(null); 
        localStorage.setItem("gmail_disconnected", "true"); 
        showToast("Berhasil memutuskan hubungan.");
      } else { 
        const json = await res.json(); 
        showToast("Gagal memutuskan: " + json.error, "error"); 
      }
    } catch (e: any) { showToast("Error jaringan.", "error"); }
    setLoading(false);
  }

  async function handleSync() {
    if (!providerToken) return;
    setLoading(true);
    showToast("Mengintip kotak masuk Gmail...");
    try {
      const res = await fetch("/api/email/sync/manual", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerToken }),
      });
      const json = await res.json();
      if (res.ok) {
        if (json.preview.length === 0) { 
           showToast(`Selesai ngecek ${json.emailsChecked || 0} email. Tidak ada struk baru.`); 
        } else { 
           setPreviewData(json.preview); 
           showToast(`${json.preview.length} transaksi ditemukan!`, "success");
        }
      } else {
        if (res.status === 403 || (json.error && json.error.includes("scopes"))) { 
           showToast("Izin Gmail Terbatas! Centang kotak 'Read your email' saat login.", "error"); 
        } else { 
           showToast(json.error || "Gagal menarik data.", "error"); 
        }
        if (res.status === 401) setProviderToken(null);
      }
    } catch (e: any) { showToast("Gagal sinkron data.", "error"); }
    setLoading(false);
  }

  async function handleSavePreview() {
    if (!previewData) return;
    setEditingId(null); 
    setLoading(true);
    try {
      const res = await fetch("/api/email/sync/manual", {
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ transactionsToSave: previewData }),
      });
      const json = await res.json();
      if (res.ok) { 
        showToast(`Berhasil! ${json.insertedCount} transaksi disimpan.`, "success"); 
        setPreviewData(null); 
      } else { 
        showToast("Gagal menyimpan: " + json.error, "error"); 
      }
    } catch (e: any) { showToast("Gagal memproses simpan.", "error"); }
    setLoading(false);
  }

  function startEdit(trx: PreviewItem) { setEditingId(trx.id); setEditValues({ merchantName: trx.merchantName, type: trx.type, category: trx.category, amount: trx.amount }); }
  function cancelEdit() { setEditingId(null); setEditValues({}); }
  function saveEdit(id: string) { setPreviewData(prev => prev?.map(t => t.id === id ? { ...t, ...editValues } as PreviewItem : t) ?? null); setEditingId(null); setEditValues({}); }

  const currentCategories = editValues.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  if (!mounted) return;
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 px-4">
      <HowItWorksModal open={showHelpModal} onClose={() => setShowHelpModal(false)} />

      <ConfirmModal
        open={showUnlinkModal}
        title="Putuskan Hubungan Gmail?"
        description="Aplikasi tidak akan bisa lagi melacak transaksi otomatis dari email Anda sampai dihubungkan kembali."
        confirmLabel="Ya, Putuskan" cancelLabel="Batal" variant="danger" onConfirm={handleUnlink} onClose={() => setShowUnlinkModal(false)} loading={loading}
      />

      {/* --- HERO SECTION --- */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-8 sm:p-10 lg:p-14 animate-fade-in-up">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12 text-center lg:text-left">
          <div className="space-y-6 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border border-slate-200 dark:border-slate-700 mx-auto lg:mx-0">
               <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
               Email Automation System
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-tight min-h-[80px] sm:min-h-[90px] lg:min-h-0 text-slate-900 dark:text-white">
                <Typewriter phrases={["Hapus Capek Mengetik", "Bebas Salah Hitung", "Data Akurat & Otomatis"]} />
              </h1>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight animate-fade-in">
                Biarkan <span className="text-primary italic">Auto-Sync</span> Bekerja.
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg leading-relaxed animate-fade-in [animation-delay:500ms]">
              Dukungan penuh untuk notifikasi digital BCA & Mandiri. Setiap transaksi yang masuk ke Gmail akan kami proses secara otomatis dalam hitungan titik.
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-2 animate-fade-in [animation-delay:800ms]">
               {["Bank BCA", "Bank Mandiri"].map((bank) => (
                  <div key={bank} className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/50 px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                     <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{bank}</span>
                     <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-md font-bold">READY</span>
                  </div>
               ))}
            </div>
          </div>
          <div className="shrink-0 relative mx-auto lg:mx-0 animate-float">
             <div className="absolute inset-0 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
              <div className="relative bg-white dark:bg-slate-800 p-8 sm:p-12 rounded-[3.5rem] shadow-2xl ring-1 ring-slate-100 dark:ring-slate-700">
                 <img src="/gmail logo.png" alt="Gmail" className="w-20 h-20 sm:w-24 sm:h-24 object-contain" />
              </div>
          </div>
        </div>
      </div>

      {/* --- BETA ACCESS NOTICE --- */}
      <div className="bg-amber-50/70 dark:bg-amber-500/5 border border-amber-200/60 dark:border-amber-900/40 rounded-[2.5rem] p-8 sm:p-10 flex flex-col lg:flex-row items-center justify-between gap-8 animate-fade-in-up [animation-delay:100ms] shadow-lg shadow-amber-900/5">
         <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div className="w-16 h-16 rounded-[1.5rem] bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white dark:ring-slate-800 transition-transform hover:rotate-12">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div className="space-y-2">
               <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Butuh Akses? Hubungi Admin @Mbulsssss</h3>
               <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                  Karena sistem masih dalam tahap Private Testing, email kamu harus didaftarkan secara manual oleh Admin agar bisa login.
               </p>
            </div>
         </div>
         <a 
            href="https://t.me/Mbulsssss" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full lg:w-auto px-10 py-5 rounded-2xl bg-orange-600 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-orange-600/30 hover:bg-orange-700 hover:-translate-y-1 active:scale-95 transition-all text-center flex items-center justify-center gap-3"
         >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm3.224 17.862c-.104.002-.321-.023-.465-.14a.506.506 0 0 1-.171-.325c-.016-.093-.036-.306-.02-.472.18-1.898.962-6.502 1.36-8.627.168-.9.499-1.201.82-1.23.696-.065 1.225.46 1.9.902 1.056.693 1.653 1.124 2.678 1.8 1.185.78.417 1.21-.258 1.91-.177.184-3.247-2.977-3.307 3.23-.007.032-.014.15.056.212s.174.041.249.024c.106.024 1.793 1.14 5.061 3.345.48.33.913.49 1.302.48.428-.008 1.252-.241 1.865-.44.752-.245 1.349-.374 1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
            Chat Admin Sekarang
         </a>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-stretch">
        {/* --- MAIN ACTION CARD --- */}
        <div className="lg:col-span-8 flex flex-col h-full animate-fade-in-up [animation-delay:200ms]">
           <section className="h-full bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl p-8 sm:p-10 relative overflow-hidden flex flex-col gap-6 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div className="space-y-1 text-left">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Status Koneksi</h2>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Kelola integrasi Gmail Anda di sini.</p>
                 </div>
                 <button onClick={() => setShowHelpModal(true)} className="flex items-center justify-center gap-2 text-[11px] font-black text-primary bg-primary/5 hover:bg-primary/10 px-4 py-2.5 rounded-xl transition-all border border-primary/10 w-fit">
                    INFO PANDUAN
                 </button>
              </div>

              <div className={`rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 transition-all border-2 ${providerToken ? "bg-emerald-50/30 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20 shadow-sm" : "bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 shadow-sm"}`}>
                 <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center shrink-0 shadow-lg ${providerToken ? "bg-emerald-500 text-white animate-pulse-subtle" : "bg-white dark:bg-slate-700 text-slate-300 dark:text-slate-500 ring-1 ring-slate-100 dark:ring-slate-600"}`}>
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       {providerToken ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />}
                    </svg>
                 </div>
                 <div className="text-center md:text-left flex-1 space-y-2">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                       <span className={`w-2.5 h-2.5 rounded-full ${providerToken ? "bg-emerald-500 animate-pulse" : "bg-slate-300 dark:bg-slate-600"}`} />
                       <span className={`text-xs font-black uppercase tracking-widest ${providerToken ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                          {providerToken ? "System Active" : "Waiting Setup"}
                       </span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                       {providerToken ? "Sinkronisasi Berjalan" : "Gmail Belum Terhubung"}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto md:mx-0">
                       {providerToken ? "Kami siap mengolah resi bank terbaru di inbox Anda kapan saja." : "Hubungkan akun Google Anda untuk mengaktifkan pelacakan pengeluaran otomatis."}
                    </p>
                 </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                 {!providerToken ? (
                    <button onClick={handleConnect} disabled={loading} className="flex-1 flex items-center justify-center gap-3 rounded-2xl bg-primary px-8 py-5 text-sm font-black text-white shadow-xl shadow-primary/25 hover:-translate-y-1 active:scale-95 transition-all">
                        <div className="bg-white p-1 rounded-md shrink-0"><svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg></div>
                        {loading ? "PROCESSING..." : "Connect to Gmail"}
                    </button>
                 ) : (
                    <button onClick={handleSync} disabled={loading} className="flex-1 flex items-center justify-center gap-3 rounded-2xl bg-primary px-8 py-5 text-sm font-black text-white shadow-xl shadow-primary/25 hover:-translate-y-1 active:scale-95 transition-all relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                        <svg className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        {loading ? "SYNCING..." : "Sync Manual Sekarang"}
                    </button>
                 )}

                 {providerToken && (
                    <button onClick={() => setShowUnlinkModal(true)} disabled={loading} className="flex-none sm:px-8 py-5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-black hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                        Disconnect
                    </button>
                 )}
              </div>
           </section>
        </div>

        {/* --- SIDE INFO CARDS --- */}
        <div className="lg:col-span-4 space-y-8 flex flex-col h-full animate-fade-in-up [animation-delay:400ms]">
            <section className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-xl relative overflow-hidden flex flex-col justify-center hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="relative space-y-6">
                 <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Data Security</h3>
                 </div>
                 <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed text-left">
                    Sistem kami hanya membaca email dari domain resmi bank (@bankmandiri.co.id & bca.co.id). Pesan pribadi Anda tetap aman.
                 </p>
                 <div className="pt-2 flex flex-col gap-3 items-start">
                    {["Read-Only Access", "Bank Domains Only", "100% Secure"].map(k => (
                       <div key={k} className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {k}
                       </div>
                    ))}
                 </div>
              </div>
            </section>

           <div className="p-1 rounded-[2.5rem] bg-gradient-to-br from-blue-500/10 to-primary/10 group">
              <section className="bg-white dark:bg-slate-900 rounded-[2.3rem] p-6 text-center border border-slate-100 dark:border-slate-800 hover:scale-[1.02] transition-transform cursor-default">
                 <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Integrasi Terverifikasi</p>
                 <div className="flex justify-center gap-4 transition-all duration-500">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5c/Bank_Central_Asia.svg" className="h-6 w-auto" alt="BCA" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/a/ad/Bank_Mandiri_logo_2016.svg" className="h-6 w-auto" alt="Mandiri" />
                 </div>
              </section>
           </div>
        </div>
      </div>


      {/* --- PREVIEW MODAL --- */}
      {previewData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/90 backdrop-blur-xl" onClick={() => { if (!loading) setPreviewData(null); }} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="p-8 sm:p-10 pb-6 flex items-start justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Email Results</h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{previewData.length} transaksi terdeteksi</p>
              </div>
              <button onClick={() => setPreviewData(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {previewData.map((trx) => (
                <div key={trx.id} className={`group relative rounded-[2.5rem] border transition-all duration-300 ${editingId === trx.id ? "bg-white dark:bg-slate-800 shadow-2xl border-primary ring-8 ring-primary/5 p-6" : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 p-6"}`}>
                  {editingId === trx.id ? (
                    <div className="space-y-6">
                      <div className="flex p-1.5 bg-slate-100 dark:bg-slate-700 rounded-2xl w-fit">
                        {["expense", "income"].map(type => (
                          <button key={type} onClick={() => setEditValues(v => ({ ...v, type: type as any, category: "Other" }))} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${editValues.type === type ? "bg-white dark:bg-slate-600 shadow-md text-slate-900 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}>{type}</button>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Merchant</label><input type="text" value={editValues.merchantName} onChange={(e) => setEditValues(v => ({ ...v, merchantName: e.target.value }))} className="w-full rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white text-sm p-4 font-black focus:ring-4 focus:ring-primary/10 transition-all outline-none" /></div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Kategori</label>
                          <SelectDropdown
                            value={editValues.category ?? ""}
                            onChange={(val) => setEditValues(v => ({ ...v, category: val }))}
                            options={currentCategories.map(c => ({ value: c, label: c.toUpperCase() }))}
                            placeholder="Kategori"
                            className="w-full h-[56px]"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-end gap-4">
                        <div className="w-full space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Nominal (Rp)</label><input type="number" value={editValues.amount} onChange={(e) => setEditValues(v => ({ ...v, amount: Number(e.target.value) }))} className="w-full rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white text-3xl p-4 font-black focus:ring-4 focus:ring-primary/10 transition-all outline-none" /></div>
                        <div className="flex gap-2 w-full sm:w-auto"><button onClick={cancelEdit} className="flex-1 sm:px-6 py-5 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black">BATAL</button><button onClick={() => saveEdit(trx.id)} className="flex-1 sm:px-8 py-5 rounded-2xl bg-primary text-white py-5 font-black shadow-xl shadow-primary/20 transition-all text-xs font-black">UPDATE</button></div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-left">
                      <div className="flex gap-6">
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 shadow-md ${trx.type === "expense" ? "bg-red-50 dark:bg-red-500/10 text-red-500" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500"}`}><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d={trx.type === "expense" ? "M16 17l-4 4m0 0l-4-4m4 4V3" : "M8 7l4-4m0 0l4 4m-4-4v18"} /></svg></div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                             <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${trx.type === "expense" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"}`}>{trx.category}</span>
                             <span className="text-[10px] font-black text-slate-400 dark:text-slate-500">{mounted && new Date(trx.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' }).toUpperCase()}</span>
                          </div>
                          <h4 className="text-lg font-black text-slate-900 dark:text-white truncate tracking-tight">{trx.merchantName}</h4>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-tighter opacity-70 truncate">{trx.note}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-6 sm:pt-0 border-slate-100 dark:border-slate-800">
                        <p className={`text-2xl font-black ${trx.type === "expense" ? "text-slate-900 dark:text-white" : "text-emerald-500"}`}>{trx.type === "expense" ? "−" : "+"} Rp {trx.amount.toLocaleString("id-ID")}</p>
                        <button onClick={() => startEdit(trx)} className="p-3.5 rounded-2xl bg-white dark:bg-slate-700 text-slate-300 dark:text-slate-500 hover:text-primary transition-all shadow-sm ring-1 ring-slate-100 dark:ring-slate-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-10 pt-4 grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <button onClick={() => setPreviewData(null)} className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 py-5 font-black text-slate-500 dark:text-slate-400 text-xs tracking-widest transition-all">BATAL</button>
              <button onClick={handleSavePreview} disabled={loading || editingId !== null} className="rounded-2xl bg-primary text-white py-5 font-black shadow-2xl shadow-primary/20 transition-all text-xs tracking-[0.2em]">{loading ? "SAVING..." : "SIMPAN SEMUA"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
