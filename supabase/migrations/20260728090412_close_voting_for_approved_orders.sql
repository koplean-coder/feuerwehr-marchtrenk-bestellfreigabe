-- Close voting for orders that are already approved by Kommandant or Bereichsleitung

UPDATE public.orders
SET 
  voting_status = 'closed',
  voting_closed_at = now()
WHERE 
  voting_status = 'open'
  AND status IN ('freigegeben_kommandant', 'freigegeben_bereichsleitung');