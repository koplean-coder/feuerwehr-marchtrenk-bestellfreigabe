import { createClient } from 'npm:@supabase/supabase-js@2';

interface Order {
  id: string;
  title: string;
  amount: number;
  created_by: string;
  bereichsleiter_id: string | null;
  submitted_at: string;
  escalation_extended_until: string | null;
}

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

console.info('Escalation check function started');

Deno.serve(async (req: Request) => {
  try {
    // Authorization check - allow service role, cron secret via header OR query param
    const authHeader = req.headers.get('Authorization');
    const url = new URL(req.url);
    const querySecret = url.searchParams.get('secret');
    
    const cronSecret = Deno.env.get('CRON_SECRET');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Check if called with service role key or cron secret (header or query)
    const providedKey = authHeader?.replace('Bearer ', '') || querySecret;
    
    if (providedKey !== serviceRoleKey && providedKey !== cronSecret) {
      console.error('Unauthorized access attempt');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Create Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get escalation timeout setting
    const { data: settingData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'escalation_timeout_hours')
      .single();

    const timeoutHours = parseInt(settingData?.value || '24', 10);
    console.log(`Escalation timeout: ${timeoutHours} hours`);

    // Calculate cutoff time
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - timeoutHours);
    const now = new Date();

    // Find orders waiting for Bereichsleiter that have exceeded the timeout
    // Include escalation_extended_until to check for extensions
    const { data: potentialOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, title, amount, created_by, bereichsleiter_id, submitted_at, escalation_extended_until')
      .eq('status', 'eingereicht')
      .not('submitted_at', 'is', null);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return new Response(JSON.stringify({ error: ordersError.message }), { status: 500 });
    }

    // Filter orders: check both timeout AND extension deadline
    const ordersToEscalate = (potentialOrders || []).filter((order: Order) => {
      const submittedAt = new Date(order.submitted_at);
      const hasExceededTimeout = submittedAt < cutoffTime;
      
      // If order has an extension, check if extension is still valid
      if (order.escalation_extended_until) {
        const extensionDeadline = new Date(order.escalation_extended_until);
        // Don't escalate if extension is still in the future
        if (extensionDeadline > now) {
          console.log(`Order ${order.id} has valid extension until ${extensionDeadline.toISOString()}, skipping`);
          return false;
        }
        // Extension has expired, escalate
        console.log(`Order ${order.id} extension expired at ${extensionDeadline.toISOString()}, escalating`);
        return true;
      }
      
      // No extension, use standard timeout
      return hasExceededTimeout;
    });

    if (ordersToEscalate.length === 0) {
      console.log('No orders to escalate');
      return new Response(JSON.stringify({ message: 'No orders to escalate', count: 0 }), { status: 200 });
    }

    console.log(`Found ${ordersToEscalate.length} orders to escalate`);

    // Get all Kommandants
    const { data: kommandants } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('role', 'kommandant');

    if (!kommandants || kommandants.length === 0) {
      console.error('No Kommandant found');
      return new Response(JSON.stringify({ error: 'No Kommandant found' }), { status: 500 });
    }

    const kommandant = kommandants[0];
    let escalatedCount = 0;

    for (const order of ordersToEscalate) {
      // Get creator info
      const { data: creator } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', order.created_by)
        .single();

      // Get Bereichsleiter info if available
      let bereichsleiterName = 'Unbekannt';
      if (order.bereichsleiter_id) {
        const { data: bl } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', order.bereichsleiter_id)
          .single();
        bereichsleiterName = bl?.full_name || 'Unbekannt';
      }

      // Determine escalation reason
      const escalationReason = order.escalation_extended_until 
        ? 'Automatische Eskalation - Verlängerte Frist abgelaufen'
        : 'Automatische Eskalation - Bereichsleiter nicht verfügbar';

      // Update order status to ausstehend_kommandant
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'ausstehend_kommandant',
          kommandant_id: kommandant.id
        })
        .eq('id', order.id);

      if (updateError) {
        console.error(`Error updating order ${order.id}:`, updateError);
        continue;
      }

      // Add history entry
      await supabase.from('order_history').insert({
        order_id: order.id,
        action: escalationReason,
        old_status: 'eingereicht',
        new_status: 'ausstehend_kommandant',
        performed_by: kommandant.id
      });

      // Create in-app notification for Kommandant
      await supabase.from('notifications').insert({
        user_id: kommandant.id,
        message: `Bestellung "${order.title}" wurde automatisch eskaliert - ${order.escalation_extended_until ? 'Verlängerte Frist abgelaufen' : 'Bereichsleiter ' + bereichsleiterName + ' nicht verfügbar'}`,
        notification_type: 'order',
        order_id: order.id
      });

      // Send email notification
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
      if (anonKey && kommandant.email) {
        try {
          const emailResponse = await fetch(
            `${supabaseUrl}/functions/v1/send-notification`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${anonKey}`,
                'apikey': anonKey,
              },
              body: JSON.stringify({
                type: 'order_escalation',
                orderTitle: order.title,
                orderAmount: order.amount.toFixed(2) + ' €',
                recipientEmail: kommandant.email,
                recipientName: kommandant.full_name || 'Kommandant',
                creatorName: creator?.full_name || 'Unbekannt',
                bereichsleiterName: bereichsleiterName,
                timeoutHours: timeoutHours.toString()
              }),
            }
          );
          
          // Add history entry for email notification
          if (emailResponse.ok) {
            await supabase.from('order_history').insert({
              order_id: order.id,
              action: `E-Mail-Benachrichtigung gesendet an Kommandant ${kommandant.full_name || ''} (${kommandant.email})`,
              old_status: 'ausstehend_kommandant',
              new_status: 'ausstehend_kommandant',
              performed_by: kommandant.id
            });
            console.log(`Email sent to ${kommandant.email} for order ${order.id}`);
          } else {
            console.error(`Email sending failed for order ${order.id}: ${emailResponse.status}`);
          }
        } catch (emailError) {
          console.error('Error sending escalation email:', emailError);
        }
      }

      escalatedCount++;
      console.log(`Escalated order ${order.id}: ${order.title}`);
    }

    return new Response(
      JSON.stringify({ 
        message: `Escalated ${escalatedCount} orders`, 
        count: escalatedCount 
      }), 
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Escalation check error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500 }
    );
  }
});
