-- Sembunyikan entri "pindah uang" dari riwayat (uang tetap sama, hanya pindah celengan)
ALTER TABLE public.savings_entries
  ADD COLUMN IF NOT EXISTS is_transfer BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.savings_entries.is_transfer IS 'True = entri ini bagian dari pindah uang antar celengan, tidak ditampilkan di riwayat';
