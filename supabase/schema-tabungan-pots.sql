-- Multiple celengan (pots) + target + reminder
-- Jalankan setelah schema-tabungan.sql

-- Celengan: satu user bisa punya banyak "pot" (Dana darurat, Liburan, dll)
CREATE TABLE IF NOT EXISTS public.savings_pots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_amount DECIMAL(15, 2) DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_pots_user ON public.savings_pots (user_id, sort_order);

ALTER TABLE public.savings_pots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own savings_pots"
  ON public.savings_pots FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own savings_pots"
  ON public.savings_pots FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own savings_pots"
  ON public.savings_pots FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own savings_pots"
  ON public.savings_pots FOR DELETE USING (auth.uid()::text = user_id);

-- Entri tabungan bisa terhubung ke satu celengan (pot_id). NULL = celengan default/umum
ALTER TABLE public.savings_entries
  ADD COLUMN IF NOT EXISTS pot_id UUID REFERENCES public.savings_pots(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_savings_entries_pot ON public.savings_entries (pot_id);

-- Pengingat setor mingguan (hari dalam minggu: 0 = Minggu, 1 = Senin, ... 6 = Sabtu)
CREATE TABLE IF NOT EXISTS public.savings_reminders (
  user_id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  day_of_week SMALLINT NOT NULL DEFAULT 1 CHECK (day_of_week >= 0 AND day_of_week <= 6),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.savings_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own savings_reminders"
  ON public.savings_reminders FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own savings_reminders"
  ON public.savings_reminders FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own savings_reminders"
  ON public.savings_reminders FOR UPDATE USING (auth.uid()::text = user_id);

COMMENT ON TABLE public.savings_pots IS 'Celengan tabungan per user (Dana darurat, Liburan, dll)';
COMMENT ON TABLE public.savings_reminders IS 'Pengingat setor tabungan mingguan';
COMMENT ON COLUMN public.savings_entries.pot_id IS 'FK ke savings_pots; NULL = celengan default';
