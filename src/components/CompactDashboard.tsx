import { Link } from 'react-router';
import { useState } from 'react';
import {
  Plus,
  Package,
  ListTodo,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  CreditCard,
  CalendarCheck,
  Euro,
  User,
  Calendar,
  Eye,
  MessageSquare,
  Send,
  Inbox,
  UserPlus,
  Vote,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Bug,
  Banknote,
  Edit2,
  Receipt } from
'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { OrderCard } from '@/components/OrderCard';
import { WorkflowBadge } from '@/components/WorkflowBadge';
import { useSettings } from '@/hooks/useSettings';
import { useOrderVotesSummary } from '@/hooks/useOrderVotesSummary';
import { usePendingVotesForUser } from '@/hooks/usePendingVotesForUser';
import { useCommandDecisions } from '@/hooks/useCommandDecisions';
import { usePendingCommandDecisionsForUser } from '@/hooks/usePendingCommandDecisionsForUser';
import { useModulePermissions } from '@/hooks/useModulePermissions';
import { InviteMemberModal } from '@/components/dashboard/InviteMemberModal';
import { useIdeas } from '@/hooks/useIdeas';
import { useProblemReports, type ProblemReport } from '@/hooks/useProblemReports';
import { RentalContractInfoModal } from '@/components/RentalContractInfoModal';
import type { Order } from '@/hooks/useOrders';
import type { PaymentOrder } from '@/hooks/usePaymentOrders';
import type { EventParticipation } from '@/hooks/useEventParticipations';
import type { PendingRentalInvoice } from '@/hooks/usePendingRentalInvoices';

interface Task {
  id: string;
  title: string;
  status?: string;
  is_completed?: boolean;
  priority?: string;
  due_date?: string | null;
  assigned_to?: string | null;
  is_in_my_day?: boolean;
  my_day_date?: string | null;
  steps?: {id: string;title: string;completed?: boolean;is_completed?: boolean;assigned_to?: string | null;}[];
}

interface Profile {
  id: string;
  full_name: string | null;
  role: string | null;
}

interface CompactDashboardProps {
  // Bestellungen
  orders: Order[];
  myOrders: Order[];
  pendingForMe: Order[];
  waitingForBereichsleiter: Order[];

  // Aufgaben
  tasks: Task[];

  // Anträge (Kommandant/Admin)
  pendingPaymentOrders: PaymentOrder[];
  pendingEventParticipations: EventParticipation[];

  // Kassier: Offene Auszahlungen
  kassierDraftOrders: PaymentOrder[];
  kassierApprovedOrders: PaymentOrder[];
  markAsPaid: (id: string) => Promise<void>;

  // Aktionen
  approveByBereichsleiter: (id: string) => Promise<void>;
  approveByKommandant: (id: string) => Promise<void>;
  approvePaymentOrder: (id: string) => Promise<void>;
  canApprovePaymentOrders: boolean;
  rejectPaymentOrder: (id: string, reason: string) => Promise<void>;
  approveEventParticipation: (id: string) => Promise<void>;
  rejectEventParticipation: (id: string, reason: string) => Promise<void>;

  // Profile
  profiles: Profile[];

  // Nachrichten
  canSendMessages: boolean;
  myMessagesCount: number;
  onOpenMessageModal: () => void;
  onOpenMessageArchive: () => void;

  // Leihverträge mit Rechnungsbedarf (für Kassier)
  pendingRentalInvoices: PendingRentalInvoice[];
  onCreateRentalInvoiceTask?: (contract: PendingRentalInvoice) => Promise<void>;
  onMarkInvoiceCreated?: (contractId: string) => Promise<void>;

  // Helpers
  getCollectiveOrderInfo: (order: Order) => {isCollective: boolean;collectiveId: string | null;} | null;
  isOrderBelowMinOrderValue: (order: Order) => boolean;
}

export function CompactDashboard({
  orders,
  myOrders,
  pendingForMe,
  waitingForBereichsleiter,
  tasks,
  pendingPaymentOrders,
  pendingEventParticipations,
  kassierDraftOrders,
  kassierApprovedOrders,
  markAsPaid,
  approveByBereichsleiter,
  approveByKommandant,
  approvePaymentOrder,
  canApprovePaymentOrders,
  rejectPaymentOrder,
  approveEventParticipation,
  rejectEventParticipation,
  profiles,
  canSendMessages,
  myMessagesCount,
  onOpenMessageModal,
  onOpenMessageArchive,
  pendingRentalInvoices,
  onCreateRentalInvoiceTask,
  onMarkInvoiceCreated,
  getCollectiveOrderInfo,
  isOrderBelowMinOrderValue
}: CompactDashboardProps) {
  const { profile, user } = useAuth();
  const {
    effectiveUserId,
    effectiveIsAdmin,
    effectiveIsKommandant,
    effectiveIsBereichsleiter,
    effectiveHasKassierFunction
  } = useSimulation();
  const { escalationTimeoutHours, systemHomepageUrl } = useSettings();
  const { voteSummaries } = useOrderVotesSummary(orders);
  const { pendingVoteOrders, canVote: canVoteOnOrders } = usePendingVotesForUser(orders);

  // Command Decisions (Kommandoabstimmungen) - eigenes System
  const { decisions } = useCommandDecisions();
  const { pendingDecisions: pendingCommandDecisions, canVote: canVoteOnDecisions } = usePendingCommandDecisionsForUser(decisions);

  // Ideen-Pool
  const { ideas, unreadIdeasCount, isIdeaRead } = useIdeas();

  // Problemmeldungen (nur für Admin/Kdt)
  const { reports: problemReports } = useProblemReports();

  const { hasModuleAccess } = useModulePermissions();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedRentalContract, setSelectedRentalContract] = useState<PendingRentalInvoice | null>(null);

  // Prüfen ob Nutzer-Rolle (dann Matrix-Berechtigungen anwenden)
  const isNutzerRole = profile?.role === 'nutzer';

  // Modul-Zugriff prüfen (nur für Nutzer-Rolle relevant)
  const canAccessBestellungen = !isNutzerRole || hasModuleAccess('bestellungen');
  const canAccessAufgaben = !isNutzerRole || hasModuleAccess('aufgaben');
  const canAccessLieferanten = !isNutzerRole || hasModuleAccess('lieferanten');

  // Berechtigung zum Einladen
  const canInviteMembers = effectiveIsAdmin || effectiveIsKommandant || effectiveIsBereichsleiter;

  // Registration URL - remove trailing slash to avoid double slashes
  const baseUrl = systemHomepageUrl?.replace(/\/$/, '') || window.location.origin;
  const registrationUrl = `${baseUrl}/register`;

  // Meine offenen Bestellungen (nicht abgeschlossen/archiviert)
  const myOpenOrders = myOrders.filter(
    (o) => !['erledigt', 'archiviert', 'abgelehnt'].includes(o.status)
  );

  // Meine Aufgaben (excludes completed)
  // Includes: assigned to me OR in "Mein Tag" (today)
  const today = new Date().toISOString().split('T')[0];
  const myTasks = tasks.filter(
    (t) => {
      const task = t as { assigned_to?: string | null; is_in_my_day?: boolean; my_day_date?: string; is_completed?: boolean; status?: string };
      const isAssignedToMe = task.assigned_to === effectiveUserId;
      const isInMyDay = task.is_in_my_day === true && task.my_day_date === today;
      // Support both old (status) and new (is_completed) task formats
      const isCompleted = task.is_completed === true || task.status === 'completed' || task.status === 'cancelled' || task.status === 'behoben';
      return (isAssignedToMe || isInMyDay) && !isCompleted;
    }
  );

  // Meine Schritte (aus allen Aufgaben)
  const mySteps = tasks.
  flatMap((t) => (t.steps || []).map((s) => ({ ...s, taskTitle: t.title }))).
  filter((s) => {
    const step = s as { assigned_to?: string | null; completed?: boolean; is_completed?: boolean };
    const isCompleted = step.completed === true || step.is_completed === true;
    return step.assigned_to === effectiveUserId && !isCompleted;
  });

  // Bestellungen zur Freigabe (für BL)
  // WICHTIG: Direkt aus orders filtern, da waitingForBereichsleiter auf echter Rolle basiert (nicht simuliert)
  const ordersToApprove = effectiveIsBereichsleiter ?
  orders.filter((o) => o.status === 'eingereicht' && o.bereichsleiter_id === effectiveUserId) :
  [];

  // Bestellungen zur Genehmigung (für Kommandant)
  // WICHTIG: Direkt aus orders filtern, da pendingForMe auf echter Rolle basiert (nicht simuliert)
  const ordersToApproveKommandant = effectiveIsKommandant ?
  orders.filter((o) => {
    // Nach BL-Freigabe, wartet auf Kommandant
    if (o.status === 'ausstehend_kommandant') return true;
    // Direkt zum Kommandant (kein BL zugewiesen, KDT-Freigabe erforderlich)
    if (o.status === 'eingereicht' && o.requires_kommandant_approval && !o.bereichsleiter_id) return true;
    // Kommandant ist auch der zugewiesene BL - kann beides gleichzeitig freigeben
    if (o.status === 'eingereicht' && o.bereichsleiter_id === effectiveUserId) return true;
    return false;
  }) :
  [];

  // Kassier: Zähle Entwürfe und genehmigte Auszahlungen
  const kassierTodoCount = effectiveHasKassierFunction ?
  kassierDraftOrders.length + kassierApprovedOrders.length : 0;

  // Leihverträge mit Rechnungsbedarf (nur für Kassier zählen)
  const rentalInvoiceCount = effectiveHasKassierFunction ? pendingRentalInvoices.length : 0;

  // Zähle alles was zu erledigen ist
  const todoCount = ordersToApprove.length +
  ordersToApproveKommandant.length +
  pendingPaymentOrders.length +
  pendingEventParticipations.length +
  pendingVoteOrders.length + // Offene Bestellungs-Abstimmungen für Kommandomitglieder
  pendingCommandDecisions.length + // Offene Kommandoabstimmungen (Umlaufbeschlüsse)
  kassierTodoCount + // Kassier: Entwürfe + genehmigte Auszahlungen
  rentalInvoiceCount + // Kassier: Leihverträge mit Rechnungsbedarf
  myTasks.length; // Zugewiesene ToDo-Aufgaben

  // Kann Anträge genehmigen?
  const canApproveApplications = effectiveIsAdmin || effectiveIsKommandant;

  return (
    <div data-ev-id="ev_07af48e9bd" className="flex flex-col gap-5">
      {/* === HEADER: Begrüßung & Quick Action === */}
      <div data-ev-id="ev_eaea0e32f5" className="bg-card border border-border rounded-xl p-5">
        <div data-ev-id="ev_654e610f14" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div data-ev-id="ev_16f04f27db">
            <h1 data-ev-id="ev_5db2740adf" className="text-xl font-semibold text-foreground">
              Hallo {profile?.full_name?.split(' ').slice(1).join(' ') || profile?.full_name?.split(' ')[0] || 'Benutzer'}! 👋
            </h1>
            <p data-ev-id="ev_5a8297e6c8" className="text-muted-foreground text-sm mt-1">
              {todoCount > 0 ?
              <>
                  <span data-ev-id="ev_8bcd2904ea" className="font-medium text-red-600">{todoCount} {todoCount === 1 ? 'Sache' : 'Sachen'}</span> {todoCount === 1 ? 'wartet' : 'warten'} auf dich
                </> :
              myOpenOrders.length > 0 ?
              <>
                  Du hast <span data-ev-id="ev_c1c7b2d1cb" className="font-medium text-primary">{myOpenOrders.length} offene Bestellung{myOpenOrders.length !== 1 ? 'en' : ''}</span>
                </> :

              'Alles erledigt! 🎉'
              }
            </p>
          </div>
          <div data-ev-id="ev_cbba6ffd41" className="flex items-center gap-2">
            {canSendMessages &&
            <button data-ev-id="ev_6c0912b69b"
            onClick={onOpenMessageModal}
            className="p-2.5 border border-border rounded-lg hover:bg-muted transition-colors"
            title="Nachricht senden">

                <Send className="w-4 h-4 text-muted-foreground" />
              </button>
            }
            {myMessagesCount > 0 &&
            <button data-ev-id="ev_ea47295b90"
            onClick={onOpenMessageArchive}
            className="p-2.5 border border-border rounded-lg hover:bg-muted transition-colors relative"
            title="Nachrichten">

                <Inbox className="w-4 h-4 text-muted-foreground" />
                <span data-ev-id="ev_1e981119c8" className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {myMessagesCount > 9 ? '9+' : myMessagesCount}
                </span>
              </button>
            }
            {canInviteMembers &&
            <button data-ev-id="ev_0992ec5f7c"
            onClick={() => setShowInviteModal(true)}
            className="p-2.5 border border-border rounded-lg hover:bg-muted transition-colors"
            title="Mitglied einladen">
                <UserPlus className="w-4 h-4 text-muted-foreground" />
              </button>
            }
            {canAccessBestellungen &&
            <Link
              to="/bestellungen/neu"
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">

              <Plus className="w-4 h-4" />
              Neue Bestellung
            </Link>
            }
          </div>
        </div>
      </div>

      {/* === ZU ERLEDIGEN (immer sichtbar) === */}
      <div data-ev-id="ev_26f572e96e" className={`rounded-xl overflow-hidden border-2 ${
      todoCount > 0 ?
      'bg-red-50 border-red-200' :
      'bg-green-50 border-green-200'}`
      }>
        <div data-ev-id="ev_d9fd439b63" className={`px-4 py-3 border-b flex items-center justify-between ${
        todoCount > 0 ?
        'bg-red-100 border-red-200' :
        'bg-green-100 border-green-200'}`
        }>
          <div data-ev-id="ev_8e4fafa8c1" className="flex items-center gap-2">
            {todoCount > 0 ?
            <AlertCircle className="w-5 h-5 text-red-600" /> :

            <CheckCircle className="w-5 h-5 text-green-600" />
            }
            <span data-ev-id="ev_a52d235127" className={`font-semibold ${todoCount > 0 ? 'text-red-800' : 'text-green-800'}`}>
              Zu erledigen
            </span>
            {todoCount > 0 &&
            <span data-ev-id="ev_d256ec5171" className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full font-bold">
                {todoCount}
              </span>
            }
          </div>
        </div>
        
        {todoCount === 0 ?
        <div data-ev-id="ev_empty_todo" className="px-4 py-6 text-center">
            <p data-ev-id="ev_4684d53c21" className="text-green-700 font-medium">Nichts zu erledigen – Zeit für einen Kaffee! ☕</p>
          </div> :

        <div data-ev-id="ev_f9ac1d751a" className="divide-y divide-red-200">
            {/* Bestellungen zur Freigabe (BL) */}
            {ordersToApprove.map((order) => {
            const creator = profiles.find((p) => p.id === order.created_by);
            return (
              <div data-ev-id="ev_39cb7ea8cd" key={order.id} className="px-4 py-3 hover:bg-red-100/50 transition-colors flex items-center justify-between">
                  <div data-ev-id="ev_2f66a2a5be" className="flex items-center gap-3">
                    <div data-ev-id="ev_ba7ea66482" className="w-10 h-10 rounded-full bg-red-200 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-red-600" />
                    </div>
                    <div data-ev-id="ev_61700718dc">
                      <p data-ev-id="ev_6486a03dfe" className="font-medium text-foreground">
                        <span data-ev-id="ev_banf_tag_bl" className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded mr-2">BANF</span>
                        {order.title}
                      </p>
                      <p data-ev-id="ev_4189e5d2b0" className="text-xs text-muted-foreground">
                        von {creator?.full_name || 'Unbekannt'} · € {order.amount.toFixed(2)}
                      </p>
                      <WorkflowBadge order={order} profiles={profiles} escalationTimeoutHours={escalationTimeoutHours} voteSummary={voteSummaries[order.id]} compact={true} />
                    </div>
                  </div>
                  <div data-ev-id="ev_e87a12b929" className="flex items-center gap-2">
                    <button data-ev-id="ev_eeaa64836a"
                  onClick={() => approveByBereichsleiter(order.id)}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium">

                      Freigeben
                    </button>
                    <Link
                    to={`/bestellungen/${order.id}`}
                    className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">

                      Details
                    </Link>
                  </div>
                </div>);

          })}

            {/* Bestellungen zur Genehmigung (Kommandant) */}
            {ordersToApproveKommandant.map((order) => {
            const creator = profiles.find((p) => p.id === order.created_by);
            return (
              <div data-ev-id="ev_dde54c3a79" key={order.id} className="px-4 py-3 hover:bg-red-100/50 transition-colors flex items-center justify-between">
                  <div data-ev-id="ev_5b29a4f358" className="flex items-center gap-3">
                    <div data-ev-id="ev_5edbcbe25a" className="w-10 h-10 rounded-full bg-orange-200 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-orange-600" />
                    </div>
                    <div data-ev-id="ev_e04419758d">
                      <p data-ev-id="ev_f51075b55f" className="font-medium text-foreground">
                        <span data-ev-id="ev_banf_tag_kdt" className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded mr-2">BANF</span>
                        {order.title}
                      </p>
                      <p data-ev-id="ev_22306a3c91" className="text-xs text-muted-foreground">
                        von {creator?.full_name || 'Unbekannt'} · € {order.amount.toFixed(2)}
                      </p>
                      <WorkflowBadge order={order} profiles={profiles} escalationTimeoutHours={escalationTimeoutHours} voteSummary={voteSummaries[order.id]} compact={true} />
                    </div>
                  </div>
                  <div data-ev-id="ev_ded21e37a8" className="flex items-center gap-2">
                    <button data-ev-id="ev_02fb0d8d1f"
                  onClick={() => approveByKommandant(order.id)}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium">

                      Genehmigen
                    </button>
                    <Link
                    to={`/bestellungen/${order.id}`}
                    className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">

                      Details
                    </Link>
                  </div>
                </div>);

          })}

            {/* Auszahlungsanweisungen */}
            {pendingPaymentOrders.map((po) => {
            const creator = profiles.find((p) => p.id === po.created_by);
            return (
              <div data-ev-id="ev_df5db40c81" key={po.id} className="px-4 py-3 hover:bg-red-100/50 transition-colors flex items-center justify-between">
                  <div data-ev-id="ev_edf21880d3" className="flex items-center gap-3">
                    <div data-ev-id="ev_f5c33dec58" className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <div data-ev-id="ev_a4d45ca91f">
                      <p data-ev-id="ev_c13ce37119" className="font-medium text-foreground">
                        <span data-ev-id="ev_7f9e4dc387" className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mr-2">Auszahlung</span>
                        {po.purpose}
                      </p>
                      <p data-ev-id="ev_a41bf6769b" className="text-xs text-muted-foreground">
                        von {creator?.full_name || 'Unbekannt'} · € {po.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div data-ev-id="ev_965c3534f3" className="flex items-center gap-2">
                    {canApprovePaymentOrders &&
                  <button data-ev-id="ev_cef2a31030"
                  onClick={() => approvePaymentOrder(po.id)}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium">

                      Genehmigen
                    </button>
                  }
                    <Link
                    to="/antragsformulare"
                    className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">

                      Details
                    </Link>
                  </div>
                </div>);

          })}

            {/* Veranstaltungsteilnahmen */}
            {pendingEventParticipations.map((ep) => {
            const creator = profiles.find((p) => p.id === ep.created_by);
            return (
              <div data-ev-id="ev_d12828dd13" key={ep.id} className="px-4 py-3 hover:bg-red-100/50 transition-colors flex items-center justify-between">
                  <div data-ev-id="ev_5e082942bc" className="flex items-center gap-3">
                    <div data-ev-id="ev_5ffb110cc9" className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center">
                      <CalendarCheck className="w-5 h-5 text-purple-600" />
                    </div>
                    <div data-ev-id="ev_93b7f5f9bd">
                      <p data-ev-id="ev_83c3e36fc1" className="font-medium text-foreground">
                        <span data-ev-id="ev_d42f24bc3a" className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded mr-2">Veranstaltung</span>
                        {ep.event_name}
                      </p>
                      <p data-ev-id="ev_a25d9d09a8" className="text-xs text-muted-foreground">
                        von {creator?.full_name || 'Unbekannt'} · {ep.event_date ? new Date(ep.event_date).toLocaleDateString('de-AT') : ''}
                      </p>
                    </div>
                  </div>
                  <div data-ev-id="ev_1b39fd6acb" className="flex items-center gap-2">
                    <button data-ev-id="ev_627ab28ba9"
                  onClick={() => approveEventParticipation(ep.id)}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium">

                      Genehmigen
                    </button>
                    <Link
                    to="/antragsformulare"
                    className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">

                      Details
                    </Link>
                  </div>
                </div>);

          })}

            {/* Leihverträge mit Rechnungsbedarf (für Kassier) */}
            {effectiveHasKassierFunction && pendingRentalInvoices.map((contract) =>
          <div data-ev-id="ev_rental_invoice" key={contract.id} className="px-4 py-3 hover:bg-red-100/50 transition-colors flex items-center justify-between">
                <div data-ev-id="ev_e85f92c816" className="flex items-center gap-3">
                  <div data-ev-id="ev_e8acdd7f36" className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-amber-600" />
                  </div>
                  <div data-ev-id="ev_6398e15e52">
                    <p data-ev-id="ev_fb4fa4f823" className="font-medium text-foreground">
                      <span data-ev-id="ev_df7b43cfb2" className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded mr-2">Rechnung</span>
                      {contract.contract_number}
                    </p>
                    <p data-ev-id="ev_21b29bb76d" className="text-xs text-muted-foreground">
                      {contract.customer_name} · € {contract.total_amount.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div data-ev-id="ev_60d5afa304" className="flex items-center gap-2">
                  {onMarkInvoiceCreated &&
              <button data-ev-id="ev_mark_invoiced"
              onClick={() => onMarkInvoiceCreated(contract.id)}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium">
                      Erledigt
                    </button>
              }
                  <button data-ev-id="ev_ad3a32ebc8"
              onClick={() => setSelectedRentalContract(contract)}
              className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                    Details
                  </button>
                </div>
              </div>
          )}

            {/* Offene Bestellungs-Abstimmungen (für Kommandomitglieder) */}
            {pendingVoteOrders.map((order) => {
            const creator = profiles.find((p) => p.id === order.created_by);
            return (
              <div data-ev-id="ev_pending_vote" key={order.id} className="px-4 py-3 hover:bg-red-100/50 transition-colors flex items-center justify-between">
                  <div data-ev-id="ev_pending_vote_left" className="flex items-center gap-3">
                    <div data-ev-id="ev_pending_vote_icon" className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div data-ev-id="ev_pending_vote_content">
                      <p data-ev-id="ev_pending_vote_title" className="font-medium text-foreground">
                        <span data-ev-id="ev_vote_tag" className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mr-2">Abstimmung</span>
                        {order.title}
                      </p>
                      <p data-ev-id="ev_pending_vote_meta" className="text-xs text-muted-foreground">
                        von {creator?.full_name || 'Unbekannt'} · € {order.amount.toFixed(2)}
                      </p>
                      <WorkflowBadge order={order} profiles={profiles} escalationTimeoutHours={escalationTimeoutHours} voteSummary={voteSummaries[order.id]} compact={true} />
                    </div>
                  </div>
                  <div data-ev-id="ev_pending_vote_actions" className="flex items-center gap-2">
                    <Link
                    to={`/bestellungen/${order.id}`}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium">

                      Abstimmen
                    </Link>
                  </div>
                </div>);

          })}

            {/* Offene Kommandoabstimmungen (Umlaufbeschlüsse) */}
            {pendingCommandDecisions.map((decision) => {
            return (
              <div data-ev-id="ev_pending_decision" key={decision.id} className="px-4 py-3 hover:bg-red-100/50 transition-colors flex items-center justify-between">
                  <div data-ev-id="ev_pending_decision_left" className="flex items-center gap-3">
                    <div data-ev-id="ev_pending_decision_icon" className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center">
                      <Vote className="w-5 h-5 text-purple-600" />
                    </div>
                    <div data-ev-id="ev_pending_decision_content">
                      <p data-ev-id="ev_pending_decision_title" className="font-medium text-foreground">
                        <span data-ev-id="ev_decision_tag" className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded mr-2">Kommandoabstimmung</span>
                        {decision.title}
                      </p>
                      <p data-ev-id="ev_pending_decision_meta" className="text-xs text-muted-foreground">
                        von {decision.creator?.full_name || 'Unbekannt'} · {decision.reference_number}
                      </p>
                    </div>
                  </div>
                  <div data-ev-id="ev_pending_decision_actions" className="flex items-center gap-2">
                    <Link
                    to="/kommandobeschluesse"
                    className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors font-medium">

                      Abstimmen
                    </Link>
                  </div>
                </div>);

          })}

            {/* Kassier: Offene Auszahlungsanweisungen */}
            {effectiveHasKassierFunction && kassierTodoCount > 0 &&
          <>
                {/* Überschrift für Kassier-Bereich */}
                <div data-ev-id="ev_kassier_header" className="px-4 py-2 bg-purple-50 border-y border-purple-200">
                  <p data-ev-id="ev_0ab83c2e24" className="text-sm font-medium text-purple-800 flex items-center gap-2">
                    <Banknote className="w-4 h-4" />
                    Kassier: Auszahlungen zu bearbeiten
                  </p>
                </div>

                {/* Entwürfe */}
                {kassierDraftOrders.map((po) => {
              const creator = profiles.find((p) => p.id === po.created_by);
              return (
                <div data-ev-id="ev_kassier_draft" key={po.id} className="px-4 py-3 hover:bg-purple-50/50 transition-colors flex items-center justify-between">
                      <div data-ev-id="ev_57496796b2" className="flex items-center gap-3">
                        <div data-ev-id="ev_31bd15d6b2" className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center">
                          <Edit2 className="w-5 h-5 text-amber-600" />
                        </div>
                        <div data-ev-id="ev_f7fa7615ac">
                          <p data-ev-id="ev_81009ce4e6" className="font-medium text-foreground">
                            <span data-ev-id="ev_e3f40d8935" className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded mr-2">Entwurf</span>
                            {po.purpose}
                          </p>
                          <p data-ev-id="ev_be550f0e21" className="text-xs text-muted-foreground">
                            von {creator?.full_name || 'Unbekannt'} · € {po.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <Link
                    to={`/antragsformulare?edit=${po.id}`}
                    className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors font-medium">
                        Bearbeiten
                      </Link>
                    </div>);

            })}

                {/* Genehmigte - zur Auszahlung */}
                {kassierApprovedOrders.map((po) => {
              const creator = profiles.find((p) => p.id === po.created_by);
              return (
                <div data-ev-id="ev_kassier_approved" key={po.id} className="px-4 py-3 hover:bg-purple-50/50 transition-colors flex items-center justify-between">
                      <div data-ev-id="ev_d5dd991f22" className="flex items-center gap-3">
                        <div data-ev-id="ev_62462202e0" className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
                          <Banknote className="w-5 h-5 text-green-600" />
                        </div>
                        <div data-ev-id="ev_df877c84a9">
                          <p data-ev-id="ev_b9fe4e9ac5" className="font-medium text-foreground">
                            <span data-ev-id="ev_8415e1f327" className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded mr-2">Genehmigt</span>
                            {po.purpose}
                          </p>
                          <p data-ev-id="ev_032ab98c51" className="text-xs text-muted-foreground">
                            von {creator?.full_name || 'Unbekannt'} · € {po.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div data-ev-id="ev_94a4e2250b" className="flex items-center gap-2">
                        <button data-ev-id="ev_593d3cff35"
                    onClick={() => markAsPaid(po.id)}
                    className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors font-medium">
                          Ausgezahlt
                        </button>
                        <Link
                      to="/antragsformulare"
                      className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                          Details
                        </Link>
                      </div>
                    </div>);

            })}
              </>
          }

            {/* Zugewiesene ToDo-Aufgaben */}
            {myTasks.map((task) =>
          <Link
            key={task.id}
            to={`/aufgaben?task=${task.id}`}
            className="px-4 py-3 hover:bg-red-100/50 transition-colors flex items-center justify-between block">
                <div data-ev-id="ev_todo_task_left" className="flex items-center gap-3">
                  <div data-ev-id="ev_todo_task_icon" className={`w-10 h-10 rounded-full flex items-center justify-center ${
              task.priority === 'urgent' ? 'bg-red-200' :
              task.priority === 'high' ? 'bg-orange-200' :
              'bg-blue-200'}`
              }>
                    <ListTodo className={`w-5 h-5 ${
                task.priority === 'urgent' ? 'text-red-600' :
                task.priority === 'high' ? 'text-orange-600' :
                'text-blue-600'}`
                } />
                  </div>
                  <div data-ev-id="ev_todo_task_content">
                    <p data-ev-id="ev_todo_task_title" className="font-medium text-foreground">
                      <span data-ev-id="ev_todo_tag" className={`text-xs px-1.5 py-0.5 rounded mr-2 ${
                  task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                  task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-100 text-blue-700'}`
                  }>Aufgabe</span>
                      {task.title}
                    </p>
                    {task.due_date &&
                <p data-ev-id="ev_todo_task_due" className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Fällig: {new Date(task.due_date).toLocaleDateString('de-AT')}
                      </p>
                }
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
          )}
          </div>
        }
      </div>

      {/* === ZWEI-SPALTEN: Bestellungen & Aufgaben === */}
      <div data-ev-id="ev_d6eca80ade" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Meine Bestellungen - nur anzeigen wenn Berechtigung */}
        {canAccessBestellungen &&
        <div data-ev-id="ev_6f7519bed0" className="bg-card border border-border rounded-xl overflow-hidden">
          <div data-ev-id="ev_9bb922355f" className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
            <div data-ev-id="ev_ac85b6b808" className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <span data-ev-id="ev_a0ef56112a" className="font-medium text-foreground">Meine Bestellungen</span>
              {myOpenOrders.length > 0 ?
              <span data-ev-id="ev_c41c62ae54" className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                  {myOpenOrders.length} offen
                </span> :

              <span data-ev-id="ev_a44fb1afb9" className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                  Alle erledigt
                </span>
              }
            </div>
            <Link
              to="/bestellungen"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">

              Alle anzeigen <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {myOpenOrders.length > 0 ?
          <div data-ev-id="ev_80ac352f1e" className="p-3 flex flex-col gap-2 max-h-80 overflow-y-auto">
              {myOpenOrders.slice(0, 5).map((order) => {
              const collectiveInfo = getCollectiveOrderInfo(order);
              return (
                <OrderCard
                  key={order.id}
                  order={order}
                  belowMinOrderValue={isOrderBelowMinOrderValue(order)}
                  isCollectiveOrder={collectiveInfo?.isCollective ?? false}
                  collectiveOrderId={collectiveInfo?.collectiveId || undefined}
                  compact />);


            })}
              {myOpenOrders.length > 5 &&
            <Link
              to="/bestellungen"
              className="text-center text-sm text-primary hover:underline py-2">

                  + {myOpenOrders.length - 5} weitere anzeigen
                </Link>
            }
            </div> :

          <div data-ev-id="ev_771cbbfd00" className="px-4 py-8 text-center text-muted-foreground text-sm">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
              Keine offenen Bestellungen
            </div>
          }
        </div>
        }

        {/* Meine Aufgaben - nur anzeigen wenn Berechtigung */}
        {canAccessAufgaben &&
        <div data-ev-id="ev_48bc1091ae" className="bg-card border border-border rounded-xl overflow-hidden">
          <div data-ev-id="ev_44bf5c9db5" className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
            <div data-ev-id="ev_3918430f20" className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-orange-500" />
              <span data-ev-id="ev_1203f2a7f6" className="font-medium text-foreground">Meine Aufgaben</span>
              {myTasks.length + mySteps.length > 0 ?
              <span data-ev-id="ev_b7c2b73138" className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                  {myTasks.length + mySteps.length} offen
                </span> :

              <span data-ev-id="ev_47705aad5f" className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                  Alle erledigt
                </span>
              }
            </div>
            <Link
              to="/aufgaben"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">

              Alle anzeigen <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {myTasks.length + mySteps.length > 0 ?
          <div data-ev-id="ev_f893e46ae7" className="divide-y divide-border max-h-80 overflow-y-auto">
              {/* Aufgaben */}
              {myTasks.slice(0, 3).map((task) =>
            <Link
              key={task.id}
              to="/aufgaben"
              className="px-4 py-3 hover:bg-muted/30 transition-colors block">

                  <div data-ev-id="ev_5c4f4d573a" className="flex items-center justify-between">
                    <div data-ev-id="ev_5ecdeff062" className="flex items-center gap-3">
                      <div data-ev-id="ev_fbe0be0979" className={`w-2 h-2 rounded-full ${
                  task.priority === 'urgent' ? 'bg-red-500' :
                  task.priority === 'high' ? 'bg-orange-500' :
                  'bg-blue-500'}`
                  } />
                      <div data-ev-id="ev_8e698c7754">
                        <p data-ev-id="ev_93a8147ed5" className="font-medium text-foreground text-sm">{task.title}</p>
                        {task.due_date &&
                    <p data-ev-id="ev_b1e74e3453" className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Fällig: {new Date(task.due_date).toLocaleDateString('de-AT')}
                          </p>
                    }
                      </div>
                    </div>
                  </div>
                </Link>
            )}
              {/* Schritte */}
              {mySteps.slice(0, 3).map((step) =>
            <Link
              key={step.id}
              to="/aufgaben"
              className="px-4 py-3 hover:bg-purple-50/50 transition-colors block bg-purple-50/30">

                  <div data-ev-id="ev_1c843cf9eb" className="flex items-center gap-3">
                    <div data-ev-id="ev_2262bb4a36" className="w-5 h-5 rounded border-2 border-purple-400" />
                    <div data-ev-id="ev_07d7ade1c9">
                      <p data-ev-id="ev_306724aa42" className="font-medium text-foreground text-sm">{step.title}</p>
                      <p data-ev-id="ev_6f294474a5" className="text-xs text-muted-foreground">Schritt in: {step.taskTitle}</p>
                    </div>
                  </div>
                </Link>
            )}
            </div> :

          <div data-ev-id="ev_9e0bb46da6" className="px-4 py-8 text-center text-muted-foreground text-sm">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
              Keine offenen Aufgaben! 🎉
            </div>
          }
        </div>
        }
      </div>

      {/* === IDEEN-POOL === */}
      {(() => {
        // Archivierte Ideen nicht im Dashboard anzeigen
        const activeIdeas = ideas.filter((idea) => idea.status !== 'archiviert');
        return activeIdeas.length > 0 &&
        <div data-ev-id="ev_98ec0e1e96" className="bg-card border border-border rounded-xl overflow-hidden">
          <div data-ev-id="ev_804f90bbec" className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-border flex items-center justify-between">
            <div data-ev-id="ev_8d58d7020a" className="flex items-center gap-2">
              <div data-ev-id="ev_21e6f6b8bf" className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-white" />
              </div>
              <span data-ev-id="ev_59546f77fb" className="font-medium text-foreground">Ideen-Pool</span>
              {unreadIdeasCount > 0 &&
              <span data-ev-id="ev_71ff3f477a" className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full font-bold animate-pulse">
                  {unreadIdeasCount} neu
                </span>
              }
            </div>
            <Link
              to="/ideen"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">

              Alle anzeigen <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div data-ev-id="ev_9e0dcdad90" className="p-3">
            <div data-ev-id="ev_ce8849064f" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeIdeas.slice(0, 3).map((idea) => {
                const isUnread = idea.created_by !== effectiveUserId && !isIdeaRead(idea.id);
                return (
                  <Link
                    key={idea.id}
                    to="/ideen"
                    className={`block p-3 rounded-lg border transition-all hover:shadow-md ${
                    isUnread ?
                    'border-primary/50 bg-primary/5 ring-1 ring-primary/20' :
                    'border-border bg-muted/30 hover:bg-muted/50'}`
                    }>

                    <div data-ev-id="ev_e9b5ac66c3" className="flex items-start gap-3">
                      {idea.images.length > 0 || idea.image_url ?
                      <img data-ev-id="ev_0333b29ca8"
                      src={idea.images[0]?.image_url || idea.image_url || ''}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0" /> :


                      <div data-ev-id="ev_9420651c22" className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Lightbulb className="w-5 h-5 text-muted-foreground" />
                        </div>
                      }
                      <div data-ev-id="ev_5cc6110364" className="flex-1 min-w-0">
                        <div data-ev-id="ev_c181755d57" className="flex items-center gap-1.5 mb-1">
                          {isUnread &&
                          <span data-ev-id="ev_857342396a" className="px-1.5 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded">
                              NEU
                            </span>
                          }
                          <h4 data-ev-id="ev_2a2ca09c7d" className="font-medium text-sm text-foreground truncate">
                            {idea.title}
                          </h4>
                        </div>
                        <p data-ev-id="ev_64d562da4e" className="text-xs text-muted-foreground mb-2 line-clamp-1">
                          von {idea.creator_name}
                        </p>
                        <div data-ev-id="ev_0a5037c25c" className="flex items-center gap-3 text-xs">
                          <span data-ev-id="ev_cb0665033b" className="flex items-center gap-1 text-green-600">
                            <ThumbsUp className="w-3 h-3" />
                            {idea.up_votes}
                          </span>
                          <span data-ev-id="ev_c2feb4f99b" className="flex items-center gap-1 text-red-600">
                            <ThumbsDown className="w-3 h-3" />
                            {idea.down_votes}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>);

              })}
            </div>
            {activeIdeas.length > 3 &&
            <div data-ev-id="ev_5568594cb1" className="mt-3 text-center">
                <Link
                to="/ideen"
                className="text-sm text-primary hover:underline">

                  + {activeIdeas.length - 3} weitere Ideen anzeigen
                </Link>
              </div>
            }
          </div>
        </div>;

      })()}

      {/* === PROBLEMMELDUNGEN (nur für Admin/Kdt) === */}
      {(effectiveIsAdmin || effectiveIsKommandant) && problemReports.length > 0 && (() => {
        // Nur offene/in Bearbeitung befindliche Probleme anzeigen
        const openProblems = problemReports.filter((r: ProblemReport) => r.status === 'open' || r.status === 'in_progress');
        if (openProblems.length === 0) return null;

        return (
          <div data-ev-id="ev_problemreports_widget" className="bg-card rounded-xl border border-border overflow-hidden">
            <div data-ev-id="ev_problemreports_header" className="p-3 bg-red-50 border-b border-border flex items-center justify-between">
              <div data-ev-id="ev_problemreports_title_row" className="flex items-center gap-2">
                <div data-ev-id="ev_problemreports_icon" className="p-1.5 bg-red-600 rounded-lg">
                  <Bug className="w-4 h-4 text-white" />
                </div>
                <span data-ev-id="ev_problemreports_title" className="font-medium text-foreground">Problemmeldungen</span>
                <span data-ev-id="ev_problemreports_badge" className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full font-bold">
                  {openProblems.length}
                </span>
              </div>
              <Link
                to="/einstellungen?section=probleme"
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                Alle anzeigen <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div data-ev-id="ev_problemreports_list" className="divide-y divide-border">
              {openProblems.slice(0, 3).map((problem: ProblemReport) =>
              <Link
                key={problem.id}
                to="/einstellungen?section=probleme"
                className="block p-3 hover:bg-muted/50 transition-colors">
                  <div data-ev-id="ev_problemreport_row" className="flex items-start justify-between gap-2">
                    <div data-ev-id="ev_problemreport_content" className="flex-1 min-w-0">
                      <div data-ev-id="ev_problemreport_titlerow" className="flex items-center gap-2">
                        <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 ${
                      problem.priority === 'critical' ? 'text-red-600' :
                      problem.priority === 'high' ? 'text-orange-500' :
                      problem.priority === 'medium' ? 'text-amber-500' : 'text-muted-foreground'}`
                      } />
                        <span data-ev-id="ev_problemreport_name" className="font-medium text-sm text-foreground truncate">
                          {problem.title}
                        </span>
                      </div>
                      <p data-ev-id="ev_problemreport_desc" className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {problem.description}
                      </p>
                      <p data-ev-id="ev_problemreport_meta" className="text-xs text-muted-foreground mt-1">
                        von {problem.creator_name} • {new Date(problem.created_at).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    <span data-ev-id="ev_problemreport_status" className={`px-2 py-0.5 text-xs rounded-full ${
                  problem.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`
                  }>
                      {problem.status === 'open' ? 'Offen' : 'In Bearbeitung'}
                    </span>
                  </div>
                </Link>
              )}
              {openProblems.length > 3 &&
              <div data-ev-id="ev_problemreports_more" className="p-3 text-center">
                <Link
                  to="/einstellungen?section=probleme"
                  className="text-sm text-primary hover:underline">
                  + {openProblems.length - 3} weitere Probleme anzeigen
                </Link>
              </div>
              }
            </div>
          </div>);

      })()}

      {/* === QUICK LINKS (optional, für mehr Zugang) === */}
      <div data-ev-id="ev_e80db9f95b" className="flex flex-wrap gap-2 justify-center pt-2">
        {canAccessBestellungen &&
        <>
          <Link
            to="/bestellungen"
            className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Alle Bestellungen
          </Link>
          <span data-ev-id="ev_a470c1770d" className="text-muted-foreground/50">·</span>
        </>
        }
        {canAccessLieferanten &&
        <>
          <Link
            to="/lieferanten"
            className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Lieferanten
          </Link>
          <span data-ev-id="ev_90e49db5bf" className="text-muted-foreground/50">·</span>
        </>
        }
        {canAccessAufgaben &&
        <>
          <Link
            to="/aufgaben"
            className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Aufgaben
          </Link>
          <span data-ev-id="ev_829ad1b5bf" className="text-muted-foreground/50">·</span>
        </>
        }
        <Link
          to="/ideen"
          className="text-xs text-muted-foreground hover:text-primary transition-colors">
          Ideen-Pool
        </Link>
        {canApproveApplications &&
        <>
            <span data-ev-id="ev_39d9a0a3af" className="text-muted-foreground/50">·</span>
            <Link
            to="/antragsformulare"
            className="text-xs text-muted-foreground hover:text-primary transition-colors">

              Antragsformulare
            </Link>
          </>
        }
      </div>

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        inviterName={profile?.full_name || 'Unbekannt'}
        registrationUrl={registrationUrl} />

      {/* Rental Contract Info Modal */}
      {selectedRentalContract && (
        <RentalContractInfoModal
          contract={selectedRentalContract}
          onClose={() => setSelectedRentalContract(null)}
        />
      )}

    </div>);

}