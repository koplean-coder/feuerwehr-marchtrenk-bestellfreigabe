-- Tabelle für Sonderfreigabe-Anfragen unter Mindestbestellwert
CREATE TABLE public.min_order_value_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_min_order_value_requests_supplier ON public.min_order_value_requests(supplier_id);
CREATE INDEX idx_min_order_value_requests_requested_by ON public.min_order_value_requests(requested_by);
CREATE INDEX idx_min_order_value_requests_status ON public.min_order_value_requests(status);

-- RLS aktivieren
ALTER TABLE public.min_order_value_requests ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Alle authentifizierten Benutzer können sehen
CREATE POLICY "min_order_value_requests_select" ON public.min_order_value_requests
  FOR SELECT TO authenticated
  USING (true);

-- INSERT Policy: Alle authentifizierten Benutzer können Anfragen erstellen
CREATE POLICY "min_order_value_requests_insert" ON public.min_order_value_requests
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = requested_by);

-- UPDATE Policy: Nur Kommandant/Admin können Anfragen bearbeiten
CREATE POLICY "min_order_value_requests_update" ON public.min_order_value_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid())
      AND role IN ('kommandant', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid())
      AND role IN ('kommandant', 'admin')
    )
  );

-- E-Mail Templates für Sonderfreigabe hinzufügen
INSERT INTO public.settings (key, value) VALUES
  ('email_template_min_order_request', '{"subject": "Neue Sonderfreigabe-Anfrage unter Mindestbestellwert", "body": "Hallo {{recipientName}},\n\n{{requesterName}} hat eine Sonderfreigabe für Bestellungen unter dem Mindestbestellwert beim Lieferanten {{supplierName}} angefragt.\n\nBegründung:\n{{reason}}\n\nBitte prüfen Sie die Anfrage und genehmigen oder lehnen Sie diese ab.\n\nMit freundlichen Grüßen"}'),
  ('email_template_min_order_approved', '{"subject": "Sonderfreigabe genehmigt", "body": "Hallo {{recipientName}},\n\nIhre Anfrage zur Sonderfreigabe für Bestellungen unter dem Mindestbestellwert beim Lieferanten {{supplierName}} wurde genehmigt.\n\nSie können nun Bestellungen bei diesem Lieferanten auch unter dem Mindestbestellwert aufgeben.\n\nMit freundlichen Grüßen"}'),
  ('email_template_min_order_rejected', '{"subject": "Sonderfreigabe abgelehnt", "body": "Hallo {{recipientName}},\n\nIhre Anfrage zur Sonderfreigabe für Bestellungen unter dem Mindestbestellwert beim Lieferanten {{supplierName}} wurde leider abgelehnt.\n\nBegründung:\n{{rejectionReason}}\n\nMit freundlichen Grüßen"}')
ON CONFLICT (key) DO NOTHING;