-- Force close voting for the two specific orders that are already done

UPDATE public.orders
SET 
  voting_status = 'closed',
  voting_closed_at = now()
WHERE 
  title IN ('Terrasse', 'Asphaltierung arbeiten für die Terrasse')
  AND voting_status = 'open';