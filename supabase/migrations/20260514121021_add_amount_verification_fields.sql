-- Add fields for amount verification by Kassier
ALTER TABLE public.event_participations 
ADD COLUMN IF NOT EXISTS amount_confirmed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS confirmed_amount NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS amount_confirmed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS amount_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS amount_change_reason TEXT,
ADD COLUMN IF NOT EXISTS requires_reapproval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reapproved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reapproved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_details_accepted BOOLEAN DEFAULT false;

-- Create table for logging amount changes
CREATE TABLE IF NOT EXISTS public.event_participation_amount_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_participation_id UUID REFERENCES public.event_participations(id) ON DELETE CASCADE NOT NULL,
  original_amount NUMERIC(10,2) NOT NULL,
  new_amount NUMERIC(10,2) NOT NULL,
  change_reason TEXT,
  changed_by UUID REFERENCES auth.users(id) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.event_participation_amount_history ENABLE ROW LEVEL SECURITY;

-- Policies for amount history - using functions array for kassier check
CREATE POLICY "Users can view amount history" 
  ON public.event_participation_amount_history 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "Kassier and admin can insert amount history" 
  ON public.event_participation_amount_history 
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = (select auth.uid()) 
      AND (
        role = 'admin'
        OR 'kassier' = ANY(functions)
      )
    )
  );

CREATE POLICY "Kommandant and admin can update amount history" 
  ON public.event_participation_amount_history 
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'kommandant')
    )
  );

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_amount_history_participation 
  ON public.event_participation_amount_history(event_participation_id);