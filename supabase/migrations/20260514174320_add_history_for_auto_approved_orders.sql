-- Add history entries for orders that were auto-approved
-- This creates a combined history entry showing both approvals happened together

INSERT INTO order_history (order_id, action, old_status, new_status, performed_by, comment, created_at)
SELECT 
  o.id,
  'Direkte Freigabe durch Kommandant (als Bereichsleiter) - Nachträgliche Korrektur',
  'ausstehend_kommandant',
  'freigegeben_kommandant',
  o.kommandant_id,
  'Automatisch korrigiert: Kommandant war zugewiesener Bereichsleiter, daher direkte Freigabe',
  NOW()
FROM orders o
JOIN profiles p ON o.bereichsleiter_id = p.id
WHERE p.role = 'kommandant'
  AND o.status = 'freigegeben_kommandant'
  AND o.kommandant_id = o.bereichsleiter_id
  AND o.kommandant_approved_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM order_history oh 
    WHERE oh.order_id = o.id 
    AND oh.action LIKE '%Nachträgliche Korrektur%'
  );