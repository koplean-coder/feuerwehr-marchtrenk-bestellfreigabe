import { useState, useEffect } from 'react';
import { useEventParticipations, EventParticipation, EventParticipationInsert, PaymentMethod } from '@/hooks/useEventParticipations';
import { usePaymentOrders } from '@/hooks/usePaymentOrders';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { useSettings } from '@/hooks/useSettings';
import { generateEventParticipationPdf } from '@/utils/generateEventParticipationPdf';
import { supabase } from '@/integrations/supabase/client';
import {
  FileText, Plus, Search, Filter, Download, Edit2, Trash2,
  Send, CheckCircle, Clock, X, ChevronDown, Upload, Paperclip, Image, File,
  XCircle, AlertTriangle, Calendar, MapPin, Users, Euro, Car, Moon, ArrowLeft, Banknote, CreditCard, Building2, Info,
  Mail, MailCheck, MailX, Loader2, BadgeCheck } from
'lucide-react';

type TabType = 'overview' | 'new';
type FilterStatus = 'all' | 'draft' | 'submitted' | 'approved' | 'rejected';
type ViewMode = 'list' | 'grouped';

interface EventParticipationsSectionProps {
  onBack: () => void;
}

export function EventParticipationsSection({ onBack }: EventParticipationsSectionProps) {
  const {
    eventParticipations,
    loading,
    createEventParticipation,
    submitEventParticipation,
    approveEventParticipation,
    rejectEventParticipation,
    deleteEventParticipation,
    confirmAmount,
    refetch,
    createPaymentOrderForApprovedParticipation
  } = useEventParticipations();
  const { createPaymentOrder, submitPaymentOrder, paymentOrders, refetch: refetchPaymentOrders } = usePaymentOrders();
  const { profiles } = useProfiles();
  const { effectiveProfile, effectiveIsAdmin, effectiveIsKommandant, effectiveHasKassierFunction } = useSimulation();
  const profile = effectiveProfile;
  const { pdfBackgroundUrl, pdfBackgroundOpacity, commanderSignatureUrl, commanderStampUrl } = useSettings();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [selectedEntry, setSelectedEntry] = useState<EventParticipation | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingEntry, setRejectingEntry] = useState<EventParticipation | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');


  // Form state
  const [formData, setFormData] = useState<EventParticipationInsert>({
    event_name: '',
    event_location: '',
    organizer: '',
    event_date: '',
    max_participants: 1,
    description: '',
    estimated_costs: 0,
    transport_type: '',
    overnight_required: false,
    attachment_url: null,
    attachment_name: null,
    notes: '',
    payment_method: 'direct_to_organizer',
    organizer_iban: null
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Payment state
  const [organizerIban, setOrganizerIban] = useState('');
  const [paymentDetailsAccepted, setPaymentDetailsAccepted] = useState(false);

  // Kassier amount confirmation modal state
  const [showAmountConfirmModal, setShowAmountConfirmModal] = useState(false);
  const [confirmingEntry, setConfirmingEntry] = useState<EventParticipation | null>(null);
  const [confirmedAmount, setConfirmedAmount] = useState<number>(0);
  const [amountChangeReason, setAmountChangeReason] = useState('');
  const [confirmingAmount, setConfirmingAmount] = useState(false);

  // Check if current user is Kassier (mit Simulation)
  const profileFunctionsLower = profile?.functions?.map(f => f.toLowerCase()) || [];
  const isKassier = effectiveHasKassierFunction || profileFunctionsLower.includes('kassier');
  const isSchriftfuehrer = profileFunctionsLower.includes('schriftfuehrer');

  const canApprove = effectiveIsKommandant || effectiveIsAdmin;
  const canDelete = effectiveIsAdmin;

  // Nur Kassier, Admin, Kommandant und Schriftführer dürfen PDFs generieren
  const canGeneratePdf = isKassier || isSchriftfuehrer || effectiveIsAdmin || effectiveIsKommandant;

  const commanderProfile = profiles.find((p) => p.role === 'kommandant');
  const commanderName = commanderProfile?.full_name || 'Kommandant';

  // Keep selectedEntry in sync with updated eventParticipations
  useEffect(() => {
    if (selectedEntry) {
      const updated = eventParticipations.find((e) => e.id === selectedEntry.id);
      if (updated && (
      updated.confirmed_amount !== selectedEntry.confirmed_amount ||
      updated.amount_confirmed !== selectedEntry.amount_confirmed ||
      updated.status !== selectedEntry.status))
      {
        setSelectedEntry(updated);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedEntry wird absichtlich nicht inkludiert um Endlosschleife zu vermeiden
  }, [eventParticipations, selectedEntry?.id]);

  const getProfileName = (id: string | null) => {
    if (!id) return '-';
    return profiles.find((p) => p.id === id)?.full_name || 'Unbekannt';
  };

  const getStatusBadge = (status: EventParticipation['status']) => {
    const styles: Record<EventParticipation['status'], string> = {
      draft: 'bg-gray-100 text-gray-700',
      submitted: 'bg-orange-100 text-orange-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    };
    const labels: Record<EventParticipation['status'], string> = {
      draft: 'Entwurf',
      submitted: 'Eingereicht',
      approved: 'Genehmigt',
      rejected: 'Abgelehnt'
    };
    return (
      <span data-ev-id="ev_f88f360d3a" className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>);

  };

  const getRowBackground = (status: EventParticipation['status']) => {
    const colors: Record<EventParticipation['status'], string> = {
      draft: 'bg-gray-50/50',
      submitted: 'bg-orange-50/50',
      approved: 'bg-green-50/50',
      rejected: 'bg-red-50/50'
    };
    return colors[status];
  };

  const filteredEntries = eventParticipations.filter((entry) => {
    if (filterStatus !== 'all' && entry.status !== filterStatus) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        entry.reference_number.toLowerCase().includes(search) ||
        entry.event_name.toLowerCase().includes(search) ||
        (entry.event_location || '').toLowerCase().includes(search) ||
        (entry.organizer || '').toLowerCase().includes(search));

    }
    return true;
  });

  const validateForm = () => {
    if (!formData.event_name || !formData.event_date || !formData.max_participants) {
      alert('Bitte füllen Sie alle Pflichtfelder aus.');
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setFormData({
      event_name: '',
      event_location: '',
      organizer: '',
      event_date: '',
      max_participants: 1,
      description: '',
      estimated_costs: 0,
      transport_type: '',
      overnight_required: false,
      attachment_url: null,
      attachment_name: null,
      notes: '',
      payment_method: 'direct_to_organizer',
      organizer_iban: null
    });
    setOrganizerIban('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Nur Bilder (JPG, PNG, WebP) oder PDF-Dateien erlaubt.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Datei ist zu groß. Maximal 5 MB erlaubt.');
      return;
    }

    setUploadingFile(true);
    try {
      const ext = file.name.split('.').pop();
      const filename = `event-attachment-${Date.now()}.${ext}`;

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

  const handleCreateEntry = async (andSubmit: boolean = false) => {
    if (!validateForm()) return;

    // Validate payment method when costs > 0
    if (formData.estimated_costs > 0 && !formData.payment_method) {
      alert('Bitte wählen Sie eine Zahlungsart aus.');
      return;
    }

    // Validate checkbox if direct_to_organizer is selected
    if (formData.payment_method === 'direct_to_organizer' && formData.estimated_costs > 0 && !paymentDetailsAccepted) {
      alert('Bitte bestätigen Sie, dass Sie die Zahlungsdetails per E-Mail an den Kassier übermitteln werden.');
      return;
    }

    setSubmitting(true);
    try {
      // Add payment_details_accepted to formData if direct_to_organizer
      const entryData = {
        ...formData,
        organizer_iban: null, // IBAN will be provided via email
        payment_details_accepted: formData.payment_method === 'direct_to_organizer' ? paymentDetailsAccepted : null
      };
      const newEntry = await createEventParticipation(entryData);

      // Create linked payment order if direct_to_organizer is selected and costs > 0
      if (formData.payment_method === 'direct_to_organizer' && newEntry && formData.estimated_costs > 0) {
        const paymentOrderData = {
          amount: formData.estimated_costs,
          recipient_name: formData.organizer || 'Veranstalter',
          recipient_iban: null, // IBAN will be provided via email from applicant
          purpose: `Teilnahmegebühr: ${formData.event_name}${formData.event_date ? ` (${new Date(formData.event_date).toLocaleDateString('de-DE')})` : ''}`,
          payment_method: 'direct_to_organizer' as const,
          notes: `Verknüpft mit Veranstaltungsantrag ${newEntry.reference_number}. Zahlungsdetails werden per E-Mail übermittelt.`,
          linked_event_participation_id: newEntry.id,
          is_direct_to_organizer: true
        };

        const newPaymentOrder = await createPaymentOrder(paymentOrderData);

        // If submitting the event participation, also submit the payment order
        if (andSubmit && newPaymentOrder) {
          await submitPaymentOrder(newPaymentOrder.id);
        }
      }

      if (andSubmit && newEntry) {
        await submitEventParticipation(newEntry.id);
      }

      resetForm();
      setOrganizerIban('');
      setPaymentDetailsAccepted(false);
      setActiveTab('overview');
    } catch (err) {
      alert('Fehler beim Erstellen des Antrags');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEntry = async (id: string) => {
    if (confirm('Möchten Sie diesen Antrag einreichen?')) {
      await submitEventParticipation(id);
    }
  };

  const handleApproveEntry = async (id: string) => {
    if (confirm('Möchten Sie diesen Antrag genehmigen?')) {
      await approveEventParticipation(id);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
      await deleteEventParticipation(id);
    }
  };

  const openRejectModal = (entry: EventParticipation) => {
    setRejectingEntry(entry);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectEntry = async () => {
    if (!rejectingEntry || !rejectionReason.trim()) {
      alert('Bitte geben Sie einen Grund für die Ablehnung an.');
      return;
    }
    try {
      await rejectEventParticipation(rejectingEntry.id, rejectionReason.trim());
      setShowRejectModal(false);
      setRejectingEntry(null);
      setRejectionReason('');
    } catch (err) {
      alert('Fehler beim Ablehnen des Antrags');
    }
  };

  // Create payment order for approved event participation (retroactive)
  const [creatingPaymentOrder, setCreatingPaymentOrder] = useState(false);

  const handleCreatePaymentOrderForEntry = async (entry: EventParticipation) => {
    if (!entry || entry.estimated_costs <= 0) {
      alert('Diese Veranstaltungsteilnahme hat keine Kosten.');
      return;
    }

    // Check if payment order already exists
    const existingOrder = paymentOrders.find((po) => po.linked_event_participation_id === entry.id);
    if (existingOrder) {
      alert(`Für diese Veranstaltungsteilnahme existiert bereits eine Auszahlungsanweisung: ${existingOrder.reference_number}`);
      return;
    }

    if (!confirm(`Möchten Sie eine Auszahlungsanweisung für ${entry.estimated_costs.toFixed(2)} € erstellen?`)) {
      return;
    }

    setCreatingPaymentOrder(true);
    try {
      // Get creator name
      const creator = profiles.find((p) => p.id === entry.created_by);
      const creatorName = creator?.full_name || 'Antragsteller';

      const newOrder = await createPaymentOrder({
        amount: entry.estimated_costs,
        recipient_name: creatorName,
        recipient_iban: null,
        purpose: `${entry.event_name} (${entry.reference_number})`,
        payment_method: 'transfer',
        notes: `Nachträglich erstellt für Veranstaltungsteilnahme ${entry.reference_number}`,
        linked_event_participation_id: entry.id,
        is_direct_to_organizer: false
      });

      if (newOrder) {
        alert(`Auszahlungsanweisung ${newOrder.reference_number} wurde als Entwurf erstellt.`);
        await refetchPaymentOrders();
      }
    } catch (err) {
      console.error('Error creating payment order:', err);
      alert('Fehler beim Erstellen der Auszahlungsanweisung');
    } finally {
      setCreatingPaymentOrder(false);
    }
  };

  // Check if entry has linked payment order
  const hasLinkedPaymentOrder = (entryId: string) => {
    return paymentOrders.some((po) => po.linked_event_participation_id === entryId);
  };

  const getLinkedPaymentOrder = (entryId: string) => {
    return paymentOrders.find((po) => po.linked_event_participation_id === entryId);
  };

  // Open amount confirmation modal for Kassier
  const openAmountConfirmModal = (entry: EventParticipation) => {
    setConfirmingEntry(entry);
    // Use confirmed_amount if available (and not null), otherwise use estimated_costs
    const initialAmount = entry.confirmed_amount !== null && entry.confirmed_amount !== undefined ?
    Number(entry.confirmed_amount) :
    Number(entry.estimated_costs);
    setConfirmedAmount(initialAmount);
    setAmountChangeReason(entry.amount_change_reason || '');
    setShowAmountConfirmModal(true);
  };

  // Handle amount confirmation by Kassier
  const handleConfirmAmount = async () => {
    if (!confirmingEntry) return;

    // Use Number() for proper comparison
    const originalAmount = Number(confirmingEntry.estimated_costs);
    const newAmount = Number(confirmedAmount);

    // Check if the amount is different from the original estimate
    const amountChanged = originalAmount !== newAmount;

    // Require reason if amount changed from original
    if (amountChanged && !amountChangeReason.trim()) {
      alert('Bitte geben Sie einen Grund für die Betragsänderung an.');
      return;
    }

    setConfirmingAmount(true);
    try {
      const result = await confirmAmount(
        confirmingEntry.id,
        newAmount,
        amountChanged ? amountChangeReason.trim() : undefined
      );

      setShowAmountConfirmModal(false);

      // Explicitly refetch to update the list immediately and get fresh data
      const freshParticipations = await refetch();

      if (result.requiresReapproval) {
        setConfirmingEntry(null);
        alert('Der Betrag wurde erhöht. Der Antrag muss vom Kommandant erneut genehmigt werden.');
      } else {
        // Amount confirmed, generate PDF with the FRESH data from the database
        // Find the updated entry from the just-fetched data
        const freshEntry = freshParticipations.find((e) => e.id === confirmingEntry.id);

        if (freshEntry) {
          setConfirmingEntry(null);
          await generateAndDownloadPdf(freshEntry);
        } else {
          // Fallback: use locally constructed entry if not found (should not happen)
          const entryWithConfirmedAmount = {
            ...confirmingEntry,
            amount_confirmed: true,
            confirmed_amount: confirmedAmount,
            amount_change_reason: amountChanged ? amountChangeReason.trim() : null
          };
          setConfirmingEntry(null);
          await generateAndDownloadPdf(entryWithConfirmedAmount);
        }
      }
    } catch (err) {
      alert('Fehler beim Bestätigen des Betrags');
    } finally {
      setConfirmingAmount(false);
    }
  };

  // Generate and download PDF (internal helper)
  const generateAndDownloadPdf = async (entry: EventParticipation) => {
    try {
      await generateEventParticipationPdf({
        entry,
        creatorName: getProfileName(entry.created_by),
        approverName: entry.approved_by ? getProfileName(entry.approved_by) : undefined,
        pdfBackgroundUrl,
        pdfBackgroundOpacity,
        signatureUrl: commanderSignatureUrl,
        stampUrl: commanderStampUrl,
        commanderName
      });
    } catch (err) {
      console.error('PDF Error:', err);
      alert('Fehler beim Erstellen des PDFs');
    }
  };

  const handleDownloadPdf = async (entry: EventParticipation) => {
    // If Kassier and payment method is direct_to_organizer and amount not yet confirmed
    if (isKassier && entry.payment_method === 'direct_to_organizer' && !entry.amount_confirmed) {
      openAmountConfirmModal(entry);
      return;
    }

    // Otherwise generate PDF directly
    await generateAndDownloadPdf(entry);
  };



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // Helper to render amount confirmation badge
  const renderAmountConfirmedBadge = (entry: EventParticipation) => {
    if (entry.amount_confirmed !== true) return null;

    return (
      <span data-ev-id="ev_aeed677ce3"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200"
      title={`Betrag bestätigt am ${entry.amount_confirmed_at ? new Date(entry.amount_confirmed_at).toLocaleDateString('de-DE') : ''}`}>

        <BadgeCheck className="w-3 h-3" />
        Betrag bestätigt
      </span>);

  };

  // Helper to render amount with strikethrough for original if confirmed differs
  const renderAmount = (entry: EventParticipation, showFull = false) => {
    // Use Number() to ensure proper comparison (DB might return strings)
    const confirmedAmt = entry.confirmed_amount !== null && entry.confirmed_amount !== undefined ?
    Number(entry.confirmed_amount) :
    null;
    const estimatedAmt = Number(entry.estimated_costs);
    const hasConfirmed = entry.amount_confirmed === true && confirmedAmt !== null;
    const isDifferent = hasConfirmed && confirmedAmt !== estimatedAmt;

    if (!isDifferent) {
      // Show confirmed amount if available, otherwise estimated
      const displayAmt = hasConfirmed && confirmedAmt !== null ? confirmedAmt : estimatedAmt;
      return <span data-ev-id="ev_eca3f30118" className="font-medium text-foreground">{formatCurrency(displayAmt)}</span>;
    }

    if (showFull) {
      return (
        <div data-ev-id="ev_f8bb3dcb6c" className="flex flex-col">
          <span data-ev-id="ev_5f2790d760" className="text-muted-foreground line-through text-sm">{formatCurrency(estimatedAmt)}</span>
          <span data-ev-id="ev_41c6f7cf03" className="font-medium text-green-600">{formatCurrency(confirmedAmt!)}</span>
          {entry.amount_change_reason &&
          <span data-ev-id="ev_reason_full" className="text-xs text-muted-foreground italic">({entry.amount_change_reason})</span>
          }
        </div>);

    }

    return (
      <span data-ev-id="ev_89b4ad5d48" className="flex items-center gap-2">
        <span data-ev-id="ev_cdbb380180" className="text-muted-foreground line-through text-sm">{formatCurrency(estimatedAmt)}</span>
        <span data-ev-id="ev_1e36c7174e" className="font-medium text-green-600">{formatCurrency(confirmedAmt!)}</span>
      </span>);

  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const statusGroups: Array<{
    status: EventParticipation['status'];
    label: string;
    icon: typeof Send;
    bgColor: string;
    iconColor: string;
  }> = [
  { status: 'submitted', label: 'Eingereicht', icon: Send, bgColor: 'bg-orange-50 border-orange-200', iconColor: 'text-orange-600' },
  { status: 'approved', label: 'Genehmigt', icon: CheckCircle, bgColor: 'bg-green-50 border-green-200', iconColor: 'text-green-600' },
  { status: 'rejected', label: 'Abgelehnt', icon: XCircle, bgColor: 'bg-red-50 border-red-200', iconColor: 'text-red-600' }];


  return (
    <div data-ev-id="ev_c0de26f20e" className="space-y-6">
      {/* Header */}
      <div data-ev-id="ev_ed628ada30" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div data-ev-id="ev_37b97ed806" className="flex items-center gap-4">
          <button data-ev-id="ev_659bcdf3ed"
          onClick={onBack}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          title="Zurück">

            <ArrowLeft className="w-5 h-5" />
          </button>
          <div data-ev-id="ev_925a7be118">
            <h1 data-ev-id="ev_e7026b6e27" className="text-2xl font-bold text-foreground">Teilnahme Veranstaltung</h1>
            <p data-ev-id="ev_747ee0e55b" className="text-muted-foreground">Anträge für Veranstaltungsteilnahmen</p>
          </div>
        </div>
        <div data-ev-id="ev_00d32e5318" className="flex gap-2">
          <button data-ev-id="ev_e9cfb0db21"
          onClick={() => setActiveTab('new')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">

            <Plus className="w-4 h-4" />
            Neuer Antrag
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div data-ev-id="ev_ef68f25e98" className="flex gap-2 border-b border-border">
        <button data-ev-id="ev_7a3208107f"
        onClick={() => setActiveTab('overview')}
        className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
        activeTab === 'overview' ?
        'border-primary text-primary' :
        'border-transparent text-muted-foreground hover:text-foreground'}`
        }>

          <FileText className="w-4 h-4 inline mr-2" />
          Übersicht
        </button>
        <button data-ev-id="ev_bcce4ad45c"
        onClick={() => setActiveTab('new')}
        className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
        activeTab === 'new' ?
        'border-primary text-primary' :
        'border-transparent text-muted-foreground hover:text-foreground'}`
        }>

          <Plus className="w-4 h-4 inline mr-2" />
          Neuer Antrag
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' &&
      <div data-ev-id="ev_e335263fc5" className="space-y-4">
          {/* Filters */}
          <div data-ev-id="ev_764bb24f53" className="flex flex-col sm:flex-row gap-4">
            <div data-ev-id="ev_bb1d4c175c" className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input data-ev-id="ev_8d69a16489"
            type="text"
            placeholder="Suchen nach Referenz, Veranstaltung, Ort..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background" />

            </div>
            <div data-ev-id="ev_c5e001860e" className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select data-ev-id="ev_b61171095a"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="pl-10 pr-8 py-2 border border-input rounded-lg bg-background appearance-none cursor-pointer">

                <option data-ev-id="ev_c492b969ce" value="all">Alle Status</option>
                <option data-ev-id="ev_3b66bb6e53" value="draft">Entwurf</option>
                <option data-ev-id="ev_80b3794802" value="submitted">Eingereicht</option>
                <option data-ev-id="ev_bec25f30f0" value="approved">Genehmigt</option>
                <option data-ev-id="ev_01a5e01575" value="rejected">Abgelehnt</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            {/* View Toggle */}
            <div data-ev-id="ev_2a859ca658" className="flex rounded-lg border border-input overflow-hidden">
              <button data-ev-id="ev_4056df6ad8"
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}>
                Liste
              </button>
              <button data-ev-id="ev_951c1c6105"
            onClick={() => setViewMode('grouped')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'grouped' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}>
                Gruppiert
              </button>
            </div>
          </div>

          {/* Stats */}
          <div data-ev-id="ev_0044a06145" className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div data-ev-id="ev_8f754b7993" className="bg-card border border-border rounded-lg p-4">
              <div data-ev-id="ev_2550f8c066" className="flex items-center gap-3">
                <div data-ev-id="ev_50563834b3" className="p-2 bg-gray-100 rounded-lg">
                  <Clock className="w-5 h-5 text-gray-600" />
                </div>
                <div data-ev-id="ev_6fbffeb420">
                  <p data-ev-id="ev_88e957358a" className="text-2xl font-bold">{eventParticipations.filter((e) => e.status === 'draft').length}</p>
                  <p data-ev-id="ev_9cfc54b127" className="text-sm text-muted-foreground">Entwürfe</p>
                </div>
              </div>
            </div>
            <div data-ev-id="ev_cf843f84aa" className="bg-card border border-border rounded-lg p-4">
              <div data-ev-id="ev_23ad0239ae" className="flex items-center gap-3">
                <div data-ev-id="ev_211e031dd0" className="p-2 bg-orange-100 rounded-lg">
                  <Send className="w-5 h-5 text-orange-600" />
                </div>
                <div data-ev-id="ev_0137c9e463">
                  <p data-ev-id="ev_10fa3152cf" className="text-2xl font-bold">{eventParticipations.filter((e) => e.status === 'submitted').length}</p>
                  <p data-ev-id="ev_b490e4b6c3" className="text-sm text-muted-foreground">Eingereicht</p>
                </div>
              </div>
            </div>
            <div data-ev-id="ev_70a1c45ade" className="bg-card border border-border rounded-lg p-4">
              <div data-ev-id="ev_fd70a326cb" className="flex items-center gap-3">
                <div data-ev-id="ev_ca941bc4eb" className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div data-ev-id="ev_fe4043bb4e">
                  <p data-ev-id="ev_ce1d9aa3ab" className="text-2xl font-bold">{eventParticipations.filter((e) => e.status === 'approved').length}</p>
                  <p data-ev-id="ev_0ebd4de148" className="text-sm text-muted-foreground">Genehmigt</p>
                </div>
              </div>
            </div>
            <div data-ev-id="ev_18e3d3e177" className="bg-card border border-border rounded-lg p-4">
              <div data-ev-id="ev_c85babff79" className="flex items-center gap-3">
                <div data-ev-id="ev_90b8b2b388" className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div data-ev-id="ev_090713a7a4">
                  <p data-ev-id="ev_7e18847934" className="text-2xl font-bold">{eventParticipations.filter((e) => e.status === 'rejected').length}</p>
                  <p data-ev-id="ev_9e2a39d8ba" className="text-sm text-muted-foreground">Abgelehnt</p>
                </div>
              </div>
            </div>
          </div>

          {/* List */}
          {loading ?
        <div data-ev-id="ev_de06a5a826" className="flex items-center justify-center py-12">
              <div data-ev-id="ev_51b295b75b" className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div> :
        filteredEntries.length === 0 ?
        <div data-ev-id="ev_52ba8cd52f" className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p data-ev-id="ev_d9c084231a">Keine Anträge gefunden</p>
            </div> :
        viewMode === 'grouped' ?
        <div data-ev-id="ev_4ad69d936d" className="space-y-6">
          {/* Eingereicht */}
          {filteredEntries.filter((e) => e.status === 'submitted').length > 0 &&
          <div data-ev-id="ev_abbffda4db" className="border border-orange-200 rounded-lg overflow-hidden bg-orange-50">
            <div data-ev-id="ev_914c8d97c4" className="px-4 py-3 flex items-center gap-3 border-b border-orange-200 bg-white/50">
              <Send className="w-5 h-5 text-orange-600" />
              <h3 data-ev-id="ev_3648733503" className="font-semibold">Eingereicht</h3>
              <span data-ev-id="ev_38c2c1ee7f" className="ml-auto text-sm text-muted-foreground">
                {filteredEntries.filter((e) => e.status === 'submitted').length} {filteredEntries.filter((e) => e.status === 'submitted').length === 1 ? 'Eintrag' : 'Einträge'}
              </span>
            </div>
            <div data-ev-id="ev_5337bd890d" className="divide-y divide-orange-200/50">
              {filteredEntries.filter((e) => e.status === 'submitted').map((entry) =>
              <div data-ev-id="ev_dfc2344444" key={entry.id} className="p-4 bg-white/80 hover:bg-white transition-colors cursor-pointer" onClick={() => {setSelectedEntry(entry);setShowDetail(true);}}>
                  <div data-ev-id="ev_76305ad639" className="flex items-center justify-between">
                    <div data-ev-id="ev_da1737cb8f" className="flex-1">
                      <div data-ev-id="ev_28f789a4cd" className="flex items-center gap-3">
                        <span data-ev-id="ev_87b0a5888e" className="font-mono text-sm text-muted-foreground">{entry.reference_number}</span>
                        <span data-ev-id="ev_cd880b90d6" className="font-medium">{entry.event_name}</span>
                      </div>
                      <div data-ev-id="ev_5cc879cdfb" className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span data-ev-id="ev_76f557d21f" className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(entry.event_date)}</span>
                        <span data-ev-id="ev_6a2c66bdf7" className="flex items-center gap-1"><Users className="w-3 h-3" />{entry.max_participants} TN</span>
                        {renderAmount(entry)}
                        {renderAmountConfirmedBadge(entry)}
                        {entry.email_status && entry.email_status !== 'none' &&
                      <span data-ev-id="ev_a506619423" className={`flex items-center gap-1 ${
                      entry.email_status === 'sent' ? 'text-green-600' :
                      entry.email_status === 'failed' ? 'text-red-500' :
                      entry.email_status === 'pending' ? 'text-amber-500' : ''}`
                      }>
                            {entry.email_status === 'sent' && <MailCheck className="w-3 h-3" />}
                            {entry.email_status === 'failed' && <MailX className="w-3 h-3" />}
                            {entry.email_status === 'pending' && <Loader2 className="w-3 h-3 animate-spin" />}
                            {entry.email_status === 'sent' ? 'E-Mail gesendet' : entry.email_status === 'failed' ? 'E-Mail Fehler' : 'Senden...'}
                          </span>
                      }
                      </div>
                    </div>
                    <div data-ev-id="ev_6d03865529" className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {canApprove && <>
                        <button data-ev-id="ev_03ae764eba" onClick={() => handleApproveEntry(entry.id)} className="p-2 hover:bg-green-100 rounded-lg transition-colors text-green-600" title="Genehmigen"><CheckCircle className="w-4 h-4" /></button>
                        <button data-ev-id="ev_679cb62241" onClick={() => openRejectModal(entry)} className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600" title="Ablehnen"><XCircle className="w-4 h-4" /></button>
                      </>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          }
          {/* Genehmigt */}
          {filteredEntries.filter((e) => e.status === 'approved').length > 0 &&
          <div data-ev-id="ev_3d1dc97ad0" className="border border-green-200 rounded-lg overflow-hidden bg-green-50">
            <div data-ev-id="ev_915b751513" className="px-4 py-3 flex items-center gap-3 border-b border-green-200 bg-white/50">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 data-ev-id="ev_b470ef8eb9" className="font-semibold">Genehmigt</h3>
              <span data-ev-id="ev_3c613ab731" className="ml-auto text-sm text-muted-foreground">
                {filteredEntries.filter((e) => e.status === 'approved').length} {filteredEntries.filter((e) => e.status === 'approved').length === 1 ? 'Eintrag' : 'Einträge'}
              </span>
            </div>
            <div data-ev-id="ev_621b228d93" className="divide-y divide-green-200/50">
              {filteredEntries.filter((e) => e.status === 'approved').map((entry) =>
              <div data-ev-id="ev_25574b99e8" key={entry.id} className="p-4 bg-white/80 hover:bg-white transition-colors cursor-pointer" onClick={() => {setSelectedEntry(entry);setShowDetail(true);}}>
                  <div data-ev-id="ev_bdc18d6dda" className="flex items-center justify-between">
                    <div data-ev-id="ev_25aad7393a" className="flex-1">
                      <div data-ev-id="ev_3a8094fdc5" className="flex items-center gap-3">
                        <span data-ev-id="ev_8db52f8c0a" className="font-mono text-sm text-muted-foreground">{entry.reference_number}</span>
                        <span data-ev-id="ev_38dcd645ae" className="font-medium">{entry.event_name}</span>
                      </div>
                      <div data-ev-id="ev_2117edbf10" className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span data-ev-id="ev_d3a4910cdd" className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(entry.event_date)}</span>
                        <span data-ev-id="ev_2351075f88" className="flex items-center gap-1"><Users className="w-3 h-3" />{entry.max_participants} TN</span>
                        {renderAmount(entry)}
                        {renderAmountConfirmedBadge(entry)}
                        {entry.email_status && entry.email_status !== 'none' &&
                      <span data-ev-id="ev_b9ebef5e21" className={`flex items-center gap-1 ${
                      entry.email_status === 'sent' ? 'text-green-600' :
                      entry.email_status === 'failed' ? 'text-red-500' :
                      entry.email_status === 'pending' ? 'text-amber-500' : ''}`
                      }>
                            {entry.email_status === 'sent' && <MailCheck className="w-3 h-3" />}
                            {entry.email_status === 'failed' && <MailX className="w-3 h-3" />}
                            {entry.email_status === 'pending' && <Loader2 className="w-3 h-3 animate-spin" />}
                            {entry.email_status === 'sent' ? 'E-Mail gesendet' : entry.email_status === 'failed' ? 'E-Mail Fehler' : 'Senden...'}
                          </span>
                      }
                      </div>
                    </div>
                    <div data-ev-id="ev_fc53008132" className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {canGeneratePdf && <button data-ev-id="ev_588bddf995" onClick={() => handleDownloadPdf(entry)} className="p-2 hover:bg-muted rounded-lg transition-colors" title="PDF herunterladen"><Download className="w-4 h-4" /></button>}
                      {canDelete && <button data-ev-id="ev_29e48007aa" onClick={() => handleDelete(entry.id)} className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600" title="Löschen"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          }
          {/* Abgelehnt */}
          {filteredEntries.filter((e) => e.status === 'rejected').length > 0 &&
          <div data-ev-id="ev_01840f14e9" className="border border-red-200 rounded-lg overflow-hidden bg-red-50">
            <div data-ev-id="ev_797da9c1e7" className="px-4 py-3 flex items-center gap-3 border-b border-red-200 bg-white/50">
              <XCircle className="w-5 h-5 text-red-600" />
              <h3 data-ev-id="ev_9f344679c5" className="font-semibold">Abgelehnt</h3>
              <span data-ev-id="ev_c35bcbaadd" className="ml-auto text-sm text-muted-foreground">
                {filteredEntries.filter((e) => e.status === 'rejected').length} {filteredEntries.filter((e) => e.status === 'rejected').length === 1 ? 'Eintrag' : 'Einträge'}
              </span>
            </div>
            <div data-ev-id="ev_e53951b878" className="divide-y divide-red-200/50">
              {filteredEntries.filter((e) => e.status === 'rejected').map((entry) =>
              <div data-ev-id="ev_42fccaf009" key={entry.id} className="p-4 bg-white/80 hover:bg-white transition-colors cursor-pointer" onClick={() => {setSelectedEntry(entry);setShowDetail(true);}}>
                  <div data-ev-id="ev_122146aa00" className="flex items-center justify-between">
                    <div data-ev-id="ev_5efdc35b69" className="flex-1">
                      <div data-ev-id="ev_53b210a828" className="flex items-center gap-3">
                        <span data-ev-id="ev_a92576a0d7" className="font-mono text-sm text-muted-foreground">{entry.reference_number}</span>
                        <span data-ev-id="ev_1ee522e522" className="font-medium">{entry.event_name}</span>
                      </div>
                      <div data-ev-id="ev_569902bab9" className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span data-ev-id="ev_3f921de2a2" className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(entry.event_date)}</span>
                        <span data-ev-id="ev_1bd03872a1" className="flex items-center gap-1"><Users className="w-3 h-3" />{entry.max_participants} TN</span>
                        {renderAmount(entry)}
                        {renderAmountConfirmedBadge(entry)}
                      </div>
                      {entry.rejected_reason && <p data-ev-id="ev_84aa2332b1" className="text-sm text-red-600 mt-1">Grund: {entry.rejected_reason}</p>}
                    </div>
                    <div data-ev-id="ev_661895bd12" className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {canDelete && <button data-ev-id="ev_6049a254c8" onClick={() => handleDelete(entry.id)} className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600" title="Löschen"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          }
          {/* Entwürfe */}
          {filteredEntries.filter((e) => e.status === 'draft').length > 0 &&
          <div data-ev-id="ev_2305453513" className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
            <div data-ev-id="ev_b6b5c6a0f7" className="px-4 py-3 flex items-center gap-3 border-b border-gray-200 bg-white/50">
              <Clock className="w-5 h-5 text-gray-600" />
              <h3 data-ev-id="ev_cb9ec7820b" className="font-semibold">Entwürfe</h3>
              <span data-ev-id="ev_de6fadf1ef" className="ml-auto text-sm text-muted-foreground">
                {filteredEntries.filter((e) => e.status === 'draft').length} {filteredEntries.filter((e) => e.status === 'draft').length === 1 ? 'Eintrag' : 'Einträge'}
              </span>
            </div>
            <div data-ev-id="ev_23fce820a6" className="divide-y divide-gray-200/50">
              {filteredEntries.filter((e) => e.status === 'draft').map((entry) =>
              <div data-ev-id="ev_21a3ef5385" key={entry.id} className="p-4 bg-white/80 hover:bg-white transition-colors cursor-pointer" onClick={() => {setSelectedEntry(entry);setShowDetail(true);}}>
                  <div data-ev-id="ev_238351449c" className="flex items-center justify-between">
                    <div data-ev-id="ev_c52c209669" className="flex-1">
                      <div data-ev-id="ev_1b55e6b050" className="flex items-center gap-3">
                        <span data-ev-id="ev_936d40ab0c" className="font-mono text-sm text-muted-foreground">{entry.reference_number}</span>
                        <span data-ev-id="ev_f57d65bac6" className="font-medium">{entry.event_name}</span>
                      </div>
                      <div data-ev-id="ev_54b66d8384" className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span data-ev-id="ev_e648945afb" className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(entry.event_date)}</span>
                        <span data-ev-id="ev_20281b7316" className="flex items-center gap-1"><Users className="w-3 h-3" />{entry.max_participants} TN</span>
                        {renderAmount(entry)}
                        {renderAmountConfirmedBadge(entry)}
                      </div>
                    </div>
                    <div data-ev-id="ev_d2280a5f5a" className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button data-ev-id="ev_27ce3b02dc" onClick={() => handleSubmitEntry(entry.id)} className="p-2 hover:bg-orange-100 rounded-lg transition-colors text-orange-600" title="Einreichen"><Send className="w-4 h-4" /></button>
                      <button data-ev-id="ev_d2c08306bd" onClick={() => handleDelete(entry.id)} className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600" title="Löschen"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          }
        </div> :

        <div data-ev-id="ev_4e96e6209d" className="bg-card border border-border rounded-lg overflow-hidden">
              <div data-ev-id="ev_09d170af14" className="overflow-x-auto">
                <table data-ev-id="ev_9ecf3b127f" className="w-full">
                  <thead data-ev-id="ev_d08e0ac176" className="bg-muted/50">
                    <tr data-ev-id="ev_92e881f201">
                      <th data-ev-id="ev_ea8152cb4a" className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Referenz</th>
                      <th data-ev-id="ev_3d0b35e849" className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Veranstaltung</th>
                      <th data-ev-id="ev_bbb29a90f3" className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Datum</th>
                      <th data-ev-id="ev_f18a43b2be" className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Teilnehmer</th>
                      <th data-ev-id="ev_fbe17e1dc6" className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Kosten</th>
                      <th data-ev-id="ev_confirmed_th" className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Bestätigt</th>
                      <th data-ev-id="ev_payment_method_th" className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Zahlungsart</th>
                      <th data-ev-id="ev_c1decb7190" className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Status</th>
                      <th data-ev-id="ev_email_th" className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">E-Mail</th>
                      <th data-ev-id="ev_2a390b160f" className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody data-ev-id="ev_4ababac41d" className="divide-y divide-border">
                    {filteredEntries.map((entry) =>
                <tr data-ev-id="ev_10b3548504"
                key={entry.id}
                className={`hover:bg-muted/50 transition-colors cursor-pointer ${getRowBackground(entry.status)}`}
                onClick={() => {
                  setSelectedEntry(entry);
                  setShowDetail(true);
                }}>

                        <td data-ev-id="ev_c1172b939a" className="px-4 py-3 font-mono text-sm">{entry.reference_number}</td>
                        <td data-ev-id="ev_f28be86b81" className="px-4 py-3">
                          <div data-ev-id="ev_ea6ccd68b1" className="font-medium">{entry.event_name}</div>
                          {entry.event_location &&
                    <div data-ev-id="ev_a292ab9a68" className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {entry.event_location}
                            </div>
                    }
                        </td>
                        <td data-ev-id="ev_21943bf869" className="px-4 py-3">{formatDate(entry.event_date)}</td>
                        <td data-ev-id="ev_b1a69b7d26" className="px-4 py-3">
                          <div data-ev-id="ev_664afb2160" className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            {entry.max_participants}
                          </div>
                        </td>
                        <td data-ev-id="ev_f54d84d2ce" className="px-4 py-3 text-right">{renderAmount(entry)}</td>
                        <td data-ev-id="ev_confirmed_td" className="px-4 py-3 text-center">
                          {entry.amount_confirmed ?
                    <span data-ev-id="ev_d1c930aaa4"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"
                    title={`Bestätigt am ${entry.amount_confirmed_at ? new Date(entry.amount_confirmed_at).toLocaleDateString('de-DE') : ''}`}>

                              <BadgeCheck className="w-3 h-3" />
                              Ja
                            </span> :

                    <span data-ev-id="ev_d539a29fd7" className="text-xs text-muted-foreground">—</span>
                    }
                        </td>
                        <td data-ev-id="ev_payment_method_td" className="px-4 py-3 text-center">
                          <span data-ev-id="ev_ed6d983ea8" className={`px-2 py-1 rounded text-xs ${
                    entry.payment_method === 'cash' ?
                    'bg-amber-100 text-amber-700' :
                    entry.payment_method === 'direct_to_organizer' ?
                    'bg-purple-100 text-purple-700' :
                    'bg-blue-100 text-blue-700'}`
                    }>
                            {entry.payment_method === 'cash' ? 'Bar' : entry.payment_method === 'direct_to_organizer' ? 'Rechnung' : 'Überweisung'}
                          </span>
                        </td>
                        <td data-ev-id="ev_e654d7c8f4" className="px-4 py-3 text-center">{getStatusBadge(entry.status)}</td>
                        <td data-ev-id="ev_email_status_td" className="px-4 py-3 text-center">
                          {entry.email_status && entry.email_status !== 'none' &&
                    <span data-ev-id="ev_7ccf595a38" className={`inline-flex items-center gap-1 text-xs ${
                    entry.email_status === 'sent' ? 'text-green-600' :
                    entry.email_status === 'failed' ? 'text-red-500' :
                    entry.email_status === 'pending' ? 'text-amber-500' :
                    'text-muted-foreground'}`
                    }>
                              {entry.email_status === 'sent' && <MailCheck className="w-3 h-3" />}
                              {entry.email_status === 'failed' && <MailX className="w-3 h-3" />}
                              {entry.email_status === 'pending' && <Loader2 className="w-3 h-3 animate-spin" />}
                              {entry.email_status === 'sent' ? 'Gesendet' : entry.email_status === 'failed' ? 'Fehler' : 'Senden...'}
                            </span>
                    }
                        </td>
                        <td data-ev-id="ev_66b54b42e8" className="px-4 py-3">
                          <div data-ev-id="ev_073825e445" className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {entry.status === 'draft' &&
                      <>
                                <button data-ev-id="ev_806e28da6f"
                        onClick={() => handleSubmitEntry(entry.id)}
                        className="p-2 hover:bg-orange-100 rounded-lg transition-colors text-orange-600"
                        title="Einreichen">

                                  <Send className="w-4 h-4" />
                                </button>
                                <button data-ev-id="ev_d2f5ebff79"
                        onClick={() => handleDelete(entry.id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                        title="Löschen">

                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                      }
                            {entry.status === 'submitted' && canApprove &&
                      <>
                                <button data-ev-id="ev_5c030b77a1"
                        onClick={() => handleApproveEntry(entry.id)}
                        className="p-2 hover:bg-green-100 rounded-lg transition-colors text-green-600"
                        title="Genehmigen">

                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button data-ev-id="ev_0984be2602"
                        onClick={() => openRejectModal(entry)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                        title="Ablehnen">

                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                      }
                            {entry.status === 'approved' && canGeneratePdf &&
                      <button data-ev-id="ev_49f32b406a"
                      onClick={() => handleDownloadPdf(entry)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title="PDF herunterladen">

                                <Download className="w-4 h-4" />
                              </button>
                      }
                            {canDelete &&
                      <button data-ev-id="ev_4d824c370a"
                      onClick={() => handleDelete(entry.id)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                      title="Löschen">

                                <Trash2 className="w-4 h-4" />
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

      {/* New Entry Form */}
      {activeTab === 'new' &&
      <div data-ev-id="ev_9c3c8328cc" className="bg-card border border-border rounded-lg p-6">
          <h2 data-ev-id="ev_f148306354" className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Neuer Antrag - Teilnahme Veranstaltung
          </h2>

          <div data-ev-id="ev_eebb0f426e" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Event Name */}
            <div data-ev-id="ev_6cef7b6331" className="md:col-span-2">
              <label data-ev-id="ev_acc95106f1" className="block text-sm font-medium mb-1">
                Veranstaltungsname <span data-ev-id="ev_99e1ed3e36" className="text-red-500">*</span>
              </label>
              <input data-ev-id="ev_e7912301ed"
            type="text"
            value={formData.event_name}
            onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
            className="w-full px-4 py-2 border border-input rounded-lg bg-background"
            placeholder="Sportveranstaltung, Ausflug usw..."
            required />

            </div>

            {/* Event Date */}
            <div data-ev-id="ev_bd1fb058ab">
              <label data-ev-id="ev_9a2cb22e07" className="block text-sm font-medium mb-1">
                Datum <span data-ev-id="ev_aad4503c25" className="text-red-500">*</span>
              </label>
              <input data-ev-id="ev_3a115529ab"
            type="date"
            value={formData.event_date}
            onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
            className="w-full px-4 py-2 border border-input rounded-lg bg-background"
            required />

            </div>

            {/* Location */}
            <div data-ev-id="ev_915b751513">
              <label data-ev-id="ev_9f0395c355" className="block text-sm font-medium mb-1">Veranstaltungsort</label>
              <div data-ev-id="ev_b382982c7e" className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input data-ev-id="ev_9271a60e38"
              type="text"
              value={formData.event_location || ''}
              onChange={(e) => setFormData({ ...formData, event_location: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background"
              placeholder="Ort der Veranstaltung" />

              </div>
            </div>

            {/* Organizer */}
            <div data-ev-id="ev_7c55de3b98">
              <label data-ev-id="ev_45251299ef" className="block text-sm font-medium mb-1">Veranstalter</label>
              <input data-ev-id="ev_4897507e64"
            type="text"
            value={formData.organizer || ''}
            onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
            className="w-full px-4 py-2 border border-input rounded-lg bg-background"
            placeholder="Name des Veranstalters" />

            </div>

            {/* Participants */}
            <div data-ev-id="ev_91f0d83acd">
              <label data-ev-id="ev_f16a877a6c" className="block text-sm font-medium mb-1">Max. Anzahl Teilnehmer *

            </label>
              <div data-ev-id="ev_915f820fb7" className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input data-ev-id="ev_7ece984444"
              type="number"
              min="1"
              value={formData.max_participants}
              onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) || 1 })}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background"
              required />

              </div>
            </div>

            {/* Estimated Costs */}
            <div data-ev-id="ev_ad9843d00f">
              <label data-ev-id="ev_6a4872627a" className="block text-sm font-medium mb-1">Geschätzte Kosten</label>
              <div data-ev-id="ev_8bd76beae0" className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input data-ev-id="ev_93f4ce9bc7"
              type="number"
              min="0"
              step="0.01"
              value={formData.estimated_costs || ''}
              onChange={(e) => setFormData({ ...formData, estimated_costs: parseFloat(e.target.value) || 0 })}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background"
              placeholder="0,00" />

              </div>
            </div>

            {/* Payment Method Section - only show if costs > 0 */}
            {formData.estimated_costs > 0 &&
          <div data-ev-id="ev_payment_section" className="md:col-span-2 p-4 bg-muted/30 border border-border rounded-lg space-y-4">
                <label data-ev-id="ev_payment_label" className="block text-sm font-medium mb-3">
                  <Banknote className="w-4 h-4 inline mr-2" />
                  Zahlungsart <span data-ev-id="ev_7d3c269bef" className="text-red-500">*</span>
                </label>
                
                <div data-ev-id="ev_payment_options" className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Cash Option */}
                  <label data-ev-id="ev_4b6a6a4f31"
              className={`relative flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
              formData.payment_method === 'cash' ?
              'border-amber-500 bg-amber-50' :
              'border-input hover:border-amber-300 hover:bg-amber-50/50'}`
              }>

                    <input data-ev-id="ev_574c68dc7c"
                type="radio"
                name="payment_method"
                value="cash"
                checked={formData.payment_method === 'cash'}
                onChange={() => setFormData({ ...formData, payment_method: 'cash', organizer_iban: null })}
                className="sr-only" />

                    <div data-ev-id="ev_1258ae99a1" className={`p-2 rounded-lg ${formData.payment_method === 'cash' ? 'bg-amber-100' : 'bg-muted'}`}>
                      <Banknote className={`w-5 h-5 ${formData.payment_method === 'cash' ? 'text-amber-600' : 'text-muted-foreground'}`} />
                    </div>
                    <div data-ev-id="ev_8e9e208424">
                      <p data-ev-id="ev_118d184c9d" className="font-medium">Bar</p>
                      <p data-ev-id="ev_1f51eac440" className="text-xs text-muted-foreground">Bargeldzahlung</p>
                    </div>
                    {formData.payment_method === 'cash' &&
                <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-amber-600" />
                }
                  </label>

                  {/* Transfer Option */}
                  <label data-ev-id="ev_e407a6b694"
              className={`relative flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
              formData.payment_method === 'transfer' ?
              'border-blue-500 bg-blue-50' :
              'border-input hover:border-blue-300 hover:bg-blue-50/50'}`
              }>

                    <input data-ev-id="ev_33fdf28779"
                type="radio"
                name="payment_method"
                value="transfer"
                checked={formData.payment_method === 'transfer'}
                onChange={() => setFormData({ ...formData, payment_method: 'transfer', organizer_iban: null })}
                className="sr-only" />

                    <div data-ev-id="ev_2cebd368e2" className={`p-2 rounded-lg ${formData.payment_method === 'transfer' ? 'bg-blue-100' : 'bg-muted'}`}>
                      <CreditCard className={`w-5 h-5 ${formData.payment_method === 'transfer' ? 'text-blue-600' : 'text-muted-foreground'}`} />
                    </div>
                    <div data-ev-id="ev_734d323095">
                      <p data-ev-id="ev_d0f132d02f" className="font-medium">Überweisung</p>
                      <p data-ev-id="ev_7a658dd228" className="text-xs text-muted-foreground">IBAN an Antragsteller</p>
                    </div>
                    {formData.payment_method === 'transfer' &&
                <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-blue-600" />
                }
                  </label>

                  {/* Direct to Organizer Option */}
                  <label data-ev-id="ev_337c8a7fa8"
              className={`relative flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
              formData.payment_method === 'direct_to_organizer' ?
              'border-purple-500 bg-purple-50' :
              'border-input hover:border-purple-300 hover:bg-purple-50/50'}`
              }>

                    <input data-ev-id="ev_297fafa6cb"
                type="radio"
                name="payment_method"
                value="direct_to_organizer"
                checked={formData.payment_method === 'direct_to_organizer'}
                onChange={() => setFormData({ ...formData, payment_method: 'direct_to_organizer' })}
                className="sr-only" />

                    <div data-ev-id="ev_3d754086f7" className={`p-2 rounded-lg ${formData.payment_method === 'direct_to_organizer' ? 'bg-purple-100' : 'bg-muted'}`}>
                      <Building2 className={`w-5 h-5 ${formData.payment_method === 'direct_to_organizer' ? 'text-purple-600' : 'text-muted-foreground'}`} />
                    </div>
                    <div data-ev-id="ev_54bf14efc9">
                      <p data-ev-id="ev_7ac5314985" className="font-medium">Rechnung</p>
                      <p data-ev-id="ev_90a3d3e0a1" className="text-xs text-muted-foreground">An Veranstalter</p>
                    </div>
                    {formData.payment_method === 'direct_to_organizer' &&
                <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-purple-600" />
                }
                  </label>
                </div>

                {/* Payment Details Confirmation for Direct to Organizer */}
                {formData.payment_method === 'direct_to_organizer' &&
            <div data-ev-id="ev_payment_details_field" className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
                    <div data-ev-id="ev_info_box" className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p data-ev-id="ev_info_text" className="text-sm text-blue-800">
                        <strong data-ev-id="ev_0f25084796">So funktioniert die Rechnungszahlung:</strong><br data-ev-id="ev_5674753e9f" />
                        Nach Genehmigung erhalten Sie eine E-Mail mit der Bitte, die Rechnungsdetails (IBAN, Empfänger, Betrag) an den Kassier zu übermitteln. Der Kassier überweist dann direkt an den Rechnungssteller.
                      </p>
                    </div>
                    
                    <label data-ev-id="ev_checkbox_label" className="flex items-start gap-3 cursor-pointer group">
                      <div data-ev-id="ev_checkbox_wrapper" className="flex-shrink-0 mt-0.5">
                        <input data-ev-id="ev_69c63bc37a"
                  type="checkbox"
                  checked={paymentDetailsAccepted}
                  onChange={(e) => {
                    setPaymentDetailsAccepted(e.target.checked);
                    setFormData({ ...formData, payment_details_accepted: e.target.checked });
                  }}
                  className="w-5 h-5 rounded border-purple-300 text-purple-600 focus:ring-purple-500" />

                      </div>
                      <span data-ev-id="ev_checkbox_text" className="text-sm text-foreground group-hover:text-purple-700">
                        <strong data-ev-id="ev_4ac922f5fd">Ich bestätige:</strong> Ich werde die vollständigen Zahlungsdetails (IBAN, Empfängername, ggf. Verwendungszweck) nach Genehmigung per E-Mail an den Kassier übermitteln.
                        <span data-ev-id="ev_06fc8802ca" className="text-red-500"> *</span>
                      </span>
                    </label>
                  </div>
            }
              </div>
          }

            {/* Transport Type */}
            <div data-ev-id="ev_dd9787c209">
              <label data-ev-id="ev_98a0aee255" className="block text-sm font-medium mb-1">Transportart</label>
              <div data-ev-id="ev_39bd8cba01" className="relative">
                <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select data-ev-id="ev_cf7fefdd0b"
              value={formData.transport_type || ''}
              onChange={(e) => setFormData({ ...formData, transport_type: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background appearance-none cursor-pointer">

                  <option data-ev-id="ev_7b3425c31d" value="">Bitte wählen...</option>
                  <option data-ev-id="ev_c4ebb4f1e4" value="Privat-PKW">Privat-PKW</option>
                  <option data-ev-id="ev_da94e7c1f3" value="Feuerwehrfahrzeug">Feuerwehrfahrzeug</option>
                  <option data-ev-id="ev_04cdee02c4" value="Öffentliche Verkehrsmittel">Öffentliche Verkehrsmittel</option>
                  <option data-ev-id="ev_8c2ed0eda4" value="Fahrgemeinschaft">Fahrgemeinschaft</option>
                  <option data-ev-id="ev_1a0620ad1e" value="Sonstiges">Sonstiges</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Overnight Required */}
            <div data-ev-id="ev_5f03b32aba" className="flex items-center gap-3">
              <input data-ev-id="ev_86e06d6926"
            type="checkbox"
            id="overnight"
            checked={formData.overnight_required || false}
            onChange={(e) => setFormData({ ...formData, overnight_required: e.target.checked })}
            className="w-4 h-4 rounded border-input" />

              <label data-ev-id="ev_291d442278" htmlFor="overnight" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <Moon className="w-4 h-4 text-muted-foreground" />
                Übernachtung erforderlich
              </label>
            </div>

            {/* Description */}
            <div data-ev-id="ev_ee5e9f42c1" className="md:col-span-2">
              <label data-ev-id="ev_7d25f5778e" className="block text-sm font-medium mb-1">Beschreibung</label>
              <textarea data-ev-id="ev_0389068e9e"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-input rounded-lg bg-background resize-none"
            rows={3}
            placeholder="Kurze Beschreibung der Veranstaltung..." />

            </div>

            {/* Notes */}
            <div data-ev-id="ev_460bfeb322" className="md:col-span-2">
              <label data-ev-id="ev_ad19f6a6bf" className="block text-sm font-medium mb-1">Anmerkungen</label>
              <textarea data-ev-id="ev_83caf19e45"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-2 border border-input rounded-lg bg-background resize-none"
            rows={2}
            placeholder="Zusätzliche Anmerkungen..." />

            </div>

            {/* Attachment */}
            <div data-ev-id="ev_370478221a" className="md:col-span-2">
              <label data-ev-id="ev_48e3d12680" className="block text-sm font-medium mb-1">Anhang</label>
              {formData.attachment_url ?
            <div data-ev-id="ev_4a2920b5c5" className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  {formData.attachment_name?.match(/\.(jpg|jpeg|png|webp)$/i) ?
              <Image className="w-5 h-5 text-blue-500" /> :

              <File className="w-5 h-5 text-red-500" />
              }
                  <span data-ev-id="ev_f5211ece4c" className="flex-1 text-sm truncate">{formData.attachment_name}</span>
                  <button data-ev-id="ev_c57fa4a923"
              type="button"
              onClick={removeAttachment}
              className="p-1 hover:bg-red-100 rounded text-red-500">

                    <X className="w-4 h-4" />
                  </button>
                </div> :

            <label data-ev-id="ev_e557643878" className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-input rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input data-ev-id="ev_6edb8ac13b"
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileUpload}
              disabled={uploadingFile} />

                  {uploadingFile ?
              <div data-ev-id="ev_d79da31370" className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> :

              <Upload className="w-5 h-5 text-muted-foreground" />
              }
                  <span data-ev-id="ev_00aefa431e" className="text-sm text-muted-foreground">
                    {uploadingFile ? 'Wird hochgeladen...' : 'Datei hochladen (max. 5 MB)'}
                  </span>
                </label>
            }
            </div>
          </div>

          {/* Actions */}
          <div data-ev-id="ev_372e719ff2" className="flex gap-3 mt-6 pt-6 border-t border-border">
            <button data-ev-id="ev_b59c09188d"
          type="button"
          onClick={() => {
            resetForm();
            setActiveTab('overview');
          }}
          className="px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors"
          disabled={submitting}>

              Abbrechen
            </button>
            <button data-ev-id="ev_7c8962e825"
          type="button"
          onClick={() => handleCreateEntry(false)}
          className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
          disabled={submitting}>

              Als Entwurf speichern
            </button>
            <button data-ev-id="ev_57ee70e28e"
          type="button"
          onClick={() => handleCreateEntry(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          disabled={submitting}>

              <Send className="w-4 h-4" />
              {submitting ? 'Wird gespeichert...' : 'Speichern & Einreichen'}
            </button>
          </div>
        </div>
      }

      {/* Detail Modal */}
      {showDetail && selectedEntry &&
      <div data-ev-id="ev_54ef3c3f9f" className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div data-ev-id="ev_ae9aa837f8" className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div data-ev-id="ev_ca60a8183a" className="flex items-center justify-between p-4 border-b border-border">
              <h3 data-ev-id="ev_3f96177289" className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {selectedEntry.reference_number}
              </h3>
              <button data-ev-id="ev_ddfb8d8478"
            onClick={() => setShowDetail(false)}
            className="p-2 hover:bg-muted rounded-lg transition-colors">

                <X className="w-5 h-5" />
              </button>
            </div>
            <div data-ev-id="ev_906a2554f9" className="p-4 space-y-4">
              <div data-ev-id="ev_17d088799c" className="flex items-center gap-2">
                {getStatusBadge(selectedEntry.status)}
              </div>

              <div data-ev-id="ev_d7e539e844" className="grid grid-cols-2 gap-4">
                <div data-ev-id="ev_c854a50228">
                  <p data-ev-id="ev_f97f4d19c2" className="text-sm text-muted-foreground">Veranstaltung</p>
                  <p data-ev-id="ev_f0632b7434" className="font-medium">{selectedEntry.event_name}</p>
                </div>
                <div data-ev-id="ev_fe13f0ff9f">
                  <p data-ev-id="ev_376bfdf3dd" className="text-sm text-muted-foreground">Datum</p>
                  <p data-ev-id="ev_2febf86355" className="font-medium">{formatDate(selectedEntry.event_date)}</p>
                </div>
                {selectedEntry.event_location &&
              <div data-ev-id="ev_851d596219">
                    <p data-ev-id="ev_6e9264d0e7" className="text-sm text-muted-foreground">Ort</p>
                    <p data-ev-id="ev_b1946ccf84" className="font-medium">{selectedEntry.event_location}</p>
                  </div>
              }
                {selectedEntry.organizer &&
              <div data-ev-id="ev_0cd8d795e0">
                    <p data-ev-id="ev_7d1ec235c6" className="text-sm text-muted-foreground">Veranstalter</p>
                    <p data-ev-id="ev_9121d3d66e" className="font-medium">{selectedEntry.organizer}</p>
                  </div>
              }
                <div data-ev-id="ev_f71e7a28d7">
                  <p data-ev-id="ev_6a2e910a6d" className="text-sm text-muted-foreground">Teilnehmer</p>
                  <p data-ev-id="ev_8749b489cc" className="font-medium">{selectedEntry.max_participants}</p>
                </div>
                <div data-ev-id="ev_b85255db69">
                  <p data-ev-id="ev_4c1ff08eb7" className="text-sm text-muted-foreground">
                    {selectedEntry.confirmed_amount !== null && selectedEntry.confirmed_amount !== selectedEntry.estimated_costs ? 'Kosten (Original / Bestätigt)' : 'Geschätzte Kosten'}
                  </p>
                  {renderAmount(selectedEntry, true)}
                </div>
                <div data-ev-id="ev_payment_method_detail">
                  <p data-ev-id="ev_5810e8ade9" className="text-sm text-muted-foreground">Zahlungsart</p>
                  <span data-ev-id="ev_185cd29016" className={`inline-block mt-1 px-2 py-1 rounded text-xs ${
                selectedEntry.payment_method === 'cash' ?
                'bg-amber-100 text-amber-700' :
                selectedEntry.payment_method === 'direct_to_organizer' ?
                'bg-purple-100 text-purple-700' :
                'bg-blue-100 text-blue-700'}`
                }>
                    {selectedEntry.payment_method === 'cash' ? 'Bar' : selectedEntry.payment_method === 'direct_to_organizer' ? 'Rechnung' : 'Überweisung'}
                  </span>
                </div>
                {selectedEntry.organizer_iban &&
              <div data-ev-id="ev_organizer_iban_detail" className="col-span-2">
                  <p data-ev-id="ev_00d3a928f3" className="text-sm text-muted-foreground">IBAN Veranstalter</p>
                  <p data-ev-id="ev_acc742a943" className="font-mono font-medium">{selectedEntry.organizer_iban}</p>
                </div>
              }
                {selectedEntry.transport_type &&
              <div data-ev-id="ev_23e29391a9">
                    <p data-ev-id="ev_7759624b1a" className="text-sm text-muted-foreground">Transport</p>
                    <p data-ev-id="ev_3de903036e" className="font-medium">{selectedEntry.transport_type}</p>
                  </div>
              }
                <div data-ev-id="ev_71e4893da3">
                  <p data-ev-id="ev_0d55f71692" className="text-sm text-muted-foreground">\u00dcbernachtung</p>
                  <p data-ev-id="ev_03e77c0ca7" className="font-medium">{selectedEntry.overnight_required ? 'Ja' : 'Nein'}</p>
                </div>
              </div>

              {selectedEntry.description &&
            <div data-ev-id="ev_bde78751ba">
                  <p data-ev-id="ev_9026ecfb5d" className="text-sm text-muted-foreground">Beschreibung</p>
                  <p data-ev-id="ev_a45c3a5d1a" className="mt-1">{selectedEntry.description}</p>
                </div>
            }

              {selectedEntry.notes &&
            <div data-ev-id="ev_faeec8d1f1">
                  <p data-ev-id="ev_40b4321aba" className="text-sm text-muted-foreground">Anmerkungen</p>
                  <p data-ev-id="ev_0ef0dd302b" className="mt-1">{selectedEntry.notes}</p>
                </div>
            }

              {selectedEntry.attachment_url &&
            <div data-ev-id="ev_0a195f004c">
                  <p data-ev-id="ev_d342fc3ce9" className="text-sm text-muted-foreground mb-2">Anhang</p>
                  <a data-ev-id="ev_aa0c368ea0"
              href={selectedEntry.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors">

                    <Paperclip className="w-4 h-4" />
                    {selectedEntry.attachment_name || 'Anhang anzeigen'}
                  </a>
                </div>
            }

              <div data-ev-id="ev_bf9c8682a0" className="pt-4 border-t border-border space-y-2">
                <div data-ev-id="ev_e265cbab3f" className="flex justify-between text-sm">
                  <span data-ev-id="ev_80e744327e" className="text-muted-foreground">Erstellt von</span>
                  <span data-ev-id="ev_61cd2fbe6c">{getProfileName(selectedEntry.created_by)} ({formatDateTime(selectedEntry.created_at)})</span>
                </div>
                {selectedEntry.submitted_at &&
              <div data-ev-id="ev_ee612bab63" className="flex justify-between text-sm">
                    <span data-ev-id="ev_e9ca31d842" className="text-muted-foreground">Eingereicht am</span>
                    <span data-ev-id="ev_2cd18d9c4b">{formatDateTime(selectedEntry.submitted_at)}</span>
                  </div>
              }
                {selectedEntry.approved_at &&
              <div data-ev-id="ev_133c9be1e1" className="flex justify-between text-sm">
                    <span data-ev-id="ev_31f7235bea" className="text-muted-foreground">Genehmigt von</span>
                    <span data-ev-id="ev_6e98a8460c">{getProfileName(selectedEntry.approved_by)} ({formatDateTime(selectedEntry.approved_at)})</span>
                  </div>
              }
                {selectedEntry.rejected_at &&
              <div data-ev-id="ev_f5942f3baa" className="flex justify-between text-sm">
                    <span data-ev-id="ev_c25b288baa" className="text-muted-foreground">Abgelehnt von</span>
                    <span data-ev-id="ev_4f701dd5e9" className="text-red-600">{getProfileName(selectedEntry.rejected_by)} ({formatDateTime(selectedEntry.rejected_at)})</span>
                  </div>
              }
                {selectedEntry.rejection_reason &&
              <div data-ev-id="ev_e3c3cffae1" className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div data-ev-id="ev_d26f003989" className="flex items-center gap-2 text-red-700 font-medium mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      Ablehnungsgrund
                    </div>
                    <p data-ev-id="ev_99d0080643" className="text-sm text-red-600">{selectedEntry.rejection_reason}</p>
                  </div>
              }
              </div>
            </div>
            <div data-ev-id="ev_f757f401ee" className="p-4 border-t border-border flex gap-2">
              <button data-ev-id="ev_83a99e5c54"
            onClick={() => setShowDetail(false)}
            className="flex-1 px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors">

                Schließen
              </button>
              {selectedEntry.status === 'approved' && canGeneratePdf &&
            <button data-ev-id="ev_28fa3c28b8"
            onClick={() => handleDownloadPdf(selectedEntry)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">

                  <Download className="w-4 h-4" />
                  PDF
                </button>
            }
              {selectedEntry.status === 'approved' && selectedEntry.estimated_costs > 0 && !hasLinkedPaymentOrder(selectedEntry.id) &&
            <button data-ev-id="ev_create_payment_order_btn"
            onClick={() => handleCreatePaymentOrderForEntry(selectedEntry)}
            disabled={creatingPaymentOrder}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                  {creatingPaymentOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                  Auszahlung erstellen
                </button>
            }
              {selectedEntry.status === 'approved' && hasLinkedPaymentOrder(selectedEntry.id) &&
            <div data-ev-id="ev_6443c9e5cb" className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm">
                  <CheckCircle className="w-4 h-4" />
                  {getLinkedPaymentOrder(selectedEntry.id)?.reference_number}
                </div>
            }
            </div>
          </div>
        </div>
      }

      {/* Amount Confirmation Modal for Kassier */}
      {showAmountConfirmModal && confirmingEntry &&
      <div data-ev-id="ev_f27a4eea69" className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div data-ev-id="ev_e8693e1c01" className="bg-card rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div data-ev-id="ev_5e554c6253" className="flex items-center justify-between p-4 border-b border-border">
              <h3 data-ev-id="ev_59b5235d28" className="text-lg font-semibold text-purple-600 flex items-center gap-2">
                <Euro className="w-5 h-5" />
                Betrag bestätigen
              </h3>
              <button data-ev-id="ev_f37735b8ac"
            onClick={() => setShowAmountConfirmModal(false)}
            className="p-2.5 hover:bg-muted rounded-lg transition-colors touch-manipulation">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div data-ev-id="ev_2e06f2d0b8" className="p-4 space-y-4">
              <div data-ev-id="ev_8b77c8d484" className="p-3 bg-muted/50 rounded-lg">
                <p data-ev-id="ev_1f1b1f7925" className="text-sm text-muted-foreground">Referenz</p>
                <p data-ev-id="ev_d9fc3f9a7d" className="font-mono font-medium">{confirmingEntry.reference_number}</p>
                <p data-ev-id="ev_3022e1ed0f" className="text-sm text-muted-foreground mt-2">Veranstaltung</p>
                <p data-ev-id="ev_05a7ab42f0" className="font-medium">{confirmingEntry.event_name}</p>
                <p data-ev-id="ev_b9ac51bf90" className="text-sm text-muted-foreground mt-2">Veranstalter</p>
                <p data-ev-id="ev_544550e243" className="font-medium">{confirmingEntry.organizer || '-'}</p>
              </div>
              
              <div data-ev-id="ev_33cde0ea7d" className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div data-ev-id="ev_e34d29527f" className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p data-ev-id="ev_07533c57c9" className="text-sm text-blue-800">
                    Bitte überprüfen Sie den Betrag basierend auf den per E-Mail erhaltenen Zahlungsdetails. 
                    Bei einer Erhöhung ist eine erneute Genehmigung durch den Kommandant erforderlich.
                  </p>
                </div>
              </div>

              <div data-ev-id="ev_64eb6100fb" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div data-ev-id="ev_54b1f76bc3">
                  <label data-ev-id="ev_c82d45f92b" className="block text-sm font-medium mb-1 text-muted-foreground">
                    Geschätzter Betrag (Antrag)
                  </label>
                  <div data-ev-id="ev_ade5c779d2" className="px-4 py-3 bg-muted rounded-lg font-mono text-lg">
                    {formatCurrency(confirmingEntry.estimated_costs)}
                  </div>
                </div>
                <div data-ev-id="ev_ca6415cf07">
                  <label data-ev-id="ev_e8004b079a" className="block text-sm font-medium mb-1">
                    Bestätigter Betrag <span data-ev-id="ev_157c72b348" className="text-red-500">*</span>
                  </label>
                  <div data-ev-id="ev_b73724bd5c" className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input data-ev-id="ev_ca09f58cad"
                  type="number"
                  step="0.01"
                  min="0"
                  value={confirmedAmount}
                  onChange={(e) => setConfirmedAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-10 pr-4 py-3 border border-input rounded-lg bg-background font-mono text-lg" />

                  </div>
                </div>
              </div>

              {confirmedAmount !== confirmingEntry.estimated_costs &&
            <div data-ev-id="ev_ce0ac2ae81" className={`p-3 rounded-lg border ${
            confirmedAmount > confirmingEntry.estimated_costs ?
            'bg-amber-50 border-amber-200' :
            'bg-green-50 border-green-200'}`
            }>
                  <div data-ev-id="ev_f286689468" className="flex items-start gap-2">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                confirmedAmount > confirmingEntry.estimated_costs ?
                'text-amber-600' :
                'text-green-600'}`
                } />
                    <div data-ev-id="ev_098b11c616">
                      <p data-ev-id="ev_2c31a43140" className={`text-sm font-medium ${
                  confirmedAmount > confirmingEntry.estimated_costs ?
                  'text-amber-800' :
                  'text-green-800'}`
                  }>
                        {confirmedAmount > confirmingEntry.estimated_costs ?
                    'Betragserhöhung - Erneute Genehmigung erforderlich!' :
                    'Betragsreduzierung - Keine erneute Genehmigung erforderlich'
                    }
                      </p>
                      <p data-ev-id="ev_3199d585c0" className={`text-sm ${
                  confirmedAmount > confirmingEntry.estimated_costs ?
                  'text-amber-700' :
                  'text-green-700'}`
                  }>
                        Differenz: {formatCurrency(confirmedAmount - confirmingEntry.estimated_costs)}
                      </p>
                    </div>
                  </div>
                </div>
            }

              {confirmedAmount !== confirmingEntry.estimated_costs &&
            <div data-ev-id="ev_92e6032ddb">
                  <label data-ev-id="ev_973114ac24" className="block text-sm font-medium mb-1">
                    Grund für die Änderung <span data-ev-id="ev_87efabd20b" className="text-red-500">*</span>
                  </label>
                  <textarea data-ev-id="ev_827c7cef86"
              value={amountChangeReason}
              onChange={(e) => setAmountChangeReason(e.target.value)}
              className="w-full px-4 py-2 border border-input rounded-lg bg-background resize-none"
              rows={2}
              placeholder="z.B. Tatsächlicher Rechnungsbetrag weicht ab..."
              required />

                </div>
            }
            </div>
            <div data-ev-id="ev_4d5ee574f8" className="p-4 border-t border-border flex gap-2">
              <button data-ev-id="ev_86c0abf90e"
            onClick={() => setShowAmountConfirmModal(false)}
            className="flex-1 px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors">
                Abbrechen
              </button>
              <button data-ev-id="ev_27105468f8"
            onClick={handleConfirmAmount}
            disabled={confirmingAmount || confirmedAmount !== confirmingEntry.estimated_costs && !amountChangeReason.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {confirmingAmount ?
              <><Clock className="w-4 h-4 animate-spin" /> Wird gespeichert...</> :
              confirmedAmount > confirmingEntry.estimated_costs ?
              <><AlertTriangle className="w-4 h-4" /> Bestätigen & zur Genehmigung</> :

              <><CheckCircle className="w-4 h-4" /> Bestätigen & PDF erstellen</>
              }
              </button>
            </div>
          </div>
        </div>
      }

      {/* Rejection Modal */}
      {showRejectModal && rejectingEntry &&
      <div data-ev-id="ev_8c5e568ddb" className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div data-ev-id="ev_bce3353c43" className="bg-card rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div data-ev-id="ev_f5cac15ed2" className="flex items-center justify-between p-4 border-b border-border">
              <h3 data-ev-id="ev_ca91a28f03" className="text-lg font-semibold text-red-600 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Antrag ablehnen
              </h3>
              <button data-ev-id="ev_b0631f48ed"
            onClick={() => setShowRejectModal(false)}
            className="p-2.5 hover:bg-muted rounded-lg transition-colors touch-manipulation">

                <X className="w-5 h-5" />
              </button>
            </div>
            <div data-ev-id="ev_33e4cc0514" className="p-4 space-y-4">
              <div data-ev-id="ev_4314ddec28" className="p-3 bg-muted/50 rounded-lg">
                <p data-ev-id="ev_7cf264f0b0" className="text-sm text-muted-foreground">Referenz</p>
                <p data-ev-id="ev_86d1c3424b" className="font-mono font-medium">{rejectingEntry.reference_number}</p>
                <p data-ev-id="ev_42f65f614d" className="text-sm text-muted-foreground mt-2">Veranstaltung</p>
                <p data-ev-id="ev_69849b1f34" className="font-medium">{rejectingEntry.event_name}</p>
              </div>
              <div data-ev-id="ev_aa2ab85d70">
                <label data-ev-id="ev_6b2209b1f9" className="block text-sm font-medium mb-1">
                  Grund der Ablehnung <span data-ev-id="ev_bd5612b2c5" className="text-red-500">*</span>
                </label>
                <textarea data-ev-id="ev_d4f53cb03d"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-4 py-2 border border-input rounded-lg bg-background resize-none"
              rows={3}
              placeholder="Bitte geben Sie den Grund für die Ablehnung an..."
              required />

              </div>
            </div>
            <div data-ev-id="ev_97afc1f28c" className="p-4 border-t border-border flex gap-2">
              <button data-ev-id="ev_90fd211a0f"
            onClick={() => setShowRejectModal(false)}
            className="flex-1 px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors">

                Abbrechen
              </button>
              <button data-ev-id="ev_e12443940e"
            onClick={handleRejectEntry}
            disabled={!rejectionReason.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">

                <XCircle className="w-4 h-4" />
                Ablehnen
              </button>
            </div>
          </div>
        </div>
      }


    </div>);

}