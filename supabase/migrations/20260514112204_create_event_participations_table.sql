-- Create event_participations table for "Teilnahme Veranstaltung" form
CREATE TABLE public.event_participations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_number TEXT NOT NULL UNIQUE,
  
  -- Event details
  event_name TEXT NOT NULL,
  event_location TEXT,
  organizer TEXT,
  event_date DATE NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  estimated_costs DECIMAL(10,2) NOT NULL DEFAULT 0,
  transport_type TEXT,
  overnight_required BOOLEAN DEFAULT false,
  
  -- Attachment
  attachment_url TEXT,
  attachment_name TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Workflow
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT
);

-- Enable RLS
ALTER TABLE public.event_participations ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_event_participations_created_by ON public.event_participations(created_by);
CREATE INDEX idx_event_participations_status ON public.event_participations(status);
CREATE INDEX idx_event_participations_event_date ON public.event_participations(event_date);

-- RLS Policies
-- SELECT: Users can see their own entries, Kommandant/Admin/Bereichsleiter can see all
CREATE POLICY "event_participations_select" ON public.event_participations
  FOR SELECT TO authenticated
  USING (
    created_by = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('kommandant', 'admin', 'bereichsleiter')
    )
  );

-- INSERT: Any authenticated user can create
CREATE POLICY "event_participations_insert" ON public.event_participations
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

-- UPDATE: Creator can update drafts, Kommandant/Admin can update for approval
CREATE POLICY "event_participations_update" ON public.event_participations
  FOR UPDATE TO authenticated
  USING (
    (created_by = (SELECT auth.uid()) AND status = 'draft') OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('kommandant', 'admin')
    )
  )
  WITH CHECK (
    (created_by = (SELECT auth.uid()) AND status = 'draft') OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('kommandant', 'admin')
    )
  );

-- DELETE: Creator can delete drafts, Admin can delete any
CREATE POLICY "event_participations_delete" ON public.event_participations
  FOR DELETE TO authenticated
  USING (
    (created_by = (SELECT auth.uid()) AND status = 'draft') OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_event_participations_updated_at
  BEFORE UPDATE ON public.event_participations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();