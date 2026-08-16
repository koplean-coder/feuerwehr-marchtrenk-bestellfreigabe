-- Create user presence table to track online users
CREATE TABLE public.user_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for efficient queries
CREATE INDEX idx_user_presence_last_seen ON public.user_presence(last_seen DESC);
CREATE INDEX idx_user_presence_user_id ON public.user_presence(user_id);

-- Enable RLS
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can update their own presence, authorized users can read all
CREATE POLICY "Users can insert their own presence"
  ON public.user_presence FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own presence"
  ON public.user_presence FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Authorized users can read presence"
  ON public.user_presence FOR SELECT
  TO authenticated
  USING (true);

-- Add setting for special view access (JSON array of user IDs)
INSERT INTO settings (key, value) VALUES
  ('online_view_users', '[]')
ON CONFLICT (key) DO NOTHING;