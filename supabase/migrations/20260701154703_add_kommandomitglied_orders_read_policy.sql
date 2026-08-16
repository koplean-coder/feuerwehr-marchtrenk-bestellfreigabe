-- Policy für Kommandomitglieder: Können Bestellungen sehen, bei denen sie abstimmen sollen
CREATE POLICY "Kommandomitglieder können Bestellungen zur Abstimmung sehen"
ON public.orders
FOR SELECT
TO authenticated
USING (
  requires_kommandomitglied_approval = true
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.functions @> ARRAY['kommandomitglied']::text[]
  )
);