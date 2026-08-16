-- Email-Status ENUM erstellen
CREATE TYPE email_status AS ENUM ('none', 'sent', 'failed', 'partial');

-- Spalte zu order_history hinzufügen
ALTER TABLE order_history ADD COLUMN email_status email_status DEFAULT 'none';

-- Kommentar zur Dokumentation
COMMENT ON COLUMN order_history.email_status IS 'none=keine E-Mail gesendet, sent=erfolgreich, failed=fehlgeschlagen, partial=teilweise gesendet';