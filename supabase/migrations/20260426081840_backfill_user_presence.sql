-- Insert presence records for all users who don't have one yet
-- Set their last_seen to their profile created_at date as initial value
INSERT INTO public.user_presence (user_id, last_seen, created_at)
SELECT p.id, p.created_at, now()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_presence up WHERE up.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;