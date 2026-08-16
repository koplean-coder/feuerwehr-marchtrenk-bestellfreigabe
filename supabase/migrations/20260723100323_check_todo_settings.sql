-- Prüfe die aktuellen Todo-Einstellungen
SELECT key, value FROM public.settings 
WHERE key IN ('todo_enabled', 'todo_view_users', 'todo_admin_users')
ORDER BY key;