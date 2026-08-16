
-- Enum für Benutzerrollen
CREATE TYPE public.user_role AS ENUM ('mitglied', 'admin', 'bereichsleiter', 'kommandant');

-- Enum für Bestellstatus
CREATE TYPE public.order_status AS ENUM (
  'eingereicht', 
  'ausstehend_bereichsleitung', 
  'ausstehend_kommandant', 
  'freigegeben_bereichsleitung',
  'genehmigt', 
  'abgelehnt'
);

-- Profiles Tabelle (Benutzerverwaltung)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role public.user_role NOT NULL DEFAULT 'mitglied',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Settings Tabelle (Einstellungen)
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Default Einstellung für Freigabebetrag KDT
INSERT INTO public.settings (key, value) VALUES ('freigabebetrag_kdt', '1000');

-- Lieferanten Tabelle
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  link TEXT,
  username TEXT,
  password TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bestellungen Tabelle
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  status public.order_status NOT NULL DEFAULT 'eingereicht',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bereichsleiter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  kommandant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  bereichsleiter_approved_at TIMESTAMPTZ,
  kommandant_approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  requires_kommandant_approval BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Freigabe-History Tabelle
CREATE TABLE public.order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_status public.order_status,
  new_status public.order_status NOT NULL,
  performed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Benachrichtigungen Tabelle
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_by ON public.orders(created_by);
CREATE INDEX idx_orders_bereichsleiter ON public.orders(bereichsleiter_id);
CREATE INDEX idx_orders_kommandant ON public.orders(kommandant_id);
CREATE INDEX idx_order_history_order_id ON public.order_history(order_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- RLS aktivieren
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Profiles sind für authentifizierte Benutzer lesbar"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Benutzer können ihr eigenes Profil aktualisieren"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- Settings Policies
CREATE POLICY "Settings lesbar für alle authentifizierten Benutzer"
  ON public.settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Settings änderbar nur für Admin und Kommandant"
  ON public.settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'kommandant')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'kommandant')
    )
  );

CREATE POLICY "Settings einfügbar nur für Admin und Kommandant"
  ON public.settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'kommandant')
    )
  );

-- Suppliers Policies
CREATE POLICY "Lieferanten lesbar für alle authentifizierten Benutzer"
  ON public.suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Lieferanten erstellbar für Admin, Bereichsleiter, Kommandant"
  ON public.suppliers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'bereichsleiter', 'kommandant')
    )
  );

CREATE POLICY "Lieferanten änderbar für Admin, Bereichsleiter, Kommandant"
  ON public.suppliers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'bereichsleiter', 'kommandant')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'bereichsleiter', 'kommandant')
    )
  );

CREATE POLICY "Lieferanten löschbar für Admin, Bereichsleiter, Kommandant"
  ON public.suppliers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'bereichsleiter', 'kommandant')
    )
  );

-- Orders Policies
CREATE POLICY "Bestellungen lesbar für authentifizierte Benutzer"
  ON public.orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Bestellungen erstellbar für authentifizierte Benutzer"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Bestellungen änderbar für berechtigte Benutzer"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) = created_by OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'bereichsleiter', 'kommandant')
    )
  )
  WITH CHECK (
    (select auth.uid()) = created_by OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'bereichsleiter', 'kommandant')
    )
  );

-- Order History Policies
CREATE POLICY "History lesbar für authentifizierte Benutzer"
  ON public.order_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "History erstellbar für authentifizierte Benutzer"
  ON public.order_history FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = performed_by);

-- Notifications Policies
CREATE POLICY "Benachrichtigungen lesbar für eigenen Benutzer"
  ON public.notifications FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Benachrichtigungen erstellbar für authentifizierte Benutzer"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Benachrichtigungen änderbar für eigenen Benutzer"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Trigger für automatische Profilerstellung
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'mitglied'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
