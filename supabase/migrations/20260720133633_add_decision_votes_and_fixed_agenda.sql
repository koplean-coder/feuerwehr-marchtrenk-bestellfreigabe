-- Individual votes per decision per person
CREATE TABLE public.meeting_decision_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_id UUID NOT NULL REFERENCES public.meeting_decisions(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('dafuer', 'dagegen', 'enthaltung')),
  voted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(decision_id, profile_id)
);

-- Index for faster lookups
CREATE INDEX idx_decision_votes_decision_id ON public.meeting_decision_votes(decision_id);
CREATE INDEX idx_decision_votes_profile_id ON public.meeting_decision_votes(profile_id);

-- RLS for decision votes
ALTER TABLE public.meeting_decision_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view decision votes for meetings they can access"
  ON public.meeting_decision_votes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meeting_decisions md
      JOIN meetings m ON m.id = md.meeting_id
      WHERE md.id = decision_id
      AND public.can_access_meeting(m.id)
    )
  );

CREATE POLICY "Managers can insert decision votes"
  ON public.meeting_decision_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_meetings());

CREATE POLICY "Managers can update decision votes"
  ON public.meeting_decision_votes
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_meetings())
  WITH CHECK (public.can_manage_meetings());

CREATE POLICY "Managers can delete decision votes"
  ON public.meeting_decision_votes
  FOR DELETE
  TO authenticated
  USING (public.can_manage_meetings());

-- Add status field to agenda items for traffic light system
ALTER TABLE public.meeting_agenda_items 
  ADD COLUMN IF NOT EXISTS traffic_light TEXT DEFAULT 'gelb' CHECK (traffic_light IN ('rot', 'gelb', 'gruen')),
  ADD COLUMN IF NOT EXISTS requires_decision BOOLEAN DEFAULT false;

-- Add fields for better decision tracking
ALTER TABLE public.meeting_decisions
  ADD COLUMN IF NOT EXISTS is_in_register BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS register_added_at TIMESTAMP WITH TIME ZONE;

-- Fixed agenda items config (stored as reference)
CREATE TABLE IF NOT EXISTS public.meeting_fixed_agenda_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sort_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  is_mandatory BOOLEAN DEFAULT false,
  meeting_type TEXT CHECK (meeting_type IN ('kommandositzung', 'erweitertes_kommando')) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_fixed_agenda_items ENABLE ROW LEVEL SECURITY;

-- Anyone can read fixed items
CREATE POLICY "Anyone can view fixed agenda items"
  ON public.meeting_fixed_agenda_items
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert standard fixed agenda items
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