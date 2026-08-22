-- Add instructor flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_instructor BOOLEAN DEFAULT false;

-- Training categories (global, admin editable)
CREATE TABLE public.training_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_categories_sort ON public.training_categories(sort_order);

-- Training scenario templates (global)
CREATE TABLE public.training_scenario_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_ids UUID[] DEFAULT '{}',
  default_instructor TEXT,
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_scenario_templates_name ON public.training_scenario_templates(name);

-- Training recurrence rules (global)
CREATE TABLE public.training_recurrence_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  scenario_template_id UUID REFERENCES public.training_scenario_templates(id) ON DELETE SET NULL,
  interval_weeks INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_recurrence_rules_name ON public.training_recurrence_rules(name);

-- Saved training plans
CREATE TABLE public.training_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  period TEXT NOT NULL DEFAULT 'full',
  sessions JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_plans_year ON public.training_plans(year);
CREATE INDEX idx_training_plans_created_by ON public.training_plans(created_by);

-- RLS Policies for training_categories (read: all authenticated, write: admin only via functions check)
ALTER TABLE public.training_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read categories"
  ON public.training_categories FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert categories"
  ON public.training_categories FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "Admins can update categories"
  ON public.training_categories FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "Admins can delete categories"
  ON public.training_categories FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- RLS Policies for training_scenario_templates (global read, authenticated write)
ALTER TABLE public.training_scenario_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read scenario templates"
  ON public.training_scenario_templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert scenario templates"
  ON public.training_scenario_templates FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY "Creator can update scenario templates"
  ON public.training_scenario_templates FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = created_by)
  WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY "Creator can delete scenario templates"
  ON public.training_scenario_templates FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = created_by);

-- RLS Policies for training_recurrence_rules
ALTER TABLE public.training_recurrence_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read recurrence rules"
  ON public.training_recurrence_rules FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert recurrence rules"
  ON public.training_recurrence_rules FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY "Creator can update recurrence rules"
  ON public.training_recurrence_rules FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = created_by)
  WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY "Creator can delete recurrence rules"
  ON public.training_recurrence_rules FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = created_by);

-- RLS Policies for training_plans (global read, owner write)
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all plans"
  ON public.training_plans FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert own plans"
  ON public.training_plans FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY "Creator can update own plans"
  ON public.training_plans FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = created_by)
  WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY "Creator can delete own plans"
  ON public.training_plans FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = created_by);

-- Insert default categories
INSERT INTO public.training_categories (name, color, sort_order) VALUES
  ('Branddienst', '#EF4444', 1),
  ('Technischer Dienst', '#3B82F6', 2),
  ('Sanitätsdienst', '#22C55E', 3),
  ('Gefährliche Stoffe', '#F97316', 4),
  ('Ausbildung Allgemein', '#8B5CF6', 5),
  ('Führung', '#EC4899', 6),
  ('Funk', '#06B6D4', 7),
  ('Fahrzeugkunde', '#6366F1', 8);