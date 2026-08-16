
-- Bestellvorgang-Felder zur suppliers Tabelle hinzufügen
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS order_methods text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS order_email text;

-- Kommentar für Dokumentation
COMMENT ON COLUMN public.suppliers.order_methods IS 'Bestellmethoden: webshop, telefonisch, email, geraetewart';
COMMENT ON COLUMN public.suppliers.order_email IS 'E-Mail-Adresse für Bestellungen (wenn email als Methode gewählt)';
