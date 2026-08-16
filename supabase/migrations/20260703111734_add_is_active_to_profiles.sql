-- Add is_active field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- Comment for documentation
COMMENT ON COLUMN public.profiles.is_active IS 'When false, user cannot login and is blocked from the system';