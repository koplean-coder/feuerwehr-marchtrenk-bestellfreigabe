-- Add approval columns to suppliers table
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_suppliers_is_approved ON public.suppliers(is_approved);

-- Update existing suppliers to be approved (so they remain visible)
UPDATE public.suppliers SET is_approved = true WHERE is_approved = false;