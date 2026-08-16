-- =============================================
-- SITZUNGSMODUL - Meetings Management
-- =============================================

-- Enums for meeting management
CREATE TYPE public.meeting_type AS ENUM ('kommandositzung', 'erweitertes_kommando');
CREATE TYPE public.meeting_status AS ENUM ('geplant', 'laufend', 'abgeschlossen', 'abgesagt');
CREATE TYPE public.attendance_status AS ENUM ('anwesend', 'remote', 'entschuldigt', 'unentschuldigt', 'offen');
CREATE TYPE public.agenda_item_status AS ENUM ('offen', 'behandelt', 'vertagt', 'zurueckgestellt');

-- =============================================
-- MEETINGS TABLE - Main meeting data
-- =============================================
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_type public.meeting_type NOT NULL,
  meeting_number TEXT NOT NULL,
  title TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL DEFAULT '19:00',
  location TEXT NOT NULL DEFAULT 'FF-Haus Marchtrenk',
  status public.meeting_status NOT NULL DEFAULT 'geplant',
  
  -- Deadline configuration
  entry_deadline_hours INTEGER NOT NULL DEFAULT 4,
  
  -- Quorum tracking
  is_quorate BOOLEAN DEFAULT false,
  voting_members_present INTEGER DEFAULT 0,
  kdt_present BOOLEAN DEFAULT false,
  
  -- Next meeting info
  next_meeting_date DATE,
  next_meeting_time TIME,
  next_meeting_location TEXT,
  
  -- Protocol
  protocol_generated_at TIMESTAMPTZ,
  protocol_sent_at TIMESTAMPTZ,
  
  -- Metadata
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Index for common queries
CREATE INDEX idx_meetings_type ON public.meetings(meeting_type);
CREATE INDEX idx_meetings_status ON public.meetings(status);
CREATE INDEX idx_meetings_date ON public.meetings(scheduled_date DESC);
CREATE INDEX idx_meetings_created_by ON public.meetings(created_by);

-- =============================================
-- MEETING ATTENDANCE - Track who attended
-- =============================================
CREATE TABLE public.meeting_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.attendance_status NOT NULL DEFAULT 'offen',
  is_voting_member BOOLEAN NOT NULL DEFAULT false,
  function_name TEXT,
  substitute_for UUID REFERENCES public.profiles(id),
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(meeting_id, profile_id)
);

CREATE INDEX idx_meeting_attendance_meeting ON public.meeting_attendance(meeting_id);
CREATE INDEX idx_meeting_attendance_profile ON public.meeting_attendance(profile_id);

-- =============================================
-- MEETING AGENDA ITEMS - Discussion items
-- =============================================
CREATE TABLE public.meeting_agenda_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  
  -- Content
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  submitted_by UUID REFERENCES auth.users NOT NULL,
  submitted_by_name TEXT,
  
  -- Status tracking
  status public.agenda_item_status NOT NULL DEFAULT 'offen',
  priority TEXT DEFAULT 'normal',
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  is_fixed_item BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- Deferral tracking
  deferred_to_meeting_id UUID REFERENCES public.meetings(id),
  deferred_reason TEXT,
  deferred_from_meeting_id UUID REFERENCES public.meetings(id),
  
  -- Discussion notes
  discussion_notes TEXT,
  decision_required BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agenda_items_meeting ON public.meeting_agenda_items(meeting_id);
CREATE INDEX idx_agenda_items_submitted ON public.meeting_agenda_items(submitted_by);
CREATE INDEX idx_agenda_items_status ON public.meeting_agenda_items(status);
CREATE INDEX idx_agenda_items_deferred ON public.meeting_agenda_items(deferred_to_meeting_id);

-- =============================================
-- MEETING DECISIONS - Link to formal votes
-- =============================================
CREATE TABLE public.meeting_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  
  -- Link to existing order (if from Kommandobeschlüsse)
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  
  -- For decisions created directly in meeting
  decision_number TEXT,
  decision_text TEXT NOT NULL,
  source TEXT,
  
  -- Voting results
  votes_for INTEGER NOT NULL DEFAULT 0,
  votes_against INTEGER NOT NULL DEFAULT 0,
  votes_abstain INTEGER NOT NULL DEFAULT 0,
  result TEXT,
  
  -- Recusal tracking
  recused_members TEXT[],
  
  -- Metadata
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meeting_decisions_meeting ON public.meeting_decisions(meeting_id);
CREATE INDEX idx_meeting_decisions_order ON public.meeting_decisions(order_id);

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_decisions ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user can access meeting based on type
CREATE OR REPLACE FUNCTION public.can_access_meeting(p_meeting_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meetings m
    JOIN public.profiles p ON p.id = (SELECT auth.uid())
    WHERE m.id = p_meeting_id
    AND (
      -- Admin/Kommandant always have access
      p.role IN ('admin', 'kommandant')
      OR
      -- Kommandomitglieder have access to all meetings
      'kommandomitglied' = ANY(p.functions)
      OR
      -- Erweitertes Kommando members have access to erweitertes_kommando meetings
      (m.meeting_type = 'erweitertes_kommando' AND 'erweitertes_kommando' = ANY(p.functions))
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_meeting(UUID) TO authenticated;

-- Helper function to check if user can manage meetings
CREATE OR REPLACE FUNCTION public.can_manage_meetings()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
    AND (p.role IN ('admin', 'kommandant') OR 'kdt_stellvertreter' = ANY(p.functions))
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_meetings() TO authenticated;

-- MEETINGS POLICIES
CREATE POLICY "Users can view meetings they have access to"
  ON public.meetings FOR SELECT TO authenticated
  USING (public.can_access_meeting(id));

CREATE POLICY "Only managers can create meetings"
  ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_meetings());

CREATE POLICY "Only managers can update meetings"
  ON public.meetings FOR UPDATE TO authenticated
  USING (public.can_manage_meetings())
  WITH CHECK (public.can_manage_meetings());

CREATE POLICY "Only managers can delete meetings"
  ON public.meetings FOR DELETE TO authenticated
  USING (public.can_manage_meetings());

-- ATTENDANCE POLICIES
CREATE POLICY "Users can view attendance for accessible meetings"
  ON public.meeting_attendance FOR SELECT TO authenticated
  USING (public.can_access_meeting(meeting_id));

CREATE POLICY "Only managers can manage attendance"
  ON public.meeting_attendance FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_meetings());

CREATE POLICY "Only managers can update attendance"
  ON public.meeting_attendance FOR UPDATE TO authenticated
  USING (public.can_manage_meetings())
  WITH CHECK (public.can_manage_meetings());

CREATE POLICY "Only managers can delete attendance"
  ON public.meeting_attendance FOR DELETE TO authenticated
  USING (public.can_manage_meetings());

-- AGENDA ITEMS POLICIES
CREATE POLICY "Users can view agenda items for accessible meetings"
  ON public.meeting_agenda_items FOR SELECT TO authenticated
  USING (public.can_access_meeting(meeting_id));

CREATE POLICY "Kommandomitglieder can create agenda items"
  ON public.meeting_agenda_items FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = submitted_by
    AND public.can_access_meeting(meeting_id)
  );

CREATE POLICY "Own items or managers can update agenda items"
  ON public.meeting_agenda_items FOR UPDATE TO authenticated
  USING (
    public.can_manage_meetings()
    OR (SELECT auth.uid()) = submitted_by
  )
  WITH CHECK (
    public.can_manage_meetings()
    OR (SELECT auth.uid()) = submitted_by
  );

CREATE POLICY "Own items or managers can delete agenda items"
  ON public.meeting_agenda_items FOR DELETE TO authenticated
  USING (
    public.can_manage_meetings()
    OR (SELECT auth.uid()) = submitted_by
  );

-- DECISIONS POLICIES
CREATE POLICY "Users can view decisions for accessible meetings"
  ON public.meeting_decisions FOR SELECT TO authenticated
  USING (public.can_access_meeting(meeting_id));

CREATE POLICY "Only managers can create decisions"
  ON public.meeting_decisions FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_meetings());

CREATE POLICY "Only managers can update decisions"
  ON public.meeting_decisions FOR UPDATE TO authenticated
  USING (public.can_manage_meetings())
  WITH CHECK (public.can_manage_meetings());

CREATE POLICY "Only managers can delete decisions"
  ON public.meeting_decisions FOR DELETE TO authenticated
  USING (public.can_manage_meetings());

-- =============================================
-- UPDATED_AT TRIGGERS
-- =============================================
CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_attendance_updated_at
  BEFORE UPDATE ON public.meeting_attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_agenda_items_updated_at
  BEFORE UPDATE ON public.meeting_agenda_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ADD ERWEITERTES KOMMANDO FUNCTION (if not exists)
-- =============================================
INSERT INTO public.functions (name, label)
VALUES 
  ('erweitertes_kommando', 'Erweitertes Kommando'),
  ('kdt_stellvertreter', 'Kdt-Stellvertreter')
ON CONFLICT (name) DO NOTHING;