-- Verify tables exist and add missing columns if needed
DO $$
BEGIN
  -- Check supplier_contacts table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_contacts' AND table_schema = 'public') THEN
    CREATE TABLE public.supplier_contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      position TEXT,
      phone TEXT,
      email TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    
    ALTER TABLE public.supplier_contacts ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Authenticated users can read supplier contacts"
      ON public.supplier_contacts
      FOR SELECT
      TO authenticated
      USING (true);
      
    CREATE POLICY "Authenticated users can insert supplier contacts"
      ON public.supplier_contacts
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
      
    CREATE POLICY "Authenticated users can update supplier contacts"
      ON public.supplier_contacts
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
      
    CREATE POLICY "Authenticated users can delete supplier contacts"
      ON public.supplier_contacts
      FOR DELETE
      TO authenticated
      USING (true);
      
    CREATE INDEX idx_supplier_contacts_supplier_id ON public.supplier_contacts(supplier_id);
  END IF;
  
  -- Check supplier_documents table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_documents' AND table_schema = 'public') THEN
    CREATE TABLE public.supplier_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      mime_type TEXT NOT NULL,
      document_type TEXT DEFAULT 'other',
      description TEXT,
      uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    
    ALTER TABLE public.supplier_documents ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Authenticated users can read supplier documents"
      ON public.supplier_documents
      FOR SELECT
      TO authenticated
      USING (true);
      
    CREATE POLICY "Authenticated users can insert supplier documents"
      ON public.supplier_documents
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
      
    CREATE POLICY "Authenticated users can delete own supplier documents"
      ON public.supplier_documents
      FOR DELETE
      TO authenticated
      USING ((select auth.uid()) = uploaded_by);
      
    CREATE INDEX idx_supplier_documents_supplier_id ON public.supplier_documents(supplier_id);
  END IF;
END $$;