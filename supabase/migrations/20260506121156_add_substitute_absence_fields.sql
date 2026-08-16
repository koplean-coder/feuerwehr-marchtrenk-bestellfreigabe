-- Add substitute/absence fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS substitute_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_absent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS absent_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS absence_reason TEXT;

-- Add index for substitute lookups
CREATE INDEX IF NOT EXISTS idx_profiles_substitute_id ON public.profiles(substitute_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_absent ON public.profiles(is_absent) WHERE is_absent = true;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.substitute_id IS 'ID of the substitute user who handles approvals during absence';
COMMENT ON COLUMN public.profiles.is_absent IS 'Whether the user is currently marked as absent';
COMMENT ON COLUMN public.profiles.absent_until IS 'Date/time when the absence period ends';
COMMENT ON COLUMN public.profiles.absence_reason IS 'Reason for absence (optional)';