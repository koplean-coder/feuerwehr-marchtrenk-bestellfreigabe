import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { useOrders, useOrderHistory, type InvoiceTo } from '@/hooks/useOrders';
import { Vote } from 'lucide-react';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useProfiles } from '@/hooks/useProfiles';
import { useFunctions } from '@/hooks/useFunctions';
import { useOrderVotes } from '@/hooks/useOrderVotes';
import { useSettings } from '@/hooks/useSettings';
import { Layout } from '@/components/Layout';
import { StatusBadge } from '@/components/StatusBadge';
import { AttachmentList } from '@/components/AttachmentList';
import { FileUpload, UploadedFile } from '@/components/FileUpload';
import { SupplierSelect } from '@/components/SupplierSelect';
import { KommandomitgliedVoting } from '@/components/KommandomitgliedVoting';
import { EscalationExtensionModal } from '@/components/EscalationExtensionModal';
import { EscalationCountdown } from '@/components/EscalationCountdown';
import { generateOrderPdf } from '@/utils/generateOrderPdf';
import {
  ArrowLeft,
  Calendar,
  Euro,
  User,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  History,
  Edit2,
  Save,
  X,
  Users,
  Send,
  Mail,
  MailCheck,
  MailX,
  MailWarning,
  Receipt,
  RotateCcw,
  Printer,
  Layers,
  Settings,
  ChevronDown } from
'lucide-react';
import { Link } from 'react-router';

export default function OrderDetail() {
  const { id } = useParams<{id: string;}>();
  const navigate = useNavigate();
  const { profile: authProfile, isBereichsleiter: authIsBereichsleiter, isKommandant: authIsKommandant, user, canViewPdf, isAdmin: authIsAdmin } = useAuth();
  const { 
    isSimulationActive, 
    effectiveUserId, 
    effectiveIsAdmin, 
    effectiveIsKommandant, 
    effectiveIsBereichsleiter 
  } = useSimulation();
  const { orders, approveByBereichsleiter, approveByKommandant, approveByKommandantDirect, rejectOrder, updateOrder, submitDraft, resetToDraft, requestKommandoVoting, changeOrderStatus, extendEscalationDeadline, fetchOrders, deleteOrderAttachment } = useOrders();
  
  // Verwende simulierte Werte wenn Simulation aktiv (v2)
  const isAdmin = effectiveIsAdmin;
  const isKommandant = effectiveIsKommandant;
  const isBereichsleiter = effectiveIsBereichsleiter;
  const currentUserId = effectiveUserId;
  const { history, loading: historyLoading } = useOrderHistory(id || '');
  const { suppliers } = useSuppliers();
  const { profiles } = useProfiles();
  const { functions } = useFunctions();

  // Votes for PDF export
  const { votes, kommandomitgliederCount, hasKommandomitgliedFunction } = useOrderVotes(id);
  const { pdfBackgroundUrl, pdfBackgroundOpacity, escalationTimeoutHours } = useSettings();

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDirectApproveModal, setShowDirectApproveModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [resetReason, setResetReason] = useState('');
  const [selectedInvoiceTo, setSelectedInvoiceTo] = useState<InvoiceTo>('feuerwehr');
  const [loading, setLoading] = useState(false);
  const [directApproveLoading, setDirectApproveLoading] = useState(false);
  const [submittingDraft, setSubmittingDraft] = useState(false);
  const [resettingOrder, setResettingOrder] = useState(false);
  const [allowBelowMinOrder, setAllowBelowMinOrder] = useState(false);
  const [createPaymentOrderOnApprove, setCreatePaymentOrderOnApprove] = useState(false);
  const [kommandoVotingLoading, setKommandoVotingLoading] = useState(false);

  // Status ändern Modal (nur für Kassier/Admin)
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [statusChangeLoading, setStatusChangeLoading] = useState(false);

  // Sammelbestellung Modal
  const [showCollectiveOrderModal, setShowCollectiveOrderModal] = useState(false);

  // Eskalationsfrist verlängern Modal
  const [showEscalationExtensionModal, setShowEscalationExtensionModal] = useState(false);

  // Bearbeitungsmodus
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editSupplierId, setEditSupplierId] = useState('');
  const [editBereichsleiterId, setEditBereichsleiterId] = useState('');
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editFiles, setEditFiles] = useState<UploadedFile[]>([]);

  const order = orders.find((o) => o.id === id);

  // Calculate if this order's supplier is below minimum order value
  const isOrderBelowMinOrderValue = (() => {
    if (!order || order.status !== 'genehmigt' && order.status !== 'eingereicht' && order.status !== 'ausstehend_bereichsleitung' && order.status !== 'ausstehend_kommandant' && order.status !== 'freigegeben_bereichsleitung' || !order.supplier_id) return false;

    // Sum up all genehmigt orders for the same supplier
    const supplierTotal = orders.
    filter((o) => (o.status === 'genehmigt' || o.status === 'eingereicht' || o.status === 'ausstehend_bereichsleitung' || o.status === 'ausstehend_kommandant' || o.status === 'freigegeben_bereichsleitung') && o.supplier_id === order.supplier_id).
    reduce((sum, o) => sum + o.amount, 0);

    const supplier = suppliers.find((s) => s.id === order.supplier_id);
    if (!supplier?.minimum_order_value || supplier.minimum_order_value <= 0) return false;

    return supplierTotal < supplier.minimum_order_value;
  })();

  // Get collective order info for this order
  const getCollectiveOrderInfo = () => {
    if (!order || !order.supplier_id || order.status !== 'genehmigt') return null;

    const supplier = suppliers.find((s) => s.id === order.supplier_id);
    if (!supplier?.minimum_order_value || supplier.minimum_order_value <= 0) return null;

    // If order is already executed, show other executed orders from same supplier
    if (order.order_executed) {
      const supplierOrders = orders.filter((o) =>
      o.supplier_id === order.supplier_id &&
      o.status === 'genehmigt' &&
      o.order_executed
      );

      if (supplierOrders.length <= 1) return null;

      const total = supplierOrders.reduce((sum, o) => sum + o.amount, 0);
      const otherOrders = supplierOrders.filter((o) => o.id !== order.id);

      // Show if this order is below minimum (was part of collective order)
      if (order.amount < supplier.minimum_order_value) {
        return {
          isCollective: true,
          otherOrders,
          total,
          minimum: supplier.minimum_order_value,
          supplierName: supplier.name
        };
      }
      return null;
    }

    // For not-executed orders: Get all approved, not-executed orders for this supplier
    const supplierOrders = orders.filter((o) =>
    o.supplier_id === order.supplier_id &&
    o.status === 'genehmigt' &&
    !o.order_executed
    );

    if (supplierOrders.length <= 1) return null;

    const total = supplierOrders.reduce((sum, o) => sum + o.amount, 0);
    const otherOrders = supplierOrders.filter((o) => o.id !== order.id);

    // Only show if total reaches minimum but individual order doesn't
    if (total >= supplier.minimum_order_value && order.amount < supplier.minimum_order_value) {
      return {
        isCollective: true,
        otherOrders,
        total,
        minimum: supplier.minimum_order_value,
        supplierName: supplier.name
      };
    }

    return null;
  };

  const collectiveOrderInfo = getCollectiveOrderInfo();

  // Bereichsleiter und Kommandant filtern (Kommandant ist zugleich Bereichsleiter)
  const bereichsleiter = profiles.filter((p) => p.role === 'bereichsleiter' || p.role === 'kommandant');

  // Funktion um Labels für einen Bereichsleiter zu bekommen
  function getFunctionsLabel(profileFunctions: string[] | null): string {
    if (!profileFunctions || profileFunctions.length === 0) return '';
    const labels = profileFunctions.
    map((funcName) => functions.find((f) => f.name === funcName)?.label).
    filter(Boolean);
    return labels.length > 0 ? ` (${labels.join(', ')})` : '';
  }

  // Bearbeitungsformular initialisieren
  function startEditing() {
    if (!order) return;
    setEditTitle(order.title);
    setEditDescription(order.description || '');
    setEditAmount(order.amount.toString());
    setEditSupplierId(order.supplier_id || '');
    setEditBereichsleiterId(order.bereichsleiter_id || '');
    setEditError('');
    setEditFiles([]);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditError('');
  }

  async function handleUpdate() {
    if (!order || !editBereichsleiterId) {
      setEditError('Bitte wählen Sie einen Bereichsleiter aus.');
      return;
    }

    setEditLoading(true);
    setEditError('');

    const { error } = await updateOrder(order.id, {
      title: editTitle,
      description: editDescription || undefined,
      amount: parseFloat(editAmount) || 0,
      supplier_id: editSupplierId || undefined,
      bereichsleiter_id: editBereichsleiterId
    }, true, editFiles.map((f) => f.file));

    if (error) {
      setEditError(error.message);
    } else {
      setIsEditing(false);
    }
    setEditLoading(false);
  }

  // Entwurf einreichen
  async function handleSubmitDraft() {
    if (!order) return;

    // Bereichsleiter muss ausgewählt sein
    if (!order.bereichsleiter_id) {
      setEditError('Bitte bearbeiten Sie die Bestellung und wählen Sie einen Bereichsleiter aus.');
      return;
    }

    setSubmittingDraft(true);
    const { error } = await submitDraft(order.id);
    if (error) {
      setEditError(error.message);
    }
    setSubmittingDraft(false);
  }

  if (!order) {
    return (
      <Layout>
        <div data-ev-id="ev_2ae4d69331" className="text-center py-12">
          <p data-ev-id="ev_8dd66adb01" className="text-muted-foreground">Bestellung nicht gefunden</p>
        </div>
      </Layout>);

  }

  // Ist es ein Entwurf?
  const isDraft = order.status === 'entwurf';

  // Kann der aktuelle Benutzer diese Bestellung bearbeiten?
  // Genehmigte Bestellungen können NICHT mehr bearbeitet werden
  // Entwürfe können vom Ersteller bearbeitet werden
  // Abgelehnte Bestellungen NUR wenn sie nicht durch Kommandomitglied-Abstimmung abgelehnt wurden
  // Admin kann bearbeiten außer bei genehmigten Bestellungen
  const isApproved = order.status === 'genehmigt' || order.status === 'freigegeben_kommandant' || order.status === 'abgeschlossen';
  const isLockedRejection = order.status === 'abgelehnt' && order.kommandomitglied_override_by;
  const canEdit = !isApproved && (
  isAdmin ||
  order.created_by === currentUserId && (
  order.status === 'entwurf' || order.status === 'abgelehnt' && !isLockedRejection));

  // Kann der Benutzer den Entwurf einreichen?
  const canSubmitDraft = order.created_by === currentUserId && isDraft;

  // Nur der zugewiesene Bereichsleiter (oder Kommandant als Bereichsleiter) darf freigeben
  const canApproveAsBereichsleiter = (isBereichsleiter || isKommandant) &&
  order.status === 'eingereicht' &&
  order.bereichsleiter_id === currentUserId;

  // Kommandant kann bei allen relevanten Status freigeben
  const canApproveAsKommandant = isKommandant &&
  ['eingereicht', 'ausstehend_bereichsleitung', 'ausstehend_kommandant', 'freigegeben_bereichsleitung'].includes(order.status);

  // Kommandant kann immer direkt freigeben/ablehnen (ohne Bereichsleiter) - nur bei eingereicht und ausstehend_bereichsleitung
  const canDirectApproveAsKommandant = isKommandant &&
  ['eingereicht', 'ausstehend_bereichsleitung'].includes(order.status);

  // Nur der zugewiesene Bereichsleiter oder Kommandant darf ablehnen
  const canReject =
  (isBereichsleiter || isKommandant) && order.status === 'eingereicht' && order.bereichsleiter_id === currentUserId ||
  isKommandant && ['ausstehend_kommandant', 'eingereicht', 'ausstehend_bereichsleitung', 'freigegeben_bereichsleitung'].includes(order.status);

  // Nur Kommandant kann Bestellungen auf Entwurf zurücksetzen
  // Nicht für Entwürfe und abgeschlossene Bestellungen
  const canReset = isKommandant && !['entwurf', 'abgeschlossen'].includes(order.status);

  // Admin, Kommandant und Ersteller der Bestellung (Anforderer) können Eskalationsfrist verlängern
  // Nur für eingereichte Bestellungen relevant
  const canExtendEscalation = (isAdmin || isKommandant || order.created_by === currentUserId) && order.status === 'eingereicht';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Freigabe-Button geklickt - Modal öffnen
  function handleApproveClick() {
    setShowApproveModal(true);
    setAllowBelowMinOrder(false);
    setCreatePaymentOrderOnApprove(false); // Standardmäßig deaktiviert
  }

  // Bestätigung im Modal - Freigabe durchführen
  async function handleConfirmApprove() {
    setLoading(true);
    if (canApproveAsBereichsleiter) {
      await approveByBereichsleiter(order.id, selectedInvoiceTo);
    } else if (canApproveAsKommandant) {
      await approveByKommandant(order.id, selectedInvoiceTo, createPaymentOrderOnApprove);
    }
    setShowApproveModal(false);
    setCreatePaymentOrderOnApprove(false);
    setLoading(false);
  }

  // Direktfreigabe durch Kommandant
  async function handleConfirmDirectApprove() {
    setDirectApproveLoading(true);
    await approveByKommandantDirect(order.id, selectedInvoiceTo, createPaymentOrderOnApprove);
    setShowDirectApproveModal(false);
    setCreatePaymentOrderOnApprove(false);
    setDirectApproveLoading(false);
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    setLoading(true);
    await rejectOrder(order.id, rejectReason);
    setShowRejectModal(false);
    setLoading(false);
  }

  async function handleReset() {
    if (!resetReason.trim()) return;
    setResettingOrder(true);
    await resetToDraft(order.id, resetReason);
    setShowResetModal(false);
    setResetReason('');
    setResettingOrder(false);
  }

  async function handlePrintPdf() {
    if (!order) return;

    const supplierName = order.supplier_id ?
    suppliers.find((s) => s.id === order.supplier_id)?.name :
    undefined;
    const creatorName = profiles.find((p) => p.id === order.created_by)?.full_name;
    const bereichsleiterName = order.bereichsleiter_id ?
    profiles.find((p) => p.id === order.bereichsleiter_id)?.full_name :
    undefined;
    const overriderName = order.kommandomitglied_override_by ?
    profiles.find((p) => p.id === order.kommandomitglied_override_by)?.full_name :
    undefined;

    await generateOrderPdf({
      order,
      supplierName,
      creatorName,
      bereichsleiterName,
      votes,
      kommandomitgliederCount,
      wasOverridden: !!order.kommandomitglied_override_by,
      overriderName,
      overrideReason: order.kommandomitglied_override_reason || undefined,
      pdfBackgroundUrl,
      pdfBackgroundOpacity
    });
  }

  return (
    <Layout>
      <div data-ev-id="ev_eaa594f7f3" className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button data-ev-id="ev_95ad0093b7"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg mb-4 transition-colors">

          <ArrowLeft className="w-4 h-4" />
          Zurück zur Übersicht
        </button>

        <div data-ev-id="ev_ad0004ce42" className="grid gap-6">
          {/* Bearbeitungsmodus */}
          {isEditing ?
          <div data-ev-id="ev_5c7037901f" className="bg-card rounded-xl border border-border p-6">
              <div data-ev-id="ev_d5d759244b" className="flex items-center justify-between mb-6">
                <h2 data-ev-id="ev_53df224ce7" className="text-xl font-bold text-foreground">Bestellung bearbeiten</h2>
                <button data-ev-id="ev_1d95e5e16e"
              onClick={cancelEditing}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">

                  <X className="w-5 h-5" />
                </button>
              </div>

              {editError &&
            <div data-ev-id="ev_a2d22c1dff" className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {editError}
                </div>
            }

              <div data-ev-id="ev_a3dd9426e0" className="flex flex-col gap-4">
                <div data-ev-id="ev_a0e3863efb">
                  <label data-ev-id="ev_a3499b02f3" className="block text-sm font-medium text-foreground mb-1.5">Titel *</label>
                  <input data-ev-id="ev_30a9de42ef"
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                required />

                </div>

                <div data-ev-id="ev_d5f98b1240">
                  <label data-ev-id="ev_8f684c3389" className="block text-sm font-medium text-foreground mb-1.5">Bereichsleiter *</label>
                  <div data-ev-id="ev_a930c715dc" className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                    <select data-ev-id="ev_3204cf31e0"
                  value={editBereichsleiterId}
                  onChange={(e) => setEditBereichsleiterId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                  required>

                      <option data-ev-id="ev_3ac7ff9909" value="">Bitte Bereichsleiter auswählen</option>
                      {bereichsleiter.map((bl) =>
                    <option data-ev-id="ev_29f7f80521" key={bl.id} value={bl.id}>
                          {bl.full_name}{getFunctionsLabel(bl.functions)}
                        </option>
                    )}
                    </select>
                  </div>
                </div>

                <div data-ev-id="ev_a83aae5da5">
                  <label data-ev-id="ev_de6fdec618" className="block text-sm font-medium text-foreground mb-1.5">Beschreibung</label>
                  <textarea data-ev-id="ev_6ecd1364ab"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none" />

                </div>

                <div data-ev-id="ev_1672ed3c33">
                  <label data-ev-id="ev_eba9ca50ce" className="block text-sm font-medium text-foreground mb-1.5">Gesamtbetrag (€) *</label>
                  <input data-ev-id="ev_df174cb012"
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                step="0.01"
                min="0"
                className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                required />

                </div>

                <div data-ev-id="ev_b9532454ae">
                  <label data-ev-id="ev_1931fc018c" className="block text-sm font-medium text-foreground mb-1.5">Lieferant</label>
                  <SupplierSelect
                  suppliers={suppliers}
                  value={editSupplierId}
                  onChange={setEditSupplierId}
                  placeholder="Lieferant auswählen..." />

                </div>

                {/* Datei-Upload */}
                <div data-ev-id="ev_d062abe4c4">
                  <label data-ev-id="ev_8f7a089049" className="block text-sm font-medium text-foreground mb-1.5">Neue Anhänge hinzufügen</label>
                  <FileUpload
                  files={editFiles}
                  onChange={setEditFiles}
                  disabled={editLoading} />

                  {editFiles.length > 0 &&
                <p data-ev-id="ev_88893bdaa1" className="text-xs text-muted-foreground mt-1">
                      {editFiles.length} neue {editFiles.length === 1 ? 'Datei' : 'Dateien'} ausgewählt
                    </p>
                }
                </div>

                <div data-ev-id="ev_ed16215ca3" className="flex gap-3 mt-2">
                  <button data-ev-id="ev_e45b4912cb"
                type="button"
                onClick={cancelEditing}
                className="flex-1 px-4 py-2.5 border border-input rounded-lg font-medium hover:bg-muted transition-colors">

                    Abbrechen
                  </button>
                  <button data-ev-id="ev_edab67c956"
                onClick={handleUpdate}
                disabled={editLoading || !editTitle || !editAmount || !editBereichsleiterId}
                className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">

                    {editLoading ?
                  <span data-ev-id="ev_8cb515df0a" className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> :

                  <>
                        <Save className="w-5 h-5" />
                        Aktualisieren & erneut einreichen
                      </>
                  }
                  </button>
                </div>
              </div>
            </div> :

          <>
          {/* Main Info Card */}
          <div data-ev-id="ev_6d7c1b7e73" className="bg-card rounded-xl border border-border p-6">
            <div data-ev-id="ev_f14e968e24" className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div data-ev-id="ev_a2daa07284">
                <h1 data-ev-id="ev_1c78ec5f13" className="text-2xl font-bold text-foreground">{order.title}</h1>
                {order.description &&
                  <p data-ev-id="ev_e1a23bf428" className="text-muted-foreground mt-2">{order.description}</p>
                  }
              </div>
              <div data-ev-id="ev_803d4ebf71" className="flex items-center gap-3">
                {canEdit &&
                  <button data-ev-id="ev_cf59235b06"
                  onClick={startEditing}
                  className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-foreground font-medium transition-colors">

                    <Edit2 className="w-4 h-4" />
                    Bearbeiten
                  </button>
                  }
                {canSubmitDraft &&
                  <button data-ev-id="ev_bf3b6f5ca5"
                  onClick={handleSubmitDraft}
                  disabled={submittingDraft || !order.bereichsleiter_id}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-lg font-medium transition-colors disabled:opacity-50">

                    {submittingDraft ?
                    <span data-ev-id="ev_1a8a3b4c5d" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
                    <Send className="w-4 h-4" />
                    }
                    Einreichen
                  </button>
                  }
                {/* PDF Button: Kassier, Schriftführer, Kommandant können immer, andere nur bei genehmigt/freigegeben_kommandant/abgelehnt mit Kommandomitglied-Funktion */}
                {(canViewPdf || (order.status === 'genehmigt' || order.status === 'freigegeben_kommandant' || order.status === 'abgelehnt') && hasKommandomitgliedFunction) &&
                  <button data-ev-id="ev_2812d4ce66"
                  onClick={handlePrintPdf}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors"
                  title="Bestellung als PDF herunterladen">
                    <Printer className="w-4 h-4" />
                    PDF
                  </button>
                  }
                <StatusBadge status={order.status} belowMinOrderValue={isOrderBelowMinOrderValue} />
              </div>
            </div>

            {/* Hinweis bei Entwurf */}
            {isDraft &&
              <div data-ev-id="ev_31d3d3710a" className="mb-4 p-4 bg-gray-100 border border-gray-300 rounded-lg">
                <div data-ev-id="ev_8b67ddc4a8" className="flex items-center gap-2 text-gray-700">
                  <AlertCircle className="w-5 h-5" />
                  <p data-ev-id="ev_3f5b86ac2e" className="font-medium">Dies ist ein Entwurf</p>
                </div>
                <p data-ev-id="ev_2b3ed3f952" className="text-sm text-gray-600 mt-1">
                  {order.bereichsleiter_id ?
                  'Klicken Sie auf "Einreichen", um die Bestellung zur Freigabe zu senden.' :
                  'Bitte bearbeiten Sie die Bestellung und wählen Sie einen Bereichsleiter aus, bevor Sie einreichen.'}
                </p>
              </div>
              }

            <div data-ev-id="ev_8c91f18d19" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div data-ev-id="ev_1fb311b9ca" className="p-4 bg-muted rounded-lg">
                <div data-ev-id="ev_05a96651c1" className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Euro className="w-4 h-4" />
                  <span data-ev-id="ev_dab3930147" className="text-sm">Betrag</span>
                </div>
                <p data-ev-id="ev_a72bc17849" className="text-lg font-semibold text-foreground">
                  {formatCurrency(order.amount)}
                </p>
              </div>
              
              <div data-ev-id="ev_b80c363f09" className="p-4 bg-muted rounded-lg">
                <div data-ev-id="ev_a7444eaafd" className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="w-4 h-4" />
                  <span data-ev-id="ev_9b3afbf001" className="text-sm">Erstellt am</span>
                </div>
                <p data-ev-id="ev_2fa324773f" className="text-sm font-medium text-foreground">
                  {formatDate(order.created_at)}
                </p>
              </div>
              
              <div data-ev-id="ev_9ed11bf4de" className="p-4 bg-muted rounded-lg">
                <div data-ev-id="ev_1fed3623c5" className="flex items-center gap-2 text-muted-foreground mb-1">
                  <User className="w-4 h-4" />
                  <span data-ev-id="ev_6481740737" className="text-sm">Ersteller</span>
                </div>
                <p data-ev-id="ev_b6e49ef741" className="text-sm font-medium text-foreground">
                  {order.creator?.full_name || order.creator?.email || 'Unbekannt'}
                </p>
              </div>
              
              <div data-ev-id="ev_06bae3c45a" className="p-4 bg-muted rounded-lg">
                <div data-ev-id="ev_c283339369" className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Building2 className="w-4 h-4" />
                  <span data-ev-id="ev_14d19d192e" className="text-sm">Lieferant</span>
                </div>
                <p data-ev-id="ev_e2accad287" className="text-sm font-medium text-foreground">
                  {order.supplier?.name || 'Nicht angegeben'}
                </p>
              </div>
            </div>
            
            {/* Sammelbestellung Button */}
            {collectiveOrderInfo?.isCollective &&
              <div data-ev-id="ev_38333b013c" className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div data-ev-id="ev_92fa5b4603" className="flex items-center justify-between">
                  <div data-ev-id="ev_7621c5404a" className="flex items-center gap-3">
                    <div data-ev-id="ev_dc88d3dfc0" className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Layers className="w-5 h-5 text-blue-600" />
                    </div>
                    <div data-ev-id="ev_f6d6cc8e2b">
                      <p data-ev-id="ev_c85b0622ff" className="font-medium text-blue-800">Sammelbestellung nötig</p>
                      <p data-ev-id="ev_d53c37dd3c" className="text-sm text-blue-600">
                        {collectiveOrderInfo.otherOrders.length + 1} Bestellungen für Mindestbestellwert
                      </p>
                    </div>
                  </div>
                  <button data-ev-id="ev_6316c48e1b"
                  onClick={() => setShowCollectiveOrderModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Zugehörige Bestellungen
                  </button>
                </div>
              </div>
              }

            {/* Rechnungsempfänger */}
            {order.invoice_to &&
              <div data-ev-id="ev_455e3518ce" className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div data-ev-id="ev_00b5ebb316" className="flex items-center gap-3">
                  <div data-ev-id="ev_2926b10142" className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-primary" />
                  </div>
                  <div data-ev-id="ev_aa7207a62f">
                    <p data-ev-id="ev_6bfe10ac86" className="text-sm text-muted-foreground">Rechnung geht an</p>
                    <p data-ev-id="ev_f692c05576" className="font-semibold text-foreground">
                      {order.invoice_to === 'gemeinde' ? 'Gemeinde' : 'Feuerwehr'}
                    </p>
                  </div>
                </div>
              </div>
              }

            {/* Anhänge */}
            <AttachmentList 
              orderId={order.id}
              canDelete={(
                (order.created_by === currentUserId && ['entwurf', 'abgelehnt'].includes(order.status)) ||
                isAdmin
              )}
              onDelete={deleteOrderAttachment}
            />

            {/* KDT Approval Info */}
            {order.requires_kommandant_approval &&
              <div data-ev-id="ev_1e69725f59" className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div data-ev-id="ev_d760b7f7b6" className="flex items-center gap-2 text-blue-800">
                  <AlertCircle className="w-5 h-5" />
                  <span data-ev-id="ev_680a10616b" className="font-medium">Kommandanten-Freigabe erforderlich</span>
                </div>
                <p data-ev-id="ev_5429c076a5" className="text-sm text-blue-600 mt-1">
                  Diese Bestellung erfordert zusätzlich eine Freigabe durch den Kommandanten.
                </p>
              </div>
              }

            {/* Approval Status */}
            {(order.bereichsleiter_approved_at || order.kommandant_approved_at || order.rejected_at) &&
              <div data-ev-id="ev_6992094a10" className="mt-6 pt-6 border-t border-border">
                <h3 data-ev-id="ev_542b59141d" className="font-semibold text-foreground mb-4">Freigabe-Status</h3>
                <div data-ev-id="ev_a41a9cf6d6" className="flex flex-col gap-3">
                  {order.bereichsleiter_approved_at &&
                  <div data-ev-id="ev_c0ecaf2798" className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div data-ev-id="ev_5c37b9af8c">
                        <p data-ev-id="ev_63e26a5045" className="font-medium text-green-800">Freigegeben durch Bereichsleitung</p>
                        <p data-ev-id="ev_619fa04731" className="text-sm text-green-600">{formatDate(order.bereichsleiter_approved_at)}</p>
                      </div>
                    </div>
                  }
                  {order.kommandant_approved_at &&
                  <div data-ev-id="ev_9a581fed30" className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div data-ev-id="ev_877cdd9c42">
                        <p data-ev-id="ev_ecde615349" className="font-medium text-green-800">Freigegeben durch Kommandant</p>
                        <p data-ev-id="ev_218bc5c4ca" className="text-sm text-green-600">{formatDate(order.kommandant_approved_at)}</p>
                      </div>
                    </div>
                  }
                  {order.rejected_at &&
                  <div data-ev-id="ev_84ee1f14ca" className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <div data-ev-id="ev_84f51104a7">
                        <p data-ev-id="ev_e59f1db7df" className="font-medium text-red-800">Abgelehnt</p>
                        <p data-ev-id="ev_d273c701f6" className="text-sm text-red-600">{formatDate(order.rejected_at)}</p>
                        {order.rejection_reason &&
                      <p data-ev-id="ev_d50126a9bd" className="text-sm text-red-700 mt-1">Grund: {order.rejection_reason}</p>
                      }
                      </div>
                    </div>
                  }
                  {order.reset_at &&
                  <div data-ev-id="ev_reset_info" className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                      <RotateCcw className="w-5 h-5 text-amber-600" />
                      <div data-ev-id="ev_420beb2ea7">
                        <p data-ev-id="ev_5f531f38b9" className="font-medium text-amber-800">Auf Entwurf zurückgesetzt</p>
                        <p data-ev-id="ev_81dc90f00a" className="text-sm text-amber-600">{formatDate(order.reset_at)}</p>
                        {order.reset_reason &&
                      <p data-ev-id="ev_7edc3504ec" className="text-sm text-amber-700 mt-1">Grund: {order.reset_reason}</p>
                      }
                      </div>
                    </div>
                  }
                </div>
              </div>
              }

            {/* Action Buttons */}
            {(canApproveAsBereichsleiter || canApproveAsKommandant || canDirectApproveAsKommandant || canReject || canReset) &&
              <div data-ev-id="ev_af14d80064" className="mt-6 pt-6 border-t border-border flex flex-wrap gap-3">
                {(canApproveAsBereichsleiter || canApproveAsKommandant) &&
                <button data-ev-id="ev_4bc1e55836"
                onClick={handleApproveClick}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50">

                    <CheckCircle className="w-5 h-5" />
                    {canApproveAsBereichsleiter ? 'Freigeben (Bereichsleitung)' : 'Freigeben (Kommandant)'}
                  </button>
                }
                {canReject &&
                <button data-ev-id="ev_1c221f8509"
                onClick={() => setShowRejectModal(true)}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50">

                    <XCircle className="w-5 h-5" />
                    Ablehnen
                  </button>
                }
                {/* Direktfreigabe durch Kommandant */}
                {canDirectApproveAsKommandant &&
                <button data-ev-id="ev_0f916d13c5"
                onClick={() => {setShowDirectApproveModal(true);setAllowBelowMinOrder(false);}}
                disabled={directApproveLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50">

                    <CheckCircle className="w-5 h-5" />
                    Direktfreigabe (Kommandant)
                  </button>
                }
                {/* Direktablehnung durch Kommandant */}
                {canDirectApproveAsKommandant &&
                <button data-ev-id="ev_a6c093c92f"
                onClick={() => setShowRejectModal(true)}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors disabled:opacity-50">

                    <XCircle className="w-5 h-5" />
                    Direktablehnung (Kommandant)
                  </button>
                }
                {canReset &&
                <button data-ev-id="ev_66cb3321b6"
                onClick={() => setShowResetModal(true)}
                disabled={resettingOrder}
                className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors disabled:opacity-50">

                    <RotateCcw className="w-5 h-5" />
                    Auf Entwurf zurücksetzen
                  </button>
                }
              </div>
              }
          </div>

          {/* Eskalations-Countdown - nur für eingereichte Bestellungen */}
          {order.status === 'eingereicht' && order.submitted_at && canExtendEscalation &&
            <div data-ev-id="ev_f2213597f2" className="mb-4">
              <EscalationCountdown
                submittedAt={order.submitted_at}
                escalationTimeoutHours={escalationTimeoutHours}
                extendedUntil={order.escalation_extended_until}
                onExtendClick={() => setShowEscalationExtensionModal(true)}
                canExtend={canExtendEscalation} />

            </div>
            }

          {/* Kommandoabstimmung anfordern - nur für Kommandomitglieder, Admins und Kommandanten */}
          {(authProfile?.functions?.includes('kommandomitglied') || authProfile?.role === 'admin' || authProfile?.role === 'kommandant') &&
            order.status !== 'genehmigt' && order.status !== 'abgelehnt' && order.status !== 'abgeschlossen' &&
            <div data-ev-id="ev_70fb18d380" className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
              <div data-ev-id="ev_0c8a4b7763" className="flex items-center justify-between">
                <div data-ev-id="ev_16deccb654" className="flex items-center gap-3">
                  <div data-ev-id="ev_da15cdd0c6" className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Vote className="w-5 h-5 text-purple-600" />
                  </div>
                  <div data-ev-id="ev_cf1f30bd59">
                    <p data-ev-id="ev_e5040e8725" className="font-medium text-purple-900">Kommandoabstimmung</p>
                    <p data-ev-id="ev_25aa0a7623" className="text-sm text-purple-700">Abstimmung aller Kommandomitglieder für diese Bestellung erforderlich</p>
                  </div>
                </div>
                <label data-ev-id="ev_77f3027e45" className="relative inline-flex items-center cursor-pointer">
                  <input data-ev-id="ev_c4caf69e88"
                  type="checkbox"
                  checked={order.requires_kommandomitglied_approval}
                  disabled={kommandoVotingLoading}
                  onChange={async (e) => {
                    setKommandoVotingLoading(true);
                    await requestKommandoVoting(order.id, e.target.checked);
                    setKommandoVotingLoading(false);
                  }}
                  className="sr-only peer" />

                  <div data-ev-id="ev_495f369a78" className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 ${kommandoVotingLoading ? 'opacity-50' : ''}`}></div>
                </label>
              </div>
            </div>
            }

          {/* Kommandomitglied Voting Section - nur für Kommandomitglieder, Admins und Kommandanten sichtbar */}
          {order.requires_kommandomitglied_approval && (
            authProfile?.functions?.includes('kommandomitglied') || authProfile?.role === 'admin' || authProfile?.role === 'kommandant') &&
            <KommandomitgliedVoting
              orderId={order.id}
              orderStatus={order.status}
              requiresKommandomitgliedApproval={order.requires_kommandomitglied_approval}
              kommandomitgliedOverrideBy={order.kommandomitglied_override_by}
              kommandomitgliedOverrideReason={order.kommandomitglied_override_reason}
              overriderName={order.kommandomitglied_override_by ? profiles.find((p) => p.id === order.kommandomitglied_override_by)?.full_name : undefined}
              onStatusChange={fetchOrders} />

            }

          {/* Status ändern - nur für Kassier und Admin */}
          {(authProfile?.functions?.includes('kassier') || authProfile?.role === 'admin') &&
            <div data-ev-id="ev_8f9c3bbef2" className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
              <div data-ev-id="ev_9380a32754" className="flex items-center justify-between">
                <div data-ev-id="ev_2c22e66013" className="flex items-center gap-3">
                  <div data-ev-id="ev_d8f6a1a1f6" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-slate-600" />
                  </div>
                  <div data-ev-id="ev_a15ee8e8ec">
                    <p data-ev-id="ev_fda425abe6" className="font-medium text-slate-900">Status manuell ändern</p>
                    <p data-ev-id="ev_0e7860844a" className="text-sm text-slate-600">Als {authProfile?.role === 'admin' ? 'Administrator' : 'Kassier'} können Sie den Status jederzeit ändern</p>
                  </div>
                </div>
                <button data-ev-id="ev_2dec0463c3"
                onClick={() => {
                  setNewStatus(order.status);
                  setStatusChangeReason('');
                  setShowStatusModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors">

                  <Settings className="w-4 h-4" />
                  Status ändern
                </button>
              </div>
            </div>
            }

          {/* History Card */}
          <div data-ev-id="ev_eef3b1b75e" className="bg-card rounded-xl border border-border p-6">
            <div data-ev-id="ev_eea0a42a76" className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-muted-foreground" />
              <h2 data-ev-id="ev_e2e774cf52" className="text-lg font-semibold text-foreground">Freigabe-Verlauf</h2>
            </div>
            
            {historyLoading ?
              <div data-ev-id="ev_923264ceac" className="flex items-center justify-center py-8">
                <div data-ev-id="ev_7e17639d1c" className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div> :
              history.length === 0 ?
              <p data-ev-id="ev_16b7e7e33a" className="text-muted-foreground text-center py-8">Keine Historie vorhanden</p> :

              <div data-ev-id="ev_ed7f4b0041" className="relative">
                <div data-ev-id="ev_fc27006baa" className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                <div data-ev-id="ev_9b82e6682d" className="flex flex-col gap-4">
                  {history.map((entry, index) =>
                  <div data-ev-id="ev_b66b398c1d" key={entry.id} className="relative pl-10">
                      <div data-ev-id="ev_9ba557357b" className="absolute left-2.5 w-3 h-3 rounded-full bg-primary border-2 border-card" />
                      <div data-ev-id="ev_6e5921bbac" className="p-3 bg-muted rounded-lg">
                        <div data-ev-id="ev_30bd7c9ba5" className="flex items-center justify-between gap-4">
                          <p data-ev-id="ev_6c6c3fecd3" className="font-medium text-foreground">{entry.action}</p>
                          <StatusBadge status={entry.new_status} />
                        </div>
                        <div data-ev-id="ev_fbb80708d5" className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span data-ev-id="ev_4a30de8758" className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {entry.performer?.full_name || entry.performer?.email}
                          </span>
                          <span data-ev-id="ev_8eaee7fe7c" className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(entry.created_at)}
                          </span>
                          {entry.email_status && entry.email_status !== 'none' &&
                        <span data-ev-id="ev_026d94f05d" className={`flex items-center gap-1 ${
                        entry.email_status === 'sent' ? 'text-green-600' :
                        entry.email_status === 'failed' ? 'text-red-500' :
                        entry.email_status === 'partial' ? 'text-amber-500' :
                        'text-muted-foreground'}`
                        }>
                              {entry.email_status === 'sent' &&
                          <>
                                  <MailCheck className="w-3 h-3" />
                                  <span data-ev-id="ev_fb69fc75e4">E-Mail gesendet</span>
                                </>
                          }
                              {entry.email_status === 'failed' &&
                          <>
                                  <MailX className="w-3 h-3" />
                                  <span data-ev-id="ev_668947156a">E-Mail fehlgeschlagen</span>
                                </>
                          }
                              {entry.email_status === 'partial' &&
                          <>
                                  <MailWarning className="w-3 h-3" />
                                  <span data-ev-id="ev_a889dcaaaa">E-Mail teilweise gesendet</span>
                                </>
                          }
                            </span>
                        }
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              }
          </div>
        </>
          }
        </div>

        {/* Reject Modal */}
        {showRejectModal &&
        <div data-ev-id="ev_f4a1810070" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div data-ev-id="ev_d10520fb00" className="bg-card rounded-xl border border-border p-6 w-full max-w-md">
              <h3 data-ev-id="ev_429b72c507" className="text-lg font-semibold text-foreground mb-4">Bestellung ablehnen</h3>
              <textarea data-ev-id="ev_af5cd6002c"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Grund für die Ablehnung..."
            rows={4}
            className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none mb-4" />

              <div data-ev-id="ev_c3c1cdb4c3" className="flex gap-3 justify-end">
                <button data-ev-id="ev_f3133049e0"
              onClick={() => setShowRejectModal(false)}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors">

                  Abbrechen
                </button>
                <button data-ev-id="ev_cd057e62a6"
              onClick={handleReject}
              disabled={loading || !rejectReason.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50">

                  Ablehnen
                </button>
              </div>
            </div>
          </div>
        }

        {/* Approve Modal - Rechnungsempfänger auswählen */}
        {showApproveModal &&
        <div data-ev-id="ev_a5c888b92d" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div data-ev-id="ev_f0fb69ed30" className="bg-card rounded-xl border border-border p-6 w-full max-w-md">
              <div data-ev-id="ev_ab17f073f7" className="flex items-center gap-3 mb-4">
                <div data-ev-id="ev_12403f70d7" className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <h3 data-ev-id="ev_6e8a4404ea" className="text-lg font-semibold text-foreground">Bestellung freigeben</h3>
              </div>
              
              <p data-ev-id="ev_86a77a4f40" className="text-muted-foreground mb-4">
                Bitte wählen Sie, an wen die Rechnung gehen soll:
              </p>
              
              <div data-ev-id="ev_359d104f24" className="flex flex-col gap-3 mb-6">
                <label data-ev-id="ev_f2351d6d05" className="flex items-center gap-3 p-4 border border-input rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input data-ev-id="ev_37dbca1a28"
                type="radio"
                name="invoiceTo"
                value="feuerwehr"
                checked={selectedInvoiceTo === 'feuerwehr'}
                onChange={() => setSelectedInvoiceTo('feuerwehr')}
                className="w-4 h-4 text-primary" />

                  <div data-ev-id="ev_1feebd2518" className="flex-1">
                    <span data-ev-id="ev_ba4fbab1b0" className="font-medium text-foreground">Feuerwehr</span>
                    <p data-ev-id="ev_ed1b851996" className="text-sm text-muted-foreground">Rechnung geht an die Feuerwehr</p>
                  </div>
                </label>
                
                <label data-ev-id="ev_0b2b3297e7" className="flex items-center gap-3 p-4 border border-input rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input data-ev-id="ev_d44be163d3"
                type="radio"
                name="invoiceTo"
                value="gemeinde"
                checked={selectedInvoiceTo === 'gemeinde'}
                onChange={() => setSelectedInvoiceTo('gemeinde')}
                className="w-4 h-4 text-primary" />

                  <div data-ev-id="ev_95f14ab0a2" className="flex-1">
                    <span data-ev-id="ev_74c5bec061" className="font-medium text-foreground">Gemeinde</span>
                    <p data-ev-id="ev_12f4451ea9" className="text-sm text-muted-foreground">Rechnung geht an die Gemeinde</p>
                  </div>
                </label>
              </div>

              {/* Mindestbestellwert Warnung */}
              {isOrderBelowMinOrderValue && (() => {
              const supplier = suppliers.find((s) => s.id === order.supplier_id);
              const supplierTotal = orders.
              filter((o) => (o.status === 'genehmigt' || o.status === 'eingereicht' || o.status === 'ausstehend_bereichsleitung' || o.status === 'ausstehend_kommandant' || o.status === 'freigegeben_bereichsleitung') && o.supplier_id === order.supplier_id).
              reduce((sum, o) => sum + o.amount, 0);
              return (
                <div data-ev-id="ev_15655f5a60" className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div data-ev-id="ev_3fe6800e24" className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div data-ev-id="ev_58e4695a3b" className="flex-1">
                        <p data-ev-id="ev_c6cb6b0c70" className="text-sm font-medium text-amber-800">Mindestbestellwert nicht erreicht</p>
                        <p data-ev-id="ev_7c7dd490e1" className="text-sm text-amber-700 mt-1">
                          Lieferant: {supplier?.name || 'Unbekannt'}<br data-ev-id="ev_5e109f941b" />
                          Aktuelle Summe: {supplierTotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €<br data-ev-id="ev_ed2a643a10" />
                          Mindestbestellwert: {supplier?.minimum_order_value?.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                        </p>
                        <label data-ev-id="ev_98f9267f42" className="flex items-center gap-2 mt-3 cursor-pointer">
                          <input data-ev-id="ev_524e7bc960"
                        type="checkbox"
                        checked={allowBelowMinOrder}
                        onChange={(e) => setAllowBelowMinOrder(e.target.checked)}
                        className="w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500" />

                          <span data-ev-id="ev_09fe43de4b" className="text-sm font-medium text-amber-800">Unter Mindestbestellwert bestellen erlauben</span>
                        </label>
                      </div>
                    </div>
                  </div>);

            })()}

              {/* Auszahlungsanweisung Checkbox - nur für Kommandant */}
              {canApproveAsKommandant &&
              <div data-ev-id="ev_payment_order_checkbox" className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <label data-ev-id="ev_payment_order_label" className="flex items-start gap-3 cursor-pointer">
                    <input data-ev-id="ev_payment_order_input"
                  type="checkbox"
                  checked={createPaymentOrderOnApprove}
                  onChange={(e) => setCreatePaymentOrderOnApprove(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-blue-400 text-blue-600 focus:ring-blue-500" />

                    <div data-ev-id="ev_payment_order_text" className="flex-1">
                      <span data-ev-id="ev_payment_order_title" className="font-medium text-blue-800 dark:text-blue-200">Genehmigte Auszahlungsanweisung erstellen</span>
                      <p data-ev-id="ev_payment_order_desc" className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Erstellt automatisch eine BAR-Auszahlungsanweisung für den Einreicher ({order.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €). Der Kassier wird benachrichtigt.
                      </p>
                    </div>
                  </label>
                </div>
              }

              <div data-ev-id="ev_5c3ef539d2" className="flex gap-3 justify-end">
                <button data-ev-id="ev_eb92309bc0"
              onClick={() => setShowApproveModal(false)}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors">

                  Abbrechen
                </button>
                <button data-ev-id="ev_3bdcf32da3"
              onClick={handleConfirmApprove}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2">

                  {loading ?
                <span data-ev-id="ev_da208304af" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :

                <CheckCircle className="w-4 h-4" />
                }
                  Freigeben
                </button>
              </div>
            </div>
          </div>
        }

        {/* Direct Approve Modal - Direktfreigabe durch Kommandant */}
        {showDirectApproveModal &&
        <div data-ev-id="ev_981b6139ff" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div data-ev-id="ev_9df0f487b4" className="bg-card rounded-xl border border-border p-6 w-full max-w-md">
              <div data-ev-id="ev_20890180a5" className="flex items-center gap-3 mb-4">
                <div data-ev-id="ev_f92169e53c" className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 data-ev-id="ev_d554c662ca" className="text-lg font-semibold text-foreground">Direktfreigabe durch Kommandant</h3>
              </div>
              
              <p data-ev-id="ev_b5991bd551" className="text-muted-foreground mb-4">
                Diese Bestellung wird direkt durch den Kommandanten freigegeben (ohne Bereichsleiter-Freigabe). Bitte wählen Sie, an wen die Rechnung gehen soll:
              </p>
              
              <div data-ev-id="ev_a60cce9c2c" className="flex flex-col gap-3 mb-6">
                <label data-ev-id="ev_0b5290c2f3" className="flex items-center gap-3 p-4 border border-input rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input data-ev-id="ev_f8758fe10e"
                type="radio"
                name="directInvoiceTo"
                value="feuerwehr"
                checked={selectedInvoiceTo === 'feuerwehr'}
                onChange={() => setSelectedInvoiceTo('feuerwehr')}
                className="w-4 h-4 text-primary" />

                  <div data-ev-id="ev_c1dc85dfcd" className="flex-1">
                    <span data-ev-id="ev_49ea8c4aee" className="font-medium text-foreground">Feuerwehr</span>
                    <p data-ev-id="ev_a8b9eab2a4" className="text-sm text-muted-foreground">Rechnung geht an die Feuerwehr</p>
                  </div>
                </label>
                
                <label data-ev-id="ev_a015ad7ecc" className="flex items-center gap-3 p-4 border border-input rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input data-ev-id="ev_5c907ac6cb"
                type="radio"
                name="directInvoiceTo"
                value="gemeinde"
                checked={selectedInvoiceTo === 'gemeinde'}
                onChange={() => setSelectedInvoiceTo('gemeinde')}
                className="w-4 h-4 text-primary" />

                  <div data-ev-id="ev_30ec29d238" className="flex-1">
                    <span data-ev-id="ev_c036560547" className="font-medium text-foreground">Gemeinde</span>
                    <p data-ev-id="ev_e730660cfd" className="text-sm text-muted-foreground">Rechnung geht an die Gemeinde</p>
                  </div>
                </label>
              </div>

              {/* Mindestbestellwert Warnung */}
              {isOrderBelowMinOrderValue && (() => {
              const supplier = suppliers.find((s) => s.id === order.supplier_id);
              const supplierTotal = orders.
              filter((o) => (o.status === 'genehmigt' || o.status === 'eingereicht' || o.status === 'ausstehend_bereichsleitung' || o.status === 'ausstehend_kommandant' || o.status === 'freigegeben_bereichsleitung') && o.supplier_id === order.supplier_id).
              reduce((sum, o) => sum + o.amount, 0);
              return (
                <div data-ev-id="ev_7dcc964deb" className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div data-ev-id="ev_711f2d0e09" className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div data-ev-id="ev_2b45ff1db0" className="flex-1">
                        <p data-ev-id="ev_47b26f8934" className="text-sm font-medium text-amber-800">Mindestbestellwert nicht erreicht</p>
                        <p data-ev-id="ev_201024973f" className="text-sm text-amber-700 mt-1">
                          Lieferant: {supplier?.name || 'Unbekannt'}<br data-ev-id="ev_94ff6b5f6d" />
                          Aktuelle Summe: {supplierTotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €<br data-ev-id="ev_dd91724240" />
                          Mindestbestellwert: {supplier?.minimum_order_value?.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                        </p>
                        <label data-ev-id="ev_6f401dbcf1" className="flex items-center gap-2 mt-3 cursor-pointer">
                          <input data-ev-id="ev_2c7453e8a3"
                        type="checkbox"
                        checked={allowBelowMinOrder}
                        onChange={(e) => setAllowBelowMinOrder(e.target.checked)}
                        className="w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500" />

                          <span data-ev-id="ev_30264b1244" className="text-sm font-medium text-amber-800">Unter Mindestbestellwert bestellen erlauben</span>
                        </label>
                      </div>
                    </div>
                  </div>);

            })()}

              {/* Auszahlungsanweisung Checkbox - Direktfreigabe ist immer durch Kommandant */}
              <div data-ev-id="ev_direct_payment_order_checkbox" className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <label data-ev-id="ev_direct_payment_order_label" className="flex items-start gap-3 cursor-pointer">
                  <input data-ev-id="ev_direct_payment_order_input"
                type="checkbox"
                checked={createPaymentOrderOnApprove}
                onChange={(e) => setCreatePaymentOrderOnApprove(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-blue-400 text-blue-600 focus:ring-blue-500" />

                  <div data-ev-id="ev_direct_payment_order_text" className="flex-1">
                    <span data-ev-id="ev_direct_payment_order_title" className="font-medium text-blue-800 dark:text-blue-200">Genehmigte Auszahlungsanweisung erstellen</span>
                    <p data-ev-id="ev_direct_payment_order_desc" className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Erstellt automatisch eine BAR-Auszahlungsanweisung für den Einreicher ({order.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €). Der Kassier wird benachrichtigt.
                    </p>
                  </div>
                </label>
              </div>

              <div data-ev-id="ev_9748bd3d03" className="flex gap-3 justify-end">
                <button data-ev-id="ev_bf85e71ab0"
              onClick={() => setShowDirectApproveModal(false)}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors">
                  Abbrechen
                </button>
                <button data-ev-id="ev_b69c38e045"
              onClick={handleConfirmDirectApprove}
              disabled={directApproveLoading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                  {directApproveLoading ?
                <span data-ev-id="ev_389af73a69" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
                <CheckCircle className="w-4 h-4" />
                }
                  Direktfreigabe
                </button>
              </div>
            </div>
          </div>
        }

        {/* Reset Modal */}
        {showResetModal &&
        <div data-ev-id="ev_504978962c" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div data-ev-id="ev_ec1b45c0ed" className="bg-card rounded-xl border border-border p-6 w-full max-w-md">
              <div data-ev-id="ev_4ac87c50e2" className="flex items-center gap-3 mb-4">
                <div data-ev-id="ev_e4d2e1fef0" className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-amber-600" />
                </div>
                <h3 data-ev-id="ev_a735c7fa13" className="text-lg font-semibold text-foreground">Auf Entwurf zurücksetzen</h3>
              </div>
              
              <p data-ev-id="ev_096956ba3b" className="text-muted-foreground mb-4">
                Diese Bestellung wird auf Entwurf zurückgesetzt. Der Ersteller wird benachrichtigt und muss die Bestellung erneut einreichen.
              </p>
              
              <div data-ev-id="ev_058b57af93" className="mb-4">
                <label data-ev-id="ev_dfb1021175" className="block text-sm font-medium text-foreground mb-1.5">
                  Grund für die Zurücksetzung *
                </label>
                <textarea data-ev-id="ev_3b88ba46bc"
              value={resetReason}
              onChange={(e) => setResetReason(e.target.value)}
              placeholder="Bitte geben Sie einen Grund an..."
              rows={4}
              className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none" />

              </div>

              <div data-ev-id="ev_0c8a4b7763" className="flex gap-3 justify-end">
                <button data-ev-id="ev_fcbb8a8e67"
              onClick={() => {
                setShowResetModal(false);
                setResetReason('');
              }}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors">
                  Abbrechen
                </button>
                <button data-ev-id="ev_a575b5a5c5"
              onClick={handleReset}
              disabled={resettingOrder || !resetReason.trim()}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2">
                  {resettingOrder ?
                <span data-ev-id="ev_cef9bcc651" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
                <RotateCcw className="w-4 h-4" />
                }
                  Zurücksetzen
                </button>
              </div>
            </div>
          </div>
        }
        
        {/* Sammelbestellung Modal */}
        {showCollectiveOrderModal && collectiveOrderInfo &&
        <div data-ev-id="ev_15adcc1b2f" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div data-ev-id="ev_48305ec248" className="bg-card rounded-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div data-ev-id="ev_f225b78099" className="flex items-center justify-between mb-4">
                <div data-ev-id="ev_605149b6d6" className="flex items-center gap-3">
                  <div data-ev-id="ev_1d4b17e092" className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100">
                    <Layers className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 data-ev-id="ev_0be9843905" className="text-lg font-semibold text-foreground">Zugehörige Bestellungen</h3>
                </div>
                <button data-ev-id="ev_f025d9d611"
              onClick={() => setShowCollectiveOrderModal(false)}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div data-ev-id="ev_dc2fe64064" className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div data-ev-id="ev_5a712e18ac" className="flex items-start gap-3">
                  <Layers className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div data-ev-id="ev_c10b3852ae">
                    <p data-ev-id="ev_bd98a4fed0" className="text-sm font-medium text-blue-800">Sammelbestellung bei {collectiveOrderInfo.supplierName}</p>
                    <p data-ev-id="ev_5f198e8cb3" className="text-sm text-blue-700 mt-1">
                      Der Mindestbestellwert von <strong data-ev-id="ev_32b08a6665">{collectiveOrderInfo.minimum.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</strong> wird nur durch die Kombination mehrerer Bestellungen erreicht.
                    </p>
                    <p data-ev-id="ev_5a0fb9382b" className="text-sm text-blue-700 mt-2">
                      Aktuelle Gesamtsumme: <strong data-ev-id="ev_d190421684" className="text-blue-800">{collectiveOrderInfo.total.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div data-ev-id="ev_53d77166ee" className="mb-4">
                <p data-ev-id="ev_ec18fe4273" className="text-sm font-medium text-foreground mb-3">Folgende Bestellungen gehören zur Sammelbestellung:</p>
                <div data-ev-id="ev_9b05743d29" className="flex flex-col gap-2">
                  {/* Aktuelle Bestellung */}
                  <div data-ev-id="ev_c683de11b5" className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div data-ev-id="ev_2c9b7e7526" className="flex items-center justify-between">
                      <div data-ev-id="ev_f6cfcf724b" className="flex-1 min-w-0">
                        <p data-ev-id="ev_cbe2b3a85c" className="font-medium text-foreground truncate">{order.title}</p>
                        <p data-ev-id="ev_2052323fe4" className="text-xs text-muted-foreground">Diese Bestellung</p>
                      </div>
                      <span data-ev-id="ev_863dcd87f5" className="text-sm font-semibold text-blue-700">
                        {order.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                      </span>
                    </div>
                  </div>
                  
                  {/* Andere Bestellungen */}
                  {collectiveOrderInfo.otherOrders.map((otherOrder) =>
                <Link
                  key={otherOrder.id}
                  to={`/bestellungen/${otherOrder.id}`}
                  onClick={() => setShowCollectiveOrderModal(false)}
                  className="block p-3 bg-muted/50 border border-border rounded-lg hover:bg-muted transition-colors">
                      <div data-ev-id="ev_b76b42d891" className="flex items-center justify-between">
                        <div data-ev-id="ev_900d379bca" className="flex-1 min-w-0">
                          <p data-ev-id="ev_2639a00f24" className="font-medium text-foreground truncate hover:text-primary">{otherOrder.title}</p>
                          <p data-ev-id="ev_f5e92331c1" className="text-xs text-muted-foreground">
                            {otherOrder.creator?.full_name || 'Unbekannt'} • {new Date(otherOrder.created_at).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                        <span data-ev-id="ev_fe1688ac2f" className="text-sm font-semibold text-foreground">
                          {otherOrder.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                        </span>
                      </div>
                    </Link>
                )}
                </div>
              </div>

              <div data-ev-id="ev_8408729327" className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <p data-ev-id="ev_b0e89ff48b" className="text-sm text-amber-800">
                  <strong data-ev-id="ev_de0faa90cb">Hinweis:</strong> Bitte führen Sie diese Bestellungen gemeinsam als Sammelbestellung beim Lieferanten aus, um den Mindestbestellwert zu erreichen.
                </p>
              </div>

              <div data-ev-id="ev_5f0d79d181" className="flex gap-3">
                <button data-ev-id="ev_9f14d06c5b"
              onClick={() => setShowCollectiveOrderModal(false)}
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                  Verstanden
                </button>
              </div>
            </div>
          </div>
        }

        {/* Status ändern Modal */}
        {showStatusModal && order &&
        <div data-ev-id="ev_3092351e4a" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div data-ev-id="ev_aaf127599d" className="bg-card rounded-xl border border-border p-6 w-full max-w-md">
              <div data-ev-id="ev_242b948a65" className="flex items-center justify-between mb-4">
                <div data-ev-id="ev_6d79deb3d0" className="flex items-center gap-3">
                  <div data-ev-id="ev_d53697d88e" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-slate-600" />
                  </div>
                  <h3 data-ev-id="ev_99a34d7eae" className="text-lg font-semibold text-foreground">Status ändern</h3>
                </div>
                <button data-ev-id="ev_f9bb6795b7"
              onClick={() => {
                setShowStatusModal(false);
                setStatusChangeReason('');
              }}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">

                  <X className="w-5 h-5" />
                </button>
              </div>

              <div data-ev-id="ev_6bce25dd82" className="mb-4">
                <p data-ev-id="ev_d7dc441e0e" className="text-sm text-muted-foreground mb-2">
                  Aktueller Status: <span data-ev-id="ev_a30a224003" className="font-medium text-foreground">
                    {order.status === 'entwurf' && 'Entwurf'}
                    {order.status === 'eingereicht' && 'Eingereicht'}
                    {order.status === 'ausstehend_bereichsleitung' && 'Warte auf Bereichsleitung'}
                    {order.status === 'ausstehend_kommandant' && 'Warte auf Kommandant'}
                    {order.status === 'ausstehend_kommandomitglieder' && 'Warte auf Kommandomitglieder'}
                    {order.status === 'freigegeben_bereichsleitung' && 'Freigegeben (Bereichsleitung)'}
                    {order.status === 'freigegeben_kommandant' && 'Freigegeben (Kommandant)'}
                    {order.status === 'genehmigt' && 'Genehmigt'}
                    {order.status === 'abgelehnt' && 'Abgelehnt'}
                    {order.status === 'abgeschlossen' && 'Abgeschlossen'}
                  </span>
                </p>
              </div>

              <div data-ev-id="ev_36fb72ef76" className="mb-4">
                <label data-ev-id="ev_3075b69c4b" className="block text-sm font-medium text-foreground mb-2">Neuer Status</label>
                <select data-ev-id="ev_4140ab1c66"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">

                  <option data-ev-id="ev_0d011a0e4c" value="entwurf">Entwurf</option>
                  <option data-ev-id="ev_3e70620b9f" value="eingereicht">Eingereicht</option>
                  <option data-ev-id="ev_d697895278" value="ausstehend_bereichsleitung">Warte auf Bereichsleitung</option>
                  <option data-ev-id="ev_7bc9a9c754" value="ausstehend_kommandant">Warte auf Kommandant</option>
                  <option data-ev-id="ev_1958f06c05" value="ausstehend_kommandomitglieder">Warte auf Kommandomitglieder</option>
                  <option data-ev-id="ev_a5c628f4a9" value="freigegeben_bereichsleitung">Freigegeben (Bereichsleitung)</option>
                  <option data-ev-id="ev_freigeg_kdt" value="freigegeben_kommandant">Freigegeben (Kommandant)</option>
                  <option data-ev-id="ev_4a3b6932c2" value="genehmigt">Genehmigt</option>
                  <option data-ev-id="ev_ea7cd46280" value="abgelehnt">Abgelehnt</option>
                  <option data-ev-id="ev_be2dc27b50" value="abgeschlossen">Abgeschlossen</option>
                </select>
              </div>

              <div data-ev-id="ev_9e8a9ef0ff" className="mb-4">
                <label data-ev-id="ev_360a4eb81b" className="block text-sm font-medium text-foreground mb-2">
                  Begründung <span data-ev-id="ev_d05e9f8b6d" className="text-muted-foreground">(optional)</span>
                </label>
                <textarea data-ev-id="ev_4ad4e9a202"
              value={statusChangeReason}
              onChange={(e) => setStatusChangeReason(e.target.value)}
              placeholder="Warum wird der Status geändert?"
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={3} />

              </div>

              <div data-ev-id="ev_f0bc640e06" className="flex gap-3">
                <button data-ev-id="ev_c29f09bbd6"
              onClick={() => {
                setShowStatusModal(false);
                setStatusChangeReason('');
              }}
              disabled={statusChangeLoading}
              className="flex-1 px-4 py-2.5 border border-input rounded-lg font-medium hover:bg-muted transition-colors disabled:opacity-50">

                  Abbrechen
                </button>
                <button data-ev-id="ev_5e0911a8a6"
              onClick={async () => {
                if (newStatus === order.status) {
                  setShowStatusModal(false);
                  return;
                }
                setStatusChangeLoading(true);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Status-Typ wird dynamisch gesetzt
                await changeOrderStatus(order.id, newStatus as any, statusChangeReason || undefined);
                // Explizit Daten neu laden um UI zu aktualisieren
                await fetchOrders();
                setStatusChangeLoading(false);
                setShowStatusModal(false);
                setStatusChangeReason('');
                setNewStatus('');
              }}
              disabled={statusChangeLoading || newStatus === order.status}
              className="flex-1 px-4 py-2.5 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">

                  {statusChangeLoading ?
                <div data-ev-id="ev_e67727eade" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :

                <Settings className="w-4 h-4" />
                }
                  Status ändern
                </button>
              </div>
            </div>
          </div>
        }
      </div>

        {/* Eskalationsfrist verlängern Modal */}
        {showEscalationExtensionModal && order.submitted_at && (() => {
        // Berechne die aktuelle Frist
        let currentDeadline: Date;
        if (order.escalation_extended_until) {
          currentDeadline = new Date(order.escalation_extended_until);
        } else {
          currentDeadline = new Date(order.submitted_at);
          currentDeadline.setHours(currentDeadline.getHours() + escalationTimeoutHours);
        }

        return (
          <EscalationExtensionModal
            orderTitle={order.title}
            currentDeadline={currentDeadline}
            isExtended={!!order.escalation_extended_until}
            onClose={() => setShowEscalationExtensionModal(false)}
            onExtend={async (days, reason) => {
              const result = await extendEscalationDeadline(order.id, days, reason, escalationTimeoutHours);
              if (result.error) {
                throw result.error;
              }
            }} />);


      })()}
    </Layout>);

}