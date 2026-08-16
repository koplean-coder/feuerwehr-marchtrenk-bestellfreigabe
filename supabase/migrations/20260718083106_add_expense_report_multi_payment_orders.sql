-- =============================================
-- EXPENSE REPORT PAYMENT ORDERS (Verknüpfungstabelle)
-- Ermöglicht mehrere Auszahlungsanweisungen pro Abrechnung
-- =============================================
CREATE TABLE public.expense_report_payment_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_report_id UUID NOT NULL REFERENCES public.expense_reports(id) ON DELETE CASCADE,
  payment_order_id UUID NOT NULL REFERENCES public.payment_orders(id) ON DELETE RESTRICT,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(expense_report_id, payment_order_id)
);

CREATE INDEX idx_expense_report_payment_orders_report ON public.expense_report_payment_orders(expense_report_id);
CREATE INDEX idx_expense_report_payment_orders_payment ON public.expense_report_payment_orders(payment_order_id);

-- RLS
ALTER TABLE public.expense_report_payment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Benutzer können alle Verknüpfungen sehen"
  ON public.expense_report_payment_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Ersteller können Verknüpfungen hinzufügen"
  ON public.expense_report_payment_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expense_reports er
      WHERE er.id = expense_report_id
      AND er.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "Ersteller können Verknüpfungen löschen"
  ON public.expense_report_payment_orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.expense_reports er
      WHERE er.id = expense_report_id
      AND er.created_by = (SELECT auth.uid())
    )
  );

-- Mache payment_order_id in expense_reports nullable (für Migration bestehender Daten)
ALTER TABLE public.expense_reports ALTER COLUMN payment_order_id DROP NOT NULL;