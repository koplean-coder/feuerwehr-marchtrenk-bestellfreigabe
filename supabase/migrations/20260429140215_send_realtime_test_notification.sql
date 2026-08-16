INSERT INTO public.notifications (user_id, notification_type, message, is_read)
SELECT id, 'order', 'Echtzeit-Test: Diese Benachrichtigung sollte sofort erscheinen! ⚡', false
FROM public.profiles
WHERE role = 'admin';