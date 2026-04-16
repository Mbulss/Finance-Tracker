-- Create hidden_categories table
CREATE TABLE IF NOT EXISTS public.hidden_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category_name, type)
);

-- Enable RLS
ALTER TABLE public.hidden_categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own hidden categories"
  ON public.hidden_categories FOR SELECT
  USING (auth.uid()::text = user_id OR user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert own hidden categories"
  ON public.hidden_categories FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own hidden categories"
  ON public.hidden_categories FOR DELETE
  USING (auth.uid()::text = user_id OR user_id = current_setting('request.jwt.claims', true)::json->>'sub');
