-- Check the specific order and related data
SELECT 
  o.id,
  o.title,
  o.status,
  o.bereichsleiter_id,
  o.kommandant_id,
  o.bereichsleiter_approved_at,
  o.kommandant_approved_at,
  o.requires_kommandant_approval,
  p.full_name as bereichsleiter_name,
  p.role as bereichsleiter_role
FROM orders o
LEFT JOIN profiles p ON o.bereichsleiter_id = p.id
WHERE o.title LIKE '%Interschutz%' OR o.title LIKE '%Messe%';