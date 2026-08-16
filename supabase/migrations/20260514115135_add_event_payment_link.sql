-- Add column to link payment orders to event participations
ALTER TABLE public.payment_orders 
ADD COLUMN linked_event_participation_id UUID REFERENCES public.event_participations(id) ON DELETE SET NULL;

-- Add new payment method option for direct transfer to organizer
-- We'll handle this as a separate boolean flag since it's only for event-linked payments
ALTER TABLE public.payment_orders
ADD COLUMN is_direct_to_organizer BOOLEAN DEFAULT false;

-- Add organizer payment details to event participations
ALTER TABLE public.event_participations
ADD COLUMN organizer_iban TEXT,
ADD COLUMN organizer_bank_name TEXT;

-- Index for finding linked payment orders
CREATE INDEX idx_payment_orders_linked_event ON public.payment_orders(linked_event_participation_id) WHERE linked_event_participation_id IS NOT NULL;