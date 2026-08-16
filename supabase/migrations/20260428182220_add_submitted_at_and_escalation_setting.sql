-- Add submitted_at column to track when order was submitted for Bereichsleiter review
ALTER TABLE public.orders
ADD COLUMN submitted_at TIMESTAMP WITH TIME ZONE;

-- Update existing orders that are waiting for Bereichsleiter to have submitted_at set to updated_at
UPDATE public.orders 
SET submitted_at = updated_at 
WHERE status = 'ausstehend_bereichsleitung' AND submitted_at IS NULL;

-- Insert default setting for escalation timeout (in hours)
INSERT INTO public.settings (key, value) 
VALUES ('escalation_timeout_hours', '24')
ON CONFLICT (key) DO NOTHING;