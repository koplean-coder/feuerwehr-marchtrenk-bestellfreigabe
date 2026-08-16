-- Add access_level column to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS access_level TEXT NOT NULL DEFAULT 'full' 
CHECK (access_level IN ('full', 'limited'));

-- Update existing users to have full access
UPDATE public.profiles SET access_level = 'full' WHERE access_level IS NULL;

-- Update the handle_new_user trigger to set access_level based on how user registered
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

  INSERT INTO public.profiles (id, email, full_name, role, access_level)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_role,
    v_access_level
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  
  RETURN NEW;
END;
$$;

-- Index for faster access_level queries
CREATE INDEX IF NOT EXISTS idx_profiles_access_level ON public.profiles(access_level);