-- Add 'archiviert' to allowed status values
ALTER TABLE public.ideas DROP CONSTRAINT IF EXISTS ideas_status_check;
ALTER TABLE public.ideas ADD CONSTRAINT ideas_status_check 
CHECK (status IN ('eingereicht', 'abstimmung_laeuft', 'wird_umgesetzt', 'umgesetzt', 'verworfen', 'archiviert'));

-- Move all 'verworfen' ideas to 'archiviert'
UPDATE public.ideas SET status = 'archiviert' WHERE status = 'verworfen';