-- Neue Preisspalten für 2-Tage und 3-Tage Preise
ALTER TABLE public.rental_items 
  ADD COLUMN IF NOT EXISTS price_2days NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_3days NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Bestehende Daten migrieren: price_short als Basis für 2-Tage und 3-Tage nehmen
UPDATE public.rental_items 
SET 
  price_2days = COALESCE(price_short * 2, price_day * 2, 0),
  price_3days = COALESCE(price_short * 3, price_day * 3, 0)
WHERE price_2days = 0 OR price_3days = 0;

-- Kommentar für Klarheit
COMMENT ON COLUMN public.rental_items.price_day IS '1-Tag Preis';
COMMENT ON COLUMN public.rental_items.price_2days IS '2-Tage Preis';
COMMENT ON COLUMN public.rental_items.price_3days IS '3-Tage Preis';
COMMENT ON COLUMN public.rental_items.price_week IS 'Wochenpauschale (7 Tage)';