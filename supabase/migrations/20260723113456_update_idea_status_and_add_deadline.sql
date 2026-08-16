-- Drop old check constraint and create new one with updated status values
ALTER TABLE public.ideas DROP CONSTRAINT IF EXISTS ideas_status_check;

-- Add new check constraint with updated status values
ALTER TABLE public.ideas ADD CONSTRAINT ideas_status_check 
CHECK (status IN ('eingereicht', 'abstimmung_laeuft', 'wird_umgesetzt', 'umgesetzt', 'verworfen', 'neu', 'genehmigt', 'in_bearbeitung', 'abgelehnt'));

-- Update existing status values to new ones
UPDATE public.ideas SET status = 'eingereicht' WHERE status = 'neu';
UPDATE public.ideas SET status = 'abstimmung_laeuft' WHERE status = 'genehmigt';
UPDATE public.ideas SET status = 'wird_umgesetzt' WHERE status = 'in_bearbeitung';
UPDATE public.ideas SET status = 'verworfen' WHERE status = 'abgelehnt';

-- Now restrict to only new values
ALTER TABLE public.ideas DROP CONSTRAINT IF EXISTS ideas_status_check;
ALTER TABLE public.ideas ADD CONSTRAINT ideas_status_check 
CHECK (status IN ('eingereicht', 'abstimmung_laeuft', 'wird_umgesetzt', 'umgesetzt', 'verworfen'));

-- Add voting_deadline column
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS voting_deadline TIMESTAMP WITH TIME ZONE;

-- Set default voting deadline for existing ideas (2 months from creation)
UPDATE public.ideas 
SET voting_deadline = created_at + INTERVAL '2 months'
WHERE voting_deadline IS NULL;

-- Add column for deadline notification sent
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS deadline_notification_sent BOOLEAN DEFAULT false;

-- Create index for deadline queries
CREATE INDEX IF NOT EXISTS idx_ideas_voting_deadline ON public.ideas(voting_deadline);