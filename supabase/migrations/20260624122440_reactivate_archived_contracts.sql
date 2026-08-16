-- Archivierte Verträge wieder aktivieren
UPDATE rental_contracts
SET 
  status = 'active',
  returned_at = NULL,
  condition_return = NULL,
  damage_notes = NULL,
  additional_costs = NULL,
  additional_costs_reason = NULL
WHERE status = 'returned' OR returned_at IS NOT NULL;