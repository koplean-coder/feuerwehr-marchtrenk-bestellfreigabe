-- =====================================================
-- KOMMANDOABSTIMMUNG VOLLSTÄNDIGE IMPLEMENTIERUNG
-- =====================================================

-- 1. Neue Spalten für orders Tabelle
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS voting_status TEXT DEFAULT NULL CHECK (voting_status IN ('open', 'closed')),
ADD COLUMN IF NOT EXISTS voting_opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS voting_closed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS voting_closed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS voting_result TEXT CHECK (voting_result IN ('approved', 'rejected', 'overridden')),
ADD COLUMN IF NOT EXISTS voting_last_reminder_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS voting_reminder_count INTEGER DEFAULT 0;

-- Index für voting_status Abfragen
CREATE INDEX IF NOT EXISTS idx_orders_voting_status ON public.orders(voting_status) WHERE voting_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_voting_opened_at ON public.orders(voting_opened_at) WHERE voting_opened_at IS NOT NULL;

-- 2. Erweitere order_votes.vote um 'abstain' (Enthaltung)
-- Erst den alten Constraint entfernen, dann neuen erstellen
ALTER TABLE public.order_votes DROP CONSTRAINT IF EXISTS order_votes_vote_check;
ALTER TABLE public.order_votes ADD CONSTRAINT order_votes_vote_check CHECK (vote IN ('approve', 'reject', 'abstain'));

-- 3. Neue Tabelle für Audit-Trail (Stimmänderungen)
CREATE TABLE IF NOT EXISTS public.order_vote_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_vote TEXT CHECK (old_vote IN ('approve', 'reject', 'abstain')),
  new_vote TEXT NOT NULL CHECK (new_vote IN ('approve', 'reject', 'abstain')),
  old_reason TEXT,
  new_reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes für order_vote_history
CREATE INDEX IF NOT EXISTS idx_order_vote_history_order_id ON public.order_vote_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_vote_history_user_id ON public.order_vote_history(user_id);
CREATE INDEX IF NOT EXISTS idx_order_vote_history_changed_at ON public.order_vote_history(changed_at);

-- RLS für order_vote_history
ALTER TABLE public.order_vote_history ENABLE ROW LEVEL SECURITY;

-- SELECT: Kommandomitglieder + KDT + Admin können Historie sehen
CREATE POLICY "order_vote_history_select" ON public.order_vote_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
      AND (
        role IN ('kommandant', 'admin')
        OR functions @> ARRAY['kommandomitglied']::text[]
      )
    )
  );

-- INSERT: System kann Einträge erstellen (via Trigger)
CREATE POLICY "order_vote_history_insert" ON public.order_vote_history
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 4. Trigger für automatische Historie bei Stimmänderung
CREATE OR REPLACE FUNCTION public.track_vote_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Nur loggen wenn sich die Stimme tatsächlich geändert hat
  IF OLD.vote IS DISTINCT FROM NEW.vote OR OLD.reason IS DISTINCT FROM NEW.reason THEN
    INSERT INTO public.order_vote_history (
      order_id, user_id, old_vote, new_vote, old_reason, new_reason
    ) VALUES (
      NEW.order_id, NEW.user_id, OLD.vote, NEW.vote, OLD.reason, NEW.reason
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_vote_changes_trigger ON public.order_votes;
CREATE TRIGGER track_vote_changes_trigger
  AFTER UPDATE ON public.order_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.track_vote_changes();

-- 5. Settings für Erinnerungen
INSERT INTO public.settings (key, value) VALUES 
  ('voting_reminders_enabled', 'true'),
  ('voting_reminder_interval_hours', '24'),
  ('voting_reminder_max_count', '5'),
  ('voting_reminder_time', '06:00')
ON CONFLICT (key) DO NOTHING;

-- 6. Tabelle für nicht abgegebene Stimmen bei Abschluss
CREATE TABLE IF NOT EXISTS public.order_votes_missing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_votes_missing_order_id ON public.order_votes_missing(order_id);

-- RLS für order_votes_missing
ALTER TABLE public.order_votes_missing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_votes_missing_select" ON public.order_votes_missing
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
      AND (
        role IN ('kommandant', 'admin')
        OR functions @> ARRAY['kommandomitglied']::text[]
      )
    )
  );

CREATE POLICY "order_votes_missing_insert" ON public.order_votes_missing
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('kommandant', 'admin')
    )
  );

-- 7. Kommentar zur Dokumentation
COMMENT ON COLUMN public.orders.voting_status IS 'open = Abstimmung läuft, closed = Abstimmung abgeschlossen';
COMMENT ON COLUMN public.orders.voting_result IS 'approved = Mehrheit Ja, rejected = Mehrheit Nein, overridden = KDT hat überstimmt';
COMMENT ON TABLE public.order_vote_history IS 'Audit-Trail für alle Stimmänderungen bei Kommandoabstimmungen';
COMMENT ON TABLE public.order_votes_missing IS 'Aufzeichnung der Kommandomitglieder die nicht abgestimmt haben';