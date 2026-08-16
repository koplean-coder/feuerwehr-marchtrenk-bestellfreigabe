-- Erweitere rental_items für Service-Artikel (Anlieferung, Abholung)

-- 1. Neues Feld für Artikel-Typ
ALTER TABLE public.rental_items 
ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'artikel';

-- 2. Kommentar zur Dokumentation
COMMENT ON COLUMN public.rental_items.item_type IS 'artikel = normales Leihgerät, service = Zusatzleistung (Anlieferung, Abholung, etc.)';

-- 3. Index für schnellere Filterung
CREATE INDEX IF NOT EXISTS idx_rental_items_item_type ON public.rental_items(item_type);

-- 4. Service-Artikel einfügen: Anlieferung
INSERT INTO public.rental_items (name, description, price_short, price_week, price_day, is_active, is_single_item, item_type, sort_order)
SELECT 'Anlieferung', 'Lieferung der Leihgeräte zum Kunden', 0, 0, 55, true, false, 'service', 9000
WHERE NOT EXISTS (SELECT 1 FROM public.rental_items WHERE name = 'Anlieferung' AND item_type = 'service');

-- 5. Service-Artikel einfügen: Abholung
INSERT INTO public.rental_items (name, description, price_short, price_week, price_day, is_active, is_single_item, item_type, sort_order)
SELECT 'Abholung', 'Abholung der Leihgeräte vom Kunden', 0, 0, 55, true, false, 'service', 9001
WHERE NOT EXISTS (SELECT 1 FROM public.rental_items WHERE name = 'Abholung' AND item_type = 'service');