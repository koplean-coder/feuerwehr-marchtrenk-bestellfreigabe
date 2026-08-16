-- Admin und Kommandant können alle Vorlagen löschen
CREATE POLICY "Admin can delete all templates"
  ON public.event_form_templates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'kommandant')
    )
  );