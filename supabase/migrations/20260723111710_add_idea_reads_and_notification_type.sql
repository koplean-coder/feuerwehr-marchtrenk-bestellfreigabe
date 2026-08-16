-- Table to track which users have seen which ideas (for "new" badge)
CREATE TABLE public.idea_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(idea_id, user_id)
);

-- Index for faster queries
CREATE INDEX idx_idea_reads_user_id ON public.idea_reads(user_id);
CREATE INDEX idx_idea_reads_idea_id ON public.idea_reads(idea_id);

-- Enable RLS
ALTER TABLE public.idea_reads ENABLE ROW LEVEL SECURITY;

-- Users can see their own read status
CREATE POLICY "Users can view own idea reads"
ON public.idea_reads FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Users can mark ideas as read
CREATE POLICY "Users can insert own idea reads"
ON public.idea_reads FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can delete their own read status (to mark as unread)
CREATE POLICY "Users can delete own idea reads"
ON public.idea_reads FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Add idea_id column to notifications table for linking idea notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE;

-- Create index for idea notifications
CREATE INDEX IF NOT EXISTS idx_notifications_idea_id ON public.notifications(idea_id);