-- Add missing foreign key constraints with proper names
ALTER TABLE todo_tasks 
  DROP CONSTRAINT IF EXISTS todo_tasks_created_by_fkey,
  DROP CONSTRAINT IF EXISTS todo_tasks_assigned_to_fkey;

ALTER TABLE todo_tasks 
  ADD CONSTRAINT todo_tasks_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE todo_tasks 
  ADD CONSTRAINT todo_tasks_assigned_to_fkey 
    FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL;

-- Drop and recreate RLS policies with simpler logic
DROP POLICY IF EXISTS "Users can view tasks" ON todo_tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON todo_tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON todo_tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON todo_tasks;

DROP POLICY IF EXISTS "Users can view their own lists" ON todo_lists;
DROP POLICY IF EXISTS "Users can create lists" ON todo_lists;
DROP POLICY IF EXISTS "Users can update their own lists" ON todo_lists;
DROP POLICY IF EXISTS "Users can delete their own lists" ON todo_lists;

-- Simple RLS for todo_lists: owner can do everything
CREATE POLICY "todo_lists_select" ON todo_lists
  FOR SELECT TO authenticated
  USING (created_by = (select auth.uid()));

CREATE POLICY "todo_lists_insert" ON todo_lists
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "todo_lists_update" ON todo_lists
  FOR UPDATE TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "todo_lists_delete" ON todo_lists
  FOR DELETE TO authenticated
  USING (created_by = (select auth.uid()));

-- Simple RLS for todo_tasks: owner of list OR task creator OR assignee can access
CREATE POLICY "todo_tasks_select" ON todo_tasks
  FOR SELECT TO authenticated
  USING (
    created_by = (select auth.uid())
    OR assigned_to = (select auth.uid())
    OR list_id IN (SELECT id FROM todo_lists WHERE created_by = (select auth.uid()))
  );

CREATE POLICY "todo_tasks_insert" ON todo_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (select auth.uid())
    AND list_id IN (SELECT id FROM todo_lists WHERE created_by = (select auth.uid()))
  );

CREATE POLICY "todo_tasks_update" ON todo_tasks
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

CREATE POLICY "todo_tasks_delete" ON todo_tasks
  FOR DELETE TO authenticated
  USING (
    created_by = (select auth.uid())
    OR list_id IN (SELECT id FROM todo_lists WHERE created_by = (select auth.uid()))
  );