-- Trigger aktualisieren: ALLE neuen User bekommen 'full' access
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  -- Rolle bestimmen
  IF NEW.raw_user_meta_data->>'created_by_admin' = 'true' THEN
    v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'mitglied');
  ELSE
    v_role := 'nutzer';
  END IF;

  -- Profil erstellen - ALLE User bekommen 'full' access
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
    'full',  -- IMMER full access!
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  
  RETURN NEW;
END;
$$;