-- Neue Spalten für Eskalationsfrist-Verlängerung
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS escalation_extended_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS escalation_extension_reason TEXT,
ADD COLUMN IF NOT EXISTS escalation_extended_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS escalation_extended_at TIMESTAMP WITH TIME ZONE;

-- Index für effiziente Abfragen bei Eskalations-Check
CREATE INDEX IF NOT EXISTS idx_orders_escalation_extended_until 
ON public.orders(escalation_extended_until) 
WHERE escalation_extended_until IS NOT NULL;