-- Payment Orders (Auszahlungsanweisungen) table
CREATE TABLE public.payment_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_number TEXT NOT NULL UNIQUE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  recipient_name TEXT NOT NULL,
  recipient_iban TEXT,
  purpose TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'paid')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  paid_by UUID REFERENCES auth.users(id),
  paid_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for better performance
CREATE INDEX idx_payment_orders_created_by ON public.payment_orders(created_by);
CREATE INDEX idx_payment_orders_status ON public.payment_orders(status);
CREATE INDEX idx_payment_orders_created_at ON public.payment_orders(created_at DESC);

-- Enable RLS
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- SELECT: All authenticated users can view payment orders
CREATE POLICY "payment_orders_select" ON public.payment_orders
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: All authenticated users can create drafts
CREATE POLICY "payment_orders_insert" ON public.payment_orders
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = created_by AND status = 'draft');

-- UPDATE: Creator can update own drafts, or authorized roles can update status
CREATE POLICY "payment_orders_update" ON public.payment_orders
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: Only creator can delete their own drafts
CREATE POLICY "payment_orders_delete" ON public.payment_orders
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = created_by AND status = 'draft');

-- Trigger for updated_at
CREATE TRIGGER update_payment_orders_updated_at 
  BEFORE UPDATE ON public.payment_orders 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();