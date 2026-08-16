-- Add 'genehmigt' to the status check constraint
ALTER TABLE public.ideas DROP CONSTRAINT IF EXISTS ideas_status_check;
ALTER TABLE public.ideas ADD CONSTRAINT ideas_status_check 
  CHECK (status IN ('neu', 'genehmigt', 'in_bearbeitung', 'umgesetzt', 'abgelehnt'));