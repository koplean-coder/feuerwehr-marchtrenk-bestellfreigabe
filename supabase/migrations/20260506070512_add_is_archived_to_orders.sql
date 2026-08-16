-- Füge is_archived Spalte hinzu
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users DEFAULT NULL;

-- Index für schnelle Archiv-Abfragen
CREATE INDEX IF NOT EXISTS idx_orders_is_archived ON public.orders(is_archived);