-- Add subject field for message notifications
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS subject TEXT;