export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/** Format nominal untuk input: hanya angka, pemisah ribuan pakai titik (25.000, 200.000). */
export function formatAmountDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return "";
  const n = parseInt(digits, 10);
  if (Number.isNaN(n)) return "";
  return n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/** Parse string input nominal (dengan atau tanpa titik) jadi number. */
export function parseAmountInput(value: string): number {
  const cleaned = value.replace(/\D/g, "");
  return parseInt(cleaned, 10) || 0;
}

export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatShortDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  });
}

export function getMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}

/**
 * Buka URL Telegram (t.me/...) sehingga dari PWA/standalone bisa langsung buka app Telegram.
 * Di mode standalone pakai location.href agar OS menyerahkan ke app; di browser biasa pakai window.open.
 */
export function openTelegramUrl(url: string): void {
  if (typeof window === "undefined") return;
  const isPWA =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (isPWA) {
    window.location.href = url;
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
