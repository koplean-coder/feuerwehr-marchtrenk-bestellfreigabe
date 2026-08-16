-- Add new setting for Kommandomitglied approval threshold
INSERT INTO public.settings (key, value) VALUES 
  ('freigabebetrag_kommandomitglied', '5000')
ON CONFLICT (key) DO NOTHING;

-- Add columns to orders table for Kommandomitglied approval
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS requires_kommandomitglied_approval BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS kommandomitglied_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS kommandomitglied_override_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS kommandomitglied_override_reason TEXT,
ADD COLUMN IF NOT EXISTS kommandomitglied_override_at TIMESTAMP WITH TIME ZONE;

-- Create order_votes table for tracking Kommandomitglied votes
CREATE TABLE IF NOT EXISTS public.order_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote VARCHAR(10) NOT NULL CHECK (vote IN ('approve', 'reject')),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id, user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_order_votes_order_id ON public.order_votes(order_id);
CREATE INDEX IF NOT EXISTS idx_order_votes_user_id ON public.order_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_requires_kommandomitglied ON public.orders(requires_kommandomitglied_approval);

-- Enable RLS on order_votes
ALTER TABLE public.order_votes ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_votes
CREATE POLICY "Users can view all votes" ON public.order_votes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Kommandomitglied can insert their vote" ON public.order_votes
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own vote" ON public.order_votes
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own vote" ON public.order_votes
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);