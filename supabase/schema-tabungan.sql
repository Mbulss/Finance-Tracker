-- Tabungan (uang dingin): setor & tarik per user
-- Jalankan di Supabase SQL Editor setelah schema utama

CREATE TABLE IF NOT EXISTS public.savings_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw')),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_transfer BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_savings_entries_user_created
  ON public.savings_entries (user_id, created_at DESC);

ALTER TABLE public.savings_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own savings_entries"
  ON public.savings_entries FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own savings_entries"
  ON public.savings_entries FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own savings_entries"
  ON public.savings_entries FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own savings_entries"
  ON public.savings_entries FOR DELETE
  USING (auth.uid()::text = user_id);

COMMENT ON TABLE public.savings_entries IS 'Tabungan: setor (deposit) dan tarik (withdraw) uang dingin per user';
