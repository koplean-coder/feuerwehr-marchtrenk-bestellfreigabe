
-- Neuen Status 'abgeschlossen' zum Enum hinzufügen
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'abgeschlossen';
