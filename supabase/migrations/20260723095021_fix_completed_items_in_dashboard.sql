-- Fix 1: Task "Beibehalten des Fensters" - Status 'behoben' auf 'completed' setzen
-- damit es aus "Meine Aufgaben" verschwindet
UPDATE public.tasks 
SET status = 'completed'
WHERE title ILIKE '%Beibehalten des Fensters%'
  AND status = 'behoben';

-- Fix 2: Kommandoabstimmung KA-2026-0001 schließen
UPDATE public.command_decisions
SET voting_status = 'closed',
    voting_closed_at = NOW(),
    status = 'approved',
    voting_result = 'approved'
WHERE reference_number = 'KA-2026-0001'
  AND voting_status = 'open';