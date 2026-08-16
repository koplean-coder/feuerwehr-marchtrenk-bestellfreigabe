-- =============================================
-- COMMAND DECISION ITEMS (Beschlusspunkte)
-- Ermöglicht mehrere Beschlusspunkte pro Antrag
-- =============================================

-- Items table for individual decision points
CREATE TABLE public.command_decision_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_id UUID NOT NULL REFERENCES public.command_decisions(id) ON DELETE CASCADE,
  item_number INTEGER NOT NULL DEFAULT 1,
  description TEXT NOT NULL,
  -- Voting status for this specific item
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'voting', 'approved', 'rejected')),
  voting_status TEXT CHECK (voting_status IN ('open', 'closed')),
  voting_result TEXT CHECK (voting_result IN ('approved', 'rejected', 'overridden')),
  voting_opened_at TIMESTAMP WITH TIME ZONE,
  voting_closed_at TIMESTAMP WITH TIME ZONE,
  voting_closed_by UUID REFERENCES auth.users(id),
  voting_override_by UUID REFERENCES auth.users(id),
  voting_override_reason TEXT,
  voting_override_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(decision_id, item_number)
);

-- Votes for individual items (not the whole decision)
CREATE TABLE public.command_decision_item_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.command_decision_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  vote TEXT NOT NULL CHECK (vote IN ('approve', 'reject', 'abstain')),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(item_id, user_id)
);

-- Missing votes tracking for items
CREATE TABLE public.command_decision_item_votes_missing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.command_decision_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(item_id, user_id)
);

-- Vote history for items
CREATE TABLE public.command_decision_item_vote_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.command_decision_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  old_vote TEXT,
  new_vote TEXT NOT NULL,
  old_reason TEXT,
  new_reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_command_decision_items_decision_id ON public.command_decision_items(decision_id);
CREATE INDEX idx_command_decision_items_status ON public.command_decision_items(status);
CREATE INDEX idx_command_decision_item_votes_item_id ON public.command_decision_item_votes(item_id);
CREATE INDEX idx_command_decision_item_votes_user_id ON public.command_decision_item_votes(user_id);

-- Enable RLS
ALTER TABLE public.command_decision_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_decision_item_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_decision_item_votes_missing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_decision_item_vote_history ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- ITEMS: All authenticated users can view
CREATE POLICY "command_decision_items_select" ON public.command_decision_items
  FOR SELECT TO authenticated
  USING (true);

-- ITEMS: Creator of parent decision can insert/update/delete
CREATE POLICY "command_decision_items_insert" ON public.command_decision_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.command_decisions cd
      WHERE cd.id = decision_id
      AND cd.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "command_decision_items_update" ON public.command_decision_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.command_decisions cd
      WHERE cd.id = decision_id
      AND (
        cd.created_by = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = (SELECT auth.uid())
          AND role IN ('kommandant', 'admin')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.command_decisions cd
      WHERE cd.id = decision_id
      AND (
        cd.created_by = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = (SELECT auth.uid())
          AND role IN ('kommandant', 'admin')
        )
      )
    )
  );

CREATE POLICY "command_decision_items_delete" ON public.command_decision_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.command_decisions cd
      WHERE cd.id = decision_id
      AND cd.created_by = (SELECT auth.uid())
      AND cd.status = 'draft'
    )
  );

-- ITEM VOTES: All authenticated can view
CREATE POLICY "command_decision_item_votes_select" ON public.command_decision_item_votes
  FOR SELECT TO authenticated
  USING (true);

-- ITEM VOTES: Users can insert/update/delete their own vote
CREATE POLICY "command_decision_item_votes_insert" ON public.command_decision_item_votes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "command_decision_item_votes_update" ON public.command_decision_item_votes
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "command_decision_item_votes_delete" ON public.command_decision_item_votes
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ITEM VOTES MISSING: All authenticated can view
CREATE POLICY "command_decision_item_votes_missing_select" ON public.command_decision_item_votes_missing
  FOR SELECT TO authenticated
  USING (true);

-- ITEM VOTES MISSING: Kommandant/Admin can insert
CREATE POLICY "command_decision_item_votes_missing_insert" ON public.command_decision_item_votes_missing
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('kommandant', 'admin')
    )
  );

-- ITEM VOTE HISTORY: All authenticated can view
CREATE POLICY "command_decision_item_vote_history_select" ON public.command_decision_item_vote_history
  FOR SELECT TO authenticated
  USING (true);

-- ITEM VOTE HISTORY: Allow inserts for authenticated users
CREATE POLICY "command_decision_item_vote_history_insert" ON public.command_decision_item_vote_history
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_command_decision_items_updated_at
  BEFORE UPDATE ON public.command_decision_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();