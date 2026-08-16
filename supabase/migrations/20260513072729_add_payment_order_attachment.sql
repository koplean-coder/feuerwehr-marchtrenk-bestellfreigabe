-- Add attachment column to payment_orders
ALTER TABLE public.payment_orders 
ADD COLUMN attachment_url TEXT,
ADD COLUMN attachment_name TEXT;