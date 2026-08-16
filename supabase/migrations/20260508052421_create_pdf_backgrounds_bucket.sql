-- Storage Bucket für PDF-Hintergründe erstellen
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdf-backgrounds',
  'pdf-backgrounds',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies für PDF-Hintergründe
-- Jeder kann lesen (public bucket)
CREATE POLICY "Public read access for pdf backgrounds"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'pdf-backgrounds');

-- Nur Admins und Kommandanten können hochladen
CREATE POLICY "Admin upload pdf backgrounds"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pdf-backgrounds' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'kommandant')
    )
  );

-- Nur Admins und Kommandanten können löschen
CREATE POLICY "Admin delete pdf backgrounds"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pdf-backgrounds' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'kommandant')
    )
  );

-- Settings-Einträge für PDF-Hintergrund anlegen falls nicht vorhanden
INSERT INTO settings (key, value)
VALUES ('pdf_background_url', '')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value)
VALUES ('pdf_background_opacity', '0.15')
ON CONFLICT (key) DO NOTHING;