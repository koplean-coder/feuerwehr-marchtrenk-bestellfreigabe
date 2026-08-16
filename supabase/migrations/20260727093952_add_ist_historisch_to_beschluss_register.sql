-- Feld für historische/nachgetragene Beschlüsse
ALTER TABLE public.beschluss_register
ADD COLUMN IF NOT EXISTS ist_historisch BOOLEAN DEFAULT false;

-- Index für bessere Filterung
CREATE INDEX IF NOT EXISTS idx_beschluss_register_ist_historisch ON public.beschluss_register(ist_historisch);

COMMENT ON COLUMN public.beschluss_register.ist_historisch IS 'True wenn der Beschluss manuell nachgetragen wurde (historischer Beschluss vor Systemeinführung)';