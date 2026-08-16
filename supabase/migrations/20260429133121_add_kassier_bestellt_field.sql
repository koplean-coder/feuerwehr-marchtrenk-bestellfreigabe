-- Add kassier_bestellt field to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS kassier_bestellt BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS kassier_bestellt_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS kassier_bestellt_by UUID REFERENCES auth.users(id);

-- Add index for kassier queries
CREATE INDEX IF NOT EXISTS idx_orders_kassier_bestellt ON public.orders(kassier_bestellt) WHERE status = 'genehmigt';