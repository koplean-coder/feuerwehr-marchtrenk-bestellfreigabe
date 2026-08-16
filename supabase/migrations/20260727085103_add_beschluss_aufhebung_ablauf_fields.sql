-- Neue Felder für Beschluss-Aufhebung, Ersetzung und Ablaufdatum
ALTER TABLE public.beschluss_register
ADD COLUMN IF NOT EXISTS gueltig_bis DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS aufgehoben_durch_id UUID REFERENCES public.beschluss_register(id) ON DELETE SET NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hebt_auf_id UUID REFERENCES public.beschluss_register(id) ON DELETE SET NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS aufgehoben_am TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS aufhebung_notiz TEXT DEFAULT NULL;

-- Index für Performance bei Verknüpfungsabfragen
CREATE INDEX IF NOT EXISTS idx_beschluss_register_aufgehoben_durch ON public.beschluss_register(aufgehoben_durch_id);
CREATE INDEX IF NOT EXISTS idx_beschluss_register_hebt_auf ON public.beschluss_register(hebt_auf_id);
CREATE INDEX IF NOT EXISTS idx_beschluss_register_gueltig_bis ON public.beschluss_register(gueltig_bis);

-- Status-Check aktualisieren um neue Status zu erlauben
ALTER TABLE public.beschluss_register DROP CONSTRAINT IF EXISTS beschluss_register_status_check;
ALTER TABLE public.beschluss_register ADD CONSTRAINT beschluss_register_status_check 
  CHECK (status IN ('offen', 'in_abstimmung', 'genehmigt', 'abgelehnt', 'ausstehend', 'aufgehoben', 'abgelaufen'));

-- Neue Historie-Aktionen erlauben
ALTER TABLE public.beschluss_historie DROP CONSTRAINT IF EXISTS beschluss_historie_aktion_check;
ALTER TABLE public.beschluss_historie ADD CONSTRAINT beschluss_historie_aktion_check 
  CHECK (aktion IN ('erstellt', 'eingereicht', 'abstimmung_gestartet', 'abgestimmt', 'genehmigt', 'abgelehnt', 'bestaetigt', 'pdf_erstellt', 'email_gesendet', 'aufgehoben', 'abgelaufen', 'erinnerung_gesendet'));