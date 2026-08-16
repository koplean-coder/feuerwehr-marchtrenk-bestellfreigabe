-- Fix: can_access_meeting function needs to handle NULL functions array
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
      'kommandomitglied' = ANY(COALESCE(p.functions, ARRAY[]::text[]))
      OR
      -- Erweitertes Kommando members have access to erweitertes_kommando meetings
      (m.meeting_type = 'erweitertes_kommando' AND 'erweitertes_kommando' = ANY(COALESCE(p.functions, ARRAY[]::text[])))
    )
  );
$$;

-- Fix: can_manage_meetings function needs to handle NULL functions array  
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
    AND (
      p.role IN ('admin', 'kommandant') 
      OR 'kdt_stellvertreter' = ANY(COALESCE(p.functions, ARRAY[]::text[]))
    )
  );
$$;

-- Create a simpler function for checking general meeting access (not specific meeting)
CREATE OR REPLACE FUNCTION public.can_view_meetings()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
    AND (
      p.role IN ('admin', 'kommandant')
      OR 'kommandomitglied' = ANY(COALESCE(p.functions, ARRAY[]::text[]))
      OR 'erweitertes_kommando' = ANY(COALESCE(p.functions, ARRAY[]::text[]))
      OR 'kdt_stellvertreter' = ANY(COALESCE(p.functions, ARRAY[]::text[]))
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_view_meetings() TO authenticated;

-- Update SELECT policy to use simpler check for listing
DROP POLICY IF EXISTS "Users can view meetings they have access to" ON public.meetings;

CREATE POLICY "Users can view meetings they have access to"
  ON public.meetings FOR SELECT TO authenticated
  USING (
    public.can_view_meetings()
    AND (
      -- For kommandositzung: must be admin, kommandant, or kommandomitglied
      meeting_type = 'kommandositzung' AND (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin', 'kommandant'))
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND 'kommandomitglied' = ANY(COALESCE(p.functions, ARRAY[]::text[])))
      )
      OR
      -- For erweitertes_kommando: can also include erweitertes_kommando function
      meeting_type = 'erweitertes_kommando' AND (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin', 'kommandant'))
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND 'kommandomitglied' = ANY(COALESCE(p.functions, ARRAY[]::text[])))
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND 'erweitertes_kommando' = ANY(COALESCE(p.functions, ARRAY[]::text[])))
      )
    )
  );