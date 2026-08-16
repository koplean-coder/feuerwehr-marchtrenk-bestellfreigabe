-- Check if this is an event participation instead of an order
SELECT 
  ep.id,
  ep.event_name,
  ep.status,
  ep.created_by,
  ep.approved_by,
  ep.approved_at,
  p.full_name as creator_name,
  p.role as creator_role
FROM event_participations ep
LEFT JOIN profiles p ON ep.created_by = p.id
WHERE ep.event_name LIKE '%Interschutz%' OR ep.event_name LIKE '%Messe%';