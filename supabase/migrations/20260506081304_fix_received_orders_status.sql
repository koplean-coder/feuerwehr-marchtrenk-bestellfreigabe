-- Korrigiere alle Bestellungen die als erhalten markiert sind, aber noch nicht abgeschlossen
-- Setze Status auf 'abgeschlossen' und archiviere sie

UPDATE public.orders
SET 
  status = 'abgeschlossen',
  is_archived = true,
  archived_at = COALESCE(archived_at, order_received_at, now()),
  archived_by = COALESCE(archived_by, order_received_by)
WHERE 
  order_received = true 
  AND status != 'abgeschlossen';

-- Füge auch History-Einträge für die korrigierten Bestellungen hinzu
INSERT INTO public.order_history (order_id, action, old_status, new_status, performed_by)
SELECT 
  id,
  'Status automatisch auf abgeschlossen gesetzt (Nachkorrektur)',
  status,
  'abgeschlossen',
  order_received_by
FROM public.orders
WHERE 
  order_received = true 
  AND status = 'abgeschlossen'
  AND NOT EXISTS (
    SELECT 1 FROM public.order_history oh 
    WHERE oh.order_id = orders.id 
    AND oh.action LIKE '%Nachkorrektur%'
  );