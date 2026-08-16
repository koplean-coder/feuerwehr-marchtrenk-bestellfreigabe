-- Preisfelder nullable machen für flexible Preisgestaltung
-- Mindestens ein Preis muss über die Anwendung gesetzt werden

ALTER TABLE rental_items 
ALTER COLUMN price_short DROP NOT NULL,
ALTER COLUMN price_week DROP NOT NULL,
ALTER COLUMN price_day DROP NOT NULL;

-- Defaults auf NULL setzen
ALTER TABLE rental_items 
ALTER COLUMN price_short SET DEFAULT NULL,
ALTER COLUMN price_week SET DEFAULT NULL,
ALTER COLUMN price_day SET DEFAULT NULL;

COMMENT ON COLUMN rental_items.price_short IS 'Tagespreis - optional, wenn nur Pauschalpreis genutzt wird';
COMMENT ON COLUMN rental_items.price_week IS 'Pauschalpreis/Wochenpreis - optional, wenn nur Tagespreis genutzt wird';
COMMENT ON COLUMN rental_items.price_day IS 'Zusatztag-Preis für längere Ausleihen - optional';