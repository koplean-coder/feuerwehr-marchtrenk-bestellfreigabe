-- Angebotene Artikel Feld zur suppliers Tabelle hinzufügen
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS offered_articles text;

COMMENT ON COLUMN public.suppliers.offered_articles IS 'Beschreibung der angebotenen Artikel des Lieferanten';