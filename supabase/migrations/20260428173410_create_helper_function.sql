-- Create helper function to check step assignment (SECURITY INVOKER is default)
CREATE OR REPLACE FUNCTION public.user_has_step_in_task(p_task_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_steps 
    WHERE task_id = p_task_id AND assigned_to = p_user_id
  );
$$;