-- Add 'direct_to_organizer' as a valid payment method
ALTER TABLE public.payment_orders 
DROP CONSTRAINT IF EXISTS payment_orders_payment_method_check;

ALTER TABLE public.payment_orders 
ADD CONSTRAINT payment_orders_payment_method_check 
CHECK (payment_method IN ('cash', 'transfer', 'direct_to_organizer'));