-- Add access_level column to profiles
-- 'full' = full access (existing users, admins, etc.)
-- 'limited' = only public modules (self-registered members)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS access_level TEXT NOT NULL DEFAULT 'full' 
CHECK (access_level IN ('full', 'limited'));

-- Update existing users to have full access
UPDATE public.profiles SET access_level = 'full' WHERE access_level IS NULL;

-- Add allowed_domain setting for self-registration
-- This will be checked during registration
CREATE TABLE IF NOT EXISTS public.registration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allowed_domain TEXT NOT NULL DEFAULT 'feuerwehr-marchtrenk.at',
  require_email_confirmation BOOLEAN NOT NULL DEFAULT true,
  auto_approve_registration BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default settings if not exists
INSERT INTO public.registration_settings (allowed_domain, require_email_confirmation, auto_approve_registration)
SELECT 'feuerwehr-marchtrenk.at', true, true
WHERE NOT EXISTS (SELECT 1 FROM public.registration_settings);

-- Enable RLS on registration_settings
ALTER TABLE public.registration_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can modify registration settings
CREATE POLICY "Anyone can read registration settings" ON public.registration_settings
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Only admins can update registration settings" ON public.registration_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- Update the handle_new_user trigger to set access_level based on how user registered
-- If created by admin -> full, if self-registered -> limited
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_access_level TEXT;
  v_role TEXT;
BEGIN
  -- Check if this is a self-registration (no admin context)
  -- Self-registered users get 'limited' access, admin-created users get 'full'
  IF NEW.raw_user_meta_data->>'created_by_admin' = 'true' THEN
    v_access_level := 'full';
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'mitglied');
  ELSE
    v_access_level := 'limited';
    v_role := 'mitglied';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, access_level, approved, is_active)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_role,
    v_access_level,
    true,  -- Auto-approve after email confirmation
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  
  RETURN NEW;
END;
$$;

-- Index for faster access_level queries
CREATE INDEX IF NOT EXISTS idx_profiles_access_level ON public.profiles(access_level);