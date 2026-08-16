-- RLS Policies für rental_contracts Tabelle
-- Erlaubt allen authentifizierten Benutzern das Lesen aller Verträge
CREATE POLICY "Authenticated users can view all rental contracts"
ON public.rental_contracts
FOR SELECT
TO authenticated
USING (true);

-- Erlaubt allen authentifizierten Benutzern das Erstellen von Verträgen
CREATE POLICY "Authenticated users can create rental contracts"
ON public.rental_contracts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Nur Admins und Kommandanten können Verträge löschen
CREATE POLICY "Admins can delete rental contracts"
ON public.rental_contracts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.role IN ('admin', 'kommandant')
  )
);

-- Authentifizierte Benutzer können Verträge aktualisieren
CREATE POLICY "Authenticated users can update rental contracts"
ON public.rental_contracts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);