import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { useProfiles } from '@/hooks/useProfiles';
import { useOrders } from '@/hooks/useOrders';
import { useSuppliers, ORDER_DAY_OPTIONS } from '@/hooks/useSuppliers';
import { useSettings } from '@/hooks/useSettings';
import { useMinOrderRequests } from '@/hooks/useMinOrderRequests';
import { Layout } from '@/components/Layout';
import { StatusBadge } from '@/components/StatusBadge';
import { MinOrderRequestsPanel } from '@/components/MinOrderRequestsPanel';
import {
  FileText,
  ChevronDown,
  ChevronRight,
  Package,
  PackageCheck,
  Euro,
  Calendar,
  ShieldAlert,
  ShoppingCart,
  Archive,
  Undo2,
  CheckCircle2,
  Loader2,
  Receipt,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
  Check,
  Layers,
  Send,
  X,
  HelpCircle,
  Download,
  FileSpreadsheet,
  BarChart3,
  ExternalLink,
  User } from
'lucide-react';
import type { Order } from '@/hooks/useOrders';

interface SupplierGroup {
  supplierId: string | null;
  supplierName: string;
  orders: Order[];
  total: number;
}

type TabType = 'offen' | 'bestellt' | 'erhalten';

export default function KassierOverview() {
  const { profile, user } = useAuth();
  const {
    isSimulationActive,
    effectiveUserId,
    effectiveIsAdmin,
    effectiveIsKommandant,
    effectiveIsBereichsleiter,
    effectiveHasKassierFunction,
    effectiveHasKommandomitgliedFunction
  } = useSimulation();
  const { profiles } = useProfiles();
  const { orders, loading: ordersLoading, markAsOrdered, unmarkAsOrdered, markAsExecuted, markAsReceived } = useOrders();
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const { sammelbestellungenUsers } = useSettings();
  const { hasApprovedRequest, hasPendingRequest, createRequest } = useMinOrderRequests();

  // Effektive User-ID (berücksichtigt Simulation)
  const currentUserId = isSimulationActive ? effectiveUserId : user?.id;

  // Effektives Profil (für Funktionen-Check)
  const effectiveProfile = isSimulationActive ?
  profiles.find((p) => p.id === effectiveUserId) :
  profile;

  // Tab State
  const [activeTab, setActiveTab] = useState<TabType>('offen');
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());
  const [processingOrders, setProcessingOrders] = useState<Set<string>>(new Set());
  const [allowBelowMinOrderSuppliers, setAllowBelowMinOrderSuppliers] = useState<Set<string>>(new Set());

  // Sonderfreigabe Modal States
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestSupplierId, setRequestSupplierId] = useState<string | null>(null);
  const [requestSupplierName, setRequestSupplierName] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Berechtigungen prüfen (mit Simulation)
  const effectiveIsKdtStellvertreter = effectiveProfile?.functions?.includes('kommandant_stellvertreter') ?? false;
  const canViewAll = effectiveHasKassierFunction || effectiveIsAdmin || effectiveIsKommandant || effectiveIsKdtStellvertreter;
  const canToggleBelowMinOrder = effectiveHasKassierFunction || effectiveIsAdmin || effectiveIsKommandant;
  const canManageOrders = effectiveHasKassierFunction || effectiveIsAdmin || effectiveIsKommandant || effectiveIsKdtStellvertreter;

  // Sammelbestellungen
  const canUseSammelbestellungen = currentUserId ? (sammelbestellungenUsers ?? []).includes(currentUserId) : false;
  const [selectedOrdersForSammel, setSelectedOrdersForSammel] = useState<Set<string>>(new Set());

  // Jahresbericht States
  const [selectedReportYear, setSelectedReportYear] = useState(new Date().getFullYear());
  const [showYearlyReport, setShowYearlyReport] = useState(false);

  // Filter: Genehmigte Bestellungen basierend auf Berechtigung
  const approvedOrders = useMemo(() => {
    const allApproved = orders.filter((order) =>
    order.status === 'genehmigt' || order.status === 'freigegeben_kommandant' || order.status === 'abgeschlossen'
    );

    if (canViewAll) return allApproved;

    if (effectiveHasKommandomitgliedFunction) {
      return allApproved.filter((order) =>
      order.created_by === currentUserId || order.requires_kommandomitglied_approval
      );
    }

    if (effectiveIsBereichsleiter) {
      return allApproved.filter((order) =>
      order.created_by === currentUserId || order.bereichsleiter_id === currentUserId
      );
    }

    return allApproved.filter((order) => order.created_by === currentUserId);
  }, [orders, canViewAll, effectiveHasKommandomitgliedFunction, effectiveIsBereichsleiter, currentUserId]);

  // Kategorisierte Bestellungen
  const pendingOrders = useMemo(() => approvedOrders.filter((order) => !order.order_executed), [approvedOrders]);
  const waitingForDeliveryOrders = useMemo(() => approvedOrders.filter((order) => order.order_executed && !order.order_received), [approvedOrders]);
  const archivedOrders = useMemo(() => approvedOrders.filter((order) => order.order_received), [approvedOrders]);

  // Group orders by supplier
  const groupBySupplier = (orderList: Order[]): SupplierGroup[] => {
    const groups = new Map<string | null, SupplierGroup>();
    orderList.forEach((order) => {
      const supplierId = order.supplier_id;
      const supplierName = order.supplier?.name || 'Ohne Lieferant';
      if (!groups.has(supplierId)) {
        groups.set(supplierId, { supplierId, supplierName, orders: [], total: 0 });
      }
      const group = groups.get(supplierId)!;
      group.orders.push(order);
      group.total += order.amount;
    });
    return Array.from(groups.values()).sort((a, b) => b.total - a.total);
  };

  const pendingGroups = useMemo(() => groupBySupplier(pendingOrders), [pendingOrders]);
  const waitingGroups = useMemo(() => groupBySupplier(waitingForDeliveryOrders), [waitingForDeliveryOrders]);
  const archivedGroups = useMemo(() => groupBySupplier(archivedOrders), [archivedOrders]);

  // Mindestbestellwert-Logik
  const ordersForMinOrderCheck = useMemo(() => {
    return pendingOrders.filter((order) =>
    !order.order_executed && (
    order.status === 'genehmigt' ||
    order.status === 'eingereicht' ||
    order.status === 'ausstehend_bereichsleitung' ||
    order.status === 'ausstehend_kommandant' ||
    order.status === 'freigegeben_bereichsleitung' ||
    order.status === 'freigegeben_kommandant')

    );
  }, [pendingOrders]);

  const approvedOnlyGroups = useMemo(() => groupBySupplier(ordersForMinOrderCheck), [ordersForMinOrderCheck]);

  const minOrderStatus = useMemo(() => {
    const statusList: Array<{
      supplierId: string;
      supplierName: string;
      currentTotal: number;
      minimumOrderValue: number;
      difference: number;
      meetsMinimum: boolean;
      orderCount: number;
    }> = [];

    approvedOnlyGroups.forEach((group) => {
      if (!group.supplierId) return;
      const supplier = suppliers.find((s) => s.id === group.supplierId);
      if (!supplier || !supplier.minimum_order_value || supplier.minimum_order_value <= 0) return;
      const meetsMinimum = group.total >= supplier.minimum_order_value;
      const difference = supplier.minimum_order_value - group.total;
      statusList.push({
        supplierId: group.supplierId,
        supplierName: group.supplierName,
        currentTotal: group.total,
        minimumOrderValue: supplier.minimum_order_value,
        difference,
        meetsMinimum,
        orderCount: group.orders.length
      });
    });

    return statusList.sort((a, b) => {
      if (a.meetsMinimum !== b.meetsMinimum) return a.meetsMinimum ? -1 : 1;
      return a.difference - b.difference;
    });
  }, [approvedOnlyGroups, suppliers]);

  const suppliersNotReady = minOrderStatus.filter((s) => !s.meetsMinimum);
  const suppliersBelowMinimum = useMemo(() => new Set(suppliersNotReady.map((s) => s.supplierId)), [suppliersNotReady]);

  const isOrderBelowMinOrderValue = (order: Order): boolean => {
    if (order.status !== 'genehmigt' && order.status !== 'freigegeben_kommandant') return false;
    if (!order.supplier_id) return false;
    return suppliersBelowMinimum.has(order.supplier_id);
  };

  // Aktuelle Gruppen basierend auf Tab
  const currentGroups = activeTab === 'offen' ? pendingGroups : activeTab === 'bestellt' ? waitingGroups : archivedGroups;
  const currentOrders = activeTab === 'offen' ? pendingOrders : activeTab === 'bestellt' ? waitingForDeliveryOrders : archivedOrders;

  const toggleSupplier = (supplierId: string | null) => {
    const key = `${activeTab}-${supplierId || 'null'}`;
    setExpandedSuppliers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);else
      next.add(key);
      return next;
    });
  };

  const isExpanded = (supplierId: string | null) => expandedSuppliers.has(`${activeTab}-${supplierId || 'null'}`);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('de-DE', { minimumFractionDigits: 2 }) + ' €';
  };

  // Handler
  const handleMarkAsExecuted = async (orderId: string) => {
    setProcessingOrders((prev) => new Set(prev).add(orderId));
    await markAsExecuted(orderId);
    setProcessingOrders((prev) => {const next = new Set(prev);next.delete(orderId);return next;});
  };

  const handleMarkAsReceived = async (orderId: string) => {
    setProcessingOrders((prev) => new Set(prev).add(orderId));
    await markAsReceived(orderId);
    setProcessingOrders((prev) => {const next = new Set(prev);next.delete(orderId);return next;});
  };

  const handleUnmarkAsOrdered = async (orderId: string) => {
    setProcessingOrders((prev) => new Set(prev).add(orderId));
    await unmarkAsOrdered(orderId);
    setProcessingOrders((prev) => {const next = new Set(prev);next.delete(orderId);return next;});
  };

  // Sammelbestellung Handler
  const handleSammelbestellung = async (supplierId: string | null) => {
    const ordersToMark = Array.from(selectedOrdersForSammel);
    if (ordersToMark.length === 0) return;
    for (const orderId of ordersToMark) {
      setProcessingOrders((prev) => new Set(prev).add(orderId));
      await markAsExecuted(orderId);
      setProcessingOrders((prev) => {const next = new Set(prev);next.delete(orderId);return next;});
    }
    setSelectedOrdersForSammel(new Set());
  };

  const toggleOrderForSammel = (orderId: string) => {
    setSelectedOrdersForSammel((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);else
      next.add(orderId);
      return next;
    });
  };

  const selectAllOrdersForSammel = (group: SupplierGroup) => {
    const unorderedOrders = group.orders.filter((o) => !o.order_executed && !o.order_received);
    setSelectedOrdersForSammel((prev) => {
      const next = new Set(prev);
      unorderedOrders.forEach((o) => next.add(o.id));
      return next;
    });
  };

  const deselectAllOrdersForSammel = (group: SupplierGroup) => {
    setSelectedOrdersForSammel((prev) => {
      const next = new Set(prev);
      group.orders.forEach((o) => next.delete(o.id));
      return next;
    });
  };

  const getSelectedOrdersForSupplier = (group: SupplierGroup) => {
    return group.orders.filter((o) => selectedOrdersForSammel.has(o.id) && !o.order_executed && !o.order_received);
  };

  // Export CSV
  const exportOrdersCSV = (ordersToExport: Order[], filename: string) => {
    const headers = ['Titel', 'Lieferant', 'Ersteller', 'Betrag', 'Status', 'Erstellt am', 'Bestellt am', 'Erhalten am'];
    const rows = ordersToExport.map((order) => [
    order.title,
    order.supplier?.name || 'Kein Lieferant',
    order.creator?.full_name || order.creator?.email || 'Unbekannt',
    order.amount.toFixed(2).replace('.', ','),
    order.status,
    order.created_at ? new Date(order.created_at).toLocaleDateString('de-DE') : '',
    order.order_executed_at ? new Date(order.order_executed_at).toLocaleDateString('de-DE') : '',
    order.order_received_at ? new Date(order.order_received_at).toLocaleDateString('de-DE') : '']
    );
    const csvContent = [headers.join(';'), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(';'))].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  // Jahresbericht
  const getYearlyReport = (year: number) => {
    const yearOrders = orders.filter((o) => {
      const orderDate = new Date(o.created_at);
      return orderDate.getFullYear() === year && o.status !== 'entwurf';
    });
    const totalAmount = yearOrders.reduce((sum, o) => sum + o.amount, 0);
    const completedOrders = yearOrders.filter((o) => o.status === 'abgeschlossen');
    const completedAmount = completedOrders.reduce((sum, o) => sum + o.amount, 0);
    const gemeindeOrders = yearOrders.filter((o) => o.invoice_to === 'gemeinde');
    const feuerwehrOrders = yearOrders.filter((o) => o.invoice_to === 'feuerwehr');
    const ohneZuordnung = yearOrders.filter((o) => !o.invoice_to);
    const invoiceBreakdown = {
      gemeinde: { count: gemeindeOrders.length, amount: gemeindeOrders.reduce((sum, o) => sum + o.amount, 0) },
      feuerwehr: { count: feuerwehrOrders.length, amount: feuerwehrOrders.reduce((sum, o) => sum + o.amount, 0) },
      ohneZuordnung: { count: ohneZuordnung.length, amount: ohneZuordnung.reduce((sum, o) => sum + o.amount, 0) }
    };
    const bySupplier = new Map<string, {name: string;count: number;amount: number;}>();
    yearOrders.forEach((o) => {
      const supplierId = o.supplier_id || 'none';
      const supplierName = o.supplier?.name || 'Ohne Lieferant';
      const existing = bySupplier.get(supplierId) || { name: supplierName, count: 0, amount: 0 };
      existing.count++;
      existing.amount += o.amount;
      bySupplier.set(supplierId, existing);
    });
    return {
      year,
      totalOrders: yearOrders.length,
      totalAmount,
      completedOrders: completedOrders.length,
      completedAmount,
      invoiceBreakdown,
      bySupplier: Array.from(bySupplier.values()).sort((a, b) => b.amount - a.amount)
    };
  };

  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear, currentYear - 1, currentYear - 2].filter((year) => {
    return orders.some((o) => new Date(o.created_at).getFullYear() === year);
  });
  const yearlyReport = getYearlyReport(selectedReportYear);

  const loading = ordersLoading || suppliersLoading;

  if (loading) {
    return (
      <Layout>
        <div data-ev-id="ev_c568d258dc" className="flex items-center justify-center min-h-[400px]">
          <div data-ev-id="ev_3b90b19825" className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </Layout>);

  }

  // Tab-Konfiguration
  const tabs: {id: TabType;label: string;icon: React.ReactNode;count: number;amount: number;color: string;}[] = [
  { id: 'offen', label: 'Offen', icon: <Clock className="w-4 h-4" />, count: pendingOrders.length, amount: pendingOrders.reduce((s, o) => s + o.amount, 0), color: 'text-amber-600 bg-amber-100' },
  { id: 'bestellt', label: 'Bestellt', icon: <Package className="w-4 h-4" />, count: waitingForDeliveryOrders.length, amount: waitingForDeliveryOrders.reduce((s, o) => s + o.amount, 0), color: 'text-blue-600 bg-blue-100' },
  { id: 'erhalten', label: 'Erhalten', icon: <PackageCheck className="w-4 h-4" />, count: archivedOrders.length, amount: archivedOrders.reduce((s, o) => s + o.amount, 0), color: 'text-green-600 bg-green-100' }];


  return (
    <Layout>
      <div data-ev-id="ev_275a3c0c7b" className="flex flex-col gap-6">
        {/* Header */}
        <div data-ev-id="ev_10f31b4405" className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-5 text-white shadow-lg">
          <div data-ev-id="ev_95076a5496" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div data-ev-id="ev_9a36db105b" className="flex items-center gap-4">
              <div data-ev-id="ev_0ec2bbd923" className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6" />
              </div>
              <div data-ev-id="ev_d445a06bd9">
                <h1 data-ev-id="ev_daa9c555dc" className="text-xl font-bold">Übersicht Freigaben</h1>
                <p data-ev-id="ev_04c2668eb8" className="text-sm text-white/80">
                  {canViewAll ?
                  'Alle genehmigten Bestellungen' :
                  effectiveHasKommandomitgliedFunction ?
                  'Eigene und zur Abstimmung relevante Bestellungen' :
                  effectiveIsBereichsleiter ?
                  'Eigene und dir zugewiesene Bestellungen' :
                  'Meine genehmigten Bestellungen'
                  }
                </p>
              </div>
            </div>
            
            {canManageOrders &&
            <div data-ev-id="ev_4e364b5445" className="flex flex-wrap gap-2">
                <button data-ev-id="ev_19244c47db"
              onClick={() => exportOrdersCSV(orders.filter((o) => o.status !== 'entwurf'), `bestellungen_export_${new Date().toISOString().split('T')[0]}`)}
              className="flex items-center gap-2 px-3 py-2 bg-white text-green-600 rounded-lg text-sm font-medium hover:bg-white/90 transition-colors shadow">

                  <FileSpreadsheet className="w-4 h-4" />
                  Export CSV
                </button>
                <button data-ev-id="ev_8823e31f62"
              onClick={() => setShowYearlyReport(!showYearlyReport)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow ${
              showYearlyReport ? 'bg-white text-indigo-600' : 'bg-white/20 text-white hover:bg-white/30'}`
              }>

                  <BarChart3 className="w-4 h-4" />
                  Jahresbericht
                </button>
              </div>
            }
          </div>
        </div>

        {/* Info für eingeschränkte Benutzer */}
        {!canViewAll &&
        <div data-ev-id="ev_99118a3081" className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div data-ev-id="ev_e1bd993f87">
              <p data-ev-id="ev_a7f0621305" className="text-sm font-medium text-blue-800">
                {effectiveHasKommandomitgliedFunction ?
              'Eigene und zur Abstimmung relevante Bestellungen' :
              effectiveIsBereichsleiter ?
              'Eigene und dir zugewiesene Bestellungen' :
              'Nur eigene Bestellungen sichtbar'
              }
              </p>
              <p data-ev-id="ev_4891cec2fa" className="text-sm text-blue-700 mt-0.5">
                {effectiveHasKommandomitgliedFunction ?
              'Du siehst deine eigenen Bestellungen sowie alle Bestellungen, die eine Kommandomitglied-Abstimmung erfordern.' :
              effectiveIsBereichsleiter ?
              'Du siehst deine eigenen Bestellungen sowie Bestellungen, bei denen du als Bereichsleiter eingetragen bist.' :
              'Du siehst hier nur deine eigenen genehmigten Bestellungen.'
              }
              </p>
            </div>
          </div>
        }

        {/* Jahresbericht Panel */}
        {canManageOrders && showYearlyReport &&
        <div data-ev-id="ev_b3c293dbc5" className="bg-card rounded-xl border border-border p-6">
            <div data-ev-id="ev_06ef5a87c8" className="flex items-center justify-between mb-6">
              <div data-ev-id="ev_76b373733e" className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                <h2 data-ev-id="ev_409fb83b27" className="text-xl font-bold text-foreground">Jahresbericht</h2>
              </div>
              <div data-ev-id="ev_8479bd8eff" className="flex items-center gap-3">
                <select data-ev-id="ev_dd08cd6cc7"
              value={selectedReportYear}
              onChange={(e) => setSelectedReportYear(parseInt(e.target.value))}
              className="px-3 py-2 bg-background border border-input rounded-lg text-sm">

                  {availableYears.map((year) => <option data-ev-id="ev_fbe3bc9896" key={year} value={year}>{year}</option>)}
                </select>
                <button data-ev-id="ev_935896c280"
              onClick={() => exportOrdersCSV(
                orders.filter((o) => new Date(o.created_at).getFullYear() === selectedReportYear && o.status !== 'entwurf'),
                `jahresbericht_${selectedReportYear}`
              )}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">

                  <Download className="w-4 h-4" />
                  Export {selectedReportYear}
                </button>
              </div>
            </div>
            
            <div data-ev-id="ev_1fcc0a3a20" className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div data-ev-id="ev_508d354062" className="bg-blue-50 rounded-lg p-4">
                <p data-ev-id="ev_6d94815c61" className="text-sm text-blue-600 font-medium">Bestellungen gesamt</p>
                <p data-ev-id="ev_72d11ea4f8" className="text-2xl font-bold text-blue-900">{yearlyReport.totalOrders}</p>
              </div>
              <div data-ev-id="ev_b094a36f26" className="bg-green-50 rounded-lg p-4">
                <p data-ev-id="ev_2f944bb6a6" className="text-sm text-green-600 font-medium">Gesamtvolumen</p>
                <p data-ev-id="ev_f1176e607f" className="text-2xl font-bold text-green-900">{formatCurrency(yearlyReport.totalAmount)}</p>
              </div>
              <div data-ev-id="ev_653288b992" className="bg-purple-50 rounded-lg p-4">
                <p data-ev-id="ev_55aad060d4" className="text-sm text-purple-600 font-medium">Abgeschlossen</p>
                <p data-ev-id="ev_7202e50f44" className="text-2xl font-bold text-purple-900">{yearlyReport.completedOrders}</p>
              </div>
              <div data-ev-id="ev_6773cf24a8" className="bg-amber-50 rounded-lg p-4">
                <p data-ev-id="ev_a43fe73f12" className="text-sm text-amber-600 font-medium">Abgeschl. Volumen</p>
                <p data-ev-id="ev_d1c4c614fa" className="text-2xl font-bold text-amber-900">{formatCurrency(yearlyReport.completedAmount)}</p>
              </div>
            </div>
            
            <div data-ev-id="ev_3d4e205186" className="mb-6">
              <h3 data-ev-id="ev_415535e746" className="font-semibold text-foreground mb-3">Rechnung an</h3>
              <div data-ev-id="ev_1c9bc8d6c6" className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div data-ev-id="ev_4ae99a55a2" className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div data-ev-id="ev_fa094950ae" className="flex items-center gap-2 mb-2">
                    <Receipt className="w-5 h-5 text-blue-600" />
                    <span data-ev-id="ev_f1434e18cf" className="font-medium text-blue-800">Gemeinde</span>
                  </div>
                  <p data-ev-id="ev_b92cb2b408" className="text-2xl font-bold text-blue-900">{formatCurrency(yearlyReport.invoiceBreakdown.gemeinde.amount)}</p>
                  <p data-ev-id="ev_f180003a47" className="text-sm text-blue-600">{yearlyReport.invoiceBreakdown.gemeinde.count} Bestellung{yearlyReport.invoiceBreakdown.gemeinde.count !== 1 ? 'en' : ''}</p>
                </div>
                <div data-ev-id="ev_13c7c99aa7" className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div data-ev-id="ev_2563c85a28" className="flex items-center gap-2 mb-2">
                    <Receipt className="w-5 h-5 text-orange-600" />
                    <span data-ev-id="ev_24b8392809" className="font-medium text-orange-800">Feuerwehr</span>
                  </div>
                  <p data-ev-id="ev_f91ea36891" className="text-2xl font-bold text-orange-900">{formatCurrency(yearlyReport.invoiceBreakdown.feuerwehr.amount)}</p>
                  <p data-ev-id="ev_ffada240d7" className="text-sm text-orange-600">{yearlyReport.invoiceBreakdown.feuerwehr.count} Bestellung{yearlyReport.invoiceBreakdown.feuerwehr.count !== 1 ? 'en' : ''}</p>
                </div>
                {yearlyReport.invoiceBreakdown.ohneZuordnung.count > 0 &&
              <div data-ev-id="ev_78822fe85f" className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div data-ev-id="ev_80edc476ff" className="flex items-center gap-2 mb-2">
                      <Receipt className="w-5 h-5 text-gray-600" />
                      <span data-ev-id="ev_627f4e6d36" className="font-medium text-gray-800">Ohne Zuordnung</span>
                    </div>
                    <p data-ev-id="ev_a5f6885166" className="text-2xl font-bold text-gray-900">{formatCurrency(yearlyReport.invoiceBreakdown.ohneZuordnung.amount)}</p>
                    <p data-ev-id="ev_11d9048398" className="text-sm text-gray-600">{yearlyReport.invoiceBreakdown.ohneZuordnung.count} Bestellung{yearlyReport.invoiceBreakdown.ohneZuordnung.count !== 1 ? 'en' : ''}</p>
                  </div>
              }
              </div>
            </div>
            
            <div data-ev-id="ev_3ff698ab4d">
              <h3 data-ev-id="ev_6470f31a6f" className="font-semibold text-foreground mb-3">Top Lieferanten</h3>
              <div data-ev-id="ev_851e962089" className="flex flex-col gap-2">
                {yearlyReport.bySupplier.slice(0, 10).map((supplier, index) =>
              <div data-ev-id="ev_6b1b530b3d" key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div data-ev-id="ev_5a669c64b5" className="flex items-center gap-3">
                      <span data-ev-id="ev_e7875630bb" className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{index + 1}</span>
                      <span data-ev-id="ev_a82bc3df59" className="font-medium text-foreground">{supplier.name}</span>
                      <span data-ev-id="ev_3f1a67519f" className="text-sm text-muted-foreground">({supplier.count} Bestellungen)</span>
                    </div>
                    <span data-ev-id="ev_1a4191809a" className="font-bold text-foreground">{formatCurrency(supplier.amount)}</span>
                  </div>
              )}
              </div>
            </div>
          </div>
        }

        {/* Sonderfreigabe-Anfragen Panel */}
        {canManageOrders && <MinOrderRequestsPanel />}

        {/* TAB NAVIGATION */}
        <div data-ev-id="ev_f11a56aac0" className="bg-card rounded-xl border border-border p-2">
          <div data-ev-id="ev_b87db44a99" className="flex gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button data-ev-id="ev_398f397086"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-3 py-3 rounded-lg font-medium transition-all ${
                isActive ?
                'bg-primary text-primary-foreground shadow-md' :
                'hover:bg-muted text-muted-foreground'}`
                }>

                  <div data-ev-id="ev_ff5a347049" className="flex items-center gap-2">
                    <span data-ev-id="ev_96d5ba9f9a" className={isActive ? '' : tab.color.split(' ')[0]}>{tab.icon}</span>
                    <span data-ev-id="ev_b29e4beb89">{tab.label}</span>
                  </div>
                  <span data-ev-id="ev_c447f5d5f4" className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  isActive ? 'bg-white/20 text-white' : tab.color}`
                  }>
                    {tab.count}
                  </span>
                </button>);

            })}
          </div>
        </div>

        {/* Summary Stats für aktuellen Tab */}
        <div data-ev-id="ev_3a7bc998cd" className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div data-ev-id="ev_580deaa9af" className="bg-card rounded-xl border border-border p-4">
            <div data-ev-id="ev_62cc59352f" className="text-sm text-muted-foreground">Lieferanten</div>
            <div data-ev-id="ev_b470f9c5b5" className="text-2xl font-bold mt-1">{currentGroups.length}</div>
          </div>
          <div data-ev-id="ev_bf1112af37" className="bg-card rounded-xl border border-border p-4">
            <div data-ev-id="ev_3becc9ff3e" className="text-sm text-muted-foreground">Bestellungen</div>
            <div data-ev-id="ev_95cd43eebb" className="text-2xl font-bold mt-1">{currentOrders.length}</div>
          </div>
          <div data-ev-id="ev_be507552ba" className="bg-card rounded-xl border border-border p-4 col-span-2 sm:col-span-1">
            <div data-ev-id="ev_9280eb3140" className="text-sm text-muted-foreground">Gesamtwert</div>
            <div data-ev-id="ev_6078a4bf66" className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(currentOrders.reduce((s, o) => s + o.amount, 0))}</div>
          </div>
        </div>

        {/* Mindestbestellwert Warnung (nur bei Offen) */}
        {activeTab === 'offen' && suppliersNotReady.length > 0 && canManageOrders &&
        <div data-ev-id="ev_e9ae6d3e2d" className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div data-ev-id="ev_ee8c17ee02" className="flex items-center gap-2 text-amber-800 font-medium mb-2">
              <AlertTriangle className="w-5 h-5" />
              {suppliersNotReady.length} Lieferant{suppliersNotReady.length !== 1 ? 'en' : ''} unter Mindestbestellwert
            </div>
            <div data-ev-id="ev_30da0fd5ff" className="flex flex-wrap gap-2">
              {suppliersNotReady.map((item) =>
            <span data-ev-id="ev_f0ad972b76" key={item.supplierId} className="text-sm bg-amber-100 text-amber-700 px-2 py-1 rounded-lg">
                  {item.supplierName}: {formatCurrency(item.currentTotal)} / {formatCurrency(item.minimumOrderValue)}
                </span>
            )}
            </div>
          </div>
        }

        {/* Supplier Groups */}
        <div data-ev-id="ev_63950da113" className="flex flex-col gap-4">
          {currentGroups.length === 0 ?
          <div data-ev-id="ev_1b48848289" className="bg-card rounded-xl border border-border p-12 text-center">
              {activeTab === 'offen' ?
            <>
                  <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  <h3 data-ev-id="ev_df3c544a6e" className="text-lg font-medium text-foreground">Alles bestellt!</h3>
                  <p data-ev-id="ev_a82f1f12e5" className="text-sm text-muted-foreground mt-1">Keine offenen Bestellungen vorhanden.</p>
                </> :
            activeTab === 'bestellt' ?
            <>
                  <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 data-ev-id="ev_508d6f7a69" className="text-lg font-medium text-muted-foreground">Keine wartenden Bestellungen</h3>
                  <p data-ev-id="ev_d50d1356ec" className="text-sm text-muted-foreground/70 mt-1">Alle bestellten Artikel wurden bereits erhalten.</p>
                </> :

            <>
                  <PackageCheck className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 data-ev-id="ev_a07ac40d3b" className="text-lg font-medium text-muted-foreground">Kein Archiv</h3>
                  <p data-ev-id="ev_362de52d2d" className="text-sm text-muted-foreground/70 mt-1">Noch keine erhaltenen Bestellungen.</p>
                </>
            }
            </div> :

          currentGroups.map((group) => {
            const supplier = group.supplierId ? suppliers.find((s) => s.id === group.supplierId) : null;
            const minOrderValue = supplier?.minimum_order_value;
            const orderDays = supplier?.order_days ?? [];
            const pendingGroupOrders = group.orders.filter((o) => !o.order_executed);
            const pendingTotal = pendingGroupOrders.reduce((sum, o) => sum + o.amount, 0);
            const isBelowMinimum = activeTab === 'offen' && minOrderValue && minOrderValue > 0 && pendingTotal < minOrderValue;
            const isAllowedBelowMin = group.supplierId ? allowBelowMinOrderSuppliers.has(group.supplierId) || hasApprovedRequest(group.supplierId) : false;
            const hasPendingMinOrderRequest = group.supplierId ? hasPendingRequest(group.supplierId) : false;
            const disableOrderButton = isBelowMinimum && !isAllowedBelowMin;
            const isCollectiveOrder = activeTab === 'offen' && minOrderValue && minOrderValue > 0 && pendingGroupOrders.length > 1 && pendingTotal >= minOrderValue && !pendingGroupOrders.some((o) => o.amount >= minOrderValue);
            const expanded = isExpanded(group.supplierId);

            return (
              <div data-ev-id="ev_4c33d71559" key={group.supplierId || 'null'} className="bg-card rounded-xl border border-border overflow-hidden">
                  {/* Supplier Header */}
                  <button data-ev-id="ev_bf2dfd2a2c"
                onClick={() => toggleSupplier(group.supplierId)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">

                    <div data-ev-id="ev_834bfb81af" className="flex items-center gap-3">
                      {expanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                      <div data-ev-id="ev_5c1498137d" className="text-left">
                        <div data-ev-id="ev_7e599758a2" className="font-semibold">{group.supplierName}</div>
                        <div data-ev-id="ev_55c58e2d8d" className="text-sm text-muted-foreground">
                          {group.orders.length} Bestellung{group.orders.length !== 1 ? 'en' : ''}
                        </div>
                        <div data-ev-id="ev_430c0b073e" className="flex flex-wrap items-center gap-2 mt-1">
                          {minOrderValue && minOrderValue > 0 && activeTab === 'offen' &&
                        <span data-ev-id="ev_dcebb9b3a0" className={`text-xs px-2 py-0.5 rounded-full ${isBelowMinimum ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                              Min: {formatCurrency(minOrderValue)}
                            </span>
                        }
                          {orderDays.length > 0 &&
                        <span data-ev-id="ev_c055d120d9" className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {orderDays.map((d) => ORDER_DAY_OPTIONS.find((o) => o.id === d)?.label.slice(0, 2)).join(', ')}
                            </span>
                        }
                          {isCollectiveOrder &&
                        <span data-ev-id="ev_99704d005e" className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                              <Layers className="w-3 h-3" /> Sammelbestellung
                            </span>
                        }
                        </div>
                      </div>
                    </div>
                    <div data-ev-id="ev_75d10660f3" className="text-right">
                      <div data-ev-id="ev_5da9591ba4" className={`font-bold text-lg ${isBelowMinimum ? 'text-amber-600' : ''}`}>
                        {formatCurrency(activeTab === 'offen' ? pendingTotal : group.total)}
                      </div>
                      {isBelowMinimum && minOrderValue &&
                    <div data-ev-id="ev_16824f37c6" className="text-xs text-amber-600">Fehlen: {formatCurrency(minOrderValue - pendingTotal)}</div>
                    }
                    </div>
                  </button>

                  {/* Mindestbestellwert Checkbox */}
                  {expanded && isBelowMinimum && canToggleBelowMinOrder &&
                <div data-ev-id="ev_748f441e20" className="px-4 py-3 bg-amber-50 border-t border-amber-200">
                      <label data-ev-id="ev_c97504795a" className="flex items-center gap-3 cursor-pointer">
                        <div data-ev-id="ev_9f97adec9c"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (group.supplierId) {
                        setAllowBelowMinOrderSuppliers((prev) => {
                          const next = new Set(prev);
                          if (next.has(group.supplierId!)) next.delete(group.supplierId!);else
                          next.add(group.supplierId!);
                          return next;
                        });
                      }
                    }}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${isAllowedBelowMin ? 'bg-amber-500 border-amber-500' : 'border-amber-400 bg-white'}`}>

                          {isAllowedBelowMin && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div data-ev-id="ev_5353a282a2">
                          <span data-ev-id="ev_1100cdc2f8" className="text-sm font-medium text-amber-800">Unter Mindestbestellwert bestellen</span>
                          <p data-ev-id="ev_0a96bf3353" className="text-xs text-amber-600">Aktivieren um trotzdem zu bestellen</p>
                        </div>
                      </label>
                    </div>
                }

                  {/* Sonderfreigabe für nicht-berechtigte */}
                  {expanded && isBelowMinimum && !canToggleBelowMinOrder && group.supplierId &&
                <div data-ev-id="ev_f33923fc1b" className="px-4 py-3 bg-amber-50 border-t border-amber-200 flex flex-col gap-3">
                      <div data-ev-id="ev_1f2531bf0e" className="flex items-center gap-2 text-amber-700">
                        <AlertTriangle className="w-4 h-4" />
                        <span data-ev-id="ev_f1ba5b9898" className="text-sm">Der Mindestbestellwert wurde nicht erreicht</span>
                      </div>
                      {hasApprovedRequest(group.supplierId) ?
                  <div data-ev-id="ev_0671a8d533" className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span data-ev-id="ev_c0d5ffaf1c" className="text-sm text-green-700">Sonderfreigabe erteilt - Bestellung möglich</span>
                        </div> :
                  hasPendingMinOrderRequest ?
                  <div data-ev-id="ev_949d167f41" className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                          <span data-ev-id="ev_6033084aaf" className="text-sm text-blue-700">Sonderfreigabe wurde angefragt</span>
                        </div> :

                  <button data-ev-id="ev_ca5fe23777"
                  onClick={() => {
                    setRequestSupplierId(group.supplierId);
                    setRequestSupplierName(group.supplierName);
                    setRequestReason('');
                    setRequestSuccess(false);
                    setShowRequestModal(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium w-fit">

                          <HelpCircle className="w-4 h-4" />
                          Sonderfreigabe anfordern
                        </button>
                  }
                    </div>
                }

                  {/* Orders List */}
                  {expanded &&
                <div data-ev-id="ev_e3ec8f147f" className="border-t border-border">
                      {/* Sammelbestellung Hinweis */}
                      {activeTab === 'offen' && isCollectiveOrder &&
                  <div data-ev-id="ev_3d05440f6d" className="px-4 py-3 bg-blue-50 border-b border-blue-200 flex items-start gap-3">
                          <Layers className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div data-ev-id="ev_736adb7744">
                            <p data-ev-id="ev_5ef11f7ca8" className="text-sm font-medium text-blue-800">Sammelbestellung erforderlich</p>
                            <p data-ev-id="ev_a7f051a6ea" className="text-sm text-blue-700 mt-0.5">Der Mindestbestellwert wird nur durch die Kombination aller Bestellungen erreicht.</p>
                          </div>
                        </div>
                  }
                      
                      {/* Mindestbestellwert Warnung */}
                      {activeTab === 'offen' && disableOrderButton &&
                  <div data-ev-id="ev_b2cf3aaef1" className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div data-ev-id="ev_299adadc36">
                            <p data-ev-id="ev_c1decb6474" className="text-sm font-medium text-amber-800">Mindestbestellwert nicht erreicht</p>
                            <p data-ev-id="ev_34f47e65a4" className="text-sm text-amber-700 mt-0.5">Aktivieren Sie oben "Unter Mindestbestellwert bestellen" um trotzdem zu bestellen.</p>
                          </div>
                        </div>
                  }

                      {group.orders.map((order, idx) =>
                  <div data-ev-id="ev_4d214d50a1"
                  key={order.id}
                  className={`flex items-center justify-between p-4 hover:bg-muted/30 transition-colors ${
                  idx !== group.orders.length - 1 ? 'border-b border-border' : ''} ${

                  activeTab === 'offen' && disableOrderButton ? 'bg-red-50' :
                  selectedOrdersForSammel.has(order.id) ? 'bg-purple-50' : ''}`
                  }>

                          <div data-ev-id="ev_c937dc9242" className="flex-1 min-w-0">
                            <div data-ev-id="ev_baf1460849" className="flex items-center gap-2 flex-wrap">
                              {/* Sammelbestellung Checkbox */}
                              {activeTab === 'offen' && canUseSammelbestellungen && !order.order_executed && !order.order_received &&
                        <input data-ev-id="ev_345d3f452d"
                        type="checkbox"
                        checked={selectedOrdersForSammel.has(order.id)}
                        onChange={() => toggleOrderForSammel(order.id)}
                        className="w-4 h-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500" />

                        }
                              <Link
                          to={`/bestellungen/${order.id}`}
                          className="font-medium hover:text-primary transition-colors flex items-center gap-1 truncate">

                                {order.title}
                                <ExternalLink className="w-3 h-3 opacity-50 flex-shrink-0" />
                              </Link>
                              <StatusBadge status={order.status} belowMinOrderValue={isOrderBelowMinOrderValue(order)} />
                              {order.invoice_to &&
                        <span data-ev-id="ev_b03f607cbf" className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${order.invoice_to === 'gemeinde' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                  <Receipt className="w-3 h-3" />
                                  {order.invoice_to === 'gemeinde' ? 'Gemeinde' : 'Feuerwehr'}
                                </span>
                        }
                            </div>
                            <div data-ev-id="ev_f9945a88c7" className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span data-ev-id="ev_640f3f38ec" className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {order.creator?.full_name || 'Unbekannt'}
                              </span>
                              <span data-ev-id="ev_e42357b52c" className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(order.created_at)}
                              </span>
                              {activeTab === 'bestellt' && order.order_executed_at &&
                        <span data-ev-id="ev_e0b9292a3f" className="flex items-center gap-1 text-blue-600">
                                  <Package className="w-3 h-3" />
                                  Bestellt: {formatDate(order.order_executed_at)}
                                </span>
                        }
                              {activeTab === 'erhalten' && order.order_received_at &&
                        <span data-ev-id="ev_74bc3f3529" className="flex items-center gap-1 text-green-600">
                                  <PackageCheck className="w-3 h-3" />
                                  Erhalten: {formatDate(order.order_received_at)}
                                </span>
                        }
                            </div>
                          </div>
                          <div data-ev-id="ev_5dd40787d7" className="flex items-center gap-4 ml-4">
                            <div data-ev-id="ev_e4e6d35dbc" className="font-semibold text-right">{formatCurrency(order.amount)}</div>
                            
                            {/* Aktions-Buttons */}
                            {canManageOrders || order.created_by === currentUserId ?
                      activeTab === 'offen' ?
                      disableOrderButton ?
                      <span data-ev-id="ev_e4612fa15a" className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-500" title="Mindestbestellwert nicht erreicht">
                                    <Package className="w-4 h-4" />
                                    <span data-ev-id="ev_56156098c7" className="hidden sm:inline">Gesperrt</span>
                                  </span> :

                      <button data-ev-id="ev_ffcdd6c095"
                      onClick={() => handleMarkAsExecuted(order.id)}
                      disabled={processingOrders.has(order.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50">

                                    {processingOrders.has(order.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                                    <span data-ev-id="ev_c21922957d" className="hidden sm:inline">Bestellt</span>
                                  </button> :

                      activeTab === 'bestellt' ?
                      <button data-ev-id="ev_48a41860ef"
                      onClick={() => handleMarkAsReceived(order.id)}
                      disabled={processingOrders.has(order.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50">

                                  {processingOrders.has(order.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                                  <span data-ev-id="ev_9a984bde83" className="hidden sm:inline">Erhalten</span>
                                </button> :

                      <button data-ev-id="ev_d7f67556bb"
                      onClick={() => handleUnmarkAsOrdered(order.id)}
                      disabled={processingOrders.has(order.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground transition-colors disabled:opacity-50"
                      title="Zurück zu Offen">

                                  {processingOrders.has(order.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                                  <span data-ev-id="ev_30a552d468" className="hidden sm:inline">Zurück</span>
                                </button> :


                      <span data-ev-id="ev_2c96838a8c" className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg ${
                      activeTab === 'offen' ? 'bg-amber-100 text-amber-700' :
                      activeTab === 'bestellt' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'}`
                      }>
                                {activeTab === 'offen' ? <Clock className="w-4 h-4" /> : activeTab === 'bestellt' ? <Package className="w-4 h-4" /> : <PackageCheck className="w-4 h-4" />}
                                <span data-ev-id="ev_bbd0ceccc3" className="hidden sm:inline">{activeTab === 'offen' ? 'Offen' : activeTab === 'bestellt' ? 'Bestellt' : 'Erhalten'}</span>
                              </span>
                      }
                          </div>
                        </div>
                  )}

                      {/* Sammelbestellung Footer */}
                      {activeTab === 'offen' && canUseSammelbestellungen && (() => {
                    const selectedForThisSupplier = getSelectedOrdersForSupplier(group);
                    const selectedTotal = selectedForThisSupplier.reduce((sum, o) => sum + o.amount, 0);
                    const unorderedOrders = group.orders.filter((o) => !o.order_executed && !o.order_received);
                    const allSelected = unorderedOrders.length > 0 && unorderedOrders.every((o) => selectedOrdersForSammel.has(o.id));

                    return (
                      <div data-ev-id="ev_01d7061b68" className="px-4 py-3 bg-purple-50 border-t border-purple-200 flex flex-wrap items-center justify-between gap-3">
                            <div data-ev-id="ev_d844108507" className="flex items-center gap-3">
                              <Layers className="w-5 h-5 text-purple-600" />
                              <div data-ev-id="ev_4918d178e2">
                                <span data-ev-id="ev_f0d5d27806" className="text-sm font-medium text-purple-800">Sammelbestellung</span>
                                {selectedForThisSupplier.length > 0 &&
                            <span data-ev-id="ev_3b099530e4" className="text-sm text-purple-600 ml-2">({selectedForThisSupplier.length} ausgewählt, {formatCurrency(selectedTotal)})</span>
                            }
                              </div>
                            </div>
                            <div data-ev-id="ev_281367cdfa" className="flex items-center gap-2">
                              {allSelected ?
                          <button data-ev-id="ev_3da945e207" onClick={() => deselectAllOrdersForSammel(group)} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors">
                                  Alle abwählen
                                </button> :

                          <button data-ev-id="ev_70171bcf55" onClick={() => selectAllOrdersForSammel(group)} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors" disabled={unorderedOrders.length === 0}>
                                  Alle auswählen
                                </button>
                          }
                              <button data-ev-id="ev_3932bfce1b"
                          onClick={() => handleSammelbestellung(group.supplierId)}
                          disabled={selectedForThisSupplier.length < 2}
                          className="px-4 py-1.5 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">

                                <Check className="w-4 h-4" />
                                Als Sammelbestellung bestellen
                              </button>
                            </div>
                          </div>);

                  })()}
                    </div>
                }
                </div>);

          })
          }
        </div>

        {/* Sonderfreigabe Modal */}
        {showRequestModal &&
        <div data-ev-id="ev_31c9ddc4a0" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div data-ev-id="ev_b0c5bbab3e" className="bg-card rounded-xl border border-border p-6 w-full max-w-md">
              <div data-ev-id="ev_a84966d44f" className="flex items-center justify-between mb-4">
                <div data-ev-id="ev_9ec04eb0b8" className="flex items-center gap-3">
                  <div data-ev-id="ev_b218396d7c" className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 data-ev-id="ev_0203873d24" className="text-lg font-semibold text-foreground">Sonderfreigabe anfordern</h3>
                </div>
                <button data-ev-id="ev_ff54679582"
              onClick={() => {setShowRequestModal(false);setRequestReason('');setRequestSuccess(false);}}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">

                  <X className="w-5 h-5" />
                </button>
              </div>

              {requestSuccess ?
            <div data-ev-id="ev_e22dda6719" className="text-center py-6">
                  <div data-ev-id="ev_f8a06b7356" className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 data-ev-id="ev_a1a63ac682" className="text-lg font-semibold text-foreground mb-2">Anfrage gesendet!</h4>
                  <p data-ev-id="ev_a16e8b37ae" className="text-muted-foreground text-sm mb-4">
                    Ihre Anfrage für eine Sonderfreigabe bei {requestSupplierName} wurde an den Kommandanten gesendet.
                  </p>
                  <button data-ev-id="ev_7c15bab76f"
              onClick={() => {setShowRequestModal(false);setRequestReason('');setRequestSuccess(false);}}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">

                    Schließen
                  </button>
                </div> :

            <>
                  <div data-ev-id="ev_4375361055" className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p data-ev-id="ev_62b71ce3d6" className="text-sm text-amber-800"><strong data-ev-id="ev_643a1cf98c">Lieferant:</strong> {requestSupplierName}</p>
                    <p data-ev-id="ev_043abd95d4" className="text-sm text-amber-700 mt-1">Sie können eine Sonderfreigabe anfordern, um Bestellungen unter dem Mindestbestellwert aufzugeben.</p>
                  </div>
                  <div data-ev-id="ev_5d56d14deb" className="mb-4">
                    <label data-ev-id="ev_14a03aa9b1" className="block text-sm font-medium text-foreground mb-2">Begründung <span data-ev-id="ev_a84c85a13b" className="text-red-500">*</span></label>
                    <textarea data-ev-id="ev_98daa051b1"
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="Bitte erklären Sie, warum eine Sonderfreigabe benötigt wird..."
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={4}
                disabled={requestLoading} />

                  </div>
                  <div data-ev-id="ev_425a7256cb" className="flex gap-3">
                    <button data-ev-id="ev_e2dea43ae5"
                onClick={() => {setShowRequestModal(false);setRequestReason('');}}
                disabled={requestLoading}
                className="flex-1 px-4 py-2.5 border border-input rounded-lg font-medium hover:bg-muted transition-colors disabled:opacity-50">

                      Abbrechen
                    </button>
                    <button data-ev-id="ev_df788e6175"
                onClick={async () => {
                  if (!requestSupplierId || !requestReason.trim()) return;
                  setRequestLoading(true);
                  const { error } = await createRequest(requestSupplierId, requestReason);
                  setRequestLoading(false);
                  if (!error) setRequestSuccess(true);
                }}
                disabled={requestLoading || !requestReason.trim()}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">

                      {requestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Anfrage senden
                    </button>
                  </div>
                </>
            }
            </div>
          </div>
        }
      </div>
    </Layout>);

}