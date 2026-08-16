-- Fix any event participations that are in 'submitted' status 
-- where the creator is Kommandant (auto-approve)
UPDATE event_participations ep
SET 
  status = 'approved',
  approved_by = ep.created_by,
  approved_at = NOW(),
  updated_at = NOW()
FROM profiles p
WHERE ep.created_by = p.id
  AND p.role = 'kommandant'
  AND ep.status = 'submitted'
  AND ep.event_name LIKE '%Interschutz%';