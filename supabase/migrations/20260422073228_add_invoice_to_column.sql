-- Spalte für Rechnungsempfänger hinzufügen
ALTER TABLE public.orders 
ADD COLUMN invoice_to TEXT CHECK (invoice_to IN ('gemeinde', 'feuerwehr'));