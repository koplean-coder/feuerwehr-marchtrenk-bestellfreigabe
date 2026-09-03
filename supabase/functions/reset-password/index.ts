import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

const DEFAULT_PASSWORD = '123456';

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Nicht autorisiert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client with user's auth token to verify permissions
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get requesting user
    const { data: { user: requestingUser }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Nicht autorisiert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requesting user is admin or kommandant
    const { data: requestingProfile } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', requestingUser.id)
      .single();

    if (!requestingProfile || (requestingProfile.role !== 'admin' && requestingProfile.role !== 'kommandant')) {
      return new Response(
        JSON.stringify({ error: 'Keine Berechtigung zum Zurücksetzen von Passwörtern' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user ID from request
    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Benutzer-ID fehlt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent resetting own password through this method
    if (userId === requestingUser.id) {
      return new Response(
        JSON.stringify({ error: 'Sie können Ihr eigenes Passwort nicht auf diese Weise zurücksetzen' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user's profile for the email
    const { data: targetProfile } = await userClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!targetProfile) {
      return new Response(
        JSON.stringify({ error: 'Benutzer nicht gefunden' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client to reset password
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Reset password
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      { password: DEFAULT_PASSWORD }
    );

    if (updateError) {
      console.error('Error resetting password:', updateError);
      return new Response(
        JSON.stringify({ error: 'Passwort konnte nicht zurückgesetzt werden: ' + updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Password reset for user ${userId} by ${requestingUser.id}`);

    // Send email notification
    const smtp2goApiKey = Deno.env.get('SMTP2GO_API_KEY');
    const fromEmail = Deno.env.get('SMTP2GO_FROM_EMAIL') || 'noreply@example.com';
    const fromName = Deno.env.get('SMTP2GO_FROM_NAME') || 'FFM-Portal';

    if (smtp2goApiKey) {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #C8102E; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #C8102E; }
            .label { color: #666; font-size: 14px; }
            .value { font-weight: bold; font-size: 18px; color: #333; font-family: monospace; }
            .warning { background: #fff3cd; padding: 15px; border-radius: 8px; margin-top: 20px; color: #856404; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🚒 FFM-Portal</h1>
            </div>
            <div class="content">
              <h2>Passwort zurückgesetzt</h2>
              <p>Hallo ${targetProfile.full_name || 'Mitglied'},</p>
              <p>Ihr Passwort wurde von einem Administrator zurückgesetzt.</p>
              
              <div class="credentials">
                <p><span class="label">Neues Passwort:</span><br><span class="value">${DEFAULT_PASSWORD}</span></p>
              </div>
              
              <div class="warning">
                ⚠️ <strong>Wichtig:</strong> Bitte ändern Sie Ihr Passwort nach der Anmeldung aus Sicherheitsgründen.
              </div>
              
              <div class="footer">
                <p>Bei Fragen wenden Sie sich an Ihren Administrator.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        await fetch('https://api.smtp2go.com/v3/email/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: smtp2goApiKey,
            sender: `${fromName} <${fromEmail}>`,
            to: [`${targetProfile.full_name || 'Benutzer'} <${targetProfile.email}>`],
            subject: 'Ihr Passwort wurde zurückgesetzt - FFM-Portal',
            html_body: htmlContent,
          }),
        });
        console.log('Password reset email sent to:', targetProfile.email);
      } catch (emailError) {
        console.error('Error sending password reset email:', emailError);
        // Don't fail the whole operation if email fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Passwort wurde auf das Standardpasswort zurückgesetzt',
        emailSent: !!smtp2goApiKey
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: 'Interner Serverfehler: ' + (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
