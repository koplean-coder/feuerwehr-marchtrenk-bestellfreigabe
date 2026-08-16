-- Zusatzkosten-Felder für Rückgabe-Protokoll
ALTER TABLE rental_contracts 
ADD COLUMN IF NOT EXISTS additional_costs NUMERIC(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS additional_costs_reason TEXT DEFAULT NULL;

-- Kommentare für Dokumentation
COMMENT ON COLUMN rental_contracts.additional_costs IS 'Zusatzkosten bei Rückgabe (z.B. Reinigung, Reparatur)';
COMMENT ON COLUMN rental_contracts.additional_costs_reason IS 'Begründung für Zusatzkosten';