-- Update meeting access functions to be case-insensitive for function checks

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
      -- Kommandomitglieder have access to all meetings (case-insensitive)
      EXISTS (SELECT 1 FROM unnest(COALESCE(p.functions, ARRAY[]::text[])) AS f WHERE LOWER(f) = 'kommandomitglied')
      OR
      -- Erweitertes Kommando members have access to erweitertes_kommando meetings (case-insensitive)
      (m.meeting_type = 'erweitertes_kommando' AND 
       EXISTS (SELECT 1 FROM unnest(COALESCE(p.functions, ARRAY[]::text[])) AS f WHERE LOWER(f) = 'erweitertes_kommando'))
      OR
      -- Users who are attendees of this specific meeting have access
      EXISTS (
        SELECT 1 FROM public.meeting_attendance ma
        WHERE ma.meeting_id = p_meeting_id
        AND ma.profile_id = (SELECT auth.uid())
      )
    )
  );
$$;

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
      OR EXISTS (SELECT 1 FROM unnest(COALESCE(p.functions, ARRAY[]::text[])) AS f WHERE LOWER(f) = 'kommandomitglied')
      OR EXISTS (SELECT 1 FROM unnest(COALESCE(p.functions, ARRAY[]::text[])) AS f WHERE LOWER(f) = 'erweitertes_kommando')
      OR EXISTS (SELECT 1 FROM unnest(COALESCE(p.functions, ARRAY[]::text[])) AS f WHERE LOWER(f) = 'kdt_stellvertreter')
      OR EXISTS (SELECT 1 FROM unnest(COALESCE(p.functions, ARRAY[]::text[])) AS f WHERE LOWER(f) = 'kdt-stellvertreter')
    )
  );
$$;