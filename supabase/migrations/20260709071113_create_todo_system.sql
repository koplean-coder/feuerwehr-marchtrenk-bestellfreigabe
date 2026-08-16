-- =============================================
-- MICROSOFT TO DO CLONE - COMPLETE SCHEMA
-- =============================================

-- 1. TODO LIST GROUPS (Folders for organizing lists)
-- =============================================
CREATE TABLE public.todo_list_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.todo_list_groups ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_todo_list_groups_created_by ON public.todo_list_groups(created_by);

-- RLS for todo_list_groups (owner-only)
CREATE POLICY "Users can view own groups" ON public.todo_list_groups
  FOR SELECT TO authenticated
  USING (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can create own groups" ON public.todo_list_groups
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can update own groups" ON public.todo_list_groups
  FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can delete own groups" ON public.todo_list_groups
  FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- 2. TODO LISTS
-- =============================================
CREATE TABLE public.todo_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'list',
  color TEXT DEFAULT '#3b82f6',
  is_smart_list BOOLEAN NOT NULL DEFAULT false,
  smart_list_type TEXT, -- 'my_day', 'important', 'planned', 'assigned_to_me', 'all'
  group_id UUID REFERENCES public.todo_list_groups(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  show_completed BOOLEAN NOT NULL DEFAULT true,
  sort_by TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'due_date', 'importance', 'alphabetical', 'created'
  sort_direction TEXT NOT NULL DEFAULT 'asc',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.todo_lists ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_todo_lists_created_by ON public.todo_lists(created_by);
CREATE INDEX idx_todo_lists_group_id ON public.todo_lists(group_id);
CREATE INDEX idx_todo_lists_smart_list_type ON public.todo_lists(smart_list_type) WHERE is_smart_list = true;

-- 3. TODO LIST SHARES (for sharing lists with other users)
-- =============================================
CREATE TABLE public.todo_list_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.todo_lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'edit' CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(list_id, user_id)
);

ALTER TABLE public.todo_list_shares ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_todo_list_shares_list_id ON public.todo_list_shares(list_id);
CREATE INDEX idx_todo_list_shares_user_id ON public.todo_list_shares(user_id);

-- RLS for todo_lists (owner + shared users)
CREATE POLICY "Users can view own lists" ON public.todo_lists
  FOR SELECT TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.todo_list_shares
      WHERE list_id = todo_lists.id AND user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create own lists" ON public.todo_lists
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can update own or shared lists" ON public.todo_lists
  FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.todo_list_shares
      WHERE list_id = todo_lists.id AND user_id = (SELECT auth.uid()) AND permission = 'edit'
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.todo_list_shares
      WHERE list_id = todo_lists.id AND user_id = (SELECT auth.uid()) AND permission = 'edit'
    )
  );

CREATE POLICY "Users can delete own lists" ON public.todo_lists
  FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- RLS for todo_list_shares (owner of list can manage shares)
CREATE POLICY "List owners can view shares" ON public.todo_list_shares
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.todo_lists
      WHERE id = todo_list_shares.list_id AND created_by = (SELECT auth.uid())
    )
    OR user_id = (SELECT auth.uid())
  );

CREATE POLICY "List owners can create shares" ON public.todo_list_shares
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.todo_lists
      WHERE id = todo_list_shares.list_id AND created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "List owners can delete shares" ON public.todo_list_shares
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.todo_lists
      WHERE id = todo_list_shares.list_id AND created_by = (SELECT auth.uid())
    )
    OR user_id = (SELECT auth.uid())
  );

-- 4. TODO TASKS
-- =============================================
CREATE TABLE public.todo_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT,
  list_id UUID NOT NULL REFERENCES public.todo_lists(id) ON DELETE CASCADE,
  
  -- Completion
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  
  -- Importance
  is_important BOOLEAN NOT NULL DEFAULT false,
  
  -- My Day
  is_in_my_day BOOLEAN NOT NULL DEFAULT false,
  my_day_date DATE,
  
  -- Due date & Reminder
  due_date DATE,
  due_time TIME,
  reminder_at TIMESTAMP WITH TIME ZONE,
  
  -- Recurrence
  recurrence_type TEXT CHECK (recurrence_type IN ('daily', 'weekdays', 'weekly', 'monthly', 'yearly', 'custom')),
  recurrence_interval INTEGER DEFAULT 1,
  recurrence_end_date DATE,
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE,
  
  -- Ownership
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Sorting
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- Attachments
  attachment_url TEXT,
  attachment_name TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.todo_tasks ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_todo_tasks_list_id ON public.todo_tasks(list_id);
CREATE INDEX idx_todo_tasks_created_by ON public.todo_tasks(created_by);
CREATE INDEX idx_todo_tasks_assigned_to ON public.todo_tasks(assigned_to);
CREATE INDEX idx_todo_tasks_is_completed ON public.todo_tasks(is_completed);
CREATE INDEX idx_todo_tasks_is_important ON public.todo_tasks(is_important) WHERE is_important = true;
CREATE INDEX idx_todo_tasks_is_in_my_day ON public.todo_tasks(is_in_my_day, my_day_date) WHERE is_in_my_day = true;
CREATE INDEX idx_todo_tasks_due_date ON public.todo_tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_todo_tasks_reminder_at ON public.todo_tasks(reminder_at) WHERE reminder_at IS NOT NULL;

-- RLS for todo_tasks (access via list ownership/sharing + assignment)
CREATE POLICY "Users can view tasks" ON public.todo_tasks
  FOR SELECT TO authenticated
  USING (
    -- Own task
    created_by = (SELECT auth.uid())
    -- Assigned to me
    OR assigned_to = (SELECT auth.uid())
    -- Task in own list
    OR EXISTS (
      SELECT 1 FROM public.todo_lists
      WHERE id = todo_tasks.list_id AND created_by = (SELECT auth.uid())
    )
    -- Task in shared list
    OR EXISTS (
      SELECT 1 FROM public.todo_list_shares
      WHERE list_id = todo_tasks.list_id AND user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create tasks" ON public.todo_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (
      -- In own list
      EXISTS (
        SELECT 1 FROM public.todo_lists
        WHERE id = todo_tasks.list_id AND created_by = (SELECT auth.uid())
      )
      -- Or in shared list with edit permission
      OR EXISTS (
        SELECT 1 FROM public.todo_list_shares
        WHERE list_id = todo_tasks.list_id AND user_id = (SELECT auth.uid()) AND permission = 'edit'
      )
    )
  );

CREATE POLICY "Users can update tasks" ON public.todo_tasks
  FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR assigned_to = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.todo_lists
      WHERE id = todo_tasks.list_id AND created_by = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.todo_list_shares
      WHERE list_id = todo_tasks.list_id AND user_id = (SELECT auth.uid()) AND permission = 'edit'
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR assigned_to = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.todo_lists
      WHERE id = todo_tasks.list_id AND created_by = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.todo_list_shares
      WHERE list_id = todo_tasks.list_id AND user_id = (SELECT auth.uid()) AND permission = 'edit'
    )
  );

CREATE POLICY "Users can delete tasks" ON public.todo_tasks
  FOR DELETE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.todo_lists
      WHERE id = todo_tasks.list_id AND created_by = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.todo_list_shares
      WHERE list_id = todo_tasks.list_id AND user_id = (SELECT auth.uid()) AND permission = 'edit'
    )
  );

-- 5. TODO TASK STEPS (Subtasks)
-- =============================================
CREATE TABLE public.todo_task_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.todo_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.todo_task_steps ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_todo_task_steps_task_id ON public.todo_task_steps(task_id);

-- RLS for todo_task_steps (inherits from task access)
CREATE POLICY "Users can view steps" ON public.todo_task_steps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.todo_tasks t
      WHERE t.id = todo_task_steps.task_id
      AND (
        t.created_by = (SELECT auth.uid())
        OR t.assigned_to = (SELECT auth.uid())
        OR EXISTS (SELECT 1 FROM public.todo_lists WHERE id = t.list_id AND created_by = (SELECT auth.uid()))
        OR EXISTS (SELECT 1 FROM public.todo_list_shares WHERE list_id = t.list_id AND user_id = (SELECT auth.uid()))
      )
    )
  );

CREATE POLICY "Users can create steps" ON public.todo_task_steps
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.todo_tasks t
      WHERE t.id = todo_task_steps.task_id
      AND (
        t.created_by = (SELECT auth.uid())
        OR t.assigned_to = (SELECT auth.uid())
        OR EXISTS (SELECT 1 FROM public.todo_lists WHERE id = t.list_id AND created_by = (SELECT auth.uid()))
        OR EXISTS (SELECT 1 FROM public.todo_list_shares WHERE list_id = t.list_id AND user_id = (SELECT auth.uid()) AND permission = 'edit')
      )
    )
  );

CREATE POLICY "Users can update steps" ON public.todo_task_steps
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.todo_tasks t
      WHERE t.id = todo_task_steps.task_id
      AND (
        t.created_by = (SELECT auth.uid())
        OR t.assigned_to = (SELECT auth.uid())
        OR EXISTS (SELECT 1 FROM public.todo_lists WHERE id = t.list_id AND created_by = (SELECT auth.uid()))
        OR EXISTS (SELECT 1 FROM public.todo_list_shares WHERE list_id = t.list_id AND user_id = (SELECT auth.uid()) AND permission = 'edit')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.todo_tasks t
      WHERE t.id = todo_task_steps.task_id
      AND (
        t.created_by = (SELECT auth.uid())
        OR t.assigned_to = (SELECT auth.uid())
        OR EXISTS (SELECT 1 FROM public.todo_lists WHERE id = t.list_id AND created_by = (SELECT auth.uid()))
        OR EXISTS (SELECT 1 FROM public.todo_list_shares WHERE list_id = t.list_id AND user_id = (SELECT auth.uid()) AND permission = 'edit')
      )
    )
  );

CREATE POLICY "Users can delete steps" ON public.todo_task_steps
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.todo_tasks t
      WHERE t.id = todo_task_steps.task_id
      AND (
        t.created_by = (SELECT auth.uid())
        OR t.assigned_to = (SELECT auth.uid())
        OR EXISTS (SELECT 1 FROM public.todo_lists WHERE id = t.list_id AND created_by = (SELECT auth.uid()))
        OR EXISTS (SELECT 1 FROM public.todo_list_shares WHERE list_id = t.list_id AND user_id = (SELECT auth.uid()) AND permission = 'edit')
      )
    )
  );

-- 6. NOTIFICATION SETTINGS (add to profiles)
-- =============================================
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS todo_notifications JSONB DEFAULT '{
    "assignment": {"push": true, "email": true},
    "reminder": {"push": true, "email": false},
    "due_today": {"push": true, "email": false},
    "completed": {"push": false, "email": false},
    "shared_list": {"push": true, "email": true}
  }'::jsonb;

-- 7. SETTINGS FOR TODO ACCESS
-- =============================================
INSERT INTO public.settings (key, value) VALUES 
  ('todo_enabled', 'true'),
  ('todo_view_users', '[]'),
  ('todo_admin_users', '[]')
ON CONFLICT (key) DO NOTHING;

-- 8. UPDATED_AT TRIGGERS
-- =============================================
CREATE TRIGGER update_todo_list_groups_updated_at
  BEFORE UPDATE ON public.todo_list_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_todo_lists_updated_at
  BEFORE UPDATE ON public.todo_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_todo_tasks_updated_at
  BEFORE UPDATE ON public.todo_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();