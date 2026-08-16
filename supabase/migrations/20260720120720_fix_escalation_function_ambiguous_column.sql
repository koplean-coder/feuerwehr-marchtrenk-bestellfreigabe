-- Fix ambiguous column reference in check_and_escalate_orders function
-- The variable 'kommandant_id' had the same name as the column, causing PostgreSQL error 42702
CREATE OR REPLACE FUNCTION public.check_and_escalate_orders()
RETURNS TABLE(escalated_count INTEGER, escalated_orders TEXT[])
LANGUAGE plpgsql
AS $$
DECLARE
  timeout_hours INTEGER;
  cutoff_time TIMESTAMP WITH TIME ZONE;
  escalated_ids TEXT[] := '{}';
  order_record RECORD;
  v_kommandant_id UUID;  -- Renamed to avoid ambiguity with column name
  bl_name TEXT;
BEGIN
  -- Get escalation timeout from settings
  SELECT COALESCE(value::INTEGER, 24) INTO timeout_hours
  FROM public.settings
  WHERE key = 'escalation_timeout_hours';
  
  IF timeout_hours IS NULL THEN
    timeout_hours := 24;
  END IF;
  
  -- Calculate cutoff time
  cutoff_time := NOW() - (timeout_hours || ' hours')::INTERVAL;
  
  -- Get a Kommandant
  SELECT id INTO v_kommandant_id
  FROM public.profiles
  WHERE role = 'kommandant'
  LIMIT 1;
  
  IF v_kommandant_id IS NULL THEN
    RETURN QUERY SELECT 0, '{}'::TEXT[];
    RETURN;
  END IF;
  
  -- Find and escalate orders
  FOR order_record IN
    SELECT o.id, o.title, o.bereichsleiter_id
    FROM public.orders o
    WHERE o.status = 'eingereicht'
      AND o.submitted_at IS NOT NULL
      AND o.submitted_at < cutoff_time
  LOOP
    -- Get Bereichsleiter name
    SELECT full_name INTO bl_name
    FROM public.profiles
    WHERE id = order_record.bereichsleiter_id;
    
    -- Update the order status
    UPDATE public.orders
    SET status = 'ausstehend_kommandant',
        kommandant_id = v_kommandant_id,
        updated_at = NOW()
    WHERE id = order_record.id;
    
    -- Create history entry
    INSERT INTO public.order_history (order_id, action, old_status, new_status, performed_by)
    VALUES (
      order_record.id,
      'Automatische Eskalation - Bereichsleiter ' || COALESCE(bl_name, 'unbekannt') || ' nicht verfügbar (' || timeout_hours || 'h Frist überschritten)',
      'eingereicht',
      'ausstehend_kommandant',
      v_kommandant_id
    );
    
    -- Create notification for Kommandant
    INSERT INTO public.notifications (user_id, message, notification_type, order_id)
    VALUES (
      v_kommandant_id,
      'Bestellung "' || order_record.title || '" wurde automatisch eskaliert - Bereichsleiter ' || COALESCE(bl_name, '') || ' nicht verfügbar',
      'order',
      order_record.id
    );
    
    -- Add to escalated list
    escalated_ids := array_append(escalated_ids, order_record.id::TEXT);
  END LOOP;
  
  RETURN QUERY SELECT array_length(escalated_ids, 1)::INTEGER, escalated_ids;
END;
$$;