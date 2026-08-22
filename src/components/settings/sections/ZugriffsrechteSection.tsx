import { useState } from 'react';
import {
  Shield,
  Eye,
  Receipt,
  MessageSquare,
  FileText,
  Layers,
  Lightbulb,
  Box,
  ClipboardList,
  CheckSquare,
  Calendar } from
'lucide-react';
import { SectionHeader, UserPermissionList } from '../SettingsContent';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface ZugriffsrechteSectionProps {
  profiles: Profile[];
  // Online-Benutzer
  onlineViewUsers: string[];
  updateOnlineViewUsers: (users: string[]) => Promise<{error: Error | null;}>;
  // Freigaben
  freigabenViewUsers: string[];
  updateFreigabenViewUsers: (users: string[]) => Promise<{error: Error | null;}>;
  // Nachrichten
  messageCardUsers: string[];
  updateMessageCardUsers: (users: string[]) => Promise<{error: Error | null;}>;
  // Alle Bestellungen
  allOrdersViewUsers: string[];
  updateAllOrdersViewUsers: (users: string[]) => Promise<{error: Error | null;}>;
  // Bereit zur Bestellung
  readyToOrderViewUsers: string[];
  updateReadyToOrderViewUsers: (users: string[]) => Promise<{error: Error | null;}>;
  // Bestellt
  orderedViewUsers: string[];
  updateOrderedViewUsers: (users: string[]) => Promise<{error: Error | null;}>;
  // Sammelbestellungen
  sammelbestellungenUsers: string[];
  updateSammelbestellungenUsers: (users: string[]) => Promise<{error: Error | null;}>;
  // Antragsformulare
  antragsformulareViewUsers: string[];
  updateAntragsformulareViewUsers: (users: string[]) => Promise<{error: Error | null;}>;
  // Ideen-Pool
  ideasPoolViewUsers: string[];
  updateIdeasPoolViewUsers: (users: string[]) => Promise<{error: Error | null;}>;
  // Leihgeräte
  rentalItemsAdminUsers: string[];
  updateRentalItemsAdminUsers: (users: string[]) => Promise<{error: Error | null;}>;
  // Aufgaben
  todoAdminUsers?: string[];
  updateTodoAdminUsers?: (users: string[]) => Promise<{error: Error | null;}>;
  // Übungsplan
  trainingPlanAdminUsers?: string[];
  updateTrainingPlanAdminUsers?: (users: string[]) => Promise<{error: Error | null;}>;
}

export function ZugriffsrechteSection({
  profiles,
  onlineViewUsers,
  updateOnlineViewUsers,
  freigabenViewUsers,
  updateFreigabenViewUsers,
  messageCardUsers,
  updateMessageCardUsers,
  allOrdersViewUsers,
  updateAllOrdersViewUsers,
  readyToOrderViewUsers,
  updateReadyToOrderViewUsers,
  orderedViewUsers,
  updateOrderedViewUsers,
  sammelbestellungenUsers,
  updateSammelbestellungenUsers,
  antragsformulareViewUsers,
  updateAntragsformulareViewUsers,
  ideasPoolViewUsers,
  updateIdeasPoolViewUsers,
  rentalItemsAdminUsers,
  updateRentalItemsAdminUsers,
  todoAdminUsers = [],
  updateTodoAdminUsers,
  trainingPlanAdminUsers = [],
  updateTrainingPlanAdminUsers
}: ZugriffsrechteSectionProps) {
  const [saving, setSaving] = useState<string | null>(null);

  const handleToggle = async (
  key: string,
  userId: string,
  currentList: string[],
  updateFn: (users: string[]) => Promise<{error: Error | null;}>) =>
  {
    setSaving(key);
    const newList = currentList.includes(userId) ?
    currentList.filter((id) => id !== userId) :
    [...currentList, userId];
    await updateFn(newList);
    setSaving(null);
  };

  // Filter out admin/kommandant for some lists
  const nonAdminProfiles = profiles.filter(
    (p) => p.role !== 'admin' && p.role !== 'kommandant'
  );

  const permissionGroups = [
  {
    id: 'online',
    title: 'Online-Benutzer Ansicht',
    description: 'Wer kann sehen, wer online ist',
    icon: Eye,
    iconColor: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    users: profiles,
    selectedIds: onlineViewUsers,
    updateFn: updateOnlineViewUsers,
    emptyMessage: 'Niemand kann die Online-Ansicht sehen.',
    selectedMessage: (n: number) => `${n} Benutzer ${n === 1 ? 'kann' : 'können'} sehen, wer online ist.`
  },
  {
    id: 'freigaben',
    title: 'Übersicht Freigaben',
    description: 'Zusätzlich zu Kassier-Funktion',
    icon: Receipt,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-100',
    users: profiles,
    selectedIds: freigabenViewUsers,
    updateFn: updateFreigabenViewUsers,
    emptyMessage: 'Nur Kassier hat Zugriff.',
    selectedMessage: (n: number) => `${n} zusätzliche Benutzer haben Zugriff.`
  },
  {
    id: 'messages',
    title: 'Nachrichten senden',
    description: 'Nachrichtenfunktion auf Dashboard',
    icon: MessageSquare,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-100',
    users: profiles,
    selectedIds: messageCardUsers,
    updateFn: updateMessageCardUsers,
    emptyMessage: 'Niemand kann Nachrichten senden.',
    selectedMessage: (n: number) => `${n} Benutzer ${n === 1 ? 'kann' : 'können'} Nachrichten senden.`
  },
  {
    id: 'allorders',
    title: 'Alle Bestellungen anzeigen',
    description: 'Zusätzlich zu Admin/Kdt/Kassier',
    icon: ClipboardList,
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-100',
    users: nonAdminProfiles,
    selectedIds: allOrdersViewUsers,
    updateFn: updateAllOrdersViewUsers,
    emptyMessage: 'Nur Admin, Kdt und Kassier sehen alle.',
    selectedMessage: (n: number) => `${n} zusätzliche Benutzer sehen alle Bestellungen.`
  },
  {
    id: 'readytoorder',
    title: 'Bereit zur Bestellung',
    description: 'Filter für bestellbare Aufträge',
    icon: FileText,
    iconColor: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    users: profiles,
    selectedIds: readyToOrderViewUsers,
    updateFn: updateReadyToOrderViewUsers,
    emptyMessage: 'Niemand sieht den Filter.',
    selectedMessage: (n: number) => `${n} Benutzer ${n === 1 ? 'sieht' : 'sehen'} den Filter.`
  },
  {
    id: 'ordered',
    title: 'Bestellt-Status',
    description: 'Filter für bestellte Aufträge',
    icon: FileText,
    iconColor: 'text-teal-600',
    bgColor: 'bg-teal-100',
    users: profiles,
    selectedIds: orderedViewUsers,
    updateFn: updateOrderedViewUsers,
    emptyMessage: 'Niemand sieht den Filter.',
    selectedMessage: (n: number) => `${n} Benutzer ${n === 1 ? 'sieht' : 'sehen'} den Filter.`
  },
  {
    id: 'sammel',
    title: 'Sammelbestellungen',
    description: 'Bestellungen zusammenfassen',
    icon: Layers,
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-100',
    users: profiles,
    selectedIds: sammelbestellungenUsers,
    updateFn: updateSammelbestellungenUsers,
    emptyMessage: 'Niemand kann Sammelbestellungen nutzen.',
    selectedMessage: (n: number) => `${n} Benutzer ${n === 1 ? 'kann' : 'können'} Sammelbestellungen nutzen.`
  },
  {
    id: 'antraege',
    title: 'Antragsformulare',
    description: 'Auszahlungsanweisungen',
    icon: FileText,
    iconColor: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    users: profiles,
    selectedIds: antragsformulareViewUsers,
    updateFn: updateAntragsformulareViewUsers,
    emptyMessage: 'Niemand hat Zugriff.',
    selectedMessage: (n: number) => `${n} Benutzer ${n === 1 ? 'hat' : 'haben'} Zugriff.`
  },
  {
    id: 'ideen',
    title: 'Ideen-Pool',
    description: 'Zusätzlich zu Admin/Kdt',
    icon: Lightbulb,
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-100',
    users: nonAdminProfiles,
    selectedIds: ideasPoolViewUsers,
    updateFn: updateIdeasPoolViewUsers,
    emptyMessage: 'Nur Admin und Kdt haben Zugriff.',
    selectedMessage: (n: number) => `${n} zusätzliche Benutzer haben Zugriff.`
  },
  {
    id: 'rental',
    title: 'Leihgeräte-Admins',
    description: 'Leihgeräte verwalten',
    icon: Box,
    iconColor: 'text-rose-600',
    bgColor: 'bg-rose-100',
    users: nonAdminProfiles,
    selectedIds: rentalItemsAdminUsers,
    updateFn: updateRentalItemsAdminUsers,
    emptyMessage: 'Nur Admin und Kdt können verwalten.',
    selectedMessage: (n: number) => `${n} zusätzliche Benutzer können verwalten.`
  },
  ...(updateTodoAdminUsers ? [{
    id: 'aufgaben',
    title: 'Aufgaben-Einstellungen',
    description: 'Aufgaben-Modul administrieren',
    icon: CheckSquare,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-100',
    users: nonAdminProfiles,
    selectedIds: todoAdminUsers,
    updateFn: updateTodoAdminUsers,
    emptyMessage: 'Nur Admin und Kdt können Einstellungen ändern.',
    selectedMessage: (n: number) => `${n} zusätzliche Benutzer können administrieren.`
  }] : []),
  ...(updateTrainingPlanAdminUsers ? [{
    id: 'uebungsplan',
    title: 'Übungsplan-Generator',
    description: 'Übungspläne erstellen und verwalten',
    icon: Calendar,
    iconColor: 'text-red-600',
    bgColor: 'bg-red-100',
    users: nonAdminProfiles,
    selectedIds: trainingPlanAdminUsers,
    updateFn: updateTrainingPlanAdminUsers,
    emptyMessage: 'Nur Admin und Kdt können Übungspläne verwalten.',
    selectedMessage: (n: number) => `${n} zusätzliche Benutzer können Übungspläne verwalten.`
  }] : [])];


  return (
    <div data-ev-id="ev_ccc62aacd2">
      <SectionHeader
        icon={Shield}
        title="Zugriffsrechte"
        description="Verwalten Sie, welche Benutzer auf welche Funktionen zugreifen dürfen." />


      <div data-ev-id="ev_dbf554a818" className="grid gap-4">
        {permissionGroups.map((group) =>
        <UserPermissionList
          key={group.id}
          title={group.title}
          description={group.description}
          icon={group.icon}
          iconColor={group.iconColor}
          bgColor={group.bgColor}
          users={group.users}
          selectedUserIds={group.selectedIds}
          onToggleUser={(userId) =>
          handleToggle(group.id, userId, group.selectedIds, group.updateFn)
          }
          saving={saving === group.id}
          emptyMessage={group.emptyMessage}
          selectedMessage={group.selectedMessage} />

        )}
      </div>
    </div>);

}