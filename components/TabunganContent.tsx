"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatShortDate, parseAmountInput, formatAmountDisplay } from "@/lib/utils";
import { useToast } from "@/components/ToastContext";
import { ConfirmModal } from "@/components/ConfirmModal";
import { CountUp } from "@/components/CountUp";
import { SkeletonCard, Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";

export interface SavingsEntry {
  id: string;
  user_id: string;
  type: "deposit" | "withdraw";
  amount: number;
  note: string;
  created_at: string;
  pot_id?: string | null;
}

export interface SavingsPot {
  id: string;
  user_id: string;
  name: string;
  target_amount: number | null;
  sort_order: number;
  created_at: string;
}

interface SavingsReminder {
  user_id: string;
  enabled: boolean;
  day_of_week: number;
}

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

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
  const [deletingEntry, setDeletingEntry] = useState<SavingsEntry | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [newPotName, setNewPotName] = useState("");
  const [newPotTarget, setNewPotTarget] = useState("");
  const [addingPot, setAddingPot] = useState(false);
  const [editingTargetPot, setEditingTargetPot] = useState<SavingsPot | null>(null);
  const [editingTargetValue, setEditingTargetValue] = useState("");
  const [potToDelete, setPotToDelete] = useState<SavingsPot | null>(null);
  const [deletePotLoading, setDeletePotLoading] = useState(false);
  const [optimisticEntries, setOptimisticEntries] = useState<SavingsEntry[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const supabase = createClient();
  const { showToast } = useToast();

  const displayedEntries = [...entries, ...optimisticEntries]
    .filter((e) => !pendingDeleteIds.has(e.id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const balanceByPot = displayedEntries.reduce<Record<string, number>>((acc, e) => {
    const key = e.pot_id ?? "__umum__";
    const delta = e.type === "deposit" ? Number(e.amount) : -Number(e.amount);
    acc[key] = (acc[key] ?? 0) + delta;
    return acc;
  }, {});
  const totalBalance = Object.values(balanceByPot).reduce((a, b) => a + b, 0);
  const selectedPotBalance = selectedPotId ? (balanceByPot[selectedPotId] ?? 0) : (balanceByPot["__umum__"] ?? 0);

  const fetchEntries = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("savings_entries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!err) setEntries((data as SavingsEntry[]) ?? []);
    setOptimisticEntries([]);
    setLoading(false);
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
    fetchEntries();
    fetchPots().catch(() => setPots([]));
    fetchReminder().catch(() => setReminder({ user_id: userId, enabled: false, day_of_week: 1 }));

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
      supabase.removeChannel(channel);
      supabase.removeChannel(channelPots);
    };
  }, [fetchEntries, fetchPots, fetchReminder, supabase, userId]);

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
          <span className="text-lg">💡</span>
          <span><strong>Pengingat:</strong> Jangan lupa setor tabungan hari ini!</span>
        </div>
      )}

      {/* Saldo total */}
      <section className="rounded-2xl border-2 border-primary/20 dark:border-primary/30 bg-primary/5 dark:bg-primary/10 p-6 shadow-card transition-shadow hover:shadow-card-hover">
        <p className="text-sm font-medium text-muted dark:text-slate-400">Saldo tabungan total</p>
        <p className={`mt-1 text-3xl font-bold font-mono tabular-nums sm:text-4xl ${totalBalance >= 0 ? "text-income" : "text-expense"}`}>
          <CountUp value={totalBalance} formatter={(n) => formatCurrency(n)} />
        </p>
      </section>

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
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{pot.name}</p>
                    <p className={`mt-1 text-lg font-bold font-mono tabular-nums ${bal >= 0 ? "text-income" : "text-expense"}`}>
                      {formatCurrency(bal)}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditingTargetPot(pot); setEditingTargetValue(pot.target_amount != null ? String(pot.target_amount) : ""); }}
                      className="rounded p-1.5 text-muted hover:bg-slate-100 dark:hover:bg-slate-600"
                      title="Set target"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
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
        {addingPot && (
          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-border dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 p-4">
            <div className="min-w-[160px]">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nama celengan</label>
              <input
                type="text"
                value={newPotName}
                onChange={(e) => setNewPotName(e.target.value)}
                placeholder="Mis. Dana darurat"
                className="w-full rounded-lg border border-border dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-[120px]">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Target (opsional)</label>
              <input
                type="text"
                inputMode="numeric"
                value={newPotTarget}
                onChange={(e) => setNewPotTarget(formatAmountDisplay(e.target.value))}
                placeholder="0"
                className="w-full rounded-lg border border-border dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!newPotName.trim()) return;
                  const targetNum = parseAmountInput(newPotTarget) || null;
                  const { error: err } = await supabase.from("savings_pots").insert({
                    user_id: userId,
                    name: newPotName.trim(),
                    target_amount: targetNum,
                    sort_order: pots.length,
                  });
                  if (!err) { setNewPotName(""); setNewPotTarget(""); setAddingPot(false); showToast("Celengan ditambah"); fetchPots(); }
                  else showToast(err.message, "error");
                }}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                Simpan
              </button>
              <button type="button" onClick={() => { setAddingPot(false); setNewPotName(""); setNewPotTarget(""); }} className="rounded-lg border border-border dark:border-slate-600 px-4 py-2 text-sm">Batal</button>
            </div>
          </div>
        )}
        {editingTargetPot && (
          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 p-4">
            <div className="min-w-[160px]">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Target {editingTargetPot.name}</label>
              <input
                type="text"
                inputMode="numeric"
                value={editingTargetValue}
                onChange={(e) => setEditingTargetValue(formatAmountDisplay(e.target.value))}
                placeholder="0"
                className="w-full rounded-lg border border-border dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={async () => {
                const targetNum = parseAmountInput(editingTargetValue) || null;
                await supabase.from("savings_pots").update({ target_amount: targetNum }).eq("id", editingTargetPot.id).eq("user_id", userId);
                setEditingTargetPot(null);
                fetchPots();
                showToast("Target diperbarui");
              }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
            >
              Simpan
            </button>
            <button type="button" onClick={() => setEditingTargetPot(null)} className="rounded-lg border border-border px-4 py-2 text-sm">Batal</button>
          </div>
        )}
      </section>

      {/* Pengingat setor */}
      {reminder && (
        <section className="rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 p-4 shadow-card sm:p-6">
          <h2 className="mb-3 text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">Pengingat setor</h2>
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
              <span className="text-sm text-slate-700 dark:text-slate-200">Ingatkan saya setor tabungan</span>
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

      {/* Form setor / tarik */}
      <section className="rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 p-4 shadow-card sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">Setor / Tarik</h2>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          {(pots.length > 0) && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Celengan</label>
              <select
                value={selectedPotId ?? "__umum__"}
                onChange={(e) => setSelectedPotId(e.target.value === "__umum__" ? null : e.target.value)}
                className="w-full rounded-xl border border-border dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-slate-800 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${type === "deposit" ? "bg-white dark:bg-slate-600 text-primary shadow-sm dark:text-sky-300" : "text-muted dark:text-slate-400"}`}
            >
              Setor
            </button>
            <button
              type="button"
              onClick={() => { setType("withdraw"); setError(""); }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${type === "withdraw" ? "bg-white dark:bg-slate-600 text-primary shadow-sm dark:text-sky-300" : "text-muted dark:text-slate-400"}`}
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
              className="w-full rounded-xl border border-border dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
              className="w-full rounded-xl border border-border dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {error && <p className="text-sm text-expense">{error}</p>}
          <button
            type="submit"
            disabled={submitLoading}
            className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            {submitLoading ? "Menyimpan..." : type === "deposit" ? "Setor" : "Tarik"}
          </button>
        </form>
      </section>

      {/* Riwayat */}
      <section className="rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-800 p-4 shadow-card sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">Riwayat</h2>
        {displayedEntries.length === 0 ? (
          <EmptyState
            icon="savings"
            title="Belum ada setor/tarik"
            description="Mulai dari form di atas untuk menabung. Saldo akan tercatat di sini."
          />
        ) : (
          <ul className="divide-y divide-border dark:divide-slate-600">
            {displayedEntries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                <div className="min-w-0 flex-1">
                  <span className={`font-medium ${entry.type === "deposit" ? "text-income" : "text-expense"}`}>
                    {entry.type === "deposit" ? "+" : "-"} {formatCurrency(Number(entry.amount))}
                  </span>
                  <span className="ml-2 text-sm text-muted dark:text-slate-400">{entry.note || "—"}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-muted dark:text-slate-400">{formatShortDate(entry.created_at)}</span>
                  <button
                    type="button"
                    onClick={() => setDeletingEntry(entry)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-expense dark:hover:bg-slate-600 dark:hover:text-red-400 transition active:scale-95"
                    aria-label="Hapus"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

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
