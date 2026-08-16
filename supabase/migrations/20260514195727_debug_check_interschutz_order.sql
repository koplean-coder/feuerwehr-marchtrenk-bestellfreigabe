-- Debug: Finde die Bestellung "Besuch Messe Interschutz" und zeige alle relevanten Felder
SELECT 
  id,
  title,
  status,
  bereichsleiter_id,
  bereichsleiter_approved_at,
  kommandant_approved_at,
  created_by,
  created_at
FROM orders 
WHERE title ILIKE '%Interschutz%' OR title ILIKE '%Messe%'
ORDER BY created_at DESC;