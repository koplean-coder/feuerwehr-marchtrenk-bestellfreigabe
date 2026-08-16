-- Create signatures storage bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signatures',
  'signatures', 
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

-- Storage policies for signatures bucket
DROP POLICY IF EXISTS "signatures_public_read" ON storage.objects;
DROP POLICY IF EXISTS "signatures_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "signatures_auth_delete" ON storage.objects;

CREATE POLICY "signatures_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'signatures');

CREATE POLICY "signatures_auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'signatures');

CREATE POLICY "signatures_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'signatures');