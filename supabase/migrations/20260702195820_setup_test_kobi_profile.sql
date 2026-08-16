-- Kopiere die Rechte von Alexander Koblmüller auf den neuen Testbenutzer "test_kobi"
-- Aktualisiere das Profil wo der Name "test_kobi" enthält oder die E-Mail "test" enthält

UPDATE public.profiles
SET 
  role = 'bereichsleiter',
  functions = ARRAY['zeugwart', 'kommandomitglied']
WHERE 
  full_name ILIKE '%test_kobi%' 
  OR full_name ILIKE '%test kobi%'
  OR email ILIKE '%test%kobi%'
  OR email ILIKE 'test@%'
  OR (created_at > NOW() - INTERVAL '10 minutes' AND role = 'mitglied');