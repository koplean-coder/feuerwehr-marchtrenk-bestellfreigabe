-- Add admin policies for managing fixed agenda items

-- First, remove the unique constraint on sort_order (it blocks swapping)
ALTER TABLE public.meeting_fixed_agenda_items DROP CONSTRAINT IF EXISTS unique_sort_order;

-- Admin INSERT policy
CREATE POLICY "Admins can insert fixed agenda items"
  ON public.meeting_fixed_agenda_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
      AND (role = 'admin' OR role = 'kommandant')
    )
  );

-- Admin UPDATE policy
CREATE POLICY "Admins can update fixed agenda items"
  ON public.meeting_fixed_agenda_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
      AND (role = 'admin' OR role = 'kommandant')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
      AND (role = 'admin' OR role = 'kommandant')
    )
  );

-- Admin DELETE policy
CREATE POLICY "Admins can delete fixed agenda items"
  ON public.meeting_fixed_agenda_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
      AND (role = 'admin' OR role = 'kommandant')
    )
  );