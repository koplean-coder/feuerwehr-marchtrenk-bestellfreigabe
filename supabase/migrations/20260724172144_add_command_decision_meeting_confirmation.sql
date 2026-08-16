-- Felder für Meeting-Bestätigung zu command_decision_items hinzufügen
ALTER TABLE public.command_decision_items 
ADD COLUMN IF NOT EXISTS meeting_confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS meeting_confirmed_in UUID REFERENCES public.meetings(id) DEFAULT NULL;

-- Referenz von meeting_decisions zu command_decision_items hinzufügen
ALTER TABLE public.meeting_decisions
ADD COLUMN IF NOT EXISTS command_decision_item_id UUID REFERENCES public.command_decision_items(id) DEFAULT NULL;

-- Index für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_command_decision_items_meeting_confirmed 
  ON public.command_decision_items(meeting_confirmed_at) 
  WHERE meeting_confirmed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meeting_decisions_command_item 
  ON public.meeting_decisions(command_decision_item_id) 
  WHERE command_decision_item_id IS NOT NULL;

-- Kommentare für Dokumentation
COMMENT ON COLUMN public.command_decision_items.meeting_confirmed_at IS 'Zeitpunkt der Bestätigung in einer Sitzung';
COMMENT ON COLUMN public.command_decision_items.meeting_confirmed_in IS 'ID der Sitzung in der der Beschluss bestätigt wurde';
COMMENT ON COLUMN public.meeting_decisions.command_decision_item_id IS 'Referenz zum Kommandobeschluss-Item das bestätigt wurde';