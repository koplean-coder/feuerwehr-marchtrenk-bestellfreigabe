-- Fix voting_status for orders that require Kommandoabstimmung but have no voting_status set
-- This updates all orders where requires_kommandomitglied_approval = true but voting_status is null

UPDATE public.orders
SET 
  voting_status = 'open',
  voting_opened_at = COALESCE(submitted_at, now())
WHERE 
  requires_kommandomitglied_approval = true
  AND voting_status IS NULL
  AND status NOT IN ('entwurf', 'genehmigt', 'abgelehnt', 'abgeschlossen');