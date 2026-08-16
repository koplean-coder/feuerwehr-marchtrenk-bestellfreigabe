import { useState } from 'react';
import { Bell, Save, Check, Send, User, Calendar } from 'lucide-react';
import { SectionHeader, SectionCard } from '../SettingsContent';

interface Profile {
  id: string;
  full_name: string;
  substitute_id?: string | null;
  is_absent?: boolean;
  absent_from?: string | null;
  absent_until?: string | null;
}

interface ErinnerungenSectionProps {
  approvalReminderEnabled: boolean;
  approvalReminderTime: string;
  updateApprovalReminderEnabled: (enabled: boolean) => Promise<{error: Error | null;}>;
  updateApprovalReminderTime: (time: string) => Promise<{error: Error | null;}>;
  triggerApprovalReminder: () => Promise<{error: Error | null;}>;
  currentProfile: Profile | null;
  profiles: Profile[];
  updateSubstitute: (userId: string, substituteId: string | null) => Promise<{error: Error | null;}>;
  setAbsence: (userId: string, data: {is_absent: boolean;absent_from?: string;absent_until?: string;}) => Promise<{error: Error | null;}>;
  refetchProfile: () => Promise<void>;
}

export function ErinnerungenSection({
  approvalReminderEnabled,
  approvalReminderTime,
  updateApprovalReminderEnabled,
  updateApprovalReminderTime,
  triggerApprovalReminder,
  currentProfile,
  profiles,
  updateSubstitute,
  setAbsence,
  refetchProfile
}: ErinnerungenSectionProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleTrigger = async () => {
    setSending(true);
    await triggerApprovalReminder();
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  const availableSubstitutes = profiles.filter(
    (p) => p.id !== currentProfile?.id
  );

  return (
    <div data-ev-id="ev_75d3e006c3">
      <SectionHeader
        icon={Bell}
        title="Erinnerungen & Vertretung"
        description="Automatische Genehmigungs-Erinnerungen und Abwesenheitsverwaltung." />


      <div data-ev-id="ev_b0ef41e865" className="grid gap-4">
        {/* Erinnerungen */}
        <SectionCard
          title="Genehmigungs-Erinnerungen"
          description="Tägliche Erinnerung an offene Genehmigungen.">

          <div data-ev-id="ev_ecdea72fbf" className="flex items-center justify-between mb-4">
            <label data-ev-id="ev_1c6fcc1083" className="flex items-center gap-3 cursor-pointer">
              <input data-ev-id="ev_071a8fa72f"
              type="checkbox"
              checked={approvalReminderEnabled}
              onChange={(e) => updateApprovalReminderEnabled(e.target.checked)}
              className="w-5 h-5 rounded border-input text-primary focus:ring-primary" />

              <span data-ev-id="ev_7af7e09453" className="font-medium">Erinnerungen aktiviert</span>
            </label>
          </div>

          {approvalReminderEnabled &&
          <div data-ev-id="ev_2f65633078" className="flex items-center gap-4 mb-4">
              <label data-ev-id="ev_c5e5328896" className="text-sm text-muted-foreground">Uhrzeit:</label>
              <input data-ev-id="ev_a11ebd2476"
            type="time"
            value={approvalReminderTime}
            onChange={(e) => updateApprovalReminderTime(e.target.value)}
            className="px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20" />

            </div>
          }

          <button data-ev-id="ev_f05563598d"
          onClick={handleTrigger}
          disabled={sending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">

            {sent ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {sent ? 'Gesendet!' : 'Jetzt manuell senden'}
          </button>
        </SectionCard>

        {/* Vertretung */}
        {currentProfile &&
        <SectionCard
          title="Meine Vertretung"
          description="Wählen Sie eine Vertretung für Ihre Abwesenheit.">

            <div data-ev-id="ev_53312f04cc" className="flex flex-col gap-4">
              <div data-ev-id="ev_ae0ad529c6" className="flex items-center gap-3">
                <User className="w-5 h-5 text-muted-foreground" />
                <select data-ev-id="ev_1441df508b"
              value={currentProfile.substitute_id || ''}
              onChange={async (e) => {
                await updateSubstitute(currentProfile.id, e.target.value || null);
                await refetchProfile();
              }}
              className="flex-1 px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20">

                  <option data-ev-id="ev_382f687e43" value="">Keine Vertretung</option>
                  {availableSubstitutes.map((p) =>
                <option data-ev-id="ev_7e651d5df9" key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                )}
                </select>
              </div>

              <div data-ev-id="ev_644c153947" className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <label data-ev-id="ev_dd4c88d4ce" className="flex items-center gap-2 cursor-pointer">
                  <input data-ev-id="ev_94a242a928"
                type="checkbox"
                checked={currentProfile.is_absent || false}
                onChange={async (e) => {
                  await setAbsence(currentProfile.id, {
                    is_absent: e.target.checked
                  });
                  await refetchProfile();
                }}
                className="w-4 h-4 rounded border-input text-primary focus:ring-primary" />

                  <span data-ev-id="ev_8afbf42c54">Ich bin abwesend</span>
                </label>
              </div>
            </div>
          </SectionCard>
        }
      </div>
    </div>);

}