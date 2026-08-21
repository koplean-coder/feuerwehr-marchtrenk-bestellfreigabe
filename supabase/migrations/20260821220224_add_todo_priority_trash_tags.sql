-- Priorität und Papierkorb für todo_tasks
ALTER TABLE public.todo_tasks 
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 2 CHECK (priority >= 0 AND priority <= 3),
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Index für is_deleted
CREATE INDEX IF NOT EXISTS idx_todo_tasks_is_deleted ON public.todo_tasks(is_deleted);
CREATE INDEX IF NOT EXISTS idx_todo_tasks_priority ON public.todo_tasks(priority);

-- Tags Tabelle
CREATE TABLE IF NOT EXISTS public.todo_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Task-Tag Verknüpfungstabelle
CREATE TABLE IF NOT EXISTS public.todo_task_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.todo_tasks(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.todo_tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, tag_id)
);

-- RLS für todo_tags
ALTER TABLE public.todo_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tags" ON public.todo_tags
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = created_by);

CREATE POLICY "Users can create tags" ON public.todo_tags
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY "Users can update own tags" ON public.todo_tags
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = created_by)
  WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY "Users can delete own tags" ON public.todo_tags
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = created_by);

-- RLS für todo_task_tags
ALTER TABLE public.todo_task_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task tags" ON public.todo_task_tags
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.todo_tasks t 
    WHERE t.id = task_id 
    AND (t.created_by = (SELECT auth.uid()) OR t.assigned_to = (SELECT auth.uid()))
  ));

CREATE POLICY "Users can add task tags" ON public.todo_task_tags
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.todo_tasks t 
    WHERE t.id = task_id 
    AND (t.created_by = (SELECT auth.uid()) OR t.assigned_to = (SELECT auth.uid()))
  ));

CREATE POLICY "Users can remove task tags" ON public.todo_task_tags
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.todo_tasks t 
    WHERE t.id = task_id 
    AND (t.created_by = (SELECT auth.uid()) OR t.assigned_to = (SELECT auth.uid()))
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_todo_task_tags_task_id ON public.todo_task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_todo_task_tags_tag_id ON public.todo_task_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_todo_tags_created_by ON public.todo_tags(created_by);