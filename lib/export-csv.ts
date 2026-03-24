import type { Transaction } from "./types";
import { formatDate } from "./utils";

export function exportTransactionsToCSV(transactions: Transaction[], filename?: string): void {
  const headers = ["Tanggal", "Tipe", "Jumlah", "Kategori", "Catatan"];
  const rows = transactions.map((t) => [
    formatDate(t.created_at),
    t.type === "income" ? "Pemasukan" : "Pengeluaran",
    String(t.amount),
    t.category,
    t.note || "",
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename || `transaksi-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  
  // Delay cleanup to ensure mobile browsers start download
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
