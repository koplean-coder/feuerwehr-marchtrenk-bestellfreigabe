-- Add payment_method column to event_participations
ALTER TABLE public.event_participations 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'direct_to_organizer' 
CHECK (payment_method IN ('cash', 'transfer', 'direct_to_organizer'));

-- Add organizer_iban for direct transfers
ALTER TABLE public.event_participations 
ADD COLUMN IF NOT EXISTS organizer_iban TEXT;