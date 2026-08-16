-- Mängel-Historie zu Artikelstamm hinzufügen
ALTER TABLE rental_items 
ADD COLUMN IF NOT EXISTS condition_notes TEXT DEFAULT NULL;

-- Kommentar für Dokumentation
COMMENT ON COLUMN rental_items.condition_notes IS 'Persistente Mängel-Historie des Artikels, wird bei Rückgabe aktualisiert';

-- Index für schnellere Abfragen auf rental_contracts.returned_at
CREATE INDEX IF NOT EXISTS idx_rental_contracts_returned_at ON rental_contracts(returned_at);