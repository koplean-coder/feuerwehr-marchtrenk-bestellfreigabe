-- Add visible_to_all column to tasks table
ALTER TABLE public.tasks
ADD COLUMN visible_to_all BOOLEAN NOT NULL DEFAULT false;

-- Update the SELECT policy to include visible_to_all tasks
DROP POLICY IF EXISTS "Users can view tasks they are involved in or admin" ON public.tasks;

CREATE POLICY "Users can view tasks they are involved in or admin"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  -- Task is visible to all
  visible_to_all = true
  -- User is the task creator
  OR created_by = (SELECT auth.uid())
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