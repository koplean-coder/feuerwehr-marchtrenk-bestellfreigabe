-- Kontaktpersonen für Lieferanten
CREATE TABLE public.supplier_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index für schnelle Abfragen
CREATE INDEX idx_supplier_contacts_supplier_id ON public.supplier_contacts(supplier_id);

-- RLS aktivieren
ALTER TABLE public.supplier_contacts ENABLE ROW LEVEL SECURITY;

-- Policies: Alle authentifizierten Benutzer können Kontakte sehen und verwalten
CREATE POLICY "Authenticated users can view supplier contacts"
  ON public.supplier_contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert supplier contacts"
  ON public.supplier_contacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update supplier contacts"
  ON public.supplier_contacts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete supplier contacts"
  ON public.supplier_contacts FOR DELETE
  TO authenticated
  USING (true);