-- =============================================
-- FIX: Allow meeting attendees to view their meetings
-- =============================================
-- Problem: Users invited as guests/attendees to a meeting cannot see
-- their attendance records because the can_access_meeting function
-- only checks roles/functions, not actual attendance.

-- Update the can_access_meeting function to also check if user is an attendee
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
      OR
      -- NEW: Users who are attendees of this specific meeting have access
      EXISTS (
        SELECT 1 FROM public.meeting_attendance ma
        WHERE ma.meeting_id = p_meeting_id
        AND ma.profile_id = (SELECT auth.uid())
      )
    )
  );
$$;

-- Also create a simpler function to check if user is attendee of ANY meeting
-- This is used for showing the Sitzungen menu item
CREATE OR REPLACE FUNCTION public.user_has_meeting_invitations()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meeting_attendance ma
    WHERE ma.profile_id = (SELECT auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_meeting_invitations() TO authenticated;

-- Add a direct RLS policy for users to read their OWN attendance records
-- This avoids circular dependency issues with can_access_meeting
DROP POLICY IF EXISTS "Users can view their own attendance" ON public.meeting_attendance;
CREATE POLICY "Users can view their own attendance"
  ON public.meeting_attendance FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));

-- Also add policy for users to view the meetings they are invited to
-- (separate from the role-based access)
DROP POLICY IF EXISTS "Attendees can view their meetings" ON public.meetings;
CREATE POLICY "Attendees can view their meetings"
  ON public.meetings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meeting_attendance ma
      WHERE ma.meeting_id = id
      AND ma.profile_id = (SELECT auth.uid())
    )
  );