
-- Bestehende Update-Policy für Profiles löschen
DROP POLICY IF EXISTS "Benutzer können ihr eigenes Profil aktualisieren" ON public.profiles;

-- Neue Policy: Benutzer kann eigenes Profil aktualisieren
CREATE POLICY "Benutzer kann eigenes Profil aktualisieren"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- Neue Policy: Admin und Kommandant können alle Profile aktualisieren
CREATE POLICY "Admin und Kommandant können alle Profile aktualisieren"
  ON public.profiles FOR UPDATE
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
