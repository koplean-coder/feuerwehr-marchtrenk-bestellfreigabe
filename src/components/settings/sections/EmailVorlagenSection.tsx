import { useState } from 'react';
import { Mail, ChevronDown, ChevronUp, Save, Check, RotateCcw, UserPlus, Info } from 'lucide-react';
import { SectionHeader, SectionCard } from '../SettingsContent';

interface EmailTemplates {
  [key: string]: {
    subject: string;
    body: string;
  };
}

interface EmailVorlagenSectionProps {
  emailTemplates: EmailTemplates;
  updateEmailTemplate: (key: string, template: {subject: string;body: string;}) => Promise<{error: Error | null;}>;
  invitationEmailSubject: string;
  invitationEmailBody: string;
  updateInvitationEmailSubject: (subject: string) => Promise<{error: Error | null;}>;
  updateInvitationEmailBody: (body: string) => Promise<{error: Error | null;}>;
}

const defaultTemplates: EmailTemplates = {
  order_submitted: {
    subject: 'Neue Bestellung zur Freigabe',
    body: 'Eine neue Bestellung wurde eingereicht und wartet auf Ihre Freigabe.\n\nBestellung: {{order_number}}\nVon: {{creator_name}}\nBetrag: {{amount}}\n\nBitte prüfen Sie die Bestellung im System.'
  },
  order_approved: {
    subject: 'Bestellung genehmigt',
    body: 'Ihre Bestellung wurde genehmigt.\n\nBestellung: {{order_number}}\nGenehmigt von: {{approver_name}}\n\nDie Bestellung kann nun weiter bearbeitet werden.'
  },
  order_rejected: {
    subject: 'Bestellung abgelehnt',
    body: 'Ihre Bestellung wurde leider abgelehnt.\n\nBestellung: {{order_number}}\nGrund: {{rejection_reason}}\n\nBei Fragen wenden Sie sich bitte an die zuständige Person.'
  },
  payment_order_submitted: {
    subject: 'Auszahlungsanweisung eingereicht',
    body: 'Eine neue Auszahlungsanweisung wurde eingereicht.\n\nReferenz: {{reference_number}}\nBetrag: {{amount}}\nZweck: {{purpose}}\n\nBitte prüfen und genehmigen Sie die Anweisung.'
  },
  approval_reminder: {
    subject: 'Erinnerung: Offene Genehmigungen',
    body: 'Sie haben noch offene Genehmigungen, die auf Ihre Bearbeitung warten.\n\nAnzahl: {{pending_count}}\n\nBitte bearbeiten Sie diese zeitnah im System.'
  }
};

const templateLabels: Record<string, string> = {
  order_submitted: 'Bestellung eingereicht',
  order_approved: 'Bestellung genehmigt',
  order_rejected: 'Bestellung abgelehnt',
  payment_order_submitted: 'Auszahlungsanweisung eingereicht',
  approval_reminder: 'Genehmigungs-Erinnerung'
};

export function EmailVorlagenSection({
  emailTemplates,
  updateEmailTemplate,
  invitationEmailSubject,
  invitationEmailBody,
  updateInvitationEmailSubject,
  updateInvitationEmailBody
}: EmailVorlagenSectionProps) {
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [editedTemplates, setEditedTemplates] = useState<EmailTemplates>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  // Invitation template state
  const [invitationExpanded, setInvitationExpanded] = useState(false);
  const [editedInvitationSubject, setEditedInvitationSubject] = useState('');
  const [editedInvitationBody, setEditedInvitationBody] = useState('');
  const [savingInvitation, setSavingInvitation] = useState(false);
  const [savedInvitation, setSavedInvitation] = useState(false);

  const getTemplate = (key: string) => {
    return editedTemplates[key] || emailTemplates[key] || defaultTemplates[key] || { subject: '', body: '' };
  };

  const handleEdit = (key: string, field: 'subject' | 'body', value: string) => {
    setEditedTemplates((prev) => ({
      ...prev,
      [key]: {
        ...getTemplate(key),
        [field]: value
      }
    }));
  };

  const handleSave = async (key: string) => {
    setSaving((prev) => ({ ...prev, [key]: true }));
    await updateEmailTemplate(key, getTemplate(key));
    setSaving((prev) => ({ ...prev, [key]: false }));
    setSaved((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => setSaved((prev) => ({ ...prev, [key]: false })), 2000);
  };

  const handleReset = (key: string) => {
    if (confirm('Vorlage auf Standard zurücksetzen?')) {
      setEditedTemplates((prev) => ({
        ...prev,
        [key]: defaultTemplates[key]
      }));
    }
  };

  const templateKeys = Object.keys(defaultTemplates);

  const handleSaveInvitation = async () => {
    setSavingInvitation(true);
    const subjectToSave = editedInvitationSubject || invitationEmailSubject;
    const bodyToSave = editedInvitationBody || invitationEmailBody;
    await updateInvitationEmailSubject(subjectToSave);
    await updateInvitationEmailBody(bodyToSave);
    setSavingInvitation(false);
    setSavedInvitation(true);
    setTimeout(() => setSavedInvitation(false), 2000);
  };

  return (
    <div data-ev-id="ev_b0302964cb">
      <SectionHeader
        icon={Mail}
        title="E-Mail Vorlagen"
        description="Texte für automatisch versendete E-Mails anpassen." />


      <div data-ev-id="ev_b9ab66ad18" className="space-y-3">
        {/* Mitglieder-Einladung */}
        <div data-ev-id="ev_77ef21a2cd" className="bg-card border border-green-200 rounded-lg overflow-hidden">
          <button data-ev-id="ev_ec20c5cceb"
          onClick={() => setInvitationExpanded(!invitationExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-green-50/50 transition-colors">
            <div data-ev-id="ev_e147833c8b" className="flex items-center gap-3">
              <UserPlus className="w-5 h-5 text-green-600" />
              <span data-ev-id="ev_501cd91a22" className="font-medium">Mitglieder-Einladung</span>
            </div>
            {invitationExpanded ?
            <ChevronUp className="w-5 h-5 text-muted-foreground" /> :
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
            }
          </button>
          
          {invitationExpanded &&
          <div data-ev-id="ev_759a1ae542" className="px-4 pb-4 space-y-4">
              <div data-ev-id="ev_f517849b10" className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div data-ev-id="ev_1b9a5332ef" className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p data-ev-id="ev_d7623dba54" className="text-xs text-blue-700">
                    Platzhalter: <code data-ev-id="ev_3c529fdc4a" className="bg-blue-100 px-1 rounded">{'{registration_link}'}</code> für den Link, <code data-ev-id="ev_1a63ee9032" className="bg-blue-100 px-1 rounded">{'{inviter_name}'}</code> für den Absender
                  </p>
                </div>
              </div>
              
              <div data-ev-id="ev_5c875041a2">
                <label data-ev-id="ev_51348711f0" className="text-sm text-muted-foreground block mb-1">Betreff</label>
                <input data-ev-id="ev_0fc40e613a"
              type="text"
              value={editedInvitationSubject || invitationEmailSubject}
              onChange={(e) => setEditedInvitationSubject(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20" />

              </div>
              
              <div data-ev-id="ev_8399cdd4f9">
                <label data-ev-id="ev_023218d277" className="text-sm text-muted-foreground block mb-1">Inhalt</label>
                <textarea data-ev-id="ev_c7da1b0c3f"
              value={editedInvitationBody || invitationEmailBody}
              onChange={(e) => setEditedInvitationBody(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 font-mono text-sm" />

              </div>
              
              <div data-ev-id="ev_a429a8f271" className="flex justify-end">
                <button data-ev-id="ev_223c688dc1"
              onClick={handleSaveInvitation}
              disabled={savingInvitation}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                  {savedInvitation ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {savedInvitation ? 'Gespeichert' : 'Speichern'}
                </button>
              </div>
            </div>
          }
        </div>
        {templateKeys.map((key) => {
          const template = getTemplate(key);
          const isExpanded = expandedTemplate === key;

          return (
            <div data-ev-id="ev_ce8dc63c6d" key={key} className="bg-card border border-border rounded-lg overflow-hidden">
              <button data-ev-id="ev_969d5308f9"
              onClick={() => setExpandedTemplate(isExpanded ? null : key)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">

                <div data-ev-id="ev_3fd45c8463" className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <span data-ev-id="ev_979ff9c383" className="font-medium">{templateLabels[key] || key}</span>
                </div>
                {isExpanded ?
                <ChevronUp className="w-5 h-5 text-muted-foreground" /> :

                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                }
              </button>

              {isExpanded &&
              <div data-ev-id="ev_be3c38fd50" className="px-4 pb-4 space-y-4">
                  <div data-ev-id="ev_7f382451f5">
                    <label data-ev-id="ev_c85c73e440" className="text-sm text-muted-foreground block mb-1">Betreff</label>
                    <input data-ev-id="ev_1bc7221ca4"
                  type="text"
                  value={template.subject}
                  onChange={(e) => handleEdit(key, 'subject', e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20" />

                  </div>
                  <div data-ev-id="ev_f27cba4212">
                    <label data-ev-id="ev_6036ce8cfd" className="text-sm text-muted-foreground block mb-1">Inhalt</label>
                    <textarea data-ev-id="ev_17829deb97"
                  value={template.body}
                  onChange={(e) => handleEdit(key, 'body', e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 font-mono text-sm" />

                    <p data-ev-id="ev_da2eb74208" className="text-xs text-muted-foreground mt-1">
                      Platzhalter: {'{{variable}}'} wird automatisch ersetzt
                    </p>
                  </div>
                  <div data-ev-id="ev_e8f2aa0a41" className="flex gap-2">
                    <button data-ev-id="ev_299e2c05e3"
                  onClick={() => handleSave(key)}
                  disabled={saving[key]}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">

                      {saved[key] ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                      {saved[key] ? 'Gespeichert' : 'Speichern'}
                    </button>
                    <button data-ev-id="ev_87f1fb9645"
                  onClick={() => handleReset(key)}
                  className="px-4 py-2 border border-input rounded-lg hover:bg-muted flex items-center gap-2">

                      <RotateCcw className="w-4 h-4" />
                      Standard
                    </button>
                  </div>
                </div>
              }
            </div>);

        })}
      </div>
    </div>);

}