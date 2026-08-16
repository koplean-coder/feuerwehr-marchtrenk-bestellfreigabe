-- Prüfe ob es noch Bestellungen mit nicht-existierenden created_by gibt
-- Diese Query zeigt alle orders wo der created_by User nicht in profiles existiert
SELECT 
  o.id,
  o.title,
  o.created_by,
  o.status,
  o.created_at
FROM public.orders o
LEFT JOIN public.profiles p ON o.created_by = p.id
WHERE p.id IS NULL;