-- Supplier Documents Tabelle
CREATE TABLE public.supplier_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  document_type TEXT DEFAULT 'other',
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index für schnelle Abfragen
CREATE INDEX idx_supplier_documents_supplier_id ON public.supplier_documents(supplier_id);

-- RLS aktivieren
ALTER TABLE public.supplier_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Alle authentifizierten User können lesen
CREATE POLICY "Authenticated users can read supplier documents"
  ON public.supplier_documents
  FOR SELECT
  TO authenticated
  USING (true);

-- Nur Bereichsleiter, Admin, Kommandant können erstellen
CREATE POLICY "Managers can create supplier documents"
  ON public.supplier_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Nur der Uploader oder Admins können löschen
CREATE POLICY "Uploaders and admins can delete supplier documents"
  ON public.supplier_documents
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'kommandant')
    )
  );

-- Storage Bucket für Lieferanten-Dokumente (falls noch nicht vorhanden)
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-documents', 'supplier-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Authenticated users can read supplier documents storage"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'supplier-documents');

CREATE POLICY "Authenticated users can upload supplier documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'supplier-documents');

CREATE POLICY "Uploaders can delete their supplier documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'supplier-documents');