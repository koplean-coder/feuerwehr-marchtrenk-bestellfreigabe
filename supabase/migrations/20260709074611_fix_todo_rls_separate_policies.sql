-- Drop FOR ALL policies (not allowed)
DROP POLICY IF EXISTS "groups_all" ON todo_list_groups;
DROP POLICY IF EXISTS "lists_all" ON todo_lists;
DROP POLICY IF EXISTS "shares_all" ON todo_list_shares;
DROP POLICY IF EXISTS "tasks_all" ON todo_tasks;
DROP POLICY IF EXISTS "steps_all" ON todo_task_steps;

-- todo_list_groups: Separate policies per action
CREATE POLICY "groups_select" ON todo_list_groups FOR SELECT TO authenticated USING (created_by = (select auth.uid()));
CREATE POLICY "groups_insert" ON todo_list_groups FOR INSERT TO authenticated WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "groups_update" ON todo_list_groups FOR UPDATE TO authenticated USING (created_by = (select auth.uid())) WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "groups_delete" ON todo_list_groups FOR DELETE TO authenticated USING (created_by = (select auth.uid()));

-- todo_lists: Separate policies per action
CREATE POLICY "lists_select" ON todo_lists FOR SELECT TO authenticated USING (created_by = (select auth.uid()));
CREATE POLICY "lists_insert" ON todo_lists FOR INSERT TO authenticated WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "lists_update" ON todo_lists FOR UPDATE TO authenticated USING (created_by = (select auth.uid())) WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "lists_delete" ON todo_lists FOR DELETE TO authenticated USING (created_by = (select auth.uid()));

-- todo_list_shares: Separate policies per action
CREATE POLICY "shares_select" ON todo_list_shares FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "shares_insert" ON todo_list_shares FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shares_update" ON todo_list_shares FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (true);
CREATE POLICY "shares_delete" ON todo_list_shares FOR DELETE TO authenticated USING (true);

-- todo_tasks: Separate policies per action
CREATE POLICY "tasks_select" ON todo_tasks FOR SELECT TO authenticated USING (created_by = (select auth.uid()) OR assigned_to = (select auth.uid()));
CREATE POLICY "tasks_insert" ON todo_tasks FOR INSERT TO authenticated WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "tasks_update" ON todo_tasks FOR UPDATE TO authenticated USING (created_by = (select auth.uid()) OR assigned_to = (select auth.uid())) WITH CHECK (created_by = (select auth.uid()) OR assigned_to = (select auth.uid()));
CREATE POLICY "tasks_delete" ON todo_tasks FOR DELETE TO authenticated USING (created_by = (select auth.uid()));

-- todo_task_steps: Separate policies per action
CREATE POLICY "steps_select" ON todo_task_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "steps_insert" ON todo_task_steps FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "steps_update" ON todo_task_steps FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "steps_delete" ON todo_task_steps FOR DELETE TO authenticated USING (true);