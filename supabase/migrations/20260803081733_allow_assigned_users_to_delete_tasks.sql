-- Allow assigned users to delete tasks (not just creators)
DROP POLICY IF EXISTS "tt_del" ON todo_tasks;

CREATE POLICY "tt_del" ON todo_tasks FOR DELETE TO authenticated 
  USING (
    created_by = (select auth.uid())
    OR assigned_to = (select auth.uid())
    OR list_id IN (SELECT id FROM todo_lists WHERE created_by = (select auth.uid()))
  );