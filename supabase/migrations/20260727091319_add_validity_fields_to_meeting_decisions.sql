-- Felder für Gültigkeit und Aufhebung zu meeting_decisions hinzufügen
-- Damit können diese Informationen bereits beim Erstellen eines Sitzungsbeschlusses erfasst werden

ALTER TABLE public.meeting_decisions
ADD COLUMN IF NOT EXISTS gueltig_bis DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hebt_auf_id UUID REFERENCES public.beschluss_register(id) ON DELETE SET NULL DEFAULT NULL;

-- Index für bessere Performance bei Abfragen
CREATE INDEX IF NOT EXISTS idx_meeting_decisions_hebt_auf_id ON public.meeting_decisions(hebt_auf_id);

COMMENT ON COLUMN public.meeting_decisions.gueltig_bis IS 'Ablaufdatum des Beschlusses (NULL = unbegrenzt gültig)';
COMMENT ON COLUMN public.meeting_decisions.hebt_auf_id IS 'Referenz zum Beschluss im Register, der durch diesen Beschluss aufgehoben wird';