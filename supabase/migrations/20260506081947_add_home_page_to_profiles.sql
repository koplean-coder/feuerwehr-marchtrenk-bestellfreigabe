-- Spalte für persönliche Startseite hinzufügen
ALTER TABLE public.profiles 
ADD COLUMN home_page TEXT DEFAULT '/' NOT NULL;

-- Kommentar zur Dokumentation
COMMENT ON COLUMN public.profiles.home_page IS 'Persönliche Startseite des Benutzers (z.B. /, /bestellungen, /kassier)';