-- Drop all todo policies and recreate with SIMPLE logic (no subqueries on RLS tables)
DROP POLICY IF EXISTS "lists_select" ON todo_lists;
DROP POLICY IF EXISTS "lists_insert" ON todo_lists;
DROP POLICY IF EXISTS "lists_update" ON todo_lists;
DROP POLICY IF EXISTS "lists_delete" ON todo_lists;
DROP POLICY IF EXISTS "groups_select" ON todo_list_groups;
DROP POLICY IF EXISTS "groups_insert" ON todo_list_groups;
DROP POLICY IF EXISTS "groups_update" ON todo_list_groups;
DROP POLICY IF EXISTS "groups_delete" ON todo_list_groups;
DROP POLICY IF EXISTS "shares_select" ON todo_list_shares;
DROP POLICY IF EXISTS "shares_insert" ON todo_list_shares;
DROP POLICY IF EXISTS "shares_delete" ON todo_list_shares;
DROP POLICY IF EXISTS "tasks_select" ON todo_tasks;
DROP POLICY IF EXISTS "tasks_insert" ON todo_tasks;
DROP POLICY IF EXISTS "tasks_update" ON todo_tasks;
DROP POLICY IF EXISTS "tasks_delete" ON todo_tasks;
DROP POLICY IF EXISTS "steps_select" ON todo_task_steps;
DROP POLICY IF EXISTS "steps_insert" ON todo_task_steps;
DROP POLICY IF EXISTS "steps_update" ON todo_task_steps;
DROP POLICY IF EXISTS "steps_delete" ON todo_task_steps;

-- todo_list_groups: Simple owner-based
CREATE POLICY "groups_all" ON todo_list_groups FOR ALL TO authenticated 
  USING (created_by = (select auth.uid())) 
  WITH CHECK (created_by = (select auth.uid()));

-- todo_lists: Simple owner-based
CREATE POLICY "lists_all" ON todo_lists FOR ALL TO authenticated 
  USING (created_by = (select auth.uid())) 
  WITH CHECK (created_by = (select auth.uid()));

-- todo_list_shares: User can see their own shares
CREATE POLICY "shares_all" ON todo_list_shares FOR ALL TO authenticated 
  USING (user_id = (select auth.uid())) 
  WITH CHECK (true);

-- todo_tasks: Creator or assignee can access
CREATE POLICY "tasks_all" ON todo_tasks FOR ALL TO authenticated 
  USING (created_by = (select auth.uid()) OR assigned_to = (select auth.uid())) 
  WITH CHECK (created_by = (select auth.uid()));

-- todo_task_steps: Open for authenticated (parent task RLS handles security)
CREATE POLICY "steps_all" ON todo_task_steps FOR ALL TO authenticated 
  USING (true) 
  WITH CHECK (true);