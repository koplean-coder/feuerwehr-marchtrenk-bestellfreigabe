-- Drop existing SELECT policy and create a new one that allows users to see:
-- 1. Tasks they created
-- 2. Tasks assigned to them
-- 3. Tasks where they have an assigned step
-- 4. All tasks for admins/kommandants/bereichsleiter

DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;

CREATE POLICY "Users can view tasks" ON public.tasks
FOR SELECT TO authenticated
USING (
  created_by = (select auth.uid())
  OR assigned_to = (select auth.uid())
  OR id IN (
    SELECT task_id FROM public.task_steps 
    WHERE assigned_to = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (select auth.uid()) 
    AND role IN ('admin', 'kommandant', 'bereichsleiter')
  )
);

-- Also update task_steps policy to allow users to see steps of tasks they can access
DROP POLICY IF EXISTS "Users can view task steps" ON public.task_steps;

CREATE POLICY "Users can view task steps" ON public.task_steps
FOR SELECT TO authenticated
USING (
  assigned_to = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id
    AND (
      t.created_by = (select auth.uid())
      OR t.assigned_to = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = (select auth.uid()) 
        AND role IN ('admin', 'kommandant', 'bereichsleiter')
      )
    )
  )
);