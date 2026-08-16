-- Add task_id and step_id columns to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS step_id UUID REFERENCES public.task_steps(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS notification_type TEXT DEFAULT 'order';

-- Make order_id nullable (it was required before)
ALTER TABLE public.notifications 
ALTER COLUMN order_id DROP NOT NULL;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_task_id ON public.notifications(task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_step_id ON public.notifications(step_id);