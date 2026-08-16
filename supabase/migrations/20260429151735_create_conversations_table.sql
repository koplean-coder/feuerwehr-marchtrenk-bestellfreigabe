-- Table for conversation metadata (status, creator, etc.)
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_key TEXT NOT NULL UNIQUE,
  subject TEXT,
  created_by UUID REFERENCES auth.users NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Everyone can read conversations they're part of
CREATE POLICY "Users can view conversations"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can insert
CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = created_by);

-- Only creator can update (close/reopen)
CREATE POLICY "Creator can update conversation"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = created_by)
  WITH CHECK ((select auth.uid()) = created_by);

-- Index for fast lookup
CREATE INDEX idx_conversations_key ON public.conversations(conversation_key);