"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, formatShortDate, parseAmountInput, formatAmountDisplay } from "@/lib/utils";
import { useToast } from "@/components/ToastContext";
import { ConfirmModal } from "@/components/ConfirmModal";
import { CountUp } from "@/components/CountUp";
import { SkeletonCard, Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { EditSavingsEntryModal } from "@/components/EditSavingsEntryModal";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend as ReLegend } from "recharts";
import { SelectDropdown } from "./SelectDropdown";

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
  initialTelegramLinked?: boolean;
}

export function TabunganContent({ userId, initialTelegramLinked = false }: TabunganContentProps) {
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
  const [activeTab, setActiveTab] = useState<"setor" | "pindah">("setor");
  const [isTelegramLinked, setIsTelegramLinked] = useState<boolean>(initialTelegramLinked);
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

  const fetchProfile = useCallback(async () => {
    // telegram_links has RLS blocking client reads, use server API instead
    try {
      const res = await fetch("/api/telegram/status");
      if (res.ok) {
        const json = await res.json();
        setIsTelegramLinked(json.linked === true);
      }
    } catch { /* ignore */ }
  }, []);

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
      fetchProfile().catch(() => setIsTelegramLinked(false)),
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
    const channelProfile = supabase
      .channel(`telegram_links:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "telegram_links", filter: `user_id=eq.${userId}` },
        fetchProfile
      )
      .subscribe();

    // Polling fallback every 3s if not linked, because RLS might block postgres_changes
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    if (!isTelegramLinked) {
      pollTimer = setInterval(() => {
        fetchProfile();
      }, 3000);
    }

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      supabase.removeChannel(channelPots);
      supabase.removeChannel(channelProfile);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [fetchEntries, fetchPots, fetchReminder, fetchProfile, supabase, userId, isTelegramLinked]);

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

  async function handleReorder(potId: string, direction: "up" | "down") {
    const idx = pots.findIndex((p) => p.id === potId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= pots.length) return;

    const potA = pots[idx];
    const potB = pots[targetIdx];

    // Optimistic update
    const newPots = [...pots];
    newPots[idx] = { ...potB, sort_order: potA.sort_order };
    newPots[targetIdx] = { ...potA, sort_order: potB.sort_order };
    setPots(newPots);

    try {
      const { error: err1 } = await supabase
        .from("savings_pots")
        .update({ sort_order: potB.sort_order })
        .eq("id", potA.id);
      const { error: err2 } = await supabase
        .from("savings_pots")
        .update({ sort_order: potA.sort_order })
        .eq("id", potB.id);
      if (err1 || err2) throw err1 || err2;
    } catch {
      showToast("Gagal mengubah urutan", "error");
      fetchPots();
    }
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
          <svg className="h-5 w-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span><strong>Pengingat setor:</strong> Jangan lupa setor tabungan hari ini. Kamu juga dapat pesan di Telegram kalau akun sudah di-link.</span>
        </div>
      )}

      {/* Overview Section: Stats + Distribution Chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-8 flex flex-col gap-4 h-full">
          <section className="flex-1 relative overflow-hidden rounded-[2.5rem] border border-primary/20 dark:border-primary/40 bg-white dark:bg-slate-900 p-6 shadow-glow dark:shadow-glow-dark transition-all hover:shadow-2xl sm:p-8 flex flex-col justify-center group">
            {/* Premium Decorative Blobs */}
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/20 dark:bg-primary/30 blur-[100px] pointer-events-none transition-transform group-hover:scale-110" aria-hidden />
            <div className="absolute -left-20 -bottom-20 h-48 w-48 rounded-full bg-primary/10 dark:bg-primary/20 blur-[80px] pointer-events-none transition-transform group-hover:scale-110" aria-hidden />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-sm font-bold uppercase tracking-[0.15em] text-primary/80 dark:text-sky-400/80">Total Saldo Tabungan</p>
                <div className={`mt-1 sm:mt-2 flex items-baseline gap-2 text-2xl sm:text-4xl lg:text-5xl font-black tabular-nums tracking-tighter break-words ${totalBalance >= 0 ? "text-slate-900 dark:text-white" : "text-expense"}`}>
                  <CountUp value={totalBalance} formatter={(n) => formatCurrency(n)} />
                </div>
                <p className="mt-2 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 opacity-90">
                  <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                  Seluruh tabungan di semua celengan
                </p>
              </div>
              <div className="hidden xs:flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-soft ring-1 ring-black/5 dark:ring-white/5">
                <svg className="h-6 w-6 sm:h-8 sm:w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <section className="group relative overflow-hidden rounded-2xl border border-border/50 dark:border-slate-700/50 bg-card dark:bg-slate-800/50 p-5 shadow-soft transition-all hover:shadow-card-hover hover:-translate-y-1">
              <div className="absolute right-0 top-0 h-16 w-16 translate-x-4 -translate-y-4 rounded-full bg-income/5 transition-transform group-hover:scale-150" />
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted dark:text-slate-400">Total Setor</p>
                  <p className="mt-1 text-lg sm:text-2xl font-black tabular-nums text-income break-words leading-tight">
                    <CountUp value={totalSetor} formatter={(n) => formatCurrency(n)} />
                  </p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-income/10 text-income ring-1 ring-income/20">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </section>

            <section className="group relative overflow-hidden rounded-2xl border border-border/50 dark:border-slate-700/50 bg-card dark:bg-slate-800/50 p-5 shadow-soft transition-all hover:shadow-card-hover hover:-translate-y-1">
              <div className="absolute right-0 top-0 h-16 w-16 translate-x-4 -translate-y-4 rounded-full bg-expense/5 transition-transform group-hover:scale-150" />
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted dark:text-slate-400">Total Tarik</p>
                  <p className="mt-1 text-lg sm:text-2xl font-black tabular-nums text-expense break-words leading-tight">
                    <CountUp value={totalTarik} formatter={(n) => formatCurrency(n)} />
                  </p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-expense/10 text-expense ring-1 ring-expense/20">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Distribution Chart */}
        <section className="lg:col-span-4 flex flex-col rounded-[2rem] border border-border/50 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-6 backdrop-blur-xl shadow-xl relative overflow-hidden group">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform" />
          <h3 className="relative z-10 text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-4">Distribusi Celengan</h3>
          <div className="flex-1 min-h-[220px] relative">
            {totalBalance > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Umum", value: Math.max(0, balanceByPot["__umum__"] ?? 0) },
                      ...pots.map(p => ({ name: p.name, value: Math.max(0, balanceByPot[p.id] ?? 0) }))
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {[
                      "#0ea5e9", // primary
                      "#059669", // income
                      "#8b5cf6", // purple
                      "#f59e0b", // amber
                      "#ec4899", // pink
                      "#06b6d4", // cyan
                    ].map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <ReTooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: "#1e293b"
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-40">
                <div className="h-16 w-16 rounded-full border-4 border-dashed border-slate-300 dark:border-slate-600 animate-[spin_10s_linear_infinite]" />
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Belum ada saldo</p>
              </div>
            )}
          </div>
          {totalBalance > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-2 gap-x-4 gap-y-2">
              {[
                { name: "Umum", val: Math.max(0, balanceByPot["__umum__"] ?? 0), color: "#0ea5e9" },
                ...pots.map((p, i) => ({
                  name: p.name,
                  val: Math.max(0, balanceByPot[p.id] ?? 0),
                  color: ["#059669", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4", "#10b981", "#6366f1", "#f43f5e"][(i % 8)]
                }))
              ].filter(item => item.val > 0).map((item, i) => (
                <div key={i} className="flex items-center gap-2 min-w-0 group/item transition-all hover:translate-x-1">
                  <div className="h-2 w-2 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.1)]" style={{ backgroundColor: item.color }} />
                  <span className="text-[9px] sm:text-[10px] font-black text-slate-500 dark:text-slate-400 truncate uppercase tracking-tighter leading-none">
                    {item.name}: {((item.val / totalBalance) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Celengan */}
      <section className="rounded-[2.5rem] border border-border/50 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xl relative group">
        <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] pointer-events-none">
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-primary/5 rounded-full blur-[100px] opacity-50 transition-transform group-hover:scale-125" />
        </div>
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex flex-col">
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl uppercase tracking-tighter">Celengan</h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">Tempat menabung untuk mimpi-mimpimu</p>
          </div>
          <button
            type="button"
            onClick={() => setAddingPot(true)}
            className="group flex items-center gap-2 rounded-2xl bg-primary/10 dark:bg-primary/20 px-4 py-2 text-sm font-bold text-primary transition-all hover:bg-primary hover:text-white"
          >
            <span className="text-lg transition-transform group-hover:rotate-90">+</span>
            Tambah
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            className={`group relative overflow-hidden rounded-2xl border-2 p-5 transition-all cursor-pointer ${selectedPotId === null ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-glow dark:shadow-glow-dark" : "border-transparent bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            onClick={() => setSelectedPotId(null)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setSelectedPotId(null)}
          >
            <div className={`absolute right-0 top-0 h-16 w-16 translate-x-4 -translate-y-4 rounded-full bg-primary/10 blur-xl transition-opacity ${selectedPotId === null ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
            <div className="relative flex flex-col h-full justify-between gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white dark:bg-slate-700 shadow-soft text-primary">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  </span>
                  {selectedPotId === null && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                </div>
                <h3 className="mt-3 font-bold text-slate-900 dark:text-white">Umum</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Saldo tabungan utama kamu</p>
              </div>
              <div className="flex items-baseline gap-1 mt-auto">
                <span className={`text-xl font-black tabular-nums ${(balanceByPot["__umum__"] ?? 0) >= 0 ? "text-income" : "text-expense"}`}>
                  {formatCurrency(balanceByPot["__umum__"] ?? 0)}
                </span>
              </div>
            </div>
          </div>
          {pots.map((pot) => {
            const bal = balanceByPot[pot.id] ?? 0;
            const target = pot.target_amount != null ? Number(pot.target_amount) : null;
            const pct = target != null && target > 0 ? Math.min(100, (bal / target) * 100) : null;
            const isSelected = selectedPotId === pot.id;
            
            return (
              <div
                key={pot.id}
                className={`group relative overflow-hidden rounded-2xl border-2 p-5 transition-all cursor-pointer ${isSelected ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-glow dark:shadow-glow-dark" : "border-transparent bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                onClick={() => setSelectedPotId(pot.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSelectedPotId(pot.id)}
              >
                <div className={`absolute right-0 top-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-primary/5 blur-xl transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
                <div className="relative flex flex-col h-full gap-3">
                  <div className="flex items-start justify-between">
                    {pot.photo ? (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-slate-700 shadow-soft border border-white/20">
                        <img src={pot.photo} alt="" decoding="async" className="h-full w-full object-contain" />
                      </span>
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-700 shadow-soft text-primary">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </span>
                    )}
                    <div className="flex items-center gap-1">
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
                        className="rounded-lg p-2 text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-primary transition-all"
                        title="Edit celengan"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPotToDelete(pot); }}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 dark:hover:bg-slate-700 hover:text-expense transition-all"
                        title="Hapus celengan"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white truncate">{pot.name}</h3>
                    {pot.description && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 italic">{pot.description}</p>}
                    <p className={`mt-2 text-xl font-black tabular-nums ${bal >= 0 ? "text-income" : "text-expense"}`}>
                      {formatCurrency(bal)}
                    </p>
                  </div>
                  {target != null && target > 0 && (
                    <div className="mt-auto pt-2">
                       <div className="flex justify-between items-center mb-1.5 px-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Progres: {pct?.toFixed(0)}%</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Target: {formatCurrency(target)}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shadow-inner">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${pct && pct >= 100 ? "bg-income" : "bg-primary"}`} 
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Tambah / Edit celengan */}
        {(addingPot || editingPot) && typeof document !== "undefined" && createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 cursor-default">
            <div
              className="absolute inset-0 bg-slate-900/60 dark:bg-black/90 backdrop-blur-md animate-fade-in"
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
              className="relative w-full max-w-lg max-h-[95vh] flex flex-col bg-white/95 dark:bg-slate-900/95 border border-white/20 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" aria-hidden />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" aria-hidden />

              <div className="relative z-10 flex items-center justify-between p-6 sm:p-8 pb-4">
                <div className="space-y-0.5">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-tight">
                    {addingPot ? "Tambah Celengan" : "Edit"}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Atur target keuangan barumu</p>
                </div>
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
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="relative z-10 flex-1 overflow-y-auto px-6 sm:px-8 pb-4 custom-scrollbar">
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 ml-1">Nama Celengan</label>
                    <input
                      type="text"
                      value={addingPot ? newPotName : editPotName}
                      onChange={(e) => addingPot ? setNewPotName(e.target.value) : setEditPotName(e.target.value)}
                      placeholder="Mis. Dana Darurat"
                      className="w-full h-12 sm:h-14 rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 px-5 text-slate-900 dark:text-white font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all outline-none text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 ml-1">Target Menabung (Rp)</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-base sm:text-lg font-black text-slate-400">Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={addingPot ? newPotTarget : editPotTarget}
                        onChange={(e) => {
                          const v = formatAmountDisplay(e.target.value);
                          addingPot ? setNewPotTarget(v) : setEditPotTarget(v);
                        }}
                        placeholder="0"
                        className="w-full h-14 sm:h-16 pl-14 pr-5 rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-xl sm:text-2xl font-black tabular-nums text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                       <label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 ml-1">Foto Celengan</label>
                       <div className="flex items-center gap-4">
                        <label className="relative group cursor-pointer shrink-0">
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
                            className="sr-only"
                          />
                          <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-all group-hover:bg-primary/5 shadow-inner">
                            {(addingPot ? newPotPhoto : editPotPhoto) ? (
                               <img src={addingPot ? newPotPhoto! : editPotPhoto!} alt="" className="h-full w-full object-cover rounded-[14px]" />
                            ) : (
                               <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            )}
                          </div>
                          {(addingPot ? newPotPhoto : editPotPhoto) && (
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); addingPot ? setNewPotPhoto(null) : setEditPotPhoto(null); }}
                              className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-transform hover:scale-110"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </label>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 leading-tight">Klik ikon untuk<br />upload foto</p>
                       </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 ml-1">Deskripsi</label>
                      <textarea
                        value={addingPot ? newPotDescription : editPotDescription}
                        onChange={(e) => addingPot ? setNewPotDescription(e.target.value) : setEditPotDescription(e.target.value)}
                        placeholder="Catatan..."
                        rows={1}
                        className="w-full h-16 rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 px-5 pt-4 text-slate-900 dark:text-white font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 p-6 sm:p-8 pt-2 flex gap-3">
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
                  className="flex-1 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-transparent text-slate-500 dark:text-slate-400 text-[10px] font-black tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase"
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
                  className="flex-1 h-12 rounded-2xl bg-primary text-white font-black tracking-[0.2em] shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-95 transition-all text-[10px] uppercase"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

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
      </section>

      {/* Aksi Cepat / Tabbed Actions */}
      <section className="overflow-hidden rounded-[2.5rem] border border-border/50 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl relative">
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="flex border-b border-border/50 dark:border-slate-700 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("setor")}
            className={`flex flex-1 items-center justify-center gap-2 px-6 py-4 text-sm font-bold transition-all whitespace-nowrap ${activeTab === "setor" ? "bg-primary/5 text-primary border-b-2 border-primary" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
          >
            Setor & Tarik
          </button>
          {pots.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("pindah")}
              className={`flex flex-1 items-center justify-center gap-2 px-6 py-4 text-sm font-bold transition-all whitespace-nowrap ${activeTab === "pindah" ? "bg-primary/5 text-primary border-b-2 border-primary" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
            >
              Pindah Saldo
            </button>
          )}
        </div>

        <div className="p-6">
          {activeTab === "setor" ? (
            <div>
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Setor atau Tarik</h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pilih celengan dan masukkan nominal yang diinginkan.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Pilih Celengan</label>
                      <SelectDropdown
                        value={selectedPotId ?? "__umum__"}
                        onChange={(val) => setSelectedPotId(val === "__umum__" ? null : val)}
                        options={[
                          { value: "__umum__", label: "UMUM" },
                          ...pots.map(p => ({ value: p.id, label: p.name.toUpperCase() }))
                        ]}
                        placeholder="Pilih Celengan"
                        className="w-full h-14"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Tipe Transaksi</label>
                      <div className="flex h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 p-1.5">
                        <button
                          type="button"
                          onClick={() => { setType("deposit"); setError(""); }}
                          className={`flex-1 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${type === "deposit" ? "bg-white dark:bg-slate-600 text-income shadow-sm ring-1 ring-black/10 dark:ring-white/20" : "text-slate-500 dark:text-slate-400"}`}
                        >
                          Setor
                        </button>
                        <button
                          type="button"
                          onClick={() => { setType("withdraw"); setError(""); }}
                          className={`flex-1 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${type === "withdraw" ? "bg-white dark:bg-slate-600 text-expense shadow-sm ring-1 ring-black/10 dark:ring-white/20" : "text-slate-500 dark:text-slate-400"}`}
                        >
                          Tarik
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="relative group">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Nominal (Rp)</label>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">Rp</span>
                       <input
                        type="text"
                        inputMode="numeric"
                        value={amount}
                        onChange={handleAmountChange}
                        placeholder="0"
                        className="w-full h-16 pl-14 pr-4 rounded-2xl border border-border dark:border-slate-600 bg-white dark:bg-slate-800 text-2xl font-black tabular-nums text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Catatan (Opsional)</label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Mis: Tabungan gajian"
                      className="w-full h-14 px-4 rounded-2xl border border-border dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-expense/10 text-expense text-xs font-bold animate-pulse">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitLoading}
                    className={`relative w-full h-16 rounded-2xl font-black text-white shadow-lg overflow-hidden transition-all active:scale-[0.98] disabled:opacity-50 ${type === "deposit" ? "bg-income shadow-income/25 hover:brightness-110" : "bg-expense shadow-expense/25 hover:brightness-110"}`}
                  >
                    <span className="relative z-10">{submitLoading ? "Sedang Proses..." : (type === "deposit" ? "KONFIRMASI SETOR" : "KONFIRMASI TARIK")}</span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full transition-transform hover:translate-y-0" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Pindahkan Saldo</h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Atur distribusi uangmu langsung antar celengan.</p>
                </div>

                <form onSubmit={handleTransfer} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-5">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Dari</label>
                      <SelectDropdown
                        value={transferFrom}
                        onChange={(v) => {
                          setTransferFrom(v);
                          if (transferTo === v) setTransferTo(v === "__umum__" ? (pots[0]?.id ?? "") : "__umum__");
                        }}
                        options={[
                          { value: "__umum__", label: "UMUM" },
                          ...pots.map(p => ({ value: p.id, label: p.name.toUpperCase() }))
                        ]}
                        placeholder="Dari"
                        className="w-full h-14"
                      />
                    </div>

                    <div className="md:col-span-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (!transferTo || transferFrom === transferTo) return;
                          setTransferFrom(transferTo);
                          setTransferTo(transferFrom);
                          setTransferError("");
                        }}
                        className="h-14 w-14 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 flex items-center justify-center transition-all hover:rotate-180 active:scale-90"
                      >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                      </button>
                    </div>

                    <div className="md:col-span-5">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Ke</label>
                      <SelectDropdown
                        value={transferTo}
                        onChange={setTransferTo}
                        options={[
                          { value: "", label: "— PILIH TUJUAN —" },
                          ...(transferFrom !== "__umum__" ? [{ value: "__umum__", label: "UMUM" }] : []),
                          ...pots.filter(p => p.id !== transferFrom).map(p => ({ value: p.id, label: p.name.toUpperCase() }))
                        ]}
                        placeholder="Ke"
                        className="w-full h-14"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Nominal Transfer (Rp)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(formatAmountDisplay(e.target.value))}
                        placeholder="0"
                        className="w-full h-16 pl-14 pr-4 rounded-2xl border border-border dark:border-slate-600 bg-white dark:bg-slate-800 text-2xl font-black tabular-nums text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                    </div>
                  </div>

                  {transferError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-expense/10 text-expense text-xs font-bold uppercase">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {transferError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={transferLoading}
                    className="w-full h-16 rounded-2xl bg-primary shadow-lg shadow-primary/25 font-black text-white text-lg tracking-widest hover:bg-primary-hover transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {transferLoading ? "PROSES TRANSFER..." : "PINDAHKAN SALDO"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Pengingat setor */}
      {reminder && (
        <section className="group relative overflow-hidden rounded-[2.5rem] border border-border/50 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl transition-all hover:shadow-2xl">
          <div className="absolute right-0 top-0 h-48 w-48 translate-x-12 -translate-y-12 rounded-full bg-primary/10 blur-[80px] pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="absolute left-0 bottom-0 h-32 w-32 -translate-x-8 translate-y-8 rounded-full bg-emerald-500/5 blur-[60px] pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Pengingat Setor</h2>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                Aktifkan pengingat otomatis ke Telegram agar tabunganmu terus tumbuh. Kami akan mengirimkan ringkasan saldo dan ajakan setor pada hari yang kamu tentukan.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {!isTelegramLinked ? (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                   <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-orange-100/50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      Belum Terhubung
                   </div>
                   <a 
                    href="/link-telegram" 
                    className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#24A1DE] text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-sky-500/20 hover:scale-[1.05] active:scale-95 transition-all text-center"
                   >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zM17.8 8.16l-1.9 8.93c-.14.64-.52.8-.2.25l-2.9-2.14-1.4 1.35c-.15.15-.28.28-.57.28l.2-2.94 5.36-4.84c.23-.2-.05-.31-.35-.11l-6.63 4.17-2.85-.89c-.62-.2-.63-.62.13-.91l11.12-4.29c.51-.19.96.11.7.9l.2.49z" /></svg>
                    LINK TELEGRAM
                   </a>
                </div>
              ) : (
                <div className="w-full lg:w-auto flex flex-col lg:flex-row items-stretch lg:items-center gap-2 lg:gap-0 p-1.5 lg:p-2 rounded-[2rem] lg:rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/20">
                  <label className="flex-1 lg:flex-none relative inline-flex items-center justify-between lg:justify-start cursor-pointer group/toggle px-4 lg:px-5 py-3 lg:py-2.5 rounded-2xl lg:rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-all">
                    <input
                      type="checkbox"
                      checked={reminder.enabled}
                      onChange={async (e) => {
                        const enabled = e.target.checked;
                        setReminder((r) => r ? { ...r, enabled } : { user_id: userId, enabled, day_of_week: 1 });
                        const { error: err } = await supabase.from("savings_reminders").upsert({ user_id: userId, enabled, day_of_week: reminder?.day_of_week ?? 1, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
                        if (!err) showToast(enabled ? "Pengingat diaktifkan" : "Pengingat dimatikan");
                      }}
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary" />
                    <span className="ml-4 text-[10px] lg:text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors whitespace-nowrap">Pengingat {reminder.enabled ? "Aktif" : "Mati"}</span>
                  </label>

                  {reminder.enabled && (
                    <div className="flex-1 lg:flex-none flex items-center justify-between lg:justify-start gap-4 border-t lg:border-t-0 lg:border-l border-border/20 dark:border-slate-700 mt-1 lg:mt-0 pt-3 lg:pt-0 pb-1.5 lg:pb-0 px-4 lg:pl-8 lg:pr-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Setiap Hari</span>
                      <SelectDropdown
                        value={String(reminder.day_of_week)}
                        onChange={(v) => {
                          const day = Number(v);
                          setReminder((r) => r ? { ...r, day_of_week: day } : null);
                          supabase.from("savings_reminders").upsert({ user_id: userId, enabled: true, day_of_week: day, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
                        }}
                        options={DAY_NAMES.map((name, i) => ({ value: String(i), label: name.toUpperCase() }))}
                        placeholder="Hari"
                        buttonClassName="!border-none !bg-transparent !shadow-none hover:!bg-slate-200/50 dark:hover:!bg-slate-800/50 !min-w-[120px] !h-10"
                        hideAllOption={true}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Riwayat */}
      <section className="rounded-[2.5rem] border border-border/50 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 sm:p-10 shadow-2xl relative group">
        <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-[120px] group-hover:scale-110 transition-transform" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Riwayat Aktivitas</h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">Pantau mutasi saldo tabunganmu</p>
          </div>
          {entriesForRiwayat.length > 0 && (
            <div className="px-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/20 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Total {entriesForRiwayat.length} Rekaman
            </div>
          )}
        </div>

        {entriesForRiwayat.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon="savings"
              title="Belum Ada Aktivitas"
              description="Mulailah menabung hari ini. Setoran pertama kamu akan muncul di sini."
            />
          </div>
        ) : (
          <div className="space-y-6">
            {(() => {
              const safeRiwayatPage = Math.min(riwayatPage, totalRiwayatPages);
              const paginatedEntries = entriesForRiwayat.slice(
                (safeRiwayatPage - 1) * RIWAYAT_PAGE_SIZE,
                safeRiwayatPage * RIWAYAT_PAGE_SIZE
              );
              return (
                <>
                  <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-border/50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-slate-400">
                          <th className="px-4 py-4 font-black text-[10px] uppercase tracking-[0.2em] first:rounded-tl-2xl">Tanggal</th>
                          <th className="px-4 py-4 font-black text-[10px] uppercase tracking-[0.2em]">Tipe</th>
                          <th className="px-4 py-4 font-black text-[10px] uppercase tracking-[0.2em]">Jumlah</th>
                          <th className="px-4 py-4 font-black text-[10px] uppercase tracking-[0.2em] hidden md:table-cell">Celengan</th>
                          <th className="px-4 py-4 font-black text-[10px] uppercase tracking-[0.2em] hidden lg:table-cell">Catatan</th>
                          <th className="px-4 py-4 font-black text-[10px] uppercase tracking-[0.2em] text-right last:rounded-tr-2xl">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20 dark:divide-slate-700/50">
                        {paginatedEntries.map((entry) => (
                          <tr key={entry.id} className="group transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="px-3 sm:px-4 py-4 font-bold text-[10px] text-slate-400 uppercase tracking-tighter whitespace-nowrap">
                              {formatShortDate(entry.created_at)}
                            </td>
                            <td className="px-3 sm:px-4 py-4">
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <div className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg font-bold text-[10px] sm:text-xs ${entry.type === "deposit" ? "bg-income/10 text-income" : "bg-expense/10 text-expense"}`}>
                                  {entry.type === "deposit" ? "↓" : "↑"}
                                </div>
                                <span className={`text-[10px] sm:text-xs font-black uppercase tracking-widest ${entry.type === "deposit" ? "text-income" : "text-expense"} whitespace-nowrap`}>
                                  {entry.type === "deposit" ? "Setor" : "Tarik"}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 py-4 tabular-nums font-black text-sm whitespace-nowrap">
                              <span className={entry.type === "deposit" ? "text-green-600 dark:text-income" : "text-red-600 dark:text-expense"}>
                                {entry.type === "deposit" ? "+" : "-"} {formatCurrency(Number(entry.amount))}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 py-4 hidden md:table-cell">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border border-slate-200/50 dark:border-slate-700/50 whitespace-nowrap">
                                {getPotLabel(entry.pot_id ?? null)}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 py-4 hidden lg:table-cell">
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 italic max-w-[150px] truncate" title={entry.note || ""}>
                                  {entry.note || "—"}
                                </p>
                            </td>
                            <td className="px-3 sm:px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setEditingEntry(entry)}
                                  className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-primary/10 hover:text-primary text-slate-400 transition-all"
                                  title="Edit"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button
                                  onClick={() => setDeletingEntry(entry)}
                                  className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-expense/10 hover:text-expense text-slate-400 transition-all"
                                  title="Hapus"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalRiwayatPages > 1 && (
                    <div className="flex items-center justify-between pt-6 border-t border-border/30 dark:border-slate-700">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Halaman {safeRiwayatPage} / {totalRiwayatPages}</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRiwayatPage((p) => Math.max(1, p - 1))}
                          disabled={safeRiwayatPage <= 1}
                          className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 disabled:opacity-30 hover:bg-primary/10 hover:text-primary transition-all"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRiwayatPage((p) => Math.min(totalRiwayatPages, p + 1))}
                          disabled={safeRiwayatPage >= totalRiwayatPages}
                          className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 disabled:opacity-30 hover:bg-primary/10 hover:text-primary transition-all"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

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
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                {deletingEntry.type === "deposit" ? "Setoran" : "Penarikan"} — {formatCurrency(deletingEntry.amount)}
              </p>
              {deletingEntry.note && (
                <p className="mt-0.5 text-sm text-muted dark:text-slate-400 italic">
                  &quot;{deletingEntry.note}&quot;
                </p>
              )}
            </div>
          )}
        </ConfirmModal>

      </section>

    </div>
  );
}
