-- Create RLS UPDATE policy for task_steps table
-- Allows users to update steps they are assigned to, or if they are admin/task creator

CREATE POLICY "Users can update steps they are assigned to"
ON public.task_steps
FOR UPDATE
TO authenticated
USING (
  -- User is assigned to this step
  assigned_to = (SELECT auth.uid())
  -- User is an admin
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
    AND profiles.role = 'admin'
  )
  -- User is the creator of the parent task
  OR EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_steps.task_id
    AND tasks.created_by = (SELECT auth.uid())
  )
  -- User is the main assignee of the parent task
  OR EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_steps.task_id
    AND tasks.assigned_to = (SELECT auth.uid())
  )
)
WITH CHECK (
  -- Same conditions for the new row
  assigned_to = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
    AND profiles.role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_steps.task_id
    AND tasks.created_by = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_steps.task_id
    AND tasks.assigned_to = (SELECT auth.uid())
  )
);