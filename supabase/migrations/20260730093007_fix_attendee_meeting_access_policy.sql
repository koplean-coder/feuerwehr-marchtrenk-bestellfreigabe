-- Fix: Create a SECURITY DEFINER function to check attendance
-- This avoids RLS recursion issues when the policy queries meeting_attendance

CREATE OR REPLACE FUNCTION public.is_meeting_attendee(p_meeting_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meeting_attendance ma
    WHERE ma.meeting_id = p_meeting_id
    AND ma.profile_id = (SELECT auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_meeting_attendee(UUID) TO authenticated;

-- Drop the old inline policy and create one using the function
DROP POLICY IF EXISTS "Attendees can view their meetings" ON public.meetings;
CREATE POLICY "Attendees can view their meetings"
  ON public.meetings FOR SELECT TO authenticated
  USING (public.is_meeting_attendee(id));