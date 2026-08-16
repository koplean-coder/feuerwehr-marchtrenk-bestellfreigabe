-- 1. Alle bestehenden User mit 'limited' auf 'full' setzen
UPDATE public.profiles
SET access_level = 'full'
WHERE access_level = 'limited' OR access_level IS NULL;

-- 2. Default-Wert für neue User auf 'full' setzen
ALTER TABLE public.profiles 
ALTER COLUMN access_level SET DEFAULT 'full';