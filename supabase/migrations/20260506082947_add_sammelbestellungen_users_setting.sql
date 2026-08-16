-- Einstellung für Sammelbestellungen-Benutzer hinzufügen
INSERT INTO public.settings (key, value)
VALUES ('sammelbestellungen_users', '[]')
ON CONFLICT (key) DO NOTHING;