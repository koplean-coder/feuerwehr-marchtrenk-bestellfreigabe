-- Drop existing policies
DROP POLICY IF EXISTS "shares_select" ON todo_list_shares;
DROP POLICY IF EXISTS "shares_insert" ON todo_list_shares;
DROP POLICY IF EXISTS "shares_delete" ON todo_list_shares;
DROP POLICY IF EXISTS "tasks_select" ON todo_tasks;
DROP POLICY IF EXISTS "tasks_insert" ON todo_tasks;
DROP POLICY IF EXISTS "tasks_update" ON todo_tasks;
DROP POLICY IF EXISTS "tasks_delete" ON todo_tasks;

-- todo_list_shares: Allow select if user owns the list OR is the shared user
CREATE POLICY "shares_select" ON todo_list_shares 
  FOR SELECT TO authenticated 
  USING (
    user_id = (select auth.uid())
    OR list_id IN (SELECT id FROM todo_lists WHERE created_by = (select auth.uid()))
  );

CREATE POLICY "shares_insert" ON todo_list_shares 
  FOR INSERT TO authenticated 
  WITH CHECK (list_id IN (SELECT id FROM todo_lists WHERE created_by = (select auth.uid())));

CREATE POLICY "shares_delete" ON todo_list_shares 
  FOR DELETE TO authenticated 
  USING (list_id IN (SELECT id FROM todo_lists WHERE created_by = (select auth.uid())));

-- todo_tasks: Allow access if user created task, is assigned, OR owns the list
CREATE POLICY "tasks_select" ON todo_tasks 
  FOR SELECT TO authenticated 
  USING (
    created_by = (select auth.uid()) 
    OR assigned_to = (select auth.uid())
    OR list_id IN (SELECT id FROM todo_lists WHERE created_by = (select auth.uid()))
  );

CREATE POLICY "tasks_insert" ON todo_tasks 
  FOR INSERT TO authenticated 
  WITH CHECK (
    created_by = (select auth.uid())
    AND list_id IN (SELECT id FROM todo_lists WHERE created_by = (select auth.uid()))
  );

CREATE POLICY "tasks_update" ON todo_tasks 
  FOR UPDATE TO authenticated 
  USING (
    created_by = (select auth.uid()) 
    OR assigned_to = (select auth.uid())
    OR list_id IN (SELECT id FROM todo_lists WHERE created_by = (select auth.uid()))
  )
  WITH CHECK (
    created_by = (select auth.uid()) 
    OR assigned_to = (select auth.uid())
    OR list_id IN (SELECT id FROM todo_lists WHERE created_by = (select auth.uid()))
  );

CREATE POLICY "tasks_delete" ON todo_tasks 
  FOR DELETE TO authenticated 
  USING (
    created_by = (select auth.uid())
    OR list_id IN (SELECT id FROM todo_lists WHERE created_by = (select auth.uid()))
  );