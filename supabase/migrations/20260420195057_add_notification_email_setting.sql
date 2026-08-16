
-- Einstellung für Benachrichtigungs-E-Mail hinzufügen
INSERT INTO public.settings (key, value) 
VALUES ('notification_email', '') 
ON CONFLICT (key) DO NOTHING;
