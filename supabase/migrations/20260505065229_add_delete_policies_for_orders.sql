-- DELETE Policy für orders: Admin und Kassier dürfen Bestellungen löschen
CREATE POLICY "Admin und Kassier können Bestellungen löschen"
ON public.orders
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND (
      profiles.role = 'admin'
      OR 'kassier' = ANY(profiles.functions)
    )
  )
);

-- DELETE Policy für order_history: Admin und Kassier dürfen History-Einträge löschen
CREATE POLICY "Admin und Kassier können Order-History löschen"
ON public.order_history
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND (
      profiles.role = 'admin'
      OR 'kassier' = ANY(profiles.functions)
    )
  )
);

-- DELETE Policy für order_attachments: Admin und Kassier dürfen Anhänge löschen
CREATE POLICY "Admin und Kassier können Order-Attachments löschen"
ON public.order_attachments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND (
      profiles.role = 'admin'
      OR 'kassier' = ANY(profiles.functions)
    )
  )
);

-- DELETE Policy für order_votes: Admin und Kassier dürfen Votes löschen
CREATE POLICY "Admin und Kassier können Order-Votes löschen"
ON public.order_votes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND (
      profiles.role = 'admin'
      OR 'kassier' = ANY(profiles.functions)
    )
  )
);