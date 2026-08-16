-- Erweiterte INSERT-Policy für Lieferanten: Alle authentifizierten Benutzer dürfen anlegen
-- (Lieferanten werden dann vom Kommandant geprüft und freigegeben)

DROP POLICY IF EXISTS "Lieferanten erstellbar für Admin, Bereichsleiter, Kommandant" ON public.suppliers;

CREATE POLICY "Lieferanten erstellbar für alle authentifizierten Benutzer"
  ON public.suppliers FOR INSERT
  TO authenticated
  WITH CHECK (true);