-- Alle bereits abgeschlossenen Bestellungen ins Archiv verschieben
UPDATE public.orders 
SET 
  is_archived = true,
  archived_at = NOW()
WHERE status = 'abgeschlossen' AND is_archived = false;