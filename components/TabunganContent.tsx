"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, formatShortDate, parseAmountInput, formatAmountDisplay } from "@/lib/utils";
import { useToast } from "@/components/ToastContext";
import { ConfirmModal } from "@/components/ConfirmModal";
import { CountUp } from "@/components/CountUp";
import { SkeletonCard, Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { EditSavingsEntryModal } from "@/components/EditSavingsEntryModal";

export interface SavingsEntry {
  id: string;
  user_id: string;
  type: "deposit" | "withdraw";
  amount: number;
  note: string;
  created_at: string;
  pot_id?: string | null;
  /** true = bagian dari pindah uang, tidak ditampilkan di riwayat */
  is_transfer?: boolean;
}

export interface SavingsPot {
  id: string;
  user_id: string;
  name: string;
  target_amount: number | null;
  sort_order: number;
  created_at: string;
  /** Base64 data URL (opsional) */
  photo?: string | null;
  description?: string | null;
}

interface SavingsReminder {
  user_id: string;
  enabled: boolean;
  day_of_week: number;
}

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const GIF_MAX_SIZE = 3 * 1024 * 1024; // 3MB untuk GIF animasi (disimpan as-is agar tetap gerak)

/** Convert image file to base64. GIF disimpan as-is agar animasi jalan; format lain di-resize max 400px. */
function fileToBase64(file: File): Promise<string> {
  // GIF: jangan lewat canvas supaya animasi tetap jalan
  if (file.type === "image/gif") {
    return new Promise((resolve, reject) => {
      if (file.size > GIF_MAX_SIZE) {
        reject(new Error("GIF maksimal 3MB agar animasi tetap jalan."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Gagal membaca file"));
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 400;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > MAX || h > MAX) {
        if (w > h) {
          h = Math.round((h * MAX) / w);
          w = MAX;
        } else {
          w = Math.round((w * MAX) / h);
          h = MAX;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
      try {
        // Cek apakah ada pixel transparan (alpha < 255)
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        let hasTransparency = false;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 255) {
            hasTransparency = true;
            break;
          }
        }
        // Ada transparansi → PNG; tidak ada → JPEG (ukuran lebih kecil)
        if (hasTransparency) {
          resolve(canvas.toDataURL("image/png"));
        } else {
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        }
      } catch {
        reject(new Error("Failed to encode image"));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Invalid image"));
    };
    img.src = url;
  });
}

interface TabunganContentProps {
  userId: string;
}

export function TabunganContent({ userId }: TabunganContentProps) {
  const [entries, setEntries] = useState<SavingsEntry[]>([]);
  const [pots, setPots] = useState<SavingsPot[]>([]);
  const [reminder, setReminder] = useState<SavingsReminder | null>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<"deposit" | "withdraw">("deposit");
  const [selectedPotId, setSelectedPotId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingEntry, setEditingEntry] = useState<SavingsEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<SavingsEntry | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [newPotName, setNewPotName] = useState("");
  const [newPotTarget, setNewPotTarget] = useState("");
  const [newPotPhoto, setNewPotPhoto] = useState<string | null>(null);
  const [newPotDescription, setNewPotDescription] = useState("");
  const [addingPot, setAddingPot] = useState(false);
  const [editingPot, setEditingPot] = useState<SavingsPot | null>(null);
  const [editPotName, setEditPotName] = useState("");
  const [editPotTarget, setEditPotTarget] = useState("");
  const [editPotPhoto, setEditPotPhoto] = useState<string | null>(null);
  const [editPotDescription, setEditPotDescription] = useState("");
  const [potToDelete, setPotToDelete] = useState<SavingsPot | null>(null);
  const [deletePotLoading, setDeletePotLoading] = useState(false);
  const [optimisticEntries, setOptimisticEntries] = useState<SavingsEntry[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const [transferFrom, setTransferFrom] = useState<string>("__umum__");
  const [transferTo, setTransferTo] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [riwayatPage, setRiwayatPage] = useState(1);
  const supabase = createClient();
  const { showToast } = useToast();

  const RIWAYAT_PAGE_SIZE = 15;
  const displayedEntries = [...entries, ...optimisticEntries]
    .filter((e) => !pendingDeleteIds.has(e.id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  /** Entri yang tampil di tabel riwayat: setor/tarik saja, tanpa entri pindah uang */
  const entriesForRiwayat = displayedEntries.filter((e) => !e.is_transfer);

  const totalRiwayatPages = Math.max(1, Math.ceil(entriesForRiwayat.length / RIWAYAT_PAGE_SIZE));
  useEffect(() => {
    if (riwayatPage > totalRiwayatPages && totalRiwayatPages >= 1) setRiwayatPage(1);
  }, [totalRiwayatPages, riwayatPage]);

  const balanceByPot = displayedEntries.reduce<Record<string, number>>((acc, e) => {
    const key = e.pot_id ?? "__umum__";
    const delta = e.type === "deposit" ? Number(e.amount) : -Number(e.amount);
    acc[key] = (acc[key] ?? 0) + delta;
    return acc;
  }, {});
  const totalBalance = Object.values(balanceByPot).reduce((a, b) => a + b, 0);
  /** Total setor/tarik hanya dari entri riil (bukan pindah uang), sama dengan yang tampil di riwayat */
  const totalSetor = entriesForRiwayat
    .filter((e) => e.type === "deposit")
    .reduce((s, e) => s + Number(e.amount), 0);
  const totalTarik = entriesForRiwayat
    .filter((e) => e.type === "withdraw")
    .reduce((s, e) => s + Number(e.amount), 0);
  const selectedPotBalance = selectedPotId ? (balanceByPot[selectedPotId] ?? 0) : (balanceByPot["__umum__"] ?? 0);

  const fetchEntries = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("savings_entries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!err) setEntries((data as SavingsEntry[]) ?? []);
    setOptimisticEntries([]);
  }, [supabase, userId]);

  const fetchPots = useCallback(async () => {
    const { data } = await supabase
      .from("savings_pots")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });
    setPots((data as SavingsPot[]) ?? []);
  }, [supabase, userId]);

  const fetchReminder = useCallback(async () => {
    const { data } = await supabase
      .from("savings_reminders")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (data) setReminder(data as SavingsReminder);
    else setReminder({ user_id: userId, enabled: false, day_of_week: 1 });
  }, [supabase, userId]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchEntries(),
      fetchPots().catch(() => setPots([])),
      fetchReminder().catch(() => setReminder({ user_id: userId, enabled: false, day_of_week: 1 })),
    ]).then(() => {
      if (!cancelled) setLoading(false);
    });

    const channel = supabase
      .channel(`savings:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "savings_entries", filter: `user_id=eq.${userId}` },
        fetchEntries
      )
      .subscribe();
    const channelPots = supabase
      .channel(`savings_pots:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "savings_pots", filter: `user_id=eq.${userId}` },
        fetchPots
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      supabase.removeChannel(channelPots);
    };
  }, [fetchEntries, fetchPots, fetchReminder, supabase, userId]);

  useEffect(() => {
    if (pots.length > 0 && !transferTo) setTransferTo(pots[0].id);
  }, [pots, transferTo]);

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setAmount(formatAmountDisplay(raw));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const num = parseAmountInput(amount);
    if (!num || num <= 0) {
      setError("Masukkan jumlah yang valid.");
      return;
    }
    if (type === "withdraw" && num > selectedPotBalance) {
      setError("Saldo celengan ini tidak cukup.");
      return;
    }
    setSubmitLoading(true);
    const tempId = "opt-se-" + Date.now();
    const optimisticRow: SavingsEntry = {
      id: tempId,
      user_id: userId,
      type,
      amount: num,
      note: note.trim() || "",
      created_at: new Date().toISOString(),
      pot_id: selectedPotId ?? null,
    };
    setOptimisticEntries((prev) => [optimisticRow, ...prev]);
    try {
      const payload: { user_id: string; type: "deposit" | "withdraw"; amount: number; note: string; pot_id?: string | null } = {
        user_id: userId,
        type,
        amount: num,
        note: note.trim() || "",
      };
      if (selectedPotId) payload.pot_id = selectedPotId;
      const { error: err } = await supabase.from("savings_entries").insert(payload);
      if (err) throw err;
      setAmount("");
      setNote("");
      showToast(type === "deposit" ? "Setor berhasil" : "Tarik berhasil");
      fetchEntries();
    } catch (e) {
      setOptimisticEntries((prev) => prev.filter((x) => x.id !== tempId));
      showToast("Gagal menyimpan", "error");
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSubmitLoading(false);
    }
  }

  function getPotLabel(potId: string | null): string {
    if (!potId || potId === "__umum__") return "Umum";
    return pots.find((p) => p.id === potId)?.name ?? "Umum";
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    setTransferError("");
    const num = parseAmountInput(transferAmount);
    if (!num || num <= 0) {
      setTransferError("Masukkan jumlah yang valid.");
      return;
    }
    if (!transferTo || transferFrom === transferTo) {
      setTransferError("Pilih celengan asal dan tujuan yang berbeda.");
      return;
    }
    const fromBalance = transferFrom === "__umum__" ? (balanceByPot["__umum__"] ?? 0) : (balanceByPot[transferFrom] ?? 0);
    if (num > fromBalance) {
      setTransferError("Saldo celengan asal tidak cukup.");
      return;
    }
    setTransferLoading(true);
    try {
      const fromPotId = transferFrom === "__umum__" ? null : transferFrom;
      const toPotId = transferTo === "__umum__" ? null : transferTo;
      const toLabel = getPotLabel(transferTo);
      const fromLabel = getPotLabel(transferFrom);
      const { error: err1 } = await supabase.from("savings_entries").insert({
        user_id: userId,
        type: "withdraw",
        amount: num,
        note: `Pindah ke ${toLabel}`,
        pot_id: fromPotId,
        is_transfer: true,
      });
      if (err1) throw err1;
      const { error: err2 } = await supabase.from("savings_entries").insert({
        user_id: userId,
        type: "deposit",
        amount: num,
        note: `Pindah dari ${fromLabel}`,
        pot_id: toPotId,
        is_transfer: true,
      });
      if (err2) throw err2;
      setTransferAmount("");
      showToast("Uang berhasil dipindahkan");
      fetchEntries();
    } catch (e) {
      setTransferError(e instanceof Error ? e.message : "Gagal memindahkan.");
      showToast("Gagal memindahkan", "error");
    } finally {
      setTransferLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setPendingDeleteIds((prev) => new Set(prev).add(id));
    const { error } = await supabase.from("savings_entries").delete().eq("id", id).eq("user_id", userId);
    if (error) {
      setPendingDeleteIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (id.startsWith("opt-")) setOptimisticEntries((prev) => prev.filter((x) => x.id !== id));
      else fetchEntries();
      showToast("Gagal menghapus", "error");
      return;
    }
    fetchEntries();
    setPendingDeleteIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    showToast("Riwayat dihapus");
  }

  async function handleEdit(
    id: string,
    data: { type: "deposit" | "withdraw"; amount: number; note: string; pot_id: string | null }
  ) {
    const { error } = await supabase
      .from("savings_entries")
      .update({
        type: data.type,
        amount: data.amount,
        note: data.note || "",
        pot_id: data.pot_id || null,
      })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    fetchEntries();
    showToast("Riwayat diperbarui");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <div className="rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 p-6">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-12 w-full max-w-md mb-4" />
          <Skeleton className="h-12 w-full max-w-md" />
        </div>
        <div className="rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 p-6">
          <Skeleton className="h-5 w-24 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const showReminderBanner = reminder?.enabled && reminder.day_of_week === new Date().getDay();

  return (
    <div className="space-y-6">
      {showReminderBanner && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 dark:bg-primary/20 px-4 py-3 text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span className="text-lg">🐷</span>
          <span><strong>Pengingat setor:</strong> Jangan lupa setor tabungan hari ini. Kamu juga dapat pesan di Telegram kalau akun sudah di-link.</span>
        </div>
      )}

      {/* Saldo total + Total Setor + Total Tarik (format mirip dashboard) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <section className="relative overflow-hidden rounded-2xl border-2 border-primary/20 dark:border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 p-4 shadow-card transition-shadow hover:shadow-card-hover sm:p-6">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-primary/10 dark:bg-primary/20 blur-xl" aria-hidden />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted dark:text-slate-400">Saldo tabungan total</p>
              <p className={`mt-1 text-xl font-bold font-mono tabular-nums sm:text-2xl ${totalBalance >= 0 ? "text-slate-800 dark:text-slate-100" : "text-expense"}`}>
                <CountUp value={totalBalance} formatter={(n) => formatCurrency(n)} />
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 dark:bg-primary/25 sm:h-12 sm:w-12 ring-2 ring-primary/20 dark:ring-primary/30">
              <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </section>
        <section className="rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 p-4 shadow-card transition-shadow hover:shadow-card-hover dark:hover:shadow-card-hover sm:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted dark:text-slate-400">Total Setor</p>
              <p className="mt-1 text-xl font-bold font-mono tabular-nums text-income sm:text-2xl">
                <CountUp value={totalSetor} formatter={(n) => formatCurrency(n)} />
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-income/10 sm:h-12 sm:w-12">
              <svg className="h-6 w-6 text-income" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </section>
        <section className="rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 p-4 shadow-card transition-shadow hover:shadow-card-hover dark:hover:shadow-card-hover sm:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted dark:text-slate-400">Total Tarik</p>
              <p className="mt-1 text-xl font-bold font-mono tabular-nums text-expense sm:text-2xl">
                <CountUp value={totalTarik} formatter={(n) => formatCurrency(n)} />
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-expense/10 sm:h-12 sm:w-12">
              <svg className="h-6 w-6 text-expense" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
          </div>
        </section>
      </div>

      {/* Celengan */}
      <section className="rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 p-4 shadow-card sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">Celengan</h2>
          <button
            type="button"
            onClick={() => setAddingPot(true)}
            className="text-sm font-medium text-primary dark:text-sky-400 hover:underline"
          >
            + Tambah celengan
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            className={`rounded-xl border p-4 transition cursor-default ${selectedPotId === null ? "border-primary bg-primary/10 dark:bg-primary/20" : "border-border dark:border-slate-600 hover:border-primary/50"}`}
            onClick={() => setSelectedPotId(null)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setSelectedPotId(null)}
          >
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Umum</p>
            <p className={`mt-1 text-lg font-bold font-mono tabular-nums ${(balanceByPot["__umum__"] ?? 0) >= 0 ? "text-income" : "text-expense"}`}>
              {formatCurrency(balanceByPot["__umum__"] ?? 0)}
            </p>
          </div>
          {pots.map((pot) => {
            const bal = balanceByPot[pot.id] ?? 0;
            const target = pot.target_amount != null ? Number(pot.target_amount) : null;
            const pct = target != null && target > 0 ? Math.min(100, (bal / target) * 100) : null;
            return (
              <div
                key={pot.id}
                className={`rounded-xl border p-4 transition cursor-default ${selectedPotId === pot.id ? "border-primary bg-primary/10 dark:bg-primary/20" : "border-border dark:border-slate-600 hover:border-primary/50"}`}
                onClick={() => setSelectedPotId(pot.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSelectedPotId(pot.id)}
              >
                <div className="flex items-start gap-3">
                  {pot.photo && (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-transparent">
                      <img src={pot.photo} alt="" decoding="async" className="h-full w-full object-contain" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{pot.name}</p>
                    {pot.description && (
                      <p className="mt-0.5 text-xs text-muted dark:text-slate-400 line-clamp-2">{pot.description}</p>
                    )}
                    <p className={`mt-1 text-lg font-bold font-mono tabular-nums ${bal >= 0 ? "text-income" : "text-expense"}`}>
                      {formatCurrency(bal)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPot(pot);
                        setEditPotName(pot.name);
                        setEditPotTarget(pot.target_amount != null ? formatAmountDisplay(String(pot.target_amount)) : "");
                        setEditPotPhoto(pot.photo ?? null);
                        setEditPotDescription(pot.description ?? "");
                      }}
                      className="rounded p-1.5 text-muted hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-600 dark:hover:text-primary"
                      title="Edit celengan"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPotToDelete(pot); }}
                      className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-expense dark:hover:bg-slate-600 dark:hover:text-expense"
                      title="Hapus celengan"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
                {target != null && target > 0 && (
                  <div className="mt-2">
                    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
                      <div className="h-full rounded-full bg-primary dark:bg-sky-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted dark:text-slate-400">{pct?.toFixed(0)}% dari {formatCurrency(target)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Tambah / Edit celengan */}
        {(addingPot || editingPot) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/50 dark:bg-black/60"
              onClick={() => {
                if (addingPot) {
                  setAddingPot(false);
                  setNewPotName("");
                  setNewPotTarget("");
                  setNewPotPhoto(null);
                  setNewPotDescription("");
                } else if (editingPot) setEditingPot(null);
              }}
              aria-hidden
            />
            <div
              className="relative w-full max-w-md rounded-2xl border border-border dark:border-slate-600 bg-card dark:bg-slate-800 p-6 shadow-card"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="celengan-modal-title"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 id="celengan-modal-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {addingPot ? "Tambah celengan" : "Edit celengan"}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    if (addingPot) {
                      setAddingPot(false);
                      setNewPotName("");
                      setNewPotTarget("");
                      setNewPotPhoto(null);
                      setNewPotDescription("");
                    } else setEditingPot(null);
                  }}
                  className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  aria-label="Tutup"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Nama celengan</label>
                  <input
                    type="text"
                    value={addingPot ? newPotName : editPotName}
                    onChange={(e) => addingPot ? setNewPotName(e.target.value) : setEditPotName(e.target.value)}
                    placeholder="Mis. Dana darurat"
                    className="w-full min-h-[48px] rounded-xl border border-border dark:border-slate-600 bg-card dark:bg-slate-700 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Target (Rp)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={addingPot ? newPotTarget : editPotTarget}
                    onChange={(e) => {
                      const v = formatAmountDisplay(e.target.value);
                      addingPot ? setNewPotTarget(v) : setEditPotTarget(v);
                    }}
                    placeholder="Mis. 10.000.000"
                    className="w-full min-h-[48px] rounded-xl border border-border dark:border-slate-600 bg-card dark:bg-slate-700 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Foto (opsional)</label>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        fileToBase64(f)
                          .then((data) => addingPot ? setNewPotPhoto(data) : setEditPotPhoto(data))
                          .catch((err) => showToast(err instanceof Error ? err.message : "Gagal memuat gambar", "error"));
                        e.target.value = "";
                      }}
                      className="block w-full max-w-[200px] text-sm text-slate-600 dark:text-slate-400 file:mr-2 file:rounded-xl file:border-0 file:bg-primary file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-white file:hover:bg-primary-hover"
                    />
                    {(addingPot ? newPotPhoto : editPotPhoto) && (
                      <div className="relative">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-transparent">
                        <img src={addingPot ? newPotPhoto! : editPotPhoto!} alt="" decoding="async" className="h-full w-full object-contain" />
                      </span>
                        <button
                          type="button"
                          onClick={() => addingPot ? setNewPotPhoto(null) : setEditPotPhoto(null)}
                          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-white text-sm hover:bg-slate-800"
                          aria-label="Hapus foto"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Deskripsi (opsional)</label>
                  <textarea
                    value={addingPot ? newPotDescription : editPotDescription}
                    onChange={(e) => addingPot ? setNewPotDescription(e.target.value) : setEditPotDescription(e.target.value)}
                    placeholder="Mis. Untuk dana darurat 6 bulan"
                    rows={2}
                    className="w-full min-h-[80px] rounded-xl border border-border dark:border-slate-600 bg-card dark:bg-slate-700 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (addingPot) {
                        setAddingPot(false);
                        setNewPotName("");
                        setNewPotTarget("");
                        setNewPotPhoto(null);
                        setNewPotDescription("");
                      } else setEditingPot(null);
                    }}
                    className="flex-1 min-h-[48px] rounded-xl border border-border dark:border-slate-600 py-3 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const name = addingPot ? newPotName.trim() : editPotName.trim();
                      const targetStr = addingPot ? newPotTarget : editPotTarget;
                      const targetNum = parseAmountInput(targetStr);
                      if (!name) {
                        showToast("Isi nama celengan", "error");
                        return;
                      }
                      if (!targetNum || targetNum <= 0) {
                        showToast("Isi target (Rp) dengan nominal lebih dari 0", "error");
                        return;
                      }
                      if (addingPot) {
                        const { error: err } = await supabase.from("savings_pots").insert({
                          user_id: userId,
                          name,
                          target_amount: targetNum,
                          sort_order: pots.length,
                          photo: newPotPhoto || null,
                          description: newPotDescription.trim() || null,
                        });
                        if (!err) {
                          setNewPotName("");
                          setNewPotTarget("");
                          setNewPotPhoto(null);
                          setNewPotDescription("");
                          setAddingPot(false);
                          showToast("Celengan ditambah");
                          fetchPots();
                        } else showToast(err.message, "error");
                      } else if (editingPot) {
                        const { error: err } = await supabase
                          .from("savings_pots")
                          .update({
                            name,
                            target_amount: targetNum,
                            photo: editPotPhoto || null,
                            description: editPotDescription.trim() || null,
                          })
                          .eq("id", editingPot.id)
                          .eq("user_id", userId);
                        if (!err) {
                          setEditingPot(null);
                          showToast("Celengan diperbarui");
                          fetchPots();
                        } else showToast(err.message, "error");
                      }
                    }}
                    className="flex-1 min-h-[48px] rounded-xl bg-primary py-3 font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover hover:shadow-primary/30 transition active:scale-[0.98]"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Setor/Tarik (kiri) | Pindahkan uang (kanan) — desktop: dua card samping-samping */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 p-4 shadow-card sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">Setor / Tarik</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {(pots.length > 0) && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Celengan</label>
              <select
                value={selectedPotId ?? "__umum__"}
                onChange={(e) => setSelectedPotId(e.target.value === "__umum__" ? null : e.target.value)}
                className="w-full min-h-[48px] rounded-xl border border-border dark:border-slate-600 bg-card dark:bg-slate-700 px-4 py-3 text-slate-800 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="__umum__">Umum</option>
                {pots.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-700 p-1">
            <button
              type="button"
              onClick={() => { setType("deposit"); setError(""); }}
              className={`flex-1 min-h-[48px] rounded-lg py-3 sm:py-2 text-sm font-medium transition ${type === "deposit" ? "bg-card dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow dark:text-primary" : "text-muted dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
            >
              Setor
            </button>
            <button
              type="button"
              onClick={() => { setType("withdraw"); setError(""); }}
              className={`flex-1 min-h-[48px] rounded-lg py-3 sm:py-2 text-sm font-medium transition ${type === "withdraw" ? "bg-card dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow dark:text-primary" : "text-muted dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
            >
              Tarik
            </button>
          </div>
          <div>
            <label htmlFor="tabungan-amount" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Jumlah (Rp)
            </label>
            <input
              id="tabungan-amount"
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0"
              className="w-full min-h-[48px] rounded-xl border border-border dark:border-slate-600 bg-card dark:bg-slate-700 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label htmlFor="tabungan-note" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Catatan (opsional)
            </label>
            <input
              id="tabungan-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Mis. dari gaji bulanan"
              className="w-full min-h-[48px] rounded-xl border border-border dark:border-slate-600 bg-card dark:bg-slate-700 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {error && <p className="text-sm text-expense">{error}</p>}
          <button
            type="submit"
            disabled={submitLoading}
            className="w-full min-h-[48px] rounded-xl bg-primary py-3.5 font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-hover hover:shadow-primary/30 disabled:opacity-50 active:scale-[0.98]"
          >
            {submitLoading ? "Menyimpan..." : type === "deposit" ? "Setor" : "Tarik"}
          </button>
        </form>
      </section>

      {/* Card kanan: Pindahkan uang — hanya tampil kalau ada minimal 1 celengan selain Umum */}
      {pots.length > 0 ? (
        <section className="rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 p-4 shadow-card sm:p-6">
          <h2 className="mb-2 text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">Pindahkan uang</h2>
          <p className="mb-4 text-sm text-muted dark:text-slate-400">
            Pindah dari satu celengan ke celengan lain tanpa tarik dulu. Contoh: dari Umum ke Dana darurat.
          </p>
          <form onSubmit={handleTransfer} className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-2">
              <div className="min-w-0 flex-1">
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Dari</label>
                <select
                  value={transferFrom}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTransferFrom(v);
                    if (transferTo === v) setTransferTo(v === "__umum__" ? (pots[0]?.id ?? "") : "__umum__");
                  }}
                  className="w-full min-h-[48px] rounded-xl border border-border dark:border-slate-600 bg-card dark:bg-slate-700 px-4 py-3 text-slate-800 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="__umum__">Umum</option>
                  {pots.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!transferTo || transferFrom === transferTo) return;
                  setTransferFrom(transferTo);
                  setTransferTo(transferFrom);
                  setTransferError("");
                }}
                className="flex h-12 w-12 shrink-0 items-center justify-center self-center rounded-xl border border-border dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 hover:text-primary dark:hover:bg-slate-600 dark:hover:text-primary transition active:scale-95 sm:self-end sm:mb-0.5"
                title="Tukar Dari ↔ Ke"
                aria-label="Tukar Dari dan Ke"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
              <div className="min-w-0 flex-1">
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Ke</label>
                <select
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  className="w-full min-h-[48px] rounded-xl border border-border dark:border-slate-600 bg-card dark:bg-slate-700 px-4 py-3 text-slate-800 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">— Pilih —</option>
                  {transferFrom !== "__umum__" && <option value="__umum__">Umum</option>}
                  {pots.filter((p) => p.id !== transferFrom).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="transfer-amount" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Jumlah (Rp)</label>
              <input
                id="transfer-amount"
                type="text"
                inputMode="numeric"
                value={transferAmount}
                onChange={(e) => setTransferAmount(formatAmountDisplay(e.target.value))}
                placeholder="0"
                className="w-full min-h-[48px] rounded-xl border border-border dark:border-slate-600 bg-card dark:bg-slate-700 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {transferError && <p className="text-sm text-expense">{transferError}</p>}
            <button
              type="submit"
              disabled={transferLoading}
              className="w-full min-h-[48px] rounded-xl bg-primary py-3.5 font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-hover hover:shadow-primary/30 disabled:opacity-50 active:scale-[0.98]"
            >
              {transferLoading ? "Memindahkan..." : "Pindahkan"}
            </button>
          </form>
        </section>
      ) : null}
      </div>

      {/* Pengingat setor — full width seperti semula */}
      {reminder && (
        <section className="rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 p-4 shadow-card sm:p-6">
          <h2 className="mb-1 text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">Pengingat setor</h2>
          <p className="mb-4 text-sm text-muted dark:text-slate-400">
            Kalau akun Telegram sudah di-link, kamu akan dapat pesan pengingat di Telegram setiap hari yang kamu pilih. Isi pesan: saldo tabungan + ajakan setor (lewat bot atau dashboard).
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={reminder.enabled}
                onChange={async (e) => {
                  const enabled = e.target.checked;
                  setReminder((r) => r ? { ...r, enabled } : { user_id: userId, enabled, day_of_week: 1 });
                  const { error: err } = await supabase.from("savings_reminders").upsert({ user_id: userId, enabled, day_of_week: reminder?.day_of_week ?? 1, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
                  if (!err) showToast(enabled ? "Pengingat diaktifkan" : "Pengingat dimatikan");
                }}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-slate-700 dark:text-slate-200">Kirim pengingat ke Telegram</span>
            </label>
            {reminder.enabled && (
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span>Setiap</span>
                <select
                  value={reminder.day_of_week}
                  onChange={async (e) => {
                    const day = Number(e.target.value);
                    setReminder((r) => r ? { ...r, day_of_week: day } : null);
                    await supabase.from("savings_reminders").upsert({ user_id: userId, enabled: true, day_of_week: day, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
                  }}
                  aria-label="Hari pengingat"
                  className="rounded-lg border border-border dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2"
                >
                  {DAY_NAMES.map((name, i) => (
                    <option key={i} value={i}>{name}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </section>
      )}

      {/* Riwayat — format table sama seperti daftar transaksi; entri pindah uang tidak ditampilkan */}
      <section className="rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 p-4 shadow-card sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">Riwayat</h2>
        {entriesForRiwayat.length === 0 ? (
          <EmptyState
            icon="savings"
            title="Belum ada setor/tarik"
            description="Mulai dari form di atas untuk menabung. Saldo akan tercatat di sini. (Pindah uang antar celengan tidak muncul di sini.)"
          />
        ) : (
          <>
            {(() => {
              const safeRiwayatPage = Math.min(riwayatPage, totalRiwayatPages);
              const paginatedEntries = entriesForRiwayat.slice(
                (safeRiwayatPage - 1) * RIWAYAT_PAGE_SIZE,
                safeRiwayatPage * RIWAYAT_PAGE_SIZE
              );
              return (
                <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-muted dark:text-slate-400">
                Menampilkan{" "}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {(safeRiwayatPage - 1) * RIWAYAT_PAGE_SIZE + 1}–{(safeRiwayatPage - 1) * RIWAYAT_PAGE_SIZE + paginatedEntries.length}
                </span>{" "}
                dari <span className="font-medium text-slate-700 dark:text-slate-300">{entriesForRiwayat.length}</span> riwayat
              </span>
            </div>
            <div className="-mx-1 overflow-x-auto overflow-touch rounded-2xl border border-border dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 shadow-card scrollbar-thin sm:mx-0" style={{ WebkitOverflowScrolling: "touch" }}>
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-border dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/50 text-left text-muted dark:text-slate-400">
                    <th className="px-3 py-3 font-medium sm:px-4 sm:py-3.5">Tanggal</th>
                    <th className="px-3 py-3 font-medium sm:px-4 sm:py-3.5">Tipe</th>
                    <th className="px-3 py-3 font-medium sm:px-4 sm:py-3.5">Jumlah</th>
                    <th className="px-3 py-3 font-medium sm:px-4 sm:py-3.5">Catatan</th>
                    <th className="w-20 px-3 py-3 text-right font-medium sm:w-24 sm:px-4 sm:py-3.5">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-border dark:border-slate-600 last:border-0 transition hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                      <td className="whitespace-nowrap px-3 py-3 text-slate-700 dark:text-slate-300 sm:px-4 sm:py-3.5">{formatDate(entry.created_at)}</td>
                      <td className="px-3 py-3 sm:px-4 sm:py-3.5">
                        <span className={`font-medium ${entry.type === "deposit" ? "text-income" : "text-expense"}`}>
                          {entry.type === "deposit" ? "Setor" : "Tarik"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-medium tabular-nums sm:px-4 sm:py-3.5">
                        <span className={entry.type === "deposit" ? "text-income" : "text-expense"}>
                          {entry.type === "deposit" ? "+" : "-"}
                          {formatCurrency(Number(entry.amount))}
                        </span>
                      </td>
                      <td className="max-w-[120px] truncate px-3 py-3 text-slate-600 dark:text-slate-400 sm:max-w-[200px] sm:px-4 sm:py-3.5">{entry.note || "—"}</td>
                      <td className="px-2 py-3 text-right sm:px-4 sm:py-3.5">
                        <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingEntry(entry)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-600 dark:text-slate-400 dark:hover:text-primary transition active:scale-95"
                            title="Edit"
                            aria-label="Edit"
                          >
                            <svg className="h-5 w-5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingEntry(entry)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted hover:bg-red-50 hover:text-expense dark:hover:bg-slate-600 dark:text-slate-400 dark:hover:text-expense transition active:scale-95"
                            title="Hapus"
                            aria-label="Hapus"
                          >
                            <svg className="h-5 w-5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {entriesForRiwayat.length > 0 && totalRiwayatPages > 1 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border dark:border-slate-600 pt-4">
                <p className="text-sm text-muted dark:text-slate-400">
                  Halaman {safeRiwayatPage} dari {totalRiwayatPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRiwayatPage((p) => Math.max(1, p - 1))}
                    disabled={safeRiwayatPage <= 1}
                    className="min-h-[44px] rounded-xl border border-border dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:pointer-events-none transition"
                  >
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    onClick={() => setRiwayatPage((p) => Math.min(totalRiwayatPages, p + 1))}
                    disabled={safeRiwayatPage >= totalRiwayatPages}
                    className="min-h-[44px] rounded-xl border border-border dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:pointer-events-none transition"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
                </>
              );
            })()}
          </>
        )}
      </section>

      <EditSavingsEntryModal
        entry={editingEntry}
        pots={pots}
        onClose={() => setEditingEntry(null)}
        onSave={handleEdit}
      />
      <ConfirmModal
        open={!!deletingEntry}
        title="Hapus riwayat ini?"
        description="Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Ya, hapus"
        cancelLabel="Batal"
        variant="danger"
        loading={deleteLoading}
        onClose={() => setDeletingEntry(null)}
        onConfirm={async () => {
          if (!deletingEntry) return;
          setDeleteLoading(true);
          try {
            await handleDelete(deletingEntry.id);
            setDeletingEntry(null);
          } finally {
            setDeleteLoading(false);
          }
        }}
      >
        {deletingEntry && (
          <div className="rounded-xl border border-border dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {deletingEntry.type === "deposit" ? "Setor" : "Tarik"}{" "}
              {formatCurrency(Number(deletingEntry.amount))}
            </p>
            {deletingEntry.note && (
              <p className="mt-0.5 text-sm text-muted dark:text-slate-400">{deletingEntry.note}</p>
            )}
          </div>
        )}
      </ConfirmModal>

      <ConfirmModal
        open={!!potToDelete}
        title="Hapus celengan ini?"
        description="Riwayat setor/tarik di celengan ini akan dipindahkan ke Umum."
        confirmLabel="Ya, hapus"
        cancelLabel="Batal"
        variant="danger"
        loading={deletePotLoading}
        onClose={() => setPotToDelete(null)}
        onConfirm={async () => {
          if (!potToDelete) return;
          setDeletePotLoading(true);
          try {
            const { error: err } = await supabase
              .from("savings_pots")
              .delete()
              .eq("id", potToDelete.id)
              .eq("user_id", userId);
            if (err) throw err;
            if (selectedPotId === potToDelete.id) setSelectedPotId(null);
            setPotToDelete(null);
            showToast("Celengan dihapus");
            fetchPots();
            fetchEntries();
          } catch {
            showToast("Gagal menghapus celengan", "error");
          } finally {
            setDeletePotLoading(false);
          }
        }}
      >
        {potToDelete && (
          <div className="rounded-xl border border-border dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {potToDelete.name}
            </p>
            <p className="mt-0.5 text-sm text-muted dark:text-slate-400">
              Saldo: {formatCurrency(balanceByPot[potToDelete.id] ?? 0)}
            </p>
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
