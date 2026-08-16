-- Delete all messages/notifications from the system
DELETE FROM public.notifications WHERE notification_type = 'message';

-- If you want to delete ALL notifications (not just messages), use this instead:
-- DELETE FROM public.notifications;