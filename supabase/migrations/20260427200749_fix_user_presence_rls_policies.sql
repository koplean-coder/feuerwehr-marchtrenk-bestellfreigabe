-- Check existing policies and ensure proper INSERT/UPDATE permissions
-- First, let's make sure there's a policy that allows users to insert/update their own presence

-- Drop existing policies if they exist and recreate them properly
DROP POLICY IF EXISTS "Users can insert own presence" ON user_presence;
DROP POLICY IF EXISTS "Users can update own presence" ON user_presence;
DROP POLICY IF EXISTS "Users can view all presence" ON user_presence;
DROP POLICY IF EXISTS "Users can upsert own presence" ON user_presence;

-- Create proper policies for user_presence
CREATE POLICY "Users can insert own presence" ON user_presence
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own presence" ON user_presence
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view all presence" ON user_presence
  FOR SELECT TO authenticated
  USING (true);