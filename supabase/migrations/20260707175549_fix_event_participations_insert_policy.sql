-- Fix INSERT policy for event_participations
-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "event_participations_insert" ON public.event_participations;

-- Recreate INSERT policy: Any authenticated user can create their own entries
CREATE POLICY "event_participations_insert" ON public.event_participations
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

-- Also ensure UPDATE policy allows status changes by the creator
DROP POLICY IF EXISTS "event_participations_update" ON public.event_participations;

-- UPDATE: Creator can update their own entries (any status for their own), 
-- Kommandant/Admin can update any for approval
CREATE POLICY "event_participations_update" ON public.event_participations
  FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('kommandant', 'admin')
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('kommandant', 'admin')
    )
  );