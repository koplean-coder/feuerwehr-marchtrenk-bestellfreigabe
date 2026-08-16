-- =====================================================
-- LEIHGERÄTE MODULE - Complete Schema
-- =====================================================

-- 1. Rental Items (Leihgeräte/Artikel)
CREATE TABLE public.rental_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_short DECIMAL(10,2) NOT NULL DEFAULT 0,  -- Preis bis 3 Tage
  price_week DECIMAL(10,2) NOT NULL DEFAULT 0,   -- Preis 4-7 Tage
  price_day DECIMAL(10,2) NOT NULL DEFAULT 0,    -- Preis je Zusatztag
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Rental Contracts (Leihverträge)
CREATE TABLE public.rental_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_number TEXT NOT NULL UNIQUE,
  
  -- Kundendaten
  customer_name TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  
  -- Zeitraum
  rental_start DATE NOT NULL,
  rental_end DATE NOT NULL,
  
  -- Vertragsdaten
  items JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of {item_id, name, quantity, price_type, unit_price, total_price}
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Optionen
  includes_delivery BOOLEAN NOT NULL DEFAULT false,
  is_sponsor BOOLEAN NOT NULL DEFAULT false,  -- Sponsor = keine Kosten
  
  -- Zustand
  condition_pickup TEXT,   -- Zustand bei Abholung
  condition_return TEXT,   -- Zustand bei Rückgabe
  damage_notes TEXT,       -- Schäden/Mängel
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'cancelled')),
  returned_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadaten
  pdf_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX idx_rental_items_active ON public.rental_items(is_active);
CREATE INDEX idx_rental_items_sort ON public.rental_items(sort_order);
CREATE INDEX idx_rental_contracts_status ON public.rental_contracts(status);
CREATE INDEX idx_rental_contracts_dates ON public.rental_contracts(rental_start, rental_end);
CREATE INDEX idx_rental_contracts_created_by ON public.rental_contracts(created_by);
CREATE INDEX idx_rental_contracts_contract_number ON public.rental_contracts(contract_number);

-- 4. Updated_at Trigger Function (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Apply Triggers
CREATE TRIGGER update_rental_items_updated_at 
  BEFORE UPDATE ON public.rental_items 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rental_contracts_updated_at 
  BEFORE UPDATE ON public.rental_contracts 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Enable RLS
ALTER TABLE public.rental_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_contracts ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for rental_items
-- Alle authentifizierten Benutzer können Artikel lesen (für Formular)
CREATE POLICY "rental_items_select_authenticated" 
  ON public.rental_items FOR SELECT 
  TO authenticated 
  USING (true);

-- Nur Admin/Kommandant oder berechtigte Benutzer können Artikel verwalten
-- (Berechtigung wird im Frontend geprüft, hier erlauben wir authenticated für CUD)
CREATE POLICY "rental_items_insert_authenticated" 
  ON public.rental_items FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "rental_items_update_authenticated" 
  ON public.rental_items FOR UPDATE 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "rental_items_delete_authenticated" 
  ON public.rental_items FOR DELETE 
  TO authenticated 
  USING (true);

-- 8. RLS Policies for rental_contracts
-- Alle authentifizierten Benutzer können Verträge lesen
CREATE POLICY "rental_contracts_select_authenticated" 
  ON public.rental_contracts FOR SELECT 
  TO authenticated 
  USING (true);

-- Alle authentifizierten Benutzer können Verträge erstellen
CREATE POLICY "rental_contracts_insert_authenticated" 
  ON public.rental_contracts FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Alle authentifizierten Benutzer können Verträge aktualisieren
CREATE POLICY "rental_contracts_update_authenticated" 
  ON public.rental_contracts FOR UPDATE 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

-- 9. Insert default settings for rental module
INSERT INTO public.settings (key, value) VALUES 
  ('rental_delivery_cost', '55.00'),
  ('rental_items_admin_users', '[]')
ON CONFLICT (key) DO NOTHING;

-- 10. Function to generate contract number
CREATE OR REPLACE FUNCTION public.generate_rental_contract_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  next_number INTEGER;
  contract_num TEXT;
BEGIN
  year_part := to_char(now(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(contract_number FROM 6) AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM public.rental_contracts
  WHERE contract_number LIKE 'LV-' || year_part || '-%';
  
  contract_num := 'LV-' || year_part || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN contract_num;
END;
$$ LANGUAGE plpgsql;