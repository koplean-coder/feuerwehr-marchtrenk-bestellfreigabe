import { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, type Notification } from '@/contexts/NotificationsContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { useOrders, type InvoiceTo } from '@/hooks/useOrders';
import { useProfiles } from '@/hooks/useProfiles';
import { useTasks } from '@/hooks/useTasks';
import { useTodoTasks } from '@/hooks/useTodoTasks';
import { useSettings } from '@/hooks/useSettings';
import { useSuppliers, ORDER_DAY_OPTIONS } from '@/hooks/useSuppliers';
import { usePresence } from '@/hooks/usePresence';
import { usePaymentOrders, type PaymentOrder } from '@/hooks/usePaymentOrders';
import { useEventParticipations, type EventParticipation } from '@/hooks/useEventParticipations';
import { useOrderVotesSummary } from '@/hooks/useOrderVotesSummary';
import { usePendingVotesForUser } from '@/hooks/usePendingVotesForUser';
import { useCommandDecisions } from '@/hooks/useCommandDecisions';
import { usePendingCommandDecisionsForUser } from '@/hooks/usePendingCommandDecisionsForUser';
import { useModulePermissions } from '@/hooks/useModulePermissions';
import { useRentalContracts, type RentalContract } from '@/hooks/useRentalContracts';
import { usePendingRentalInvoices } from '@/hooks/usePendingRentalInvoices';
import { useProblemReports, type ProblemReport } from '@/hooks/useProblemReports';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { OrderCard } from '@/components/OrderCard';
import { CompactDashboard } from '@/components/CompactDashboard';
import { StatusBadge, getRowBackgroundColor } from '@/components/StatusBadge';
import { WorkflowBadge } from '@/components/WorkflowBadge';
import jsPDF from 'jspdf';
import { loadImageAsBase64 } from '@/utils/pdfBackground';
import {
  Plus,
  ClipboardCheck,
  FileText,
  CheckCircle,
  Archive,
  Eye,
  EyeOff,
  CheckSquare,
  Calendar,
  Euro,
  User,
  List,
  Clock,
  Users,
  XCircle,
  X,
  Receipt,
  ListTodo,
  Flag,
  ArrowRight,
  Send,
  MessageSquare,
  Mail,
  Users as UsersIcon,
  Inbox,
  Reply,
  History,
  Download,
  Lock,
  Unlock,
  FileDown,
  Smile,
  Package,
  PackageCheck,
  Trash2,
  AlertTriangle,
  Bug,
  Building2,
  TrendingUp,
  Layers,
  Truck,
  ChevronDown,
  ChevronUp,
  Shield,
  Briefcase,
  Check,
  Crown,
  CreditCard,
  CalendarCheck,
  FileCheck,
  Banknote } from
'lucide-react';
import type { Order } from '@/hooks/useOrders';

export default function Index() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const {
    effectiveUserId,
    effectiveIsAdmin,
    effectiveIsKommandant,
    effectiveIsBereichsleiter,
    effectiveHasKassierFunction,
    effectiveHasKommandomitgliedFunction,
    effectiveProfile,
    isSimulationActive
  } = useSimulation();
  // Use effective (simulated) values
  const profile = effectiveProfile;
  const isBereichsleiter = effectiveIsBereichsleiter;
  const isKommandant = effectiveIsKommandant;
  const isAdmin = effectiveIsAdmin;
  const {
    orders,
    pendingForMe,
    waitingForBereichsleiter,
    myOrders,
    completedOrders,
    approvedOrders,
    completeOrder,
    approveByKommandantDirect,
    approveByBereichsleiter,
    approveByKommandant,
    rejectOrder,
    archiveOrder,
    deleteOrder,
    loading
  } = useOrders();
  const { profiles } = useProfiles();
  const { tasks, loading: tasksLoading } = useTasks();
  const { tasks: todoTasks, loading: todoTasksLoading } = useTodoTasks();
  const { messageCardUsers, systemHomepageUrl, readyToOrderViewUsers, orderedViewUsers, pdfBackgroundUrl, pdfBackgroundOpacity, escalationTimeoutHours } = useSettings();
  const { suppliers } = useSuppliers();
  const { onlineUsers } = usePresence();

  // Payment Orders & Event Participations für Dashboard-Anzeige
  const { paymentOrders, approvePaymentOrder, rejectPaymentOrder, markAsPaid, canApprovePaymentOrders } = usePaymentOrders();
  const { eventParticipations, approveEventParticipation, rejectEventParticipation } = useEventParticipations();

  // Leihverträge mit Rechnungsbedarf (für Kassier)
  const { pendingInvoices: pendingRentalInvoices, refetch: refetchPendingInvoices } = usePendingRentalInvoices();

  // Abstimmungs-Summaries für alle Orders mit Kommando-Abstimmung
  const { voteSummaries } = useOrderVotesSummary(orders);

  // Offene Abstimmungen für Kommandomitglieder/Kommandant/Admin (Bestellungen)
  const { pendingVoteOrders, canVote } = usePendingVotesForUser(orders);

  // Offene Kommandoabstimmungen (Umlaufbeschlüsse)
  const { decisions } = useCommandDecisions();
  const { pendingDecisions: pendingCommandDecisions, canVote: canVoteOnDecisions } = usePendingCommandDecisionsForUser(decisions);

  // Offene Problemberichte (nur für Admin/Kommandant)
  const { reports: problemReports } = useProblemReports();
  const openProblemReports = effectiveIsAdmin || effectiveIsKommandant ?
  problemReports.filter((r: ProblemReport) => r.status === 'open' || r.status === 'in_progress') :
  [];

  // === SIMULATION CONTEXT (already imported above) ===

  // Modul-Berechtigungen für Nutzer-Rolle
  const { hasModuleAccess } = useModulePermissions();
  const isNutzerRole = profile?.role === 'nutzer';
  const canAccessBestellungen = !isNutzerRole || hasModuleAccess('bestellungen');

  // Gefilterte Bestellungen basierend auf Berechtigungen (Kommandomitglieder sehen nur relevante)
  const canViewAllOrdersDashboard = effectiveIsAdmin || effectiveIsKommandant || effectiveHasKassierFunction;
  const filteredOrders = canViewAllOrdersDashboard ?
  orders :
  effectiveIsBereichsleiter ?
  // Bereichsleiter: Eigene + zugewiesene + Abstimmungs-Bestellungen (falls auch Kommandomitglied)
  orders.filter((order) =>
  order.created_by === effectiveUserId ||
  order.bereichsleiter_id === effectiveUserId ||
  effectiveHasKommandomitgliedFunction && order.requires_kommandomitglied_approval &&
  !order.kommandomitglied_approved_at && order.status !== 'entwurf' && order.status !== 'abgeschlossen'
  ) :
  effectiveHasKommandomitgliedFunction ?
  // Kommandomitglieder: Eigene + Bestellungen zur Abstimmung (alle Status außer Entwurf)
  orders.filter((order) =>
  order.created_by === effectiveUserId ||
  order.requires_kommandomitglied_approval &&
  !order.kommandomitglied_approved_at &&
  order.status !== 'entwurf' &&
  order.status !== 'abgeschlossen'
  ) :
  // Mitglieder: Nur eigene
  orders.filter((order) => order.created_by === effectiveUserId);

  // === SIMULATION-AWARE FREIGABE-LISTEN ===
  // WICHTIG: pendingForMe und waitingForBereichsleiter aus useOrders basieren auf der ECHTEN Rolle,
  // nicht auf der simulierten. Daher müssen wir hier direkt aus orders filtern.

  // Bereichsleiter: Bestellungen die mir zur Freigabe zugewiesen sind
  const effectivePendingForBL = effectiveIsBereichsleiter ?
  orders.filter((o) => o.status === 'eingereicht' && o.bereichsleiter_id === effectiveUserId) :
  [];

  // Kommandant: Bestellungen die auf Genehmigung warten
  const effectivePendingForKommandant = effectiveIsKommandant ?
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

  // Kombinierte Liste für Tab "Freizugeben" / "Zu erledigen"
  // Für BL: Bestellungen zur BL-Freigabe
  // Für KDT: Bestellungen zur KDT-Freigabe
  // Für Kommandomitglieder: Offene Abstimmungen
  const effectivePendingForMe = effectiveIsKommandant ?
  effectivePendingForKommandant :
  effectiveIsBereichsleiter ?
  effectivePendingForBL :
  []; // Kommandomitglieder haben separate Liste

  // Offene Abstimmungen für Kommandomitglieder/Kommandant/Admin (aus dem Hook)
  const pendingVotesForMe = canVote ? pendingVoteOrders : [];

  // Offene Kommandoabstimmungen für den User
  const pendingDecisionsForMe = canVoteOnDecisions ? pendingCommandDecisions : [];

  // Gesamte "Zu erledigen"-Liste (Freigaben + Bestellungs-Abstimmungen + Kommandoabstimmungen + Problemberichte)
  const allPendingForMe = [...effectivePendingForMe, ...pendingVotesForMe, ...pendingDecisionsForMe, ...openProblemReports];

  // Warten auf BL (für Kommandant-Übersicht)
  const effectiveWaitingForBL = effectiveIsKommandant ?
  orders.filter((o) => o.status === 'eingereicht' && o.bereichsleiter_id && o.bereichsleiter_id !== effectiveUserId) :
  [];

  // === SIMULATION-AWARE MEINE BESTELLUNGEN ===
  // WICHTIG: myOrders aus useOrders basiert auf der ECHTEN User-ID, nicht der simulierten
  const effectiveMyOrders = orders.filter((order) =>
  order.created_by === effectiveUserId && ['entwurf', 'eingereicht'].includes(order.status)
  );

  // Meine abgeschlossenen Bestellungen (für Simulation)
  const effectiveCompletedOrders = orders.filter((order) =>
  order.created_by === effectiveUserId && order.status === 'abgeschlossen'
  );

  // Freigegebene Bestellungen des simulierten Users
  const effectiveApprovedOrders = orders.filter((order) =>
  order.created_by === effectiveUserId &&
  ['genehmigt', 'freigegeben_kommandant', 'freigegeben_bereichsleitung'].includes(order.status)
  );

  // State für "Bestellt" Unterlisten
  const [showWaitingDelivery, setShowWaitingDelivery] = useState(true);
  const [showReceived, setShowReceived] = useState(true);
  const [showCompletedOrdered, setShowCompletedOrdered] = useState(false);

  // State für Dashboard-Ansicht (kompakt vs erweitert)
  const [dashboardView, setDashboardView] = useState<'compact' | 'extended'>('compact');

  // Calculate suppliers below minimum order value (for genehmigt orders that are ready to be ordered)
  const suppliersBelowMinimum = (() => {
    const supplierTotals = new Map<string, number>();

    // Sum up amounts of approved (genehmigt) orders per supplier that are NOT yet executed
    orders.forEach((order) => {
      if ((order.status === 'genehmigt' || order.status === 'freigegeben_kommandant') && !order.order_executed && order.supplier_id) {
        const current = supplierTotals.get(order.supplier_id) || 0;
        supplierTotals.set(order.supplier_id, current + order.amount);
      }
    });

    // Find suppliers where total is below minimum order value
    const belowMinimum = new Set<string>();
    supplierTotals.forEach((total, supplierId) => {
      const supplier = suppliers.find((s) => s.id === supplierId);
      if (supplier?.minimum_order_value && supplier.minimum_order_value > 0 && total < supplier.minimum_order_value) {
        belowMinimum.add(supplierId);
      }
    });

    return belowMinimum;
  })();

  // Get all approved orders for a supplier (for collective order hint)
  const getSupplierOrders = (supplierId: string): Order[] => {
    return orders.filter((o) =>
    o.supplier_id === supplierId && (
    o.status === 'genehmigt' || o.status === 'freigegeben_kommandant') &&
    !o.order_executed
    );
  };

  // Check if order is part of a collective order (multiple orders needed to reach minimum)
  const getCollectiveOrderInfo = (order: Order): {isCollective: boolean;otherOrders: Order[];total: number;minimum: number;} | null => {
    if (!order.supplier_id || order.status !== 'genehmigt' && order.status !== 'freigegeben_kommandant' || order.order_executed) return null;

    const supplier = suppliers.find((s) => s.id === order.supplier_id);
    if (!supplier?.minimum_order_value || supplier.minimum_order_value <= 0) return null;

    const supplierOrders = getSupplierOrders(order.supplier_id);
    if (supplierOrders.length <= 1) return null;

    const total = supplierOrders.reduce((sum, o) => sum + o.amount, 0);
    const otherOrders = supplierOrders.filter((o) => o.id !== order.id);

    // Only show hint if total reaches minimum but individual order doesn't
    if (total >= supplier.minimum_order_value && order.amount < supplier.minimum_order_value) {
      return {
        isCollective: true,
        otherOrders,
        total,
        minimum: supplier.minimum_order_value
      };
    }

    return null;
  };

  // Check if an order's supplier is below minimum order value (for genehmigt orders ready to be ordered)
  const isOrderBelowMinOrderValue = (order: Order): boolean => {
    if (order.status !== 'genehmigt' && order.status !== 'freigegeben_kommandant' || order.order_executed) return false;
    if (!order.supplier_id) return false;
    return suppliersBelowMinimum.has(order.supplier_id);
  };
  const { notifications } = useNotifications();

  // Get my messages (only messages sent via "Nachricht senden", not task notifications)
  const myMessages = notifications.
  filter((n) => n.notification_type === 'message').
  sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Message Modal state
  const [showMessageModal, setShowMessageModal] = useState(false);

  // Check for compose query parameter to open message modal
  useEffect(() => {
    if (searchParams.get('compose') === 'true') {
      const recipientId = searchParams.get('recipient');
      if (recipientId) {
        setSelectedRecipients([recipientId]);
      }
      setShowMessageModal(true);
      // Remove the query parameters from URL
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [showMessageArchive, setShowMessageArchive] = useState(false);
  const [selectedConversationKey, setSelectedConversationKey] = useState<string | null>(null);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [sendAsEmail, setSendAsEmail] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replySent, setReplySent] = useState(false);
  const [sendReplyAsEmail, setSendReplyAsEmail] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Firefighter-related emojis organized by category
  const firefighterEmojis = {
    'Personen': ['👨‍🚒', '👩‍🚒', '🧑‍🚒', '🦸', '🦸‍♂️', '🦸‍♀️', '💪', '🙋', '🙋‍♂️', '🙋‍♀️', '👍', '👏'],
    'Fahrzeuge': ['🚒', '🚑', '🚓', '🚁', '✈️', '🛻', '🚐', '🚚'],
    'Feuer & Wasser': ['🔥', '💧', '💦', '🌊', '♨️', '💨', '🧯', '🪣'],
    'Ausrüstung': ['🪜', '⛑️', '🦺', '🧤', '👢', '🔦', '📟', '📻', '🎺', '⚠️'],
    'Notfall': ['🆘', '🚨', '📢', '🔔', '⏰', '🏥', '💉', '🩹', '🩺'],
    'Gebäude': ['🏠', '🏢', '🏭', '🏗️', '🏚️', '⛪', '🏫', '🌲', '🌳'],
    'Wetter': ['⛈️', '🌩️', '⚡', '🌪️', '🌧️', '❄️', '🌡️'],
    'Symbole': ['✅', '❌', '⭐', '🎯', '💯', '🏆', '🎖️', '🔴', '🟢', '🟡']
  };

  // Insert emoji at cursor position
  function insertEmoji(emoji: string) {
    setReplyText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  }

  // Conversation management state
  const [conversationStatuses, setConversationStatuses] = useState<Map<string, {is_closed: boolean;closed_at: string | null;closed_by: string | null;created_by: string;}>>(new Map());
  const [closingConversation, setClosingConversation] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Ref for auto-scrolling chat
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Get current conversation from key (recalculates when notifications change)
  const selectedConversationMessages = selectedConversationKey ?
  myMessages.
  filter((msg) => {
    const participants = [...(msg.original_recipients || [])].sort().join(',');
    const subject = msg.subject || 'Kein Betreff';
    const key = `${subject}::${participants}`;
    return key === selectedConversationKey;
  }).
  sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) :
  [];

  // Only set selectedConversation if we have messages
  const selectedConversation = selectedConversationMessages.length > 0 ? selectedConversationMessages : null;

  // Auto-scroll to bottom when conversation updates
  useEffect(() => {
    if (selectedConversation && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConversation]);

  // Load conversation statuses from database
  useEffect(() => {
    async function loadConversationStatuses() {
      if (!supabase) return;
      const { data } = await supabase.from('conversations').select('*');
      if (data) {
        const statusMap = new Map<string, {is_closed: boolean;closed_at: string | null;closed_by: string | null;created_by: string;}>();
        data.forEach((conv) => {
          statusMap.set(conv.conversation_key, {
            is_closed: conv.is_closed ?? false,
            closed_at: conv.closed_at,
            closed_by: conv.closed_by,
            created_by: conv.created_by
          });
        });
        setConversationStatuses(statusMap);
      }
    }
    loadConversationStatuses();
  }, [myMessages]);

  // Handle URL param to open conversation from Notifications page
  useEffect(() => {
    const openConversationKey = searchParams.get('openConversation');
    if (openConversationKey) {
      // Always open the archive and set the conversation key
      // The archive will show the conversation once messages are loaded
      setShowMessageArchive(true);
      setSelectedConversationKey(openConversationKey);
      // Clear the URL param
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Fallback: if conversation key is set but no messages found after 2 seconds, show list
  useEffect(() => {
    if (selectedConversationKey && !selectedConversation && myMessages.length > 0) {
      // Messages are loaded but conversation not found - show list after short delay
      const timeout = setTimeout(() => {
        console.log('Conversation not found, showing list');
        setSelectedConversationKey(null);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [selectedConversationKey, selectedConversation, myMessages.length]);

  // Get or create conversation record
  async function getOrCreateConversation(conversationKey: string, subject: string, creatorId: string) {
    if (!supabase) return null;

    // Check if exists
    const { data: existing } = await supabase.
    from('conversations').
    select('*').
    eq('conversation_key', conversationKey).
    single();

    if (existing) return existing;

    // Create new
    const { data: newConv, error } = await supabase.
    from('conversations').
    insert({
      conversation_key: conversationKey,
      subject: subject,
      created_by: creatorId
    }).
    select().
    single();

    if (error) {
      console.error('Error creating conversation:', error);
      return null;
    }

    return newConv;
  }

  // Close conversation (only creator, Kommandant, or Admin)
  async function closeConversation() {
    if (!supabase || !selectedConversation || !selectedConversationKey || !user) return;

    setClosingConversation(true);
    try {
      const firstMsg = selectedConversation[0];
      const subject = firstMsg.subject || 'Kein Betreff';

      // Ensure conversation record exists
      await getOrCreateConversation(selectedConversationKey, subject, firstMsg.sender_id || user.id);

      // Update conversation status
      const { error } = await supabase.
      from('conversations').
      update({
        is_closed: true,
        closed_at: new Date().toISOString(),
        closed_by: user.id
      }).
      eq('conversation_key', selectedConversationKey);

      if (!error) {
        // Add system message about closure
        const allParticipants = firstMsg.original_recipients || [];
        const closedByName = profile?.full_name || 'Unbekannt';

        const systemMessages = allParticipants.map((userId) => ({
          user_id: userId,
          notification_type: 'message' as const,
          message: `📋 Konversation wurde von ${closedByName} geschlossen.`,
          subject: subject,
          is_read: userId === user.id,
          sender_id: user.id,
          original_recipients: allParticipants,
          is_reply: true
        }));

        await supabase.from('notifications').insert(systemMessages);

        // Update local state
        setConversationStatuses((prev) => {
          const newMap = new Map(prev);
          newMap.set(selectedConversationKey, {
            is_closed: true,
            closed_at: new Date().toISOString(),
            closed_by: user.id,
            created_by: firstMsg.sender_id || user.id
          });
          return newMap;
        });
      }
    } catch (error) {
      console.error('Error closing conversation:', error);
    }
    setClosingConversation(false);
  }

  // Reopen conversation (only creator, Kommandant, or Admin)
  async function reopenConversation() {
    if (!supabase || !selectedConversation || !selectedConversationKey || !user) return;

    setClosingConversation(true);
    try {
      const firstMsg = selectedConversation[0];
      const subject = firstMsg.subject || 'Kein Betreff';

      // Update conversation status
      const { error } = await supabase.
      from('conversations').
      update({
        is_closed: false,
        closed_at: null,
        closed_by: null
      }).
      eq('conversation_key', selectedConversationKey);

      if (!error) {
        // Add system message about reopening
        const allParticipants = firstMsg.original_recipients || [];
        const reopenedByName = profile?.full_name || 'Unbekannt';

        const systemMessages = allParticipants.map((userId) => ({
          user_id: userId,
          notification_type: 'message' as const,
          message: `🔓 Konversation wurde von ${reopenedByName} wieder geöffnet.`,
          subject: subject,
          is_read: userId === user.id,
          sender_id: user.id,
          original_recipients: allParticipants,
          is_reply: true
        }));

        await supabase.from('notifications').insert(systemMessages);

        // Update local state
        setConversationStatuses((prev) => {
          const newMap = new Map(prev);
          const existing = prev.get(selectedConversationKey);
          if (existing) {
            newMap.set(selectedConversationKey, {
              ...existing,
              is_closed: false,
              closed_at: null,
              closed_by: null
            });
          }
          return newMap;
        });
      }
    } catch (error) {
      console.error('Error reopening conversation:', error);
    }
    setClosingConversation(false);
  }

  // Export conversation as PDF protocol
  async function exportConversationAsPdf() {
    if (!selectedConversation || !selectedConversationKey || selectedConversation.length === 0) {
      alert('Keine Konversation zum Exportieren');
      return;
    }

    // Helper function to remove emojis (jsPDF doesn't support them)
    function removeEmojis(text: string): string {
      return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F170}-\u{1F171}]|[\u{1F17E}-\u{1F17F}]|[\u{1F18E}]|[\u{1F191}-\u{1F19A}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F201}-\u{1F202}]|[\u{1F21A}]|[\u{1F22F}]|[\u{1F232}-\u{1F23A}]|[\u{1F250}-\u{1F251}]/gu, '').trim();
    }

    console.log('Exporting conversation with', selectedConversation.length, 'messages');

    setExportingPdf(true);
    try {
      // Load background image if configured
      const backgroundData = pdfBackgroundUrl ? await loadImageAsBase64(pdfBackgroundUrl) : null;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Helper to apply background
      const applyBackground = () => {
        if (!backgroundData) return;
        doc.saveGraphicsState();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- jsPDF GState constructor is not properly typed
        const gState = new (doc as any).GState({ opacity: pdfBackgroundOpacity });
        doc.setGState(gState);
        try {
          doc.addImage(backgroundData, 'AUTO', 0, 0, pageWidth, pageHeight);
        } catch (e) {
          console.error('Failed to add background:', e);
        }
        doc.restoreGraphicsState();
      };

      // Apply background to first page
      applyBackground();

      const firstMsg = selectedConversation[0];
      const subject = firstMsg.subject || 'Kein Betreff';
      const status = conversationStatuses.get(selectedConversationKey);

      // Header line
      doc.setDrawColor(200, 30, 30);
      doc.setLineWidth(0.8);
      doc.line(20, 12, pageWidth - 80, 12);

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('NACHRICHTENPROTOKOLL', 20, 24);

      // Subtitle
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Betreff: ' + subject, 20, 35);

      // Participants
      const participantNames = (firstMsg.original_recipients || []).
      map((id) => profiles.find((p) => p.id === id)?.full_name || 'Unbekannt').
      join(', ');
      doc.text('Teilnehmer: ' + (participantNames || 'Keine'), 20, 42);

      // Date range
      const firstDate = new Date(selectedConversation[0].created_at).toLocaleDateString('de-DE');
      const lastDate = new Date(selectedConversation[selectedConversation.length - 1].created_at).toLocaleDateString('de-DE');
      doc.text('Zeitraum: ' + firstDate + ' - ' + lastDate, 20, 49);

      // Status
      if (status?.is_closed) {
        const closedByName = profiles.find((p) => p.id === status.closed_by)?.full_name || 'Unbekannt';
        const closedDate = status.closed_at ? new Date(status.closed_at).toLocaleString('de-DE') : '-';
        doc.setTextColor(180, 0, 0);
        doc.text('Status: Geschlossen von ' + closedByName + ' am ' + closedDate, 20, 56);
        doc.setTextColor(0, 0, 0);
      } else {
        doc.setTextColor(0, 128, 0);
        doc.text('Status: Offen', 20, 56);
        doc.setTextColor(0, 0, 0);
      }

      // Separator
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(20, 62, pageWidth - 20, 62);

      // Messages
      let yPos = 72;
      const lineHeight = 6;
      const maxWidth = 170;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0); // Ensure black text

      for (let i = 0; i < selectedConversation.length; i++) {
        const msg = selectedConversation[i];
        const sender = profiles.find((p) => p.id === msg.sender_id);
        const senderName = sender?.full_name || 'Unbekannt';
        const timestamp = new Date(msg.created_at).toLocaleString('de-DE');

        // Check if we need a new page
        if (yPos > 260) {
          doc.addPage();
          applyBackground();
          yPos = 20;
        }

        // Message header
        doc.setFont('helvetica', 'bold');
        const headerText = '[' + timestamp + '] ' + senderName + ':';
        doc.text(headerText, 20, yPos);
        yPos += lineHeight;

        // Message content (word wrap) - remove emojis as jsPDF can't render them
        doc.setFont('helvetica', 'normal');
        const messageContent = removeEmojis(msg.message || '');
        const lines = doc.splitTextToSize(messageContent, maxWidth);
        for (let j = 0; j < lines.length; j++) {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(lines[j], 25, yPos);
          yPos += lineHeight;
        }

        yPos += 4; // Gap between messages
      }

      // Footer on all pages
      const pageCount = doc.getNumberOfPages();
      const exportTime = new Date().toLocaleString('de-DE');

      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Footer line
        doc.setDrawColor(200, 30, 30);
        doc.setLineWidth(0.5);
        doc.line(20, pageHeight - 18, pageWidth - 20, pageHeight - 18);

        // Footer text
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Exportiert am ${exportTime} | Feuerwehr Marchtrenk | Seite ${i} von ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Save
      const safeSubject = subject.replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, '').substring(0, 30);
      // Open PDF in new tab (doc.save doesn't work in sandbox)
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      console.log('Opening PDF, blob size:', pdfBlob.size);

      // Convert to base64 data URL and open in new window
      const reader = new FileReader();
      reader.onloadend = function () {
        const base64data = reader.result as string;
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(
            '<html><head><title>Nachrichtenprotokoll</title></head>' +
            '<body style="margin:0;padding:0;">' +
            '<embed width="100%" height="100%" src="' + base64data + '" type="application/pdf" />' +
            '</body></html>'
          );
        } else {
          // Fallback: direct open
          window.open(base64data, '_blank');
        }
      };
      reader.readAsDataURL(pdfBlob);

      URL.revokeObjectURL(pdfUrl);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Fehler beim PDF-Export. Bitte versuchen Sie es erneut.');
    }
    setExportingPdf(false);
  }

  // Check if current user can manage conversation (close/open) - ONLY the creator
  function canManageConversation(): boolean {
    if (!selectedConversation || !user) return false;

    // Only the creator can close/reopen - NOT Kommandant or Admin
    const firstMsg = selectedConversation[0];
    if (firstMsg.sender_id === user.id) return true;

    // Check if user is stored as creator in conversations table
    const status = conversationStatuses.get(selectedConversationKey || '');
    if (status?.created_by === user.id) return true;

    return false;
  }

  // Check if current conversation is closed
  function isConversationClosed(): boolean {
    if (!selectedConversationKey) return false;
    return conversationStatuses.get(selectedConversationKey)?.is_closed ?? false;
  }

  // Can send messages: User is in messageCardUsers list
  const canSendMessages = user?.id && messageCardUsers.includes(user.id);

  // Toggle recipient selection
  function toggleRecipient(userId: string) {
    setSelectedRecipients((prev) =>
    prev.includes(userId) ?
    prev.filter((id) => id !== userId) :
    [...prev, userId]
    );
  }

  // Select all recipients
  function selectAllRecipients() {
    const allUserIds = profiles.filter((p) => p.id !== effectiveUserId).map((p) => p.id);
    setSelectedRecipients(allUserIds);
  }

  // Clear all recipients
  function clearAllRecipients() {
    setSelectedRecipients([]);
  }

  // Select by role
  function selectByRole(role: string) {
    const userIds = profiles.filter((p) => p.id !== effectiveUserId && p.role === role).map((p) => p.id);
    setSelectedRecipients((prev) => {
      const combined = new Set([...prev, ...userIds]);
      return Array.from(combined);
    });
  }

  // Select by function (e.g. kommandomitglied)
  function selectByFunction(func: string) {
    const userIds = profiles.filter((p) => p.id !== effectiveUserId && p.functions?.includes(func)).map((p) => p.id);
    setSelectedRecipients((prev) => {
      const combined = new Set([...prev, ...userIds]);
      return Array.from(combined);
    });
  }

  // Send message to selected users
  async function sendMessageToUsers() {
    if (!supabase || !messageText.trim() || !messageSubject.trim() || selectedRecipients.length === 0 || !user) return;

    setSendingMessage(true);
    try {
      // Include sender in original_recipients for consistent thread view
      const allParticipants = [...selectedRecipients, user.id];

      const notificationsToInsert = [
      // Notifications for recipients
      ...selectedRecipients.map((userId) => ({
        user_id: userId,
        notification_type: 'message',
        message: messageText.trim(),
        subject: messageSubject.trim(),
        is_read: false,
        sender_id: user.id,
        original_recipients: allParticipants
      })),
      // Copy for sender (marked as read)
      {
        user_id: user.id,
        notification_type: 'message',
        message: messageText.trim(),
        subject: messageSubject.trim(),
        is_read: true,
        sender_id: user.id,
        original_recipients: allParticipants
      }];


      await supabase.from('notifications').insert(notificationsToInsert);

      // Send emails if checkbox is checked
      if (sendAsEmail) {
        const recipientEmails = profiles.
        filter((p) => selectedRecipients.includes(p.id)).
        map((p) => p.email);

        const senderEmail = profile?.email || '';
        const senderName = profile?.full_name || 'Unbekannt';

        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'direct_message',
            recipientEmails,
            senderEmail,
            senderName,
            messageContent: `Betreff: ${messageSubject.trim()}\n\n${messageText.trim()}`,
            homepageUrl: systemHomepageUrl
          }
        });
      }

      // Send push notifications to recipients
      try {
        const senderName = profile?.full_name || 'Unbekannt';
        await supabase.functions.invoke('send-push', {
          body: {
            userIds: selectedRecipients,
            excludeUserId: user.id,
            payload: {
              title: `Neue Nachricht von ${senderName}`,
              body: messageSubject.trim(),
              tag: 'new-message',
              data: { url: '/', type: 'message' }
            }
          }
        });
      } catch (pushError) {
        console.warn('Push notification failed (non-critical):', pushError);
      }

      setMessageSubject('');
      setMessageText('');
      setSelectedRecipients([]);
      setSendAsEmail(false);
      setMessageSent(true);
      setTimeout(() => {
        setMessageSent(false);
        setShowMessageModal(false);
      }, 2000);
    } catch (error) {
      console.error('Error sending message:', error);
    }
    setSendingMessage(false);
  }

  // Group messages into conversations based on subject and participants
  function getConversations() {
    const conversationMap = new Map<string, Notification[]>();

    myMessages.forEach((msg) => {
      // Create a unique key for the conversation based on subject + sorted participants
      const participants = [...(msg.original_recipients || [])].sort().join(',');
      const subject = msg.subject || 'Kein Betreff';
      const key = `${subject}::${participants}`;

      if (!conversationMap.has(key)) {
        conversationMap.set(key, []);
      }
      conversationMap.get(key)!.push(msg);
    });

    // Sort messages within each conversation by date (oldest first)
    conversationMap.forEach((messages) => {
      messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

    // Return as array, sorted by most recent message in conversation
    return Array.from(conversationMap.values()).sort((a, b) => {
      const latestA = new Date(a[a.length - 1].created_at).getTime();
      const latestB = new Date(b[b.length - 1].created_at).getTime();
      return latestB - latestA;
    });
  }

  // Zähle ungelesene Nachrichten aus OFFENEN Konversationen
  function getUnreadOpenMessagesCount(): number {
    const conversations = getConversations();
    let count = 0;

    for (const conversation of conversations) {
      // Conversation Key erstellen
      const firstMsg = conversation[0];
      const participants = [...(firstMsg.original_recipients || [])].sort().join(',');
      const subject = firstMsg.subject || 'Kein Betreff';
      const key = `${subject}::${participants}`;

      // Prüfen ob Konversation geschlossen ist
      const status = conversationStatuses.get(key);
      if (status?.is_closed) {
        continue; // Geschlossene Konversationen überspringen
      }

      // Ungelesene Nachrichten zählen
      count += conversation.filter((msg) => !msg.is_read).length;
    }

    return count;
  }

  // Send reply in conversation
  async function sendReplyToConversation() {
    if (!supabase || !selectedConversation || !replyText.trim() || !user) return;

    setSendingReply(true);
    try {
      const firstMsg = selectedConversation[0];
      const subject = firstMsg.subject;
      const originalRecipients = firstMsg.original_recipients || [];

      // Get all recipients: original recipients + original sender (excluding current user)
      const allRecipientIds = new Set([...originalRecipients]);
      if (firstMsg.sender_id) allRecipientIds.add(firstMsg.sender_id);
      allRecipientIds.delete(user.id);

      const recipientIds = Array.from(allRecipientIds);

      // Include current user in original_recipients for consistent thread view
      const allParticipants = [...recipientIds, user.id];

      // Create notifications for all recipients AND for myself (so I see my own reply)
      const notificationsToInsert = [
      // Notifications for other recipients
      ...recipientIds.map((userId) => ({
        user_id: userId,
        notification_type: 'message' as const,
        message: replyText.trim(),
        subject: subject,
        is_read: false,
        sender_id: user.id,
        original_recipients: allParticipants,
        is_reply: true
      })),
      // Copy for myself (marked as read)
      {
        user_id: user.id,
        notification_type: 'message' as const,
        message: replyText.trim(),
        subject: subject,
        is_read: true,
        sender_id: user.id,
        original_recipients: allParticipants,
        is_reply: true
      }];


      await supabase.from('notifications').insert(notificationsToInsert);

      // Send emails if checkbox is checked
      if (sendReplyAsEmail) {
        const recipientEmails = profiles.
        filter((p) => recipientIds.includes(p.id)).
        map((p) => p.email);

        const senderEmail = profile?.email || '';
        const senderName = profile?.full_name || 'Unbekannt';

        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'direct_message',
            recipientEmails,
            senderEmail,
            senderName,
            messageContent: `Betreff: ${subject || 'Kein Betreff'}\n\n${replyText.trim()}`,
            homepageUrl: systemHomepageUrl
          }
        });
      }

      // Send push notifications to recipients
      try {
        const senderName = profile?.full_name || 'Unbekannt';
        await supabase.functions.invoke('send-push', {
          body: {
            userIds: recipientIds,
            excludeUserId: user.id,
            payload: {
              title: `Antwort von ${senderName}`,
              body: subject || 'Neue Antwort',
              tag: 'message-reply',
              data: { url: '/', type: 'reply' }
            }
          }
        });
      } catch (pushError) {
        console.warn('Push notification failed (non-critical):', pushError);
      }

      setReplyText('');
      setSendReplyAsEmail(false);
      setShowEmojiPicker(false);
      setReplySent(true);
      setTimeout(() => {
        setReplySent(false);
      }, 2000);
    } catch (error) {
      console.error('Error sending reply:', error);
    }
    setSendingReply(false);
  }

  // Filter tasks assigned to current user that are not completed (excludes behoben too)
  const myAssignedTasks = tasks.filter(
    (task) => task.assigned_to === effectiveUserId && task.status !== 'completed' && task.status !== 'cancelled' && task.status !== 'behoben'
  );

  // Filter steps assigned to current user that are not completed (with their parent task info)
  // Also exclude steps from completed/cancelled parent tasks
  const myAssignedSteps = tasks.flatMap((task) =>
  (task.steps || []).
  filter((step) =>
  step.assigned_to === effectiveUserId &&
  !step.completed &&
  task.status !== 'completed' &&
  task.status !== 'cancelled'
  ).
  map((step) => ({
    ...step,
    parentTask: task
  }))
  );

  // Combined count for display
  const totalMyItems = myAssignedTasks.length + myAssignedSteps.length;

  const [activeTab, setActiveTab] = useState<'pending' | 'waiting' | 'approved' | 'readyToOrder' | 'ordered' | 'waitingDelivery' | 'all'>(
    (effectiveIsKommandant || effectiveIsAdmin) ? 'pending' : 'all'
  );
  const [showCompleted, setShowCompleted] = useState(false);
  const [showMyOrders, setShowMyOrders] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [approvingDirectId, setApprovingDirectId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Ablehnung
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // Freigabe mit Rechnungsempfänger
  const [approvingOrder, setApprovingOrder] = useState<Order | null>(null);
  const [selectedInvoiceTo, setSelectedInvoiceTo] = useState<InvoiceTo>('feuerwehr');
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveType, setApproveType] = useState<'normal' | 'direct'>('normal');
  const [allowBelowMinOrder, setAllowBelowMinOrder] = useState(false);

  // Mindestbestellwert-Info Modal
  const [minOrderInfoOrder, setMinOrderInfoOrder] = useState<Order | null>(null);
  const [allowBelowMinOrderSuppliers, setAllowBelowMinOrderSuppliers] = useState<Set<string>>(new Set());

  // Sammelbestellung-Info Modal
  const [collectiveOrderInfo, setCollectiveOrderInfo] = useState<{order: Order;otherOrders: Order[];total: number;minimum: number;} | null>(null);

  // Bestellung ausgeführt / erhalten
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);



  // Löschen
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Check if user has Kassier function (use effective for sandbox testing)
  const hasKassierFunction = effectiveHasKassierFunction;

  // === ANTRÄGE DASHBOARD FILTER ===

  // Meine eigenen Anträge (für alle Benutzer sichtbar) - verwende effectiveUserId für Simulation
  const myPaymentOrders = paymentOrders.filter(
    (po) => po.created_by === effectiveUserId && po.status !== 'draft'
  );
  const myEventParticipations = eventParticipations.filter(
    (ep) => ep.created_by === effectiveUserId && ep.status !== 'draft'
  );
  const hasMyApplications = myPaymentOrders.length > 0 || myEventParticipations.length > 0;

  // Anträge zur Freigabe - nur für Genehmiger (Kommandant/Stellvertreter)
  const pendingPaymentOrders = paymentOrders.filter((po) => po.status === 'submitted');
  const pendingEventParticipations = eventParticipations.filter(
    (ep) => ep.status === 'submitted' || ep.requires_reapproval
  );
  // Nur Kommandant/Stellvertreter sehen die Aufgaben im Dashboard
  const canApproveApplications = canApprovePaymentOrders;
  const hasPendingApplications = canApprovePaymentOrders && (pendingPaymentOrders.length > 0 || pendingEventParticipations.length > 0);

  // Zur Auszahlung bereit (für Kassier) - verwende effective Funktion
  const approvedPaymentOrders = paymentOrders.filter((po) => po.status === 'approved');
  const hasPaymentsToProcess = approvedPaymentOrders.length > 0;

  // Kassier Dashboard: Entwürfe und Genehmigte
  const kassierDraftOrders = paymentOrders.filter((po) => po.status === 'draft');
  const kassierApprovedOrders = approvedPaymentOrders;

  // Check if user can delete orders (Admin or Kassier only)
  const canDeleteOrder = effectiveIsAdmin || hasKassierFunction;

  // Check if user can view "Zur Bestellung freigegeben" card
  const canViewReadyToOrder = effectiveIsKommandant || hasKassierFunction || effectiveIsAdmin || readyToOrderViewUsers.includes(effectiveUserId || '');

  // Check if user can view "Bestellt" card
  const canViewOrdered = effectiveIsKommandant || hasKassierFunction || effectiveIsAdmin || orderedViewUsers.includes(effectiveUserId || '');

  // Check if user can mark a specific order (Kassier, Admin, Kommandant OR is the creator)
  const canMarkOrder = (order: Order) => hasKassierFunction || effectiveIsAdmin || effectiveIsKommandant || order.created_by === effectiveUserId;

  // Check if user can manage minimum order value override
  const canManageMinOrderOverride = effectiveIsKommandant || effectiveIsAdmin || hasKassierFunction;

  // Toggle allow below min order for a supplier
  const toggleAllowBelowMinOrder = (supplierId: string) => {
    setAllowBelowMinOrderSuppliers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(supplierId)) {
        newSet.delete(supplierId);
      } else {
        newSet.add(supplierId);
      }
      return newSet;
    });
  };

  // Check if order is blocked due to minimum order value
  const isOrderBlockedByMinOrder = (order: Order): boolean => {
    if (!order.supplier_id) return false;
    if (!isOrderBelowMinOrderValue(order)) return false;
    return !allowBelowMinOrderSuppliers.has(order.supplier_id);
  };

  // Handle archiving order
  async function handleArchiveOrder(orderId: string) {
    setProcessingOrderId(orderId);
    await archiveOrder(orderId);
    setProcessingOrderId(null);
  }

  // Handle deleting order
  async function handleDeleteOrder() {
    console.log('handleDeleteOrder: Gestartet', { deletingOrder });

    if (!deletingOrder) {
      console.log('handleDeleteOrder: Keine Order zum Löschen');
      return;
    }

    setDeleteLoading(true);
    console.log('handleDeleteOrder: Rufe deleteOrder auf für ID:', deletingOrder.id);

    try {
      const result = await deleteOrder(deletingOrder.id);
      console.log('handleDeleteOrder: Ergebnis', result);

      if (result?.error) {
        console.error('handleDeleteOrder: Fehler beim Löschen', result.error);
        alert('Fehler beim Löschen: ' + (result.error.message || 'Unbekannter Fehler'));
      } else {
        console.log('handleDeleteOrder: Erfolgreich gelöscht!');
      }
    } catch (error) {
      console.error('handleDeleteOrder: Exception beim Löschen', error);
      alert('Fehler beim Löschen: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'));
    } finally {
      setDeleteLoading(false);
      setDeletingOrder(null);
    }
  }

  // Format date/time for status messages
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Hilfsfunktion um Bereichsleiter-Namen zu bekommen
  function getBereichsleiterName(bereichsleiterId: string | null): string | null {
    if (!bereichsleiterId) return null;
    const bl = profiles.find((p) => p.id === bereichsleiterId);
    return bl?.full_name || null;
  }

  // Prüft ob der aktuelle Benutzer diese Bestellung freigeben/ablehnen kann (verwendet effective-Werte für Simulation)
  function canApproveOrder(order: Order): boolean {
    // Bereichsleiter kann nur eingereichte Bestellungen freigeben, die ihm zugewiesen sind
    if (effectiveIsBereichsleiter && order.status === 'eingereicht' && order.bereichsleiter_id === effectiveUserId) {
      return true;
    }
    // Kommandant kann immer freigeben/ablehnen (außer bei bereits genehmigten, abgelehnten oder abgeschlossenen)
    if (effectiveIsKommandant && ['eingereicht', 'ausstehend_bereichsleitung', 'ausstehend_kommandant', 'freigegeben_bereichsleitung', 'freigegeben_kommandant'].includes(order.status)) {
      return true;
    }
    return false;
  }

  // Freigabe-Handler - öffnet Modal zur Auswahl des Rechnungsempfängers
  function handleApprove(order: Order) {
    setApprovingOrder(order);
    setApproveType('normal');
    setSelectedInvoiceTo('feuerwehr');
    setAllowBelowMinOrder(false);
  }

  // Ablehnung-Handler
  async function handleReject() {
    if (!rejectingOrder || !rejectReason.trim()) return;
    setRejectLoading(true);

    const result = await rejectOrder(rejectingOrder.id, rejectReason);

    if (result.error) {
      console.error('handleReject: Fehler bei Ablehnung', result.error);
    }

    setRejectLoading(false);
    setRejectingOrder(null);
    setRejectReason('');
  }

  const tabs = [
  {
    id: 'pending' as const,
    label: (pendingVotesForMe.length > 0 || pendingDecisionsForMe.length > 0) && effectivePendingForMe.length === 0 && openProblemReports.length === 0 ? 'Abstimmungen' : 'Zu erledigen',
    icon: ClipboardCheck,
    count: allPendingForMe.length,
    show: effectiveIsBereichsleiter || effectiveIsKommandant || effectiveIsAdmin || pendingVotesForMe.length > 0 || pendingDecisionsForMe.length > 0 || openProblemReports.length > 0
  },
  {
    id: 'waiting' as const,
    label: 'Warten auf BL',
    icon: Clock,
    count: effectiveWaitingForBL.length,
    show: effectiveIsKommandant
  },
  {
    id: 'approved' as const,
    label: 'Genehmigte',
    icon: CheckCircle,
    count: effectiveApprovedOrders.length,
    show: !effectiveIsKommandant
  },
  {
    id: 'readyToOrder' as const,
    label: 'Zur Bestellung freigegeben',
    icon: Package,
    count: filteredOrders.filter((o) => (o.status === 'genehmigt' || o.status === 'freigegeben_kommandant') && !o.order_executed).length,
    show: canViewReadyToOrder
  },
  {
    id: 'ordered' as const,
    label: 'Bestellt',
    icon: PackageCheck,
    count: filteredOrders.filter((o) => o.order_executed).length,
    show: canViewOrdered
  },
  {
    id: 'waitingDelivery' as const,
    label: 'Warten auf Wareneingang',
    icon: Clock,
    count: filteredOrders.filter((o) => o.order_executed && !o.order_received).length,
    show: canViewOrdered
  },
  {
    id: 'all' as const,
    label: 'Alle Bestellungen',
    icon: List,
    count: filteredOrders.filter((o) => !o.is_archived && o.status !== 'abgeschlossen').length,
    show: true
  }].
  filter((tab) => tab.show);

  const getActiveOrders = () => {
    switch (activeTab) {
      case 'pending':return allPendingForMe.filter((item) => 'status' in item && !('category' in item && 'severity' in item));
      case 'waiting':return effectiveWaitingForBL;
      case 'approved':return effectiveApprovedOrders;
      case 'readyToOrder':return filteredOrders.filter((o) => (o.status === 'genehmigt' || o.status === 'freigegeben_kommandant') && !o.order_executed);
      case 'ordered':return filteredOrders.filter((o) => o.order_executed);
      case 'waitingDelivery':return filteredOrders.filter((o) => o.order_executed && !o.order_received);
      case 'all':return filteredOrders.filter((o) => !o.is_archived && o.status !== 'abgeschlossen');
      default:return [];
    }
  };

  // Unterlisten für "Bestellt" Tab (verwende gefilterte Bestellungen)
  const orderedWaitingDelivery = filteredOrders.filter((o) => o.order_executed && !o.order_received && o.status !== 'abgeschlossen');
  const orderedReceived = filteredOrders.filter((o) => o.order_executed && o.order_received && o.status !== 'abgeschlossen');
  const orderedCompleted = filteredOrders.filter((o) => o.order_executed && o.status === 'abgeschlossen');

  async function handleComplete(orderId: string) {
    setCompletingId(orderId);
    await completeOrder(orderId);
    setCompletingId(null);
  }

  // Direkte Freigabe durch Kommandant - öffnet Modal
  function handleApproveDirectByKommandant(order: Order) {
    setApprovingOrder(order);
    setApproveType('direct');
    setSelectedInvoiceTo('feuerwehr');
    setAllowBelowMinOrder(false);
  }

  // Bestätigung der Freigabe mit Rechnungsempfänger (verwendet effective-Werte für Simulation)
  async function handleConfirmApprove() {
    if (!approvingOrder) return;
    setApproveLoading(true);

    let result: {error?: Error | null;} = {};

    if (approveType === 'direct') {
      // Direktfreigabe durch Kommandant
      result = await approveByKommandantDirect(approvingOrder.id, selectedInvoiceTo);
    } else if ((effectiveIsBereichsleiter || effectiveIsKommandant) && approvingOrder.status === 'eingereicht' && approvingOrder.bereichsleiter_id === effectiveUserId) {
      // Bereichsleiter (oder Kommandant als zugewiesener BL) gibt frei
      result = await approveByBereichsleiter(approvingOrder.id, selectedInvoiceTo);
    } else if (effectiveIsKommandant && ['eingereicht', 'ausstehend_bereichsleitung', 'ausstehend_kommandant', 'freigegeben_bereichsleitung'].includes(approvingOrder.status)) {
      // Kommandant gibt bei allen relevanten Status frei
      result = await approveByKommandant(approvingOrder.id, selectedInvoiceTo);
    } else {
      console.error('handleConfirmApprove: Keine passende Freigabe-Methode gefunden', {
        approveType,
        effectiveIsBereichsleiter,
        effectiveIsKommandant,
        orderStatus: approvingOrder.status,
        orderBereichsleiterId: approvingOrder.bereichsleiter_id,
        effectiveUserId
      });
    }

    if (result.error) {
      console.error('handleConfirmApprove: Fehler bei Freigabe', result.error);
    }

    setApproveLoading(false);
    setApprovingOrder(null);
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (loading) {
    return (
      <Layout>
        <div data-ev-id="ev_cdf7fa76d7" className="flex items-center justify-center min-h-[400px]">
          <div data-ev-id="ev_74e4670fdd" className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </Layout>);

  }

  return (
    <Layout>
      {/* Ansicht-Toggle */}
      <div data-ev-id="ev_0301cb808b" className="flex justify-end mb-4">
        <div data-ev-id="ev_4cce5cd898" className="inline-flex rounded-lg border border-border bg-muted p-1">
          <button data-ev-id="ev_3c22904b9c"
          onClick={() => setDashboardView('compact')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
          dashboardView === 'compact' ?
          'bg-card text-foreground shadow-sm' :
          'text-muted-foreground hover:text-foreground'}`
          }>

            Kompakt
          </button>
          <button data-ev-id="ev_3b78b239b7"
          onClick={() => setDashboardView('extended')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
          dashboardView === 'extended' ?
          'bg-card text-foreground shadow-sm' :
          'text-muted-foreground hover:text-foreground'}`
          }>

            Erweitert
          </button>
        </div>
      </div>

      {/* === KOMPAKTE ANSICHT === */}
      {dashboardView === 'compact' ?
      <>
          <CompactDashboard
          orders={filteredOrders}
          myOrders={effectiveMyOrders}
          pendingForMe={pendingForMe}
          waitingForBereichsleiter={waitingForBereichsleiter}
          tasks={todoTasks}
          pendingPaymentOrders={pendingPaymentOrders}
          pendingEventParticipations={pendingEventParticipations}
          kassierDraftOrders={kassierDraftOrders}
          kassierApprovedOrders={kassierApprovedOrders}
          markAsPaid={markAsPaid}
          approveByBereichsleiter={approveByBereichsleiter}
          approveByKommandant={approveByKommandant}
          approvePaymentOrder={approvePaymentOrder}
          canApprovePaymentOrders={canApprovePaymentOrders}
          rejectPaymentOrder={rejectPaymentOrder}
          approveEventParticipation={approveEventParticipation}
          rejectEventParticipation={rejectEventParticipation}
          profiles={profiles}
          canSendMessages={canSendMessages}
          myMessagesCount={getUnreadOpenMessagesCount()}
          onOpenMessageModal={() => setShowMessageModal(true)}
          onOpenMessageArchive={() => setShowMessageArchive(true)}
          pendingRentalInvoices={pendingRentalInvoices}
          onCreateRentalInvoiceTask={async (contract) => {
            if (!supabase || !user) return;
            try {
              // Finde Kassier
              const { data: kassierProfiles } = await supabase.
              from('profiles').
              select('id').
              contains('functions', ['kassier']).
              eq('is_active', true).
              limit(1);
              const kassierProfile = kassierProfiles?.[0];
              if (!kassierProfile?.id) return;

              // Erstelle Benachrichtigung
              await supabase.from('notifications').insert({
                user_id: kassierProfile.id,
                title: 'Leihvertrag - Rechnung ausstehend',
                message: `Leihvertrag ${contract.contract_number} für ${contract.customer_name} mit ${contract.total_amount.toFixed(2)} € - Bitte Rechnung im Buchhaltungssystem erstellen.`,
                type: 'rental_contract',
                link: '/leihgeraete'
              });

              // Finde oder erstelle Standard-Liste für Kassier
              let listId: string | null = null;
              const { data: existingLists } = await supabase.
              from('todo_lists').
              select('id').
              eq('owner_id', kassierProfile.id).
              eq('is_smart_list', false).
              limit(1);

              if (existingLists && existingLists.length > 0) {
                listId = existingLists[0].id;
              } else {
                const { data: newList } = await supabase.
                from('todo_lists').
                insert({ name: 'Aufgaben', owner_id: kassierProfile.id, is_smart_list: false }).
                select('id').
                single();
                listId = newList?.id ?? null;
              }

              // Erstelle Aufgabe
              if (listId) {
                await supabase.from('todo_tasks').insert({
                  title: `Rechnung erstellen: LV ${contract.contract_number}`,
                  notes: `Leihvertrag ${contract.contract_number} für ${contract.customer_name}\nBetrag: ${contract.total_amount.toFixed(2)} €\n\nBitte Rechnung im Buchhaltungssystem erstellen.`,
                  list_id: listId,
                  assigned_to: kassierProfile.id,
                  assigned_by: user.id,
                  assigned_at: new Date().toISOString(),
                  created_by: user.id,
                  due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  is_important: true
                });
              }

              alert('Aufgabe und Benachrichtigung für Kassier erstellt!');
            } catch (err) {
              console.error('Error creating rental invoice task:', err);
              alert('Fehler beim Erstellen der Aufgabe');
            }
          }}
          onMarkInvoiceCreated={async (contractId) => {
            if (!supabase) return;
            try {
              await supabase.
              from('rental_contracts').
              update({ status: 'invoiced' }).
              eq('id', contractId);
              refetchPendingInvoices();
              alert('Leihvertrag als "Rechnung erstellt" markiert.');
            } catch (err) {
              console.error('Error marking invoice as created:', err);
              alert('Fehler beim Markieren.');
            }
          }}
          getCollectiveOrderInfo={(order) => {
            const info = getCollectiveOrderInfo(order);
            return info ? { isCollective: info.isCollective, collectiveId: null } : null;
          }}
          isOrderBelowMinOrderValue={isOrderBelowMinOrderValue} />

        </> :

      <>
      {/* Page Header Card */}
      <div data-ev-id="ev_4365814019" className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-5 text-primary-foreground shadow-lg mb-6">
        <div data-ev-id="ev_c5221ac3d1" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div data-ev-id="ev_e9c6cdb362" className="flex items-center gap-4">
            <div data-ev-id="ev_5bcf96308a" className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <span data-ev-id="ev_043afde2ee" className="text-2xl font-bold">
                {profile?.full_name?.charAt(0).toUpperCase() || 'B'}
              </span>
            </div>
            <div data-ev-id="ev_0b45de4449">
              <h1 data-ev-id="ev_ec0b35a29d" className="text-xl font-bold">
                Willkommen, {profile?.full_name || 'Benutzer'}
              </h1>
              <p data-ev-id="ev_5da6d1ab43" className="text-sm text-primary-foreground/80">
                Übersicht Ihrer Bestellanforderungen
              </p>
            </div>
          </div>
          {canAccessBestellungen &&
            <Link
              to="/bestellungen/neu"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-primary rounded-xl font-medium hover:bg-white/90 transition-colors shadow-lg group">

            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            Neue Bestellung
          </Link>
            }
        </div>
      </div>

      {/* Stats Cards */}
      <div data-ev-id="ev_7e19011fb9" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {tabs.map((tab) =>
          <button data-ev-id="ev_102a45cbe7"
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`p-4 rounded-xl border-2 transition-all text-left ${
          activeTab === tab.id ?
          'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25' :
          'bg-card border-border hover:border-primary/50 hover:shadow-md'}`
          }>

            <div data-ev-id="ev_e081fd6174" className="flex items-center justify-between">
              <div data-ev-id="ev_a3c6dac4e7" className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              activeTab === tab.id ? 'bg-white/20' : 'bg-muted'}`
              }>
                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
              </div>
              <span data-ev-id="ev_1902a82e5a" className={`text-2xl font-bold ${activeTab === tab.id ? 'text-primary-foreground' : 'text-foreground'}`}>
                {tab.count}
              </span>
            </div>
            <p data-ev-id="ev_bab1db79ca" className={`mt-3 font-medium text-sm ${activeTab === tab.id ? 'text-primary-foreground' : 'text-foreground'}`}>
              {tab.label}
            </p>
          </button>
          )}
      </div>

      {/* Nachricht senden Card & Nachrichten Archiv */}
      {(canSendMessages || myMessages.length > 0) &&
        <div data-ev-id="ev_7c3ae03ee9" className="mb-8 flex flex-wrap gap-4">
          {/* Nachricht senden Card */}
          {canSendMessages &&
          <button data-ev-id="ev_19c56b3c33"
          onClick={() => setShowMessageModal(true)}
          className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all text-left">

              <div data-ev-id="ev_c127ec2aa1" className="flex items-center justify-between">
                <MessageSquare className="w-6 h-6 text-primary" />
                <Send className="w-5 h-5 text-foreground" />
              </div>
              <p data-ev-id="ev_f22f5d36c5" className="mt-2 font-medium text-foreground">
                Nachricht senden
              </p>
            </button>
          }

          {/* Mein Nachrichten Archiv Card */}
          {myMessages.length > 0 &&
          <button data-ev-id="ev_04d6c15f32"
          onClick={() => setShowMessageArchive(true)}
          className="p-4 rounded-xl border border-border bg-card hover:border-green-500/50 transition-all text-left">

              <div data-ev-id="ev_d16c49c0f1" className="flex items-center justify-between">
                <Inbox className="w-6 h-6 text-green-500" />
                <span data-ev-id="ev_08b3a2f607" className="text-2xl font-bold text-foreground">
                  {myMessages.length}
                </span>
              </div>
              <p data-ev-id="ev_1b4428bb0d" className="mt-2 font-medium text-foreground">
                Mein Nachrichten Archiv
              </p>
            </button>
          }
        </div>
        }

      {/* === ANTRÄGE ZUR FREIGABE (Kommandant/Admin) === */}
      {canApproveApplications && hasPendingApplications &&
        <div data-ev-id="ev_e82874ad0c" className="mb-6">
          <div data-ev-id="ev_cf9cba4512" className="bg-card rounded-xl border border-border overflow-hidden">
            <div data-ev-id="ev_80ba139be0" className="px-4 py-3 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
              <div data-ev-id="ev_26dadd4d9e" className="flex items-center gap-2">
                <div data-ev-id="ev_eb280c925e" className="p-1.5 bg-orange-100 rounded-lg">
                  <FileCheck className="w-4 h-4 text-orange-600" />
                </div>
                <h2 data-ev-id="ev_3b7bdde20b" className="font-medium text-sm text-foreground">Anträge zur Freigabe</h2>
                <span data-ev-id="ev_3758681d1d" className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full font-medium">
                  {pendingPaymentOrders.length + pendingEventParticipations.length}
                </span>
              </div>
              <Link
                to="/antragsformulare"
                className="text-xs text-orange-600 hover:underline flex items-center gap-1 font-medium">
                Alle anzeigen
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div data-ev-id="ev_ec392eedc8" className="p-4">
              <div data-ev-id="ev_6216e72911" className="flex flex-col gap-3">
                {/* Auszahlungsanweisungen */}
                {pendingPaymentOrders.slice(0, 3).map((po) => {
                  const creator = profiles.find((p) => p.id === po.created_by);
                  return (
                    <div data-ev-id="ev_af68d549c7" key={po.id} className="p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div data-ev-id="ev_9fd6ab1bf4" className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-4 h-4 text-orange-500" />
                        <span data-ev-id="ev_1ca56fa2ea" className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded">Auszahlung</span>
                      </div>
                      <div data-ev-id="ev_41c0b090b5" className="flex items-start justify-between gap-3">
                        <div data-ev-id="ev_e6328619b3" className="flex-1 min-w-0">
                          <h3 data-ev-id="ev_0955ac6c9c" className="font-medium text-foreground truncate">{po.recipient_name}</h3>
                          <p data-ev-id="ev_103198ebfd" className="text-sm text-muted-foreground truncate">{po.purpose}</p>
                          <div data-ev-id="ev_7473423c01" className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span data-ev-id="ev_56d80ec15e" className="flex items-center gap-1">
                              <Euro className="w-3 h-3" />
                              {po.amount.toFixed(2)} €
                            </span>
                            <span data-ev-id="ev_eacd1994e3" className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {creator?.full_name || 'Unbekannt'}
                            </span>
                          </div>
                        </div>
                        {canApprovePaymentOrders &&
                        <div data-ev-id="ev_d3451c4579" className="flex items-center gap-2">
                          <button data-ev-id="ev_568a66186d"
                          onClick={async () => {
                            await approvePaymentOrder(po.id);
                          }}
                          className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                          title="Genehmigen">
                            <Check className="w-4 h-4" />
                          </button>
                          <button data-ev-id="ev_295ed42d01"
                          onClick={async () => {
                            const reason = prompt('Ablehnungsgrund:');
                            if (reason) await rejectPaymentOrder(po.id, reason);
                          }}
                          className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                          title="Ablehnen">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        }
                      </div>
                    </div>);

                })}
                
                {/* Veranstaltungsteilnahmen */}
                {pendingEventParticipations.slice(0, 3).map((ep) => {
                  const creator = profiles.find((p) => p.id === ep.created_by);
                  return (
                    <div data-ev-id="ev_8946c03985" key={ep.id} className="p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div data-ev-id="ev_c889eb6015" className="flex items-center gap-2 mb-2">
                        <CalendarCheck className="w-4 h-4 text-purple-500" />
                        <span data-ev-id="ev_3c909dd4ad" className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                          {ep.requires_reapproval ? 'Erneute Freigabe' : 'Veranstaltung'}
                        </span>
                      </div>
                      <div data-ev-id="ev_15e2104dfd" className="flex items-start justify-between gap-3">
                        <div data-ev-id="ev_a3c38e4b5f" className="flex-1 min-w-0">
                          <h3 data-ev-id="ev_cbb132df4f" className="font-medium text-foreground truncate">{ep.event_name}</h3>
                          <p data-ev-id="ev_9f27157cc3" className="text-sm text-muted-foreground truncate">{ep.event_location || 'Kein Ort'}</p>
                          <div data-ev-id="ev_0033e722d1" className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span data-ev-id="ev_b2bcf0d2c1" className="flex items-center gap-1">
                              <Euro className="w-3 h-3" />
                              {ep.estimated_costs.toFixed(2)} €
                            </span>
                            <span data-ev-id="ev_728dc83ff2" className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(ep.event_date).toLocaleDateString('de-DE')}
                            </span>
                            <span data-ev-id="ev_94ab072dff" className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {creator?.full_name || 'Unbekannt'}
                            </span>
                          </div>
                        </div>
                        <div data-ev-id="ev_c8d8241686" className="flex items-center gap-2">
                          <button data-ev-id="ev_02aa2821b1"
                          onClick={async () => {
                            await approveEventParticipation(ep.id);
                          }}
                          className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                          title="Genehmigen">
                            <Check className="w-4 h-4" />
                          </button>
                          <button data-ev-id="ev_80d520d47c"
                          onClick={async () => {
                            const reason = prompt('Ablehnungsgrund:');
                            if (reason) await rejectEventParticipation(ep.id, reason);
                          }}
                          className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                          title="Ablehnen">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>);

                })}
                
                {pendingPaymentOrders.length + pendingEventParticipations.length > 6 &&
                <Link
                  to="/antragsformulare"
                  className="text-center py-2 text-sm text-orange-600 hover:underline">
                    + {pendingPaymentOrders.length + pendingEventParticipations.length - 6} weitere Anträge anzeigen
                  </Link>
                }
              </div>
            </div>
          </div>
        </div>
        }

      {/* === ZUR AUSZAHLUNG BEREIT (Kassier) === */}
      {hasKassierFunction && hasPaymentsToProcess &&
        <div data-ev-id="ev_8a536f4f3a" className="mb-6">
          <div data-ev-id="ev_b9916cf017" className="bg-card rounded-xl border border-border overflow-hidden">
            <div data-ev-id="ev_fe343c4d69" className="px-4 py-3 bg-green-50 border-b border-green-100 flex items-center justify-between">
              <div data-ev-id="ev_47a14da4b8" className="flex items-center gap-2">
                <div data-ev-id="ev_a1ac1cd9bd" className="p-1.5 bg-green-100 rounded-lg">
                  <Banknote className="w-4 h-4 text-green-600" />
                </div>
                <h2 data-ev-id="ev_5729205aed" className="font-medium text-sm text-foreground">Zur Auszahlung bereit</h2>
                <span data-ev-id="ev_da06ca83ee" className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-medium">
                  {approvedPaymentOrders.length}
                </span>
              </div>
              <Link
                to="/antragsformulare"
                className="text-xs text-green-600 hover:underline flex items-center gap-1 font-medium">
                Alle anzeigen
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div data-ev-id="ev_370eb97f47" className="p-4">
              <div data-ev-id="ev_790f31e46f" className="flex flex-col gap-3">
                {approvedPaymentOrders.slice(0, 5).map((po) => {
                  const creator = profiles.find((p) => p.id === po.created_by);
                  return (
                    <div data-ev-id="ev_03d6aea6e5" key={po.id} className="p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div data-ev-id="ev_afb20fb96b" className="flex items-start justify-between gap-3">
                        <div data-ev-id="ev_fc6983fc0e" className="flex-1 min-w-0">
                          <div data-ev-id="ev_b3f0b4f598" className="flex items-center gap-2 mb-1">
                            <CreditCard className="w-4 h-4 text-green-500" />
                            <h3 data-ev-id="ev_6ed1724357" className="font-medium text-foreground truncate">{po.recipient_name}</h3>
                          </div>
                          <p data-ev-id="ev_c1130d5d3d" className="text-sm text-muted-foreground truncate">{po.purpose}</p>
                          <div data-ev-id="ev_38202c2c2c" className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span data-ev-id="ev_5fcfffcced" className="flex items-center gap-1 font-medium text-green-600">
                              <Euro className="w-3 h-3" />
                              {po.amount.toFixed(2)} €
                            </span>
                            <span data-ev-id="ev_7dc21ac80a" className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {creator?.full_name || 'Unbekannt'}
                            </span>
                            {po.payment_method === 'cash' && <span data-ev-id="ev_724348755b" className="text-orange-600">Bar</span>}
                            {po.payment_method === 'transfer' && <span data-ev-id="ev_2ff58b270e" className="text-blue-600">Überweisung</span>}
                          </div>
                        </div>
                        <button data-ev-id="ev_04a99ee5d3"
                        onClick={async () => {
                          if (confirm('Als bezahlt markieren?')) {
                            await markAsPaid(po.id);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Bezahlt
                        </button>
                      </div>
                    </div>);

                })}
                
                {approvedPaymentOrders.length > 5 &&
                <Link
                  to="/antragsformulare"
                  className="text-center py-2 text-sm text-green-600 hover:underline">
                    + {approvedPaymentOrders.length - 5} weitere Auszahlungen anzeigen
                  </Link>
                }
              </div>
            </div>
          </div>
        </div>
        }

      {/* === MEINE ANTRÄGE (für alle Benutzer) === */}
      {hasMyApplications &&
        <div data-ev-id="ev_b7e5f832a4" className="mb-6">
          <div data-ev-id="ev_dbfc961e9a" className="bg-card rounded-xl border border-border overflow-hidden">
            <div data-ev-id="ev_75e352efdb" className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
              <div data-ev-id="ev_4fcda91741" className="flex items-center gap-2">
                <div data-ev-id="ev_05e80fe62b" className="p-1.5 bg-indigo-100 rounded-lg">
                  <FileText className="w-4 h-4 text-indigo-600" />
                </div>
                <h2 data-ev-id="ev_070abab32e" className="font-medium text-sm text-foreground">Meine Anträge</h2>
                <span data-ev-id="ev_6d977cd8b9" className="text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-medium">
                  {myPaymentOrders.length + myEventParticipations.length}
                </span>
              </div>
              <Link
                to="/antragsformulare"
                className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium">
                Alle anzeigen
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div data-ev-id="ev_71543e8bad" className="p-4">
              <div data-ev-id="ev_c5b49fabb4" className="flex flex-col gap-3">
                {/* Meine Auszahlungsanweisungen */}
                {myPaymentOrders.slice(0, 3).map((po) => {
                  const statusColors: Record<string, string> = {
                    submitted: 'bg-orange-100 text-orange-700',
                    approved: 'bg-green-100 text-green-700',
                    paid: 'bg-blue-100 text-blue-700',
                    rejected: 'bg-red-100 text-red-700'
                  };
                  const statusLabels: Record<string, string> = {
                    submitted: 'Eingereicht',
                    approved: 'Genehmigt',
                    paid: 'Bezahlt',
                    rejected: 'Abgelehnt'
                  };
                  return (
                    <Link key={po.id} to="/antragsformulare" className="p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div data-ev-id="ev_b845c32605" className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-4 h-4 text-indigo-500" />
                        <span data-ev-id="ev_8701a5814c" className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Auszahlung</span>
                        <span data-ev-id="ev_5924b2e206" className={`text-xs px-2 py-0.5 rounded font-medium ${statusColors[po.status] || 'bg-gray-100 text-gray-700'}`}>
                          {statusLabels[po.status] || po.status}
                        </span>
                      </div>
                      <div data-ev-id="ev_89ae7307b2" className="flex items-start justify-between gap-3">
                        <div data-ev-id="ev_7891abc220" className="flex-1 min-w-0">
                          <h3 data-ev-id="ev_b5a37e5065" className="font-medium text-foreground truncate">{po.recipient_name}</h3>
                          <p data-ev-id="ev_942f65db28" className="text-sm text-muted-foreground truncate">{po.purpose}</p>
                        </div>
                        <span data-ev-id="ev_4121faed7f" className="text-sm font-medium text-foreground">{po.amount.toFixed(2)} €</span>
                      </div>
                    </Link>);

                })}
                
                {/* Meine Veranstaltungsteilnahmen */}
                {myEventParticipations.slice(0, 3).map((ep) => {
                  const statusColors: Record<string, string> = {
                    submitted: 'bg-orange-100 text-orange-700',
                    approved: 'bg-green-100 text-green-700',
                    rejected: 'bg-red-100 text-red-700'
                  };
                  const statusLabels: Record<string, string> = {
                    submitted: 'Eingereicht',
                    approved: 'Genehmigt',
                    rejected: 'Abgelehnt'
                  };
                  return (
                    <Link key={ep.id} to="/antragsformulare" className="p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div data-ev-id="ev_1bb417973a" className="flex items-center gap-2 mb-2">
                        <CalendarCheck className="w-4 h-4 text-purple-500" />
                        <span data-ev-id="ev_bb332ad275" className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Veranstaltung</span>
                        <span data-ev-id="ev_82a4ee0647" className={`text-xs px-2 py-0.5 rounded font-medium ${statusColors[ep.status] || 'bg-gray-100 text-gray-700'}`}>
                          {statusLabels[ep.status] || ep.status}
                        </span>
                        {ep.requires_reapproval && <span data-ev-id="ev_9ce6826ef1" className="text-xs px-2 py-0.5 rounded font-medium bg-amber-100 text-amber-700">Erneute Freigabe</span>}
                      </div>
                      <div data-ev-id="ev_452865e88d" className="flex items-start justify-between gap-3">
                        <div data-ev-id="ev_1126a38dde" className="flex-1 min-w-0">
                          <h3 data-ev-id="ev_6052e47856" className="font-medium text-foreground truncate">{ep.event_name}</h3>
                          <p data-ev-id="ev_78af74418f" className="text-sm text-muted-foreground truncate">
                            {new Date(ep.event_date).toLocaleDateString('de-DE')} {ep.event_location && `• ${ep.event_location}`}
                          </p>
                        </div>
                        <span data-ev-id="ev_bb8f1e4796" className="text-sm font-medium text-foreground">{ep.estimated_costs.toFixed(2)} €</span>
                      </div>
                    </Link>);

                })}
                
                {myPaymentOrders.length + myEventParticipations.length > 6 &&
                <Link
                  to="/antragsformulare"
                  className="text-center py-2 text-sm text-indigo-600 hover:underline">
                    + {myPaymentOrders.length + myEventParticipations.length - 6} weitere Anträge anzeigen
                  </Link>
                }
              </div>
            </div>
          </div>
        </div>
        }

      {/* Meine Aufgaben Section */}
      {totalMyItems > 0 &&
        <div data-ev-id="ev_d4599c695d" className="mb-6">
          <div data-ev-id="ev_98ff8a5a99" className="bg-card rounded-xl border border-border overflow-hidden">
            <div data-ev-id="ev_24f65349a3" className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
              <div data-ev-id="ev_c8ed821152" className="flex items-center gap-2">
                <div data-ev-id="ev_aecd96071d" className="p-1.5 bg-blue-100 rounded-lg">
                  <ListTodo className="w-4 h-4 text-blue-600" />
                </div>
                <h2 data-ev-id="ev_84d1566b7f" className="font-medium text-sm text-foreground">Meine Aufgaben</h2>
                <span data-ev-id="ev_d9a817fd46" className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                  {totalMyItems}
                </span>
              </div>
              <Link
                to="/aufgaben"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium">

                Alle anzeigen
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div data-ev-id="ev_779a2ef4dc" className="p-4">
              <div data-ev-id="ev_be721f96d3" className="flex flex-col gap-3">
                {/* Assigned Tasks */}
                {myAssignedTasks.slice(0, 3).map((task) => {
                  const priorityColors: Record<string, string> = {
                    low: 'bg-slate-400',
                    medium: 'bg-blue-500',
                    high: 'bg-orange-500',
                    urgent: 'bg-red-500'
                  };
                  const priorityLabels: Record<string, string> = {
                    low: 'Niedrig',
                    medium: 'Mittel',
                    high: 'Hoch',
                    urgent: 'Dringend'
                  };
                  const completedSteps = task.steps?.filter((s) => s.completed).length || 0;
                  const totalSteps = task.steps?.length || 0;

                  return (
                    <Link
                      key={task.id}
                      to="/aufgaben"
                      className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors">

                      <div data-ev-id="ev_5eae594550" className="flex items-center gap-2 mb-2">
                        <ListTodo className="w-4 h-4 text-blue-500" />
                        <span data-ev-id="ev_bbf8affa12" className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Aufgabe</span>
                      </div>
                      <div data-ev-id="ev_2c9edf1332" className="flex items-start justify-between gap-3">
                        <div data-ev-id="ev_9c4d266585" className="flex-1 min-w-0">
                          <div data-ev-id="ev_cb5ca00018" className="flex items-center gap-2 mb-1">
                            <div data-ev-id="ev_6b7bc75f38" className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
                            <h3 data-ev-id="ev_c70a414426" className="font-medium text-foreground truncate">
                              {task.title}
                            </h3>
                            {task.category &&
                            <span data-ev-id="ev_5d8654f8a9" className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
                                {task.category}
                              </span>
                            }
                          </div>
                          <div data-ev-id="ev_89b9ed7f3b" className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span data-ev-id="ev_a8a4e4e35b" className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(task.end_date).toLocaleDateString('de-DE')}
                            </span>
                            <span data-ev-id="ev_aafe8b44f8" className="flex items-center gap-1">
                              <Flag className="w-4 h-4" />
                              {priorityLabels[task.priority]}
                            </span>
                            {totalSteps > 0 &&
                            <span data-ev-id="ev_4f2a3c6b6f" className="flex items-center gap-1">
                                <CheckSquare className="w-4 h-4" />
                                {completedSteps}/{totalSteps} Schritte
                              </span>
                            }
                          </div>
                        </div>
                        <div data-ev-id="ev_6ba2a961a0" className="flex-shrink-0">
                          <div data-ev-id="ev_7b211cd008" className="w-16 text-right">
                            <span data-ev-id="ev_c2f6e310ea" className="text-sm font-medium text-foreground">{task.progress}%</span>
                            <div data-ev-id="ev_3eee7755eb" className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                              <div data-ev-id="ev_be30bc26b3"
                              className={`h-full ${priorityColors[task.priority]} transition-all`}
                              style={{ width: `${task.progress}%` }} />

                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>);

                })}

                {/* Assigned Steps */}
                {myAssignedSteps.slice(0, Math.max(0, 5 - myAssignedTasks.slice(0, 3).length)).map((step) => {
                  const priorityColors: Record<string, string> = {
                    low: 'bg-slate-400',
                    medium: 'bg-blue-500',
                    high: 'bg-orange-500',
                    urgent: 'bg-red-500'
                  };

                  return (
                    <Link
                      key={step.id}
                      to="/aufgaben"
                      className="p-4 rounded-lg border border-border bg-purple-50/50 hover:bg-purple-50 transition-colors">
                      <div data-ev-id="ev_8bcc1277c4" className="flex items-center gap-2 mb-2">
                        <CheckSquare className="w-4 h-4 text-purple-500" />
                        <span data-ev-id="ev_d0bd3379d6" className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded">Unterschritt</span>
                      </div>
                      <div data-ev-id="ev_2e5d95ae69" className="flex items-start justify-between gap-3">
                        <div data-ev-id="ev_73609f298f" className="flex-1 min-w-0">
                          <div data-ev-id="ev_d0e416f7df" className="flex items-center gap-2 mb-1">
                            <div data-ev-id="ev_feb43f867f" className={`w-2 h-2 rounded-full ${priorityColors[step.parentTask.priority]}`} />
                            <h3 data-ev-id="ev_13b5cff7c0" className="font-medium text-foreground truncate">
                              {step.title}
                            </h3>
                          </div>
                          <div data-ev-id="ev_c2977259b7" className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span data-ev-id="ev_4868d19250" className="flex items-center gap-1">
                              <ListTodo className="w-4 h-4" />
                              {step.parentTask.title}
                            </span>
                            <span data-ev-id="ev_db02680c4e" className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(step.parentTask.end_date).toLocaleDateString('de-DE')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>);

                })}

                {totalMyItems > 5 &&
                <Link
                  to="/aufgaben"
                  className="text-center py-2 text-sm text-primary hover:underline">

                    + {totalMyItems - 5} weitere Aufgaben anzeigen
                  </Link>
                }
              </div>
            </div>
          </div>
        </div>
        }

      {/* Order List */}
      <div data-ev-id="ev_98a05ddd3b" className="bg-card rounded-xl border border-border">
        <div data-ev-id="ev_c68c6ab449" className="p-4 border-b border-border">
          <h2 data-ev-id="ev_f4dec57c35" className="font-semibold text-foreground">
            {tabs.find((t) => t.id === activeTab)?.label}
          </h2>
        </div>
        <div data-ev-id="ev_92ff51c468" className="p-4">
          {/* Spezielle Darstellung für "Bestellt" Tab mit Unterlisten */}
          {activeTab === 'ordered' ?
            <div data-ev-id="ev_c7e4e66a70" className="flex flex-col gap-6">
              {/* Warte auf Lieferung */}
              <div data-ev-id="ev_9bfbab1e9c" className="border border-border rounded-lg overflow-hidden">
                <button data-ev-id="ev_f4c9b354a0"
                onClick={() => setShowWaitingDelivery(!showWaitingDelivery)}
                className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 transition-colors">

                  <div data-ev-id="ev_15ca460a54" className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-600" />
                    <span data-ev-id="ev_3b85b463d0" className="font-medium text-blue-900">Warte auf Lieferung</span>
                    <span data-ev-id="ev_3106cd1a36" className="text-sm text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                      {orderedWaitingDelivery.length}
                    </span>
                  </div>
                  {showWaitingDelivery ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5 text-blue-600" />}
                </button>
                {showWaitingDelivery && orderedWaitingDelivery.length > 0 &&
                <div data-ev-id="ev_11ed7022a9" className="p-3 flex flex-col gap-2 bg-white">
                    {orderedWaitingDelivery.map((order) => {
                    const collectiveInfo = getCollectiveOrderInfo(order);
                    return (
                      <OrderCard
                        key={order.id}
                        order={order}
                        belowMinOrderValue={isOrderBelowMinOrderValue(order)}
                        isCollectiveOrder={collectiveInfo?.isCollective ?? false}
                        collectiveOrderCount={collectiveInfo ? collectiveInfo.otherOrders.length + 1 : 0}
                        voteSummary={voteSummaries[order.id]}
                        onCollectiveOrderClick={() => {
                          if (collectiveInfo) {
                            setCollectiveOrderInfo({ order, ...collectiveInfo });
                          }
                        }} />);


                  })}
                  </div>
                }
                {showWaitingDelivery && orderedWaitingDelivery.length === 0 &&
                <div data-ev-id="ev_9c9532f24d" className="p-4 text-center text-muted-foreground text-sm">
                    Keine Bestellungen warten auf Lieferung
                  </div>
                }
              </div>

              {/* Ware erhalten */}
              <div data-ev-id="ev_cc33d68850" className="border border-border rounded-lg overflow-hidden">
                <button data-ev-id="ev_df2b1ac941"
                onClick={() => setShowReceived(!showReceived)}
                className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 transition-colors">

                  <div data-ev-id="ev_8893f291f1" className="flex items-center gap-2">
                    <PackageCheck className="w-5 h-5 text-green-600" />
                    <span data-ev-id="ev_391c9da48b" className="font-medium text-green-900">Ware erhalten</span>
                    <span data-ev-id="ev_24d1b9a57e" className="text-sm text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                      {orderedReceived.length}
                    </span>
                  </div>
                  {showReceived ? <ChevronUp className="w-5 h-5 text-green-600" /> : <ChevronDown className="w-5 h-5 text-green-600" />}
                </button>
                {showReceived && orderedReceived.length > 0 &&
                <div data-ev-id="ev_ebbbfe8752" className="p-3 flex flex-col gap-2 bg-white">
                    {orderedReceived.map((order) => {
                    const collectiveInfo = getCollectiveOrderInfo(order);
                    return (
                      <OrderCard
                        key={order.id}
                        order={order}
                        belowMinOrderValue={isOrderBelowMinOrderValue(order)}
                        isCollectiveOrder={collectiveInfo?.isCollective ?? false}
                        collectiveOrderCount={collectiveInfo ? collectiveInfo.otherOrders.length + 1 : 0}
                        voteSummary={voteSummaries[order.id]}
                        onCollectiveOrderClick={() => {
                          if (collectiveInfo) {
                            setCollectiveOrderInfo({ order, ...collectiveInfo });
                          }
                        }} />);


                  })}
                  </div>
                }
                {showReceived && orderedReceived.length === 0 &&
                <div data-ev-id="ev_c31e825b24" className="p-4 text-center text-muted-foreground text-sm">
                    Keine Bestellungen mit erhaltener Ware
                  </div>
                }
              </div>

              {/* Abgeschlossen */}
              <div data-ev-id="ev_3f6a242c37" className="border border-border rounded-lg overflow-hidden">
                <button data-ev-id="ev_9a079d9e57"
                onClick={() => setShowCompletedOrdered(!showCompletedOrdered)}
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors">

                  <div data-ev-id="ev_87c1478e3d" className="flex items-center gap-2">
                    <Archive className="w-5 h-5 text-slate-600" />
                    <span data-ev-id="ev_26e164a0b1" className="font-medium text-slate-900">Abgeschlossen</span>
                    <span data-ev-id="ev_c0c0e12727" className="text-sm text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                      {orderedCompleted.length}
                    </span>
                  </div>
                  {showCompletedOrdered ? <ChevronUp className="w-5 h-5 text-slate-600" /> : <ChevronDown className="w-5 h-5 text-slate-600" />}
                </button>
                {showCompletedOrdered && orderedCompleted.length > 0 &&
                <div data-ev-id="ev_72d24d0906" className="p-3 flex flex-col gap-2 bg-white">
                    {orderedCompleted.map((order) => {
                    const collectiveInfo = getCollectiveOrderInfo(order);
                    return (
                      <OrderCard
                        key={order.id}
                        order={order}
                        belowMinOrderValue={isOrderBelowMinOrderValue(order)}
                        isCollectiveOrder={collectiveInfo?.isCollective ?? false}
                        collectiveOrderCount={collectiveInfo ? collectiveInfo.otherOrders.length + 1 : 0}
                        voteSummary={voteSummaries[order.id]}
                        onCollectiveOrderClick={() => {
                          if (collectiveInfo) {
                            setCollectiveOrderInfo({ order, ...collectiveInfo });
                          }
                        }} />);


                  })}
                  </div>
                }
                {showCompletedOrdered && orderedCompleted.length === 0 &&
                <div data-ev-id="ev_e4fd60b824" className="p-4 text-center text-muted-foreground text-sm">
                    Keine abgeschlossenen Bestellungen
                  </div>
                }
              </div>
            </div> :
            getActiveOrders().length === 0 && openProblemReports.length === 0 ?
            <div data-ev-id="ev_4227edda81" className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p data-ev-id="ev_da8c9db08c">Keine offenen Aufgaben</p>
            </div> :

            <div data-ev-id="ev_f69866a0b4" className="flex flex-col gap-3">
              {/* Problemberichte für Admin/Kommandant */}
              {activeTab === 'pending' && openProblemReports.length > 0 &&
              <div data-ev-id="ev_0c424d8673" className="mb-4 bg-card rounded-xl border border-border overflow-hidden">
                  <div data-ev-id="ev_388e8b65b3" className="p-3 bg-red-50 border-b border-border flex items-center justify-between">
                    <div data-ev-id="ev_137d47005e" className="flex items-center gap-2">
                      <div data-ev-id="ev_33a2c4c38c" className="p-1.5 bg-red-600 rounded-lg">
                        <Bug className="w-4 h-4 text-white" />
                      </div>
                      <span data-ev-id="ev_3bb3910e1b" className="font-medium text-foreground">Offene Problemmeldungen</span>
                      <span data-ev-id="ev_972977ad97" className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full font-bold">
                        {openProblemReports.length}
                      </span>
                    </div>
                    <Link
                    to="/einstellungen?section=probleme"
                    className="text-xs text-red-600 hover:underline flex items-center gap-1 font-medium">
                      Alle anzeigen
                    </Link>
                  </div>
                  <div data-ev-id="ev_2636b1a645" className="divide-y divide-border">
                    {openProblemReports.map((problem: ProblemReport) =>
                  <Link
                    key={problem.id}
                    to={`/einstellungen?section=probleme&problemId=${problem.id}`}
                    className="p-3 hover:bg-muted/50 transition-colors flex items-start justify-between gap-3 block">
                        <div data-ev-id="ev_9bb9521948" className="flex-1 min-w-0">
                          <div data-ev-id="ev_f829bb9811" className="flex items-center gap-2 mb-1">
                            <span data-ev-id="ev_9a9cc2fa2a" className={`px-2 py-0.5 rounded text-xs font-medium ${
                        problem.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        problem.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        problem.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'}`
                        }>
                              {problem.severity === 'critical' ? 'Kritisch' :
                          problem.severity === 'high' ? 'Hoch' :
                          problem.severity === 'medium' ? 'Mittel' : 'Niedrig'}
                            </span>
                            <span data-ev-id="ev_67f9f92629" className={`px-2 py-0.5 rounded text-xs font-medium ${
                        problem.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`
                        }>
                              {problem.status === 'open' ? 'Offen' : 'In Bearbeitung'}
                            </span>
                          </div>
                          <h3 data-ev-id="ev_b51467b283" className="font-medium text-foreground truncate">{problem.title}</h3>
                          <p data-ev-id="ev_62a88b89b6" className="text-sm text-muted-foreground truncate">
                            {problem.category} • {new Date(problem.created_at).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                      </Link>
                  )}
                  </div>
                </div>
              }
              {getActiveOrders().map((order) => {
                const collectiveInfo = getCollectiveOrderInfo(order);
                return (
                  <div data-ev-id="ev_04990fe32d"
                  key={order.id}
                  className={`p-4 rounded-lg border transition-all ${
                  isOrderBlockedByMinOrder(order) ?
                  'bg-red-50 border-red-300 ring-2 ring-red-500' :
                  `border-border ${getRowBackgroundColor(order.status, order.requires_kommandant_approval)}`}`
                  }>
              {/* Header: Titel + Betrag */}
              <div data-ev-id="ev_f7a25b1fd6" className="flex flex-col gap-3">
                <div data-ev-id="ev_e07f352d87" className="flex items-start justify-between gap-4">
                  <Link to={`/bestellungen/${order.id}`} className="hover:text-primary transition-colors flex-1 min-w-0">
                    <h3 data-ev-id="ev_ed1b963f8b" className="font-semibold text-foreground truncate">{order.title}</h3>
                  </Link>
                  <span data-ev-id="ev_a60ae1a0a2" className="text-lg font-semibold text-foreground whitespace-nowrap">
                    {formatCurrency(order.amount)}
                  </span>
                </div>
                
                {/* Beschreibung */}
                {order.description &&
                      <p data-ev-id="ev_4d174b072a" className="text-sm text-muted-foreground line-clamp-2">{order.description}</p>
                      }
                
                {/* PFLICHTINFOS - Status | Workflow | Bereichsleiter | Rechnungsempfänger */}
                <div data-ev-id="ev_3f9c28ae3d" className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {/* 1. Status - immer zuerst, wichtigste Info */}
                  <StatusBadge status={order.status} belowMinOrderValue={isOrderBelowMinOrderValue(order)} />
                  
                  {/* 2. Workflow-Status - wer muss als nächstes handeln */}
                  <WorkflowBadge order={order} profiles={profiles} escalationTimeoutHours={escalationTimeoutHours} voteSummary={voteSummaries[order.id]} compact={false} />
                  
                  {/* Trennlinie auf Desktop */}
                  {(order.bereichsleiter_id || order.invoice_to) &&
                        <span data-ev-id="ev_9ea4712a06" className="hidden md:block h-5 w-px bg-border" />
                        }
                  
                  {/* 2. Bereichsleiter - wer ist verantwortlich */}
                  {order.bereichsleiter_id && getBereichsleiterName(order.bereichsleiter_id) &&
                        <span data-ev-id="ev_74a8446188" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span data-ev-id="ev_7f2be39a01" className="font-medium text-foreground">{getBereichsleiterName(order.bereichsleiter_id)}</span>
                    </span>
                        }
                  
                  {/* 3. Rechnungsempfänger - Abrechnungsinfo */}
                  {order.invoice_to &&
                        <span data-ev-id="ev_5a0dbaf9df" className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                        order.invoice_to === 'gemeinde' ?
                        'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-orange-50 text-orange-700 border border-orange-200'}`
                        }>
                      <Receipt className="w-3.5 h-3.5" />
                      {order.invoice_to === 'gemeinde' ? 'Gemeinde' : 'Feuerwehr'}
                    </span>
                        }
                </div>
                
                {/* WARNUNGEN - Nur wenn vorhanden, auffällig gestaltet */}
                {isOrderBelowMinOrderValue(order) &&
                      <div data-ev-id="ev_da3560ad76" className="flex flex-wrap items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    {canManageMinOrderOverride && order.supplier_id ?
                        <button data-ev-id="ev_9af3557d33"
                        onClick={(e) => {e.preventDefault();e.stopPropagation();setMinOrderInfoOrder(order);}}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        allowBelowMinOrderSuppliers.has(order.supplier_id) ?
                        'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200' :
                        'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'}`
                        }>

                        {allowBelowMinOrderSuppliers.has(order.supplier_id) ?
                          <><CheckCircle className="w-4 h-4" /> Freigabe erteilt</> :
                          <><AlertTriangle className="w-4 h-4" /> Unter Mindestbestellwert</>}
                      </button> :

                        <span data-ev-id="ev_d25b6f1221" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-xs font-medium">
                        <AlertTriangle className="w-4 h-4" />
                        Unter Mindestbestellwert
                        {order.supplier?.minimum_order_value &&
                          <span data-ev-id="ev_117db7568e" className="text-amber-600">({formatCurrency(order.supplier.minimum_order_value)})</span>
                          }
                      </span>
                        }
                  </div>
                      }
                
                {/* ZUSATZINFOS - Dezent, sekundär */}
                <div data-ev-id="ev_47b19fe5e7" className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                  <span data-ev-id="ev_86b021bd77" className="inline-flex items-center gap-1 whitespace-nowrap">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(order.created_at)}
                  </span>
                  {order.creator &&
                        <span data-ev-id="ev_f5af7cec28" className="inline-flex items-center gap-1 whitespace-nowrap">
                      <User className="w-3.5 h-3.5" />
                      {order.creator.full_name || order.creator.email}
                    </span>
                        }
                  {order.supplier &&
                        <span data-ev-id="ev_fa42bc757e" className="inline-flex items-center gap-1 whitespace-nowrap">
                      <Building2 className="w-3.5 h-3.5" />
                      {order.supplier.name}
                    </span>
                        }
                  {collectiveInfo?.isCollective &&
                        <button data-ev-id="ev_2184a06423"
                        onClick={(e) => {e.preventDefault();e.stopPropagation();setCollectiveOrderInfo({ order, ...collectiveInfo });}}
                        className="inline-flex items-center gap-1 whitespace-nowrap text-blue-600 hover:text-blue-700 transition-colors">

                      <Layers className="w-3.5 h-3.5" />
                      Sammelbestellung ({collectiveInfo.otherOrders.length + 1})
                    </button>
                        }
                  {order.supplier?.minimum_order_value && order.supplier.minimum_order_value > 0 && !isOrderBelowMinOrderValue(order) &&
                        <span data-ev-id="ev_9f805d9aef" className="inline-flex items-center gap-1 whitespace-nowrap text-slate-500">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Min: {formatCurrency(order.supplier.minimum_order_value)}
                    </span>
                        }
                  {order.supplier?.order_days && order.supplier.order_days.length > 0 &&
                        <span data-ev-id="ev_10ed05e598" className="inline-flex items-center gap-1 whitespace-nowrap text-purple-600">
                      <Clock className="w-3.5 h-3.5" />
                      {order.supplier.order_days.map((day) => ORDER_DAY_OPTIONS.find((d) => d.id === day)?.label?.slice(0, 2) || day.slice(0, 2)).join(', ')}
                    </span>
                        }
                </div>
                
                {/* Aktions-Buttons */}
                <div data-ev-id="ev_f110e25bf1" className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/50">
                  {/* Primäre Aktionen: Freigeben & Ablehnen */}
                  {canApproveOrder(order) && !(activeTab === 'waiting' && effectiveIsKommandant && order.status === 'eingereicht') &&
                        <div data-ev-id="ev_d917655b45" className="flex items-center gap-2">
                      <button data-ev-id="ev_823950d9d4"
                          onClick={() => handleApprove(order)}
                          disabled={approvingId === order.id}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm">

                        {approvingId === order.id ? <span data-ev-id="ev_2a5e1f0a20" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Freigeben
                      </button>
                      <button data-ev-id="ev_7c0c3a974f"
                          onClick={() => setRejectingOrder(order)}
                          className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-300 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors shadow-sm">

                        <XCircle className="w-4 h-4" />
                        Ablehnen
                      </button>
                    </div>
                        }
                  
                  {/* Direkte Freigabe/Ablehnung für Kommandant */}
                  {activeTab === 'waiting' && effectiveIsKommandant && order.status === 'eingereicht' &&
                        <div data-ev-id="ev_e16e2ddc92" className="flex items-center gap-2">
                      <button data-ev-id="ev_7b5b94bc37"
                          onClick={() => handleApproveDirectByKommandant(order)}
                          disabled={approvingDirectId === order.id}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm">

                        {approvingDirectId === order.id ? <span data-ev-id="ev_fcca2ce856" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Freigeben
                      </button>
                      <button data-ev-id="ev_d3992d4639"
                          onClick={() => setRejectingOrder(order)}
                          className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-300 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors shadow-sm">

                        <XCircle className="w-4 h-4" />
                        Ablehnen
                      </button>
                    </div>
                        }
                  
                  {/* Sekundäre Aktionen: Archivieren */}
                  {canMarkOrder(order) && (order.status === 'genehmigt' || order.status === 'freigegeben_kommandant' || order.status === 'abgelehnt') && !order.is_archived &&
                        <button data-ev-id="ev_144ab1b6bb"
                        onClick={() => handleArchiveOrder(order.id)}
                        disabled={processingOrderId === order.id}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors disabled:opacity-50">

                      {processingOrderId === order.id ? <span data-ev-id="ev_94d910b4ad" className="w-4 h-4 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" /> : <Archive className="w-4 h-4" />}
                      Archivieren
                    </button>
                        }
                  
                  {/* Spacer auf Desktop */}
                  <div data-ev-id="ev_74a501db70" className="hidden md:block flex-1" />
                  
                  {/* Gefährliche Aktion: Löschen (weniger prominent) */}
                  {canDeleteOrder &&
                        <button data-ev-id="ev_4994a65783"
                        onClick={() => setDeletingOrder(order)}
                        className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors">

                      <Trash2 className="w-4 h-4" />
                      <span data-ev-id="ev_1253f7a4e7" className="hidden sm:inline">Löschen</span>
                    </button>
                        }
                </div>
              </div>
              
              {/* Status Messages */}
              {(order.order_executed || order.order_received) &&
                    <div data-ev-id="ev_c7bb2c9b10" className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-3">
                  {order.order_executed &&
                      <span data-ev-id="ev_29ff3a4bc3" className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      <Package className="w-3.5 h-3.5" />
                      Bestellung ausgelöst
                      {order.order_executed_at && <span data-ev-id="ev_dd22713e76" className="text-blue-500">• {formatDateTime(order.order_executed_at)}</span>}
                    </span>
                      }
                  {order.order_received &&
                      <span data-ev-id="ev_aeedb1aee1" className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      <PackageCheck className="w-3.5 h-3.5" />
                      Ware erhalten
                      {order.order_received_at && <span data-ev-id="ev_a0344ef801" className="text-green-500">• {formatDateTime(order.order_received_at)}</span>}
                    </span>
                      }
                </div>
                    }
            </div>);

              })}
            </div>
            }
        </div>
      </div>

      {/* Meine Bestellungen (Entwürfe und Eingereichte) */}
      {effectiveMyOrders.length > 0 &&
        <div data-ev-id="ev_4de7c017da" className="mt-6">
          <button data-ev-id="ev_4617358a6b"
          onClick={() => setShowMyOrders(!showMyOrders)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4">

            {showMyOrders ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            <FileText className="w-5 h-5" />
            <span data-ev-id="ev_d865e01ade" className="font-medium">
              Meine Bestellungen ({effectiveMyOrders.length})
            </span>
          </button>

          {showMyOrders &&
          <div data-ev-id="ev_99c10c70af" className="bg-card rounded-xl border border-border">
              <div data-ev-id="ev_5fa5131d32" className="p-4 border-b border-border bg-gray-50">
                <h2 data-ev-id="ev_f0bb9b3a92" className="font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-500" />
                  Meine Bestellungen (Entwürfe & Eingereichte)
                </h2>
              </div>
              <div data-ev-id="ev_89809cc3e5" className="p-4">
                <div data-ev-id="ev_e762f87195" className="flex flex-col gap-3">
                  {effectiveMyOrders.map((order) => {
                  const collectiveInfo = getCollectiveOrderInfo(order);
                  return (
                    <OrderCard
                      key={order.id}
                      order={order}
                      belowMinOrderValue={isOrderBelowMinOrderValue(order)}
                      isCollectiveOrder={collectiveInfo?.isCollective ?? false}
                      collectiveOrderCount={collectiveInfo ? collectiveInfo.otherOrders.length + 1 : 0}
                      voteSummary={voteSummaries[order.id]}
                      onCollectiveOrderClick={() => {
                        if (collectiveInfo) {
                          setCollectiveOrderInfo({ order, ...collectiveInfo });
                        }
                      }} />);


                })}
                </div>
              </div>
            </div>
          }
        </div>
        }

      {/* Abgeschlossene Bestellungen */}
      {completedOrders.length > 0 &&
        <div data-ev-id="ev_5aae779bc5" className="mt-8">
          <button data-ev-id="ev_b67933effb"
          onClick={() => setShowCompleted(!showCompleted)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4">

            {showCompleted ? <EyeOff className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
            <span data-ev-id="ev_0b3b997fce" className="font-medium">
              {showCompleted ? 'Archiv ausblenden' : 'Archivieren'} ({completedOrders.length})
            </span>
          </button>

          {showCompleted &&
          <div data-ev-id="ev_0cd9ad82f6" className="bg-card rounded-xl border border-border">
              <div data-ev-id="ev_4d8cd2f8f2" className="p-4 border-b border-border bg-slate-50">
                <h2 data-ev-id="ev_ef36bfc305" className="font-semibold text-foreground flex items-center gap-2">
                  <Archive className="w-5 h-5 text-slate-500" />
                  Abgeschlossene Bestellungen
                </h2>
              </div>
              <div data-ev-id="ev_f78b1673f3" className="p-4">
                <div data-ev-id="ev_dd21d1e605" className="flex flex-col gap-3">
                  {completedOrders.map((order) => {
                  const collectiveInfo = getCollectiveOrderInfo(order);
                  return (
                    <OrderCard
                      key={order.id}
                      order={order}
                      belowMinOrderValue={isOrderBelowMinOrderValue(order)}
                      isCollectiveOrder={collectiveInfo?.isCollective ?? false}
                      collectiveOrderCount={collectiveInfo ? collectiveInfo.otherOrders.length + 1 : 0}
                      voteSummary={voteSummaries[order.id]}
                      onCollectiveOrderClick={() => {
                        if (collectiveInfo) {
                          setCollectiveOrderInfo({ order, ...collectiveInfo });
                        }
                      }} />);


                })}
                </div>
              </div>
            </div>
          }
        </div>
        }
        </>
      }

      {/* Modal: Bestellung ablehnen */}
      {rejectingOrder &&
      <div data-ev-id="ev_ed535537a3" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div data-ev-id="ev_8764fc3727" className="bg-card rounded-xl border border-border p-6 w-full max-w-md">
            <div data-ev-id="ev_5bac918e83" className="flex items-center justify-between mb-4">
              <div data-ev-id="ev_9855f24255" className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-red-600" />
                <h3 data-ev-id="ev_1edf539ce7" className="text-lg font-semibold text-foreground">Bestellung ablehnen</h3>
              </div>
              <button data-ev-id="ev_ef4e96a458"
            onClick={() => {
              setRejectingOrder(null);
              setRejectReason('');
            }}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">

                <X className="w-5 h-5" />
              </button>
            </div>

            <div data-ev-id="ev_729dc845aa" className="mb-4 p-3 bg-muted rounded-lg">
              <p data-ev-id="ev_682d34e0be" className="font-medium text-foreground">{rejectingOrder.title}</p>
              <p data-ev-id="ev_f172f3e763" className="text-sm text-muted-foreground mt-1">
                Betrag: {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(rejectingOrder.amount)}
              </p>
            </div>

            <div data-ev-id="ev_edee5ec903" className="mb-4">
              <label data-ev-id="ev_580edf2804" className="block text-sm font-medium text-foreground mb-1.5">
                Ablehnungsgrund *
              </label>
              <textarea data-ev-id="ev_f79dd5402a"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Bitte geben Sie einen Grund für die Ablehnung an..."
            rows={3}
            className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            required />

            </div>

            <div data-ev-id="ev_1d8dcfdfe4" className="flex gap-3">
              <button data-ev-id="ev_501cbfbbd5"
            onClick={() => {
              setRejectingOrder(null);
              setRejectReason('');
            }}
            className="flex-1 px-4 py-2.5 border border-input rounded-lg font-medium hover:bg-muted transition-colors">

                Abbrechen
              </button>
              <button data-ev-id="ev_d194dca3d5"
            onClick={handleReject}
            disabled={rejectLoading || !rejectReason.trim()}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">

                {rejectLoading ?
              <span data-ev-id="ev_032cfafc11" className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :

              <>
                    <XCircle className="w-5 h-5" />
                    Ablehnen
                  </>
              }
              </button>
            </div>
          </div>
        </div>
      }

      {/* Modal: Bestellung löschen */}
      {deletingOrder &&
      <div data-ev-id="ev_delete_modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div data-ev-id="ev_delete_modal_content" className="bg-card rounded-xl border border-border p-6 w-full max-w-md">
            <div data-ev-id="ev_delete_modal_header" className="flex items-center justify-between mb-4">
              <div data-ev-id="ev_delete_modal_title_row" className="flex items-center gap-3">
                <div data-ev-id="ev_delete_modal_icon" className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h3 data-ev-id="ev_delete_modal_title" className="text-lg font-semibold text-foreground">Bestellung löschen</h3>
              </div>
              <button data-ev-id="ev_delete_modal_close"
            onClick={() => setDeletingOrder(null)}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div data-ev-id="ev_delete_modal_warning" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p data-ev-id="ev_delete_modal_warning_text" className="text-sm text-red-700 font-medium">
                ⚠️ Achtung: Diese Aktion kann nicht rückgängig gemacht werden!
              </p>
            </div>

            <div data-ev-id="ev_delete_modal_details" className="mb-4 p-4 bg-muted rounded-lg">
              <h4 data-ev-id="ev_delete_modal_details_title" className="font-semibold text-foreground mb-2">Bestellungsdetails:</h4>
              <div data-ev-id="ev_delete_modal_details_list" className="flex flex-col gap-2 text-sm">
                <p data-ev-id="ev_delete_modal_title_detail">
                  <span data-ev-id="ev_6afac03c1b" className="text-muted-foreground">Titel:</span>{' '}
                  <span data-ev-id="ev_32b692a02b" className="font-medium text-foreground">{deletingOrder.title}</span>
                </p>
                <p data-ev-id="ev_delete_modal_amount_detail">
                  <span data-ev-id="ev_52fbb780b1" className="text-muted-foreground">Betrag:</span>{' '}
                  <span data-ev-id="ev_816fa0e7f0" className="font-medium text-foreground">{formatCurrency(deletingOrder.amount)}</span>
                </p>
                <p data-ev-id="ev_delete_modal_status_detail">
                  <span data-ev-id="ev_8226b1e165" className="text-muted-foreground">Status:</span>{' '}
                  <StatusBadge status={deletingOrder.status} belowMinOrderValue={isOrderBelowMinOrderValue(deletingOrder)} />
                </p>
                <p data-ev-id="ev_delete_modal_date_detail">
                  <span data-ev-id="ev_cfa37227dd" className="text-muted-foreground">Erstellt am:</span>{' '}
                  <span data-ev-id="ev_6d8c3431f5" className="font-medium text-foreground">{formatDate(deletingOrder.created_at)}</span>
                </p>
                {deletingOrder.creator &&
              <p data-ev-id="ev_delete_modal_creator_detail">
                    <span data-ev-id="ev_658a92d2db" className="text-muted-foreground">Erstellt von:</span>{' '}
                    <span data-ev-id="ev_3fb846ff94" className="font-medium text-foreground">{deletingOrder.creator.full_name || deletingOrder.creator.email}</span>
                  </p>
              }
              </div>
            </div>

            <p data-ev-id="ev_delete_modal_confirm_text" className="text-sm text-muted-foreground mb-4">
              Alle zugehörigen Daten (Verlauf, Anhänge, Abstimmungen) werden ebenfalls gelöscht.
            </p>

            <div data-ev-id="ev_delete_modal_actions" className="flex gap-3">
              <button data-ev-id="ev_delete_modal_cancel"
            onClick={() => setDeletingOrder(null)}
            className="flex-1 px-4 py-2.5 border border-input rounded-lg font-medium hover:bg-muted transition-colors">
                Abbrechen
              </button>
              <button data-ev-id="ev_delete_modal_confirm"
            onClick={handleDeleteOrder}
            disabled={deleteLoading}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {deleteLoading ?
              <span data-ev-id="ev_delete_modal_spinner" className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
              <>
                    <Trash2 className="w-5 h-5" />
                    Endgültig löschen
                  </>
              }
              </button>
            </div>
          </div>
        </div>
      }

      {/* Modal: Bestellung freigeben - Rechnungsempfänger */}
      {approvingOrder &&
      <div data-ev-id="ev_6265af2d19" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div data-ev-id="ev_8029b894c9" className="bg-card rounded-xl border border-border p-6 w-full max-w-md">
            <div data-ev-id="ev_054c9726a0" className="flex items-center justify-between mb-4">
              <div data-ev-id="ev_f2f93b99a7" className="flex items-center gap-3">
                <div data-ev-id="ev_1c89f4937d" className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <h3 data-ev-id="ev_538a6f5648" className="text-lg font-semibold text-foreground">Bestellung freigeben</h3>
              </div>
              <button data-ev-id="ev_2660fa0cfa"
            onClick={() => setApprovingOrder(null)}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">

                <X className="w-5 h-5" />
              </button>
            </div>

            <div data-ev-id="ev_75e7a914c2" className="mb-4 p-3 bg-muted rounded-lg">
              <p data-ev-id="ev_d5e94d5609" className="font-medium text-foreground">{approvingOrder.title}</p>
              <p data-ev-id="ev_2b949d519c" className="text-sm text-muted-foreground mt-1">
                Betrag: {formatCurrency(approvingOrder.amount)}
              </p>
            </div>

            <p data-ev-id="ev_6f4ee3297f" className="text-muted-foreground mb-4">
              Bitte wählen Sie, an wen die Rechnung gehen soll:
            </p>

            <div data-ev-id="ev_4c68bd7a4d" className="flex flex-col gap-3 mb-6">
              <label data-ev-id="ev_1436c58f2e" className="flex items-center gap-3 p-4 border border-input rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <input data-ev-id="ev_bcbd394f38"
              type="radio"
              name="invoiceTo"
              value="feuerwehr"
              checked={selectedInvoiceTo === 'feuerwehr'}
              onChange={() => setSelectedInvoiceTo('feuerwehr')}
              className="w-4 h-4 text-primary" />

                <div data-ev-id="ev_9a5b579cee" className="flex-1">
                  <span data-ev-id="ev_54b53b84ab" className="font-medium text-foreground">Feuerwehr</span>
                  <p data-ev-id="ev_d0d553d876" className="text-sm text-muted-foreground">Rechnung geht an die Feuerwehr</p>
                </div>
              </label>

              <label data-ev-id="ev_c568dec686" className="flex items-center gap-3 p-4 border border-input rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <input data-ev-id="ev_88aff3210a"
              type="radio"
              name="invoiceTo"
              value="gemeinde"
              checked={selectedInvoiceTo === 'gemeinde'}
              onChange={() => setSelectedInvoiceTo('gemeinde')}
              className="w-4 h-4 text-primary" />

                <div data-ev-id="ev_037ec2579d" className="flex-1">
                  <span data-ev-id="ev_7425aaa715" className="font-medium text-foreground">Gemeinde</span>
                  <p data-ev-id="ev_435517e6cb" className="text-sm text-muted-foreground">Rechnung geht an die Gemeinde</p>
                </div>
              </label>
            </div>

            {/* Mindestbestellwert Warnung */}
            {approvingOrder && isOrderBelowMinOrderValue(approvingOrder) && (() => {
            const supplier = suppliers.find((s) => s.id === approvingOrder.supplier_id);
            const supplierTotal = suppliersBelowMinimum.has(approvingOrder.supplier_id || '') ?
            orders.filter((o) => (o.status === 'genehmigt' || o.status === 'eingereicht' || o.status === 'ausstehend_bereichsleitung' || o.status === 'ausstehend_kommandant' || o.status === 'freigegeben_bereichsleitung' || o.status === 'freigegeben_kommandant') && o.supplier_id === approvingOrder.supplier_id).reduce((sum, o) => sum + o.amount, 0) : 0;
            return (
              <div data-ev-id="ev_0f215d785c" className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div data-ev-id="ev_4d1995e3df" className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div data-ev-id="ev_c75d63ebbd" className="flex-1">
                      <p data-ev-id="ev_401b905ba8" className="text-sm font-medium text-amber-800">Mindestbestellwert nicht erreicht</p>
                      <p data-ev-id="ev_77e08bfe1a" className="text-sm text-amber-700 mt-1">
                        Lieferant: {supplier?.name || 'Unbekannt'}<br data-ev-id="ev_fd524f316b" />
                        Aktuelle Summe: {supplierTotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €<br data-ev-id="ev_d977df9173" />
                        Mindestbestellwert: {supplier?.minimum_order_value?.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                      </p>
                      <label data-ev-id="ev_4da895c3f3" className="flex items-center gap-2 mt-3 cursor-pointer">
                        <input data-ev-id="ev_fb5844664b"
                      type="checkbox"
                      checked={allowBelowMinOrder}
                      onChange={(e) => setAllowBelowMinOrder(e.target.checked)}
                      className="w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500" />

                        <span data-ev-id="ev_ceb8a6bd34" className="text-sm font-medium text-amber-800">Unter Mindestbestellwert bestellen erlauben</span>
                      </label>
                    </div>
                  </div>
                </div>);

          })()}

            <div data-ev-id="ev_7db1ecd6ab" className="flex gap-3">
              <button data-ev-id="ev_86167c58e5"
            onClick={() => setApprovingOrder(null)}
            className="flex-1 px-4 py-2.5 border border-input rounded-lg font-medium hover:bg-muted transition-colors">

                Abbrechen
              </button>
              <button data-ev-id="ev_bb33c50c50"
            onClick={handleConfirmApprove}
            disabled={approveLoading}
            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">

                {approveLoading ?
              <span data-ev-id="ev_980b06e7b3" className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :

              <>
                    <CheckCircle className="w-5 h-5" />
                    Freigeben
                  </>
              }
              </button>
            </div>
          </div>
        </div>
      }

      {/* Nachricht senden Modal */}
      {showMessageModal &&
      <div data-ev-id="ev_3f49ed3eee" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div data-ev-id="ev_c1d61a420d" className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Gradient Header */}
            <div data-ev-id="ev_a81e9abbd0" className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 px-6 py-5">
              <div data-ev-id="ev_f4b2ee5bf1" className="flex items-center justify-between">
                <div data-ev-id="ev_2b10919c2b" className="flex items-center gap-3">
                  <div data-ev-id="ev_63af89da43" className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Send className="w-6 h-6 text-white" />
                  </div>
                  <div data-ev-id="ev_eb229241c8">
                    <h2 data-ev-id="ev_f315e79c3f" className="text-xl font-bold text-white">Neue Nachricht</h2>
                    <p data-ev-id="ev_8262301ada" className="text-white/70 text-sm">Sende eine Nachricht an dein Team</p>
                  </div>
                </div>
                <button data-ev-id="ev_62248c45ad"
              onClick={() => {
                setShowMessageModal(false);
                setMessageSubject('');
                setMessageText('');
                setSelectedRecipients([]);
              }}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div data-ev-id="ev_53df58a25d" className="flex-1 overflow-y-auto p-6">
              {/* Erfolg Meldung */}
              {messageSent &&
            <div data-ev-id="ev_0ebb6cb09a" className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700">
                  <div data-ev-id="ev_8eddcf35ba" className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div data-ev-id="ev_d612023495">
                    <p data-ev-id="ev_45ef18ac59" className="font-medium">Nachricht gesendet!</p>
                    <p data-ev-id="ev_f6f3189bc2" className="text-sm text-green-600">Alle Empfänger wurden erfolgreich benachrichtigt.</p>
                  </div>
                </div>
            }

              {/* Betreff */}
              <div data-ev-id="ev_d52b6fdfda" className="mb-5">
                <label data-ev-id="ev_86251ce4dd" className="text-sm font-semibold text-foreground block mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Betreff
                </label>
                <input data-ev-id="ev_b59a4f58d6"
              type="text"
              value={messageSubject}
              onChange={(e) => setMessageSubject(e.target.value)}
              placeholder="Worum geht es?"
              className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              disabled={sendingMessage} />

              </div>

              {/* Empfänger Auswahl */}
              <div data-ev-id="ev_a8644f9654" className="mb-5">
                <div data-ev-id="ev_53bdab4113" className="flex items-center justify-between mb-3">
                  <label data-ev-id="ev_d90e35a43e" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    Empfänger
                    {selectedRecipients.length > 0 &&
                  <span data-ev-id="ev_c954b6f40b" className="ml-2 px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">
                        {selectedRecipients.length}
                      </span>
                  }
                  </label>
                  <div data-ev-id="ev_cf8ceadb22" className="flex items-center gap-1">
                    <button data-ev-id="ev_c7eac296d4"
                  onClick={selectAllRecipients}
                  className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors">
                      Alle
                    </button>
                    <button data-ev-id="ev_5620281e58"
                  onClick={clearAllRecipients}
                  className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors">
                      Keine
                    </button>
                  </div>
                </div>

                {/* Schnellauswahl nach Rolle */}
                <div data-ev-id="ev_54a9ae7db4" className="flex flex-wrap gap-2 mb-3">
                  <button data-ev-id="ev_f860ef6a86"
                onClick={() => selectByRole('kommandant')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors border border-red-100">
                    <Shield className="w-3.5 h-3.5" />
                    Kommandanten
                  </button>
                  <button data-ev-id="ev_d59e53bb02"
                onClick={() => selectByFunction('kommandomitglied')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors border border-amber-100">
                    <Crown className="w-3.5 h-3.5" />
                    Kommandomitglieder
                  </button>
                  <button data-ev-id="ev_94c6f4518d"
                onClick={() => selectByRole('bereichsleiter')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100">
                    <Briefcase className="w-3.5 h-3.5" />
                    Bereichsleiter
                  </button>
                  <button data-ev-id="ev_196704eb00"
                onClick={() => selectByRole('mitglied')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                    <User className="w-3.5 h-3.5" />
                    Mitglieder
                  </button>
                </div>

                {/* Empfänger Liste */}
                <div data-ev-id="ev_5e39ff1420" className="bg-muted/30 rounded-xl border border-border overflow-hidden">
                  <div data-ev-id="ev_2358c12a88" className="max-h-56 overflow-y-auto">
                    <div data-ev-id="ev_e7967d96bb" className="divide-y divide-border">
                      {profiles.filter((p) => p.id !== effectiveUserId).map((recipient) => {
                      const isSelected = selectedRecipients.includes(recipient.id);
                      const initials = recipient.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '?';
                      const isOnline = onlineUsers.some((ou) => ou.user_id === recipient.id);

                      return (
                        <label data-ev-id="ev_3e4f70d165"
                        key={recipient.id}
                        className={`flex items-center gap-3 p-3 cursor-pointer transition-all hover:bg-muted/50 ${
                        isSelected ? 'bg-primary/5' : ''}`
                        }>
                            <div data-ev-id="ev_85348e9a2c" className="relative">
                              <input data-ev-id="ev_295cbbf906"
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRecipient(recipient.id)}
                            className="sr-only" />

                              <div data-ev-id="ev_8fa7c21bc2" className={`w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm transition-all ${
                            isSelected ?
                            'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' :
                            'bg-gradient-to-br from-muted to-muted/50 text-muted-foreground'}`
                            }>
                                {isSelected ? <Check className="w-5 h-5" /> : initials}
                              </div>
                              {isOnline &&
                            <div data-ev-id="ev_12fa3aaf44" className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-card rounded-full" />
                            }
                            </div>
                            <div data-ev-id="ev_693db33ec2" className="flex-1 min-w-0">
                              <div data-ev-id="ev_e3222a2060" className="flex items-center gap-2">
                                <span data-ev-id="ev_83c4c21b86" className={`font-medium text-sm truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                  {recipient.full_name || 'Unbekannt'}
                                </span>
                                {isOnline &&
                              <span data-ev-id="ev_fb6d7f239f" className="px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 rounded">
                                    ONLINE
                                  </span>
                              }
                              </div>
                              <p data-ev-id="ev_f4bdcc75a0" className="text-xs text-muted-foreground truncate">{recipient.email}</p>
                            </div>
                            {recipient.role &&
                          <span data-ev-id="ev_1ee3139655" className={`px-2 py-1 text-xs font-medium rounded-lg flex-shrink-0 ${
                          recipient.role === 'kommandant' ? 'bg-red-100 text-red-700' :
                          recipient.role === 'bereichsleiter' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'}`
                          }>
                                {recipient.role === 'kommandant' ? 'Kdt' :
                            recipient.role === 'bereichsleiter' ? 'BL' : 'Mitglied'}
                              </span>
                          }
                          </label>);

                    })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Nachricht */}
              <div data-ev-id="ev_6bda4cfc4c" className="mb-5">
                <label data-ev-id="ev_f472b18d40" className="text-sm font-semibold text-foreground block mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  Nachricht
                </label>
                <textarea data-ev-id="ev_283287ab14"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Schreibe deine Nachricht..."
              className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
              rows={4}
              disabled={sendingMessage} />

              </div>

              {/* E-Mail Option */}
              <label data-ev-id="ev_4ab428ca28" className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100 cursor-pointer hover:border-blue-200 transition-colors">
                <div data-ev-id="ev_bf6806d6a5" className="relative">
                  <input data-ev-id="ev_77aff7f85d"
                type="checkbox"
                checked={sendAsEmail}
                onChange={(e) => setSendAsEmail(e.target.checked)}
                disabled={sendingMessage}
                className="sr-only" />

                  <div data-ev-id="ev_0e898070ec" className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                sendAsEmail ?
                'bg-blue-500 text-white' :
                'bg-blue-100 text-blue-600'}`
                }>
                    <Mail className="w-5 h-5" />
                  </div>
                </div>
                <div data-ev-id="ev_c96e4ab87f" className="flex-1">
                  <span data-ev-id="ev_79b4f20b42" className="text-sm font-semibold text-foreground">Auch als E-Mail versenden</span>
                  <p data-ev-id="ev_ec21660924" className="text-xs text-muted-foreground mt-0.5">
                    Empfänger erhalten eine E-Mail-Kopie, du erhältst CC
                  </p>
                </div>
                <div data-ev-id="ev_75bf59dd8f" className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
              sendAsEmail ? 'bg-blue-500' : 'bg-gray-200'}`
              }>
                  <div data-ev-id="ev_579331c2a3" className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                sendAsEmail ? 'translate-x-5' : 'translate-x-0'}`
                } />
                </div>
              </label>
            </div>

            {/* Footer Actions */}
            <div data-ev-id="ev_b3f6ee22e9" className="p-4 border-t border-border bg-muted/30 flex gap-3">
              <button data-ev-id="ev_d6dc07bb60"
            onClick={() => {
              setShowMessageModal(false);
              setMessageSubject('');
              setMessageText('');
              setSelectedRecipients([]);
            }}
            className="flex-1 px-4 py-3 border border-input rounded-xl font-medium hover:bg-muted transition-colors">
                Abbrechen
              </button>
              <button data-ev-id="ev_b33622755d"
            onClick={sendMessageToUsers}
            disabled={sendingMessage || !messageText.trim() || !messageSubject.trim() || selectedRecipients.length === 0}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl font-semibold hover:from-primary/95 hover:to-primary/85 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                {sendingMessage ?
              <span data-ev-id="ev_4d5ba60d52" className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> :

              <>
                    <Send className="w-5 h-5" />
                    Nachricht senden
                  </>
              }
              </button>
            </div>
          </div>
        </div>
      }

      {/* Nachrichten Archiv Modal - Chat Style */}
      {showMessageArchive &&
      <div data-ev-id="ev_e75faf82db" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div data-ev-id="ev_93503b4a4e" className="bg-card rounded-xl border border-border w-full max-w-2xl h-[85vh] overflow-hidden flex flex-col">
            {/* Loading state when key is set but conversation not loaded yet */}
            {selectedConversationKey && !selectedConversation ?
          <div data-ev-id="ev_b99b795099" className="flex flex-col items-center justify-center h-full p-8">
                <div data-ev-id="ev_233ffb2b1c" className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                <p data-ev-id="ev_cd0bcf95a7" className="text-muted-foreground">Konversation wird geladen...</p>
                <button data-ev-id="ev_d98e2fdcbd"
            onClick={() => {
              setSelectedConversationKey(null);
              setShowMessageArchive(false);
            }}
            className="mt-4 text-sm text-primary hover:underline">
                  Zurück zur Übersicht
                </button>
              </div> :
          selectedConversation ?
          <>
                {/* Chat Header */}
                <div data-ev-id="ev_c5f1e8e6c8" className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
                  <button data-ev-id="ev_409b834157"
              onClick={() => {
                setSelectedConversationKey(null);
                setReplyText('');
                setReplySent(false);
                setShowEmojiPicker(false);
              }}
              className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  </button>
                  <div data-ev-id="ev_0873a444c5" className="flex-1 min-w-0">
                    <div data-ev-id="ev_header_title_row" className="flex items-center gap-2">
                      <h2 data-ev-id="ev_575868e8cd" className="font-semibold text-foreground truncate">
                        {selectedConversation?.[0]?.subject || 'Kein Betreff'}
                      </h2>
                      {isConversationClosed() &&
                  <span data-ev-id="ev_closed_badge" className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                          <Lock className="w-3 h-3" />
                          Geschlossen
                        </span>
                  }
                    </div>
                    <p data-ev-id="ev_d12865ada8" className="text-xs text-muted-foreground truncate">
                      {(selectedConversation?.[0]?.original_recipients || []).
                  filter((id) => id !== effectiveUserId).
                  map((id) => profiles.find((p) => p.id === id)?.full_name || 'Unbekannt').
                  join(', ') || 'Keine weiteren Teilnehmer'}
                    </p>
                  </div>
                  
                  {/* Management Buttons */}
                  <div data-ev-id="ev_management_buttons" className="flex items-center gap-1">
                    {/* PDF Export - only for Kommandant/Admin */}
                    {(effectiveIsKommandant || effectiveIsAdmin) &&
                <button
                  data-ev-id="ev_pdf_export_btn"
                  onClick={exportConversationAsPdf}
                  disabled={exportingPdf}
                  className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                  title="Als PDF exportieren">
                      {exportingPdf ?
                  <span data-ev-id="ev_cdeb8b688c" className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin block" /> :
                  <FileDown className="w-5 h-5" />
                  }
                    </button>
                }
                    
                    {/* Close/Open Conversation - only for creator */}
                    {canManageConversation() && (
                isConversationClosed() ?
                <button
                  data-ev-id="ev_reopen_btn"
                  onClick={reopenConversation}
                  disabled={closingConversation}
                  className="p-2 hover:bg-green-100 rounded-lg transition-colors text-green-600 hover:text-green-700"
                  title="Konversation wieder öffnen">
                          {closingConversation ?
                  <span data-ev-id="ev_8564cb8c79" className="w-5 h-5 border-2 border-green-600/30 border-t-green-600 rounded-full animate-spin block" /> :
                  <Unlock className="w-5 h-5" />
                  }
                        </button> :
                <button
                  data-ev-id="ev_close_btn"
                  onClick={closeConversation}
                  disabled={closingConversation}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600 hover:text-red-700"
                  title="Konversation schließen">
                          {closingConversation ?
                  <span data-ev-id="ev_01910ecc04" className="w-5 h-5 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin block" /> :
                  <Lock className="w-5 h-5" />
                  }
                        </button>)
                }
                  </div>
                  
                  <button data-ev-id="ev_b23ed41aae"
              onClick={() => {
                setShowMessageArchive(false);
                setSelectedConversationKey(null);
                setReplyText('');
                setShowEmojiPicker(false);
              }}
              className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Legende */}
                <div data-ev-id="ev_chat_legend" className="px-4 py-2 border-b border-border bg-muted/30 flex flex-wrap items-center gap-4 text-xs">
                  <div data-ev-id="ev_legend_own" className="flex items-center gap-1.5">
                    <div data-ev-id="ev_legend_own_color" className="w-3 h-3 rounded-full bg-primary" />
                    <span data-ev-id="ev_5277a8c97c" className="text-muted-foreground">Deine Nachrichten</span>
                  </div>
                  <div data-ev-id="ev_legend_other" className="flex items-center gap-1.5">
                    <div data-ev-id="ev_legend_other_color" className="w-3 h-3 rounded-full bg-card border border-border" />
                    <span data-ev-id="ev_28d1e02202" className="text-muted-foreground">Empfangene Nachrichten</span>
                  </div>
                </div>

                {/* Chat Messages */}
                <div data-ev-id="ev_0f646053a7" className="flex-1 overflow-y-auto p-4 bg-muted/10">
                  <div data-ev-id="ev_6c846339c4" className="flex flex-col gap-3">
                    {selectedConversation.map((msg) => {
                  const isMyMessage = msg.sender_id === effectiveUserId;
                  const sender = profiles.find((p) => p.id === msg.sender_id);
                  return (
                    <div data-ev-id="ev_0588a92fe1"
                    key={msg.id}
                    className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                          <div data-ev-id="ev_e08d18a618" className={`max-w-[75%] ${isMyMessage ? 'order-2' : 'order-1'}`}>
                            {!isMyMessage &&
                        <p data-ev-id="ev_2318f66ee4" className="text-xs text-muted-foreground mb-1 ml-1">
                                {sender?.full_name || 'Unbekannt'}
                              </p>
                        }
                            <div data-ev-id="ev_daeacf3ea3" className={`rounded-2xl px-4 py-2.5 ${
                        isMyMessage ?
                        'bg-primary text-primary-foreground rounded-br-md' :
                        'bg-card border border-border rounded-bl-md'}`
                        }>
                              <p data-ev-id="ev_f03c13e6af" className={`text-sm whitespace-pre-wrap ${isMyMessage ? 'text-primary-foreground' : 'text-foreground'}`}>
                                {msg.message}
                              </p>
                            </div>
                            <p data-ev-id="ev_5a3edb95ad" className={`text-[10px] mt-1 ${isMyMessage ? 'text-right mr-1' : 'ml-1'} text-muted-foreground`}>
                              {new Date(msg.created_at).toLocaleTimeString('de-DE', {
                            hour: '2-digit', minute: '2-digit'
                          })}
                            </p>
                          </div>
                        </div>);

                })}
                    <div data-ev-id="ev_b9cbc9f568" ref={chatEndRef} />
                  </div>
                </div>

                {/* Chat Input */}
                <div data-ev-id="ev_786215d912" className="p-3 border-t border-border bg-card">
                  {isConversationClosed() ?
              <div data-ev-id="ev_closed_notice" className="flex items-center justify-center gap-2 py-3 text-muted-foreground bg-muted/50 rounded-lg">
                      <Lock className="w-4 h-4" />
                      <span data-ev-id="ev_c82499594f" className="text-sm">Diese Konversation ist geschlossen</span>
                      {canManageConversation() &&
                <button data-ev-id="ev_0e3c21c919"
                onClick={reopenConversation}
                disabled={closingConversation}
                className="ml-2 text-sm text-primary hover:underline">

                          Wieder öffnen
                        </button>
                }
                    </div> :

              <>
                      {replySent &&
                <div data-ev-id="ev_203c276479" className="mb-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Gesendet!
                        </div>
                }
                      
                      {/* Emoji Picker */}
                      {showEmojiPicker &&
                <div data-ev-id="ev_emoji_picker" className="mb-2 p-3 bg-muted/50 rounded-xl border border-border max-h-48 overflow-y-auto">
                          <div data-ev-id="ev_emoji_categories" className="flex flex-col gap-3">
                            {Object.entries(firefighterEmojis).map(([category, emojis]) =>
                    <div data-ev-id="ev_8d8f64c1f3" key={category}>
                                <p data-ev-id="ev_emoji_cat_label" className="text-xs font-medium text-muted-foreground mb-1.5">{category}</p>
                                <div data-ev-id="ev_emoji_grid" className="flex flex-wrap gap-1">
                                  {emojis.map((emoji, idx) =>
                        <button data-ev-id="ev_ce39417e61"
                        key={idx}
                        onClick={() => insertEmoji(emoji)}
                        className="w-8 h-8 flex items-center justify-center text-lg hover:bg-muted rounded transition-colors"
                        title={emoji}>

                                      {emoji}
                                    </button>
                        )}
                                </div>
                              </div>
                    )}
                          </div>
                        </div>
                }
                      
                      <div data-ev-id="ev_c531d84423" className="flex items-end gap-2">
                        <button
                    data-ev-id="ev_emoji_btn"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-2.5 rounded-full transition-colors flex-shrink-0 ${showEmojiPicker ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                    title="Emoji einfügen">

                          <Smile className="w-5 h-5" />
                        </button>
                        <div data-ev-id="ev_3e0f4e773f" className="flex-1">
                          <textarea
                      data-ev-id="ev_faf1177a24"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && replyText.trim()) {
                          e.preventDefault();
                          sendReplyToConversation();
                        }
                      }}
                      placeholder="Nachricht schreiben..."
                      className="w-full px-4 py-2.5 rounded-2xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm"
                      rows={1}
                      disabled={sendingReply} />

                        </div>
                        <button
                    data-ev-id="ev_1a2dbb1481"
                    onClick={sendReplyToConversation}
                    disabled={sendingReply || !replyText.trim()}
                    className="p-2.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">

                          {sendingReply ?
                    <span data-ev-id="ev_f0994d304d" className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin block" /> :

                    <Send className="w-5 h-5" />
                    }
                        </button>
                      </div>
                      <label data-ev-id="ev_cfe5ca10a5" className="flex items-center gap-2 mt-2 text-xs text-muted-foreground cursor-pointer">
                        <input
                    data-ev-id="ev_0807ba0483"
                    type="checkbox"
                    checked={sendReplyAsEmail}
                    onChange={(e) => setSendReplyAsEmail(e.target.checked)}
                    disabled={sendingReply}
                    className="w-3.5 h-3.5 rounded border-input text-primary focus:ring-primary" />

                        <Mail className="w-3.5 h-3.5" />
                        Auch als E-Mail
                      </label>
                    </>
              }
                </div>
              </> :

          <>
                {/* Conversation List Header */}
                <div data-ev-id="ev_6cb7cfb6e4" className="flex items-center justify-between p-4 border-b border-border">
                  <h2 data-ev-id="ev_49f940f7d5" className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-primary" />
                    Nachrichten
                  </h2>
                  <button data-ev-id="ev_42e29c7cb8"
              onClick={() => setShowMessageArchive(false)}
              className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Conversation List */}
                <div data-ev-id="ev_fa6d32625e" className="flex-1 overflow-y-auto">
                  {getConversations().length === 0 ?
              <div data-ev-id="ev_d6cee1e099" className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                      <Inbox className="w-12 h-12 mb-3 opacity-50" />
                      <p data-ev-id="ev_4b549ef3b1">Keine Nachrichten vorhanden</p>
                    </div> :

              <div data-ev-id="ev_23ee488baa" className="divide-y divide-border">
                      {getConversations().map((conversation, idx) => {
                  const firstMsg = conversation[0];
                  const latestMsg = conversation[conversation.length - 1];
                  const hasUnread = conversation.some((m) => !m.is_read);
                  const messageCount = conversation.length;
                  const participantNames = (firstMsg.original_recipients || []).
                  filter((id) => id !== effectiveUserId).
                  map((id) => profiles.find((p) => p.id === id)?.full_name || 'Unbekannt');
                  const conversationKey = `${firstMsg.subject || 'Kein Betreff'}::${[...(firstMsg.original_recipients || [])].sort().join(',')}`;
                  const isClosed = conversationStatuses.get(conversationKey)?.is_closed ?? false;

                  return (
                    <button data-ev-id="ev_ce22f4d26e"
                    key={idx}
                    onClick={() => setSelectedConversationKey(conversationKey)}
                    className={`w-full p-4 text-left transition-colors hover:bg-muted/50 ${
                    hasUnread ? 'bg-primary/5' : ''} ${isClosed ? 'opacity-70' : ''}`
                    }>
                            <div data-ev-id="ev_0418e43ad7" className="flex items-start gap-3">
                              <div data-ev-id="ev_0c21aa85e4" className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isClosed ? 'bg-muted' : 'bg-primary/10'}`}>
                                {isClosed ?
                          <Lock className="w-5 h-5 text-muted-foreground" /> :

                          <User className="w-5 h-5 text-primary" />
                          }
                              </div>
                              <div data-ev-id="ev_c1133bfe9f" className="flex-1 min-w-0">
                                <div data-ev-id="ev_7cc284084c" className="flex items-center justify-between gap-2 mb-0.5">
                                  <span data-ev-id="ev_51dfe5941b" className={`font-medium truncate ${hasUnread ? 'text-foreground' : 'text-foreground/80'}`}>
                                    {participantNames.length > 0 ? participantNames[0] : 'Ich'}
                                    {participantNames.length > 1 && ` +${participantNames.length - 1}`}
                                  </span>
                                  <div data-ev-id="ev_date_status" className="flex items-center gap-2 flex-shrink-0">
                                    {isClosed &&
                              <span data-ev-id="ev_closed_indicator" className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded">
                                        Geschlossen
                                      </span>
                              }
                                    <span data-ev-id="ev_4965877430" className="text-xs text-muted-foreground">
                                      {new Date(latestMsg.created_at).toLocaleDateString('de-DE', {
                                  day: '2-digit', month: '2-digit'
                                })}
                                    </span>
                                  </div>
                                </div>
                                <p data-ev-id="ev_6a9fae0f44" className={`text-sm truncate ${hasUnread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                                  {firstMsg.subject || 'Kein Betreff'}
                                </p>
                                <p data-ev-id="ev_b5918c9816" className="text-xs text-muted-foreground truncate mt-0.5">
                                  {latestMsg.sender_id === effectiveUserId ? 'Du: ' : ''}
                                  {latestMsg.message}
                                </p>
                              </div>
                              {hasUnread &&
                        <span data-ev-id="ev_eb37b99386" className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0 mt-2" />
                        }
                            </div>
                          </button>);

                })}
                    </div>
              }
                </div>
              </>
          }
          </div>
        </div>
      }
      {/* Mindestbestellwert-Info Modal */}
      {minOrderInfoOrder && minOrderInfoOrder.supplier_id && (() => {
        const supplier = suppliers.find((s) => s.id === minOrderInfoOrder.supplier_id);
        const supplierTotal = orders.
        filter((o) => (o.status === 'genehmigt' || o.status === 'eingereicht' || o.status === 'ausstehend_bereichsleitung' || o.status === 'ausstehend_kommandant' || o.status === 'freigegeben_bereichsleitung' || o.status === 'freigegeben_kommandant') && o.supplier_id === minOrderInfoOrder.supplier_id).
        reduce((sum, o) => sum + o.amount, 0);
        const isAllowed = allowBelowMinOrderSuppliers.has(minOrderInfoOrder.supplier_id);

        return (
          <div data-ev-id="ev_600ded4a09" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div data-ev-id="ev_ebc50a9655" className="bg-card rounded-xl border border-border p-6 w-full max-w-md">
              <div data-ev-id="ev_1e40981de8" className="flex items-center justify-between mb-4">
                <div data-ev-id="ev_06d7b919b7" className="flex items-center gap-3">
                  <div data-ev-id="ev_6cf8e6d58a" className={`w-10 h-10 rounded-full flex items-center justify-center ${isAllowed ? 'bg-green-100' : 'bg-amber-100'}`}>
                    {isAllowed ?
                    <CheckCircle className="w-5 h-5 text-green-600" /> :

                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    }
                  </div>
                  <h3 data-ev-id="ev_775ec2af91" className="text-lg font-semibold text-foreground">Mindestbestellwert</h3>
                </div>
                <button data-ev-id="ev_dbf79454b5"
                onClick={() => setMinOrderInfoOrder(null)}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">

                  <X className="w-5 h-5" />
                </button>
              </div>

              <div data-ev-id="ev_6536be73ec" className="mb-4 p-4 bg-muted rounded-lg">
                <p data-ev-id="ev_3a5fc37bbd" className="font-medium text-foreground">{supplier?.name || 'Unbekannt'}</p>
                <div data-ev-id="ev_670e1db696" className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <p data-ev-id="ev_4624a202f9">Aktuelle Summe: <span data-ev-id="ev_03ecb9574d" className="font-medium text-foreground">{supplierTotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span></p>
                  <p data-ev-id="ev_cccdf6197b">Mindestbestellwert: <span data-ev-id="ev_e28dafc667" className="font-medium text-foreground">{supplier?.minimum_order_value?.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span></p>
                  <p data-ev-id="ev_ae7db3ed92">Differenz: <span data-ev-id="ev_d28747cdd2" className="font-medium text-red-600">-{((supplier?.minimum_order_value || 0) - supplierTotal).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span></p>
                </div>
              </div>

              <div data-ev-id="ev_4df11e886f" className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <label data-ev-id="ev_4ad396accb" className="flex items-start gap-3 cursor-pointer">
                  <input data-ev-id="ev_ace1d7f1e9"
                  type="checkbox"
                  checked={isAllowed}
                  onChange={() => toggleAllowBelowMinOrder(minOrderInfoOrder.supplier_id!)}
                  className="w-5 h-5 mt-0.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500" />

                  <div data-ev-id="ev_d1f47da100">
                    <span data-ev-id="ev_5c9419d5e3" className="text-sm font-medium text-amber-800">Unter Mindestbestellwert bestellen erlauben</span>
                    <p data-ev-id="ev_235b47caba" className="text-xs text-amber-700 mt-1">Aktivieren Sie diese Option, um Bestellungen bei diesem Lieferanten trotz nicht erreichtem Mindestbestellwert freizugeben.</p>
                  </div>
                </label>
              </div>

              <div data-ev-id="ev_30a6f5c128" className="flex gap-3">
                <button data-ev-id="ev_1d68e7b782"
                onClick={() => setMinOrderInfoOrder(null)}
                className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">

                  Schließen
                </button>
              </div>
            </div>
          </div>);

      })()}

      {/* Sammelbestellung-Info Modal */}
      {collectiveOrderInfo &&
      <div data-ev-id="ev_7fcbae624b" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div data-ev-id="ev_62b8a72422" className="bg-card rounded-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div data-ev-id="ev_aae52ec232" className="flex items-center justify-between mb-4">
              <div data-ev-id="ev_55c0174873" className="flex items-center gap-3">
                <div data-ev-id="ev_031addb18c" className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100">
                  <Layers className="w-5 h-5 text-blue-600" />
                </div>
                <h3 data-ev-id="ev_047ac0135d" className="text-lg font-semibold text-foreground">Sammelbestellung empfohlen</h3>
              </div>
              <button data-ev-id="ev_bbeb30d2bc"
            onClick={() => setCollectiveOrderInfo(null)}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">

                <X className="w-5 h-5" />
              </button>
            </div>

            <div data-ev-id="ev_44ab6f0eb2" className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div data-ev-id="ev_e212761944" className="flex items-start gap-3">
                <Layers className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div data-ev-id="ev_6f715029e9">
                  <p data-ev-id="ev_6b667277ab" className="text-sm font-medium text-blue-800">Mindestbestellwert erreicht durch Sammelbestellung</p>
                  <p data-ev-id="ev_80777b0cbf" className="text-sm text-blue-700 mt-1">
                    Der Mindestbestellwert von <strong data-ev-id="ev_1aa28c934e">{collectiveOrderInfo.minimum.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</strong> wird nur durch die Kombination mehrerer Bestellungen erreicht.
                  </p>
                  <p data-ev-id="ev_23e48028f3" className="text-sm text-blue-700 mt-2">
                    Aktuelle Gesamtsumme: <strong data-ev-id="ev_fc92a11aa3" className="text-blue-800">{collectiveOrderInfo.total.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</strong>
                  </p>
                </div>
              </div>
            </div>

            <div data-ev-id="ev_6cd1ee154e" className="mb-4">
              <p data-ev-id="ev_5fea53f7ab" className="text-sm font-medium text-foreground mb-3">Folgende Bestellungen sollten gemeinsam bestellt werden:</p>
              <div data-ev-id="ev_647f9d44a1" className="space-y-2">
                {/* Aktuelle Bestellung */}
                <div data-ev-id="ev_c18b3a4e46" className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div data-ev-id="ev_35e7cdf11e" className="flex items-center justify-between">
                    <div data-ev-id="ev_cbe183f57f" className="flex-1 min-w-0">
                      <p data-ev-id="ev_e514a7ca19" className="font-medium text-foreground truncate">{collectiveOrderInfo.order.title}</p>
                      <p data-ev-id="ev_0ac26206b3" className="text-xs text-muted-foreground">Diese Bestellung</p>
                    </div>
                    <span data-ev-id="ev_5cf6025fa4" className="text-sm font-semibold text-blue-700">
                      {collectiveOrderInfo.order.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                    </span>
                  </div>
                </div>
                
                {/* Andere Bestellungen */}
                {collectiveOrderInfo.otherOrders.map((otherOrder) =>
              <Link
                key={otherOrder.id}
                to={`/bestellungen/${otherOrder.id}`}
                onClick={() => setCollectiveOrderInfo(null)}
                className="block p-3 bg-muted/50 border border-border rounded-lg hover:bg-muted transition-colors">

                    <div data-ev-id="ev_91d6ecc193" className="flex items-center justify-between">
                      <div data-ev-id="ev_67098e8d21" className="flex-1 min-w-0">
                        <p data-ev-id="ev_881c34fa09" className="font-medium text-foreground truncate hover:text-primary">{otherOrder.title}</p>
                        <p data-ev-id="ev_6b001cfd4e" className="text-xs text-muted-foreground">
                          {otherOrder.creator?.full_name || 'Unbekannt'} • {new Date(otherOrder.created_at).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      <span data-ev-id="ev_1d60e59f89" className="text-sm font-semibold text-foreground">
                        {otherOrder.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                      </span>
                    </div>
                  </Link>
              )}
              </div>
            </div>

            <div data-ev-id="ev_901f8dcc0a" className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <p data-ev-id="ev_c0bd5f2c0f" className="text-sm text-amber-800">
                <strong data-ev-id="ev_b4a4cc85a4">Hinweis:</strong> Bitte führen Sie diese Bestellungen als Sammelbestellung beim Lieferanten <strong data-ev-id="ev_1d32a97bb0">{collectiveOrderInfo.order.supplier?.name}</strong> aus, um den Mindestbestellwert zu erreichen.
              </p>
            </div>

            <div data-ev-id="ev_62de060286" className="flex gap-3">
              <button data-ev-id="ev_98a74424f6"
            onClick={() => setCollectiveOrderInfo(null)}
            className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">

                Verstanden
              </button>
            </div>
          </div>
        </div>
      }

    </Layout>);

}