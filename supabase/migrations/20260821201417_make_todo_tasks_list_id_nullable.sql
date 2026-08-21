-- Mache list_id nullable für Sitzungs-Aufgaben (die keiner Liste zugeordnet sind)
ALTER TABLE public.todo_tasks
ALTER COLUMN list_id DROP NOT NULL;