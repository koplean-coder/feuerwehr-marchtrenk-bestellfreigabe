-- Direkte Korrektur: Setze alle Bestellungen mit "Interschutz" im Titel auf freigegeben_kommandant
-- wenn sie noch in einem Freigabe-wartenden Status sind

UPDATE orders
SET 
  status = 'freigegeben_kommandant',
  bereichsleiter_approved_at = COALESCE(bereichsleiter_approved_at, NOW()),
  kommandant_approved_at = COALESCE(kommandant_approved_at, NOW()),
  updated_at = NOW()
WHERE (title ILIKE '%Interschutz%' OR title ILIKE '%Messe%')
  AND status IN ('eingereicht', 'ausstehend_kommandant', 'ausstehend_bereichsleitung', 'freigegeben_bereichsleitung');