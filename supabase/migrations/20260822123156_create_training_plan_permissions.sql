-- Training plan permissions: role-based + user-based with 4 levels
-- Levels: none, read, edit, admin

-- Role-based permissions (based on user functions like 'Kommandant', 'Gruppenführer')
CREATE TABLE public.training_plan_role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name TEXT NOT NULL UNIQUE,
  permission_level TEXT NOT NULL DEFAULT 'none' CHECK (permission_level IN ('none', 'read', 'edit', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User-specific permissions (override role-based)
CREATE TABLE public.training_plan_user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  permission_level TEXT NOT NULL DEFAULT 'none' CHECK (permission_level IN ('none', 'read', 'edit', 'admin')),
  granted_by UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_plan_user_permissions_user ON public.training_plan_user_permissions(user_id);

-- SECURITY DEFINER helper to check if user is training plan admin
CREATE OR REPLACE FUNCTION public.is_training_plan_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.training_plan_user_permissions 
    WHERE user_id = _user_id AND permission_level = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_training_plan_admin(uuid) TO authenticated;

-- RLS for role permissions (only admins can modify)
ALTER TABLE public.training_plan_role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read role permissions"
  ON public.training_plan_role_permissions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert role permissions"
  ON public.training_plan_role_permissions FOR INSERT TO authenticated
  WITH CHECK (public.is_training_plan_admin((SELECT auth.uid())));

CREATE POLICY "Admins can update role permissions"
  ON public.training_plan_role_permissions FOR UPDATE TO authenticated
  USING (public.is_training_plan_admin((SELECT auth.uid())))
  WITH CHECK (public.is_training_plan_admin((SELECT auth.uid())));

CREATE POLICY "Admins can delete role permissions"
  ON public.training_plan_role_permissions FOR DELETE TO authenticated
  USING (public.is_training_plan_admin((SELECT auth.uid())));

-- RLS for user permissions
ALTER TABLE public.training_plan_user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read user permissions"
  ON public.training_plan_user_permissions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert user permissions"
  ON public.training_plan_user_permissions FOR INSERT TO authenticated
  WITH CHECK (public.is_training_plan_admin((SELECT auth.uid())));

CREATE POLICY "Admins can update user permissions"
  ON public.training_plan_user_permissions FOR UPDATE TO authenticated
  USING (public.is_training_plan_admin((SELECT auth.uid())))
  WITH CHECK (public.is_training_plan_admin((SELECT auth.uid())));

CREATE POLICY "Admins can delete user permissions"
  ON public.training_plan_user_permissions FOR DELETE TO authenticated
  USING (public.is_training_plan_admin((SELECT auth.uid())));

-- Insert default role permissions
INSERT INTO public.training_plan_role_permissions (role_name, permission_level) VALUES
  ('Kommandant', 'admin'),
  ('Kommandant-Stellvertreter', 'admin'),
  ('Zugskommandant', 'edit'),
  ('Gruppenführer', 'edit'),
  ('Ausbildungsbeauftragter', 'admin'),
  ('Atemschutzwart', 'edit'),
  ('Mitglied', 'read')
ON CONFLICT (role_name) DO NOTHING;