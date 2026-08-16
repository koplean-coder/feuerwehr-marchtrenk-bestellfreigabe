-- Tabelle für Formular-Vorlagen
CREATE TABLE public.event_form_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  event_name TEXT NOT NULL,
  location TEXT NOT NULL,
  date_time TEXT NOT NULL,
  adjustment TEXT NOT NULL,
  adjustment_note TEXT,
  registration_deadline TEXT NOT NULL,
  categories JSONB DEFAULT '[]',
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE public.event_form_templates ENABLE ROW LEVEL SECURITY;

-- Jeder authentifizierte Benutzer kann seine eigenen Vorlagen sehen
CREATE POLICY "Users can view own templates"
  ON public.event_form_templates
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = created_by);

-- Jeder authentifizierte Benutzer kann Vorlagen erstellen
CREATE POLICY "Users can create templates"
  ON public.event_form_templates
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = created_by);

-- Jeder authentifizierte Benutzer kann seine eigenen Vorlagen bearbeiten
CREATE POLICY "Users can update own templates"
  ON public.event_form_templates
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = created_by)
  WITH CHECK ((select auth.uid()) = created_by);

-- Jeder authentifizierte Benutzer kann seine eigenen Vorlagen löschen
CREATE POLICY "Users can delete own templates"
  ON public.event_form_templates
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = created_by);

-- Admin und Kommandant können alle Vorlagen sehen
CREATE POLICY "Admin can view all templates"
  ON public.event_form_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'kommandant')
    )
  );

-- Index für schnellere Abfragen
CREATE INDEX event_form_templates_created_by_idx ON public.event_form_templates(created_by);
CREATE INDEX event_form_templates_created_at_idx ON public.event_form_templates(created_at DESC);