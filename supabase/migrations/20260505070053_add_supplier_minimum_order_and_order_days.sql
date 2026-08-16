-- Neue Felder für Lieferanten: Mindestbestellwert und Bestelltage
ALTER TABLE public.suppliers
ADD COLUMN minimum_order_value DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN order_days TEXT[] DEFAULT NULL;

-- Kommentar für Dokumentation
COMMENT ON COLUMN public.suppliers.minimum_order_value IS 'Mindestbestellwert in Euro';
COMMENT ON COLUMN public.suppliers.order_days IS 'Bestelltage als Wochentage (mo, di, mi, do, fr, sa, so)';