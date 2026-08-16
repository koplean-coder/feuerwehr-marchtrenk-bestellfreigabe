-- Bereichsleiter-Zuweisung zur suppliers Tabelle hinzufügen
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS assigned_bereichsleiter_id uuid REFERENCES auth.users(id);

COMMENT ON COLUMN public.suppliers.assigned_bereichsleiter_id IS 'Zugewiesener Bereichsleiter oder Kommandant für diesen Lieferanten';