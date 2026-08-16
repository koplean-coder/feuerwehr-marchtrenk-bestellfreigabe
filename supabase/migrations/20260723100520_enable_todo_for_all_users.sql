-- Todo für alle aktivieren
-- Wenn todo_enabled existiert, update; sonst insert
INSERT INTO public.settings (key, value)
VALUES 
  ('todo_enabled', 'true'),
  ('todo_view_users', '[]')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;