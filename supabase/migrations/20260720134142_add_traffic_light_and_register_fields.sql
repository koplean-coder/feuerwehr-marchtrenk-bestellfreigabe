-- Add status field to agenda items for traffic light system
ALTER TABLE public.meeting_agenda_items 
  ADD COLUMN IF NOT EXISTS traffic_light TEXT DEFAULT 'gelb',
  ADD COLUMN IF NOT EXISTS requires_decision BOOLEAN DEFAULT false;

-- Add fields for better decision tracking
ALTER TABLE public.meeting_decisions
  ADD COLUMN IF NOT EXISTS is_in_register BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS register_added_at TIMESTAMP WITH TIME ZONE;

-- Ensure fixed agenda items exist
INSERT INTO public.meeting_fixed_agenda_items (sort_order, title, is_mandatory) VALUES
  (1, 'Begruessung', false),
  (2, 'Anwesenheit und Beschlussfaehigkeit', true),
  (3, 'Dringlichkeitsantraege - Abfrage ob vorliegend', true),
  (4, 'Niederschrift der letzten Sitzung', false),
  (5, 'Aufnahme, Beurlaubung, Entlassung, Ausschluss', false),
  (6, 'Offene Punkte', false),
  (7, 'Berufung gegen Strafbescheide des Kommandanten', false),
  (8, 'Naechste Sitzung - Termin festlegen', true),
  (9, 'Beschluesse fassen', false),
  (10, 'Allfaelliges', false)
ON CONFLICT DO NOTHING;