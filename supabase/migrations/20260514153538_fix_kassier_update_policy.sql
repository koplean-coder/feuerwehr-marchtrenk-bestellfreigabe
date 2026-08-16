-- Check and fix RLS policies for event_participations
-- Allow Kassier to update amount confirmation fields

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Kassier can confirm amounts" ON public.event_participations;

-- Create policy for Kassier to update amount confirmation fields
CREATE POLICY "Kassier can confirm amounts"
  ON public.event_participations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND (
        profiles.role IN ('admin', 'kommandant')
        OR profiles.functions::text LIKE '%kassier%'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND (
        profiles.role IN ('admin', 'kommandant')
        OR profiles.functions::text LIKE '%kassier%'
      )
    )
  );