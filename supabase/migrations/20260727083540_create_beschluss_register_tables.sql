-- Zentrale Beschluss-Register Tabelle
CREATE TABLE public.beschluss_register (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beschluss_nummer TEXT NOT NULL UNIQUE,
  jahr INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  typ TEXT NOT NULL CHECK (typ IN ('umlauf', 'sitzung', 'banf')),
  titel TEXT NOT NULL,
  beschreibung TEXT,
  betrag DECIMAL(12,2),
  status TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'in_abstimmung', 'genehmigt', 'abgelehnt', 'ausstehend')),
  
  -- Abstimmungsergebnis
  abstimmung_ja INTEGER DEFAULT 0,
  abstimmung_nein INTEGER DEFAULT 0,
  abstimmung_enthaltung INTEGER DEFAULT 0,
  
  -- Referenzen zu anderen Tabellen
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  meeting_decision_id UUID REFERENCES public.meeting_decisions(id) ON DELETE SET NULL,
  command_decision_id UUID REFERENCES public.command_decisions(id) ON DELETE SET NULL,
  command_decision_item_id UUID REFERENCES public.command_decision_items(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  
  -- Ersteller / Genehmiger
  erstellt_von UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  erstellt_am TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  genehmigt_von UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  genehmigt_am TIMESTAMPTZ,
  bestaetigt_in_sitzung_am TIMESTAMPTZ,
  
  -- PDF
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,
  
  -- Metadaten
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Beschluss-Historie für Audit-Trail
CREATE TABLE public.beschluss_historie (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beschluss_id UUID NOT NULL REFERENCES public.beschluss_register(id) ON DELETE CASCADE,
  aktion TEXT NOT NULL CHECK (aktion IN ('erstellt', 'eingereicht', 'abstimmung_gestartet', 'abgestimmt', 'genehmigt', 'abgelehnt', 'bestaetigt', 'pdf_erstellt', 'email_gesendet')),
  von_status TEXT,
  nach_status TEXT,
  durchgefuehrt_von UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  durchgefuehrt_am TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notizen TEXT,
  zusatz_daten JSONB
);

-- Indizes für Performance
CREATE INDEX idx_beschluss_register_jahr ON public.beschluss_register(jahr);
CREATE INDEX idx_beschluss_register_status ON public.beschluss_register(status);
CREATE INDEX idx_beschluss_register_typ ON public.beschluss_register(typ);
CREATE INDEX idx_beschluss_register_erstellt_von ON public.beschluss_register(erstellt_von);
CREATE INDEX idx_beschluss_register_meeting_id ON public.beschluss_register(meeting_id);
CREATE INDEX idx_beschluss_register_order_id ON public.beschluss_register(order_id);
CREATE INDEX idx_beschluss_historie_beschluss_id ON public.beschluss_historie(beschluss_id);

-- RLS aktivieren
ALTER TABLE public.beschluss_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beschluss_historie ENABLE ROW LEVEL SECURITY;

-- RLS Policies für beschluss_register
-- Alle authentifizierten User können lesen (Beschlüsse sind organisationsweit sichtbar)
CREATE POLICY "Authentifizierte können Beschlüsse lesen"
  ON public.beschluss_register
  FOR SELECT
  TO authenticated
  USING (true);

-- Admin, Kommandant, Schriftführer können erstellen/bearbeiten
CREATE POLICY "Berechtigte können Beschlüsse erstellen"
  ON public.beschluss_register
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
      AND (
        role IN ('admin', 'kommandant')
        OR functions @> ARRAY['schriftfuehrer']::text[]
        OR functions @> ARRAY['kommandomitglied']::text[]
      )
    )
  );

CREATE POLICY "Berechtigte können Beschlüsse aktualisieren"
  ON public.beschluss_register
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
      AND (
        role IN ('admin', 'kommandant')
        OR functions @> ARRAY['schriftfuehrer']::text[]
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
      AND (
        role IN ('admin', 'kommandant')
        OR functions @> ARRAY['schriftfuehrer']::text[]
      )
    )
  );

-- RLS Policies für beschluss_historie
CREATE POLICY "Authentifizierte können Historie lesen"
  ON public.beschluss_historie
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Berechtigte können Historie erstellen"
  ON public.beschluss_historie
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
      AND (
        role IN ('admin', 'kommandant')
        OR functions @> ARRAY['schriftfuehrer']::text[]
        OR functions @> ARRAY['kommandomitglied']::text[]
      )
    )
  );

-- Trigger für updated_at
CREATE TRIGGER update_beschluss_register_updated_at
  BEFORE UPDATE ON public.beschluss_register
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();