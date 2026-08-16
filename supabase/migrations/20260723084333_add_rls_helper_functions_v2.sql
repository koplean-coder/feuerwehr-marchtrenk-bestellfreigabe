-- =====================================================
-- Helper functions to avoid RLS recursion (RETURNS boolean only)
-- =====================================================

-- Check if user owns a list (without RLS)
CREATE OR REPLACE FUNCTION public.is_list_owner(_list_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.todo_lists
    WHERE id = _list_id AND created_by = (SELECT auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_list_owner(uuid) TO authenticated;

-- Check if user owns a group (without RLS)
CREATE OR REPLACE FUNCTION public.is_group_owner(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.todo_list_groups
    WHERE id = _group_id AND created_by = (SELECT auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_group_owner(uuid) TO authenticated;

-- Check if user owns a task (without RLS)
CREATE OR REPLACE FUNCTION public.is_task_owner(_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.todo_tasks
    WHERE id = _task_id AND created_by = (SELECT auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_task_owner(uuid) TO authenticated;

-- Check if user is member of a group (without RLS)
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.todo_group_shares
    WHERE group_id = _group_id AND user_id = (SELECT auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_group_member(uuid) TO authenticated;

-- Check if user is member of a list (without RLS)
CREATE OR REPLACE FUNCTION public.is_list_member(_list_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.todo_list_shares
    WHERE list_id = _list_id AND user_id = (SELECT auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_list_member(uuid) TO authenticated;

-- Check if user is member of a task (without RLS)
CREATE OR REPLACE FUNCTION public.is_task_member(_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.todo_task_shares
    WHERE task_id = _task_id AND user_id = (SELECT auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_task_member(uuid) TO authenticated;

-- Check if user is member of a list's group (without RLS)
CREATE OR REPLACE FUNCTION public.is_list_group_member(_list_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.todo_lists l
    JOIN public.todo_group_shares gs ON gs.group_id = l.group_id
    WHERE l.id = _list_id AND gs.user_id = (SELECT auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_list_group_member(uuid) TO authenticated;

-- =====================================================
-- Update policies to use helper functions
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "todo_group_shares_select" ON public.todo_group_shares;
DROP POLICY IF EXISTS "todo_list_shares_select" ON public.todo_list_shares;
DROP POLICY IF EXISTS "todo_task_shares_select" ON public.todo_task_shares;
DROP POLICY IF EXISTS "todo_list_groups_select" ON public.todo_list_groups;
DROP POLICY IF EXISTS "todo_lists_select" ON public.todo_lists;
DROP POLICY IF EXISTS "todo_tasks_select" ON public.todo_tasks;

-- GROUP SHARES: User can see if they are the member OR own the group
CREATE POLICY "todo_group_shares_select" ON public.todo_group_shares
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_group_owner(group_id)
  );

-- LIST SHARES: User can see if they are the member OR own the list
CREATE POLICY "todo_list_shares_select" ON public.todo_list_shares
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_list_owner(list_id)
  );

-- TASK SHARES: User can see if they are the member OR own the task
CREATE POLICY "todo_task_shares_select" ON public.todo_task_shares
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_task_owner(task_id)
  );

-- GROUPS: Owner OR member
CREATE POLICY "todo_list_groups_select" ON public.todo_list_groups
  FOR SELECT TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR public.is_group_member(id)
  );

-- LISTS: Owner OR list member OR group member
CREATE POLICY "todo_lists_select" ON public.todo_lists
  FOR SELECT TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR public.is_list_member(id)
    OR public.is_list_group_member(id)
  );

-- TASKS: Creator OR assigned OR list member OR group member OR task member
CREATE POLICY "todo_tasks_select" ON public.todo_tasks
  FOR SELECT TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR assigned_to = (SELECT auth.uid())
    OR public.is_list_member(list_id)
    OR public.is_list_group_member(list_id)
    OR public.is_task_member(id)
  );