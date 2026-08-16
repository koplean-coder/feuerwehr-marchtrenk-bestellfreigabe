-- Close voting for Terrasse with amount 13450.80

UPDATE public.orders
SET 
  voting_status = 'closed',
  voting_closed_at = now()
WHERE 
  title = 'Terrasse'
  AND amount = 13450.80
  AND voting_status = 'open';