-- Add 'blau' to the traffic_light check constraint
-- First check if there's a constraint, if so drop and recreate
ALTER TABLE public.meeting_agenda_items 
DROP CONSTRAINT IF EXISTS meeting_agenda_items_traffic_light_check;

ALTER TABLE public.meeting_agenda_items 
ADD CONSTRAINT meeting_agenda_items_traffic_light_check 
CHECK (traffic_light IN ('rot', 'gelb', 'gruen', 'blau'));