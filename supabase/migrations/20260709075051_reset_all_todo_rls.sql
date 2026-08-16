-- COMPLETELY RESET all todo RLS policies

-- Drop ALL policies on todo tables (any name)
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename FROM pg_policies 
    WHERE schemaname = 'public' AND tablename LIKE 'todo_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE todo_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_list_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_list_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_task_steps ENABLE ROW LEVEL SECURITY;

-- FRESH policies for todo_list_groups
CREATE POLICY "tlg_sel" ON todo_list_groups FOR SELECT TO authenticated USING (created_by = (select auth.uid()));
CREATE POLICY "tlg_ins" ON todo_list_groups FOR INSERT TO authenticated WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "tlg_upd" ON todo_list_groups FOR UPDATE TO authenticated USING (created_by = (select auth.uid())) WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "tlg_del" ON todo_list_groups FOR DELETE TO authenticated USING (created_by = (select auth.uid()));

-- FRESH policies for todo_lists
CREATE POLICY "tl_sel" ON todo_lists FOR SELECT TO authenticated USING (created_by = (select auth.uid()));
CREATE POLICY "tl_ins" ON todo_lists FOR INSERT TO authenticated WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "tl_upd" ON todo_lists FOR UPDATE TO authenticated USING (created_by = (select auth.uid())) WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "tl_del" ON todo_lists FOR DELETE TO authenticated USING (created_by = (select auth.uid()));

-- FRESH policies for todo_list_shares
CREATE POLICY "tls_sel" ON todo_list_shares FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "tls_ins" ON todo_list_shares FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tls_del" ON todo_list_shares FOR DELETE TO authenticated USING (true);

-- FRESH policies for todo_tasks
CREATE POLICY "tt_sel" ON todo_tasks FOR SELECT TO authenticated USING (created_by = (select auth.uid()) OR assigned_to = (select auth.uid()));
CREATE POLICY "tt_ins" ON todo_tasks FOR INSERT TO authenticated WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "tt_upd" ON todo_tasks FOR UPDATE TO authenticated USING (created_by = (select auth.uid()) OR assigned_to = (select auth.uid())) WITH CHECK (true);
CREATE POLICY "tt_del" ON todo_tasks FOR DELETE TO authenticated USING (created_by = (select auth.uid()));

-- FRESH policies for todo_task_steps
CREATE POLICY "tts_sel" ON todo_task_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "tts_ins" ON todo_task_steps FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tts_upd" ON todo_task_steps FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "tts_del" ON todo_task_steps FOR DELETE TO authenticated USING (true);