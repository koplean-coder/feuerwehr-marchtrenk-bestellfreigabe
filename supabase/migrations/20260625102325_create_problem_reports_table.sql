-- Problem Reports Tabelle für Fehler/Problem-Meldungen
CREATE TABLE public.problem_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  screenshot_url TEXT,
  page_url TEXT,
  browser_info TEXT,
  console_logs TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'wont_fix')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index für schnelle Abfragen
CREATE INDEX idx_problem_reports_status ON public.problem_reports(status);
CREATE INDEX idx_problem_reports_created_by ON public.problem_reports(created_by);
CREATE INDEX idx_problem_reports_created_at ON public.problem_reports(created_at DESC);

-- RLS aktivieren
ALTER TABLE public.problem_reports ENABLE ROW LEVEL SECURITY;

-- Jeder eingeloggte Benutzer kann Problem-Reports erstellen
CREATE POLICY "Users can create problem reports"
  ON public.problem_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Benutzer können ihre eigenen Reports sehen
CREATE POLICY "Users can view own problem reports"
  ON public.problem_reports
  FOR SELECT
  TO authenticated
  USING (created_by = (select auth.uid()));

-- Admins und Kommandanten können alle Reports sehen
CREATE POLICY "Admins can view all problem reports"
  ON public.problem_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'kommandant')
    )
  );

-- Admins und Kommandanten können Reports bearbeiten
CREATE POLICY "Admins can update problem reports"
  ON public.problem_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'kommandant')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'kommandant')
    )
  );

-- Trigger für updated_at
CREATE TRIGGER update_problem_reports_updated_at
  BEFORE UPDATE ON public.problem_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();