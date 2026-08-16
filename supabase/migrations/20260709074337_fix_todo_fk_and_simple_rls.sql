-- Add missing foreign key constraints
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'todo_tasks_created_by_fkey') THEN
    ALTER TABLE todo_tasks ADD CONSTRAINT todo_tasks_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'todo_tasks_assigned_to_fkey') THEN
    ALTER TABLE todo_tasks ADD CONSTRAINT todo_tasks_assigned_to_fkey 
      FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Drop ALL existing todo policies
DROP POLICY IF EXISTS "Users can view their own lists" ON todo_lists;
DROP POLICY IF EXISTS "Users can create lists" ON todo_lists;
DROP POLICY IF EXISTS "Users can update their own lists" ON todo_lists;
DROP POLICY IF EXISTS "Users can delete their own lists" ON todo_lists;
DROP POLICY IF EXISTS "todo_lists_select" ON todo_lists;
DROP POLICY IF EXISTS "todo_lists_insert" ON todo_lists;
DROP POLICY IF EXISTS "todo_lists_update" ON todo_lists;
DROP POLICY IF EXISTS "todo_lists_delete" ON todo_lists;

DROP POLICY IF EXISTS "Users can view their own groups" ON todo_list_groups;
DROP POLICY IF EXISTS "Users can create groups" ON todo_list_groups;
DROP POLICY IF EXISTS "Users can update their own groups" ON todo_list_groups;
DROP POLICY IF EXISTS "Users can delete their own groups" ON todo_list_groups;

DROP POLICY IF EXISTS "Users can view shares" ON todo_list_shares;
DROP POLICY IF EXISTS "Users can create shares" ON todo_list_shares;
DROP POLICY IF EXISTS "Users can delete shares" ON todo_list_shares;

DROP POLICY IF EXISTS "Users can view tasks" ON todo_tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON todo_tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON todo_tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON todo_tasks;
DROP POLICY IF EXISTS "todo_tasks_select" ON todo_tasks;
DROP POLICY IF EXISTS "todo_tasks_insert" ON todo_tasks;
DROP POLICY IF EXISTS "todo_tasks_update" ON todo_tasks;
DROP POLICY IF EXISTS "todo_tasks_delete" ON todo_tasks;

DROP POLICY IF EXISTS "Users can view steps" ON todo_task_steps;
DROP POLICY IF EXISTS "Users can create steps" ON todo_task_steps;
DROP POLICY IF EXISTS "Users can update steps" ON todo_task_steps;
DROP POLICY IF EXISTS "Users can delete steps" ON todo_task_steps;

-- Enable RLS
ALTER TABLE todo_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_list_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_list_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_task_steps ENABLE ROW LEVEL SECURITY;

-- SIMPLE policies for todo_list_groups
CREATE POLICY "groups_select" ON todo_list_groups FOR SELECT TO authenticated USING (created_by = (select auth.uid()));
CREATE POLICY "groups_insert" ON todo_list_groups FOR INSERT TO authenticated WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "groups_update" ON todo_list_groups FOR UPDATE TO authenticated USING (created_by = (select auth.uid())) WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "groups_delete" ON todo_list_groups FOR DELETE TO authenticated USING (created_by = (select auth.uid()));

-- SIMPLE policies for todo_lists
CREATE POLICY "lists_select" ON todo_lists FOR SELECT TO authenticated USING (created_by = (select auth.uid()));
CREATE POLICY "lists_insert" ON todo_lists FOR INSERT TO authenticated WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "lists_update" ON todo_lists FOR UPDATE TO authenticated USING (created_by = (select auth.uid())) WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "lists_delete" ON todo_lists FOR DELETE TO authenticated USING (created_by = (select auth.uid()));

-- SIMPLE policies for todo_list_shares
CREATE POLICY "shares_select" ON todo_list_shares FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "shares_insert" ON todo_list_shares FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shares_delete" ON todo_list_shares FOR DELETE TO authenticated USING (true);

-- SIMPLE policies for todo_tasks
CREATE POLICY "tasks_select" ON todo_tasks FOR SELECT TO authenticated USING (created_by = (select auth.uid()) OR assigned_to = (select auth.uid()));
CREATE POLICY "tasks_insert" ON todo_tasks FOR INSERT TO authenticated WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "tasks_update" ON todo_tasks FOR UPDATE TO authenticated USING (created_by = (select auth.uid()) OR assigned_to = (select auth.uid())) WITH CHECK (created_by = (select auth.uid()) OR assigned_to = (select auth.uid()));
CREATE POLICY "tasks_delete" ON todo_tasks FOR DELETE TO authenticated USING (created_by = (select auth.uid()));

-- SIMPLE policies for todo_task_steps
CREATE POLICY "steps_select" ON todo_task_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "steps_insert" ON todo_task_steps FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "steps_update" ON todo_task_steps FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "steps_delete" ON todo_task_steps FOR DELETE TO authenticated USING (true);