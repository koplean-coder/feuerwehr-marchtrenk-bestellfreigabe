import { useState } from 'react';
import { Mail, Save, Check } from 'lucide-react';
import { SectionHeader, SectionCard } from '../SettingsContent';

interface EmailEmpfaengerSectionProps {
  notificationEmail: string;
  schriftfuehrerEmail: string;
  kassierEmail: string;
  updateNotificationEmail: (email: string) => Promise<{error: Error | null;}>;
  updateSchriftfuehrerEmail: (email: string) => Promise<{error: Error | null;}>;
  updateKassierEmail: (email: string) => Promise<{error: Error | null;}>;
}

export function EmailEmpfaengerSection({
  notificationEmail,
  schriftfuehrerEmail,
  kassierEmail,
  updateNotificationEmail,
  updateSchriftfuehrerEmail,
  updateKassierEmail
}: EmailEmpfaengerSectionProps) {
  const [emails, setEmails] = useState({
    notification: notificationEmail,
    schriftfuehrer: schriftfuehrerEmail,
    kassier: kassierEmail
  });
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const handleSave = async (type: 'notification' | 'schriftfuehrer' | 'kassier') => {
    let updateFn;
    switch (type) {
      case 'notification':
        updateFn = updateNotificationEmail;
        break;
      case 'schriftfuehrer':
        updateFn = updateSchriftfuehrerEmail;
        break;
      case 'kassier':
        updateFn = updateKassierEmail;
        break;
    }
    await updateFn(emails[type]);
    setSaved((prev) => ({ ...prev, [type]: true }));
    setTimeout(() => setSaved((prev) => ({ ...prev, [type]: false })), 2000);
  };

  const emailFields = [
  {
    key: 'notification' as const,
    label: 'Allgemeine Benachrichtigungen',
    description: 'E-Mail-Adresse für Systembenachrichtigungen',
    value: notificationEmail
  },
  {
    key: 'schriftfuehrer' as const,
    label: 'Schriftführer',
    description: 'E-Mail-Adresse des Schriftführers',
    value: schriftfuehrerEmail
  },
  {
    key: 'kassier' as const,
    label: 'Kassier',
    description: 'E-Mail-Adresse des Kassiers',
    value: kassierEmail
  }];


  return (
    <div data-ev-id="ev_76105c2a3d">
      <SectionHeader
        icon={Mail}
        title="E-Mail Empfänger"
        description="Festlegen, wer welche Benachrichtigungen erhält." />


      <div data-ev-id="ev_5f46319017" className="space-y-4">
        {emailFields.map((field) =>
        <SectionCard key={field.key} title={field.label} description={field.description}>
            <div data-ev-id="ev_90cfad509b" className="flex gap-2">
              <input data-ev-id="ev_65eb722d93"
            type="email"
            value={emails[field.key]}
            onChange={(e) => setEmails((prev) => ({ ...prev, [field.key]: e.target.value }))}
            placeholder="email@beispiel.at"
            className="flex-1 px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20" />

              <button data-ev-id="ev_55b461b40d"
            onClick={() => handleSave(field.key)}
            disabled={emails[field.key] === field.value}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">

                {saved[field.key] ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved[field.key] ? 'Gespeichert' : 'Speichern'}
              </button>
            </div>
          </SectionCard>
        )}
      </div>
    </div>);

}