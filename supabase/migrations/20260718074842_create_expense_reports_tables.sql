-- =============================================
-- EXPENSE CATEGORIES (erweiterbare Kategorien)
-- =============================================
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Default-Kategorien einfügen
INSERT INTO public.expense_categories (name, is_default) VALUES
  ('Verpflegung', true),
  ('Fahrtspesen', true),
  ('Eintritte', true);

-- RLS für Kategorien (alle können lesen, nur admins können schreiben)
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kategorien sind für alle sichtbar"
  ON public.expense_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Nur Admins können Kategorien erstellen"
  ON public.expense_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'kommandant')
    )
  );

-- =============================================
-- EXPENSE REPORTS (Ausgaben-Abrechnungen)
-- =============================================
CREATE TABLE public.expense_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_number TEXT NOT NULL UNIQUE,
  
  -- Verknüpfung mit Auszahlungsanweisung (Pflicht)
  payment_order_id UUID NOT NULL REFERENCES public.payment_orders(id) ON DELETE RESTRICT,
  
  -- Veranstaltungsdaten
  event_name TEXT NOT NULL,
  event_date_from DATE NOT NULL,
  event_date_to DATE,
  
  -- Teilnehmer (manuell eingetippt, kommasepariert oder als Array)
  participants TEXT,
  
  -- Beträge
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  advance_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Verantwortlicher (übernommen aus Auszahlungsanweisung)
  responsible_person TEXT NOT NULL,
  
  -- Metadaten
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index für schnelle Suche
CREATE INDEX idx_expense_reports_created_by ON public.expense_reports(created_by);
CREATE INDEX idx_expense_reports_payment_order ON public.expense_reports(payment_order_id);
CREATE INDEX idx_expense_reports_reference ON public.expense_reports(reference_number);

-- RLS für Expense Reports
ALTER TABLE public.expense_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Benutzer können alle Abrechnungen sehen"
  ON public.expense_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Benutzer können eigene Abrechnungen erstellen"
  ON public.expense_reports FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY "Ersteller können ihre Abrechnungen bearbeiten"
  ON public.expense_reports FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = created_by)
  WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY "Ersteller können ihre Abrechnungen löschen"
  ON public.expense_reports FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = created_by);

-- =============================================
-- EXPENSE REPORT ITEMS (Einzelpositionen)
-- =============================================
CREATE TABLE public.expense_report_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_report_id UUID NOT NULL REFERENCES public.expense_reports(id) ON DELETE CASCADE,
  position_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.expense_categories(id),
  category_custom TEXT,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(expense_report_id, position_number)
);

CREATE INDEX idx_expense_report_items_report ON public.expense_report_items(expense_report_id);

-- RLS für Items
ALTER TABLE public.expense_report_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Benutzer können alle Positionen sehen"
  ON public.expense_report_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Benutzer können Positionen zu eigenen Abrechnungen hinzufügen"
  ON public.expense_report_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expense_reports er
      WHERE er.id = expense_report_id
      AND er.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "Ersteller können Positionen bearbeiten"
  ON public.expense_report_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.expense_reports er
      WHERE er.id = expense_report_id
      AND er.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expense_reports er
      WHERE er.id = expense_report_id
      AND er.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "Ersteller können Positionen löschen"
  ON public.expense_report_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.expense_reports er
      WHERE er.id = expense_report_id
      AND er.created_by = (SELECT auth.uid())
    )
  );

-- =============================================
-- TRIGGER für updated_at
-- =============================================
CREATE TRIGGER update_expense_reports_updated_at
  BEFORE UPDATE ON public.expense_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- SEQUENCE für Belegnummer (VA-JJJJ-NNNN)
-- =============================================
CREATE SEQUENCE IF NOT EXISTS expense_report_number_seq START 1;

-- Funktion zur Generierung der Belegnummer
CREATE OR REPLACE FUNCTION public.generate_expense_report_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  result TEXT;
BEGIN
  current_year := to_char(CURRENT_DATE, 'YYYY');
  
  -- Nächste Nummer für dieses Jahr holen
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(reference_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM public.expense_reports
  WHERE reference_number LIKE 'VA-' || current_year || '-%';
  
  result := 'VA-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
  RETURN result;
END;
$$;