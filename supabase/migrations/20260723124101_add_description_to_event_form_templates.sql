-- Add description column to event_form_templates table
ALTER TABLE public.event_form_templates ADD COLUMN IF NOT EXISTS description TEXT;