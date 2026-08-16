-- Menu-Favoriten Feld zur profiles Tabelle hinzufügen
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS menu_favorites TEXT[] DEFAULT ARRAY['/', '/bestellungen', '/aufgaben', '/antragsformulare', '/kassier'];

COMMENT ON COLUMN public.profiles.menu_favorites IS 'Array von Pfaden die der User als Favoriten im Menü anzeigen möchte';