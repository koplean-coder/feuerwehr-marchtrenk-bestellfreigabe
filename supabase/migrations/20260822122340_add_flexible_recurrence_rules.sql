-- Add flexible interval columns to recurrence rules
ALTER TABLE public.training_recurrence_rules 
  ADD COLUMN IF NOT EXISTS interval_type TEXT DEFAULT 'monthly' CHECK (interval_type IN ('weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'semiannually', 'yearly')),
  ADD COLUMN IF NOT EXISTS week_of_period INTEGER DEFAULT 1 CHECK (week_of_period >= 1 AND week_of_period <= 5),
  ADD COLUMN IF NOT EXISTS day_of_week INTEGER DEFAULT 3 CHECK (day_of_week >= 0 AND day_of_week <= 6);