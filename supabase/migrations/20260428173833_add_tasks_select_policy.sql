-- Create RLS SELECT policy for tasks table
-- Allows access if user is: creator, main assignee, assigned to any step, or admin

CREATE POLICY "Users can view tasks they are involved in or admin"
ON public.tasks
FOR SELECT
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
);