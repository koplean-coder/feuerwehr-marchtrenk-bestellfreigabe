-- =====================================================
-- FIX: Erweiterte RLS-Policy für todo_task_shares
-- Erlaubt: Task-Ersteller + Zugewiesener Benutzer + Listen-Owner
-- =====================================================

-- Drop die restriktive INSERT Policy
DROP POLICY IF EXISTS "todo_task_shares_insert" ON public.todo_task_shares;

-- Erweiterte INSERT Policy
-- Erlaubt: Task-Creator, zugewiesener User, oder Listen-Owner
CREATE POLICY "todo_task_shares_insert" ON public.todo_task_shares
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Task-Ersteller kann immer teilen
    EXISTS (
      SELECT 1 FROM public.todo_tasks t
      WHERE t.id = task_id AND t.created_by = (SELECT auth.uid())
    )
    OR
    -- Zugewiesener Benutzer kann auch teilen
    EXISTS (
      SELECT 1 FROM public.todo_tasks t
      WHERE t.id = task_id AND t.assigned_to = (SELECT auth.uid())
    )
    OR
    -- Listen-Owner kann Tasks in seinen Listen teilen
    EXISTS (
      SELECT 1 FROM public.todo_tasks t
      JOIN public.todo_lists l ON l.id = t.list_id
      WHERE t.id = task_id AND l.created_by = (SELECT auth.uid())
    )
  );

-- Drop und erweitere auch die DELETE Policy
DROP POLICY IF EXISTS "todo_task_shares_delete" ON public.todo_task_shares;

CREATE POLICY "todo_task_shares_delete" ON public.todo_task_shares
  FOR DELETE TO authenticated
  USING (
    -- Task-Ersteller kann Shares löschen
    EXISTS (
      SELECT 1 FROM public.todo_tasks t
      WHERE t.id = task_id AND t.created_by = (SELECT auth.uid())
    )
    OR
    -- Zugewiesener kann Shares löschen
    EXISTS (
      SELECT 1 FROM public.todo_tasks t
      WHERE t.id = task_id AND t.assigned_to = (SELECT auth.uid())
    )
    OR
    -- Listen-Owner kann Shares löschen
    EXISTS (
      SELECT 1 FROM public.todo_tasks t
      JOIN public.todo_lists l ON l.id = t.list_id
      WHERE t.id = task_id AND l.created_by = (SELECT auth.uid())
    )
    OR
    -- User kann sich selbst aus dem Share entfernen
    user_id = (SELECT auth.uid())
  );

-- Drop und erweitere auch die UPDATE Policy
DROP POLICY IF EXISTS "todo_task_shares_update" ON public.todo_task_shares;

CREATE POLICY "todo_task_shares_update" ON public.todo_task_shares
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.todo_tasks t
      WHERE t.id = task_id AND t.created_by = (SELECT auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.todo_tasks t
      WHERE t.id = task_id AND t.assigned_to = (SELECT auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.todo_tasks t
      JOIN public.todo_lists l ON l.id = t.list_id
      WHERE t.id = task_id AND l.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.todo_tasks t
      WHERE t.id = task_id AND t.created_by = (SELECT auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.todo_tasks t
      WHERE t.id = task_id AND t.assigned_to = (SELECT auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.todo_tasks t
      JOIN public.todo_lists l ON l.id = t.list_id
      WHERE t.id = task_id AND l.created_by = (SELECT auth.uid())
    )
  );