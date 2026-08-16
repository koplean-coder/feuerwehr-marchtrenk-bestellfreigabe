-- Add field to mark payment orders that don't need expense report follow-up
ALTER TABLE public.payment_orders 
ADD COLUMN IF NOT EXISTS no_expense_report_required BOOLEAN DEFAULT false;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_payment_orders_no_expense_report 
ON public.payment_orders(no_expense_report_required) 
WHERE no_expense_report_required = true;

COMMENT ON COLUMN public.payment_orders.no_expense_report_required IS 'When true, this payment order will not appear in the expense reports list';