-- Fix escalation function to respect escalation_extended_until
CREATE OR REPLACE FUNCTION public.check_and_escalate_orders()
RETURNS TABLE(escalated_count INTEGER, escalated_orders TEXT[])
LANGUAGE plpgsql
AS $$
DECLARE
  timeout_hours INTEGER;
  cutoff_time TIMESTAMP WITH TIME ZONE;
  escalated_ids TEXT[] := '{}';
  order_record RECORD;
  kommandant_id UUID;
  bl_name TEXT;
  effective_deadline TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get escalation timeout from settings
  SELECT COALESCE(value::INTEGER, 24) INTO timeout_hours
  FROM public.settings
  WHERE key = 'escalation_timeout_hours';
  
  IF timeout_hours IS NULL THEN
    timeout_hours := 24;
  END IF;
  
  -- Calculate cutoff time (for orders without extension)
  cutoff_time := NOW() - (timeout_hours || ' hours')::INTERVAL;
  
  -- Get a Kommandant
  SELECT id INTO kommandant_id
  FROM public.profiles
  WHERE role = 'kommandant'
  LIMIT 1;
  
  IF kommandant_id IS NULL THEN
    RETURN QUERY SELECT 0, '{}'::TEXT[];
    RETURN;
  END IF;
  
  -- Find and escalate orders
  -- Now respecting escalation_extended_until!
  FOR order_record IN
    SELECT o.id, o.title, o.bereichsleiter_id, o.submitted_at, o.escalation_extended_until
    FROM public.orders o
    WHERE o.status = 'eingereicht'
      AND o.submitted_at IS NOT NULL
  LOOP
    -- Calculate effective deadline for this order
    IF order_record.escalation_extended_until IS NOT NULL THEN
      -- Order has extension - use extended deadline
      effective_deadline := order_record.escalation_extended_until;
    ELSE
      -- No extension - use submitted_at + timeout
      effective_deadline := order_record.submitted_at + (timeout_hours || ' hours')::INTERVAL;
    END IF;
    
    -- Check if deadline has passed
    IF effective_deadline > NOW() THEN
      -- Deadline not yet passed - skip this order
      CONTINUE;
    END IF;
    
    -- Deadline passed - escalate this order
    
    -- Get Bereichsleiter name
    SELECT full_name INTO bl_name
    FROM public.profiles
    WHERE id = order_record.bereichsleiter_id;
    
    -- Update the order status
    UPDATE public.orders
    SET status = 'ausstehend_kommandant',
        kommandant_id = kommandant_id,
        updated_at = NOW()
    WHERE id = order_record.id;
    
    -- Create history entry (with info if extension was used)
    INSERT INTO public.order_history (order_id, action, old_status, new_status, performed_by)
    VALUES (
      order_record.id,
      CASE 
        WHEN order_record.escalation_extended_until IS NOT NULL THEN
          'Automatische Eskalation - Verlängerte Frist abgelaufen. Bereichsleiter ' || COALESCE(bl_name, 'unbekannt') || ' nicht verfügbar'
        ELSE
          'Automatische Eskalation - Bereichsleiter ' || COALESCE(bl_name, 'unbekannt') || ' nicht verfügbar (' || timeout_hours || 'h Frist überschritten)'
      END,
      'eingereicht',
      'ausstehend_kommandant',
      kommandant_id
    );
    
    -- Create notification for Kommandant
    INSERT INTO public.notifications (user_id, message, notification_type, order_id)
    VALUES (
      kommandant_id,
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