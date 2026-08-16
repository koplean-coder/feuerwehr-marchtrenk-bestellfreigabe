-- Add rejected status and rejection_reason to payment_orders
ALTER TABLE public.payment_orders 
DROP CONSTRAINT IF EXISTS payment_orders_status_check;

ALTER TABLE public.payment_orders 
ADD CONSTRAINT payment_orders_status_check 
CHECK (status IN ('draft', 'submitted', 'approved', 'paid', 'rejected'));

ALTER TABLE public.payment_orders 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;