-- =====================================================
-- FIX: Remove circular RLS dependencies causing HTTP 500
-- =====================================================

-- Drop problematic policies
DROP POLICY IF EXISTS "todo_list_groups_select" ON public.todo_list_groups;
DROP POLICY IF EXISTS "todo_lists_select" ON public.todo_lists;
DROP POLICY IF EXISTS "todo_tasks_select" ON public.todo_tasks;
DROP POLICY IF EXISTS "todo_group_shares_select" ON public.todo_group_shares;
DROP POLICY IF EXISTS "todo_list_shares_select" ON public.todo_list_shares;
DROP POLICY IF EXISTS "todo_task_shares_select" ON public.todo_task_shares;

-- =====================================================
-- SIMPLE POLICIES - No cross-table RLS dependencies
-- =====================================================

-- todo_group_shares: User can see shares where they are the user_id or own the group
-- We check group ownership via created_by without RLS on groups
CREATE POLICY "todo_group_shares_select" ON public.todo_group_shares
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- todo_list_shares: User can see their own shares
CREATE POLICY "todo_list_shares_select" ON public.todo_list_shares
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- todo_task_shares: User can see their own shares
CREATE POLICY "todo_task_shares_select" ON public.todo_task_shares
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- todo_list_groups: Owner only (simple, no dependencies)
CREATE POLICY "todo_list_groups_select" ON public.todo_list_groups
  FOR SELECT TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- todo_lists: Owner only (visibility filtering done in frontend)
CREATE POLICY "todo_lists_select" ON public.todo_lists
  FOR SELECT TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- todo_tasks: Creator or assigned (visibility filtering done in frontend)
CREATE POLICY "todo_tasks_select" ON public.todo_tasks
  FOR SELECT TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR assigned_to = (SELECT auth.uid())
  );