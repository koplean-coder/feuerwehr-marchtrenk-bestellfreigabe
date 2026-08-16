-- Task Comments table for communication
CREATE TABLE public.todo_task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.todo_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_todo_task_comments_task_id ON public.todo_task_comments(task_id);
CREATE INDEX idx_todo_task_comments_user_id ON public.todo_task_comments(user_id);
CREATE INDEX idx_todo_task_comments_created_at ON public.todo_task_comments(created_at);

-- Enable RLS
ALTER TABLE public.todo_task_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Task owner, assignee, and shared members can read/write comments
CREATE POLICY "Users can view comments on accessible tasks"
  ON public.todo_task_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.todo_tasks t
      WHERE t.id = task_id
      AND (
        t.created_by = (SELECT auth.uid())
        OR t.assigned_to = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.todo_task_shares ts
          WHERE ts.task_id = t.id AND ts.user_id = (SELECT auth.uid())
        )
      )
    )
  );

CREATE POLICY "Users can add comments to accessible tasks"
  ON public.todo_task_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.todo_tasks t
      WHERE t.id = task_id
      AND (
        t.created_by = (SELECT auth.uid())
        OR t.assigned_to = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.todo_task_shares ts
          WHERE ts.task_id = t.id AND ts.user_id = (SELECT auth.uid())
        )
      )
    )
  );

CREATE POLICY "Users can update own comments"
  ON public.todo_task_comments
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.todo_task_comments
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);