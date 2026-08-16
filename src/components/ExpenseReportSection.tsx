import { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Download,
  Loader2,
  Calendar,
  Users,
  Receipt,
  Euro,
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  ExternalLink,
  Pencil,
  EyeOff } from
'lucide-react';
import { useExpenseReports, type ExpenseReportWithItems, type CreateExpenseReportData } from '@/hooks/useExpenseReports';
import { useExpenseCategories } from '@/hooks/useExpenseCategories';
import { usePaymentOrders, type PaymentOrder } from '@/hooks/usePaymentOrders';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/contexts/AuthContext';
import { generateExpenseReportPdf, generateExpenseReportPdfPreview } from '@/utils/generateExpenseReportPdf';

interface ExpenseReportSectionProps {
  onBack: () => void;
}

type TabType = 'overview' | 'new';

interface ItemFormData {
  description: string;
  category_id: string;
  category_custom: string;
  amount: string;
}

const emptyItem: ItemFormData = {
  description: '',
  category_id: '',
  category_custom: '',
  amount: ''
};

export function ExpenseReportSection({ onBack }: ExpenseReportSectionProps) {
  const { reports, loading, createReport, updateReport, deleteReport, getUsedPaymentOrderIds } = useExpenseReports();
  const { categories, addCategory } = useExpenseCategories();
  const { paymentOrders, toggleNoExpenseReportRequired } = usePaymentOrders();
  const { pdfBackgroundUrl, pdfBackgroundOpacity } = useSettings();
  const { profile } = useAuth();

  // Check if user can edit (admin or kassier)
  const canEdit = profile?.role === 'admin' || profile?.functions?.includes('kassier');

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // PDF Preview state
  const [pdfLoading, setPdfLoading] = useState(false);

  // Form state - now supports multiple payment orders
  const [selectedPaymentOrders, setSelectedPaymentOrders] = useState<PaymentOrder[]>([]);
  const [eventName, setEventName] = useState('');
  const [eventDateFrom, setEventDateFrom] = useState('');
  const [eventDateTo, setEventDateTo] = useState('');
  const [participants, setParticipants] = useState('');
  const [notes, setNotes] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [items, setItems] = useState<ItemFormData[]>([{ ...emptyItem }]);

  // Edit mode state
  const [editingReport, setEditingReport] = useState<ExpenseReportWithItems | null>(null);

  // Get approved/paid payment orders that aren't already used
  const usedPaymentOrderIds = getUsedPaymentOrderIds();

  // When editing, include the payment orders already linked to this report
  const editingReportPoIds = editingReport ?
  editingReport.payment_orders.map((po) => po.payment_order.id) :
  [];

  const availablePaymentOrders = paymentOrders.filter(
    (po) => (po.status === 'paid' || po.status === 'approved') &&
    !po.no_expense_report_required && (
    !usedPaymentOrderIds.includes(po.id) || editingReportPoIds.includes(po.id))
  );

  // Handler to hide a payment order from expense reports
  const handleHidePaymentOrder = async (poId: string) => {
    if (!confirm('Diese Auszahlungsanweisung wird aus der Liste für Ausgabenabrechnungen ausgeblendet. Fortfahren?')) return;
    await toggleNoExpenseReportRequired(poId, true);
  };

  // Filter reports
  const filteredReports = reports.filter((r) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      r.reference_number.toLowerCase().includes(search) ||
      r.event_name.toLowerCase().includes(search) ||
      r.responsible_person.toLowerCase().includes(search));

  });

  // Reset form
  const resetForm = () => {
    setSelectedPaymentOrders([]);
    setEventName('');
    setEventDateFrom('');
    setEventDateTo('');
    setParticipants('');
    setNotes('');
    setResponsiblePerson('');
    setItems([{ ...emptyItem }]);
    setEditingReport(null);
  };

  // Toggle payment order selection
  const togglePaymentOrder = (po: PaymentOrder) => {
    const isSelected = selectedPaymentOrders.some((s) => s.id === po.id);
    if (isSelected) {
      setSelectedPaymentOrders(selectedPaymentOrders.filter((s) => s.id !== po.id));
    } else {
      setSelectedPaymentOrders([...selectedPaymentOrders, po]);
      // Auto-fill event name from first selection if empty
      if (!eventName && selectedPaymentOrders.length === 0) {
        setEventName(po.purpose);
      }
    }
  };

  // Add item
  const addItem = () => {
    setItems([...items, { ...emptyItem }]);
  };

  // Remove item
  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Update item
  const updateItem = (index: number, field: keyof ItemFormData, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // Calculate totals
  const totalAmount = items.reduce((sum, item) => {
    const amount = parseFloat(item.amount) || 0;
    return sum + amount;
  }, 0);

  // Sum of all selected payment orders
  const advanceAmount = selectedPaymentOrders.reduce((sum, po) => sum + po.amount, 0);
  const balanceAmount = totalAmount - advanceAmount;

  // Get responsible person - when editing use state, otherwise from first selected PO
  const effectiveResponsiblePerson = editingReport && responsiblePerson ?
  responsiblePerson :
  selectedPaymentOrders.length > 0 ? selectedPaymentOrders[0].recipient_name : '';

  // Add new category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    await addCategory(newCategoryName.trim());
    setNewCategoryName('');
    setShowNewCategory(false);
  };

  // Submit form
  const handleSubmit = async () => {
    console.log('[ExpenseReport] handleSubmit called', {
      selectedPaymentOrders: selectedPaymentOrders.length,
      eventName: eventName.trim(),
      eventDateFrom,
      items: items.length
    });

    if (selectedPaymentOrders.length === 0) {
      console.error('[ExpenseReport] Keine Auszahlungsanweisung ausgewählt');
      return;
    }
    if (!eventName.trim()) {
      console.error('[ExpenseReport] Kein Veranstaltungsname');
      return;
    }
    if (!eventDateFrom) {
      console.error('[ExpenseReport] Kein Datum');
      return;
    }

    // Allow negative amounts (e.g., Retourgeld/Pfand)
    const validItems = items.filter((i) => i.description.trim() && parseFloat(i.amount) !== 0 && !isNaN(parseFloat(i.amount)));
    console.log('[ExpenseReport] Valid items:', validItems.length);
    if (validItems.length === 0) {
      console.error('[ExpenseReport] Keine gültigen Positionen');
      return;
    }

    setSubmitting(true);
    try {
      const data: CreateExpenseReportData = {
        payment_order_ids: selectedPaymentOrders.map((po) => po.id),
        event_name: eventName.trim(),
        event_date_from: eventDateFrom,
        event_date_to: eventDateTo || undefined,
        participants: participants.trim() || undefined,
        responsible_person: effectiveResponsiblePerson,
        notes: notes.trim() || undefined,
        items: validItems.map((item) => ({
          description: item.description.trim(),
          category_id: item.category_id && item.category_id !== '_custom' ? item.category_id : undefined,
          category_custom: item.category_custom.trim() || undefined,
          amount: parseFloat(item.amount) || 0
        }))
      };

      console.log('[ExpenseReport] Submitting data:', JSON.stringify(data, null, 2));

      // Add payment_order_amounts for update
      const dataWithAmounts = {
        ...data,
        payment_order_amounts: selectedPaymentOrders.reduce((acc, po) => {
          acc[po.id] = po.amount;
          return acc;
        }, {} as Record<string, number>)
      };

      let success: boolean;
      if (editingReport) {
        // Update existing report
        console.log('[ExpenseReport] Updating report:', editingReport.id, 'with event_name:', dataWithAmounts.event_name);
        success = await updateReport(editingReport.id, dataWithAmounts);
        console.log('[ExpenseReport] Update result:', success);
        if (!success) {
          alert('Fehler beim Speichern der Änderungen. Bitte versuchen Sie es erneut.');
        }
      } else {
        // Create new report
        const result = await createReport(data);
        console.log('[ExpenseReport] Create result:', result);
        success = !!result;
      }

      if (success) {
        resetForm();
        setActiveTab('overview');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Show PDF in new tab (same as payment orders)
  const handleShowPdf = async (report: ExpenseReportWithItems) => {
    setPdfLoading(true);
    try {
      const blobUrl = await generateExpenseReportPdfPreview({
        report,
        categories,
        pdfBackgroundUrl,
        pdfBackgroundOpacity
      });
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setPdfLoading(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = async (report: ExpenseReportWithItems) => {
    try {
      await generateExpenseReportPdf({
        report,
        categories,
        pdfBackgroundUrl,
        pdfBackgroundOpacity
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  // Delete report
  const handleDelete = async (id: string) => {
    if (!confirm('Abrechnung wirklich löschen?')) return;
    await deleteReport(id);
  };

  // Edit report - load data into form
  const handleEdit = (report: ExpenseReportWithItems) => {
    setEditingReport(report);
    setEventName(report.event_name);
    setEventDateFrom(report.event_date_from);
    setEventDateTo(report.event_date_to || '');
    setParticipants(report.participants || '');
    setNotes(report.notes || '');
    setResponsiblePerson(report.responsible_person);

    // Load items
    const loadedItems: ItemFormData[] = report.items.map((item) => ({
      description: item.description,
      category_id: item.category_id || '',
      category_custom: item.category_custom || '',
      amount: item.amount.toString()
    }));
    setItems(loadedItems.length > 0 ? loadedItems : [{ ...emptyItem }]);

    // Load payment orders
    const linkedPOs = report.payment_orders.
    map((po) => paymentOrders.find((p) => p.id === po.payment_order.id)).
    filter((po): po is PaymentOrder => po !== undefined);
    setSelectedPaymentOrders(linkedPOs);

    setActiveTab('new');
    setExpandedReport(null);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingReport(null);
    resetForm();
    setActiveTab('overview');
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  return (
    <div data-ev-id="ev_282b48580f" className="flex flex-col gap-6">
      {/* Header */}
      <div data-ev-id="ev_46492a9e6e" className="flex items-center justify-between">
        <div data-ev-id="ev_acf519781e" className="flex items-center gap-4">
          <button data-ev-id="ev_e66999f1c8" onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div data-ev-id="ev_a9b5fd6096">
            <h1 data-ev-id="ev_d68a29ae5e" className="text-2xl font-bold text-slate-800 dark:text-slate-100">Ausgaben-Abrechnungen</h1>
            <p data-ev-id="ev_d34e62aae6" className="text-sm text-slate-500 dark:text-slate-400">Spesenabrechnung für Veranstaltungen</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div data-ev-id="ev_2675c6d248" className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button data-ev-id="ev_3b93842ddf"
        onClick={() => {setActiveTab('overview');resetForm();}}
        className={`px-4 py-2 font-medium border-b-2 transition-colors ${
        activeTab === 'overview' ?
        'border-emerald-500 text-emerald-600 dark:text-emerald-400' :
        'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`
        }>

          Übersicht
        </button>
        <button data-ev-id="ev_8516d8b698"
        onClick={() => setActiveTab('new')}
        className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${
        activeTab === 'new' ?
        'border-emerald-500 text-emerald-600 dark:text-emerald-400' :
        'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`
        }>

          <Plus size={18} />
          Neue Abrechnung
        </button>
      </div>

      {/* Content */}
      {activeTab === 'overview' ?
      <div data-ev-id="ev_4d54a58c2a" className="flex flex-col gap-4">
          {/* Search */}
          <div data-ev-id="ev_2c5373c776" className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input data-ev-id="ev_faaa201b3e"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Suchen nach Belegnummer, Veranstaltung..."
          className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800" />

          </div>

          {/* Reports List */}
          {loading ?
        <div data-ev-id="ev_05cd542dde" className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div> :
        filteredReports.length === 0 ?
        <div data-ev-id="ev_eff84aeaa5" className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Receipt className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p data-ev-id="ev_e113d3cb85">Keine Abrechnungen gefunden</p>
              <button data-ev-id="ev_7825f56b25"
          onClick={() => setActiveTab('new')}
          className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">

                Erste Abrechnung erstellen
              </button>
            </div> :

        <div data-ev-id="ev_4831427c13" className="flex flex-col gap-3">
              {filteredReports.map((report) =>
          <div data-ev-id="ev_b1c9f25229"
          key={report.id}
          className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">

                  {/* Report Header */}
                  <button data-ev-id="ev_a513ae5d1a"
            onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
            className="w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50">

                    {expandedReport === report.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    <div data-ev-id="ev_8fbbd58250" className="flex-1 text-left">
                      <div data-ev-id="ev_66ccf536ac" className="flex items-center gap-2">
                        <span data-ev-id="ev_e42973f28c" className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                          {report.reference_number}
                        </span>
                        <span data-ev-id="ev_85473bba18" className="font-medium text-slate-800 dark:text-slate-100">
                          {report.event_name}
                        </span>
                      </div>
                      <p data-ev-id="ev_4a27f5b854" className="text-sm text-slate-500 dark:text-slate-400">
                        {report.responsible_person} • {formatDate(report.event_date_from)}
                        {report.event_date_to && ` - ${formatDate(report.event_date_to)}`}
                      </p>
                    </div>
                    <div data-ev-id="ev_c88738c1c8" className="text-right">
                      <div data-ev-id="ev_0d64e79f5d" className="font-semibold text-slate-800 dark:text-slate-100">
                        {formatCurrency(report.total_amount)}
                      </div>
                      <div data-ev-id="ev_714b7e7f87" className={`text-sm ${
                report.balance_amount > 0 ?
                'text-red-600' :
                report.balance_amount < 0 ?
                'text-emerald-600' :
                'text-slate-500'}`
                }>
                        {report.balance_amount > 0 ? 'Nachzahlung: ' : report.balance_amount < 0 ? 'Rückgabe: ' : ''}
                        {report.balance_amount !== 0 && formatCurrency(Math.abs(report.balance_amount))}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {expandedReport === report.id &&
            <div data-ev-id="ev_c835995403" className="px-4 pb-4 border-t border-slate-200 dark:border-slate-700">
                      {/* Details */}
                      <div data-ev-id="ev_9a09d5a28f" className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                        <div data-ev-id="ev_bab3172388">
                          <span data-ev-id="ev_bfb41aa480" className="text-xs text-slate-500">Vorschuss</span>
                          <p data-ev-id="ev_bbfab3b8a2" className="font-medium">{formatCurrency(report.advance_amount)}</p>
                        </div>
                        <div data-ev-id="ev_445c53931c">
                          <span data-ev-id="ev_680dca2b37" className="text-xs text-slate-500">Ausgaben gesamt</span>
                          <p data-ev-id="ev_0bffa9c3ca" className="font-medium">{formatCurrency(report.total_amount)}</p>
                        </div>
                        <div data-ev-id="ev_1907028a4f">
                          <span data-ev-id="ev_921ebf427f" className="text-xs text-slate-500">Rest/Rückgabe</span>
                          <p data-ev-id="ev_d3d4883311" className={`font-medium ${
                  report.balance_amount > 0 ? 'text-red-600' : 'text-emerald-600'}`
                  }>
                            {formatCurrency(report.balance_amount)}
                          </p>
                        </div>
                        <div data-ev-id="ev_94a080060b">
                          <span data-ev-id="ev_4816bbb31f" className="text-xs text-slate-500">Auszahlungsanweisungen</span>
                          <div data-ev-id="ev_2e3dd58254" className="font-medium font-mono text-sm">
                            {report.payment_orders.length > 0 ?
                    report.payment_orders.map((po) => po.payment_order.reference_number).join(', ') :
                    '-'}
                          </div>
                        </div>
                      </div>

                      {/* Participants */}
                      {report.participants &&
              <div data-ev-id="ev_787b825069" className="mb-4">
                          <span data-ev-id="ev_69b90840de" className="text-xs text-slate-500 flex items-center gap-1">
                            <Users size={12} /> Teilnehmer
                          </span>
                          <p data-ev-id="ev_c602b2f002" className="text-sm text-slate-700 dark:text-slate-300">{report.participants}</p>
                        </div>
              }

                      {/* Items */}
                      <div data-ev-id="ev_98a2ed3d54" className="mb-4">
                        <span data-ev-id="ev_db3a76855f" className="text-xs text-slate-500 mb-2 block">Positionen</span>
                        <div data-ev-id="ev_1699c44c2e" className="bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden">
                          <table data-ev-id="ev_900581982e" className="w-full text-sm">
                            <thead data-ev-id="ev_52561a21a4">
                              <tr data-ev-id="ev_7b4e5fa84d" className="border-b border-slate-200 dark:border-slate-700">
                                <th data-ev-id="ev_612b19f0b1" className="px-3 py-2 text-left text-xs font-medium text-slate-500">Pos.</th>
                                <th data-ev-id="ev_38fb94a39a" className="px-3 py-2 text-left text-xs font-medium text-slate-500">Bezeichnung</th>
                                <th data-ev-id="ev_4618e23704" className="px-3 py-2 text-left text-xs font-medium text-slate-500">Kategorie</th>
                                <th data-ev-id="ev_18f4f270dd" className="px-3 py-2 text-right text-xs font-medium text-slate-500">Betrag</th>
                              </tr>
                            </thead>
                            <tbody data-ev-id="ev_ad949bca36">
                              {report.items.map((item) => {
                        const category = categories.find((c) => c.id === item.category_id);
                        return (
                          <tr data-ev-id="ev_019021c4b7" key={item.id} className="border-b border-slate-200 dark:border-slate-700 last:border-0">
                                    <td data-ev-id="ev_26a48e83f8" className="px-3 py-2 text-slate-600 dark:text-slate-400">{item.position_number}</td>
                                    <td data-ev-id="ev_a4cb7a557d" className="px-3 py-2 text-slate-800 dark:text-slate-200">{item.description}</td>
                                    <td data-ev-id="ev_3952c0073a" className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                      {category?.name || item.category_custom || '-'}
                                    </td>
                                    <td data-ev-id="ev_0c3465987f" className="px-3 py-2 text-right font-medium">{formatCurrency(item.amount)}</td>
                                  </tr>);

                      })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Actions */}
                      <div data-ev-id="ev_95c15baf83" className="flex gap-2 flex-wrap">
                        <button data-ev-id="ev_4933541e6d"
                onClick={() => handleShowPdf(report)}
                disabled={pdfLoading}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
                          {pdfLoading ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
                          Vorschau
                        </button>
                        <button data-ev-id="ev_30417b5367"
                onClick={() => handleDownloadPdf(report)}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">

                          <Download size={16} />
                          PDF
                        </button>
                        {canEdit &&
                <button data-ev-id="ev_ae1edb81cf"
                onClick={() => handleEdit(report)}
                className="flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 text-sm">
                            <Pencil size={16} />
                            Bearbeiten
                          </button>
                }
                        <button data-ev-id="ev_366b655a00"
                onClick={() => handleDelete(report.id)}
                className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm">

                          <Trash2 size={16} />
                          Löschen
                        </button>
                      </div>
                    </div>
            }
                </div>
          )}
            </div>
        }
        </div> : (

      /* New Report Form */
      <div data-ev-id="ev_88c7118ddc" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          {/* Edit mode indicator */}
          {editingReport &&
        <div data-ev-id="ev_c9126e1aae" className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div data-ev-id="ev_1fe045b88c" className="flex items-center justify-between">
                <div data-ev-id="ev_f85d97b0a0" className="flex items-center gap-3">
                  <Pencil size={20} className="text-amber-600" />
                  <div data-ev-id="ev_eb2b045a84">
                    <p data-ev-id="ev_c055fee1f6" className="font-medium text-amber-800 dark:text-amber-200">Abrechnung bearbeiten</p>
                    <p data-ev-id="ev_3273639cc5" className="text-sm text-amber-600 dark:text-amber-400">
                      Beleg-Nr.: {editingReport.reference_number}
                    </p>
                  </div>
                </div>
                <button data-ev-id="ev_f421e49c11"
            onClick={handleCancelEdit}
            className="text-sm text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200 underline">
                  Bearbeitung abbrechen
                </button>
              </div>
            </div>
        }

          {/* Step 1: Select Payment Orders (Multiple) */}
          <div data-ev-id="ev_ec52e2f81b" className="mb-6">
            <h3 data-ev-id="ev_3b0e92834e" className="font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Euro size={18} className="text-emerald-500" />
              1. Auszahlungsanweisungen auswählen
              {selectedPaymentOrders.length > 0 &&
            <span data-ev-id="ev_a753ad07b8" className="text-sm font-normal text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                  {selectedPaymentOrders.length} ausgewählt • {formatCurrency(advanceAmount)}
                </span>
            }
            </h3>
            
            {availablePaymentOrders.length === 0 ?
          <p data-ev-id="ev_74ade51260" className="text-slate-500 dark:text-slate-400 text-sm py-4 text-center bg-slate-50 dark:bg-slate-900 rounded-lg">
                Keine genehmigten/ausbezahlten Auszahlungsanweisungen verfügbar
              </p> :

          <div data-ev-id="ev_14624b1cc7" className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {availablePaymentOrders.map((po) => {
              const isSelected = selectedPaymentOrders.some((s) => s.id === po.id);
              return (
                <label data-ev-id="ev_1ea6461b43"
                key={po.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                isSelected ?
                'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' :
                'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`
                }>

                      <div data-ev-id="ev_123366d014" className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  isSelected ?
                  'border-emerald-500 bg-emerald-500' :
                  'border-slate-300 dark:border-slate-600'}`
                  }>
                        {isSelected && <Check size={14} className="text-white" />}
                      </div>
                      <input data-ev-id="ev_c1b916c704"
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => togglePaymentOrder(po)}
                  className="sr-only" />

                      <div data-ev-id="ev_b2a0859773" className="flex-1">
                        <div data-ev-id="ev_16bc7ccdec" className="flex items-center gap-2">
                          <span data-ev-id="ev_449a8193e4" className="font-mono text-sm text-slate-600 dark:text-slate-400">
                            {po.reference_number}
                          </span>
                          <span data-ev-id="ev_4866a5fdde" className={`text-xs px-1.5 py-0.5 rounded ${
                      po.status === 'paid' ?
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'}`
                      }>
                            {po.status === 'paid' ? 'Ausbezahlt' : 'Genehmigt'}
                          </span>
                        </div>
                        <p data-ev-id="ev_7fabd4eb68" className="font-medium text-slate-800 dark:text-slate-100">{po.purpose}</p>
                        <p data-ev-id="ev_ea95068f51" className="text-sm text-slate-500">{po.recipient_name}</p>
                      </div>
                      <span data-ev-id="ev_741b91ab0f" className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(po.amount)}
                      </span>
                      {canEdit &&
                  <button data-ev-id="ev_20b28d9ef2"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleHidePaymentOrder(po.id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Aus Abrechnungsliste ausblenden">

                          <EyeOff size={16} />
                        </button>
                  }
                    </label>);

            })}
              </div>
          }
          </div>

          {/* Step 2: Event Details - Only show if POs selected */}
          {selectedPaymentOrders.length > 0 &&
        <>
              <div data-ev-id="ev_2deb361bf8" className="mb-6">
                <h3 data-ev-id="ev_1a6763b3b6" className="font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <Calendar size={18} className="text-emerald-500" />
                  2. Veranstaltungsdaten
                </h3>
                
                <div data-ev-id="ev_5731a11194" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div data-ev-id="ev_d15b1f1d6b" className="md:col-span-2">
                    <label data-ev-id="ev_ec440ecee9" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Veranstaltung / Anlass *
                    </label>
                    <input data-ev-id="ev_9c448cafc7"
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                placeholder="z.B. Landesfeuerwehrleistungsbewerb 2025" />

                  </div>
                  <div data-ev-id="ev_c1926a3fe3">
                    <label data-ev-id="ev_7e5855e0d5" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Datum von *
                    </label>
                    <input data-ev-id="ev_dba50c46a0"
                type="date"
                value={eventDateFrom}
                onChange={(e) => setEventDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />

                  </div>
                  <div data-ev-id="ev_c1c8194749">
                    <label data-ev-id="ev_2eace2f640" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Datum bis
                    </label>
                    <input data-ev-id="ev_a8ee80ce7e"
                type="date"
                value={eventDateTo}
                onChange={(e) => setEventDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700" />

                  </div>
                  <div data-ev-id="ev_d9e2342365" className="md:col-span-2">
                    <label data-ev-id="ev_c4f32ee41c" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Verantwortlich
                    </label>
                    <input data-ev-id="ev_207177bdca"
                type="text"
                value={effectiveResponsiblePerson}
                disabled
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300" />

                    <p data-ev-id="ev_480e0b047e" className="text-xs text-slate-500 mt-1">Wird automatisch aus der ersten Auszahlungsanweisung übernommen</p>
                  </div>
                  <div data-ev-id="ev_81e44195fc" className="md:col-span-2">
                    <label data-ev-id="ev_bd9683f763" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      <Users size={14} className="inline mr-1" />
                      Teilnehmer (Namen, kommagetrennt)
                    </label>
                    <textarea data-ev-id="ev_18e8d635ed"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                placeholder="z.B. Max Mustermann, Anna Schmidt, Hans Huber" />

                  </div>
                </div>
              </div>

              {/* Step 3: Items */}
              <div data-ev-id="ev_df52e726d5" className="mb-6">
                <h3 data-ev-id="ev_c99415f422" className="font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <Receipt size={18} className="text-emerald-500" />
                  3. Einzelpositionen
                </h3>

                <div data-ev-id="ev_9dee0e45d9" className="flex flex-col gap-3">
                  {items.map((item, index) =>
              <div data-ev-id="ev_420e37ff71" key={index} className="flex gap-2 items-start p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <span data-ev-id="ev_d0e7cea3cb" className="w-8 h-8 flex items-center justify-center bg-slate-200 dark:bg-slate-700 rounded-full text-sm font-medium">
                        {index + 1}
                      </span>
                      <div data-ev-id="ev_9ca3575ad0" className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                        <div data-ev-id="ev_d10f233466" className="md:col-span-2">
                          <input data-ev-id="ev_ac7a4b9951"
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                    placeholder="Bezeichnung" />

                        </div>
                        <div data-ev-id="ev_310e8e0112">
                          <select data-ev-id="ev_5795e0b2d2"
                    value={item.category_id}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      const newItems = [...items];
                      newItems[index] = {
                        ...newItems[index],
                        category_id: newValue,
                        category_custom: newValue && newValue !== '_custom' ? '' : newItems[index].category_custom
                      };
                      setItems(newItems);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm">

                            <option data-ev-id="ev_df9ff26b81" value="">Kategorie...</option>
                            {categories.map((cat) =>
                      <option data-ev-id="ev_32bbcef6b7" key={cat.id} value={cat.id}>{cat.name}</option>
                      )}
                            <option data-ev-id="ev_3503e4d9c2" value="_custom">+ Andere...</option>
                          </select>
                          {item.category_id === '_custom' &&
                    <input data-ev-id="ev_3f7a715e03"
                    type="text"
                    value={item.category_custom}
                    onChange={(e) => updateItem(index, 'category_custom', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                    placeholder="Kategorie eingeben" />

                    }
                        </div>
                        <div data-ev-id="ev_a16f2140a8" className="flex gap-2">
                          <div data-ev-id="ev_26f065fb0f" className="relative flex-1">
                            <input data-ev-id="ev_0d6e316191"
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.amount}
                      onChange={(e) => updateItem(index, 'amount', e.target.value)}
                      className="w-full px-3 py-2 pr-8 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                      placeholder="0,00" />

                            <span data-ev-id="ev_31a87760e8" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
                          </div>
                          {items.length > 1 &&
                    <button data-ev-id="ev_df62bd8a21"
                    onClick={() => removeItem(index)}
                    className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg">

                              <Trash2 size={18} />
                            </button>
                    }
                        </div>
                      </div>
                    </div>
              )}
                </div>

                <button data-ev-id="ev_fe6f910798"
            onClick={addItem}
            className="mt-3 flex items-center gap-2 px-4 py-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg text-sm font-medium">

                  <Plus size={18} />
                  Position hinzufügen
                </button>

                {/* Add new category */}
                {showNewCategory ?
            <div data-ev-id="ev_cd48084f0b" className="mt-3 flex gap-2">
                    <input data-ev-id="ev_a484195f22"
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
              placeholder="Neue Kategorie..." />

                    <button data-ev-id="ev_3e6af244e0"
              onClick={handleAddCategory}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">

                      Hinzufügen
                    </button>
                    <button data-ev-id="ev_828ad1b95a"
              onClick={() => {setShowNewCategory(false);setNewCategoryName('');}}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-sm">

                      Abbrechen
                    </button>
                  </div> :

            <button data-ev-id="ev_8709c41a9c"
            onClick={() => setShowNewCategory(true)}
            className="mt-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">

                    + Neue Kategorie erstellen
                  </button>
            }
              </div>

              {/* Summary */}
              <div data-ev-id="ev_5e5f7fcc94" className="mb-6 bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                <h3 data-ev-id="ev_c990be46de" className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Zusammenfassung</h3>
                <div data-ev-id="ev_753466816a" className="flex flex-col gap-2">
                  <div data-ev-id="ev_6a3dbbb4cf" className="flex justify-between">
                    <span data-ev-id="ev_c153d7bb61" className="text-slate-600 dark:text-slate-400">Ausgaben gesamt:</span>
                    <span data-ev-id="ev_0037512371" className="font-semibold">{formatCurrency(totalAmount)}</span>
                  </div>
                  <div data-ev-id="ev_4f0234b5bf" className="flex justify-between">
                    <span data-ev-id="ev_55733f924c" className="text-slate-600 dark:text-slate-400">
                      Erhalten (Vorschuss aus {selectedPaymentOrders.length} Anweisung{selectedPaymentOrders.length !== 1 ? 'en' : ''}):
                    </span>
                    <span data-ev-id="ev_867421a3c8" className="font-medium text-emerald-600">{formatCurrency(advanceAmount)}</span>
                  </div>
                  <div data-ev-id="ev_076856792b" className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                    <span data-ev-id="ev_a6a7e0f0dd" className="font-medium text-slate-700 dark:text-slate-300">
                      {balanceAmount > 0 ? 'Nachzahlung erforderlich:' : 'Rückgabe:'}
                    </span>
                    <span data-ev-id="ev_6924d6f917" className={`font-bold text-lg ${
                balanceAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`
                }>
                      {formatCurrency(Math.abs(balanceAmount))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div data-ev-id="ev_513f12b257" className="mb-6">
                <label data-ev-id="ev_d433c0c1ef" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Anmerkungen
                </label>
                <textarea data-ev-id="ev_d09f1a6e4d"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
            placeholder="Optionale Anmerkungen..." />

              </div>

              {/* Submit */}
              <div data-ev-id="ev_75acb2648d" className="flex gap-3">
                <button data-ev-id="ev_f4e5ba33f1"
            onClick={handleSubmit}
            disabled={selectedPaymentOrders.length === 0 || !eventName.trim() || !eventDateFrom || items.filter((i) => i.description.trim() && parseFloat(i.amount) !== 0 && !isNaN(parseFloat(i.amount))).length === 0 || submitting}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg font-medium flex items-center justify-center gap-2">

                  {submitting ?
              <><Loader2 className="animate-spin" size={18} /> Wird gespeichert...</> :

              <><FileText size={18} /> {editingReport ? 'Änderungen speichern' : 'Abrechnung speichern'}</>
              }
                </button>
                <button data-ev-id="ev_4cba399e03"
            onClick={() => {resetForm();setActiveTab('overview');}}
            className="px-6 py-3 bg-slate-200 dark:bg-slate-700 rounded-lg font-medium">

                  Abbrechen
                </button>
              </div>
            </>
        }
        </div>)
      }
    </div>);

}