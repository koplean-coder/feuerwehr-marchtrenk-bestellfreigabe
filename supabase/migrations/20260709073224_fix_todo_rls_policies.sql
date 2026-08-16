-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own lists" ON todo_lists;
DROP POLICY IF EXISTS "Users can create lists" ON todo_lists;
DROP POLICY IF EXISTS "Users can update their own lists" ON todo_lists;
DROP POLICY IF EXISTS "Users can delete their own lists" ON todo_lists;

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

DROP POLICY IF EXISTS "Users can view steps" ON todo_task_steps;
DROP POLICY IF EXISTS "Users can create steps" ON todo_task_steps;
DROP POLICY IF EXISTS "Users can update steps" ON todo_task_steps;
DROP POLICY IF EXISTS "Users can delete steps" ON todo_task_steps;

-- Enable RLS on all tables
ALTER TABLE todo_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_list_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_list_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_task_steps ENABLE ROW LEVEL SECURITY;

-- todo_list_groups: Users can manage their own groups
CREATE POLICY "Users can view their own groups" ON todo_list_groups
  FOR SELECT TO authenticated
  USING (created_by = (select auth.uid()));

CREATE POLICY "Users can create groups" ON todo_list_groups
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Users can update their own groups" ON todo_list_groups
  FOR UPDATE TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Users can delete their own groups" ON todo_list_groups
  FOR DELETE TO authenticated
  USING (created_by = (select auth.uid()));

-- todo_lists: Users can manage their own lists or shared lists
CREATE POLICY "Users can view their own lists" ON todo_lists
  FOR SELECT TO authenticated
  USING (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM todo_list_shares 
      WHERE todo_list_shares.list_id = todo_lists.id 
      AND todo_list_shares.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create lists" ON todo_lists
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Users can update their own lists" ON todo_lists
  FOR UPDATE TO authenticated
  USING (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM todo_list_shares 
      WHERE todo_list_shares.list_id = todo_lists.id 
      AND todo_list_shares.user_id = (select auth.uid())
      AND todo_list_shares.permission = 'edit'
    )
  )
  WITH CHECK (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM todo_list_shares 
      WHERE todo_list_shares.list_id = todo_lists.id 
      AND todo_list_shares.user_id = (select auth.uid())
      AND todo_list_shares.permission = 'edit'
    )
  );

CREATE POLICY "Users can delete their own lists" ON todo_lists
  FOR DELETE TO authenticated
  USING (created_by = (select auth.uid()));

-- todo_list_shares: List owners can manage shares
CREATE POLICY "Users can view shares" ON todo_list_shares
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM todo_lists 
      WHERE todo_lists.id = todo_list_shares.list_id 
      AND todo_lists.created_by = (select auth.uid())
    )
  );

CREATE POLICY "Users can create shares" ON todo_list_shares
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM todo_lists 
      WHERE todo_lists.id = todo_list_shares.list_id 
      AND todo_lists.created_by = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete shares" ON todo_list_shares
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM todo_lists 
      WHERE todo_lists.id = todo_list_shares.list_id 
      AND todo_lists.created_by = (select auth.uid())
    )
  );

-- todo_tasks: Users can manage tasks in their lists or shared lists, or tasks assigned to them
CREATE POLICY "Users can view tasks" ON todo_tasks
  FOR SELECT TO authenticated
  USING (
    created_by = (select auth.uid())
    OR assigned_to = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM todo_lists 
      WHERE todo_lists.id = todo_tasks.list_id 
      AND (
        todo_lists.created_by = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM todo_list_shares 
          WHERE todo_list_shares.list_id = todo_lists.id 
          AND todo_list_shares.user_id = (select auth.uid())
        )
      )
    )
  );

CREATE POLICY "Users can create tasks" ON todo_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM todo_lists 
      WHERE todo_lists.id = todo_tasks.list_id 
      AND (
        todo_lists.created_by = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM todo_list_shares 
          WHERE todo_list_shares.list_id = todo_lists.id 
          AND todo_list_shares.user_id = (select auth.uid())
          AND todo_list_shares.permission = 'edit'
        )
      )
    )
  );

CREATE POLICY "Users can update tasks" ON todo_tasks
  FOR UPDATE TO authenticated
  USING (
    created_by = (select auth.uid())
    OR assigned_to = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM todo_lists 
      WHERE todo_lists.id = todo_tasks.list_id 
      AND (
        todo_lists.created_by = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM todo_list_shares 
          WHERE todo_list_shares.list_id = todo_lists.id 
          AND todo_list_shares.user_id = (select auth.uid())
          AND todo_list_shares.permission = 'edit'
        )
      )
    )
  )
  WITH CHECK (
    created_by = (select auth.uid())
    OR assigned_to = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM todo_lists 
      WHERE todo_lists.id = todo_tasks.list_id 
      AND (
        todo_lists.created_by = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM todo_list_shares 
          WHERE todo_list_shares.list_id = todo_lists.id 
          AND todo_list_shares.user_id = (select auth.uid())
          AND todo_list_shares.permission = 'edit'
        )
      )
    )
  );

CREATE POLICY "Users can delete tasks" ON todo_tasks
  FOR DELETE TO authenticated
  USING (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM todo_lists 
      WHERE todo_lists.id = todo_tasks.list_id 
      AND todo_lists.created_by = (select auth.uid())
    )
  );

-- todo_task_steps: Users can manage steps on tasks they can access
CREATE POLICY "Users can view steps" ON todo_task_steps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM todo_tasks 
      WHERE todo_tasks.id = todo_task_steps.task_id 
      AND (
        todo_tasks.created_by = (select auth.uid())
        OR todo_tasks.assigned_to = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM todo_lists 
          WHERE todo_lists.id = todo_tasks.list_id 
          AND (
            todo_lists.created_by = (select auth.uid())
            OR EXISTS (
              SELECT 1 FROM todo_list_shares 
              WHERE todo_list_shares.list_id = todo_lists.id 
              AND todo_list_shares.user_id = (select auth.uid())
            )
          )
        )
      )
    )
  );

CREATE POLICY "Users can create steps" ON todo_task_steps
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM todo_tasks 
      WHERE todo_tasks.id = todo_task_steps.task_id 
      AND (
        todo_tasks.created_by = (select auth.uid())
        OR todo_tasks.assigned_to = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM todo_lists 
          WHERE todo_lists.id = todo_tasks.list_id 
          AND (
            todo_lists.created_by = (select auth.uid())
            OR EXISTS (
              SELECT 1 FROM todo_list_shares 
              WHERE todo_list_shares.list_id = todo_lists.id 
              AND todo_list_shares.user_id = (select auth.uid())
              AND todo_list_shares.permission = 'edit'
            )
          )
        )
      )
    )
  );

CREATE POLICY "Users can update steps" ON todo_task_steps
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM todo_tasks 
      WHERE todo_tasks.id = todo_task_steps.task_id 
      AND (
        todo_tasks.created_by = (select auth.uid())
        OR todo_tasks.assigned_to = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM todo_lists 
          WHERE todo_lists.id = todo_tasks.list_id 
          AND (
            todo_lists.created_by = (select auth.uid())
            OR EXISTS (
              SELECT 1 FROM todo_list_shares 
              WHERE todo_list_shares.list_id = todo_lists.id 
              AND todo_list_shares.user_id = (select auth.uid())
              AND todo_list_shares.permission = 'edit'
            )
          )
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM todo_tasks 
      WHERE todo_tasks.id = todo_task_steps.task_id 
      AND (
        todo_tasks.created_by = (select auth.uid())
        OR todo_tasks.assigned_to = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM todo_lists 
          WHERE todo_lists.id = todo_tasks.list_id 
          AND (
            todo_lists.created_by = (select auth.uid())
            OR EXISTS (
              SELECT 1 FROM todo_list_shares 
              WHERE todo_list_shares.list_id = todo_lists.id 
              AND todo_list_shares.user_id = (select auth.uid())
              AND todo_list_shares.permission = 'edit'
            )
          )
        )
      )
    )
  );

CREATE POLICY "Users can delete steps" ON todo_task_steps
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM todo_tasks 
      WHERE todo_tasks.id = todo_task_steps.task_id 
      AND (
        todo_tasks.created_by = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM todo_lists 
          WHERE todo_lists.id = todo_tasks.list_id 
          AND todo_lists.created_by = (select auth.uid())
        )
      )
    )
  );

-- Add indexes for better RLS performance
CREATE INDEX IF NOT EXISTS idx_todo_lists_created_by ON todo_lists(created_by);
CREATE INDEX IF NOT EXISTS idx_todo_list_groups_created_by ON todo_list_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_todo_list_shares_user_id ON todo_list_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_todo_list_shares_list_id ON todo_list_shares(list_id);
CREATE INDEX IF NOT EXISTS idx_todo_tasks_list_id ON todo_tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_todo_tasks_created_by ON todo_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_todo_tasks_assigned_to ON todo_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_todo_task_steps_task_id ON todo_task_steps(task_id);