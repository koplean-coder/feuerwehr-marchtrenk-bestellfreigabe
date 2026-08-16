-- Sonderpreis-Felder für Leihverträge
ALTER TABLE rental_contracts 
ADD COLUMN IF NOT EXISTS has_custom_price BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_price DECIMAL(10,2) DEFAULT NULL;