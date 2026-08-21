-- Prüfe/erstelle INSERT-Policy für todo_tasks
-- Authentifizierte Benutzer dürfen Tasks erstellen

DROP POLICY IF EXISTS "Users can insert tasks" ON public.todo_tasks;
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON public.todo_tasks;

CREATE POLICY "Authenticated users can insert tasks"
  ON public.todo_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);