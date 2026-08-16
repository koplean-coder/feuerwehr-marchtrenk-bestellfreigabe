-- Add no_expense_report_required flag to payment_orders
-- This allows marking payment orders that don't need to appear in expense reports

ALTER TABLE public.payment_orders 
ADD COLUMN IF NOT EXISTS no_expense_report_required BOOLEAN NOT NULL DEFAULT false;

-- Add index for efficient filtering in expense report queries
CREATE INDEX IF NOT EXISTS idx_payment_orders_no_expense_report 
ON public.payment_orders (no_expense_report_required) 
WHERE no_expense_report_required = false;

-- Add comment for documentation
COMMENT ON COLUMN public.payment_orders.no_expense_report_required IS 'When true, this payment order will not appear in expense report suggestions';