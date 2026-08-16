// Helper function to generate VAPID keys
// Run this once to get your keys, then add them as secrets
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.info('[generate-vapid] Function started');

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Generate VAPID keys
    const vapidKeys = webpush.generateVAPIDKeys();

    console.log('[generate-vapid] Keys generated successfully');

    return new Response(
      JSON.stringify({
        publicKey: vapidKeys.publicKey,
        privateKey: vapidKeys.privateKey,
        instructions: {
          step1: 'Speichere diese Schlüssel sicher!',
          step2: 'Füge VAPID_PUBLIC_KEY als Secret in den Cloud Backend Einstellungen hinzu',
          step3: 'Füge VAPID_PRIVATE_KEY als Secret in den Cloud Backend Einstellungen hinzu',
          step4: 'Füge VITE_VAPID_PUBLIC_KEY in deiner .env Datei hinzu (gleicher Wert wie VAPID_PUBLIC_KEY)',
          step5: 'Optional: Füge VAPID_SUBJECT hinzu (z.B. mailto:admin@example.com)'
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('[generate-vapid] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate VAPID keys' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
