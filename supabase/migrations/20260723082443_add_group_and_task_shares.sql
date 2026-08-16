-- =====================================================
-- PHASE 1: Group Shares Table
-- =====================================================

-- Table for group-level sharing
CREATE TABLE public.todo_group_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.todo_list_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'edit' CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Index for faster lookups
CREATE INDEX idx_todo_group_shares_group_id ON public.todo_group_shares(group_id);
CREATE INDEX idx_todo_group_shares_user_id ON public.todo_group_shares(user_id);

-- Enable RLS
ALTER TABLE public.todo_group_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for todo_group_shares
-- SELECT: Users can see shares where they are the shared user OR they own the group
CREATE POLICY "todo_group_shares_select" ON public.todo_group_shares
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.todo_list_groups
      WHERE id = group_id AND created_by = (SELECT auth.uid())
    )
  );

-- INSERT: Only group owners can add shares
CREATE POLICY "todo_group_shares_insert" ON public.todo_group_shares
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.todo_list_groups
      WHERE id = group_id AND created_by = (SELECT auth.uid())
    )
  );

-- UPDATE: Only group owners can update shares
CREATE POLICY "todo_group_shares_update" ON public.todo_group_shares
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.todo_list_groups
      WHERE id = group_id AND created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.todo_list_groups
      WHERE id = group_id AND created_by = (SELECT auth.uid())
    )
  );

-- DELETE: Only group owners can remove shares
CREATE POLICY "todo_group_shares_delete" ON public.todo_group_shares
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.todo_list_groups
      WHERE id = group_id AND created_by = (SELECT auth.uid())
    )
  );

-- =====================================================
-- PHASE 2: Task Shares Table
-- =====================================================

-- Table for task-level sharing (invite someone to a single task)
CREATE TABLE public.todo_task_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.todo_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'edit' CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- Index for faster lookups
CREATE INDEX idx_todo_task_shares_task_id ON public.todo_task_shares(task_id);
CREATE INDEX idx_todo_task_shares_user_id ON public.todo_task_shares(user_id);

-- Enable RLS
ALTER TABLE public.todo_task_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for todo_task_shares
-- SELECT: Users can see shares where they are the shared user OR they created the task
CREATE POLICY "todo_task_shares_select" ON public.todo_task_shares
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.todo_tasks
      WHERE id = task_id AND created_by = (SELECT auth.uid())
    )
  );

-- INSERT: Only task creators can add shares
CREATE POLICY "todo_task_shares_insert" ON public.todo_task_shares
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.todo_tasks
      WHERE id = task_id AND created_by = (SELECT auth.uid())
    )
  );

-- UPDATE: Only task creators can update shares
CREATE POLICY "todo_task_shares_update" ON public.todo_task_shares
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.todo_tasks
      WHERE id = task_id AND created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.todo_tasks
      WHERE id = task_id AND created_by = (SELECT auth.uid())
    )
  );

-- DELETE: Only task creators can remove shares
CREATE POLICY "todo_task_shares_delete" ON public.todo_task_shares
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.todo_tasks
      WHERE id = task_id AND created_by = (SELECT auth.uid())
    )
  );

-- =====================================================
-- Update RLS for todo_list_groups to allow shared members to see groups
-- =====================================================

-- Drop old select policy
DROP POLICY IF EXISTS "todo_list_groups_select" ON public.todo_list_groups;

-- New SELECT policy: Owner OR member of group
CREATE POLICY "todo_list_groups_select" ON public.todo_list_groups
  FOR SELECT TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.todo_group_shares
      WHERE group_id = id AND user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- Update RLS for todo_lists to include group membership visibility
-- =====================================================

-- Drop old select policy
DROP POLICY IF EXISTS "todo_lists_select" ON public.todo_lists;

-- New SELECT policy: Owner OR list member OR member of the list's group
CREATE POLICY "todo_lists_select" ON public.todo_lists
  FOR SELECT TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.todo_list_shares
      WHERE list_id = id AND user_id = (SELECT auth.uid())
    )
    OR (
      group_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.todo_group_shares
        WHERE group_id = todo_lists.group_id AND user_id = (SELECT auth.uid())
      )
    )
  );

-- =====================================================
-- Update RLS for todo_tasks to include task share visibility
-- =====================================================

-- Drop old select policy
DROP POLICY IF EXISTS "todo_tasks_select" ON public.todo_tasks;

-- New SELECT policy: Task creator OR list member OR group member OR task member
CREATE POLICY "todo_tasks_select" ON public.todo_tasks
  FOR SELECT TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR assigned_to = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.todo_list_shares
      WHERE list_id = todo_tasks.list_id AND user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.todo_lists tl
      JOIN public.todo_group_shares tgs ON tgs.group_id = tl.group_id
      WHERE tl.id = todo_tasks.list_id AND tgs.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.todo_task_shares
      WHERE task_id = id AND user_id = (SELECT auth.uid())
    )
  );