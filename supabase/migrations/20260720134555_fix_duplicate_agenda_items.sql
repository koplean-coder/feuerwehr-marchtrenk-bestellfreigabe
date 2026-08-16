-- Delete duplicate fixed agenda items (keep only with proper umlauts)
DELETE FROM public.meeting_fixed_agenda_items WHERE title LIKE '%ue%' OR title LIKE '%ae%' OR title LIKE '%oe%';

-- Ensure correct items exist with proper umlauts
INSERT INTO public.meeting_fixed_agenda_items (sort_order, title, is_mandatory) VALUES
  (1, 'Begrüßung', false),
  (2, 'Anwesenheit und Beschlussfähigkeit', true),
  (3, 'Dringlichkeitsanträge - Abfrage ob vorliegend', true),
  (4, 'Niederschrift der letzten Sitzung', false),
  (5, 'Aufnahme, Beurlaubung, Entlassung, Ausschluss', false),
  (6, 'Offene Punkte', false),
  (7, 'Berufung gegen Strafbescheide des Kommandanten', false),
  (8, 'Nächste Sitzung - Termin festlegen', true),
  (9, 'Beschlüsse fassen', false),
  (10, 'Allfälliges', false)
ON CONFLICT DO NOTHING;