-- Fix the handle_new_user trigger to only use existing columns
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
  -- Self-registered users get 'limited' access, admin-created users get 'full'
  IF NEW.raw_user_meta_data->>'created_by_admin' = 'true' THEN
    v_access_level := 'full';
    v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'mitglied');
  ELSE
    v_access_level := 'limited';
    v_role := 'mitglied';
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