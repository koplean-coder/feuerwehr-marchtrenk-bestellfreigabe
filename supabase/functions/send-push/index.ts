// Edge Function to send push notifications
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

interface RequestBody {
  userIds?: string[];  // Specific users to notify
  excludeUserId?: string;  // User to exclude (e.g., the sender)
  payload: PushPayload;
}

console.info('[send-push] Function started');

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get VAPID keys from environment
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@ffmarchtrenk.at';

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[send-push] VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'Push notifications not configured. VAPID keys missing.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Configure web-push
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { userIds, excludeUserId, payload }: RequestBody = await req.json();

    if (!payload || !payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'Missing required payload fields: title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query for subscriptions
    let query = supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth');

    // Filter by specific users if provided
    if (userIds && userIds.length > 0) {
      query = query.in('user_id', userIds);
    }

    // Exclude specific user if provided
    if (excludeUserId) {
      query = query.neq('user_id', excludeUserId);
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error('[send-push] Error fetching subscriptions:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[send-push] No subscriptions found');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No active subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-push] Sending to ${subscriptions.length} subscriptions`);

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-72x72.png',
      tag: payload.tag || 'ff-notification',
      data: payload.data || { url: '/' }
    });

    // Send notifications in parallel
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        try {
          await webpush.sendNotification(pushSubscription, notificationPayload);
          return { userId: sub.user_id, success: true };
        } catch (error: unknown) {
          console.error(`[send-push] Failed for user ${sub.user_id}:`, error);
          
          // If subscription is invalid (410 Gone), remove it
          const pushError = error as { statusCode?: number };
          if (pushError.statusCode === 410 || pushError.statusCode === 404) {
            console.log(`[send-push] Removing invalid subscription for user ${sub.user_id}`);
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('user_id', sub.user_id);
          }
          
          return { userId: sub.user_id, success: false, error: String(error) };
        }
      })
    );

    // Count successes and failures
    const succeeded = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.length - succeeded;

    console.log(`[send-push] Complete: ${succeeded} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: succeeded,
        failed: failed,
        total: results.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[send-push] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
