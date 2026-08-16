-- Task steps/subtasks table
CREATE TABLE public.task_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_task_steps_task_id ON public.task_steps(task_id);
CREATE INDEX idx_task_steps_sort_order ON public.task_steps(task_id, sort_order);

-- Enable RLS
ALTER TABLE public.task_steps ENABLE ROW LEVEL SECURITY;

-- Users who can see the task can see its steps
CREATE POLICY "Schritte sichtbar für Aufgaben-Berechtigte" ON public.task_steps
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
      AND (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = (SELECT auth.uid())
          AND role IN ('admin', 'kommandant')
        )
        OR t.assigned_to = (SELECT auth.uid())
        OR t.created_by = (SELECT auth.uid())
      )
    )
  );

-- Admin and Kommandant can create steps
CREATE POLICY "Admin/Kommandant können Schritte erstellen" ON public.task_steps
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'kommandant')
    )
  );

-- Admin/Kommandant can update any step, assigned users can update steps of their tasks
CREATE POLICY "Berechtigte können Schritte aktualisieren" ON public.task_steps
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
      AND (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = (SELECT auth.uid())
          AND role IN ('admin', 'kommandant')
        )
        OR t.assigned_to = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
      AND (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = (SELECT auth.uid())
          AND role IN ('admin', 'kommandant')
        )
        OR t.assigned_to = (SELECT auth.uid())
      )
    )
  );

-- Only Admin and Kommandant can delete steps
CREATE POLICY "Nur Admin/Kommandant können Schritte löschen" ON public.task_steps
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'kommandant')
    )
  );