// Edge Function to send daily approval reminder notifications
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PendingOrder {
  id: string;
  title: string;
  amount: number;
  status: string;
  submitted_at: string;
  bereichsleiter_id: string | null;
  creator: {
    full_name: string;
  } | null;
}

interface ApproverSummary {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  pendingOrders: PendingOrder[];
}

console.info('[send-approval-reminder] Function started');

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all pending orders that need approval
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        title,
        amount,
        status,
        submitted_at,
        bereichsleiter_id,
        creator:profiles!orders_created_by_fkey(full_name)
      `)
      .in('status', ['eingereicht', 'ausstehend_kommandant', 'ausstehend_kommandomitglieder'])
      .order('submitted_at', { ascending: true });

    if (ordersError) {
      console.error('[send-approval-reminder] Error fetching orders:', ordersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending orders' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      console.log('[send-approval-reminder] No pending orders found');
      return new Response(
        JSON.stringify({ success: true, message: 'No pending orders', notificationsSent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-approval-reminder] Found ${pendingOrders.length} pending orders`);

    // Get all Bereichsleiter and Kommandanten
    const { data: approvers, error: approversError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .in('role', ['bereichsleiter', 'kommandant', 'admin']);

    if (approversError) {
      console.error('[send-approval-reminder] Error fetching approvers:', approversError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch approvers' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group orders by approver
    const approverSummaries: Map<string, ApproverSummary> = new Map();

    for (const order of pendingOrders as PendingOrder[]) {
      // For eingereicht status - notify the assigned Bereichsleiter
      if (order.status === 'eingereicht' && order.bereichsleiter_id) {
        const approver = approvers?.find(a => a.id === order.bereichsleiter_id);
        if (approver) {
          if (!approverSummaries.has(approver.id)) {
            approverSummaries.set(approver.id, {
              userId: approver.id,
              email: approver.email,
              fullName: approver.full_name,
              role: 'Bereichsleiter',
              pendingOrders: [],
            });
          }
          approverSummaries.get(approver.id)!.pendingOrders.push(order);
        }
      }

      // For ausstehend_kommandant status - notify all Kommandanten and Admins
      if (order.status === 'ausstehend_kommandant') {
        const kommandanten = approvers?.filter(a => a.role === 'kommandant' || a.role === 'admin') || [];
        for (const kdt of kommandanten) {
          if (!approverSummaries.has(kdt.id)) {
            approverSummaries.set(kdt.id, {
              userId: kdt.id,
              email: kdt.email,
              fullName: kdt.full_name,
              role: 'Kommandant',
              pendingOrders: [],
            });
          }
          // Avoid duplicates
          const existing = approverSummaries.get(kdt.id)!;
          if (!existing.pendingOrders.find(o => o.id === order.id)) {
            existing.pendingOrders.push(order);
          }
        }
      }
    }

    // Send notifications to each approver
    let notificationsSent = 0;
    let emailsSent = 0;

    for (const [userId, summary] of approverSummaries) {
      if (summary.pendingOrders.length === 0) continue;

      const orderCount = summary.pendingOrders.length;
      const totalAmount = summary.pendingOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

      // Create in-app notification
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          subject: `${orderCount} offene Genehmigung${orderCount > 1 ? 'en' : ''}`,
          message: `Sie haben ${orderCount} Bestellung${orderCount > 1 ? 'en' : ''} (Gesamt: ${totalAmount.toFixed(2)} €) zur Freigabe offen.`,
          notification_type: 'order',
        });

      if (!notifError) {
        notificationsSent++;
        console.log(`[send-approval-reminder] Created notification for ${summary.fullName}`);
      }

      // Send push notification
      try {
        const { data: subscriptions } = await supabase
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth')
          .eq('user_id', userId);

        if (subscriptions && subscriptions.length > 0) {
          // Call send-push function
          const pushPayload = {
            userIds: [userId],
            payload: {
              title: `📋 ${orderCount} offene Genehmigung${orderCount > 1 ? 'en' : ''}`,
              body: `${orderCount} Bestellung${orderCount > 1 ? 'en' : ''} warten auf Ihre Freigabe (${totalAmount.toFixed(2)} €)`,
              icon: '/icon-192.png',
              tag: 'approval-reminder',
              data: { url: '/orders' },
            },
          };

          await fetch(`${supabaseUrl}/functions/v1/send-push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify(pushPayload),
          });
        }
      } catch (pushError) {
        console.error(`[send-approval-reminder] Push error for ${userId}:`, pushError);
      }

      // Send email notification
      try {
        const orderListHtml = summary.pendingOrders
          .map(o => {
            const daysWaiting = Math.floor((Date.now() - new Date(o.submitted_at).getTime()) / (1000 * 60 * 60 * 24));
            return `<li><strong>${o.title}</strong> - ${o.amount?.toFixed(2)} € (wartet seit ${daysWaiting} Tag${daysWaiting !== 1 ? 'en' : ''})</li>`;
          })
          .join('');

        const emailPayload = {
          type: 'approval_reminder',
          recipientEmail: summary.email,
          recipientName: summary.fullName,
          orderCount,
          totalAmount: totalAmount.toFixed(2),
          orderListHtml,
        };

        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify(emailPayload),
        });

        if (emailResponse.ok) {
          emailsSent++;
          console.log(`[send-approval-reminder] Sent email to ${summary.email}`);
        }
      } catch (emailError) {
        console.error(`[send-approval-reminder] Email error for ${summary.email}:`, emailError);
      }
    }

    console.log(`[send-approval-reminder] Completed: ${notificationsSent} notifications, ${emailsSent} emails sent`);

    return new Response(
      JSON.stringify({
        success: true,
        pendingOrdersCount: pendingOrders.length,
        approversNotified: approverSummaries.size,
        notificationsSent,
        emailsSent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[send-approval-reminder] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
