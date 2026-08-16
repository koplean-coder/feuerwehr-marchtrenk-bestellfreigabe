-- Drop all existing policies on todo tables
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('todo_lists', 'todo_list_groups', 'todo_list_shares', 'todo_tasks', 'todo_task_steps')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- =====================
-- TODO_LIST_SHARES
-- =====================

-- SELECT: Users can see shares where they are the user_id
CREATE POLICY "todo_list_shares_select" ON public.todo_list_shares
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- INSERT: Only list owners can add shares
CREATE POLICY "todo_list_shares_insert" ON public.todo_list_shares
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.todo_lists
      WHERE id = list_id AND created_by = (SELECT auth.uid())
    )
  );

-- UPDATE: Only list owners
CREATE POLICY "todo_list_shares_update" ON public.todo_list_shares
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.todo_lists
      WHERE id = list_id AND created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.todo_lists
      WHERE id = list_id AND created_by = (SELECT auth.uid())
    )
  );

-- DELETE: Only list owners
CREATE POLICY "todo_list_shares_delete" ON public.todo_list_shares
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.todo_lists
      WHERE id = list_id AND created_by = (SELECT auth.uid())
    )
  );

-- =====================
-- TODO_LISTS - Owner access only (no subqueries on RLS tables to avoid 500s)
-- =====================

CREATE POLICY "todo_lists_select" ON public.todo_lists
  FOR SELECT TO authenticated
  USING (created_by = (SELECT auth.uid()));

CREATE POLICY "todo_lists_insert" ON public.todo_lists
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "todo_lists_update" ON public.todo_lists
  FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "todo_lists_delete" ON public.todo_lists
  FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- =====================
-- TODO_LIST_GROUPS - Owner access only
-- =====================

CREATE POLICY "todo_list_groups_select" ON public.todo_list_groups
  FOR SELECT TO authenticated
  USING (created_by = (SELECT auth.uid()));

CREATE POLICY "todo_list_groups_insert" ON public.todo_list_groups
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "todo_list_groups_update" ON public.todo_list_groups
  FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "todo_list_groups_delete" ON public.todo_list_groups
  FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- =====================
-- TODO_TASKS - Owner or assigned user
-- =====================

CREATE POLICY "todo_tasks_select" ON public.todo_tasks
  FOR SELECT TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR assigned_to = (SELECT auth.uid())
  );

CREATE POLICY "todo_tasks_insert" ON public.todo_tasks
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "todo_tasks_update" ON public.todo_tasks
  FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR assigned_to = (SELECT auth.uid())
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR assigned_to = (SELECT auth.uid())
  );

CREATE POLICY "todo_tasks_delete" ON public.todo_tasks
  FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- =====================
-- TODO_TASK_STEPS - Same as parent task
-- =====================

CREATE POLICY "todo_task_steps_select" ON public.todo_task_steps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.todo_tasks
      WHERE id = task_id
        AND (created_by = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid()))
    )
  );

CREATE POLICY "todo_task_steps_insert" ON public.todo_task_steps
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.todo_tasks
      WHERE id = task_id
        AND (created_by = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid()))
    )
  );

CREATE POLICY "todo_task_steps_update" ON public.todo_task_steps
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.todo_tasks
      WHERE id = task_id
        AND (created_by = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.todo_tasks
      WHERE id = task_id
        AND (created_by = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid()))
    )
  );

CREATE POLICY "todo_task_steps_delete" ON public.todo_task_steps
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.todo_tasks
      WHERE id = task_id
        AND created_by = (SELECT auth.uid())
    )
  );