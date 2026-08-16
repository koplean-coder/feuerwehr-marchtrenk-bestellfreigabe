-- Fix: Close voting for orders that already have a voting_result
-- If voting_result is set (approved/rejected/overridden), the voting is done

UPDATE public.orders
SET 
  voting_status = 'closed',
  voting_closed_at = COALESCE(voting_closed_at, updated_at, now())
WHERE 
  voting_status = 'open'
  AND voting_result IS NOT NULL;