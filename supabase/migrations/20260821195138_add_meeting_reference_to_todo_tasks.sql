-- Erweitere todo_tasks um Sitzungs-Referenzen
ALTER TABLE public.todo_tasks
ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS agenda_item_id UUID REFERENCES public.meeting_agenda_items(id) ON DELETE SET NULL;

-- Index für schnelle Abfragen nach Sitzung
CREATE INDEX IF NOT EXISTS idx_todo_tasks_meeting_id ON public.todo_tasks(meeting_id) WHERE meeting_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_todo_tasks_agenda_item_id ON public.todo_tasks(agenda_item_id) WHERE agenda_item_id IS NOT NULL;