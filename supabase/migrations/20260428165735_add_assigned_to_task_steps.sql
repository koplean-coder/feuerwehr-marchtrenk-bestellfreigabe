-- Add assigned_to column to task_steps table
ALTER TABLE public.task_steps 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_task_steps_assigned_to ON public.task_steps(assigned_to);