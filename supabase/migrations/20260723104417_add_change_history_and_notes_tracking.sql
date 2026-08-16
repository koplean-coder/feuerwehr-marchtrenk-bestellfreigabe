-- Add change history JSONB field for full audit trail
ALTER TABLE public.todo_tasks 
ADD COLUMN IF NOT EXISTS change_history JSONB DEFAULT '[]'::jsonb;

-- Add notes tracking fields
ALTER TABLE public.todo_tasks 
ADD COLUMN IF NOT EXISTS notes_updated_by UUID REFERENCES auth.users,
ADD COLUMN IF NOT EXISTS notes_updated_at TIMESTAMP WITH TIME ZONE;

-- Comment explaining the structure
COMMENT ON COLUMN public.todo_tasks.change_history IS 'Array of {field, old_value, new_value, changed_by, changed_at, changer_name}';