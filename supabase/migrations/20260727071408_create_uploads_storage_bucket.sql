-- Storage Bucket für Uploads erstellen
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Authentifizierte User können hochladen
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'uploads');

-- Policy: Jeder kann Dateien ansehen (public bucket)
CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'uploads');

-- Policy: User können eigene Dateien löschen
CREATE POLICY "Users can delete own uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'uploads' AND (select auth.uid())::text = (storage.foldername(name))[1]);