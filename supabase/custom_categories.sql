-- Create custom_categories table
CREATE TABLE IF NOT EXISTS public.custom_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name, type)
);

-- Enable RLS
ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own custom categories"
  ON public.custom_categories FOR SELECT
  USING (auth.uid()::text = user_id OR user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert own custom categories"
  ON public.custom_categories FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own custom categories"
  ON public.custom_categories FOR DELETE
  USING (auth.uid()::text = user_id OR user_id = current_setting('request.jwt.claims', true)::json->>'sub');
