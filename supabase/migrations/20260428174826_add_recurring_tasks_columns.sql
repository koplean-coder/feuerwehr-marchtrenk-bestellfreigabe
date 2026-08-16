-- Create enum for recurrence types
CREATE TYPE public.recurrence_type AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom');

-- Add recurrence columns to tasks table
ALTER TABLE public.tasks
ADD COLUMN is_recurring BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN recurrence_type public.recurrence_type,
ADD COLUMN recurrence_interval INTEGER,
ADD COLUMN parent_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

-- Add index for finding recurring tasks
CREATE INDEX idx_tasks_recurring ON public.tasks(is_recurring) WHERE is_recurring = true;
CREATE INDEX idx_tasks_parent ON public.tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;