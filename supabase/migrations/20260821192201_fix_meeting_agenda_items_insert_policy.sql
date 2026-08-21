-- Prüfe und erstelle INSERT-Policy für meeting_agenda_items
-- Authentifizierte Benutzer dürfen Agenda-Items einfügen

-- Lösche existierende INSERT-Policy falls vorhanden
DROP POLICY IF EXISTS "Users can insert agenda items" ON public.meeting_agenda_items;
DROP POLICY IF EXISTS "Authenticated users can insert agenda items" ON public.meeting_agenda_items;

-- Neue INSERT-Policy: Authentifizierte Benutzer können Agenda-Items einfügen
-- (Die Berechtigung wird im Code geprüft - hier nur DB-Level-Zugriff)
CREATE POLICY "Authenticated users can insert agenda items"
  ON public.meeting_agenda_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Stelle sicher dass auch UPDATE und DELETE für authentifizierte Benutzer möglich ist
DROP POLICY IF EXISTS "Users can update agenda items" ON public.meeting_agenda_items;
DROP POLICY IF EXISTS "Authenticated users can update agenda items" ON public.meeting_agenda_items;

CREATE POLICY "Authenticated users can update agenda items"
  ON public.meeting_agenda_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete agenda items" ON public.meeting_agenda_items;
DROP POLICY IF EXISTS "Authenticated users can delete agenda items" ON public.meeting_agenda_items;

CREATE POLICY "Authenticated users can delete agenda items"
  ON public.meeting_agenda_items
  FOR DELETE
  TO authenticated
  USING (true);