-- Setze kassa auf vollen Zugriff
UPDATE public.profiles
SET access_level = 'full'
WHERE LOWER(full_name) = 'kassa'
   OR LOWER(email) LIKE '%kassa%';