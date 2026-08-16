-- Find and fix the Interschutz order specifically
-- First, update any order with 'ausstehend_kommandant' or 'eingereicht' status 
-- where the bereichsleiter is a Kommandant and it should be auto-approved

UPDATE orders o
SET 
  status = 'freigegeben_kommandant',
  kommandant_id = o.bereichsleiter_id,
  kommandant_approved_at = COALESCE(o.bereichsleiter_approved_at, NOW()),
  bereichsleiter_approved_at = COALESCE(o.bereichsleiter_approved_at, NOW()),
  updated_at = NOW()
FROM profiles p
WHERE o.bereichsleiter_id = p.id
  AND p.role = 'kommandant'
  AND o.status IN ('ausstehend_kommandant', 'freigegeben_bereichsleitung')
  AND o.title LIKE '%Interschutz%'
RETURNING o.id, o.title, o.status;