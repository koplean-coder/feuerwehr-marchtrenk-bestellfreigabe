-- Add DELETE policies for admins on command decision tables

-- Policy for command_decisions table
CREATE POLICY "Admins can delete command decisions"
  ON public.command_decisions
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  ));

-- Policy for command_decision_items table
CREATE POLICY "Admins can delete command decision items"
  ON public.command_decision_items
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  ));

-- Policy for command_decision_item_votes table
CREATE POLICY "Admins can delete command decision item votes"
  ON public.command_decision_item_votes
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  ));

-- Policy for command_decision_votes table (legacy)
CREATE POLICY "Admins can delete command decision votes"
  ON public.command_decision_votes
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  ));