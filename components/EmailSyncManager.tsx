"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import { Step, STATUS } from "react-joyride";

const Joyride: any = dynamic(() => import("./JoyrideTour"), { ssr: false });

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

export function EmailSyncManager() {
  const [providerToken, setProviderToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [previewData, setPreviewData] = useState<PreviewItem[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<PreviewItem>>({});
  const [mounted, setMounted] = useState(false);

  const supabase = createClient();

  const [tourState, setTourState] = useState({
    run: false,
    steps: [
      {
        target: ".tour-step-1",
        content: "Halo! Sebelum menghubungkan, pastikan notifikasi E-receipt di HP Anda (Livin'/myBCA) sudah menyala agar email struk bank bisa masuk.",
        disableBeacon: true,
        placement: "bottom" as const,
      },
      {
        target: ".tour-step-2",
        content: "Klik tombol ini. PENTING: Saat muncul popup Google, Anda WAJIB mencentang kotak 'Pilih apa saja yang dapat diakses (Read your email)' agar aplikasi kami diizinkan mendapat resinya!",
        placement: "top" as const,
      },
      {
        target: ".tour-step-3",
        content: "Setelah terhubung, klik tombol Tarik Data ini. Kami akan menampilkan pop-up PREVIEW berisi struk apa saja yang baru masuk. Jika sudah sesuai, tinggal Simpan!",
        placement: "top" as const,
      },
    ] as Step[],
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.provider_token) setProviderToken(data.session.provider_token);
      if (data.session?.provider_refresh_token) {
        fetch("/api/email/integration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: data.session.provider_refresh_token }),
        }).catch(console.error);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.provider_token) setProviderToken(session.provider_token);
      else setProviderToken(null);
      if (session?.provider_refresh_token) {
        fetch("/api/email/integration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: session.provider_refresh_token }),
        }).catch(console.error);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleConnect() {
    setMessage("");
    setLoading(true);
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

  async function handleSync() {
    if (!providerToken) return;
    setLoading(true);
    setMessage("Sedang mengintip kotak masuk Gmail Anda... Harap tunggu.");
    try {
      const res = await fetch("/api/email/sync/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerToken }),
      });
      const json = await res.json();
      if (res.ok) {
        if (json.preview.length === 0) {
          setMessage(`Selesai ngecek ${json.emailsChecked || 0} email bank terbaru. Saat ini tidak ditemukan transaksi resi BCA/Mandiri baru yang belum di-Simpan.`);
        } else {
          setPreviewData(json.preview);
          setMessage("");
        }
      } else {
        setMessage(json.error || "Gagal menarik data.");
        if (res.status === 401) setProviderToken(null);
      }
    } catch (e: any) {
      setMessage("Terjadi kesalahan jaringan: " + e.message);
    }
    setLoading(false);
  }

  async function handleSavePreview() {
    if (!previewData) return;
    setEditingId(null);
    setLoading(true);
    setMessage("Menyimpan ke Dashboard...");
    try {
      const res = await fetch("/api/email/sync/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionsToSave: previewData }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessage(`Berhasil! ${json.insertedCount} transaksi telah tersimpan di Dashboard Anda.`);
        setPreviewData(null);
      } else {
        setMessage("Gagal menyimpan: " + json.error);
      }
    } catch (e: any) {
      setMessage("Error jaringan saat menyimpan: " + e.message);
    }
    setLoading(false);
  }

  function startEdit(trx: PreviewItem) {
    setEditingId(trx.id);
    setEditValues({ merchantName: trx.merchantName, type: trx.type, category: trx.category, amount: trx.amount });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues({});
  }

  function saveEdit(id: string) {
    setPreviewData(prev => prev?.map(t => t.id === id ? { ...t, ...editValues } as PreviewItem : t) ?? null);
    setEditingId(null);
    setEditValues({});
  }

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      setTourState(s => ({ ...s, run: false }));
    }
  };

  const currentCategories = editValues.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="space-y-6 relative tour-step-1">
      <Joyride
        steps={tourState.steps}
        run={tourState.run}
        continuous
        showProgress
        showSkipButton
        callback={handleJoyrideCallback}
        styles={{ options: { primaryColor: '#0ea5e9', zIndex: 1000 } }}
        locale={{ back: 'Kembali', close: 'Tutup', last: 'Selesai', next: 'Lanjut', skip: 'Lewati Tour' }}
      />

      <section className="rounded-2xl border border-primary/30 dark:border-primary/40 bg-primary/5 dark:bg-primary/10 p-4 sm:p-5 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Status Koneksi Gmail
              {providerToken ? (
                <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 font-medium">Terhubung</span>
              ) : (
                <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 font-medium">Belum Terhubung</span>
              )}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-xl">
              {providerToken
                ? "Aplikasi sudah mendapat izin dari Google. Anda bisa menarik manual transaksi terbaru di sini agar bisa di-preview."
                : "Aplikasi butuh izin (Sign in with Google) untuk membaca kotak masuk Anda (hanya khusus domain bank BCA & Mandiri)."}
            </p>
          </div>
          <button
            onClick={() => setTourState(s => ({ ...s, run: true }))}
            className="text-xs font-semibold text-primary hover:text-primary-hover underline underline-offset-2 shrink-0 hidden sm:block"
          >
            Cara Pakai Interaktif
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {!providerToken ? (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="tour-step-2 flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-primary-hover transition disabled:opacity-50 hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5 bg-white rounded-full p-[2px]" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {loading ? "Menghubungkan..." : "Hubungkan dengan Gmail"}
            </button>
          ) : (
            <button
              onClick={handleSync}
              disabled={loading}
              className="tour-step-3 rounded-xl bg-slate-800 dark:bg-slate-200 px-4 py-2.5 text-sm font-semibold text-white dark:text-slate-800 shadow-md hover:bg-slate-700 dark:hover:bg-white transition disabled:opacity-50 hover:-translate-y-0.5"
            >
              {loading ? "Tunggu sebentar..." : "Tarik Transaksi Hari Ini (Manual)"}
            </button>
          )}
          <button
            onClick={() => setTourState(s => ({ ...s, run: true }))}
            className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 underline underline-offset-2 sm:hidden"
          >
            Mulai Tutorial
          </button>
        </div>

        {message && (
          <div className="mt-4 text-sm p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-sm flex items-start gap-3">
            <span className="text-xl">🔔</span>
            <span>{message}</span>
          </div>
        )}
      </section>

      {/* ── PREVIEW MODAL — matches app modal style ── */}
      {previewData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm"
            onClick={() => { setPreviewData(null); setEditingId(null); }}
            aria-hidden
          />

          {/* Panel */}
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-border dark:border-slate-600 bg-card dark:bg-slate-800 p-6 shadow-xl flex flex-col max-h-[90vh]"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="mb-5 flex items-start justify-between shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  Preview Transaksi Email
                </h3>
                <p className="text-sm text-muted dark:text-slate-400 mt-0.5">
                  {previewData.length} transaksi ditemukan — klik ✏️ untuk edit sebelum disimpan.
                </p>
              </div>
              <button
                onClick={() => { setPreviewData(null); setEditingId(null); }}
                disabled={loading}
                className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
                aria-label="Tutup"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Cards */}
            <div className="overflow-y-auto space-y-2.5 pb-2 flex-1 scrollbar-thin pr-1">
              {previewData.map((trx) => (
                <div
                  key={trx.id}
                  className="rounded-xl border border-border dark:border-slate-700 bg-surface dark:bg-slate-900/50 overflow-hidden hover:border-primary/50 dark:hover:border-primary/40 transition-colors"
                >
                  {editingId === trx.id ? (
                    /* ── Edit Mode ── */
                    <div className="p-4 space-y-3">
                      {/* Type toggle */}
                      <div className="flex rounded-xl bg-slate-100 dark:bg-slate-700 p-1">
                        <button
                          type="button"
                          onClick={() => setEditValues(v => ({ ...v, type: "expense", category: "Other" }))}
                          className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition ${editValues.type === "expense" ? "bg-card dark:bg-slate-800 shadow text-slate-800 dark:text-slate-100" : "text-muted dark:text-slate-400"}`}
                        >
                          Pengeluaran
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditValues(v => ({ ...v, type: "income", category: "Other" }))}
                          className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition ${editValues.type === "income" ? "bg-card dark:bg-slate-800 shadow text-slate-800 dark:text-slate-100" : "text-muted dark:text-slate-400"}`}
                        >
                          Pemasukan
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Nama Merchant</label>
                          <input
                            className="w-full rounded-xl border border-border dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-100 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={editValues.merchantName ?? ""}
                            onChange={e => setEditValues(v => ({ ...v, merchantName: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Kategori</label>
                          <select
                            className="w-full rounded-xl border border-border dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-100 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={editValues.category ?? "Other"}
                            onChange={e => setEditValues(v => ({ ...v, category: e.target.value }))}
                          >
                            {currentCategories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Nominal (Rp)</label>
                          <input
                            type="number"
                            className="w-full rounded-xl border border-border dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-100 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={editValues.amount ?? 0}
                            onChange={e => setEditValues(v => ({ ...v, amount: Number(e.target.value) }))}
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 pt-1">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="flex-1 rounded-xl border border-border dark:border-slate-600 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-[0.98]"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(trx.id)}
                          className="flex-[2] rounded-xl bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition active:scale-[0.98]"
                        >
                          ✓ Simpan Perubahan
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── View Mode ── */
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{trx.merchantName}</p>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-muted dark:text-slate-400 shrink-0">
                            {trx.category}
                          </span>
                        </div>
                        <p className="text-xs text-muted dark:text-slate-400 truncate">{trx.note}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-left sm:text-right">
                          <p className={`font-semibold ${trx.type === "expense" ? "text-expense" : "text-income"}`}>
                            {trx.type === "expense" ? "−" : "+"} Rp {trx.amount.toLocaleString("id-ID")}
                          </p>
                          <p className="text-xs text-muted dark:text-slate-400">
                            {mounted && new Date(trx.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                          </p>
                        </div>
                        <button
                          onClick={() => startEdit(trx)}
                          title="Edit transaksi ini"
                          className="rounded-lg p-2 text-muted hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex gap-3 mt-5 pt-4 border-t border-border dark:border-slate-700 shrink-0">
              <button
                onClick={() => { setPreviewData(null); setEditingId(null); }}
                disabled={loading}
                className="flex-1 rounded-xl border border-border dark:border-slate-600 py-3 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition active:scale-[0.98]"
              >
                Batal
              </button>
              <button
                onClick={handleSavePreview}
                disabled={loading || editingId !== null}
                className="flex-[2] rounded-xl bg-primary py-3 font-medium text-white hover:bg-primary-hover disabled:opacity-50 transition active:scale-[0.98]"
              >
                {loading ? "Menyimpan..." : editingId ? "Selesaikan edit dulu" : `Simpan ${previewData.length} Transaksi`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
