INSERT INTO public.notifications (user_id, notification_type, message, is_read)
SELECT id, 'order', 'Test-Benachrichtigung: Die blinkende Glocke funktioniert! 🔔', false
FROM public.profiles
WHERE role = 'admin';