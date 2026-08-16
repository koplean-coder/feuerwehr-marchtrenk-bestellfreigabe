-- Funktionen-Feld zur profiles Tabelle hinzufügen
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS functions text[] DEFAULT '{}';

COMMENT ON COLUMN public.profiles.functions IS 'Funktionen des Benutzers in der Feuerwehr (z.B. Gerätewart, Atemschutzwart)';