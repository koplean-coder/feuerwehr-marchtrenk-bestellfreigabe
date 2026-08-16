-- Funktion "Kommandant" hinzufügen (falls nicht vorhanden)
INSERT INTO public.functions (name, label)
VALUES ('kommandant', 'Kommandant')
ON CONFLICT (name) DO NOTHING;