-- Create RLS UPDATE policy for tasks table
-- Allows users to update tasks they are involved with

CREATE POLICY "Users can update tasks they are involved in"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  -- User is the task creator
  created_by = (SELECT auth.uid())
  -- User is the main assignee
  OR assigned_to = (SELECT auth.uid())
  -- User is assigned to any step of this task
  OR user_has_step_in_task(id, (SELECT auth.uid()))
  -- User is an admin
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  -- Same conditions for the new row
  created_by = (SELECT auth.uid())
  OR assigned_to = (SELECT auth.uid())
  OR user_has_step_in_task(id, (SELECT auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
    AND profiles.role = 'admin'
  )
);