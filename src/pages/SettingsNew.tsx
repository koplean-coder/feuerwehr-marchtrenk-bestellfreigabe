import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { useProfiles, type UserRole } from '@/hooks/useProfiles';
import { useFunctions } from '@/hooks/useFunctions';
import { useRentalItems } from '@/hooks/useRentalItems';
import { useTodoSettings } from '@/hooks/useTodoSettings';
import { useSimulation } from '@/contexts/SimulationContext';
import { Layout } from '@/components/Layout';
import { Navigate, useSearchParams } from 'react-router';
import { Settings as SettingsIcon } from 'lucide-react';

import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { ZugriffsrechteSection } from '@/components/settings/sections/ZugriffsrechteSection';
import type { SettingsSection } from '@/components/settings/settingsTypes';

// Import existing components
import { ProblemReportsAdmin } from '@/components/ProblemReportsAdmin';
import { EmailTemplateEditor, DEFAULT_EMAIL_DESIGN, type EmailTemplateDesign } from '@/components/EmailTemplateEditor';

// Section Components (will be created)
import { FreigabenSection } from '@/components/settings/sections/FreigabenSection';
import { EskalationSection } from '@/components/settings/sections/EskalationSection';
import { ErinnerungenSection } from '@/components/settings/sections/ErinnerungenSection';
import { PdfSection } from '@/components/settings/sections/PdfSection';
import { EmailEmpfaengerSection } from '@/components/settings/sections/EmailEmpfaengerSection';
import { SystemSection } from '@/components/settings/sections/SystemSection';
import { MitgliederSection } from '@/components/settings/sections/MitgliederSection';
import { FunktionenSection } from '@/components/settings/sections/FunktionenSection';
import { EmailVorlagenSection } from '@/components/settings/sections/EmailVorlagenSection';
import { LeihgeraeteSection } from '@/components/settings/sections/LeihgeraeteSection';
import { AufgabenSection } from '@/components/settings/sections/AufgabenSection';
import { ModulBerechtigungenSection } from '@/components/settings/sections/ModulBerechtigungenSection';
import { TagesordnungSection } from '@/components/settings/sections/TagesordnungSection';

export default function SettingsNew() {
  const { profile: currentProfile, createUser, refetchProfile, user } = useAuth();
  const { isSimulationActive, effectiveIsAdmin, effectiveIsKommandant, canAccessSettings: simCanAccessSettings, effectiveUserId } = useSimulation();
  const settings = useSettings();
  const { items: rentalItems, loading: rentalItemsLoading, createItem: createRentalItem, updateItem: updateRentalItem, deleteItem: deleteRentalItem, toggleActive: toggleRentalItemActive } = useRentalItems();
  const { profiles, updateRole, updateProfile, updateDefaultBereichsleiter, updateSubstitute, setAbsence, loading: profilesLoading, refetch: refetchProfiles } = useProfiles();
  const { functions, loading: functionsLoading, addFunction, updateFunction, deleteFunction } = useFunctions();
  const todoSettings = useTodoSettings();

  // Use simulated permissions
  const isAdmin = effectiveIsAdmin;
  const isKommandant = effectiveIsKommandant;
  const canAccessSettings = simCanAccessSettings;
  const effectiveUser = isSimulationActive ? effectiveUserId : user?.id;

  // Check if user can administer rental items
  const canAdminRentalItems = isAdmin || isKommandant || effectiveUser && settings.rentalItemsAdminUsers.includes(effectiveUser);

  // Default section based on permissions
  const getDefaultSection = (): SettingsSection => {
    if (!canAccessSettings && canAdminRentalItems) return 'leihgeraete';
    return 'freigaben';
  };

  const [activeSection, setActiveSection] = useState<SettingsSection>(getDefaultSection());
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle URL parameter for direct section navigation (e.g., /einstellungen?section=probleme)
  useEffect(() => {
    const sectionParam = searchParams.get('section');
    const validSections: SettingsSection[] = ['freigaben', 'eskalation', 'erinnerungen', 'pdf', 'email-empfaenger', 'system', 'zugriffsrechte', 'mitglieder', 'funktionen', 'email-vorlagen', 'email-design', 'leihgeraete', 'probleme', 'aufgaben', 'modul-berechtigungen', 'tagesordnung'];
    if (sectionParam && validSections.includes(sectionParam as SettingsSection)) {
      setActiveSection(sectionParam as SettingsSection);
      // Clear the URL param after processing
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Loading state
  if (settings.loading && !canAccessSettings) {
    return (
      <Layout>
        <div data-ev-id="ev_a2b3c0aead" className="flex items-center justify-center min-h-[50vh]">
          <div data-ev-id="ev_ea3ea463ad" className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>);

  }

  // Redirect if not authorized
  if (!settings.loading && !canAccessSettings && !canAdminRentalItems) {
    return <Navigate to="/" replace />;
  }

  // Render the active section content
  const renderContent = () => {
    // Wenn Benutzer nur Leihgeräte-Admin ist, nur diese Section erlauben
    if (!canAccessSettings && canAdminRentalItems) {
      if (activeSection !== 'leihgeraete') {
        // Automatisch zur Leihgeräte-Section wechseln
        setActiveSection('leihgeraete');
        return null;
      }
      return (
        <LeihgeraeteSection
          rentalItems={rentalItems}
          rentalItemsLoading={rentalItemsLoading}
          createRentalItem={createRentalItem}
          updateRentalItem={updateRentalItem}
          deleteRentalItem={deleteRentalItem}
          toggleRentalItemActive={toggleRentalItemActive}
          rentalDeliveryCost={settings.rentalDeliveryCost}
          updateRentalDeliveryCost={settings.updateRentalDeliveryCost}
          rentalContractClauses={settings.rentalContractClauses}
          updateRentalContractClauses={settings.updateRentalContractClauses}
          rentalContractNotes={settings.rentalContractNotes}
          updateRentalContractNotes={settings.updateRentalContractNotes}
          rentalContractBankDetails={settings.rentalContractBankDetails}
          updateRentalContractBankDetails={settings.updateRentalContractBankDetails}
          rentalContractDueDays={settings.rentalContractDueDays}
          updateRentalContractDueDays={settings.updateRentalContractDueDays}
          rentalNotificationEmail={settings.rentalNotificationEmail}
          updateRentalNotificationEmail={settings.updateRentalNotificationEmail}
          rentalNotificationDays={settings.rentalNotificationDays}
          updateRentalNotificationDays={settings.updateRentalNotificationDays}
          alternativePricesLabel={settings.alternativePricesLabel}
          updateAlternativePricesLabel={settings.updateAlternativePricesLabel} />);
    }

    switch (activeSection) {
      case 'freigaben':
        return (
          <FreigabenSection
            freigabebetragKdt={settings.freigabebetragKdt}
            freigabebetragKommandomitglied={settings.freigabebetragKommandomitglied}
            updateFreigabebetragKdt={settings.updateFreigabebetragKdt}
            updateFreigabebetragKommandomitglied={settings.updateFreigabebetragKommandomitglied} />);



      case 'eskalation':
        return (
          <EskalationSection
            escalationTimeoutHours={settings.escalationTimeoutHours}
            updateEscalationTimeoutHours={settings.updateEscalationTimeoutHours} />);



      case 'erinnerungen':
        return (
          <ErinnerungenSection
            approvalReminderEnabled={settings.approvalReminderEnabled}
            approvalReminderTime={settings.approvalReminderTime}
            updateApprovalReminderEnabled={settings.updateApprovalReminderEnabled}
            updateApprovalReminderTime={settings.updateApprovalReminderTime}
            triggerApprovalReminder={settings.triggerApprovalReminder}
            currentProfile={currentProfile}
            profiles={profiles}
            updateSubstitute={updateSubstitute}
            setAbsence={setAbsence}
            refetchProfile={refetchProfile} />);



      case 'pdf':
        return (
          <PdfSection
            pdfBackgroundUrl={settings.pdfBackgroundUrl}
            pdfBackgroundOpacity={settings.pdfBackgroundOpacity}
            commanderSignatureUrl={settings.commanderSignatureUrl}
            commanderStampUrl={settings.commanderStampUrl}
            updatePdfBackgroundUrl={settings.updatePdfBackgroundUrl}
            updatePdfBackgroundOpacity={settings.updatePdfBackgroundOpacity}
            updateCommanderSignatureUrl={settings.updateCommanderSignatureUrl}
            updateCommanderStampUrl={settings.updateCommanderStampUrl} />);



      case 'email-empfaenger':
        return (
          <EmailEmpfaengerSection
            notificationEmail={settings.notificationEmail}
            schriftfuehrerEmail={settings.schriftfuehrerEmail}
            kassierEmail={settings.kassierEmail}
            updateNotificationEmail={settings.updateNotificationEmail}
            updateSchriftfuehrerEmail={settings.updateSchriftfuehrerEmail}
            updateKassierEmail={settings.updateKassierEmail} />);



      case 'system':
        return (
          <SystemSection
            systemHomepageUrl={settings.systemHomepageUrl}
            updateSystemHomepageUrl={settings.updateSystemHomepageUrl} />);



      case 'zugriffsrechte':
        return (
          <ZugriffsrechteSection
            profiles={profiles}
            onlineViewUsers={settings.onlineViewUsers}
            updateOnlineViewUsers={settings.updateOnlineViewUsers}
            freigabenViewUsers={settings.freigabenViewUsers}
            updateFreigabenViewUsers={settings.updateFreigabenViewUsers}
            messageCardUsers={settings.messageCardUsers}
            updateMessageCardUsers={settings.updateMessageCardUsers}
            allOrdersViewUsers={settings.allOrdersViewUsers}
            updateAllOrdersViewUsers={settings.updateAllOrdersViewUsers}
            readyToOrderViewUsers={settings.readyToOrderViewUsers}
            updateReadyToOrderViewUsers={settings.updateReadyToOrderViewUsers}
            orderedViewUsers={settings.orderedViewUsers}
            updateOrderedViewUsers={settings.updateOrderedViewUsers}
            sammelbestellungenUsers={settings.sammelbestellungenUsers}
            updateSammelbestellungenUsers={settings.updateSammelbestellungenUsers}
            antragsformulareViewUsers={settings.antragsformulareViewUsers}
            updateAntragsformulareViewUsers={settings.updateAntragsformulareViewUsers}
            ideasPoolViewUsers={settings.ideasPoolViewUsers}
            updateIdeasPoolViewUsers={settings.updateIdeasPoolViewUsers}
            rentalItemsAdminUsers={settings.rentalItemsAdminUsers}
            updateRentalItemsAdminUsers={settings.updateRentalItemsAdminUsers}
            todoAdminUsers={todoSettings.adminUsers}
            updateTodoAdminUsers={async (users: string[]) => {
              const success = await todoSettings.updateGlobalSettings({ adminUsers: users });
              return { error: success ? null : new Error('Fehler beim Speichern') };
            }} />);



      case 'mitglieder':
        return (
          <MitgliederSection
            profiles={profiles}
            currentProfile={currentProfile}
            updateRole={updateRole}
            updateProfile={updateProfile}
            updateDefaultBereichsleiter={updateDefaultBereichsleiter}
            createUser={createUser}
            refetchProfiles={refetchProfiles}
            functions={functions}
            isAdmin={isAdmin}
            isKommandant={isKommandant} />);



      case 'funktionen':
        return (
          <FunktionenSection
            functions={functions}
            addFunction={addFunction}
            updateFunction={updateFunction}
            deleteFunction={deleteFunction}
            loading={functionsLoading} />);



      case 'email-vorlagen':
        return (
          <EmailVorlagenSection
            emailTemplates={settings.emailTemplates}
            updateEmailTemplate={settings.updateEmailTemplate}
            invitationEmailSubject={settings.invitationEmailSubject}
            invitationEmailBody={settings.invitationEmailBody}
            updateInvitationEmailSubject={settings.updateInvitationEmailSubject}
            updateInvitationEmailBody={settings.updateInvitationEmailBody} />);



      case 'email-design':
        return (
          <div data-ev-id="ev_b73f761569" className="max-w-4xl">
            <EmailTemplateEditor
              design={settings.emailDesign}
              onChange={(design) => settings.updateEmailDesign(design)} />

          </div>);


      case 'leihgeraete':
        return (
          <LeihgeraeteSection
            rentalItems={rentalItems}
            loading={rentalItemsLoading}
            createItem={createRentalItem}
            updateItem={updateRentalItem}
            deleteItem={deleteRentalItem}
            toggleActive={toggleRentalItemActive}
            canAccessSettings={canAccessSettings} />);



      case 'probleme':
        return <ProblemReportsAdmin />;

      case 'aufgaben':
        return <AufgabenSection profiles={profiles} />;

      case 'modul-berechtigungen':
        return <ModulBerechtigungenSection />;

      case 'tagesordnung':
        return <TagesordnungSection />;

      default:
        return <div data-ev-id="ev_d090542645">Bereich nicht gefunden</div>;
    }
  };

  return (
    <Layout>
      <div data-ev-id="ev_cc58caeb4a" className="flex h-[calc(100vh-64px)] -m-4 sm:-m-6">
        {/* Sidebar */}
        <SettingsSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          canAccessSettings={canAccessSettings}
          canAdminRentalItems={canAdminRentalItems}
          isAdmin={isAdmin}
          isKommandant={isKommandant} />

        
        {/* Main Content */}
        <main data-ev-id="ev_ff9fe751c9" className="flex-1 overflow-y-auto bg-muted/30">
          <div data-ev-id="ev_ae0550f6c6" className="p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </Layout>);

}