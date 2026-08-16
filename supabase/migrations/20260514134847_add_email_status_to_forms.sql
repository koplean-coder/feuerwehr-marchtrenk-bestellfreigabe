-- Add email_status to event_participations
ALTER TABLE public.event_participations 
ADD COLUMN IF NOT EXISTS email_status TEXT DEFAULT 'none' CHECK (email_status IN ('none', 'pending', 'sent', 'failed'));

-- Add email_status to payment_orders
ALTER TABLE public.payment_orders 
ADD COLUMN IF NOT EXISTS email_status TEXT DEFAULT 'none' CHECK (email_status IN ('none', 'pending', 'sent', 'failed'));

-- Create indexes for email_status queries
CREATE INDEX IF NOT EXISTS idx_event_participations_email_status ON public.event_participations(email_status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_email_status ON public.payment_orders(email_status);