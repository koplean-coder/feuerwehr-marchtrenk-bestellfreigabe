-- Check existing policies on event_participations
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual::text as using_expr,
  with_check::text as with_check_expr
FROM pg_policies 
WHERE tablename = 'event_participations';