import { createClient } from 'npm:@supabase/supabase-js@2';

interface NotificationPayload {
  type: 'approval' | 'final_approval' | 'rejection' | 'rejection_schriftfuehrer' | 'kommando_decision_kassier' | 'kommando_decision_schriftfuehrer' | 'new_order_bereichsleiter' | 'new_order_kommandant' | 'new_order_kommandomitglied' | 'reset_to_draft' | 'new_user' | 'password_reset' | 'new_supplier_pending' | 'supplier_approved' | 'supplier_rejected' | 'test_email' | 'task_assigned' | 'step_assigned' | 'direct_message' | 'min_order_request' | 'min_order_approved' | 'min_order_rejected' | 'payment_order_submitted' | 'payment_order_approved' | 'event_participation_submitted' | 'event_participation_approved' | 'event_participation_rejected' | 'event_participation_reapproval_required' | 'event_participation_amount_changed' | 'order_escalation' | 'task_deadline_reminder' | 'new_command_decision' | 'member_invitation';
  orderId?: string;
  orderTitle?: string;
  orderAmount?: number;
  creatorEmail?: string;
  creatorName?: string;
  approverName?: string;
  approverRole?: string;
  notificationEmail?: string;
  rejectionReason?: string;
  resetReason?: string;
  recipientEmail?: string;
  recipientName?: string;
  requiresApproval?: boolean;
  // For new_user and password_reset
  userName?: string;
  userEmail?: string;
  userPassword?: string;
  // For supplier notifications
  supplierName?: string;
  recipientEmails?: string[];
  // For rejection to Schriftführer
  votingResults?: string;
  schriftfuehrerEmail?: string;
  // For Kassier notification
  kassierEmail?: string;
  decision?: string;
  decisionType?: string;
  // For test email
  testRecipientEmail?: string;
  testRecipientRole?: string;
  // For task assignment
  taskTitle?: string;
  taskDescription?: string;
  taskStartDate?: string;
  taskEndDate?: string;
  taskPriority?: string;
  assignerName?: string;
  // For step assignment
  stepTitle?: string;
  // For direct message
  senderEmail?: string;
  senderName?: string;
  messageContent?: string;
  homepageUrl?: string;
  // For payment order notifications
  referenceNumber?: string;
  recipientNameOrder?: string;
  recipientId?: string;
  amount?: number;
  purpose?: string;
  // For event participation notifications
  eventName?: string;
  eventDate?: string;
  estimatedCosts?: number;
  originalAmount?: number;
  newAmount?: number;
  changeReason?: string;
  kassierName?: string;
  rejecterName?: string;
  // For order escalation
  bereichsleiterName?: string;
  timeoutHours?: string;
  // For command decision notifications
  decisionTitle?: string;
  decisionDescription?: string;
  // For member invitation
  inviterName?: string;
  registrationUrl?: string;
  customSubject?: string;
  customBody?: string;
}

interface EmailRequest {
  to: string[];
  subject: string;
  html: string;
  cc?: string[];
}

interface EmailTemplate {
  subject: string;
  body: string;
}

interface EmailTemplateDesign {
  headerGradientStart: string;
  headerGradientEnd: string;
  headerTitle: string;
  headerSubtitle: string;
  showHeaderIcon: boolean;
  headerIconType: 'emoji' | 'logo';
  headerIconEmoji: string;
  headerLogoUrl: string;
  contentBgColor: string;
  contentTextColor: string;
  contentFontSize: number;
  contentPadding: number;
  greetingText: string;
  signatureText: string;
  buttonGradientStart: string;
  buttonGradientEnd: string;
  buttonText: string;
  buttonTextColor: string;
  buttonBorderRadius: number;
  footerBgColor: string;
  footerTextColor: string;
  footerLine1: string;
  footerLine2: string;
  copyrightText: string;
  outerBgColor: string;
  cardBorderRadius: number;
  cardMaxWidth: number;
  cardShadow: boolean;
}

const DEFAULT_EMAIL_DESIGN: EmailTemplateDesign = {
  headerGradientStart: '#dc2626',
  headerGradientEnd: '#991b1b',
  headerTitle: 'Feuerwehr Bestellsystem',
  headerSubtitle: 'Automatische Benachrichtigung',
  showHeaderIcon: true,
  headerIconType: 'emoji',
  headerIconEmoji: '🔥',
  headerLogoUrl: '',
  contentBgColor: '#ffffff',
  contentTextColor: '#374151',
  contentFontSize: 15,
  contentPadding: 32,
  greetingText: 'Mit freundlichen Grüßen,',
  signatureText: 'Ihr Feuerwehr-Team',
  buttonGradientStart: '#dc2626',
  buttonGradientEnd: '#b91c1c',
  buttonText: 'Zum Bestellsystem',
  buttonTextColor: '#ffffff',
  buttonBorderRadius: 6,
  footerBgColor: '#f9fafb',
  footerTextColor: '#9ca3af',
  footerLine1: 'Diese E-Mail wurde automatisch generiert.',
  footerLine2: 'Bitte antworten Sie nicht direkt auf diese Nachricht.',
  copyrightText: '© Feuerwehr Bestellsystem',
  outerBgColor: '#f3f4f6',
  cardBorderRadius: 12,
  cardMaxWidth: 580,
  cardShadow: true,
};

async function getEmailDesign(supabase: ReturnType<typeof createClient>): Promise<EmailTemplateDesign> {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'email_template_design')
    .single();
  
  if (data?.value) {
    try {
      const savedDesign = JSON.parse(data.value) as Partial<EmailTemplateDesign>;
      return { ...DEFAULT_EMAIL_DESIGN, ...savedDesign };
    } catch {
      return DEFAULT_EMAIL_DESIGN;
    }
  }
  return DEFAULT_EMAIL_DESIGN;
}

function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  return result;
}

async function getEmailTemplates(supabase: ReturnType<typeof createClient>): Promise<Record<string, EmailTemplate>> {
  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .like('key', 'email_template_%');

  const templates: Record<string, EmailTemplate> = {};
  
  if (data) {
    // Group by template type
    const templateTypes = [
      'new_order_bereichsleiter', 
      'new_order_kommandant',
      'new_order_kommandomitglied',
      'approval', 
      'final_approval', 
      'rejection',
      'rejection_schriftfuehrer',
      'kommando_decision_kassier',
      'kommando_decision_schriftfuehrer',
      'reset_to_draft', 
      'new_user', 
      'password_reset',
      'new_supplier_pending',
      'supplier_approved',
      'supplier_rejected',
      'task_assigned',
      'step_assigned'
    ];
    
    for (const type of templateTypes) {
      const subjectKey = `email_template_${type}_subject`;
      const bodyKey = `email_template_${type}_body`;
      
      const subjectSetting = data.find(s => s.key === subjectKey);
      const bodySetting = data.find(s => s.key === bodyKey);
      
      templates[type] = {
        subject: subjectSetting?.value || '',
        body: bodySetting?.value || ''
      };
    }
  }
  
  return templates;
}

function getDefaultTemplate(type: string): EmailTemplate {
  const defaults: Record<string, EmailTemplate> = {
    new_order_bereichsleiter: {
      subject: 'Neue Bestellung zur Freigabe: {{orderTitle}}',
      body: '<h2 style="color: #ea580c;">Neue Bestellung zur Freigabe</h2><p>Hallo {{recipientName}},</p><p>Eine neue Bestellung wartet auf Ihre Freigabe.</p><div style="background: #fff7ed; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ea580c;"><p><strong>Bestellung:</strong> {{orderTitle}}</p><p><strong>Eingereicht von:</strong> {{creatorName}}</p></div><p>Bitte melden Sie sich im FFM-Portal an, um die Bestellung zu prüfen.</p>'
    },
    new_order_kommandant: {
      subject: 'Bestellung erfordert Ihre Freigabe: {{orderTitle}}',
      body: '<h2 style="color: #dc2626;">Neue Bestellung erfordert Ihre Freigabe</h2><p>Hallo {{recipientName}},</p><p>Eine Bestellung wartet auf Ihre Freigabe.</p><div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #dc2626;"><p><strong>Bestellung:</strong> {{orderTitle}}</p></div><p>Bitte melden Sie sich im FFM-Portal an, um die Bestellung zu prüfen.</p>'
    },
    new_order_kommandomitglied: {
      subject: 'Freigabe einer Bestellung durch Kommandomitglieder: {{orderTitle}}',
      body: '<h2 style="color: #7c3aed;">Abstimmung erforderlich</h2><p>Hallo {{recipientName}},</p><p>Eine Bestellung erfordert die Abstimmung aller Kommandomitglieder.</p><div style="background: #f5f3ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #7c3aed;"><p><strong>Bestellung:</strong> {{orderTitle}}</p><p><strong>Betrag:</strong> {{orderAmount}}</p><p><strong>Eingereicht von:</strong> {{creatorName}}</p></div><p>Bitte melden Sie sich im FFM-Portal an und geben Sie Ihre Stimme ab. Die Bestellung wird bei einfacher Mehrheit genehmigt oder abgelehnt.</p>'
    },
    approval: {
      subject: 'Bestellung freigegeben: {{orderTitle}}',
      body: '<h2 style="color: #16a34a;">Bestellung freigegeben</h2><p>Hallo {{creatorName}},</p><p>Ihre Bestellung wurde freigegeben.</p><div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;"><p><strong>Bestellung:</strong> {{orderTitle}}</p><p><strong>Betrag:</strong> {{orderAmount}}</p><p><strong>Freigegeben von:</strong> {{approverName}} ({{approverRole}})</p></div><p>Die Bestellung wartet ggf. noch auf weitere Freigaben.</p>'
    },
    final_approval: {
      subject: 'Bestellung genehmigt: {{orderTitle}}',
      body: '<h2 style="color: #16a34a;">Bestellung genehmigt</h2><p>Hallo {{creatorName}},</p><p>Ihre Bestellung wurde endgültig genehmigt.</p><div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #16a34a;"><p><strong>Bestellung:</strong> {{orderTitle}}</p><p><strong>Betrag:</strong> {{orderAmount}}</p><p><strong>Genehmigt von:</strong> {{approverName}} ({{approverRole}})</p></div><p style="color: #16a34a; font-weight: bold;">Die Bestellung kann nun ausgeführt werden.</p>'
    },
    rejection: {
      subject: 'Bestellung abgelehnt: {{orderTitle}}',
      body: '<h2 style="color: #dc2626;">Bestellung abgelehnt</h2><p>Hallo {{creatorName}},</p><p>Ihre Bestellung wurde leider abgelehnt.</p><div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #dc2626;"><p><strong>Bestellung:</strong> {{orderTitle}}</p><p><strong>Betrag:</strong> {{orderAmount}}</p><p><strong>Abgelehnt von:</strong> {{approverName}} ({{approverRole}})</p><p><strong>Grund:</strong> {{rejectionReason}}</p></div><p>Bei Fragen wenden Sie sich bitte an Ihren Vorgesetzten.</p>'
    },
    reset_to_draft: {
      subject: 'Bestellung zurückgesetzt: {{orderTitle}}',
      body: '<h2 style="color: #f59e0b;">Bestellung auf Entwurf zurückgesetzt</h2><p>Hallo {{creatorName}},</p><p>Ihre Bestellung wurde auf Entwurf zurückgesetzt und muss erneut eingereicht werden.</p><div style="background: #fffbeb; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f59e0b;"><p><strong>Bestellung:</strong> {{orderTitle}}</p><p><strong>Betrag:</strong> {{orderAmount}}</p><p><strong>Zurückgesetzt von:</strong> {{approverName}} ({{approverRole}})</p><p><strong>Grund:</strong> {{resetReason}}</p></div><p>Bitte überarbeiten Sie die Bestellung und reichen Sie sie erneut ein.</p>'
    },
    new_user: {
      subject: 'Willkommen im FFM-Portal',
      body: '<h2 style="color: #16a34a;">Ihr Benutzerkonto wurde erstellt</h2><p>Hallo {{userName}},</p><p>Ein Benutzerkonto wurde für Sie im FFM-Portal angelegt.</p><div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #16a34a;"><p><strong>E-Mail:</strong> {{userEmail}}</p><p><strong>Passwort:</strong> {{userPassword}}</p></div><p style="color: #dc2626;"><strong>Wichtig:</strong> Bitte ändern Sie Ihr Passwort nach der ersten Anmeldung.</p>'
    },
    password_reset: {
      subject: 'Neues Passwort für das FFM-Portal',
      body: '<h2 style="color: #3b82f6;">Neues Passwort</h2><p>Hallo {{userName}},</p><p>Ihr Passwort wurde zurückgesetzt.</p><div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6;"><p><strong>E-Mail:</strong> {{userEmail}}</p><p><strong>Neues Passwort:</strong> {{userPassword}}</p></div><p style="color: #dc2626;"><strong>Wichtig:</strong> Bitte ändern Sie Ihr Passwort nach der Anmeldung.</p>'
    },
    new_supplier_pending: {
      subject: 'Neuer Lieferant wartet auf Genehmigung: {{supplierName}}',
      body: '<h2 style="color: #f59e0b;">Neuer Lieferant zur Genehmigung</h2><p>Hallo,</p><p>Ein neuer Lieferant wurde angelegt und wartet auf Ihre Genehmigung.</p><div style="background: #fffbeb; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f59e0b;"><p><strong>Lieferant:</strong> {{supplierName}}</p><p><strong>Angelegt von:</strong> {{creatorName}}</p></div><p>Bitte melden Sie sich im FFM-Portal an, um den Lieferanten zu prüfen.</p>'
    },
    supplier_approved: {
      subject: 'Lieferant genehmigt: {{supplierName}}',
      body: '<h2 style="color: #16a34a;">Lieferant genehmigt</h2><p>Hallo {{creatorName}},</p><p>Ihr angelegter Lieferant wurde genehmigt und ist jetzt sichtbar.</p><div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #16a34a;"><p><strong>Lieferant:</strong> {{supplierName}}</p><p><strong>Genehmigt von:</strong> {{approverName}}</p></div>'
    },
    supplier_rejected: {
      subject: 'Lieferant abgelehnt: {{supplierName}}',
      body: '<h2 style="color: #dc2626;">Lieferant abgelehnt</h2><p>Hallo {{creatorName}},</p><p>Ihr angelegter Lieferant wurde leider abgelehnt.</p><div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #dc2626;"><p><strong>Lieferant:</strong> {{supplierName}}</p><p><strong>Abgelehnt von:</strong> {{approverName}}</p><p><strong>Grund:</strong> {{rejectionReason}}</p></div>'
    },
    rejection_schriftfuehrer: {
      subject: 'Bestellung abgelehnt - Protokoll: {{orderTitle}}',
      body: '<h2 style="color: #dc2626;">Bestellung abgelehnt</h2><p>Folgende Bestellung wurde abgelehnt und ist zur Protokollierung bestimmt.</p><div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #dc2626;"><p><strong>Bestellung:</strong> {{orderTitle}}</p><p><strong>Betrag:</strong> {{orderAmount}}</p><p><strong>Erstellt von:</strong> {{creatorName}}</p><p><strong>Abgelehnt von:</strong> {{approverName}} ({{approverRole}})</p><p><strong>Grund:</strong> {{rejectionReason}}</p></div><div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;"><h3 style="margin-top: 0;">Abstimmungsergebnis</h3>{{votingResults}}</div><p>Diese Bestellung ist nun für weitere Bearbeitung gesperrt.</p>'
    },
    kommando_decision_kassier: {
      subject: 'Kommando-Entscheidung: {{orderTitle}} - {{decision}}',
      body: '<h2 style="color: #7c3aed;">Kommando-Entscheidung</h2><p>Folgende Bestellung wurde durch die Kommando-Abstimmung {{decision}}.</p><div style="background: #f5f3ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #7c3aed;"><p><strong>Bestellung:</strong> {{orderTitle}}</p><p><strong>Betrag:</strong> {{orderAmount}}</p><p><strong>Erstellt von:</strong> {{creatorName}}</p><p><strong>Entscheidungsart:</strong> {{decisionType}}</p><p><strong>Entscheidung durch:</strong> {{approverName}}</p></div><div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;"><h3 style="margin-top: 0;">Abstimmungsergebnis</h3>{{votingResults}}</div>'
    },
    kommando_decision_schriftfuehrer: {
      subject: 'Kommando-Entscheidung für Schriftführer: {{orderTitle}} - {{decision}}',
      body: '<h2 style="color: #7c3aed;">Kommando-Entscheidung für Schriftführer</h2><p>Folgende Bestellung wurde durch die Kommando-Abstimmung für Schriftführer {{decision}}.</p><div style="background: #f5f3ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #7c3aed;"><p><strong>Bestellung:</strong> {{orderTitle}}</p><p><strong>Betrag:</strong> {{orderAmount}}</p><p><strong>Erstellt von:</strong> {{creatorName}}</p><p><strong>Entscheidungsart:</strong> {{decisionType}}</p><p><strong>Entscheidung durch:</strong> {{approverName}}</p></div><div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;"><h3 style="margin-top: 0;">Abstimmungsergebnis</h3>{{votingResults}}</div>'
    },
    test_email: {
      subject: 'Test-E-Mail: {{testRecipientRole}}',
      body: '<h2 style="color: #16a34a;">Test-E-Mail</h2><p>Hallo {{testRecipientName}},</p><p>Diese E-Mail ist ein Test.</p><div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #16a34a;"><p><strong>Von:</strong> {{creatorName}} ({{creatorEmail}})</p><p><strong>An:</strong> {{testRecipientName}} ({{testRecipientEmail}})</p></div><p style="color: #dc2626;"><strong>Wichtig:</strong> Dies ist nur ein Test.</p>'
    },
    task_assigned: {
      subject: 'Neue Aufgabe zugewiesen: {{taskTitle}}',
      body: '<h2 style="color: #3b82f6;">Neue Aufgabe für Sie</h2><p>Hallo {{recipientName}},</p><p>Ihnen wurde eine neue Aufgabe zugewiesen.</p><div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6;"><p><strong>Aufgabe:</strong> {{taskTitle}}</p><p><strong>Zeitraum:</strong> {{taskStartDate}} - {{taskEndDate}}</p><p><strong>Priorität:</strong> {{taskPriority}}</p><p><strong>Zugewiesen von:</strong> {{assignerName}}</p></div><p>Bitte melden Sie sich im FFM-Portal an, um die Aufgabe einzusehen.</p>'
    },
    step_assigned: {
      subject: 'Neuer Unterschritt zugewiesen: {{stepTitle}}',
      body: '<h2 style="color: #8b5cf6;">Neuer Unterschritt für Sie</h2><p>Hallo {{recipientName}},</p><p>Ihnen wurde ein Unterschritt zugewiesen.</p><div style="background: #f5f3ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #8b5cf6;"><p><strong>Unterschritt:</strong> {{stepTitle}}</p><p><strong>Aufgabe:</strong> {{taskTitle}}</p><p><strong>Zugewiesen von:</strong> {{assignerName}}</p></div><p>Bitte melden Sie sich im FFM-Portal an, um den Unterschritt zu bearbeiten.</p>'
    },
    task_deadline_reminder: {
      subject: 'Erinnerung: Frist läuft ab - {{taskTitle}}',
      body: '<h2 style="color: #f59e0b;">Frist-Erinnerung</h2><p>Hallo {{recipientName}},</p><p>Dies ist eine Erinnerung, dass die Frist für eine Aufgabe bald abläuft.</p><div style="background: #fffbeb; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f59e0b;"><p><strong>Aufgabe:</strong> {{taskTitle}}</p><p><strong>Frist:</strong> {{taskEndDate}}</p><p><strong>Erinnerung von:</strong> {{senderName}}</p></div><p style="color: #dc2626;"><strong>Bitte schließen Sie Ihre offenen Schritte zeitnah ab.</strong></p><p>Melden Sie sich im FFM-Portal an, um die Aufgabe einzusehen.</p>'
    },
    order_escalation: {
      subject: 'Automatische Eskalation: {{orderTitle}} - Bereichsleiter nicht verfügbar',
      body: '<h2 style="color: #dc2626;">Automatische Eskalation</h2><p>Hallo {{recipientName}},</p><p>Die folgende Bestellung wurde automatisch an Sie eskaliert, da der zuständige Bereichsleiter nicht innerhalb der Frist reagiert hat.</p><div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #dc2626;"><p><strong>Bestellung:</strong> {{orderTitle}}</p><p><strong>Betrag:</strong> {{orderAmount}}</p><p><strong>Erstellt von:</strong> {{creatorName}}</p><p><strong>Bereichsleiter:</strong> {{bereichsleiterName}}</p><p><strong>Wartezeit überschritten:</strong> {{timeoutHours}} Stunden</p></div><p style="color: #dc2626;"><strong>Bitte prüfen Sie diese Bestellung umgehend.</strong></p><p>Melden Sie sich im FFM-Portal an, um die Bestellung zu bearbeiten.</p>'
    },
    new_command_decision: {
      subject: 'Neue Kommandoabstimmung: {{decisionTitle}}',
      body: '<h2 style="color: #7c3aed;">Abstimmung erforderlich</h2><p>Hallo {{recipientName}},</p><p>Ein neuer Antrag wurde zur Abstimmung eingereicht und erfordert Ihre Stimme.</p><div style="background: #f5f3ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #7c3aed;"><p><strong>Antrag:</strong> {{decisionTitle}}</p><p><strong>Referenznummer:</strong> {{referenceNumber}}</p><p><strong>Eingereicht von:</strong> {{creatorName}}</p></div><p>Bitte melden Sie sich im System an und geben Sie Ihre Stimme ab. Der Antrag wird bei einfacher Mehrheit genehmigt oder abgelehnt.</p>'
    },
    min_order_request: {
      subject: 'Neue Sonderfreigabe-Anfrage unter Mindestbestellwert',
      body: '<h2 style="color: #9333ea;">Neue Sonderfreigabe-Anfrage</h2><p>Hallo {{recipientName}},</p><p>{{requesterName}} hat eine Sonderfreigabe für Bestellungen unter dem Mindestbestellwert angefragt.</p><div style="background: #faf5ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #9333ea;"><p><strong>Lieferant:</strong> {{supplierName}}</p><p><strong>Begründung:</strong> {{reason}}</p></div><p>Bitte melden Sie sich im FFM-Portal an, um die Anfrage zu prüfen und zu genehmigen oder abzulehnen.</p>'
    },
    min_order_approved: {
      subject: 'Sonderfreigabe genehmigt: {{supplierName}}',
      body: '<h2 style="color: #16a34a;">Sonderfreigabe genehmigt</h2><p>Hallo {{recipientName}},</p><p>Ihre Anfrage zur Sonderfreigabe wurde genehmigt.</p><div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #16a34a;"><p><strong>Lieferant:</strong> {{supplierName}}</p></div><p style="color: #16a34a; font-weight: bold;">Sie können nun Bestellungen bei diesem Lieferanten auch unter dem Mindestbestellwert aufgeben.</p>'
    },
    min_order_rejected: {
      subject: 'Sonderfreigabe abgelehnt: {{supplierName}}',
      body: '<h2 style="color: #dc2626;">Sonderfreigabe abgelehnt</h2><p>Hallo {{recipientName}},</p><p>Ihre Anfrage zur Sonderfreigabe wurde leider abgelehnt.</p><div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #dc2626;"><p><strong>Lieferant:</strong> {{supplierName}}</p><p><strong>Begründung:</strong> {{rejectionReason}}</p></div>'
    },
    payment_order_submitted: {
      subject: 'Neue Auszahlungsanweisung zur Genehmigung: {{referenceNumber}}',
      body: '<h2 style="color: #3b82f6;">Neue Auszahlungsanweisung</h2><p>Hallo {{recipientName}},</p><p>{{creatorName}} hat eine neue Auszahlungsanweisung eingereicht, die Ihre Genehmigung benötigt.</p><div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6;"><p><strong>Referenz:</strong> {{referenceNumber}}</p><p><strong>Betrag:</strong> {{orderAmount}} €</p><p><strong>Empfänger:</strong> {{recipientNameOrder}}</p><p><strong>Zweck:</strong> {{purpose}}</p></div><p>Bitte melden Sie sich im FFM-Portal an, um die Auszahlungsanweisung zu prüfen und zu genehmigen.</p>'
    },
    payment_order_approved: {
      subject: 'Auszahlungsanweisung genehmigt: {{referenceNumber}}',
      body: '<h2 style="color: #16a34a;">Auszahlungsanweisung genehmigt</h2><p>Hallo {{recipientName}},</p><p>Die folgende Auszahlungsanweisung wurde von {{approverName}} genehmigt und wartet auf Ihre Auszahlung.</p><div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #16a34a;"><p><strong>Referenz:</strong> {{referenceNumber}}</p><p><strong>Betrag:</strong> {{orderAmount}} €</p><p><strong>Empfänger:</strong> {{recipientNameOrder}}</p><p><strong>Zweck:</strong> {{purpose}}</p></div><p style="color: #16a34a; font-weight: bold;">Bitte führen Sie die Auszahlung durch und markieren Sie diese im System als "Ausgezahlt".</p>'
    },
    new_command_decision: {
      subject: 'Neue Kommandoabstimmung: {{decisionTitle}}',
      body: '<h2 style="color: #7c3aed;">Kommandoabstimmung erforderlich</h2><p>Hallo {{recipientName}},</p><p>Ein neuer Antrag wurde zur Abstimmung eingereicht und erfordert Ihre Stimme.</p><div style="background: #f5f3ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #7c3aed;"><p><strong>Referenz:</strong> {{referenceNumber}}</p><p><strong>Titel:</strong> {{decisionTitle}}</p><p><strong>Eingereicht von:</strong> {{creatorName}}</p></div><p>Bitte melden Sie sich im System an und geben Sie Ihre Stimme ab. Die Entscheidung wird bei einfacher Mehrheit getroffen.</p>'
    },
    command_decision_result: {
      subject: 'Kommandoabstimmung abgeschlossen: {{decisionTitle}} - {{decision}}',
      body: '<h2 style="color: #7c3aed;">Kommandoabstimmung abgeschlossen</h2><p>Hallo {{recipientName}},</p><p>Die Abstimmung zum folgenden Antrag wurde abgeschlossen.</p><div style="background: #f5f3ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #7c3aed;"><p><strong>Referenz:</strong> {{referenceNumber}}</p><p><strong>Titel:</strong> {{decisionTitle}}</p><p><strong>Ergebnis:</strong> <strong style="color: {{resultColor}};">{{decision}}</strong></p></div><div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;"><h3 style="margin-top: 0;">Abstimmungsergebnis</h3>{{votingResults}}</div>'
    },
    event_participation_submitted: {
      subject: 'Neue Veranstaltungsteilnahme zur Genehmigung: {{referenceNumber}}',
      body: '<h2 style="color: #8b5cf6;">Neue Veranstaltungsteilnahme</h2><p>Hallo {{recipientName}},</p><p>{{creatorName}} hat einen Antrag auf Veranstaltungsteilnahme eingereicht.</p><div style="background: #f5f3ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #8b5cf6;"><p><strong>Referenz:</strong> {{referenceNumber}}</p><p><strong>Veranstaltung:</strong> {{eventName}}</p><p><strong>Datum:</strong> {{eventDate}}</p><p><strong>Geschätzte Kosten:</strong> {{estimatedCosts}} €</p></div><p>Bitte melden Sie sich im FFM-Portal an, um den Antrag zu prüfen und zu genehmigen.</p>'
    },
    event_participation_approved: {
      subject: 'Veranstaltungsteilnahme genehmigt: {{referenceNumber}}',
      body: '<h2 style="color: #16a34a;">Veranstaltungsteilnahme genehmigt</h2><p>Hallo {{recipientName}},</p><p>Ihr Antrag auf Veranstaltungsteilnahme wurde von {{approverName}} genehmigt.</p><div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #16a34a;"><p><strong>Referenz:</strong> {{referenceNumber}}</p><p><strong>Veranstaltung:</strong> {{eventName}}</p><p><strong>Datum:</strong> {{eventDate}}</p></div><p style="color: #16a34a; font-weight: bold;">Viel Erfolg bei der Veranstaltung!</p>'
    },
    event_participation_rejected: {
      subject: 'Veranstaltungsteilnahme abgelehnt: {{referenceNumber}}',
      body: '<h2 style="color: #dc2626;">Veranstaltungsteilnahme abgelehnt</h2><p>Hallo {{recipientName}},</p><p>Ihr Antrag auf Veranstaltungsteilnahme wurde von {{rejecterName}} leider abgelehnt.</p><div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #dc2626;"><p><strong>Referenz:</strong> {{referenceNumber}}</p><p><strong>Veranstaltung:</strong> {{eventName}}</p><p><strong>Begründung:</strong> {{rejectionReason}}</p></div>'
    },
    event_participation_reapproval_required: {
      subject: 'Erneute Genehmigung erforderlich: {{referenceNumber}}',
      body: '<h2 style="color: #f59e0b;">Erneute Genehmigung erforderlich</h2><p>Hallo {{recipientName}},</p><p>Der Kassier hat den Auszahlungsbetrag für eine Veranstaltungsteilnahme erhöht. Eine erneute Genehmigung ist erforderlich.</p><div style="background: #fffbeb; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f59e0b;"><p><strong>Referenz:</strong> {{referenceNumber}}</p><p><strong>Veranstaltung:</strong> {{eventName}}</p><p><strong>Ursprünglicher Betrag:</strong> {{originalAmount}} €</p><p><strong>Neuer Betrag:</strong> {{newAmount}} €</p><p><strong>Grund:</strong> {{changeReason}}</p><p><strong>Geändert von:</strong> {{kassierName}}</p></div><p style="color: #f59e0b; font-weight: bold;">Bitte prüfen Sie die Änderung und genehmigen Sie erneut.</p>'
    },
    event_participation_amount_changed: {
      subject: 'Betrag geändert: {{referenceNumber}}',
      body: '<h2 style="color: #3b82f6;">Betrag geändert</h2><p>Hallo {{recipientName}},</p><p>Der Kassier hat den Auszahlungsbetrag für Ihre Veranstaltungsteilnahme angepasst.</p><div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6;"><p><strong>Referenz:</strong> {{referenceNumber}}</p><p><strong>Veranstaltung:</strong> {{eventName}}</p><p><strong>Ursprünglicher Betrag:</strong> {{originalAmount}} €</p><p><strong>Neuer Betrag:</strong> {{newAmount}} €</p><p><strong>Grund:</strong> {{changeReason}}</p><p><strong>Geändert von:</strong> {{kassierName}}</p></div>'
    },
    approval_reminder: {
      subject: 'Erinnerung: {{orderCount}} offene Genehmigung{{orderCount > 1 ? "en" : ""}} warten auf Sie',
      body: '<h2 style="color: #f59e0b;">Offene Genehmigungen</h2><p>Hallo {{recipientName}},</p><p>Sie haben <strong>{{orderCount}} Bestellung{{orderCount > 1 ? "en" : ""}}</strong> zur Freigabe offen (Gesamt: {{totalAmount}} €).</p><div style="background: #fffbeb; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f59e0b;"><p><strong>Offene Bestellungen:</strong></p><ul>{{orderListHtml}}</ul></div><p style="color: #f59e0b;"><strong>Bitte prüfen und genehmigen Sie diese Bestellungen zeitnah.</strong></p><p>Melden Sie sich im FFM-Portal an, um die Bestellungen zu bearbeiten.</p>'
    }
  };
  
  return defaults[type] || { subject: '', body: '' };
}

async function sendEmail(email: EmailRequest): Promise<boolean> {
  const apiKey = Deno.env.get('SMTP2GO_API_KEY');
  const fromEmail = Deno.env.get('SMTP2GO_FROM_EMAIL') || 'noreply@example.com';
  const fromName = Deno.env.get('SMTP2GO_FROM_NAME') || 'FFM-Portal';

  if (!apiKey) {
    console.error('SMTP2GO_API_KEY nicht konfiguriert');
    return false;
  }

  try {
    const emailPayload: Record<string, unknown> = {
      api_key: apiKey,
      sender: `${fromName} <${fromEmail}>`,
      to: email.to,
      subject: email.subject,
      html_body: email.html,
    };

    // Add CC if provided
    if (email.cc && email.cc.length > 0) {
      emailPayload.cc = email.cc;
    }

    const response = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();
    
    if (!response.ok || result.data?.error) {
      console.error('SMTP2GO Fehler:', result);
      return false;
    }

    console.log('E-Mail gesendet:', result);
    return true;
  } catch (error) {
    console.error('Fehler beim E-Mail-Versand:', error);
    return false;
  }
}

function wrapEmailHtml(content: string, homepageUrl: string | undefined, design: EmailTemplateDesign): string {
  const homepageButton = homepageUrl 
    ? `<a href="${homepageUrl}" style="display: inline-block; background: linear-gradient(135deg, ${design.buttonGradientStart} 0%, ${design.buttonGradientEnd} 100%); color: ${design.buttonTextColor}; text-decoration: none; padding: 12px 24px; border-radius: ${design.buttonBorderRadius}px; font-weight: 600; font-size: 14px; margin-top: 8px;">${design.buttonText} &rarr;</a>` 
    : '';
  
  const shadowStyle = design.cardShadow 
    ? 'box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);' 
    : '';

  // Build header icon HTML based on type
  let headerIconContent = '';
  if (design.showHeaderIcon) {
    if (design.headerIconType === 'logo' && design.headerLogoUrl) {
      headerIconContent = `<img src="${design.headerLogoUrl}" alt="Logo" style="width: 24px; height: 24px; object-fit: contain;" />`;
    } else {
      headerIconContent = `<span style="font-size: 20px;">${design.headerIconEmoji || '🔥'}</span>`;
    }
  }

  const headerIcon = design.showHeaderIcon 
    ? `<td style="background-color: rgba(255,255,255,0.2); border-radius: 8px; width: 40px; height: 40px; text-align: center; vertical-align: middle;">
        ${headerIconContent}
      </td>
      <td style="padding-left: 12px;">` 
    : '<td>';

  const headerIconClose = design.showHeaderIcon ? '</td>' : '</td>';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: ${design.outerBgColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${design.outerBgColor}; padding: 32px 16px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: ${design.cardMaxWidth}px; background-color: ${design.contentBgColor}; border-radius: ${design.cardBorderRadius}px; overflow: hidden; ${shadowStyle}">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, ${design.headerGradientStart} 0%, ${design.headerGradientEnd} 100%); padding: 24px 32px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <table cellpadding="0" cellspacing="0">
                          <tr>
                            ${headerIcon}
                              <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 700;">${design.headerTitle}</p>
                              <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.8); font-size: 13px;">${design.headerSubtitle}</p>
                            ${headerIconClose}
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: ${design.contentPadding}px; color: ${design.contentTextColor}; font-size: ${design.contentFontSize}px; line-height: 1.6;">
                  ${content}
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                    <tr>
                      <td>
                        <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">${design.greetingText || 'Mit freundlichen Grüßen,'}<br><strong style="color: ${design.contentTextColor};">${design.signatureText || 'Ihr Feuerwehr-Team'}</strong></p>
                        ${homepageButton}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: ${design.footerBgColor}; padding: 20px 32px; border-top: 1px solid #e5e7eb;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="color: ${design.footerTextColor}; font-size: 12px;">
                        <p style="margin: 0;">${design.footerLine1}</p>
                        <p style="margin: 4px 0 0 0;">${design.footerLine2}</p>
                      </td>
                      <td style="text-align: right; color: ${design.footerTextColor}; font-size: 12px;">
                        <p style="margin: 0;">${design.copyrightText}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

Deno.serve(async (req: Request) => {
  // CORS Headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const payload: NotificationPayload = await req.json();
    
    console.log('Received payload:', JSON.stringify(payload));
    
    // Initialize Supabase client to fetch templates
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch email templates from database
    const templates = await getEmailTemplates(supabase);
    
    // Fetch email design settings
    const emailDesign = await getEmailDesign(supabase);
    
    // Fetch homepage URL from settings
    const { data: homepageData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'system_homepage_url')
      .single();
    const homepageUrl = homepageData?.value || '';
    
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR'
      }).format(amount);
    };

    // Common variables for all templates
    const variables: Record<string, string> = {
      orderTitle: payload.orderTitle || '',
      orderAmount: formatCurrency(payload.orderAmount || 0),
      creatorName: payload.creatorName || '',
      creatorEmail: payload.creatorEmail || '',
      approverName: payload.approvalName || '',
      approverRole: payload.approvalRole || '',
      recipientName: payload.recipientName || '',
      rejectionReason: payload.rejectionReason || 'Kein Grund angegeben',
      resetReason: payload.resetReason || 'Kein Grund angegeben',
      userName: payload.userName || '',
      userEmail: payload.userEmail || '',
      userPassword: payload.userPassword || '',
      supplierName: payload.supplierName || '',
      homepageUrl: homepageUrl,
      testRecipientEmail: payload.testRecipientEmail || '',
      testRecipientName: payload.recipientName || '',
      testRecipientRole: payload.testRecipientRole || ''
    };

    const emailPromises: Promise<boolean>[] = [];

    // E-Mail an Bereichsleiter bei neuer Bestellung
    if (payload.type === 'new_order_bereichsleiter' && payload.recipientEmail) {
      const template = templates.new_order_bereichsleiter?.subject 
        ? templates.new_order_bereichsleiter 
        : getDefaultTemplate('new_order_bereichsleiter');
      
      const subject = replaceVariables(template.subject, variables);
      const html = wrapEmailHtml(replaceVariables(template.body, variables), homepageUrl, emailDesign);

      emailPromises.push(
        sendEmail({
          to: [payload.recipientEmail],
          subject,
          html,
        })
      );
    }

    // E-Mail an Kommandant bei neuer Bestellung (hoher Betrag)
    if (payload.type === 'new_order_kommandant' && payload.recipientEmail) {
      const template = templates.new_order_kommandant?.subject 
        ? templates.new_order_kommandant 
        : getDefaultTemplate('new_order_kommandant');
      
      const subject = replaceVariables(template.subject, variables);
      const html = wrapEmailHtml(replaceVariables(template.body, variables), homepageUrl, emailDesign);

      emailPromises.push(
        sendEmail({
          to: [payload.recipientEmail],
          subject,
          html,
        })
      );
    }

    // E-Mail an Kommandomitglieder bei neuer Bestellung (sehr hoher Betrag)
    if (payload.type === 'new_order_kommandomitglied' && payload.recipientEmails && payload.recipientEmails.length > 0) {
      const template = templates.new_order_kommandomitglied?.subject 
        ? templates.new_order_kommandomitglied 
        : getDefaultTemplate('new_order_kommandomitglied');
      
      const subject = replaceVariables(template.subject, variables);
      const html = wrapEmailHtml(replaceVariables(template.body, variables), homepageUrl, emailDesign);

      // Send to all Kommandomitglieder
      for (const email of payload.recipientEmails) {
        emailPromises.push(
          sendEmail({
            to: [email],
            subject,
            html,
          })
        );
      }
    }

    // E-Mail an Kommandomitglieder bei neuer Kommandoabstimmung
    if (payload.type === 'new_command_decision' && payload.recipientEmails && payload.recipientEmails.length > 0) {
      const template = templates.new_command_decision?.subject 
        ? templates.new_command_decision 
        : getDefaultTemplate('new_command_decision');
      
      // Add decision-specific variables
      const decisionVariables = {
        ...variables,
        decisionTitle: payload.decisionTitle || '',
        decisionDescription: payload.decisionDescription || '',
      };
      
      const subject = replaceVariables(template.subject, decisionVariables);
      const html = wrapEmailHtml(replaceVariables(template.body, decisionVariables), homepageUrl, emailDesign);

      // Send to all Kommandomitglieder
      for (const email of payload.recipientEmails) {
        emailPromises.push(
          sendEmail({
            to: [email],
            subject,
            html,
          })
        );
      }
    }

    // E-Mail an Ersteller bei jeder Freigabe
    if ((payload.type === 'approval' || payload.type === 'final_approval') && payload.creatorEmail) {
      const templateType = payload.type;
      const template = templates[templateType]?.subject 
        ? templates[templateType] 
        : getDefaultTemplate(templateType);
      
      const subject = replaceVariables(template.subject, variables);
      const html = wrapEmailHtml(replaceVariables(template.body, variables), homepageUrl, emailDesign);

      emailPromises.push(
        sendEmail({
          to: [payload.creatorEmail],
          subject,
          html,
        })
      );
    }

    // E-Mail bei Ablehnung
    if (payload.type === 'rejection' && payload.creatorEmail) {
      const template = templates.rejection?.subject 
        ? templates.rejection 
        : getDefaultTemplate('rejection');
      
      const subject = replaceVariables(template.subject, variables);
      const html = wrapEmailHtml(replaceVariables(template.body, variables), homepageUrl, emailDesign);

      emailPromises.push(
        sendEmail({
          to: [payload.creatorEmail],
          subject,
          html,
        })
      );
    }

    // E-Mail an Schriftführer bei Ablehnung
    if (payload.type === 'rejection_schriftfuehrer' && payload.schriftfuehrerEmail) {
      const extendedVariables = {
        ...variables,
        votingResults: payload.votingResults || 'Keine Abstimmungsdaten verfügbar'
      };
      
      const template = templates.rejection_schriftfuehrer?.subject 
        ? templates.rejection_schriftfuehrer 
        : getDefaultTemplate('rejection_schriftfuehrer');
      
      const subject = replaceVariables(template.subject, extendedVariables);
      const html = wrapEmailHtml(replaceVariables(template.body, extendedVariables), homepageUrl, emailDesign);

      emailPromises.push(
        sendEmail({
          to: [payload.schriftfuehrerEmail],
          subject,
          html,
        })
      );
    }

    // E-Mail an Kassier bei Kommando-Entscheidung
    if (payload.type === 'kommando_decision_kassier' && payload.kassierEmail) {
      const extendedVariables = {
        ...variables,
        decision: payload.decision || 'entschieden',
        decisionType: payload.decisionType || 'Abstimmung',
        votingResults: payload.votingResults || 'Keine Abstimmungsdaten verfügbar'
      };
      
      const template = templates.kommando_decision_kassier?.subject 
        ? templates.kommando_decision_kassier 
        : getDefaultTemplate('kommando_decision_kassier');
      
      const subject = replaceVariables(template.subject, extendedVariables);
      const html = wrapEmailHtml(replaceVariables(template.body, extendedVariables), homepageUrl, emailDesign);

      emailPromises.push(
        sendEmail({
          to: [payload.kassierEmail],
          subject,
          html,
        })
      );
    }

    // E-Mail an Schriftführer bei Kommando-Entscheidung
    if (payload.type === 'kommando_decision_schriftfuehrer' && payload.schriftfuehrerEmail) {
      const extendedVariables = {
        ...variables,
        decision: payload.decision || 'entschieden',
        decisionType: payload.decisionType || 'Abstimmung',
        votingResults: payload.votingResults || 'Keine Abstimmungsdaten verfügbar'
      };
      
      const template = templates.kommando_decision_schriftfuehrer?.subject 
        ? templates.kommando_decision_schriftfuehrer 
        : getDefaultTemplate('kommando_decision_schriftfuehrer');
      
      const subject = replaceVariables(template.subject, extendedVariables);
      const html = wrapEmailHtml(replaceVariables(template.body, extendedVariables), homepageUrl, emailDesign);

      emailPromises.push(
        sendEmail({
          to: [payload.schriftfuehrerEmail],
          subject,
          html,
        })
      );
    }

    // E-Mail bei Zurücksetzung auf Entwurf
    if (payload.type === 'reset_to_draft' && payload.creatorEmail) {
      const template = templates.reset_to_draft?.subject 
        ? templates.reset_to_draft 
        : getDefaultTemplate('reset_to_draft');
      
      const subject = replaceVariables(template.subject, variables);
      const html = wrapEmailHtml(replaceVariables(template.body, variables), homepageUrl, emailDesign);

      emailPromises.push(
        sendEmail({
          to: [payload.creatorEmail],
          subject,
          html,
        })
      );
    }

    // E-Mail bei neuem Benutzer
    if (payload.type === 'new_user' && payload.userEmail) {
      const template = templates.new_user?.subject 
        ? templates.new_user 
        : getDefaultTemplate('new_user');
      
      const subject = replaceVariables(template.subject, variables);
      const html = wrapEmailHtml(replaceVariables(template.body, variables), homepageUrl, emailDesign);

      emailPromises.push(
        sendEmail({
          to: [payload.userEmail],
          subject,
          html,
        })
      );
    }

    // E-Mail bei Passwort-Zurücksetzung
    if (payload.type === 'password_reset' && payload.userEmail) {
      const template = templates.password_reset?.subject 
        ? templates.password_reset 
        : getDefaultTemplate('password_reset');
      
      const subject = replaceVariables(template.subject, variables);
      const html = wrapEmailHtml(replaceVariables(template.body, variables), homepageUrl, emailDesign);

      emailPromises.push(
        sendEmail({
          to: [payload.userEmail],
          subject,
          html,
        })
      );
    }

    // Zusätzliche E-Mail an Benachrichtigungs-Adresse bei endgültiger Freigabe
    if (payload.type === 'final_approval' && payload.notificationEmail) {
      const template = templates.final_approval?.subject 
        ? templates.final_approval 
        : getDefaultTemplate('final_approval');
      
      const subject = `Bestellung zur Ausführung: ${payload.orderTitle} - ${formatCurrency(payload.orderAmount || 0)}`;
      const html = wrapEmailHtml(`
        <h2 style="color: #16a34a;">Neue Bestellung genehmigt</h2>
        <p>Eine neue Bestellung wurde endgültig genehmigt und kann ausgeführt werden.</p>
        <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #16a34a;">
          <p><strong>Bestellung:</strong> ${payload.orderTitle}</p>
          <p><strong>Betrag:</strong> ${formatCurrency(payload.orderAmount || 0)}</p>
          <p><strong>Ersteller:</strong> ${payload.creatorName}</p>
          <p><strong>Genehmigt von:</strong> ${payload.approvalName} (${payload.approvalRole})</p>
        </div>
      `, homepageUrl, emailDesign);

      emailPromises.push(
        sendEmail({
          to: [payload.notificationEmail],
          subject,
          html,
        })
      );
    }

    // E-Mail an Admins/Kommandanten bei neuem Lieferanten
    if (payload.type === 'new_supplier_pending' && payload.recipientEmails && payload.recipientEmails.length > 0) {
      const template = templates.new_supplier_pending?.subject 
        ? templates.new_supplier_pending 
        : getDefaultTemplate('new_supplier_pending');
      
      const subject = replaceVariables(template.subject, variables);
      const html = wrapEmailHtml(replaceVariables(template.body, variables), homepageUrl, emailDesign);

      emailPromises.push(
        sendEmail({
          to: payload.recipientEmails,
          subject,
          html,
        })
      );
    }

    // E-Mail an Ersteller bei Lieferanten-Genehmigung
    if (payload.type === 'supplier_approved' && payload.creatorEmail) {
      const template = templates.supplier_approved?.subject 
        ? templates.supplier_approved 
        : getDefaultTemplate('supplier_approved');
      
      const subject = replaceVariables(template.subject, variables);
      const html = wrapEmailHtml(replaceVariables(template.body, variables), homepageUrl, emailDesign);

      emailPromises.push(
        sendEmail({
          to: [payload.creatorEmail],
          subject,
          html,
        })
      );
    }

    // E-Mail an Ersteller bei Lieferanten-Ablehnung
    if (payload.type === 'supplier_rejected' && payload.creatorEmail) {
      const template = templates.supplier_rejected?.subject 
        ? templates.supplier_rejected 
        : getDefaultTemplate('supplier_rejected');
      
      const subject = replaceVariables(template.subject, variables);
      const html = wrapEmailHtml(replaceVariables(template.body, variables), homepageUrl, emailDesign);

      emailPromises.push(
        sendEmail({
          to: [payload.creatorEmail],
          subject,
          html,
        })
      );
    }

    // Test-E-Mail
    if (payload.type === 'test_email' && payload.testRecipientEmail) {
      const template = getDefaultTemplate('test_email');
      
      const subject = replaceVariables(template.subject, variables);
      const html = wrapEmailHtml(replaceVariables(template.body, variables), homepageUrl, emailDesign);

      emailPromises.push(
        sendEmail({
          to: [payload.testRecipientEmail],
          subject,
          html,
        })
      );
    }

    // E-Mail bei Aufgaben-Zuweisung
    if (payload.type === 'task_assigned' && payload.recipientEmail) {
      const template = templates.task_assigned?.subject 
        ? templates.task_assigned 
        : getDefaultTemplate('task_assigned');
      
      const taskVariables = {
        ...variables,
        taskTitle: payload.taskTitle || '',
        taskDescription: payload.taskDescription || '',
        taskStartDate: payload.taskStartDate || '',
        taskEndDate: payload.taskEndDate || '',
        taskPriority: payload.taskPriority || '',
        assignerName: payload.assignerName || '',
      };
      
      const subject = replaceVariables(template.subject, taskVariables);
      const html = wrapEmailHtml(replaceVariables(template.body, taskVariables), homepageUrl, emailDesign);

      emailPromises.push(
        sendEmail({
          to: [payload.recipientEmail],
          subject,
          html,
        })
      );
    }

    // E-Mail bei Unterschritt-Zuweisung
    if (payload.type === 'step_assigned' && payload.recipientEmail) {
      const template = templates.step_assigned?.subject 
        ? templates.step_assigned 
        : getDefaultTemplate('step_assigned');
      
      const stepVariables = {
        ...variables,
        stepTitle: payload.stepTitle || '',
        taskTitle: payload.taskTitle || '',
        assignerName: payload.assignerName || '',
      };
      
      const subject = replaceVariables(template.subject, stepVariables);
      const html = wrapEmailHtml(replaceVariables(template.body, stepVariables), homepageUrl, emailDesign);

      emailPromises.push(
        sendEmail({
          to: [payload.recipientEmail],
          subject,
          html,
        })
      );
    }

    // E-Mail bei automatischer Eskalation an Kommandant
    if (payload.type === 'order_escalation' && payload.recipientEmail) {
      const template = getDefaultTemplate('order_escalation');
      
      const escalationVariables = {
        ...variables,
        bereichsleiterName: payload.bereichsleiterName || 'Unbekannt',
        timeoutHours: payload.timeoutHours || '24',
      };
      
      const subject = replaceVariables(template.subject, escalationVariables);
      const html = wrapEmailHtml(replaceVariables(template.body, escalationVariables), homepageUrl, emailDesign);

      emailPromises.push(
        sendEmail({
          to: [payload.recipientEmail],
          subject,
          html,
        })
      );
      
      console.log('Escalation email queued for:', payload.recipientEmail);
    }

    // Mitglieder-Einladung per E-Mail
    if (payload.type === 'member_invitation' && payload.recipientEmail) {
      const inviterName = payload.inviterName || 'Unbekannt';
      const cleanHomepageUrl = homepageUrl.replace(/\/$/, '');
      const registrationUrl = payload.registrationUrl || `${cleanHomepageUrl}/register`;
      
      // Use custom template from settings or default
      const defaultSubject = 'Dein Zugang zur FF Marchtrenk Plattform';
      const defaultBody = `Hallo,

hier ist dein Registrierungslink für das FFM-Portal:
👉 {registration_link}

Registriere dich mit deiner @feuerwehr-marchtrenk.at Adresse.

Als App installieren:
• iPhone: Safari → Teilen → "Zum Home-Bildschirm"
• Android: Chrome → Menü → "App installieren"

Eingeladen von: {inviter_name}

Grüße, FF Marchtrenk`;

      const subject = payload.customSubject || defaultSubject;
      let bodyText = payload.customBody || defaultBody;
      
      // Replace placeholders
      bodyText = bodyText
        .replace(/\{registration_link\}/g, registrationUrl)
        .replace(/\{inviter_name\}/g, inviterName);

      // Convert line breaks to HTML
      const bodyHtml = `
        <div style="white-space: pre-wrap; font-size: 15px; line-height: 1.6;">
          ${bodyText.replace(/\n/g, '<br>')}
        </div>
      `;
      const html = wrapEmailHtml(bodyHtml, homepageUrl, emailDesign);

      emailPromises.push(
        sendEmail({
          to: [payload.recipientEmail],
          subject,
          html,
        })
      );
      
      console.log('Member invitation email queued for:', payload.recipientEmail);
    }

    // Direkte Nachricht per E-Mail
    if (payload.type === 'direct_message' && payload.recipientEmails && payload.recipientEmails.length > 0) {
      const senderName = payload.senderName || 'Unbekannt';
      const senderEmail = payload.senderEmail || '';
      const messageContent = payload.messageContent || '';
      const messageHomepageUrl = payload.homepageUrl || homepageUrl;

      const subject = `Neue Nachricht von ${senderName}`;
      const bodyHtml = `
        <h2>Neue Nachricht</h2>
        <p><strong>Von:</strong> ${senderName}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="white-space: pre-wrap; margin: 0;">${messageContent}</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 14px;">
          Diese Nachricht wurde über das FFM-Portal gesendet.
        </p>
      `;
      const html = wrapEmailHtml(bodyHtml, messageHomepageUrl, emailDesign);

      // Send to all recipients with sender as CC
      const allRecipients = [...payload.recipientEmails];
      
      // Send main email to recipients
      emailPromises.push(
        sendEmail({
          to: allRecipients,
          subject,
          html,
          cc: senderEmail ? [senderEmail] : undefined,
        })
      );
    }

    // E-Mail bei neuer Auszahlungsanweisung (an Kommandant)
    if (payload.type === 'payment_order_submitted' && payload.recipientEmail) {
      const template = getDefaultTemplate('payment_order_submitted');
      const paymentVariables = {
        ...variables,
        referenceNumber: payload.referenceNumber || '',
        recipientNameOrder: payload.recipientNameOrder || '',
        purpose: payload.purpose || '',
        orderAmount: payload.amount?.toFixed(2) || '0.00',
      };
      const subject = replaceVariables(template.subject, paymentVariables);
      const bodyHtml = replaceVariables(template.body, paymentVariables);
      const html = wrapEmailHtml(bodyHtml, homepageUrl, emailDesign);
      
      emailPromises.push(sendEmail({ to: [payload.recipientEmail], subject, html }));

      // Create in-app notification
      if (payload.recipientId) {
        await supabase.from('notifications').insert({
          user_id: payload.recipientId,
          type: 'order',
          title: 'Neue Auszahlungsanweisung',
          message: `${payload.creatorName} hat eine Auszahlungsanweisung eingereicht (${payload.referenceNumber}, ${payload.amount?.toFixed(2)} \u20ac)`,
          data: { referenceNumber: payload.referenceNumber },
        });
      }
    }

    // E-Mail bei genehmigter Auszahlungsanweisung (an Kassier)
    if (payload.type === 'payment_order_approved' && payload.recipientEmail) {
      const template = getDefaultTemplate('payment_order_approved');
      const paymentVariables = {
        ...variables,
        referenceNumber: payload.referenceNumber || '',
        recipientNameOrder: payload.recipientNameOrder || '',
        purpose: payload.purpose || '',
        orderAmount: payload.amount?.toFixed(2) || '0.00',
      };
      const subject = replaceVariables(template.subject, paymentVariables);
      const bodyHtml = replaceVariables(template.body, paymentVariables);
      const html = wrapEmailHtml(bodyHtml, homepageUrl, emailDesign);
      
      emailPromises.push(sendEmail({ to: [payload.recipientEmail], subject, html }));

      // Create in-app notification
      if (payload.recipientId) {
        await supabase.from('notifications').insert({
          user_id: payload.recipientId,
          type: 'order',
          title: 'Auszahlungsanweisung genehmigt',
          message: `${payload.approverName} hat die Auszahlungsanweisung ${payload.referenceNumber} genehmigt (${payload.amount?.toFixed(2)} \u20ac)`,
          data: { referenceNumber: payload.referenceNumber },
        });
      }
    }

    // E-Mail bei automatisch erstellter Auszahlungsanweisung aus Veranstaltungsteilnahme (an Kassier)
    if (payload.type === 'payment_order_created_for_kassier' && payload.recipientEmail) {
      const paymentVariables = {
        ...variables,
        referenceNumber: payload.referenceNumber || '',
        orderAmount: payload.amount?.toFixed(2) || '0.00',
        purpose: payload.purpose || '',
        eventParticipationRef: payload.eventParticipationRef || '',
      };
      
      const subject = `Neue Auszahlungsanweisung ${payload.referenceNumber} (Entwurf)`;
      const bodyHtml = `
        <h2>Neue Auszahlungsanweisung erstellt</h2>
        <p>Bei Genehmigung einer Veranstaltungsteilnahme wurde automatisch eine Auszahlungsanweisung als Entwurf erstellt:</p>
        <table style="border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Referenznummer:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${paymentVariables.referenceNumber}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Betrag:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${paymentVariables.orderAmount} \u20ac</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Empf\u00e4nger:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${paymentVariables.creatorName}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Zweck:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${paymentVariables.purpose}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Veranstaltungsantrag:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${paymentVariables.eventParticipationRef}</td></tr>
        </table>
        <p>Bitte pr\u00fcfen Sie die Auszahlungsanweisung und erg\u00e4nzen Sie ggf. Auszahlungsart und weitere Details.</p>
        <p><em>Status: Entwurf (noch nicht eingereicht)</em></p>
      `;
      const html = wrapEmailHtml(bodyHtml, homepageUrl, emailDesign);
      
      emailPromises.push(sendEmail({ to: [payload.recipientEmail], subject, html }));
    }

    // E-Mail bei neuer Veranstaltungsteilnahme (an Kommandant)
    if (payload.type === 'event_participation_submitted' && payload.recipientEmail) {
      const template = getDefaultTemplate('event_participation_submitted');
      const eventVariables = {
        ...variables,
        referenceNumber: payload.referenceNumber || '',
        eventName: payload.eventName || '',
        eventDate: payload.eventDate ? new Date(payload.eventDate).toLocaleDateString('de-DE') : '',
        estimatedCosts: payload.estimatedCosts?.toFixed(2) || '0.00',
      };
      const subject = replaceVariables(template.subject, eventVariables);
      const bodyHtml = replaceVariables(template.body, eventVariables);
      const html = wrapEmailHtml(bodyHtml, homepageUrl, emailDesign);
      
      emailPromises.push(sendEmail({ to: [payload.recipientEmail], subject, html }));

      if (payload.recipientId) {
        await supabase.from('notifications').insert({
          user_id: payload.recipientId,
          type: 'order',
          title: 'Neue Veranstaltungsteilnahme',
          message: `${payload.creatorName} hat einen Antrag eingereicht: ${payload.eventName}`,
          data: { referenceNumber: payload.referenceNumber },
        });
      }
    }

    // E-Mail bei genehmigter Veranstaltungsteilnahme (an Antragsteller)
    if (payload.type === 'event_participation_approved' && payload.recipientEmail) {
      const template = getDefaultTemplate('event_participation_approved');
      const eventVariables = {
        ...variables,
        referenceNumber: payload.referenceNumber || '',
        eventName: payload.eventName || '',
        eventDate: payload.eventDate ? new Date(payload.eventDate).toLocaleDateString('de-DE') : '',
      };
      const subject = replaceVariables(template.subject, eventVariables);
      const bodyHtml = replaceVariables(template.body, eventVariables);
      const html = wrapEmailHtml(bodyHtml, homepageUrl, emailDesign);
      
      emailPromises.push(sendEmail({ to: [payload.recipientEmail], subject, html }));

      if (payload.recipientId) {
        await supabase.from('notifications').insert({
          user_id: payload.recipientId,
          type: 'order',
          title: 'Veranstaltungsteilnahme genehmigt',
          message: `Ihr Antrag "${payload.eventName}" wurde genehmigt`,
          data: { referenceNumber: payload.referenceNumber },
        });
      }
    }

    // E-Mail bei abgelehnter Veranstaltungsteilnahme (an Antragsteller)
    if (payload.type === 'event_participation_rejected' && payload.recipientEmail) {
      const template = getDefaultTemplate('event_participation_rejected');
      const eventVariables = {
        ...variables,
        referenceNumber: payload.referenceNumber || '',
        eventName: payload.eventName || '',
        rejecterName: payload.rejecterName || 'Kommandant',
      };
      const subject = replaceVariables(template.subject, eventVariables);
      const bodyHtml = replaceVariables(template.body, eventVariables);
      const html = wrapEmailHtml(bodyHtml, homepageUrl, emailDesign);
      
      emailPromises.push(sendEmail({ to: [payload.recipientEmail], subject, html }));

      if (payload.recipientId) {
        await supabase.from('notifications').insert({
          user_id: payload.recipientId,
          type: 'order',
          title: 'Veranstaltungsteilnahme abgelehnt',
          message: `Ihr Antrag "${payload.eventName}" wurde abgelehnt`,
          data: { referenceNumber: payload.referenceNumber },
        });
      }
    }

    // E-Mail bei erforderlicher erneuter Genehmigung (an Kommandant)
    if (payload.type === 'event_participation_reapproval_required' && payload.recipientEmail) {
      const template = getDefaultTemplate('event_participation_reapproval_required');
      const eventVariables = {
        ...variables,
        referenceNumber: payload.referenceNumber || '',
        eventName: payload.eventName || '',
        originalAmount: payload.originalAmount?.toFixed(2) || '0.00',
        newAmount: payload.newAmount?.toFixed(2) || '0.00',
        changeReason: payload.changeReason || 'Nicht angegeben',
        kassierName: payload.kassierName || 'Kassier',
      };
      const subject = replaceVariables(template.subject, eventVariables);
      const bodyHtml = replaceVariables(template.body, eventVariables);
      const html = wrapEmailHtml(bodyHtml, homepageUrl, emailDesign);
      
      emailPromises.push(sendEmail({ to: [payload.recipientEmail], subject, html }));

      if (payload.recipientId) {
        await supabase.from('notifications').insert({
          user_id: payload.recipientId,
          type: 'order',
          title: 'Erneute Genehmigung erforderlich',
          message: `Betragserhöhung für "${payload.eventName}" erfordert erneute Genehmigung`,
          data: { referenceNumber: payload.referenceNumber },
        });
      }
    }

    // E-Mail bei Betragsänderung (an Antragsteller)
    if (payload.type === 'event_participation_amount_changed' && payload.recipientEmail) {
      const template = getDefaultTemplate('event_participation_amount_changed');
      const eventVariables = {
        ...variables,
        referenceNumber: payload.referenceNumber || '',
        eventName: payload.eventName || '',
        originalAmount: payload.originalAmount?.toFixed(2) || '0.00',
        newAmount: payload.newAmount?.toFixed(2) || '0.00',
        changeReason: payload.changeReason || 'Nicht angegeben',
        kassierName: payload.kassierName || 'Kassier',
      };
      const subject = replaceVariables(template.subject, eventVariables);
      const bodyHtml = replaceVariables(template.body, eventVariables);
      const html = wrapEmailHtml(bodyHtml, homepageUrl, emailDesign);
      
      emailPromises.push(sendEmail({ to: [payload.recipientEmail], subject, html }));

      if (payload.recipientId) {
        await supabase.from('notifications').insert({
          user_id: payload.recipientId,
          type: 'order',
          title: 'Betrag geändert',
          message: `Der Betrag für "${payload.eventName}" wurde angepasst`,
          data: { referenceNumber: payload.referenceNumber },
        });
      }
    }

    // Alle E-Mails senden
    console.log('Email promises count:', emailPromises.length);
    
    if (emailPromises.length === 0) {
      console.log('No emails to send - check payload conditions');
      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: 0,
          failed: 0,
          message: 'No emails matched the conditions'
        }),
        { 
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }
    
    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r === true).length;
    const failedCount = results.filter(r => r === false).length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        failed: failedCount
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }
});
