-- Tabelle für Funktionen (Gerätewart, Atemschutzwart, etc.)
CREATE TABLE public.functions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE public.functions ENABLE ROW LEVEL SECURITY;

-- Jeder eingeloggte Benutzer kann Funktionen lesen
CREATE POLICY "Authenticated users can read functions"
  ON public.functions
  FOR SELECT
  TO authenticated
  USING (true);

-- Nur Admin und Kommandant können Funktionen erstellen
CREATE POLICY "Admin and Kommandant can insert functions"
  ON public.functions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'kommandant')
    )
  );

-- Nur Admin und Kommandant können Funktionen bearbeiten
CREATE POLICY "Admin and Kommandant can update functions"
  ON public.functions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'kommandant')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'kommandant')
    )
  );

-- Nur Admin und Kommandant können Funktionen löschen
CREATE POLICY "Admin and Kommandant can delete functions"
  ON public.functions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'kommandant')
    )
  );

-- Index für schnelle Suche
CREATE INDEX idx_functions_name ON public.functions(name);

-- Standard-Funktionen einfügen
INSERT INTO public.functions (name, label) VALUES
  ('geraetewart', 'Gerätewart'),
  ('atemschutzwart', 'Atemschutzwart'),
  ('jugendwart', 'Jugendwart'),
  ('schriftfuehrer', 'Schriftführer'),
  ('kassier', 'Kassier'),
  ('zeugwart', 'Zeugwart'),
  ('funkwart', 'Funkwart'),
  ('fahrzeugwart', 'Fahrzeugwart'),
  ('sanitaetswart', 'Sanitätswart'),
  ('pressewart', 'Pressewart'),
  ('edv_wart', 'EDV-Wart'),
  ('zugskommandant', 'Zugskommandant'),
  ('gruppenkommandant', 'Gruppenkommandant');