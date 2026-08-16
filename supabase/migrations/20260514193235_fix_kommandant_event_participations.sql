-- Fix the Interschutz event participation
-- If it's in 'submitted' status and created by a Kommandant, auto-approve it

UPDATE event_participations ep
SET 
  status = 'approved',
  approved_by = ep.created_by,
  approved_at = COALESCE(ep.submitted_at, NOW()),
  updated_at = NOW()
FROM profiles p
WHERE ep.created_by = p.id
  AND p.role = 'kommandant'
  AND ep.status = 'submitted';