-- Create vote logs table for tracking voting history
CREATE TABLE IF NOT EXISTS public.idea_vote_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('added', 'changed', 'removed')),
  previous_vote TEXT,
  new_vote TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on vote logs
ALTER TABLE public.idea_vote_logs ENABLE ROW LEVEL SECURITY;

-- Vote logs: authenticated users can insert their own logs
CREATE POLICY "Users can insert own vote logs"
  ON public.idea_vote_logs
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Vote logs: authenticated users can view all logs (for transparency)
CREATE POLICY "Authenticated users can view vote logs"
  ON public.idea_vote_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Add index for faster queries
CREATE INDEX idx_idea_vote_logs_idea_id ON public.idea_vote_logs(idea_id);
CREATE INDEX idx_idea_vote_logs_user_id ON public.idea_vote_logs(user_id);
CREATE INDEX idx_idea_vote_logs_created_at ON public.idea_vote_logs(created_at DESC);

-- Fix idea_comments RLS policies
-- Drop existing policies if they exist and recreate properly
DROP POLICY IF EXISTS "Users can insert own comments" ON public.idea_comments;
DROP POLICY IF EXISTS "Users can view all comments" ON public.idea_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.idea_comments;

-- Allow authenticated users to insert comments
CREATE POLICY "Users can insert own comments"
  ON public.idea_comments
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Allow authenticated users to view all comments
CREATE POLICY "Users can view all comments"
  ON public.idea_comments
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to delete their own comments
CREATE POLICY "Users can delete own comments"
  ON public.idea_comments
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Also fix idea_votes RLS if needed
DROP POLICY IF EXISTS "Users can insert own votes" ON public.idea_votes;
DROP POLICY IF EXISTS "Users can view all votes" ON public.idea_votes;
DROP POLICY IF EXISTS "Users can update own votes" ON public.idea_votes;
DROP POLICY IF EXISTS "Users can delete own votes" ON public.idea_votes;

CREATE POLICY "Users can insert own votes"
  ON public.idea_votes
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view all votes"
  ON public.idea_votes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own votes"
  ON public.idea_votes
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own votes"
  ON public.idea_votes
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);