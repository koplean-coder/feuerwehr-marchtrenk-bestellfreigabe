-- Add new fields for order execution and receipt tracking
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_executed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS order_executed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS order_executed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS order_received BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS order_received_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS order_received_by UUID REFERENCES auth.users(id);

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_orders_order_executed ON public.orders(order_executed);
CREATE INDEX IF NOT EXISTS idx_orders_order_received ON public.orders(order_received);