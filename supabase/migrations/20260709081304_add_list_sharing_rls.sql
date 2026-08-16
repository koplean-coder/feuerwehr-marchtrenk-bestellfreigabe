-- Drop existing policies
DROP POLICY IF EXISTS "tl_sel" ON todo_lists;
DROP POLICY IF EXISTS "tl_ins" ON todo_lists;
DROP POLICY IF EXISTS "tl_upd" ON todo_lists;
DROP POLICY IF EXISTS "tl_del" ON todo_lists;

DROP POLICY IF EXISTS "tls_sel" ON todo_list_shares;
DROP POLICY IF EXISTS "tls_ins" ON todo_list_shares;
DROP POLICY IF EXISTS "tls_del" ON todo_list_shares;

DROP POLICY IF EXISTS "tt_sel" ON todo_tasks;
DROP POLICY IF EXISTS "tt_ins" ON todo_tasks;
DROP POLICY IF EXISTS "tt_upd" ON todo_tasks;
DROP POLICY IF EXISTS "tt_del" ON todo_tasks;

-- todo_lists: Owner OR shared with user can see
CREATE POLICY "tl_sel" ON todo_lists FOR SELECT TO authenticated 
  USING (
    created_by = (select auth.uid()) 
    OR id IN (SELECT list_id FROM todo_list_shares WHERE user_id = (select auth.uid()))
  );

CREATE POLICY "tl_ins" ON todo_lists FOR INSERT TO authenticated 
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "tl_upd" ON todo_lists FOR UPDATE TO authenticated 
  USING (
    created_by = (select auth.uid()) 
    OR id IN (SELECT list_id FROM todo_list_shares WHERE user_id = (select auth.uid()) AND permission = 'edit')
  ) 
  WITH CHECK (true);

CREATE POLICY "tl_del" ON todo_lists FOR DELETE TO authenticated 
  USING (created_by = (select auth.uid()));

-- todo_list_shares: Owner of list can manage, shared user can see their own share
CREATE POLICY "tls_sel" ON todo_list_shares FOR SELECT TO authenticated 
  USING (
    user_id = (select auth.uid())
    OR list_id IN (SELECT id FROM todo_lists WHERE created_by = (select auth.uid()))
  );

CREATE POLICY "tls_ins" ON todo_list_shares FOR INSERT TO authenticated 
  WITH CHECK (list_id IN (SELECT id FROM todo_lists WHERE created_by = (select auth.uid())));

CREATE POLICY "tls_upd" ON todo_list_shares FOR UPDATE TO authenticated 
  USING (list_id IN (SELECT id FROM todo_lists WHERE created_by = (select auth.uid())))
  WITH CHECK (true);

CREATE POLICY "tls_del" ON todo_list_shares FOR DELETE TO authenticated 
  USING (list_id IN (SELECT id FROM todo_lists WHERE created_by = (select auth.uid())));

-- todo_tasks: Owner, assignee, OR user with shared list access
CREATE POLICY "tt_sel" ON todo_tasks FOR SELECT TO authenticated 
  USING (
    created_by = (select auth.uid()) 
    OR assigned_to = (select auth.uid())
    OR list_id IN (SELECT id FROM todo_lists WHERE created_by = (select auth.uid()))
    OR list_id IN (SELECT list_id FROM todo_list_shares WHERE user_id = (select auth.uid()))
  );

CREATE POLICY "tt_ins" ON todo_tasks FOR INSERT TO authenticated 
  WITH CHECK (
    created_by = (select auth.uid())
    AND (
      list_id IN (SELECT id FROM todo_lists WHERE created_by = (select auth.uid()))
      OR list_id IN (SELECT list_id FROM todo_list_shares WHERE user_id = (select auth.uid()) AND permission = 'edit')
    )
  );

CREATE POLICY "tt_upd" ON todo_tasks FOR UPDATE TO authenticated 
  USING (
    created_by = (select auth.uid()) 
    OR assigned_to = (select auth.uid())
    OR list_id IN (SELECT id FROM todo_lists WHERE created_by = (select auth.uid()))
    OR list_id IN (SELECT list_id FROM todo_list_shares WHERE user_id = (select auth.uid()) AND permission = 'edit')
  ) 
  WITH CHECK (true);

CREATE POLICY "tt_del" ON todo_tasks FOR DELETE TO authenticated 
  USING (
    created_by = (select auth.uid())
    OR list_id IN (SELECT id FROM todo_lists WHERE created_by = (select auth.uid()))
  );