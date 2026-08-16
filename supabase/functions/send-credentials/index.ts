import { createClient } from 'npm:@supabase/supabase-js@2';

interface CredentialsPayload {
  email: string;
  password: string;
  name: string;
  role: string;
  userId?: string; // Optional: wenn gesetzt, wird das Passwort geändert
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'admin': return 'Administrator';
    case 'bereichsleiter': return 'Bereichsleiter';
    case 'kommandant': return 'Kommandant';
    default: return 'Mitglied';
  }
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { email, password, name, role, userId }: CredentialsPayload = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'E-Mail und Passwort sind erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Wenn userId angegeben ist, Passwort im Auth-System ändern
    if (userId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: password }
      );

      if (updateError) {
        console.error('Error updating password:', updateError);
        return new Response(
          JSON.stringify({ error: 'Passwort konnte nicht geändert werden: ' + updateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Password updated for user:', userId);
    }

    const smtp2goApiKey = Deno.env.get('SMTP2GO_API_KEY');
    const fromEmail = Deno.env.get('SMTP2GO_FROM_EMAIL') || 'noreply@example.com';
    const fromName = Deno.env.get('SMTP2GO_FROM_NAME') || 'FFM-Portal';
    
    if (!smtp2goApiKey) {
      console.error('SMTP2GO_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'SMTP2GO API-Key nicht konfiguriert' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appName = 'FFM-Portal';
    const roleLabel = getRoleLabel(role);

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
          .credentials p { margin: 8px 0; }
          .label { color: #666; font-size: 14px; }
          .value { font-weight: bold; font-size: 16px; color: #333; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; padding: 15px; border-radius: 8px; margin-top: 20px; color: #856404; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🚒 ${appName}</h1>
          </div>
          <div class="content">
            <h2>Willkommen, ${name || 'Benutzer'}!</h2>
            <p>${userId ? 'Ihre Zugangsdaten wurden aktualisiert.' : 'Ihr Benutzerkonto wurde erfolgreich erstellt.'} Hier sind Ihre Zugangsdaten:</p>
            
            <div class="credentials">
              <p><span class="label">E-Mail-Adresse:</span><br><span class="value">${email}</span></p>
              <p><span class="label">Passwort:</span><br><span class="value">${password}</span></p>
              <p><span class="label">Rolle:</span><br><span class="value">${roleLabel}</span></p>
            </div>
            
            <div class="warning">
              ⚠️ <strong>Wichtig:</strong> Bitte ändern Sie Ihr Passwort nach der ersten Anmeldung aus Sicherheitsgründen.
            </div>
            
            <div class="footer">
              <p>Diese E-Mail wurde automatisch generiert. Bei Fragen wenden Sie sich an Ihren Administrator.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log('Sending email to:', email);

    // SMTP2GO API aufrufen
    const response = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: smtp2goApiKey,
        sender: `${fromName} <${fromEmail}>`,
        to: [`${name || 'Benutzer'} <${email}>`],
        subject: `Ihre Zugangsdaten für das ${appName}`,
        html_body: htmlContent,
      }),
    });

    const result = await response.json();
    console.log('SMTP2GO response:', response.status, result);

    if (result.data?.succeeded > 0) {
      console.log('SMTP2GO success');
      return new Response(
        JSON.stringify({ success: true, messageId: result.data?.email_id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (result.data?.failed > 0 || !response.ok) {
      console.error('SMTP2GO error:', result);
      const errorMsg = result.data?.failures?.[0]?.error || result.error || 'E-Mail konnte nicht gesendet werden';
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
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
