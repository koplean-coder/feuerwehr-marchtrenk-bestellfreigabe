-- Add field to track who changed the due date
ALTER TABLE public.todo_tasks 
ADD COLUMN IF NOT EXISTS due_date_changed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS due_date_changed_at TIMESTAMP WITH TIME ZONE;