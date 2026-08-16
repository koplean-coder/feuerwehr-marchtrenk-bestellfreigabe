-- Storage Bucket für Bestellungsanhänge erstellen
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-attachments',
  'order-attachments',
  false,
  2097152, -- 2MB in bytes
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']
);

-- Tabelle für Anhänge
CREATE TABLE public.order_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index für schnelle Abfragen
CREATE INDEX idx_order_attachments_order_id ON public.order_attachments(order_id);

-- RLS aktivieren
ALTER TABLE public.order_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies für order_attachments
-- Jeder authentifizierte Benutzer kann Anhänge der Bestellungen sehen
CREATE POLICY "Authenticated users can view attachments"
  ON public.order_attachments
  FOR SELECT
  TO authenticated
  USING (true);

-- Nur der Ersteller kann Anhänge hinzufügen
CREATE POLICY "Users can insert own attachments"
  ON public.order_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = uploaded_by);

-- Nur der Ersteller kann Anhänge löschen
CREATE POLICY "Users can delete own attachments"
  ON public.order_attachments
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = uploaded_by);

-- Storage Policies für order-attachments Bucket
-- Authentifizierte Benutzer können Dateien hochladen
CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'order-attachments');

-- Authentifizierte Benutzer können Dateien lesen
CREATE POLICY "Authenticated users can read attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'order-attachments');

-- Benutzer können ihre eigenen Dateien löschen
CREATE POLICY "Users can delete own attachments from storage"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'order-attachments' AND (select auth.uid())::text = (storage.foldername(name))[1]);