import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { usePaymentOrders, PaymentOrder, PaymentOrderInsert } from '@/hooks/usePaymentOrders';
import { useEventParticipations, EventParticipation } from '@/hooks/useEventParticipations';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { useModulePermissions } from '@/hooks/useModulePermissions';
import { generatePaymentOrderPdf } from '@/utils/generatePaymentOrderPdf';
import { Layout } from '@/components/Layout';
import { EventParticipationsSection } from '@/components/EventParticipationsSection';
import { FormGeneratorSection } from '@/components/FormGeneratorSection';
import { RentalContractsSection } from '@/components/RentalContractsSection';
import { CommandDecisionSection } from '@/components/CommandDecisionSection';
import { ExpenseReportSection } from '@/components/ExpenseReportSection';
import {
  FileText, Plus, Search, Filter, Download, Eye, Edit2, Trash2, Pencil,
  Send, CheckCircle, Banknote, Clock, X, ChevronDown, Upload, Paperclip, Image, File,
  XCircle, RotateCcw, AlertTriangle, CreditCard, Calendar, ArrowLeft, MapPin, Users,
  MailCheck, MailX, Loader2, ClipboardList, Package, Vote, Receipt } from
'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type ModuleType = 'none' | 'payment_orders' | 'event_participations' | 'form_generator' | 'rental_contracts' | 'command_decisions' | 'expense_reports';
type TabType = 'overview' | 'new';
type FilterStatus = 'all' | 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected';

export default function Antragsformulare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { paymentOrders, loading, createPaymentOrder, updatePaymentOrder, submitPaymentOrder, approvePaymentOrder, canApprovePaymentOrders, markAsPaid, deletePaymentOrder, rejectPaymentOrder, resetReferenceNumber } = usePaymentOrders();
  const { eventParticipations, loading: eventLoading, approveEventParticipation, rejectEventParticipation } = useEventParticipations();
  const { profiles } = useProfiles();
  const { profile, hasLimitedAccess } = useAuth();
  const { pdfBackgroundUrl, pdfBackgroundOpacity, commanderSignatureUrl, commanderStampUrl, antragsformulareViewUsers, loading: settingsLoading } = useSettings();
  const { hasModuleAccess } = useModulePermissions();

  // Check if user has 'nutzer' role - module permissions apply to them
  const shouldCheckPermissions = profile?.role === 'nutzer';

  const [selectedModule, setSelectedModule] = useState<ModuleType>('none');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<PaymentOrder | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingOrder, setRejectingOrder] = useState<PaymentOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<PaymentOrderInsert>({
    amount: 0,
    recipient_name: '',
    recipient_iban: '',
    purpose: '',
    payment_method: 'transfer',
    notes: '',
    attachment_url: null,
    attachment_name: null,
    no_expense_report_required: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Berechtigung für Genehmigung: Nur Kommandant oder Kommandant-Stellvertreter
  const canApprove = canApprovePaymentOrders;
  const isKassier = profile?.functions?.includes('kassier') || false;
  const isKommandomitglied = profile?.functions?.includes('kommandomitglied') || false;
  // Leserecht: Kassier, Kommandant, Admin, Kommandant-Stellvertreter, Kommandomitglieder (Transparenz)
  const canViewPaymentOrders = isKassier || profile?.role === 'kommandant' || profile?.role === 'admin' ||
  profile?.functions?.includes('kommandant_stellvertreter') || isKommandomitglied;
  const canMarkPaid = isKassier || profile?.role === 'kommandant' || profile?.role === 'admin';

  // Sicherheitscheck: Wenn Benutzer versucht auf payment_orders zuzugreifen ohne Berechtigung
  useEffect(() => {
    if (selectedModule === 'payment_orders' && !canViewPaymentOrders) {
      setSelectedModule('none');
    }
  }, [selectedModule, canViewPaymentOrders]);

  // URL-Parameter: Direkt zum Bearbeiten springen wenn ?edit=<id>
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && !loading && paymentOrders.length > 0) {
      const orderToEdit = paymentOrders.find((o) => o.id === editId && o.status === 'draft');
      if (orderToEdit) {
        // Setze Modul auf Auszahlungsanweisungen
        setSelectedModule('payment_orders');
        // Öffne Bearbeitungsmodus
        setFormData({
          amount: orderToEdit.amount,
          recipient_name: orderToEdit.recipient_name,
          recipient_iban: orderToEdit.recipient_iban || '',
          purpose: orderToEdit.purpose,
          notes: orderToEdit.notes || '',
          payment_method: orderToEdit.payment_method,
          is_direct_to_organizer: orderToEdit.is_direct_to_organizer,
          no_expense_report_required: orderToEdit.no_expense_report_required
        });
        setEditingOrderId(orderToEdit.id);
        setActiveTab('new');
        // Parameter aus URL entfernen
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, loading, paymentOrders, setSearchParams]);

  const canDelete = isKassier || profile?.role === 'admin';
  const canResetReference = profile?.role === 'admin';

  // Check visibility - if no users are set, allow admin/kommandant/kassier by default
  const hasAccess = profile && (
  profile.role === 'admin' ||
  profile.role === 'kommandant' ||
  isKassier ||
  antragsformulareViewUsers?.length > 0 && antragsformulareViewUsers.includes(profile.id));


  // Get commander name for signature
  const commanderProfile = profiles.find((p) => p.role === 'kommandant');
  const commanderName = commanderProfile?.full_name || 'Kommandant';

  const handleDownloadPdf = async (order: PaymentOrder) => {
    console.log('[Antragsformulare] Starting PDF download for order:', order.id, order.reference_number);
    try {
      await generatePaymentOrderPdf({
        order,
        creatorName: getProfileName(order.created_by),
        approverName: order.approved_by ? getProfileName(order.approved_by) : undefined,
        paidByName: order.paid_by ? getProfileName(order.paid_by) : undefined,
        pdfBackgroundUrl,
        pdfBackgroundOpacity,
        signatureUrl: commanderSignatureUrl,
        stampUrl: commanderStampUrl,
        commanderName
      });
      console.log('[Antragsformulare] PDF download completed successfully');
    } catch (err) {
      console.error('[Antragsformulare] PDF Error:', err);
      alert('Fehler beim Erstellen des PDFs: ' + (err instanceof Error ? err.message : String(err)));
    }
  };



  const getProfileName = (id: string | null) => {
    if (!id) return '-';
    return profiles.find((p) => p.id === id)?.full_name || 'Unbekannt';
  };

  const getStatusBadge = (status: PaymentOrder['status']) => {
    const styles: Record<PaymentOrder['status'], string> = {
      draft: 'bg-gray-100 text-gray-700',
      submitted: 'bg-orange-100 text-orange-700',
      approved: 'bg-green-100 text-green-700',
      paid: 'bg-purple-100 text-purple-700',
      rejected: 'bg-red-100 text-red-700'
    };
    const labels: Record<PaymentOrder['status'], string> = {
      draft: 'Entwurf',
      submitted: 'Eingereicht',
      approved: 'Genehmigt',
      paid: 'Ausgezahlt',
      rejected: 'Abgelehnt'
    };
    return (
      <span data-ev-id="ev_b393a57790" className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>);
  };

  const getRowBackground = (status: PaymentOrder['status']) => {
    const colors: Record<PaymentOrder['status'], string> = {
      draft: 'bg-gray-50/50',
      submitted: 'bg-orange-50/50',
      approved: 'bg-green-50/50',
      paid: 'bg-purple-50/50',
      rejected: 'bg-red-50/50'
    };
    return colors[status];
  };

  const filteredOrders = paymentOrders.filter((order) => {
    if (filterStatus !== 'all' && order.status !== filterStatus) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        order.reference_number.toLowerCase().includes(search) ||
        order.recipient_name.toLowerCase().includes(search) ||
        order.purpose.toLowerCase().includes(search));

    }
    return true;
  });

  const validateForm = () => {
    if (!formData.amount || !formData.recipient_name || !formData.purpose) {
      alert('Bitte füllen Sie alle Pflichtfelder aus.');
      return false;
    }
    if (formData.payment_method === 'transfer' && !formData.recipient_iban) {
      alert('Bitte geben Sie die IBAN für die Überweisung an.');
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setFormData({
      amount: 0,
      recipient_name: '',
      recipient_iban: '',
      purpose: '',
      payment_method: 'transfer',
      notes: '',
      attachment_url: null,
      attachment_name: null,
      no_expense_report_required: false
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Nur Bilder (JPG, PNG, WebP) oder PDF-Dateien erlaubt.');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Datei ist zu gro\u00df. Maximal 5 MB erlaubt.');
      return;
    }

    setUploadingFile(true);
    try {
      const ext = file.name.split('.').pop();
      const filename = `payment-attachment-${Date.now()}.${ext}`;

      const { error } = await supabase.storage.
      from('signatures').
      upload(filename, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage.
      from('signatures').
      getPublicUrl(filename);

      setFormData({
        ...formData,
        attachment_url: urlData.publicUrl,
        attachment_name: file.name
      });
    } catch (err) {
      console.error('Upload error:', err);
      alert('Fehler beim Hochladen der Datei.');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const removeAttachment = async () => {
    if (!formData.attachment_url || !supabase) return;

    const path = formData.attachment_url.split('/signatures/')[1];
    if (path) {
      await supabase.storage.from('signatures').remove([path]);
    }
    setFormData({
      ...formData,
      attachment_url: null,
      attachment_name: null
    });
  };

  // Start editing a draft order
  const startEditingOrder = (order: PaymentOrder) => {
    setFormData({
      amount: order.amount,
      recipient_name: order.recipient_name,
      recipient_iban: order.recipient_iban || '',
      purpose: order.purpose,
      payment_method: order.payment_method,
      notes: order.notes || '',
      attachment_url: order.attachment_url,
      attachment_name: order.attachment_name,
      linked_event_participation_id: order.linked_event_participation_id,
      is_direct_to_organizer: order.is_direct_to_organizer,
      no_expense_report_required: order.no_expense_report_required
    });
    setEditingOrderId(order.id);
    setActiveTab('new');
  };

  // Cancel editing and reset form
  const cancelEditing = () => {
    resetForm();
    setEditingOrderId(null);
    setActiveTab('overview');
  };

  const handleCreateOrder = async (andSubmit: boolean = false) => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (editingOrderId) {
        // Update existing draft
        await updatePaymentOrder(editingOrderId, formData);

        // Wenn "Speichern & Einreichen" gewählt wurde
        if (andSubmit) {
          await submitPaymentOrder(editingOrderId);
        }
      } else {
        // Create new order
        const newOrder = await createPaymentOrder(formData);

        // Wenn "Speichern & Einreichen" gewählt wurde
        if (andSubmit && newOrder) {
          await submitPaymentOrder(newOrder.id);
        }
      }

      resetForm();
      setEditingOrderId(null);
      setActiveTab('overview');
    } catch (err) {
      alert(editingOrderId ? 'Fehler beim Aktualisieren der Auszahlungsanweisung' : 'Fehler beim Erstellen der Auszahlungsanweisung');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitOrder = async (id: string) => {
    if (confirm('Möchten Sie diese Auszahlungsanweisung einreichen?')) {
      await submitPaymentOrder(id);
    }
  };

  const handleApproveOrder = async (id: string) => {
    if (confirm('Möchten Sie diese Auszahlungsanweisung genehmigen?')) {
      await approvePaymentOrder(id);
    }
  };

  const handleMarkPaid = async (id: string) => {
    if (confirm('Möchten Sie diese Auszahlungsanweisung als ausgezahlt markieren?')) {
      await markAsPaid(id);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
      await deletePaymentOrder(id);
    }
  };

  const openRejectModal = (order: PaymentOrder) => {
    setRejectingOrder(order);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectOrder = async () => {
    if (!rejectingOrder || !rejectionReason.trim()) {
      alert('Bitte geben Sie einen Grund für die Ablehnung an.');
      return;
    }
    try {
      await rejectPaymentOrder(rejectingOrder.id, rejectionReason.trim());
      setShowRejectModal(false);
      setRejectingOrder(null);
      setRejectionReason('');
    } catch (err) {
      alert('Fehler beim Ablehnen der Auszahlungsanweisung');
    }
  };

  const handleResetReference = async (order: PaymentOrder) => {
    if (confirm(`Möchten Sie die Referenznummer für "${order.reference_number}" wirklich zurücksetzen?`)) {
      try {
        const newRef = await resetReferenceNumber(order.id);
        alert(`Neue Referenznummer: ${newRef}`);
      } catch (err) {
        alert('Fehler beim Zurücksetzen der Referenznummer');
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Group configuration for grouped view - ordered by priority/action needed
  const statusGroups: Array<{
    status: PaymentOrder['status'];
    label: string;
    icon: typeof Send;
    bgColor: string;
    iconColor: string;
    priority: number;
  }> = [
  { status: 'draft', label: 'Entwürfe', icon: Clock, bgColor: 'bg-gray-50 border-gray-300', iconColor: 'text-gray-600', priority: 1 },
  { status: 'submitted', label: 'Eingereicht', icon: Send, bgColor: 'bg-orange-50 border-orange-200', iconColor: 'text-orange-600', priority: 2 },
  { status: 'approved', label: 'Genehmigt (zur Auszahlung)', icon: CheckCircle, bgColor: 'bg-green-50 border-green-200', iconColor: 'text-green-600', priority: 3 },
  { status: 'paid', label: 'Ausgezahlt', icon: Banknote, bgColor: 'bg-purple-50 border-purple-200', iconColor: 'text-purple-600', priority: 4 },
  { status: 'rejected', label: 'Abgelehnt', icon: XCircle, bgColor: 'bg-red-50 border-red-200', iconColor: 'text-red-600', priority: 5 }];


  // Wait for settings to load before checking access
  if (settingsLoading) {
    return (
      <Layout>
        <div data-ev-id="ev_bc57244191" className="flex items-center justify-center py-16">
          <div data-ev-id="ev_73b527153a" className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </Layout>);

  }

  // Access check
  if (!hasAccess) {
    return (
      <Layout>
        <div data-ev-id="ev_39957b482f" className="flex flex-col items-center justify-center py-16">
          <XCircle className="w-16 h-16 text-red-400 mb-4" />
          <h2 data-ev-id="ev_e899b27485" className="text-xl font-semibold text-foreground mb-2">Kein Zugriff</h2>
          <p data-ev-id="ev_e6d2251d7b" className="text-muted-foreground text-center max-w-md">
            Sie haben keine Berechtigung, auf die Formulare zuzugreifen. 
            Bitte wenden Sie sich an Ihren Administrator.
          </p>
        </div>
      </Layout>);

  }

  // Show Event Participations module
  if (selectedModule === 'event_participations') {
    return (
      <Layout>
        <EventParticipationsSection onBack={() => setSelectedModule('none')} />
      </Layout>);
  }

  // Show Form Generator module
  if (selectedModule === 'form_generator') {
    return (
      <Layout>
        <FormGeneratorSection onBack={() => setSelectedModule('none')} />
      </Layout>);

  }

  // Show Rental Contracts module
  if (selectedModule === 'rental_contracts') {
    return (
      <Layout>
        <RentalContractsSection onBack={() => setSelectedModule('none')} />
      </Layout>);

  }

  // Show Command Decisions module
  if (selectedModule === 'command_decisions') {
    return (
      <Layout>
        <CommandDecisionSection onBack={() => setSelectedModule('none')} />
      </Layout>);

  }

  // Show Expense Reports module
  if (selectedModule === 'expense_reports') {
    return (
      <Layout>
        <ExpenseReportSection onBack={() => setSelectedModule('none')} />
      </Layout>);
  }

  // Show Module Selection
  if (selectedModule === 'none') {
    // Get pending items for overview
    const pendingPaymentOrders = paymentOrders.filter((o) => o.status === 'submitted');
    const pendingEventParticipations = eventParticipations.filter((e) => e.status === 'submitted');
    const totalPending = pendingPaymentOrders.length + pendingEventParticipations.length;

    const formatCurrencyOverview = (amount: number) => {
      return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
    };

    const formatDateOverview = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };

    return (
      <Layout>
        <div data-ev-id="ev_5d23b2e944" className="space-y-6">
          <div data-ev-id="ev_07babd9d30">
            <h1 data-ev-id="ev_7fe718b373" className="text-2xl font-bold text-foreground">Formulare</h1>
            <p data-ev-id="ev_8933074a4c" className="text-muted-foreground">Wählen Sie einen Antragstyp aus</p>
          </div>

          <div data-ev-id="ev_8cad1715e4" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Payment Orders Card - nur für Kassier, Kommandant und Admin */}
            {canViewPaymentOrders &&
            <button data-ev-id="ev_af5f5d2793"
            onClick={() => setSelectedModule('payment_orders')}
            className="bg-card border border-border rounded-xl p-6 text-left hover:border-primary hover:shadow-lg transition-all group">

              <div data-ev-id="ev_e75b341051" className="flex items-start gap-4">
                <div data-ev-id="ev_4a7fc1b035" className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                  <CreditCard className="w-8 h-8 text-purple-600" />
                </div>
                <div data-ev-id="ev_31e529fbd3" className="flex-1">
                  <h3 data-ev-id="ev_9475bbcd73" className="text-lg font-semibold text-foreground mb-1">Auszahlungsanweisungen</h3>
                  <p data-ev-id="ev_257aa598d8" className="text-sm text-muted-foreground mb-3">
                    Erstellen und verwalten Sie Auszahlungsanweisungen für Erstattungen und Zahlungen.
                  </p>
                  <div data-ev-id="ev_f17a030daf" className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span data-ev-id="ev_5f664455bf" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {paymentOrders.filter((o) => o.status === 'draft').length} Entwürfe
                    </span>
                    <span data-ev-id="ev_aa9a4fc7f4" className="flex items-center gap-1">
                      <Send className="w-3 h-3" />
                      {pendingPaymentOrders.length} Eingereicht
                    </span>
                  </div>
                </div>
              </div>
            </button>
            }

            {/* Event Participations Card - check permissions for nutzer role */}
            {(!shouldCheckPermissions || hasModuleAccess('teilnahme_veranstaltung')) &&
            <button data-ev-id="ev_c668407e96"
            onClick={() => setSelectedModule('event_participations')}
            className="bg-card border border-border rounded-xl p-6 text-left hover:border-primary hover:shadow-lg transition-all group">

              <div data-ev-id="ev_01bee12d4a" className="flex items-start gap-4">
                <div data-ev-id="ev_e28e91da8b" className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
                <div data-ev-id="ev_8fe6179ce8" className="flex-1">
                  <h3 data-ev-id="ev_d6ff6351db" className="text-lg font-semibold text-foreground mb-1">Teilnahme Veranstaltung</h3>
                  <p data-ev-id="ev_f12b9b70b8" className="text-sm text-muted-foreground mb-3">
                    Beantragen Sie die Teilnahme an Veranstaltungen, Kursen und Fortbildungen.
                  </p>
                  <div data-ev-id="ev_47e2549bcc" className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span data-ev-id="ev_cc44462aef" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {eventParticipations.filter((e) => e.status === 'draft').length} Entwürfe
                    </span>
                    <span data-ev-id="ev_ef817ef384" className="flex items-center gap-1">
                      <Send className="w-3 h-3" />
                      {pendingEventParticipations.length} Eingereicht
                    </span>
                  </div>
                </div>
              </div>
            </button>
            }

            {/* Form Generator Card - check permissions for nutzer role */}
            {(!shouldCheckPermissions || hasModuleAccess('formulargenerator')) &&
            <button data-ev-id="ev_1e0d8ce659"
            onClick={() => setSelectedModule('form_generator')}
            className="bg-card border border-border rounded-xl p-6 text-left hover:border-primary hover:shadow-lg transition-all group">

              <div data-ev-id="ev_8ac305ebd4" className="flex items-start gap-4">
                <div data-ev-id="ev_fc4bc1d68d" className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                  <ClipboardList className="w-8 h-8 text-green-600" />
                </div>
                <div data-ev-id="ev_d11ad7db4b" className="flex-1">
                  <h3 data-ev-id="ev_91ac65efca" className="text-lg font-semibold text-foreground mb-1">Formulargenerator</h3>
                  <p data-ev-id="ev_2493d205f8" className="text-sm text-muted-foreground mb-3">
                    Erstellen Sie Anmeldeformulare für Veranstaltungen zum Aushängen.
                  </p>
                  <div data-ev-id="ev_cbc1ec29b6" className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span data-ev-id="ev_b31a83d691" className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      PDF-Export
                    </span>
                  </div>
                </div>
              </div>
            </button>
            }

            {/* Rental Contracts Card - check permissions for nutzer role */}
            {(!shouldCheckPermissions || hasModuleAccess('leihvertraege')) &&
            <button data-ev-id="ev_34022f2384"
            onClick={() => setSelectedModule('rental_contracts')}
            className="bg-card border border-border rounded-xl p-6 text-left hover:border-primary hover:shadow-lg transition-all group">

              <div data-ev-id="ev_0d5d6886d0" className="flex items-start gap-4">
                <div data-ev-id="ev_f6504a7cae" className="p-3 bg-orange-100 rounded-xl group-hover:bg-orange-200 transition-colors">
                  <Package className="w-8 h-8 text-orange-600" />
                </div>
                <div data-ev-id="ev_623049a3cf" className="flex-1">
                  <h3 data-ev-id="ev_a887e0cecd" className="text-lg font-semibold text-foreground mb-1">Leihverträge</h3>
                  <p data-ev-id="ev_37fc02fa90" className="text-sm text-muted-foreground mb-3">
                    Erstellen Sie Leihverträge für Zelte, Tische, Bänke und andere Leihgeräte.
                  </p>
                  <div data-ev-id="ev_67f0acfd41" className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span data-ev-id="ev_0f2eea3149" className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Vertragsverwaltung
                    </span>
                  </div>
                </div>
              </div>
            </button>
            }

            {/* Command Decisions Card - nur für Kommandomitglieder, Kommandant und Admin */}
            {(isKommandomitglied || profile?.role === 'kommandant' || profile?.role === 'admin') &&
            <button data-ev-id="ev_ca7bd931da"
            onClick={() => setSelectedModule('command_decisions')}
            className="bg-card border border-border rounded-xl p-6 text-left hover:border-primary hover:shadow-lg transition-all group">

              <div data-ev-id="ev_58b868d789" className="flex items-start gap-4">
                <div data-ev-id="ev_38b0e9d24c" className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                  <Vote className="w-8 h-8 text-purple-600" />
                </div>
                <div data-ev-id="ev_b609f67105" className="flex-1">
                  <h3 data-ev-id="ev_b0e31b78eb" className="text-lg font-semibold text-foreground mb-1">Kommandoabstimmung</h3>
                  <p data-ev-id="ev_fb789cbd61" className="text-sm text-muted-foreground mb-3">
                    Erstellen Sie Anträge zur Abstimmung durch das Kommando.
                  </p>
                  <div data-ev-id="ev_9354a67bd5" className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span data-ev-id="ev_ff5cc95be0" className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Kommandomitglieder
                    </span>
                  </div>
                </div>
              </div>
            </button>
            }

            {/* Expense Reports Card - Ausgaben-Abrechnung - check permissions for nutzer role */}
            {(!shouldCheckPermissions || hasModuleAccess('ausgabenabrechnung')) &&
            <button data-ev-id="ev_5a6761337b"
            onClick={() => setSelectedModule('expense_reports')}
            className="bg-card border border-border rounded-xl p-6 text-left hover:border-primary hover:shadow-lg transition-all group">

              <div data-ev-id="ev_19019e2769" className="flex items-start gap-4">
                <div data-ev-id="ev_669f301265" className="p-3 bg-emerald-100 rounded-xl group-hover:bg-emerald-200 transition-colors">
                  <Receipt className="w-8 h-8 text-emerald-600" />
                </div>
                <div data-ev-id="ev_dbab3221f1" className="flex-1">
                  <h3 data-ev-id="ev_3f4109a16a" className="text-lg font-semibold text-foreground mb-1">Ausgaben-Abrechnung</h3>
                  <p data-ev-id="ev_08f41e483b" className="text-sm text-muted-foreground mb-3">
                    Spesenabrechnung für Veranstaltungen mit Vorschuss-Verknüpfung.
                  </p>
                  <div data-ev-id="ev_90f42462ae" className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span data-ev-id="ev_16f584df66" className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      Mit Auszahlungsanweisung
                    </span>
                  </div>
                </div>
              </div>
            </button>
            }
          </div>

          {/* Pending Approvals Section */}
          {canApprove && totalPending > 0 &&
          <div data-ev-id="ev_9fe0786e26" className="space-y-4">
              <div data-ev-id="ev_4ebfd12fba" className="flex items-center gap-2">
                <Send className="w-5 h-5 text-orange-600" />
                <h2 data-ev-id="ev_fafd783696" className="text-lg font-semibold text-foreground">Offene Freigaben ({totalPending})</h2>
              </div>

              {/* Pending Payment Orders */}
              {pendingPaymentOrders.length > 0 &&
            <div data-ev-id="ev_a3e9a06ba2" className="bg-card border border-orange-200 rounded-lg overflow-hidden">
                  <div data-ev-id="ev_e89192e07b" className="bg-orange-50 px-4 py-3 border-b border-orange-200">
                    <div data-ev-id="ev_d144055f9f" className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-purple-600" />
                      <span data-ev-id="ev_845f1df6b1" className="font-medium text-foreground">Auszahlungsanweisungen ({pendingPaymentOrders.length})</span>
                    </div>
                  </div>
                  <div data-ev-id="ev_e341606c56" className="divide-y divide-border">
                    {pendingPaymentOrders.map((order) =>
                <div data-ev-id="ev_3a622c098b"
                key={order.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">

                        <div data-ev-id="ev_2cc96b9ad4" className="flex items-center gap-4">
                          <div data-ev-id="ev_8fb38d812e" className="p-2 bg-purple-100 rounded-lg">
                            <CreditCard className="w-4 h-4 text-purple-600" />
                          </div>
                          <div data-ev-id="ev_504071e9ab">
                            <div data-ev-id="ev_6ce8b230ac" className="font-medium">{order.recipient_name}</div>
                            <div data-ev-id="ev_89611d626c" className="text-sm text-muted-foreground">
                              {order.reference_number} • {order.purpose.substring(0, 50)}{order.purpose.length > 50 ? '...' : ''}
                            </div>
                          </div>
                        </div>
                        <div data-ev-id="ev_5cd698c0f1" className="flex items-center gap-4">
                          <div data-ev-id="ev_c9ca4e7930" className="text-right">
                            <div data-ev-id="ev_45b6935453" className="font-semibold text-purple-600">{formatCurrencyOverview(order.amount)}</div>
                            <div data-ev-id="ev_dfdf0dcb2b" className="text-xs text-muted-foreground">
                              {getProfileName(order.created_by)}
                            </div>
                          </div>
                          <div data-ev-id="ev_c87572515b" className="flex gap-1">
                            <button data-ev-id="ev_80a070d1f6"
                      onClick={() => handleApproveOrder(order.id)}
                      className="p-2 hover:bg-green-100 rounded-lg transition-colors text-green-600"
                      title="Genehmigen">

                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button data-ev-id="ev_ea9caab6bc"
                      onClick={() => openRejectModal(order)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                      title="Ablehnen">

                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                )}
                  </div>
                </div>
            }

              {/* Pending Event Participations */}
              {pendingEventParticipations.length > 0 &&
            <div data-ev-id="ev_5d1021e342" className="bg-card border border-orange-200 rounded-lg overflow-hidden">
                  <div data-ev-id="ev_90e9b079a6" className="bg-orange-50 px-4 py-3 border-b border-orange-200">
                    <div data-ev-id="ev_05bc16d146" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span data-ev-id="ev_8f337cc953" className="font-medium text-foreground">Veranstaltungsteilnahmen ({pendingEventParticipations.length})</span>
                    </div>
                  </div>
                  <div data-ev-id="ev_eea0f65cce" className="divide-y divide-border">
                    {pendingEventParticipations.map((entry) =>
                <div data-ev-id="ev_8296f84027"
                key={entry.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">

                        <div data-ev-id="ev_b6ee699c0a" className="flex items-center gap-4">
                          <div data-ev-id="ev_24b1a588cd" className="p-2 bg-blue-100 rounded-lg">
                            <Calendar className="w-4 h-4 text-blue-600" />
                          </div>
                          <div data-ev-id="ev_b11ecf6b34">
                            <div data-ev-id="ev_8f2bb7f3ad" className="font-medium">{entry.event_name}</div>
                            <div data-ev-id="ev_749988065c" className="text-sm text-muted-foreground flex items-center gap-3">
                              <span data-ev-id="ev_2e263215aa">{entry.reference_number}</span>
                              <span data-ev-id="ev_f39cd7d006" className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {entry.event_location || 'Kein Ort'}
                              </span>
                              <span data-ev-id="ev_dc5464ff82" className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {entry.max_participants} Teilnehmer
                              </span>
                            </div>
                          </div>
                        </div>
                        <div data-ev-id="ev_31af1edc50" className="flex items-center gap-4">
                          <div data-ev-id="ev_57d5af8908" className="text-right">
                            <div data-ev-id="ev_fd677b5e69" className="font-semibold text-blue-600">{formatDateOverview(entry.event_date)}</div>
                            <div data-ev-id="ev_c8a325ecf4" className="text-xs text-muted-foreground">
                              {getProfileName(entry.created_by)} • {formatCurrencyOverview(entry.estimated_costs)}
                            </div>
                          </div>
                          <div data-ev-id="ev_2a1b636270" className="flex gap-1">
                            <button data-ev-id="ev_ec204c7d8c"
                      onClick={async () => {
                        if (confirm('Möchten Sie diesen Antrag genehmigen?')) {
                          await approveEventParticipation(entry.id);
                        }
                      }}
                      className="p-2 hover:bg-green-100 rounded-lg transition-colors text-green-600"
                      title="Genehmigen">

                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button data-ev-id="ev_28660c37e1"
                      onClick={() => {
                        const reason = prompt('Bitte geben Sie einen Grund für die Ablehnung an:');
                        if (reason) {
                          rejectEventParticipation(entry.id, reason);
                        }
                      }}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                      title="Ablehnen">

                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                )}
                  </div>
                </div>
            }
            </div>
          }

          {/* No pending items message for approvers */}
          {canApprove && totalPending === 0 &&
          <div data-ev-id="ev_36fc9ef200" className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p data-ev-id="ev_c9565a1a28" className="text-green-700 font-medium">Keine offenen Freigaben</p>
              <p data-ev-id="ev_f5c9749493" className="text-green-600 text-sm">Alle Anträge wurden bearbeitet.</p>
            </div>
          }
        </div>
      </Layout>);

  }

  // Show Payment Orders module (selectedModule === 'payment_orders')
  return (
    <Layout>
    <div data-ev-id="ev_469aaaf5d6" className="space-y-6">
      {/* Header */}
      <div data-ev-id="ev_09d95cfdad" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div data-ev-id="ev_003d04b877" className="flex items-center gap-4">
          <button data-ev-id="ev_617533d494"
            onClick={() => setSelectedModule('none')}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="Zurück zur Auswahl">

            <ArrowLeft className="w-5 h-5" />
          </button>
          <div data-ev-id="ev_c6346259d3">
            <h1 data-ev-id="ev_aa02ec02f0" className="text-2xl font-bold text-foreground">Auszahlungsanweisungen</h1>
            <p data-ev-id="ev_5ecf2ab384" className="text-muted-foreground">Erstellen und verwalten</p>
          </div>
        </div>
        <div data-ev-id="ev_bb7c60a8cf" className="flex gap-2">
          <button data-ev-id="ev_f371c71f18"
            onClick={() => setActiveTab('new')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">

            <Plus className="w-4 h-4" />
            Neue Auszahlungsanweisung
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div data-ev-id="ev_15f7cf13ab" className="flex gap-2 border-b border-border">
        <button data-ev-id="ev_14389edf0f"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
          activeTab === 'overview' ?
          'border-primary text-primary' :
          'border-transparent text-muted-foreground hover:text-foreground'}`
          }>

          <FileText className="w-4 h-4 inline mr-2" />
          Übersicht
        </button>
        <button data-ev-id="ev_12f52b9e37"
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
          activeTab === 'new' ?
          'border-primary text-primary' :
          'border-transparent text-muted-foreground hover:text-foreground'}`
          }>

          <Plus className="w-4 h-4 inline mr-2" />
          Neue Anweisung
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' &&
        <div data-ev-id="ev_74da43012d" className="space-y-4">
          {/* Filters */}
          <div data-ev-id="ev_0f2dd5c052" className="flex flex-col sm:flex-row gap-4">
            <div data-ev-id="ev_0970cd0141" className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input data-ev-id="ev_63009839c9"
              type="text"
              placeholder="Suchen nach Referenz, Empfänger, Zweck..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background" />

            </div>
            <div data-ev-id="ev_de1a40f631" className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select data-ev-id="ev_b88411b159"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="pl-10 pr-8 py-2 border border-input rounded-lg bg-background appearance-none cursor-pointer">

                <option data-ev-id="ev_54c3ed520c" value="all">Alle Status</option>
                <option data-ev-id="ev_c84e3b65e0" value="draft">Entwurf</option>
                <option data-ev-id="ev_9375781c46" value="submitted">Eingereicht</option>
                <option data-ev-id="ev_71bd3cedb9" value="approved">Genehmigt</option>
                <option data-ev-id="ev_6e6d1fd017" value="paid">Ausgezahlt</option>
                <option data-ev-id="ev_f93e820769" value="rejected">Abgelehnt</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            <div data-ev-id="ev_8f747cfbc0" className="flex rounded-lg border border-input overflow-hidden">
              <button data-ev-id="ev_cacb84d368"
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`
              }>

                Liste
              </button>
              <button data-ev-id="ev_5037b07c0b"
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'grouped' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`
              }>

                Gruppiert
              </button>
            </div>
          </div>

          {/* Stats - Clickable to filter */}
          <div data-ev-id="ev_be43782e83" className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <button data-ev-id="ev_bae65e1813"
            onClick={() => setFilterStatus(filterStatus === 'draft' ? 'all' : 'draft')}
            className={`bg-card border rounded-lg p-4 text-left transition-all hover:shadow-md ${filterStatus === 'draft' ? 'border-gray-500 ring-2 ring-gray-200' : 'border-border'}`}>
              <div data-ev-id="ev_dc371fedf0" className="flex items-center gap-3">
                <div data-ev-id="ev_6e1d6ebb12" className="p-2 bg-gray-100 rounded-lg">
                  <Clock className="w-5 h-5 text-gray-600" />
                </div>
                <div data-ev-id="ev_6615833580">
                  <p data-ev-id="ev_17c5eb3a48" className="text-2xl font-bold">{paymentOrders.filter((o) => o.status === 'draft').length}</p>
                  <p data-ev-id="ev_4165c30db1" className="text-sm text-muted-foreground">Entwürfe</p>
                </div>
              </div>
            </button>
            <button data-ev-id="ev_425c70fbfa"
            onClick={() => setFilterStatus(filterStatus === 'submitted' ? 'all' : 'submitted')}
            className={`bg-card border rounded-lg p-4 text-left transition-all hover:shadow-md ${filterStatus === 'submitted' ? 'border-orange-500 ring-2 ring-orange-200' : 'border-border'}`}>
              <div data-ev-id="ev_d3cd447705" className="flex items-center gap-3">
                <div data-ev-id="ev_633820741d" className="p-2 bg-orange-100 rounded-lg">
                  <Send className="w-5 h-5 text-orange-600" />
                </div>
                <div data-ev-id="ev_c06c9316f4">
                  <p data-ev-id="ev_6f69786a95" className="text-2xl font-bold">{paymentOrders.filter((o) => o.status === 'submitted').length}</p>
                  <p data-ev-id="ev_bd3e6f16d2" className="text-sm text-muted-foreground">Eingereicht</p>
                </div>
              </div>
            </button>
            <button data-ev-id="ev_12f36fdef6"
            onClick={() => setFilterStatus(filterStatus === 'approved' ? 'all' : 'approved')}
            className={`bg-card border rounded-lg p-4 text-left transition-all hover:shadow-md ${filterStatus === 'approved' ? 'border-green-500 ring-2 ring-green-200' : 'border-border'}`}>
              <div data-ev-id="ev_edf01b7cc4" className="flex items-center gap-3">
                <div data-ev-id="ev_30e98c87f0" className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div data-ev-id="ev_b3295cdbab">
                  <p data-ev-id="ev_4eb83b67f3" className="text-2xl font-bold">{paymentOrders.filter((o) => o.status === 'approved').length}</p>
                  <p data-ev-id="ev_2000a8c0ab" className="text-sm text-muted-foreground">Genehmigt</p>
                </div>
              </div>
            </button>
            <button data-ev-id="ev_40abaf6993"
            onClick={() => setFilterStatus(filterStatus === 'paid' ? 'all' : 'paid')}
            className={`bg-card border rounded-lg p-4 text-left transition-all hover:shadow-md ${filterStatus === 'paid' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-border'}`}>
              <div data-ev-id="ev_ee1ea42f99" className="flex items-center gap-3">
                <div data-ev-id="ev_9dd2a66dd3" className="p-2 bg-purple-100 rounded-lg">
                  <Banknote className="w-5 h-5 text-purple-600" />
                </div>
                <div data-ev-id="ev_066016db80">
                  <p data-ev-id="ev_93d5b11dcd" className="text-2xl font-bold">{paymentOrders.filter((o) => o.status === 'paid').length}</p>
                  <p data-ev-id="ev_13a51c93a5" className="text-sm text-muted-foreground">Ausgezahlt</p>
                </div>
              </div>
            </button>
            <button data-ev-id="ev_e7b8ee9811"
            onClick={() => setFilterStatus(filterStatus === 'rejected' ? 'all' : 'rejected')}
            className={`bg-card border rounded-lg p-4 text-left transition-all hover:shadow-md ${filterStatus === 'rejected' ? 'border-red-500 ring-2 ring-red-200' : 'border-border'}`}>
              <div data-ev-id="ev_e87158bf24" className="flex items-center gap-3">
                <div data-ev-id="ev_06482629e7" className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div data-ev-id="ev_5fe7e004ad">
                  <p data-ev-id="ev_3d5c8dc0a4" className="text-2xl font-bold">{paymentOrders.filter((o) => o.status === 'rejected').length}</p>
                  <p data-ev-id="ev_72ec0973ea" className="text-sm text-muted-foreground">Abgelehnt</p>
                </div>
              </div>
            </button>
          </div>

          {/* Table */}
          {loading ?
          <div data-ev-id="ev_353394d8a0" className="text-center py-12 text-muted-foreground">Laden...</div> :
          filteredOrders.length === 0 ?
          <div data-ev-id="ev_ad65bac862" className="text-center py-12 bg-card border border-border rounded-lg">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 data-ev-id="ev_7eabead3f6" className="text-lg font-medium">Keine Auszahlungsanweisungen</h3>
              <p data-ev-id="ev_5765006aa6" className="text-muted-foreground">Erstellen Sie eine neue Anweisung.</p>
            </div> :
          viewMode === 'grouped' ?
          <div data-ev-id="ev_f02ae57508" className="space-y-6">
              {statusGroups.map((group) => {
              const groupOrders = filteredOrders.filter((o) => o.status === group.status);
              if (groupOrders.length === 0) return null;
              const GroupIcon = group.icon;
              return (
                <div data-ev-id="ev_6fb0c87aac" key={group.status} className={`border rounded-lg overflow-hidden ${group.bgColor}`}>
                    <div data-ev-id="ev_ab7a64e50d" className="px-4 py-3 flex items-center gap-3 border-b border-inherit bg-white/50">
                      <GroupIcon className={`w-5 h-5 ${group.iconColor}`} />
                      <h3 data-ev-id="ev_a7002ce9e6" className="font-semibold">{group.label}</h3>
                      <span data-ev-id="ev_0623179415" className="ml-auto text-sm text-muted-foreground">
                        {groupOrders.length} {groupOrders.length === 1 ? 'Eintrag' : 'Einträge'}
                      </span>
                    </div>
                    <div data-ev-id="ev_ce8483efe5" className="divide-y divide-border/50">
                      {groupOrders.map((order) =>
                    <div data-ev-id="ev_e940d23c12" key={order.id} className="p-4 bg-white/80 hover:bg-white transition-colors">
                          <div data-ev-id="ev_0107b9aed8" className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div data-ev-id="ev_3f9923c3fb" className="flex-1 min-w-0">
                              <div data-ev-id="ev_b893df7bb7" className="flex items-center gap-2">
                                <span data-ev-id="ev_207cc58887" className="font-mono text-sm font-medium">{order.reference_number}</span>
                                {getStatusBadge(order.status)}
                              </div>
                              <p data-ev-id="ev_f5a49d5a06" className="font-medium mt-1">{order.recipient_name}</p>
                              <p data-ev-id="ev_06d4576444" className="text-sm text-muted-foreground truncate">{order.purpose}</p>
                              {order.rejection_reason &&
                          <p data-ev-id="ev_429512bb99" className="text-sm text-red-600 mt-1 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  {order.rejection_reason}
                                </p>
                          }
                            </div>
                            <div data-ev-id="ev_853cf550ad" className="text-right">
                              <p data-ev-id="ev_ed7c0863e8" className="text-lg font-semibold">{formatCurrency(order.amount)}</p>
                              <p data-ev-id="ev_1becc3847f" className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                              {order.email_status && order.email_status !== 'none' &&
                          <span data-ev-id="ev_71cafdc8a1" className={`inline-flex items-center gap-1 text-xs mt-1 ${
                          order.email_status === 'sent' ? 'text-green-600' :
                          order.email_status === 'failed' ? 'text-red-500' :
                          order.email_status === 'pending' ? 'text-amber-500' : ''}`
                          }>
                                  {order.email_status === 'sent' && <MailCheck className="w-3 h-3" />}
                                  {order.email_status === 'failed' && <MailX className="w-3 h-3" />}
                                  {order.email_status === 'pending' && <Loader2 className="w-3 h-3 animate-spin" />}
                                  {order.email_status === 'sent' ? 'E-Mail gesendet' : order.email_status === 'failed' ? 'E-Mail Fehler' : 'Senden...'}
                                </span>
                          }
                            </div>
                            <div data-ev-id="ev_39be06f69f" className="flex items-center gap-1 sm:ml-4">
                              <button data-ev-id="ev_c258190b2d"
                          onClick={() => {setSelectedOrder(order);setShowDetail(true);}}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                          title="Details">

                                <Eye className="w-4 h-4" />
                              </button>
                              {order.status === 'draft' && (order.created_by === profile?.id || isKassier) &&
                          <>
                                  <button data-ev-id="ev_draft_edit_grp"
                            onClick={() => startEditingOrder(order)}
                            className="p-2 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors"
                            title="Bearbeiten">

                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button data-ev-id="ev_draft_submit_grp"
                            onClick={() => handleSubmitOrder(order.id)}
                            className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                            title="Einreichen">

                                    <Send className="w-4 h-4" />
                                  </button>
                                  <button data-ev-id="ev_draft_delete_grp"
                            onClick={() => handleDelete(order.id)}
                            className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                            title="Löschen">

                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                          }
                              {order.status === 'submitted' && canApprove &&
                          <>
                                  <button data-ev-id="ev_77e5e38fed"
                            onClick={() => handleApproveOrder(order.id)}
                            className="p-2 hover:bg-green-100 text-green-600 rounded-lg transition-colors"
                            title="Genehmigen">

                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button data-ev-id="ev_1b84b5417c"
                            onClick={() => openRejectModal(order)}
                            className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                            title="Ablehnen">

                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                          }
                              {order.status === 'approved' && canMarkPaid &&
                          <button data-ev-id="ev_e95bf7ba5a"
                          onClick={() => handleMarkPaid(order.id)}
                          className="p-2 hover:bg-purple-100 text-purple-600 rounded-lg transition-colors"
                          title="Als ausgezahlt markieren">

                                  <Banknote className="w-4 h-4" />
                                </button>
                          }
                              {(order.status === 'approved' || order.status === 'paid') &&
                          <button data-ev-id="ev_5e50bda81b"
                          onClick={() => handleDownloadPdf(order)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                          title="PDF herunterladen">

                                  <Download className="w-4 h-4" />
                                </button>
                          }
                              {canDelete && order.status !== 'draft' &&
                          <button data-ev-id="ev_5e325e2270"
                          onClick={() => handleDelete(order.id)}
                          className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                          title="Löschen">

                                  <Trash2 className="w-4 h-4" />
                                </button>
                          }
                              {canResetReference &&
                          <button data-ev-id="ev_62cac763f7"
                          onClick={() => handleResetReference(order)}
                          className="p-2 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors"
                          title="Referenznummer zurücksetzen">

                                  <RotateCcw className="w-4 h-4" />
                                </button>
                          }
                            </div>
                          </div>
                        </div>
                    )}
                    </div>
                  </div>);

            })}
            </div> :

          <div data-ev-id="ev_c6782d1a8b" className="bg-card border border-border rounded-lg overflow-hidden">
              <div data-ev-id="ev_0b5d70ed84" className="overflow-x-auto">
                <table data-ev-id="ev_644b03bf98" className="w-full">
                  <thead data-ev-id="ev_31464c91fa" className="bg-muted/50">
                    <tr data-ev-id="ev_370c7da55b">
                      <th data-ev-id="ev_14ef0e79b5" className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Referenz</th>
                      <th data-ev-id="ev_5f40a90e0f" className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Empfänger</th>
                      <th data-ev-id="ev_5488c4dac2" className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Zweck</th>
                      <th data-ev-id="ev_6729c7ba1a" className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Betrag</th>
                      <th data-ev-id="ev_5bf0573f3d" className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Zahlungsart</th>
                      <th data-ev-id="ev_09b8ab8009" className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Status</th>
                      <th data-ev-id="ev_email_po_th" className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">E-Mail</th>
                      <th data-ev-id="ev_0618c3170d" className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Erstellt</th>
                      <th data-ev-id="ev_8f527c8783" className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody data-ev-id="ev_23ec751122" className="divide-y divide-border">
                    {filteredOrders.map((order) =>
                  <tr data-ev-id="ev_05200240c5" key={order.id} className={`${getRowBackground(order.status)} hover:bg-muted/50 transition-colors`}>
                        <td data-ev-id="ev_0f73a936f3" className="px-4 py-3 font-mono text-sm">{order.reference_number}</td>
                        <td data-ev-id="ev_c656b7c62f" className="px-4 py-3">{order.recipient_name}</td>
                        <td data-ev-id="ev_4160e88835" className="px-4 py-3 max-w-xs truncate">{order.purpose}</td>
                        <td data-ev-id="ev_6a2c9c24c9" className="px-4 py-3 text-right font-medium">{formatCurrency(order.amount)}</td>
                        <td data-ev-id="ev_ab9579a417" className="px-4 py-3 text-center">
                          <span data-ev-id="ev_2b09084f60" className={`px-2 py-1 rounded text-xs ${
                      order.payment_method === 'cash' ?
                      'bg-amber-100 text-amber-700' :
                      order.payment_method === 'direct_to_organizer' ?
                      'bg-purple-100 text-purple-700' :
                      'bg-blue-100 text-blue-700'}`
                      }>
                            {order.payment_method === 'cash' ? 'Bar' : order.payment_method === 'direct_to_organizer' ? 'Rechnung' : 'Überweisung'}
                          </span>
                        </td>
                        <td data-ev-id="ev_c63bad95b5" className="px-4 py-3 text-center">{getStatusBadge(order.status)}</td>
                        <td data-ev-id="ev_email_po_td" className="px-4 py-3 text-center">
                          {order.email_status && order.email_status !== 'none' &&
                      <span data-ev-id="ev_eb98219757" className={`inline-flex items-center gap-1 text-xs ${
                      order.email_status === 'sent' ? 'text-green-600' :
                      order.email_status === 'failed' ? 'text-red-500' :
                      order.email_status === 'pending' ? 'text-amber-500' :
                      'text-muted-foreground'}`
                      }>
                              {order.email_status === 'sent' && <MailCheck className="w-3 h-3" />}
                              {order.email_status === 'failed' && <MailX className="w-3 h-3" />}
                              {order.email_status === 'pending' && <Loader2 className="w-3 h-3 animate-spin" />}
                              {order.email_status === 'sent' ? 'Gesendet' : order.email_status === 'failed' ? 'Fehler' : 'Senden...'}
                            </span>
                      }
                        </td>
                        <td data-ev-id="ev_8e03724101" className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(order.created_at)}
                        </td>
                        <td data-ev-id="ev_64e5d3b848" className="px-4 py-3">
                          <div data-ev-id="ev_e64c1af3ff" className="flex items-center justify-end gap-1">
                            <button data-ev-id="ev_89cc6a3614"
                        onClick={() => {setSelectedOrder(order);setShowDetail(true);}}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Details">

                              <Eye className="w-4 h-4" />
                            </button>
                            {order.status === 'draft' && order.created_by === profile?.id &&
                        <>
                                <button data-ev-id="ev_2e9b36f94a"
                          onClick={() => handleSubmitOrder(order.id)}
                          className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                          title="Einreichen">

                                  <Send className="w-4 h-4" />
                                </button>
                                <button data-ev-id="ev_4ac968d98a"
                          onClick={() => handleDelete(order.id)}
                          className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                          title="Löschen">

                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                        }
                            {order.status === 'submitted' && canApprove &&
                        <>
                                <button data-ev-id="ev_0bf668b967"
                          onClick={() => handleApproveOrder(order.id)}
                          className="p-2 hover:bg-green-100 text-green-600 rounded-lg transition-colors"
                          title="Genehmigen">
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button data-ev-id="ev_3853f0bd65"
                          onClick={() => openRejectModal(order)}
                          className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                          title="Ablehnen">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                        }
                            {order.status === 'approved' && canMarkPaid &&
                        <button data-ev-id="ev_6269c4ab57"
                        onClick={() => handleMarkPaid(order.id)}
                        className="p-2 hover:bg-purple-100 text-purple-600 rounded-lg transition-colors"
                        title="Als ausgezahlt markieren">

                                <Banknote className="w-4 h-4" />
                              </button>
                        }
                            {(order.status === 'approved' || order.status === 'paid') &&
                        <button data-ev-id="ev_fe8ec22bc0"
                        onClick={() => handleDownloadPdf(order)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="PDF herunterladen">
                                <Download className="w-4 h-4" />
                              </button>
                        }
                            {canDelete && order.status !== 'draft' &&
                        <button data-ev-id="ev_bf0c99e232"
                        onClick={() => handleDelete(order.id)}
                        className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                        title="Löschen">
                                <Trash2 className="w-4 h-4" />
                              </button>
                        }
                            {canResetReference &&
                        <button data-ev-id="ev_0434971fdb"
                        onClick={() => handleResetReference(order)}
                        className="p-2 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors"
                        title="Referenznummer zurücksetzen">
                                <RotateCcw className="w-4 h-4" />
                              </button>
                        }
                          </div>
                        </td>
                      </tr>
                  )}
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>
        }

      {activeTab === 'new' &&
        <div data-ev-id="ev_8e67296d43" className="max-w-2xl mx-auto">
          <div data-ev-id="ev_976eea55bc" className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div data-ev-id="ev_86ec39b279" className="flex items-start justify-between">
              <div data-ev-id="ev_3d22ae9f2c">
                <h2 data-ev-id="ev_a50f051777" className="text-xl font-semibold">
                  {editingOrderId ? 'Entwurf bearbeiten' : 'Neue Auszahlungsanweisung'}
                </h2>
                <p data-ev-id="ev_536c61e531" className="text-sm text-muted-foreground">
                  {editingOrderId ?
                  'Bearbeiten Sie die Auszahlungsanweisung und speichern Sie die Änderungen.' :
                  'Füllen Sie das Formular aus um eine neue Anweisung zu erstellen.'}
                </p>
              </div>
              {editingOrderId &&
              <button data-ev-id="ev_788a12d61a"
              onClick={cancelEditing}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <X className="w-4 h-4" />
                  Abbrechen
                </button>
              }
            </div>

            <div data-ev-id="ev_58de81c286" className="grid gap-4">
              {/* Betrag */}
              <div data-ev-id="ev_2ff5372fed">
                <label data-ev-id="ev_3fe71bb25b" className="block text-sm font-medium mb-1">Betrag *</label>
                <div data-ev-id="ev_c8cf553db4" className="relative">
                  <span data-ev-id="ev_dac79bac50" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                  <input data-ev-id="ev_46c675565d"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-4 py-2 border border-input rounded-lg bg-background"
                  placeholder="0,00" />

                </div>
              </div>

              {/* Empfänger */}
              <div data-ev-id="ev_f261df5fd5">
                <label data-ev-id="ev_a2e1b3daaa" className="block text-sm font-medium mb-1">Empfänger (Name) *</label>
                <input data-ev-id="ev_11fad92cd8"
                type="text"
                value={formData.recipient_name}
                onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                className="w-full px-4 py-2 border border-input rounded-lg bg-background"
                placeholder="Name des Empfängers" />

              </div>

              {/* Zweck */}
              <div data-ev-id="ev_2f6b668f87">
                <label data-ev-id="ev_a4c9681599" className="block text-sm font-medium mb-1">Zweck / Verwendung *</label>
                <textarea data-ev-id="ev_ef30883468"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className="w-full px-4 py-2 border border-input rounded-lg bg-background resize-none"
                rows={3}
                placeholder="Wofür wird ausgezahlt?" />

              </div>

              {/* Zahlungsart */}
              <div data-ev-id="ev_e1b91a6572">
                <label data-ev-id="ev_7a4223930a" className="block text-sm font-medium mb-2">Zahlungsart *</label>
                <div data-ev-id="ev_0411e8d12a" className="flex flex-wrap gap-4">
                  <label data-ev-id="ev_0ee4e408cc" className="flex items-center gap-2 cursor-pointer">
                    <input data-ev-id="ev_7d7171dbd6"
                    type="radio"
                    name="payment_method"
                    checked={formData.payment_method === 'transfer'}
                    onChange={() => setFormData({ ...formData, payment_method: 'transfer' })}
                    className="w-4 h-4 text-primary" />

                    <span data-ev-id="ev_dd18e7eb50">per Überweisung</span>
                  </label>
                  <label data-ev-id="ev_8e97d4bb57" className="flex items-center gap-2 cursor-pointer">
                    <input data-ev-id="ev_baf37f70ab"
                    type="radio"
                    name="payment_method"
                    checked={formData.payment_method === 'cash'}
                    onChange={() => setFormData({ ...formData, payment_method: 'cash' })}
                    className="w-4 h-4 text-primary" />

                    <span data-ev-id="ev_0a4c0c5329">in Bar</span>
                  </label>
                  <label data-ev-id="ev_invoice_option" className="flex items-center gap-2 cursor-pointer">
                    <input data-ev-id="ev_invoice_radio"
                    type="radio"
                    name="payment_method"
                    checked={formData.payment_method === 'direct_to_organizer'}
                    onChange={() => setFormData({ ...formData, payment_method: 'direct_to_organizer' })}
                    className="w-4 h-4 text-primary" />

                    <span data-ev-id="ev_invoice_label">Rechnung</span>
                  </label>
                </div>
              </div>

              {/* IBAN (nur bei Überweisung) */}
              {formData.payment_method === 'transfer' &&
              <div data-ev-id="ev_f893758572">
                  <label data-ev-id="ev_bb1e6c84d5" className="block text-sm font-medium mb-1">IBAN *</label>
                  <input data-ev-id="ev_1d415fc89b"
                type="text"
                value={formData.recipient_iban || ''}
                onChange={(e) => setFormData({ ...formData, recipient_iban: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 border border-input rounded-lg bg-background font-mono"
                placeholder="AT00 0000 0000 0000 0000" />

                </div>
              }

              {/* Notizen */}
              <div data-ev-id="ev_887937dff8">
                <label data-ev-id="ev_28152e4c3d" className="block text-sm font-medium mb-1">Notizen (optional)</label>
                <textarea data-ev-id="ev_c8ad8ac8bb"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-input rounded-lg bg-background resize-none"
                rows={2}
                placeholder="Weitere Anmerkungen..." />

              </div>

              {/* Keine Abrechnung erforderlich */}
              <div data-ev-id="ev_no_expense_report">
                <label data-ev-id="ev_no_expense_label" className="flex items-center gap-3 cursor-pointer p-3 border border-input rounded-lg hover:bg-muted/50 transition-colors">
                  <input data-ev-id="ev_201f3921a7"
                  type="checkbox"
                  checked={formData.no_expense_report_required || false}
                  onChange={(e) => setFormData({ ...formData, no_expense_report_required: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />

                  <div data-ev-id="ev_a28c4de706">
                    <span data-ev-id="ev_cfebb6f584" className="font-medium text-sm">Keine Ausgabenabrechnung erforderlich</span>
                    <p data-ev-id="ev_2d9840dd50" className="text-xs text-muted-foreground mt-0.5">
                      Diese Auszahlungsanweisung erscheint nicht in der Liste für Ausgabenabrechnungen
                    </p>
                  </div>
                </label>
              </div>

              {/* Anhang */}
              <div data-ev-id="ev_c3c6dc8629">
                <label data-ev-id="ev_575a8ce9af" className="block text-sm font-medium mb-1">Anhang (optional)</label>
                {formData.attachment_url ?
                <div data-ev-id="ev_35f0a5bc35" className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                    <div data-ev-id="ev_1d76cf643b" className="p-2 bg-primary/10 rounded-lg">
                      {formData.attachment_name?.toLowerCase().endsWith('.pdf') ?
                    <File className="w-5 h-5 text-primary" /> :

                    <Image className="w-5 h-5 text-primary" />
                    }
                    </div>
                    <div data-ev-id="ev_3cfc7164c7" className="flex-1 min-w-0">
                      <p data-ev-id="ev_cd6c1c81c4" className="text-sm font-medium truncate">{formData.attachment_name}</p>
                      <a data-ev-id="ev_4588049c4c"
                    href={formData.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline">

                        Vorschau öffnen
                      </a>
                    </div>
                    <button data-ev-id="ev_d13e5bc6d8"
                  type="button"
                  onClick={removeAttachment}
                  className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                  title="Anhang entfernen">

                      <X className="w-4 h-4" />
                    </button>
                  </div> :

                <div data-ev-id="ev_c948f5a2d0" className="relative">
                    <input data-ev-id="ev_9e4afd5ed7"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="attachment-upload"
                  disabled={uploadingFile} />

                    <label data-ev-id="ev_fec8e7f788"
                  htmlFor="attachment-upload"
                  className={`flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                  uploadingFile ? 'opacity-50 cursor-wait' : ''}`
                  }>

                      {uploadingFile ?
                    <div data-ev-id="ev_d711bcea78" className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> :

                    <>
                          <Paperclip className="w-6 h-6 text-muted-foreground mb-1" />
                          <span data-ev-id="ev_b213a029d9" className="text-sm text-muted-foreground">Bild oder PDF anhängen</span>
                          <span data-ev-id="ev_fe9ca08d7a" className="text-xs text-muted-foreground">Max. 5 MB</span>
                        </>
                    }
                    </label>
                  </div>
                }
              </div>
            </div>

            <div data-ev-id="ev_f429b14353" className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
              <button data-ev-id="ev_a8014f7ec1"
              onClick={cancelEditing}
              className="px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors">

                Abbrechen
              </button>
              <button data-ev-id="ev_a12dcbbc26"
              onClick={() => handleCreateOrder(false)}
              disabled={submitting}
              className="px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors disabled:opacity-50">

                {submitting ? 'Speichern...' : editingOrderId ? 'Änderungen speichern' : 'Als Entwurf speichern'}
              </button>
              <button data-ev-id="ev_dc52e22939"
              onClick={() => handleCreateOrder(true)}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">

                <Send className="w-4 h-4" />
                {submitting ? 'Einreichen...' : 'Speichern & Einreichen'}
              </button>
            </div>
          </div>
        </div>
        }

      {/* Detail Modal */}
      {showDetail && selectedOrder &&
        <div data-ev-id="ev_160231fb10" className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div data-ev-id="ev_a509bb2a35" className="bg-card rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div data-ev-id="ev_d13fa8cd44" className="flex items-center justify-between p-4 border-b border-border">
              <h3 data-ev-id="ev_4130966855" className="text-lg font-semibold">Auszahlungsanweisung Details</h3>
              <button data-ev-id="ev_994753c2d3"
              onClick={() => setShowDetail(false)}
              className="p-2 hover:bg-muted rounded-lg transition-colors">

                <X className="w-5 h-5" />
              </button>
            </div>
            <div data-ev-id="ev_d01870662a" className="p-4 space-y-4">
              <div data-ev-id="ev_722c43f2a6" className="flex items-center justify-between">
                <span data-ev-id="ev_d5ebfc46f3" className="font-mono text-lg">{selectedOrder.reference_number}</span>
                {getStatusBadge(selectedOrder.status)}
              </div>
              
              <div data-ev-id="ev_37aa5279ee" className="grid grid-cols-2 gap-4 text-sm">
                <div data-ev-id="ev_b2a1cfa830">
                  <p data-ev-id="ev_52cbf285c8" className="text-muted-foreground">Betrag</p>
                  <p data-ev-id="ev_32f809728d" className="font-semibold text-lg">{formatCurrency(selectedOrder.amount)}</p>
                </div>
                <div data-ev-id="ev_071d8d294b">
                  <p data-ev-id="ev_5c422c0c86" className="text-muted-foreground">Zahlungsart</p>
                  <p data-ev-id="ev_f0d229f363" className="font-medium">{selectedOrder.payment_method === 'cash' ? 'Bar' : selectedOrder.payment_method === 'direct_to_organizer' ? 'Rechnung' : 'Überweisung'}</p>
                </div>
                <div data-ev-id="ev_8fe6179ce8" className="col-span-2">
                  <p data-ev-id="ev_b83ad01f75" className="text-muted-foreground">Empfänger</p>
                  <p data-ev-id="ev_f12b9b70b8" className="font-medium">{selectedOrder.recipient_name}</p>
                </div>
                {selectedOrder.recipient_iban &&
                <div data-ev-id="ev_47e2549bcc" className="col-span-2">
                    <p data-ev-id="ev_bba1031bc8" className="text-muted-foreground">IBAN</p>
                    <p data-ev-id="ev_46238b5353" className="font-mono">{selectedOrder.recipient_iban}</p>
                  </div>
                }
                <div data-ev-id="ev_f3b45fd648" className="col-span-2">
                  <p data-ev-id="ev_8b56a7a07a" className="text-muted-foreground">Zweck</p>
                  <p data-ev-id="ev_4593c78c6f">{selectedOrder.purpose}</p>
                </div>
                {selectedOrder.notes &&
                <div data-ev-id="ev_fde9bbfc78" className="col-span-2">
                    <p data-ev-id="ev_0af9c4e0a9" className="text-muted-foreground">Notizen</p>
                    <p data-ev-id="ev_ba9926fe43" className="text-sm">{selectedOrder.notes}</p>
                  </div>
                }
                {selectedOrder.attachment_url &&
                <div data-ev-id="ev_ff72d0bd42" className="col-span-2">
                    <p data-ev-id="ev_624b96f8fa" className="text-muted-foreground">Anhang</p>
                    <a data-ev-id="ev_cafe18b6a2"
                  href={selectedOrder.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors mt-1">

                      {selectedOrder.attachment_name?.toLowerCase().endsWith('.pdf') ?
                    <File className="w-5 h-5 text-primary" /> :

                    <Image className="w-5 h-5 text-primary" />
                    }
                      <span data-ev-id="ev_b84dd43e0d" className="text-sm font-medium text-primary truncate">
                        {selectedOrder.attachment_name || 'Anhang öffnen'}
                      </span>
                    </a>
                  </div>
                }
              </div>

              <div data-ev-id="ev_065c86a080" className="border-t border-border pt-4 space-y-2 text-sm">
                <div data-ev-id="ev_53b9a40e9d" className="flex justify-between">
                  <span data-ev-id="ev_5a04528cff" className="text-muted-foreground">Erstellt von</span>
                  <span data-ev-id="ev_152e863ecb">{getProfileName(selectedOrder.created_by)}</span>
                </div>
                <div data-ev-id="ev_4a0548d67a" className="flex justify-between">
                  <span data-ev-id="ev_b277d1790c" className="text-muted-foreground">Erstellt am</span>
                  <span data-ev-id="ev_f53a01d516">{formatDate(selectedOrder.created_at)}</span>
                </div>
                {selectedOrder.submitted_at &&
                <div data-ev-id="ev_bd8d279bb3" className="flex justify-between">
                    <span data-ev-id="ev_647ccec08e" className="text-muted-foreground">Eingereicht am</span>
                    <span data-ev-id="ev_ff5cc95be0">{formatDate(selectedOrder.submitted_at)}</span>
                  </div>
                }
                {selectedOrder.approved_at &&
                <div data-ev-id="ev_c33901670f" className="flex justify-between">
                    <span data-ev-id="ev_c3928f0c37" className="text-muted-foreground">Genehmigt von</span>
                    <span data-ev-id="ev_7981e926e3">{getProfileName(selectedOrder.approved_by)} ({formatDate(selectedOrder.approved_at)})</span>
                  </div>
                }
                {selectedOrder.paid_at &&
                <div data-ev-id="ev_694eca1f14" className="flex justify-between">
                    <span data-ev-id="ev_56f6b935e7" className="text-muted-foreground">Ausgezahlt von</span>
                    <span data-ev-id="ev_62246782ee">{getProfileName(selectedOrder.paid_by)} ({formatDate(selectedOrder.paid_at)})</span>
                  </div>
                }
                {selectedOrder.rejected_at &&
                <div data-ev-id="ev_9a8375e1b4" className="flex justify-between">
                    <span data-ev-id="ev_2330fef62d" className="text-muted-foreground">Abgelehnt von</span>
                    <span data-ev-id="ev_dd05b02f0f" className="text-red-600">{getProfileName(selectedOrder.rejected_by)} ({formatDate(selectedOrder.rejected_at)})</span>
                  </div>
                }
                {selectedOrder.rejection_reason &&
                <div data-ev-id="ev_7c129bb5b4" className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div data-ev-id="ev_8324b1ebc3" className="flex items-center gap-2 text-red-700 font-medium mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      Ablehnungsgrund
                    </div>
                    <p data-ev-id="ev_1ee6dbd6d4" className="text-sm text-red-600">{selectedOrder.rejection_reason}</p>
                  </div>
                }
              </div>
            </div>
            <div data-ev-id="ev_d2b5bd1feb" className="p-4 border-t border-border flex gap-2">
              <button data-ev-id="ev_5f523a0c2a"
              onClick={() => setShowDetail(false)}
              className="flex-1 px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors">

                Schließen
              </button>
              {selectedOrder.status === 'draft' && (selectedOrder.created_by === profile?.id || isKassier) &&
              <button data-ev-id="ev_detail_edit_btn"
              onClick={() => {setShowDetail(false);startEditingOrder(selectedOrder);}}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                  <Pencil className="w-4 h-4" />
                  Bearbeiten
                </button>
              }
              {(selectedOrder.status === 'approved' || selectedOrder.status === 'paid') &&
              <button data-ev-id="ev_ff7d995eec"
              onClick={() => handleDownloadPdf(selectedOrder)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  <Download className="w-4 h-4" />
                  PDF
                </button>
              }
            </div>
          </div>
        </div>
        }

      {/* Rejection Modal */}
      {showRejectModal && rejectingOrder &&
        <div data-ev-id="ev_06ea8611c0" className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div data-ev-id="ev_baedb3729f" className="bg-card rounded-lg shadow-xl max-w-md w-full">
            <div data-ev-id="ev_dfae426a31" className="flex items-center justify-between p-4 border-b border-border">
              <h3 data-ev-id="ev_e1c7685f97" className="text-lg font-semibold text-red-600 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Auszahlungsanweisung ablehnen
              </h3>
              <button data-ev-id="ev_18a3beeebb"
              onClick={() => setShowRejectModal(false)}
              className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div data-ev-id="ev_bd5b1715fe" className="p-4 space-y-4">
              <div data-ev-id="ev_0b096a139e" className="p-3 bg-muted/50 rounded-lg">
                <p data-ev-id="ev_c4160a5b6d" className="text-sm text-muted-foreground">Referenz</p>
                <p data-ev-id="ev_94a7c0e3b4" className="font-mono font-medium">{rejectingOrder.reference_number}</p>
                <p data-ev-id="ev_2e0ffbe7c6" className="text-sm text-muted-foreground mt-2">Empfänger</p>
                <p data-ev-id="ev_f718d6fcb2" className="font-medium">{rejectingOrder.recipient_name}</p>
                <p data-ev-id="ev_f3c754ffb3" className="text-sm text-muted-foreground mt-2">Betrag</p>
                <p data-ev-id="ev_9a74b7586d" className="font-medium">{formatCurrency(rejectingOrder.amount)}</p>
              </div>
              <div data-ev-id="ev_027be4d3df">
                <label data-ev-id="ev_9eac832e92" className="block text-sm font-medium mb-1">
                  Grund der Ablehnung <span data-ev-id="ev_31a7f3b65a" className="text-red-500">*</span>
                </label>
                <textarea data-ev-id="ev_df4859b0fe"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-4 py-2 border border-input rounded-lg bg-background resize-none"
                rows={3}
                placeholder="Bitte geben Sie den Grund für die Ablehnung an..."
                required />

              </div>
            </div>
            <div data-ev-id="ev_c31717ff97" className="p-4 border-t border-border flex gap-2">
              <button data-ev-id="ev_1244dfd599"
              onClick={() => setShowRejectModal(false)}
              className="flex-1 px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors">
                Abbrechen
              </button>
              <button data-ev-id="ev_a5431dea9c"
              onClick={handleRejectOrder}
              disabled={!rejectionReason.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <XCircle className="w-4 h-4" />
                Ablehnen
              </button>
            </div>
          </div>
        </div>
        }


    </div>
    </Layout>);

}