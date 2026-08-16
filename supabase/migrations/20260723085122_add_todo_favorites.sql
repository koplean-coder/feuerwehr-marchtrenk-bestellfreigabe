-- Todo Favorites table for user-specific favorites
CREATE TABLE public.todo_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('list', 'group')),
  item_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);

-- Index for fast lookups
CREATE INDEX idx_todo_favorites_user_id ON public.todo_favorites(user_id);
CREATE INDEX idx_todo_favorites_item ON public.todo_favorites(item_type, item_id);

-- Enable RLS
ALTER TABLE public.todo_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own favorites
CREATE POLICY "Users can view own favorites"
  ON public.todo_favorites
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can add own favorites"
  ON public.todo_favorites
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can remove own favorites"
  ON public.todo_favorites
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);