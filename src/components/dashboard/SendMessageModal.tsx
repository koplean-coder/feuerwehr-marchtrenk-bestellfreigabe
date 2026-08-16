import { useState } from 'react';
import { MessageSquare, X, User, Mail, Send, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/hooks/useProfiles';

interface SendMessageModalProps {
  profiles: Profile[];
  currentUserId: string;
  currentUserName: string;
  onClose: () => void;
  onMessageSent: () => void;
}

export function SendMessageModal({
  profiles,
  currentUserId,
  currentUserName,
  onClose,
  onMessageSent
}: SendMessageModalProps) {
  const [messageSubject, setMessageSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [sendAsEmail, setSendAsEmail] = useState(false);

  const selectAllRecipients = () => {
    setSelectedRecipients(profiles.filter((p) => p.id !== currentUserId).map((p) => p.id));
  };

  const clearAllRecipients = () => {
    setSelectedRecipients([]);
  };

  const selectByRole = (role: string) => {
    setSelectedRecipients(
      profiles.filter((p) => p.id !== currentUserId && p.role === role).map((p) => p.id)
    );
  };

  const toggleRecipient = (id: string) => {
    setSelectedRecipients((prev) =>
    prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const sendMessageToUsers = async () => {
    if (!supabase || selectedRecipients.length === 0 || !messageText.trim() || !messageSubject.trim()) return;

    setSendingMessage(true);
    try {
      const allRecipients = [...selectedRecipients, currentUserId];

      const notifications = selectedRecipients.map((recipientId) => ({
        user_id: recipientId,
        notification_type: 'message' as const,
        message: messageText,
        subject: messageSubject,
        is_read: false,
        sender_id: currentUserId,
        original_recipients: allRecipients,
        is_reply: false
      }));

      notifications.push({
        user_id: currentUserId,
        notification_type: 'message' as const,
        message: messageText,
        subject: messageSubject,
        is_read: true,
        sender_id: currentUserId,
        original_recipients: allRecipients,
        is_reply: false
      });

      const { error } = await supabase.from('notifications').insert(notifications);

      if (error) {
        console.error('Error sending message:', error);
        alert('Fehler beim Senden der Nachricht');
        return;
      }

      if (sendAsEmail) {
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (anonKey) {
          const recipientEmails = selectedRecipients.
          map((id) => profiles.find((p) => p.id === id)?.email).
          filter(Boolean);
          const senderEmail = profiles.find((p) => p.id === currentUserId)?.email;

          if (recipientEmails.length > 0) {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${anonKey}`,
                apikey: anonKey
              },
              body: JSON.stringify({
                type: 'direct_message',
                recipientEmails,
                ccEmail: senderEmail,
                senderName: currentUserName,
                subject: messageSubject,
                messageText
              })
            });
          }
        }
      }

      setMessageSent(true);
      setTimeout(() => {
        setMessageSent(false);
        onMessageSent();
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Fehler beim Senden der Nachricht');
    }
    setSendingMessage(false);
  };

  const handleClose = () => {
    setMessageSubject('');
    setMessageText('');
    setSelectedRecipients([]);
    onClose();
  };

  return (
    <div data-ev-id="ev_25938a85ea" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div data-ev-id="ev_f1027433ce" className="bg-card rounded-xl border border-border p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div data-ev-id="ev_9a229a6e88" className="flex items-center justify-between mb-6">
          <h2 data-ev-id="ev_b9b3402d1c" className="text-xl font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Nachricht senden
          </h2>
          <button data-ev-id="ev_8756e2bd2b" onClick={handleClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Betreff */}
        <div data-ev-id="ev_b27b8dd726" className="mb-4">
          <label data-ev-id="ev_27922a2335" className="text-sm font-medium text-foreground block mb-2">Betreff *</label>
          <input data-ev-id="ev_f5feabf15e"
          type="text"
          value={messageSubject}
          onChange={(e) => setMessageSubject(e.target.value)}
          placeholder="Betreff eingeben..."
          className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={sendingMessage} />

        </div>

        {/* Empfänger Auswahl */}
        <div data-ev-id="ev_b4e944d00f" className="mb-4">
          <div data-ev-id="ev_4a0e407d3f" className="flex items-center justify-between mb-2">
            <label data-ev-id="ev_26153c39be" className="text-sm font-medium text-foreground">Empfänger auswählen</label>
            <div data-ev-id="ev_30752e1926" className="flex gap-2">
              <button data-ev-id="ev_43f00fb2fe" onClick={selectAllRecipients} className="text-xs text-primary hover:underline">
                Alle
              </button>
              <span data-ev-id="ev_bab8bef29b" className="text-muted-foreground">|</span>
              <button data-ev-id="ev_3ff1e60995" onClick={clearAllRecipients} className="text-xs text-primary hover:underline">
                Keine
              </button>
              <span data-ev-id="ev_5595cb7100" className="text-muted-foreground">|</span>
              <button data-ev-id="ev_f5cf1521b9" onClick={() => selectByRole('kommandant')} className="text-xs text-primary hover:underline">
                Kommandanten
              </button>
              <span data-ev-id="ev_bcc372fd88" className="text-muted-foreground">|</span>
              <button data-ev-id="ev_7ed2fd892a" onClick={() => selectByRole('bereichsleiter')} className="text-xs text-primary hover:underline">
                Bereichsleiter
              </button>
            </div>
          </div>
          <div data-ev-id="ev_be51e3efe6" className="bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto">
            <div data-ev-id="ev_711d2ecc62" className="flex flex-col gap-1">
              {profiles.
              filter((p) => p.id !== currentUserId).
              map((recipient) =>
              <label data-ev-id="ev_1270c96fb1"
              key={recipient.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                    <input data-ev-id="ev_73b713f87e"
                type="checkbox"
                checked={selectedRecipients.includes(recipient.id)}
                onChange={() => toggleRecipient(recipient.id)}
                className="w-4 h-4 rounded border-input text-primary focus:ring-primary" />

                    <div data-ev-id="ev_6279e105b0" className="flex items-center gap-2 flex-1">
                      <div data-ev-id="ev_5b6e23beed" className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span data-ev-id="ev_8d8600090a" className="text-sm text-foreground flex-shrink-0">
                        {recipient.full_name || recipient.email}
                      </span>
                      {recipient.functions && recipient.functions.length > 0 &&
                  <div data-ev-id="ev_b80a36195f" className="flex gap-1 flex-shrink-0">
                          {recipient.functions.map((func, idx) =>
                    <span data-ev-id="ev_e6cdf2624d"
                    key={idx}
                    className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded whitespace-nowrap">
                              {func.charAt(0).toUpperCase() + func.slice(1)}
                            </span>
                    )}
                        </div>
                  }
                    </div>
                  </label>
              )}
            </div>
          </div>
          {selectedRecipients.length > 0 &&
          <p data-ev-id="ev_b8603dc5df" className="text-xs text-muted-foreground mt-2">
              {selectedRecipients.length} Empfänger ausgewählt
            </p>
          }
        </div>

        {/* Nachricht */}
        <div data-ev-id="ev_9d757b1eff" className="mb-4">
          <label data-ev-id="ev_7587403059" className="text-sm font-medium text-foreground block mb-2">Nachricht</label>
          <textarea data-ev-id="ev_3f0a29749c"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Nachricht eingeben..."
          className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          rows={4}
          disabled={sendingMessage} />

        </div>

        {/* Auch als E-Mail senden */}
        <div data-ev-id="ev_3f5072c810" className="mb-6">
          <label data-ev-id="ev_9f4047b74a" className="flex items-center gap-3 p-3 rounded-lg border border-input hover:bg-muted/50 cursor-pointer transition-colors">
            <input data-ev-id="ev_d57c1e7ebe"
            type="checkbox"
            checked={sendAsEmail}
            onChange={(e) => setSendAsEmail(e.target.checked)}
            disabled={sendingMessage}
            className="w-4 h-4 rounded border-input text-primary focus:ring-primary" />

            <div data-ev-id="ev_1116691c5c" className="flex-1">
              <span data-ev-id="ev_f5a7585163" className="text-sm font-medium text-foreground">Auch als E-Mail versenden</span>
              <p data-ev-id="ev_c655ef867f" className="text-xs text-muted-foreground">E-Mail an Empfänger, CC an Sie</p>
            </div>
            <Mail className="w-5 h-5 text-muted-foreground" />
          </label>
        </div>

        {/* Erfolg Meldung */}
        {messageSent &&
        <div data-ev-id="ev_dbd9456124" className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            Nachricht wurde erfolgreich gesendet!
          </div>
        }

        {/* Buttons */}
        <div data-ev-id="ev_827364b7cc" className="flex gap-3">
          <button data-ev-id="ev_e48f24a7cf"
          onClick={handleClose}
          className="flex-1 px-4 py-2.5 border border-input rounded-lg font-medium hover:bg-muted transition-colors">
            Abbrechen
          </button>
          <button data-ev-id="ev_364ccef9cb"
          onClick={sendMessageToUsers}
          disabled={sendingMessage || !messageText.trim() || !messageSubject.trim() || selectedRecipients.length === 0}
          className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {sendingMessage ?
            <span data-ev-id="ev_ffb115c27e" className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> :

            <>
                <Send className="w-5 h-5" />
                Senden
              </>
            }
          </button>
        </div>
      </div>
    </div>);

}