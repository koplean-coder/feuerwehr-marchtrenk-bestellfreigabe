-- Einzelstück-Feld für Artikelstamm (Warnung bei Doppelbuchung)
ALTER TABLE rental_items 
ADD COLUMN IF NOT EXISTS is_single_item BOOLEAN NOT NULL DEFAULT true;

-- Kommentar für Dokumentation
COMMENT ON COLUMN rental_items.is_single_item IS 'Einzelstück: Bei true wird Warnung angezeigt wenn Artikel bereits verliehen ist';