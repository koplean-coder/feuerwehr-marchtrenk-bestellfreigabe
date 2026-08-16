-- Add history entries for any orders that were fixed and don't have a correction entry yet
INSERT INTO order_history (order_id, action, old_status, new_status, performed_by, comment, created_at)
SELECT 
  o.id,
  'Automatische Korrektur: Kommandant als Bereichsleiter',
  'ausstehend_kommandant',
  'freigegeben_kommandant',
  o.kommandant_id,
  'Status korrigiert da Kommandant der zugewiesene Bereichsleiter war - beide Freigaben erfolgen gleichzeitig',
  NOW()
FROM orders o
JOIN profiles p ON o.bereichsleiter_id = p.id
WHERE p.role = 'kommandant'
  AND o.status = 'freigegeben_kommandant'
  AND o.kommandant_id = o.bereichsleiter_id
  AND NOT EXISTS (
    SELECT 1 FROM order_history oh 
    WHERE oh.order_id = o.id 
    AND (oh.action LIKE '%Korrektur%' OR oh.action LIKE '%Nachträglich%')
  );