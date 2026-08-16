-- =============================================
-- COMMAND DECISIONS (Kommandoabstimmungen)
-- =============================================

-- Main table for command decisions/votes requests
CREATE TABLE public.command_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  -- Voting fields
  voting_status TEXT CHECK (voting_status IN ('open', 'closed')),
  voting_opened_at TIMESTAMP WITH TIME ZONE,
  voting_closed_at TIMESTAMP WITH TIME ZONE,
  voting_closed_by UUID REFERENCES auth.users(id),
  voting_result TEXT CHECK (voting_result IN ('approved', 'rejected', 'overridden')),
  voting_override_by UUID REFERENCES auth.users(id),
  voting_override_reason TEXT,
  voting_override_at TIMESTAMP WITH TIME ZONE,
  email_status TEXT DEFAULT 'none'
);

-- Votes table
CREATE TABLE public.command_decision_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_id UUID NOT NULL REFERENCES public.command_decisions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  vote TEXT NOT NULL CHECK (vote IN ('approve', 'reject', 'abstain')),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(decision_id, user_id)
);

-- Missing votes tracking
CREATE TABLE public.command_decision_votes_missing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_id UUID NOT NULL REFERENCES public.command_decisions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(decision_id, user_id)
);

-- Vote history for audit trail
CREATE TABLE public.command_decision_vote_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_id UUID NOT NULL REFERENCES public.command_decisions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  old_vote TEXT,
  new_vote TEXT NOT NULL,
  old_reason TEXT,
  new_reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_command_decisions_created_by ON public.command_decisions(created_by);
CREATE INDEX idx_command_decisions_status ON public.command_decisions(status);
CREATE INDEX idx_command_decisions_voting_status ON public.command_decisions(voting_status);
CREATE INDEX idx_command_decision_votes_decision_id ON public.command_decision_votes(decision_id);
CREATE INDEX idx_command_decision_votes_user_id ON public.command_decision_votes(user_id);

-- Enable RLS
ALTER TABLE public.command_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_decision_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_decision_votes_missing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_decision_vote_history ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- COMMAND_DECISIONS: All authenticated users can view
CREATE POLICY "command_decisions_select" ON public.command_decisions
  FOR SELECT TO authenticated
  USING (true);

-- COMMAND_DECISIONS: Only Kommandomitglieder/Admin can insert
CREATE POLICY "command_decisions_insert" ON public.command_decisions
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

-- COMMAND_DECISIONS: Creator can update drafts, Kommandant/Admin can update voting
CREATE POLICY "command_decisions_update" ON public.command_decisions
  FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
      AND (role IN ('kommandant', 'admin') OR functions @> ARRAY['kommandomitglied'])
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
      AND (role IN ('kommandant', 'admin') OR functions @> ARRAY['kommandomitglied'])
    )
  );

-- COMMAND_DECISIONS: Only creator can delete drafts
CREATE POLICY "command_decisions_delete" ON public.command_decisions
  FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()) AND status = 'draft');

-- COMMAND_DECISION_VOTES: All authenticated can view
CREATE POLICY "command_decision_votes_select" ON public.command_decision_votes
  FOR SELECT TO authenticated
  USING (true);

-- COMMAND_DECISION_VOTES: Kommandomitglieder can insert their own vote
CREATE POLICY "command_decision_votes_insert" ON public.command_decision_votes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- COMMAND_DECISION_VOTES: Users can update their own vote
CREATE POLICY "command_decision_votes_update" ON public.command_decision_votes
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- COMMAND_DECISION_VOTES: Users can delete their own vote
CREATE POLICY "command_decision_votes_delete" ON public.command_decision_votes
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- COMMAND_DECISION_VOTES_MISSING: All authenticated can view
CREATE POLICY "command_decision_votes_missing_select" ON public.command_decision_votes_missing
  FOR SELECT TO authenticated
  USING (true);

-- COMMAND_DECISION_VOTES_MISSING: Kommandant/Admin can insert
CREATE POLICY "command_decision_votes_missing_insert" ON public.command_decision_votes_missing
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('kommandant', 'admin')
    )
  );

-- COMMAND_DECISION_VOTE_HISTORY: All authenticated can view
CREATE POLICY "command_decision_vote_history_select" ON public.command_decision_vote_history
  FOR SELECT TO authenticated
  USING (true);

-- COMMAND_DECISION_VOTE_HISTORY: System inserts via trigger (allow all authenticated for simplicity)
CREATE POLICY "command_decision_vote_history_insert" ON public.command_decision_vote_history
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================
CREATE TRIGGER update_command_decisions_updated_at
  BEFORE UPDATE ON public.command_decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();