-- Allow edit riwayat tabungan (jika schema sudah jalan sebelumnya tanpa policy ini)
CREATE POLICY "Users can update own savings_entries"
  ON public.savings_entries FOR UPDATE
  USING (auth.uid()::text = user_id);
