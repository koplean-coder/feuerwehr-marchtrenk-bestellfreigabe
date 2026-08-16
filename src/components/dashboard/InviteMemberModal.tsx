import { useState } from 'react';
import { X, Send, UserPlus, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviterName: string;
  registrationUrl: string;
}

export function InviteMemberModal({ isOpen, onClose, inviterName, registrationUrl }: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { invitationEmailSubject, invitationEmailBody } = useSettings();

  if (!isOpen) return null;

  const handleClose = () => {
    setEmail('');
    setSent(false);
    setError(null);
    onClose();
  };

  const handleSend = async () => {
    if (!email.trim()) {
      setError('Bitte E-Mail-Adresse eingeben');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Bitte gültige E-Mail-Adresse eingeben');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !anonKey) {
        throw new Error('Supabase nicht konfiguriert');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey
        },
        body: JSON.stringify({
          type: 'member_invitation',
          recipientEmail: email.trim(),
          inviterName,
          registrationUrl,
          customSubject: invitationEmailSubject,
          customBody: invitationEmailBody
        })
      });

      const result = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        throw new Error(result.error || 'Fehler beim Senden');
      }

      // Prüfe ob E-Mail tatsächlich gesendet wurde
      if (result.sent === 0) {
        throw new Error('E-Mail konnte nicht gesendet werden. Bitte Edge Function prüfen.');
      }
      
      if (result.failed > 0) {
        throw new Error('E-Mail-Versand fehlgeschlagen. SMTP-Konfiguration prüfen.');
      }

      setSent(true);
      setEmail('');
    } catch (err) {
      console.error('Error sending invitation:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Senden der Einladung');
    } finally {
      setSending(false);
    }
  };

  return (
    <div data-ev-id="ev_6fd3d1b8b6" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div data-ev-id="ev_92fd573ec8" className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div data-ev-id="ev_9f55957246" className="flex items-center justify-between p-4 border-b border-border">
          <div data-ev-id="ev_522663fc00" className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 data-ev-id="ev_623c3d7e17" className="font-semibold text-foreground">Mitglied einladen</h2>
          </div>
          <button data-ev-id="ev_3481256ddd"
          onClick={handleClose}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors">

            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div data-ev-id="ev_3c650f4f42" className="p-4">
          {sent ?
          <div data-ev-id="ev_280059c4d6" className="text-center py-6">
              <div data-ev-id="ev_8ceff12a29" className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 data-ev-id="ev_76cf09e85f" className="font-medium text-foreground mb-1">Einladung gesendet!</h3>
              <p data-ev-id="ev_d123f8694f" className="text-sm text-muted-foreground mb-4">
                Die Einladung wurde erfolgreich versendet.
              </p>
              <button data-ev-id="ev_3c630c6817"
            onClick={() => {
              setSent(false);
              setEmail('');
            }}
            className="text-sm text-primary hover:underline">

                Weitere Person einladen
              </button>
            </div> :

          <>
              <p data-ev-id="ev_3e0948988f" className="text-sm text-muted-foreground mb-4">
                Gib die E-Mail-Adresse der Person ein, die du zur BANF-Plattform einladen möchtest.
              </p>

              <div data-ev-id="ev_ff2c33c7e3" className="mb-4">
                <label data-ev-id="ev_747573ccd4" className="block text-sm font-medium text-foreground mb-1.5">
                  E-Mail-Adresse
                </label>
                <input data-ev-id="ev_a9e1d11d56"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="name@feuerwehr-marchtrenk.at"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !sending) {
                  handleSend();
                }
              }} />

              </div>

              {error &&
            <div data-ev-id="ev_c9e3ec07be" className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <p data-ev-id="ev_da46900528" className="text-sm text-red-700">{error}</p>
                </div>
            }

              <div data-ev-id="ev_f0afdc9241" className="bg-muted/50 rounded-lg p-3 mb-4">
                <p data-ev-id="ev_d768fb0d42" className="text-xs text-muted-foreground">
                  <strong data-ev-id="ev_471741937a">Eingeladen von:</strong> {inviterName}
                </p>
                <p data-ev-id="ev_c18a5991e8" className="text-xs text-muted-foreground mt-1">
                  Die E-Mail enthält den Registrierungslink und eine Anleitung zur App-Installation.
                </p>
              </div>
            </>
          }
        </div>

        {/* Footer */}
        {!sent &&
        <div data-ev-id="ev_cd129c496a" className="flex items-center justify-end gap-2 p-4 border-t border-border">
            <button data-ev-id="ev_b692a2a57f"
          onClick={handleClose}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
          disabled={sending}>

              Abbrechen
            </button>
            <button data-ev-id="ev_f2b3bfcdf2"
          onClick={handleSend}
          disabled={sending || !email.trim()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">

              {sending ?
            <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sende...
                </> :

            <>
                  <Send className="w-4 h-4" />
                  Einladung senden
                </>
            }
            </button>
          </div>
        }
      </div>
    </div>);

}