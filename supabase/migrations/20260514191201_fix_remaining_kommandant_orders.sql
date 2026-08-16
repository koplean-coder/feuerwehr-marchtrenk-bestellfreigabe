-- Check and fix any remaining orders where Kommandant is the assigned Bereichsleiter
-- and order status should be directly approved

-- First, let's fix orders with status 'ausstehend_kommandant' where the bereichsleiter is a Kommandant
UPDATE orders o
SET 
  status = 'freigegeben_kommandant',
  kommandant_id = COALESCE(o.kommandant_id, o.bereichsleiter_id),
  kommandant_approved_at = COALESCE(o.kommandant_approved_at, o.bereichsleiter_approved_at, NOW()),
  updated_at = NOW()
FROM profiles p
WHERE o.bereichsleiter_id = p.id
  AND p.role = 'kommandant'
  AND o.status = 'ausstehend_kommandant';