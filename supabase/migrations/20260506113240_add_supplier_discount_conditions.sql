-- Rabatte & Konditionen Felder für Lieferanten
ALTER TABLE public.suppliers
ADD COLUMN discount_percent NUMERIC(5,2) DEFAULT NULL,
ADD COLUMN payment_terms TEXT DEFAULT NULL,
ADD COLUMN special_conditions TEXT DEFAULT NULL;