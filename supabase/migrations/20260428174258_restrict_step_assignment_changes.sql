-- Create trigger function to restrict who can change step assignments
CREATE OR REPLACE FUNCTION public.check_step_assignment_change()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
  current_user_role TEXT;
  task_creator_id UUID;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- If assigned_to is not being changed, allow the update
  IF OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to THEN
    RETURN NEW;
  END IF;
  
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = current_user_id;
  
  -- Get the task creator
  SELECT created_by INTO task_creator_id
  FROM public.tasks
  WHERE id = NEW.task_id;
  
  -- Allow if user is admin, kommandant, or task creator
  IF current_user_role IN ('admin', 'kommandant') OR current_user_id = task_creator_id THEN
    RETURN NEW;
  END IF;
  
  -- Otherwise, reject the change
  RAISE EXCEPTION 'Nur Admins, Kommandanten oder der Aufgaben-Ersteller können die Zuweisung ändern';
END;
$$ LANGUAGE plpgsql;

-- Create trigger on task_steps
DROP TRIGGER IF EXISTS check_step_assignment_change_trigger ON public.task_steps;
CREATE TRIGGER check_step_assignment_change_trigger
  BEFORE UPDATE ON public.task_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.check_step_assignment_change();