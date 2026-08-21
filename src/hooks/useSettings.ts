import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmailTemplateDesign, DEFAULT_EMAIL_DESIGN } from '@/components/EmailTemplateEditor';

export interface EmailTemplate {
  id: string;
  label: string;
  subjectKey: string;
  bodyKey: string;
  subject: string;
  body: string;
  variables: string[];
}

export const EMAIL_TEMPLATE_DEFINITIONS: Omit<EmailTemplate, 'subject' | 'body'>[] = [
  {
    id: 'new_order_bereichsleiter',
    label: 'Neue Bestellung (an Bereichsleiter)',
    subjectKey: 'email_template_new_order_bereichsleiter_subject',
    bodyKey: 'email_template_new_order_bereichsleiter_body',
    variables: ['{{orderTitle}}', '{{recipientName}}', '{{creatorName}}', '{{homepageUrl}}']
  },
  {
    id: 'new_order_kommandant',
    label: 'Neue Bestellung (an Kommandant)',
    subjectKey: 'email_template_new_order_kommandant_subject',
    bodyKey: 'email_template_new_order_kommandant_body',
    variables: ['{{orderTitle}}', '{{recipientName}}', '{{homepageUrl}}']
  },
  {
    id: 'new_order_kommandomitglied',
    label: 'Freigabe durch Kommandomitglieder',
    subjectKey: 'email_template_new_order_kommandomitglied_subject',
    bodyKey: 'email_template_new_order_kommandomitglied_body',
    variables: ['{{orderTitle}}', '{{recipientName}}', '{{creatorName}}', '{{orderAmount}}', '{{homepageUrl}}']
  },
  {
    id: 'approval',
    label: 'Freigabe (an Ersteller)',
    subjectKey: 'email_template_approval_subject',
    bodyKey: 'email_template_approval_body',
    variables: ['{{orderTitle}}', '{{creatorName}}', '{{orderAmount}}', '{{approverName}}', '{{approverRole}}', '{{homepageUrl}}']
  },
  {
    id: 'final_approval',
    label: 'Endgültige Genehmigung (an Ersteller)',
    subjectKey: 'email_template_final_approval_subject',
    bodyKey: 'email_template_final_approval_body',
    variables: ['{{orderTitle}}', '{{creatorName}}', '{{orderAmount}}', '{{approverName}}', '{{approverRole}}', '{{homepageUrl}}']
  },
  {
    id: 'rejection',
    label: 'Ablehnung (an Ersteller)',
    subjectKey: 'email_template_rejection_subject',
    bodyKey: 'email_template_rejection_body',
    variables: ['{{orderTitle}}', '{{creatorName}}', '{{orderAmount}}', '{{approverName}}', '{{approverRole}}', '{{rejectionReason}}', '{{homepageUrl}}']
  },
  {
    id: 'reset_to_draft',
    label: 'Zurücksetzung auf Entwurf (an Ersteller)',
    subjectKey: 'email_template_reset_to_draft_subject',
    bodyKey: 'email_template_reset_to_draft_body',
    variables: ['{{orderTitle}}', '{{creatorName}}', '{{orderAmount}}', '{{approverName}}', '{{approverRole}}', '{{resetReason}}', '{{homepageUrl}}']
  },
  {
    id: 'new_user',
    label: 'Neuer Benutzer erstellt',
    subjectKey: 'email_template_new_user_subject',
    bodyKey: 'email_template_new_user_body',
    variables: ['{{userName}}', '{{userEmail}}', '{{userPassword}}', '{{homepageUrl}}']
  },
  {
    id: 'password_reset',
    label: 'Passwort zurückgesetzt',
    subjectKey: 'email_template_password_reset_subject',
    bodyKey: 'email_template_password_reset_body',
    variables: ['{{userName}}', '{{userEmail}}', '{{userPassword}}', '{{homepageUrl}}']
  },
  {
    id: 'new_supplier_pending',
    label: 'Neuer Lieferant wartet auf Genehmigung',
    subjectKey: 'email_template_new_supplier_pending_subject',
    bodyKey: 'email_template_new_supplier_pending_body',
    variables: ['{{supplierName}}', '{{creatorName}}', '{{homepageUrl}}']
  },
  {
    id: 'supplier_approved',
    label: 'Lieferant genehmigt (an Ersteller)',
    subjectKey: 'email_template_supplier_approved_subject',
    bodyKey: 'email_template_supplier_approved_body',
    variables: ['{{supplierName}}', '{{creatorName}}', '{{approverName}}', '{{homepageUrl}}']
  },
  {
    id: 'supplier_rejected',
    label: 'Lieferant abgelehnt (an Ersteller)',
    subjectKey: 'email_template_supplier_rejected_subject',
    bodyKey: 'email_template_supplier_rejected_body',
    variables: ['{{supplierName}}', '{{creatorName}}', '{{approverName}}', '{{rejectionReason}}', '{{homepageUrl}}']
  },
  {
    id: 'rejection_schriftfuehrer',
    label: 'Ablehnung (an Schriftführer)',
    subjectKey: 'email_template_rejection_schriftfuehrer_subject',
    bodyKey: 'email_template_rejection_schriftfuehrer_body',
    variables: ['{{orderTitle}}', '{{creatorName}}', '{{orderAmount}}', '{{approverName}}', '{{approverRole}}', '{{rejectionReason}}', '{{votingResults}}', '{{homepageUrl}}']
  },
  {
    id: 'kommando_decision_kassier',
    label: 'Kommando-Entscheidung (an Kassier)',
    subjectKey: 'email_template_kommando_decision_kassier_subject',
    bodyKey: 'email_template_kommando_decision_kassier_body',
    variables: ['{{orderTitle}}', '{{creatorName}}', '{{orderAmount}}', '{{decision}}', '{{decisionType}}', '{{approverName}}', '{{votingResults}}', '{{homepageUrl}}']
  },
  {
    id: 'task_assigned',
    label: 'Aufgabe zugewiesen',
    subjectKey: 'email_template_task_assigned_subject',
    bodyKey: 'email_template_task_assigned_body',
    variables: ['{{taskTitle}}', '{{recipientName}}', '{{taskStartDate}}', '{{taskEndDate}}', '{{taskPriority}}', '{{assignerName}}', '{{homepageUrl}}']
  },
  {
    id: 'step_assigned',
    label: 'Unterschritt zugewiesen',
    subjectKey: 'email_template_step_assigned_subject',
    bodyKey: 'email_template_step_assigned_body',
    variables: ['{{stepTitle}}', '{{taskTitle}}', '{{recipientName}}', '{{assignerName}}', '{{homepageUrl}}']
  }
];

export function useSettings() {
  const [freigabebetragKdt, setFreigabebetragKdt] = useState<number>(1000);
  const [freigabebetragKommandomitglied, setFreigabebetragKommandomitglied] = useState<number>(5000);
  const [notificationEmail, setNotificationEmail] = useState<string>('');
  const [schriftfuehrerEmail, setSchriftfuehrerEmail] = useState<string>('');
  const [kassierEmail, setKassierEmail] = useState<string>('');
  const [systemHomepageUrl, setSystemHomepageUrl] = useState<string>('');
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [onlineViewUsers, setOnlineViewUsers] = useState<string[]>([]);
  const [freigabenViewUsers, setFreigabenViewUsers] = useState<string[]>([]);
  const [messageCardUsers, setMessageCardUsers] = useState<string[]>([]);
  const [allOrdersViewUsers, setAllOrdersViewUsers] = useState<string[]>([]);
  const [readyToOrderViewUsers, setReadyToOrderViewUsers] = useState<string[]>([]);
  const [orderedViewUsers, setOrderedViewUsers] = useState<string[]>([]);
  const [sammelbestellungenUsers, setSammelbestellungenUsers] = useState<string[]>([]);
  const [antragsformulareViewUsers, setAntragsformulareViewUsers] = useState<string[]>([]);
  const [ideasPoolViewUsers, setIdeasPoolViewUsers] = useState<string[]>([]);
  const [rentalItemsAdminUsers, setRentalItemsAdminUsers] = useState<string[]>([]);
  const [supplierApprovalUsers, setSupplierApprovalUsers] = useState<string[]>([]);
  const [rentalDeliveryCost, setRentalDeliveryCost] = useState<number>(55);
  const [rentalOverduePerDay, setRentalOverduePerDay] = useState<number>(50);
  const [rentalContractHeader, setRentalContractHeader] = useState<string>('Ansprechperson: Marcel Gradauer | Tel: 0724358112585 / 0660 974 8617 | Mo–Do 07:00–16:00, Fr 07:00–12:00 | office@feuerwehr-marchtrenk.at');
  const [rentalContractClauses, setRentalContractClauses] = useState<Record<string, string>>({
    '1_1': '1.1 Folgende besondere Merkmale oder Schäden waren dem Verleiher bereits vor dem Verleih bekannt:',
    '2_1': '2.1 Der Verleiher kann für finanzielle Schäden des Kunden oder Dritter, die durch technisches Versagen von verliehenem Equipment verursacht werden, nicht haften.',
    '2_2': '2.2 Der Kunde ist verpflichtet, Schäden am Equipment, die während der Leihfrist aufgetreten sind, dem Verleiher unmittelbar mitzuteilen.',
    '2_3': '2.3 Schäden durch unsachgemäßen Umgang gehen zu Lasten des Kunden (Reparaturkosten bzw. Ersatz). Bei Totalschaden oder Verlust zahlt der Kunde den Neupreis des betroffenen Artikels.',
    '3_1': '3.1 Die Rückgabe erfolgt zum vereinbarten Zeitpunkt bzw. Werktags zu den Geschäftszeiten. (siehe oben)',
    '3_2': '3.2 Verzögert sich die planmäßige Rückgabe ohne vorherige Absprache, wird für jeden weiteren Tag der übliche Tagessatz berechnet.',
    '3_3': '3.3 Der Kunde sorgt selbständig für die Abholung/Rückgabe beim Verleiher. Auf Wunsch kann das Equipment nach Absprache auch abgeholt werden – hierfür wird ein Entgelt berechnet.',
    '3_4': '3.4 Bringt der Kunde das Equipment beschädigt, verschmutzt oder gar nicht zurück, gilt Punkt 2.3.',
    '4_1': '4.1 Die Leihkosten werden je nach Leihgegenstand verrechnet. Die angeführten Preise verstehen sich inkl. Mehrwertsteuer.'
  });
  const [escalationTimeoutHours, setEscalationTimeoutHours] = useState<number>(24);
  const [emailDesign, setEmailDesign] = useState<EmailTemplateDesign>(DEFAULT_EMAIL_DESIGN);
  const [approvalReminderEnabled, setApprovalReminderEnabled] = useState<boolean>(false);
  const [approvalReminderTime, setApprovalReminderTime] = useState<string>('08:00');
  const [pdfBackgroundUrl, setPdfBackgroundUrl] = useState<string>('');
  const [pdfBackgroundOpacity, setPdfBackgroundOpacity] = useState<number>(0.15);
  const [commanderSignatureUrl, setCommanderSignatureUrl] = useState<string>('');
  const [commanderStampUrl, setCommanderStampUrl] = useState<string>('');
  const [problemReportEnabled, setProblemReportEnabled] = useState<boolean>(true);
  const [decisionTextTemplates, setDecisionTextTemplates] = useState<string[]>([
    'Das Kommando möge beschließen,',
    'Das Kommando möge dem Antrag zustimmen,',
    'Das Kommando möge genehmigen,',
    'Das Kommando nimmt zur Kenntnis,',
    'Das Kommando lehnt ab,'
  ]);
  // Sitzungen Einstellungen
  const [sitzungenViewRoles, setSitzungenViewRoles] = useState<string[]>(['admin', 'kommandant', 'kommandomitglied', 'erweitertes_kommando']);
  const [sitzungenAbklaerungFarbe, setSitzungenAbklaerungFarbe] = useState<string>('sky'); // sky, blue, violet, purple, pink
  
  // Beschlussregister Einstellungen
  const [beschlussRegisterViewRoles, setBeschlussRegisterViewRoles] = useState<string[]>(['admin', 'kommandant', 'schriftfuehrer', 'kassier', 'kommandomitglied', 'erweitertes_kommando']);
  const [beschlussRegisterVisibleCards, setBeschlussRegisterVisibleCards] = useState<string[]>([
    'gesamt', 'gueltig', 'abgelehnt', 'in_abstimmung', 'ausstehend', 'finanzvolumen', 'aufgehoben', 'abgelaufen', 'bald_ablaufend'
  ]);
  // Cards pro Rolle - überschreibt die globalen Cards wenn gesetzt
  const defaultCardsByRole: Record<string, string[]> = {
    admin: ['gesamt', 'gueltig', 'abgelehnt', 'in_abstimmung', 'ausstehend', 'finanzvolumen', 'aufgehoben', 'abgelaufen', 'bald_ablaufend'],
    kommandant: ['gesamt', 'gueltig', 'abgelehnt', 'in_abstimmung', 'ausstehend', 'finanzvolumen', 'aufgehoben', 'abgelaufen', 'bald_ablaufend'],
    schriftfuehrer: ['gesamt', 'gueltig', 'abgelehnt', 'in_abstimmung', 'ausstehend', 'finanzvolumen'],
    kassier: ['gesamt', 'gueltig', 'finanzvolumen'],
    bereichsleiter: ['gesamt', 'gueltig', 'in_abstimmung'],
    kommandomitglied: ['gesamt', 'gueltig', 'in_abstimmung'],
    erweitertes_kommando: ['gesamt', 'gueltig', 'in_abstimmung'],
    nutzer: ['gesamt', 'gueltig']
  };
  const [beschlussRegisterCardsByRole, setBeschlussRegisterCardsByRole] = useState<Record<string, string[]>>(defaultCardsByRole);
  // Erinnerung vor Beschluss-Ablauf (in Tagen)
  const [beschlussExpiryReminderDays, setBeschlussExpiryReminderDays] = useState<number>(30);
  const [invitationEmailSubject, setInvitationEmailSubject] = useState<string>('Dein Zugang zur FF Marchtrenk Plattform');
  const [invitationEmailBody, setInvitationEmailBody] = useState<string>(`Hallo,

hier ist dein Registrierungslink für die BANF-Plattform:
👉 {registration_link}

Registriere dich mit deiner @feuerwehr-marchtrenk.at Adresse.

Als App installieren:
• iPhone: Safari → Teilen → "Zum Home-Bildschirm"
• Android: Chrome → Menü → "App installieren"

Eingeladen von: {inviter_name}

Grüße, FF Marchtrenk`);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchSettings() {
    if (!supabase) return;
    
    const { data } = await supabase
      .from('settings')
      .select('*');
    
    if (data) {
      const freigabeSetting = data.find(s => s.key === 'freigabebetrag_kdt');
      const freigabeKommandomitgliedSetting = data.find(s => s.key === 'freigabebetrag_kommandomitglied');
      const emailSetting = data.find(s => s.key === 'notification_email');
      const schriftfuehrerSetting = data.find(s => s.key === 'schriftfuehrer_email');
      const kassierSetting = data.find(s => s.key === 'kassier_email');
      const homepageSetting = data.find(s => s.key === 'system_homepage_url');
      const onlineViewSetting = data.find(s => s.key === 'online_view_users');
      const freigabenViewSetting = data.find(s => s.key === 'freigaben_view_users');
      const escalationSetting = data.find(s => s.key === 'escalation_timeout_hours');
      
      if (freigabeSetting) {
        const value = parseFloat(freigabeSetting.value);
        console.log('[useSettings] Freigabebetrag KDT geladen:', value);
        setFreigabebetragKdt(value);
      } else {
        console.log('[useSettings] Freigabebetrag KDT nicht gefunden, verwende Default: 1000');
      }
      if (freigabeKommandomitgliedSetting) {
        const value = parseFloat(freigabeKommandomitgliedSetting.value);
        console.log('[useSettings] Freigabebetrag Kommandomitglied geladen:', value);
        setFreigabebetragKommandomitglied(value);
      } else {
        console.log('[useSettings] Freigabebetrag Kommandomitglied nicht gefunden, verwende Default: 5000');
      }
      if (emailSetting) {
        setNotificationEmail(emailSetting.value);
      }
      if (schriftfuehrerSetting) {
        setSchriftfuehrerEmail(schriftfuehrerSetting.value);
      }
      if (kassierSetting) {
        setKassierEmail(kassierSetting.value);
      }
      if (homepageSetting) {
        setSystemHomepageUrl(homepageSetting.value);
      }
      if (onlineViewSetting) {
        try {
          setOnlineViewUsers(JSON.parse(onlineViewSetting.value) as string[]);
        } catch {
          setOnlineViewUsers([]);
        }
      }
      if (freigabenViewSetting) {
        try {
          setFreigabenViewUsers(JSON.parse(freigabenViewSetting.value) as string[]);
        } catch {
          setFreigabenViewUsers([]);
        }
      }
      const messageCardSetting = data.find(s => s.key === 'message_card_users');
      if (messageCardSetting) {
        try {
          setMessageCardUsers(JSON.parse(messageCardSetting.value) as string[]);
        } catch {
          setMessageCardUsers([]);
        }
      }
      const allOrdersViewSetting = data.find(s => s.key === 'all_orders_view_users');
      if (allOrdersViewSetting) {
        try {
          setAllOrdersViewUsers(JSON.parse(allOrdersViewSetting.value) as string[]);
        } catch {
          setAllOrdersViewUsers([]);
        }
      }
      const readyToOrderViewSetting = data.find(s => s.key === 'ready_to_order_view_users');
      if (readyToOrderViewSetting) {
        try {
          setReadyToOrderViewUsers(JSON.parse(readyToOrderViewSetting.value) as string[]);
        } catch {
          setReadyToOrderViewUsers([]);
        }
      }
      const orderedViewSetting = data.find(s => s.key === 'ordered_view_users');
      if (orderedViewSetting) {
        try {
          setOrderedViewUsers(JSON.parse(orderedViewSetting.value) as string[]);
        } catch {
          setOrderedViewUsers([]);
        }
      }
      if (escalationSetting) {
        setEscalationTimeoutHours(parseInt(escalationSetting.value, 10) || 24);
      }
      
      // Load approval reminder settings
      const approvalReminderEnabledSetting = data.find(s => s.key === 'approval_reminder_enabled');
      if (approvalReminderEnabledSetting) {
        setApprovalReminderEnabled(approvalReminderEnabledSetting.value === 'true');
      }
      const approvalReminderTimeSetting = data.find(s => s.key === 'approval_reminder_time');
      if (approvalReminderTimeSetting) {
        setApprovalReminderTime(approvalReminderTimeSetting.value || '08:00');
      }
      
      const sammelbestellungenSetting = data.find(s => s.key === 'sammelbestellungen_users');
      if (sammelbestellungenSetting) {
        try {
          setSammelbestellungenUsers(JSON.parse(sammelbestellungenSetting.value) as string[]);
        } catch {
          setSammelbestellungenUsers([]);
        }
      }

      const antragsformulareSetting = data.find(s => s.key === 'antragsformulare_view_users');
      if (antragsformulareSetting) {
        try {
          setAntragsformulareViewUsers(JSON.parse(antragsformulareSetting.value) as string[]);
        } catch {
          setAntragsformulareViewUsers([]);
        }
      }

      const ideasPoolSetting = data.find(s => s.key === 'ideas_pool_view_users');
      if (ideasPoolSetting) {
        try {
          setIdeasPoolViewUsers(JSON.parse(ideasPoolSetting.value) as string[]);
        } catch {
          setIdeasPoolViewUsers([]);
        }
      }

      // Load Sitzungen settings
      const sitzungenViewRolesSetting = data.find(s => s.key === 'sitzungen_view_roles');
      if (sitzungenViewRolesSetting) {
        try {
          setSitzungenViewRoles(JSON.parse(sitzungenViewRolesSetting.value) as string[]);
        } catch {
          setSitzungenViewRoles(['admin', 'kommandant', 'kommandomitglied', 'erweitertes_kommando']);
        }
      }
      
      const sitzungenAbklaerungFarbeSetting = data.find(s => s.key === 'sitzungen_abklaerung_farbe');
      if (sitzungenAbklaerungFarbeSetting) {
        setSitzungenAbklaerungFarbe(sitzungenAbklaerungFarbeSetting.value || 'sky');
      }
      
      // Load Beschlussregister settings
      const beschlussRegisterViewRolesSetting = data.find(s => s.key === 'beschluss_register_view_roles');
      if (beschlussRegisterViewRolesSetting) {
        try {
          setBeschlussRegisterViewRoles(JSON.parse(beschlussRegisterViewRolesSetting.value) as string[]);
        } catch {
          setBeschlussRegisterViewRoles(['admin', 'kommandant', 'schriftfuehrer', 'kassier', 'kommandomitglied']);
        }
      }
      const beschlussRegisterCardsSetting = data.find(s => s.key === 'beschluss_register_visible_cards');
      if (beschlussRegisterCardsSetting) {
        try {
          setBeschlussRegisterVisibleCards(JSON.parse(beschlussRegisterCardsSetting.value) as string[]);
        } catch {
          setBeschlussRegisterVisibleCards(['gesamt', 'gueltig', 'abgelehnt', 'in_abstimmung', 'ausstehend', 'finanzvolumen', 'aufgehoben', 'abgelaufen', 'bald_ablaufend']);
        }
      }
      
      // Load Cards by Role
      const cardsByRoleSetting = data.find(s => s.key === 'beschluss_register_cards_by_role');
      if (cardsByRoleSetting) {
        try {
          setBeschlussRegisterCardsByRole(JSON.parse(cardsByRoleSetting.value) as Record<string, string[]>);
        } catch {
          setBeschlussRegisterCardsByRole(defaultCardsByRole);
        }
      }
      
      // Load Beschluss Expiry Reminder Days
      const expiryReminderSetting = data.find(s => s.key === 'beschluss_expiry_reminder_days');
      if (expiryReminderSetting) {
        try {
          setBeschlussExpiryReminderDays(parseInt(expiryReminderSetting.value) || 30);
        } catch {
          setBeschlussExpiryReminderDays(30);
        }
      }

      // Load supplier approval users
      const supplierApprovalSetting = data.find(s => s.key === 'supplier_approval_users');
      if (supplierApprovalSetting) {
        try {
          setSupplierApprovalUsers(JSON.parse(supplierApprovalSetting.value) as string[]);
        } catch {
          setSupplierApprovalUsers([]);
        }
      }

      // Load rental settings
      const rentalAdminSetting = data.find(s => s.key === 'rental_items_admin_users');
      if (rentalAdminSetting) {
        try {
          setRentalItemsAdminUsers(JSON.parse(rentalAdminSetting.value) as string[]);
        } catch {
          setRentalItemsAdminUsers([]);
        }
      }
      const rentalDeliverySetting = data.find(s => s.key === 'rental_delivery_cost');
      if (rentalDeliverySetting) {
        setRentalDeliveryCost(parseFloat(rentalDeliverySetting.value) || 55);
      }
      const rentalOverdueSetting = data.find(s => s.key === 'rental_overdue_per_day');
      if (rentalOverdueSetting) {
        setRentalOverduePerDay(parseFloat(rentalOverdueSetting.value) || 50);
      }
      const rentalHeaderSetting = data.find(s => s.key === 'rental_contract_header');
      if (rentalHeaderSetting) {
        setRentalContractHeader(rentalHeaderSetting.value);
      }
      const rentalClausesSetting = data.find(s => s.key === 'rental_contract_clauses');
      if (rentalClausesSetting) {
        try {
          setRentalContractClauses(JSON.parse(rentalClausesSetting.value));
        } catch {
          // Keep defaults
        }
      }

      // Load decision text templates
      const decisionTemplatesSetting = data.find(s => s.key === 'decision_text_templates');
      if (decisionTemplatesSetting) {
        try {
          setDecisionTextTemplates(JSON.parse(decisionTemplatesSetting.value));
        } catch {
          // Keep defaults
        }
      }

      // Load PDF background settings
      const pdfBackgroundSetting = data.find(s => s.key === 'pdf_background_url');
      if (pdfBackgroundSetting) {
        setPdfBackgroundUrl(pdfBackgroundSetting.value || '');
      }
      const pdfBackgroundOpacitySetting = data.find(s => s.key === 'pdf_background_opacity');
      if (pdfBackgroundOpacitySetting) {
        setPdfBackgroundOpacity(parseFloat(pdfBackgroundOpacitySetting.value) || 0.15);
      }

      // Load commander signature and stamp
      const commanderSignatureSetting = data.find(s => s.key === 'commander_signature_url');
      if (commanderSignatureSetting) {
        setCommanderSignatureUrl(commanderSignatureSetting.value || '');
      }
      const commanderStampSetting = data.find(s => s.key === 'commander_stamp_url');
      if (commanderStampSetting) {
        setCommanderStampUrl(commanderStampSetting.value || '');
      }

      // Load email templates
      const templates: EmailTemplate[] = EMAIL_TEMPLATE_DEFINITIONS.map(def => {
        const subjectSetting = data.find(s => s.key === def.subjectKey);
        const bodySetting = data.find(s => s.key === def.bodyKey);
        return {
          ...def,
          subject: subjectSetting?.value || '',
          body: bodySetting?.value || ''
        };
      });
      setEmailTemplates(templates);

      // Load email design
      const emailDesignSetting = data.find(s => s.key === 'email_template_design');
      if (emailDesignSetting) {
        try {
          const savedDesign = JSON.parse(emailDesignSetting.value) as Partial<EmailTemplateDesign>;
          setEmailDesign({ ...DEFAULT_EMAIL_DESIGN, ...savedDesign });
        } catch {
          setEmailDesign(DEFAULT_EMAIL_DESIGN);
        }
      }
      
      // Load problem report enabled setting
      const problemReportSetting = data.find(s => s.key === 'problem_report_enabled');
      if (problemReportSetting) {
        setProblemReportEnabled(problemReportSetting.value === 'true');
      }

      // Load invitation email settings
      const invitationSubjectSetting = data.find(s => s.key === 'invitation_email_subject');
      if (invitationSubjectSetting) {
        setInvitationEmailSubject(invitationSubjectSetting.value || 'Dein Zugang zur FF Marchtrenk Plattform');
      }
      const invitationBodySetting = data.find(s => s.key === 'invitation_email_body');
      if (invitationBodySetting) {
        setInvitationEmailBody(invitationBodySetting.value || '');
      }
    }
    setLoading(false);
  }

  async function updateFreigabebetragKdt(value: number) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .update({ value: value.toString() })
      .eq('key', 'freigabebetrag_kdt');
    
    if (!error) {
      setFreigabebetragKdt(value);
    }
    return { error };
  }

  async function updateFreigabebetragKommandomitglied(value: number) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .update({ value: value.toString() })
      .eq('key', 'freigabebetrag_kommandomitglied');
    
    if (!error) {
      setFreigabebetragKommandomitglied(value);
    }
    return { error };
  }

  async function updateNotificationEmail(value: string) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .update({ value })
      .eq('key', 'notification_email');
    
    if (!error) {
      setNotificationEmail(value);
    }
    return { error };
  }

  async function updateSystemHomepageUrl(value: string) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .update({ value })
      .eq('key', 'system_homepage_url');
    
    if (!error) {
      setSystemHomepageUrl(value);
    }
    return { error };
  }

  async function updateSchriftfuehrerEmail(value: string) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'schriftfuehrer_email', value }, { onConflict: 'key' });
    
    if (!error) {
      setSchriftfuehrerEmail(value);
    }
    return { error };
  }

  async function updateKassierEmail(value: string) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'kassier_email', value }, { onConflict: 'key' });
    
    if (!error) {
      setKassierEmail(value);
    }
    return { error };
  }

  async function updateEmailTemplate(templateId: string, subject: string, body: string) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const template = EMAIL_TEMPLATE_DEFINITIONS.find(t => t.id === templateId);
    if (!template) return { error: new Error('Template not found') };

    // Update subject
    const { error: subjectError } = await supabase
      .from('settings')
      .update({ value: subject })
      .eq('key', template.subjectKey);
    
    if (subjectError) return { error: subjectError };

    // Update body
    const { error: bodyError } = await supabase
      .from('settings')
      .update({ value: body })
      .eq('key', template.bodyKey);
    
    if (bodyError) return { error: bodyError };

    // Update local state
    setEmailTemplates(prev => prev.map(t => 
      t.id === templateId ? { ...t, subject, body } : t
    ));

    return { error: null };
  }

  async function updateOnlineViewUsers(userIds: string[]) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .update({ value: JSON.stringify(userIds) })
      .eq('key', 'online_view_users');
    
    if (!error) {
      setOnlineViewUsers(userIds);
    }
    return { error };
  }

  async function updateFreigabenViewUsers(userIds: string[]) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'freigaben_view_users', value: JSON.stringify(userIds) }, { onConflict: 'key' });
    
    if (!error) {
      setFreigabenViewUsers(userIds);
    }
    return { error };
  }

  async function updateEscalationTimeoutHours(value: number) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'escalation_timeout_hours', value: value.toString() }, { onConflict: 'key' });
    
    if (!error) {
      setEscalationTimeoutHours(value);
    }
    return { error };
  }

  async function updateMessageCardUsers(userIds: string[]) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'message_card_users', value: JSON.stringify(userIds) }, { onConflict: 'key' });
    
    if (!error) {
      setMessageCardUsers(userIds);
    }
    return { error };
  }

  async function updateAllOrdersViewUsers(userIds: string[]) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'all_orders_view_users', value: JSON.stringify(userIds) }, { onConflict: 'key' });
    
    if (!error) {
      setAllOrdersViewUsers(userIds);
    }
    return { error };
  }

  async function updateReadyToOrderViewUsers(userIds: string[]) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'ready_to_order_view_users', value: JSON.stringify(userIds) }, { onConflict: 'key' });
    
    if (!error) {
      setReadyToOrderViewUsers(userIds);
    }
    return { error };
  }

  async function updateOrderedViewUsers(userIds: string[]) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'ordered_view_users', value: JSON.stringify(userIds) }, { onConflict: 'key' });
    
    if (!error) {
      setOrderedViewUsers(userIds);
    }
    return { error };
  }

  async function updateSammelbestellungenUsers(users: string[]) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'sammelbestellungen_users', value: JSON.stringify(users) }, { onConflict: 'key' });
    
    if (!error) {
      setSammelbestellungenUsers(users);
    }
    return { error };
  }

  async function updateAntragsformulareViewUsers(userIds: string[]) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'antragsformulare_view_users', value: JSON.stringify(userIds) }, { onConflict: 'key' });
    
    if (!error) {
      setAntragsformulareViewUsers(userIds);
    }
    return { error };
  }

  async function updateIdeasPoolViewUsers(userIds: string[]) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'ideas_pool_view_users', value: JSON.stringify(userIds) }, { onConflict: 'key' });
    
    if (!error) {
      setIdeasPoolViewUsers(userIds);
    }
    return { error };
  }

  async function updateRentalItemsAdminUsers(userIds: string[]) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'rental_items_admin_users', value: JSON.stringify(userIds) }, { onConflict: 'key' });
    
    if (!error) {
      setRentalItemsAdminUsers(userIds);
    }
    return { error };
  }

  async function updateSupplierApprovalUsers(userIds: string[]) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'supplier_approval_users', value: JSON.stringify(userIds) }, { onConflict: 'key' });
    
    if (!error) {
      setSupplierApprovalUsers(userIds);
    }
    return { error };
  }

  async function updateRentalDeliveryCost(value: number) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'rental_delivery_cost', value: value.toString() }, { onConflict: 'key' });
    
    if (!error) {
      setRentalDeliveryCost(value);
    }
    return { error };
  }

  async function updateRentalOverduePerDay(value: number) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'rental_overdue_per_day', value: value.toString() }, { onConflict: 'key' });
    
    if (!error) {
      setRentalOverduePerDay(value);
    }
    return { error };
  }

  async function updateRentalContractHeader(value: string) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'rental_contract_header', value }, { onConflict: 'key' });
    
    if (!error) {
      setRentalContractHeader(value);
    }
    return { error };
  }

  async function updateRentalContractClauses(clauses: Record<string, string>) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'rental_contract_clauses', value: JSON.stringify(clauses) }, { onConflict: 'key' });
    
    if (!error) {
      setRentalContractClauses(clauses);
    }
    return { error };
  }

  async function updateApprovalReminderEnabled(enabled: boolean) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'approval_reminder_enabled', value: enabled.toString() }, { onConflict: 'key' });
    
    if (!error) {
      setApprovalReminderEnabled(enabled);
    }
    return { error };
  }

  async function updateApprovalReminderTime(time: string) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'approval_reminder_time', value: time }, { onConflict: 'key' });
    
    if (!error) {
      setApprovalReminderTime(time);
    }
    return { error };
  }

  async function triggerApprovalReminder(): Promise<{ success: boolean; error?: string; data?: unknown }> {
    if (!supabase) return { success: false, error: 'Database not connected' };
    
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!anonKey) return { success: false, error: 'ANON_KEY not available' };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-approval-reminder`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
          },
          body: JSON.stringify({}),
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText };
      }
      
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async function updateEmailDesign(design: EmailTemplateDesign) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const designJson = JSON.stringify(design);
    
    // Check if setting exists
    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('key', 'email_template_design')
      .single();
    
    let error;
    if (existing) {
      const result = await supabase
        .from('settings')
        .update({ value: designJson })
        .eq('key', 'email_template_design');
      error = result.error;
    } else {
      const result = await supabase
        .from('settings')
        .insert({ key: 'email_template_design', value: designJson });
      error = result.error;
    }
    
    if (!error) {
      setEmailDesign(design);
    }
    return { error };
  }

  async function updatePdfBackgroundUrl(value: string) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'pdf_background_url', value }, { onConflict: 'key' });
    
    if (!error) {
      setPdfBackgroundUrl(value);
    }
    return { error };
  }

  async function updatePdfBackgroundOpacity(value: number) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'pdf_background_opacity', value: value.toString() }, { onConflict: 'key' });
    
    if (!error) {
      setPdfBackgroundOpacity(value);
    }
    return { error };
  }

  async function updateCommanderSignatureUrl(value: string) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'commander_signature_url', value }, { onConflict: 'key' });
    
    if (!error) {
      setCommanderSignatureUrl(value);
    }
    return { error };
  }

  async function updateCommanderStampUrl(value: string) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'commander_stamp_url', value }, { onConflict: 'key' });
    
    if (!error) {
      setCommanderStampUrl(value);
    }
    return { error };
  }

  async function updateInvitationEmailSubject(subject: string) {
    if (!supabase) return { error: new Error('Database not connected') };

    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'invitation_email_subject', value: subject }, { onConflict: 'key' });

    if (!error) {
      setInvitationEmailSubject(subject);
    }
    return { error };
  }

  async function updateInvitationEmailBody(body: string) {
    if (!supabase) return { error: new Error('Database not connected') };

    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'invitation_email_body', value: body }, { onConflict: 'key' });

    if (!error) {
      setInvitationEmailBody(body);
    }
    return { error };
  }

  async function updateProblemReportEnabled(value: boolean) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'problem_report_enabled', value: value.toString() }, { onConflict: 'key' });
    
    if (!error) {
      setProblemReportEnabled(value);
    }
    return { error };
  }

  async function updateDecisionTextTemplates(templates: string[]) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'decision_text_templates', value: JSON.stringify(templates) }, { onConflict: 'key' });
    
    if (!error) {
      setDecisionTextTemplates(templates);
    }
    return { error };
  }

  async function updateSitzungenViewRoles(roles: string[]) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'sitzungen_view_roles', value: JSON.stringify(roles) }, { onConflict: 'key' });
    
    if (!error) {
      setSitzungenViewRoles(roles);
    }
    return { error };
  }

  async function updateSitzungenAbklaerungFarbe(farbe: string) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'sitzungen_abklaerung_farbe', value: farbe }, { onConflict: 'key' });
    
    if (!error) {
      setSitzungenAbklaerungFarbe(farbe);
    }
    return { error };
  }

  async function updateBeschlussRegisterViewRoles(roles: string[]) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'beschluss_register_view_roles', value: JSON.stringify(roles) }, { onConflict: 'key' });
    
    if (!error) {
      setBeschlussRegisterViewRoles(roles);
    }
    return { error };
  }

  async function updateBeschlussRegisterVisibleCards(cards: string[]) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'beschluss_register_visible_cards', value: JSON.stringify(cards) }, { onConflict: 'key' });
    
    if (!error) {
      setBeschlussRegisterVisibleCards(cards);
    }
    return { error };
  }

  async function updateBeschlussRegisterCardsByRole(cardsByRole: Record<string, string[]>) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'beschluss_register_cards_by_role', value: JSON.stringify(cardsByRole) }, { onConflict: 'key' });
    
    if (!error) {
      setBeschlussRegisterCardsByRole(cardsByRole);
    }
    return { error };
  }

  async function updateBeschlussExpiryReminderDays(days: number) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'beschluss_expiry_reminder_days', value: days.toString() }, { onConflict: 'key' });
    
    if (!error) {
      setBeschlussExpiryReminderDays(days);
    }
    return { error };
  }

  return { 
    freigabebetragKdt, 
    freigabebetragKommandomitglied,
    notificationEmail,
    schriftfuehrerEmail,
    kassierEmail,
    systemHomepageUrl,
    emailTemplates,
    emailDesign,
    onlineViewUsers,
    freigabenViewUsers,
    messageCardUsers,
    allOrdersViewUsers,
    readyToOrderViewUsers,
    orderedViewUsers,
    sammelbestellungenUsers,
    antragsformulareViewUsers,
    ideasPoolViewUsers,
    rentalItemsAdminUsers,
    supplierApprovalUsers,
    rentalDeliveryCost,
    rentalOverduePerDay,
    rentalContractHeader,
    rentalContractClauses,
    escalationTimeoutHours,
    approvalReminderEnabled,
    approvalReminderTime,
    pdfBackgroundUrl,
    pdfBackgroundOpacity,
    commanderSignatureUrl,
    commanderStampUrl,
    problemReportEnabled,
    decisionTextTemplates,
    invitationEmailSubject,
    invitationEmailBody,
    loading, 
    updateFreigabebetragKdt,
    updateFreigabebetragKommandomitglied,
    updateNotificationEmail,
    updateSchriftfuehrerEmail,
    updateKassierEmail,
    updateSystemHomepageUrl,
    updateEmailTemplate,
    updateEmailDesign,
    updateOnlineViewUsers,
    updateFreigabenViewUsers,
    updateMessageCardUsers,
    updateAllOrdersViewUsers,
    updateReadyToOrderViewUsers,
    updateOrderedViewUsers,
    updateSammelbestellungenUsers,
    updateAntragsformulareViewUsers,
    updateIdeasPoolViewUsers,
    updateRentalItemsAdminUsers,
    updateSupplierApprovalUsers,
    updateRentalDeliveryCost,
    updateRentalOverduePerDay,
    updateRentalContractHeader,
    updateRentalContractClauses,
    updateEscalationTimeoutHours,
    updateApprovalReminderEnabled,
    updateApprovalReminderTime,
    updatePdfBackgroundUrl,
    updatePdfBackgroundOpacity,
    updateCommanderSignatureUrl,
    updateCommanderStampUrl,
    updateProblemReportEnabled,
    updateDecisionTextTemplates,
    updateInvitationEmailSubject,
    updateInvitationEmailBody,
    triggerApprovalReminder,
    sitzungenViewRoles,
    updateSitzungenViewRoles,
    sitzungenAbklaerungFarbe,
    updateSitzungenAbklaerungFarbe,
    beschlussRegisterViewRoles,
    beschlussRegisterVisibleCards,
    beschlussRegisterCardsByRole,
    beschlussExpiryReminderDays,
    updateBeschlussRegisterViewRoles,
    updateBeschlussRegisterVisibleCards,
    updateBeschlussRegisterCardsByRole,
    updateBeschlussExpiryReminderDays,
    refetch: fetchSettings 
  };
}
