-- Comprehensive fix for ALL orders where:
-- 1. Bereichsleiter is a Kommandant
-- 2. Status is one that indicates it's waiting for approval

UPDATE orders o
SET 
  status = 'freigegeben_kommandant',
  kommandant_id = COALESCE(o.kommandant_id, o.bereichsleiter_id),
  kommandant_approved_at = COALESCE(o.kommandant_approved_at, o.bereichsleiter_approved_at, NOW()),
  bereichsleiter_approved_at = COALESCE(o.bereichsleiter_approved_at, NOW()),
  updated_at = NOW()
FROM profiles p
WHERE o.bereichsleiter_id = p.id
  AND p.role = 'kommandant'
  AND o.status IN ('ausstehend_kommandant', 'freigegeben_bereichsleitung', 'ausstehend_bereichsleitung');