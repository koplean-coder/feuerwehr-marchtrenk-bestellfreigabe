-- Allow authenticated users to insert notifications for other users (for messaging)
CREATE POLICY "Users can send notifications to others"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Keep the existing select policy - users can only read their own notifications
-- (should already exist, but ensure it does)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Users can view own notifications'
  ) THEN
    CREATE POLICY "Users can view own notifications"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING ((select auth.uid()) = user_id);
  END IF;
END $$;