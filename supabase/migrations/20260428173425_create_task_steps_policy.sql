-- Create task_steps policy first (no reference to tasks table to avoid recursion)
-- Users can see steps if:
-- 1. They are assigned to the step
-- 2. They are admin/kommandant/bereichsleiter
CREATE POLICY "Users can view task steps" ON public.task_steps
FOR SELECT TO authenticated
USING (
  assigned_to = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (select auth.uid()) 
    AND role IN ('admin', 'kommandant', 'bereichsleiter')
  )
);