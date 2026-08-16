-- Add new columns for message notifications
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS original_recipients UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_reply BOOLEAN DEFAULT false;

-- Add index for sender_id
CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON public.notifications(sender_id);