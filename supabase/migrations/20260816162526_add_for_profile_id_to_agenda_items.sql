-- Add for_profile_id column to meeting_agenda_items
-- This indicates which person's section the item should appear in (regardless of who created it)
ALTER TABLE public.meeting_agenda_items 
ADD COLUMN IF NOT EXISTS for_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_meeting_agenda_items_for_profile_id 
ON public.meeting_agenda_items(for_profile_id);

-- Backfill existing data: set for_profile_id to submitted_by for all existing items
UPDATE public.meeting_agenda_items 
SET for_profile_id = submitted_by 
WHERE for_profile_id IS NULL;