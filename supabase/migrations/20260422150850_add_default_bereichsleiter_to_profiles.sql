-- Add default_bereichsleiter_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_bereichsleiter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_profiles_default_bereichsleiter ON public.profiles(default_bereichsleiter_id);