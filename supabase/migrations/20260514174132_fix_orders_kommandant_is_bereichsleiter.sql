-- Fix existing orders where the Bereichsleiter is also the Kommandant
-- and the order is waiting for Kommandant approval

-- Update orders where:
-- 1. Status is 'ausstehend_kommandant' (waiting for Kommandant)
-- 2. The assigned bereichsleiter_id belongs to a user with role 'kommandant'
-- This means the Kommandant already approved as Bereichsleiter, so we auto-approve

UPDATE orders o
SET 
  status = 'freigegeben_kommandant',
  kommandant_id = o.bereichsleiter_id,
  kommandant_approved_at = COALESCE(o.bereichsleiter_approved_at, NOW()),
  updated_at = NOW()
FROM profiles p
WHERE o.bereichsleiter_id = p.id
  AND p.role = 'kommandant'
  AND o.status = 'ausstehend_kommandant';

-- Also fix orders that are 'freigegeben_bereichsleitung' where bereichsleiter is kommandant
-- and kommandant approval is required
UPDATE orders o
SET 
  status = 'freigegeben_kommandant',
  kommandant_id = o.bereichsleiter_id,
  kommandant_approved_at = COALESCE(o.bereichsleiter_approved_at, NOW()),
  updated_at = NOW()
FROM profiles p
WHERE o.bereichsleiter_id = p.id
  AND p.role = 'kommandant'
  AND o.status = 'freigegeben_bereichsleitung'
  AND o.requires_kommandant_approval = true;