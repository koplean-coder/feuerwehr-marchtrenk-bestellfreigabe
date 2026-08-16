-- Funktion "lieferanten_erfassen" hinzufügen (falls nicht vorhanden)
INSERT INTO public.functions (name, label)
VALUES ('lieferanten_erfassen', 'Lieferanten erfassen')
ON CONFLICT (name) DO NOTHING;

-- Marcel Gradauer die Funktion zuweisen
UPDATE public.profiles 
SET functions = array_append(
  COALESCE(functions, ARRAY[]::text[]), 
  'lieferanten_erfassen'
)
WHERE full_name ILIKE '%Marcel Gradauer%'
  AND NOT ('lieferanten_erfassen' = ANY(COALESCE(functions, ARRAY[]::text[])));