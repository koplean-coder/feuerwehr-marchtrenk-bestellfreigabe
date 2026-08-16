-- Fix: Close voting_status for orders that are already approved or rejected
-- These should not appear in "Zu erledigen"

UPDATE public.orders
SET 
  voting_status = 'closed',
  voting_closed_at = COALESCE(kommandomitglied_approved_at, kommandomitglied_override_at, updated_at, now())
WHERE 
  requires_kommandomitglied_approval = true
  AND voting_status = 'open'
  AND (
    -- Already approved via voting
    kommandomitglied_approved_at IS NOT NULL
    -- Or overridden by Kommandant
    OR kommandomitglied_override_at IS NOT NULL
    -- Or final status reached
    OR status IN ('genehmigt', 'abgelehnt', 'abgeschlossen')
  );