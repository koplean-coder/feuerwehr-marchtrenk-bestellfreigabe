-- =============================================================================
-- BILD-VOTING: Daumen hoch/runter pro Bild
-- =============================================================================

CREATE TABLE public.idea_image_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_id UUID NOT NULL REFERENCES public.idea_images(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(image_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_idea_image_votes_image_id ON public.idea_image_votes(image_id);
CREATE INDEX idx_idea_image_votes_user_id ON public.idea_image_votes(user_id);

-- RLS
ALTER TABLE public.idea_image_votes ENABLE ROW LEVEL SECURITY;

-- SELECT: Authenticated users can see all image votes (nur Ergebnisse, keine Namen)
CREATE POLICY "Authenticated users can view image votes" ON public.idea_image_votes
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: Authenticated users can add their own vote
CREATE POLICY "Users can add their own image vote" ON public.idea_image_votes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- UPDATE: Users can update their own vote
CREATE POLICY "Users can update their own image vote" ON public.idea_image_votes
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- DELETE: Users can remove their own vote
CREATE POLICY "Users can delete their own image vote" ON public.idea_image_votes
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- UMFRAGEN: Ersteller kann eigene Antwortoptionen definieren
-- =============================================================================

CREATE TABLE public.idea_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE UNIQUE,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_idea_polls_idea_id ON public.idea_polls(idea_id);

-- RLS
ALTER TABLE public.idea_polls ENABLE ROW LEVEL SECURITY;

-- SELECT: Everyone can see polls
CREATE POLICY "Authenticated users can view polls" ON public.idea_polls
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: Only idea creator can create poll for their idea
CREATE POLICY "Idea creator can create poll" ON public.idea_polls
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = created_by
    AND EXISTS (
      SELECT 1 FROM public.ideas
      WHERE ideas.id = idea_id
      AND ideas.created_by = (SELECT auth.uid())
    )
  );

-- UPDATE: Only poll creator can update
CREATE POLICY "Poll creator can update poll" ON public.idea_polls
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = created_by)
  WITH CHECK ((SELECT auth.uid()) = created_by);

-- DELETE: Only poll creator can delete
CREATE POLICY "Poll creator can delete poll" ON public.idea_polls
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = created_by);

-- =============================================================================
-- UMFRAGE-ABSTIMMUNGEN: Jeder User kann pro Umfrage eine Option wählen
-- =============================================================================

CREATE TABLE public.idea_poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.idea_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL CHECK (option_index >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Indexes
CREATE INDEX idx_idea_poll_votes_poll_id ON public.idea_poll_votes(poll_id);
CREATE INDEX idx_idea_poll_votes_user_id ON public.idea_poll_votes(user_id);

-- RLS
ALTER TABLE public.idea_poll_votes ENABLE ROW LEVEL SECURITY;

-- SELECT: Everyone can see poll votes (nur Anzahl, keine Namen)
CREATE POLICY "Authenticated users can view poll votes" ON public.idea_poll_votes
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: Users can add their own vote
CREATE POLICY "Users can add their own poll vote" ON public.idea_poll_votes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- UPDATE: Users can change their vote
CREATE POLICY "Users can update their own poll vote" ON public.idea_poll_votes
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- DELETE: Users can remove their vote
CREATE POLICY "Users can delete their own poll vote" ON public.idea_poll_votes
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);