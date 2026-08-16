INSERT INTO public.notifications (user_id, notification_type, message, is_read)
SELECT id, 'order', 'Realtime aktiviert! Diese sollte jetzt sofort erscheinen! 🚀', false
FROM public.profiles
WHERE role = 'admin';