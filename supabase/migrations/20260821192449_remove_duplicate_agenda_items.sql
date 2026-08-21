-- Entferne Duplikate aus meeting_agenda_items (behalte jeweils den ersten Eintrag)
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY meeting_id, title ORDER BY created_at ASC) as rn
  FROM public.meeting_agenda_items
)
DELETE FROM public.meeting_agenda_items
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Korrigiere sort_order für alle Sitzungen
WITH numbered AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY meeting_id ORDER BY sort_order, created_at) as new_sort
  FROM public.meeting_agenda_items
)
UPDATE public.meeting_agenda_items
SET sort_order = numbered.new_sort
FROM numbered
WHERE meeting_agenda_items.id = numbered.id;