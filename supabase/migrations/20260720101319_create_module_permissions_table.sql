-- Create module_permissions table for role-based module access
CREATE TABLE public.module_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role public.user_role NOT NULL,
  module_key TEXT NOT NULL,
  module_label TEXT NOT NULL,
  has_access BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role, module_key)
);

-- Enable RLS
ALTER TABLE public.module_permissions ENABLE ROW LEVEL SECURITY;

-- Everyone can read module permissions (needed for access checks)
CREATE POLICY "Everyone can view module_permissions" ON public.module_permissions
  FOR SELECT TO authenticated
  USING (true);

-- Only admins and kommandant can update module permissions
CREATE POLICY "Admins and Kommandant can update module_permissions" ON public.module_permissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('admin', 'kommandant')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('admin', 'kommandant')
    )
  );

-- Index for faster lookups
CREATE INDEX idx_module_permissions_role ON public.module_permissions(role);
CREATE INDEX idx_module_permissions_module_key ON public.module_permissions(module_key);

-- Insert default module permissions for 'nutzer' role
-- Navigation modules + Formulare sub-modules
INSERT INTO public.module_permissions (role, module_key, module_label, has_access) VALUES
  -- Navigation modules
  ('nutzer', 'bestellungen', 'Bestellungen', false),
  ('nutzer', 'lieferanten', 'Lieferanten', false),
  ('nutzer', 'formulare', 'Formulare', true),
  ('nutzer', 'freigaben', 'Übersicht Freigaben', false),
  ('nutzer', 'aufgaben', 'Aufgaben', false),
  ('nutzer', 'beschluesse', 'Beschlüsse', false),
  ('nutzer', 'benutzer', 'Benutzer', false),
  ('nutzer', 'einstellungen', 'Einstellungen', false),
  ('nutzer', 'ideen_pool', 'Ideen-Pool', false),
  -- Formulare sub-modules
  ('nutzer', 'auszahlungsanweisungen', 'Auszahlungsanweisungen', false),
  ('nutzer', 'teilnahme_veranstaltung', 'Teilnahme Veranstaltung', true),
  ('nutzer', 'formulargenerator', 'Formulargenerator', true),
  ('nutzer', 'leihvertraege', 'Leihverträge', false),
  ('nutzer', 'kommandoabstimmung', 'Kommandoabstimmung', false),
  ('nutzer', 'ausgabenabrechnung', 'Ausgaben-Abrechnung', true);

-- Update the handle_new_user trigger to assign 'nutzer' role to self-registered users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_access_level TEXT;
  v_role public.user_role;
BEGIN
  -- Check if this is a self-registration (no admin context)
  -- Self-registered users get 'limited' access and 'nutzer' role
  -- Admin-created users get 'full' access and specified role
  IF NEW.raw_user_meta_data->>'created_by_admin' = 'true' THEN
    v_access_level := 'full';
    v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'mitglied');
  ELSE
    v_access_level := 'limited';
    v_role := 'nutzer';
  END IF;

  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    access_level,
    is_active
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_role,
    v_access_level,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  
  RETURN NEW;
END;
$$;