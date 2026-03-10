-- Foto dan deskripsi celengan (opsional)
ALTER TABLE public.savings_pots
  ADD COLUMN IF NOT EXISTS photo TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.savings_pots.photo IS 'Base64 data URL foto celengan (opsional)';
COMMENT ON COLUMN public.savings_pots.description IS 'Deskripsi celengan (opsional)';
