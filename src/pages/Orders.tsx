import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { useOrders } from '@/hooks/useOrders';
import { useSettings } from '@/hooks/useSettings';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useOrderVotesSummary } from '@/hooks/useOrderVotesSummary';
import { Layout } from '@/components/Layout';
import { OrderCard } from '@/components/OrderCard';
import { Plus, Search, Filter, FileText, Archive, ArchiveRestore, X, Layers, ChevronDown, ChevronRight } from 'lucide-react';
import type { OrderStatus, Order } from '@/hooks/useOrders';

export default function Orders() {
  const { user, profile: authProfile } = useAuth();
  const { isSimulationActive, effectiveIsAdmin, effectiveIsKommandant, effectiveIsBereichsleiter, effectiveProfile, effectiveUserId, effectiveFunctions } = useSimulation();
  
  // Verwende simulierte Werte wenn Simulation aktiv
  const isAdmin = effectiveIsAdmin;
  const isKommandant = effectiveIsKommandant;
  const isBereichsleiter = effectiveIsBereichsleiter;
  const profile = isSimulationActive ? effectiveProfile : authProfile;
  const { orders, loading, archiveOrder, unarchiveOrder } = useOrders();
  const { allOrdersViewUsers, loading: settingsLoading } = useSettings();
  const { suppliers } = useSuppliers();
  const { voteSummaries } = useOrderVotesSummary(orders);

  // State for allowing orders below minimum
  const [allowBelowMinOrderSuppliers, setAllowBelowMinOrderSuppliers] = useState<Set<string>>(new Set());

  // Calculate suppliers below minimum order value (for genehmigt orders that are NOT yet ordered)
  const suppliersBelowMinimum = (() => {
    const supplierTotals = new Map<string, number>();

    orders.forEach((order) => {
      if ((order.status === 'genehmigt' || order.status === 'freigegeben_kommandant') && !order.order_executed && order.supplier_id) {
        const current = supplierTotals.get(order.supplier_id) || 0;
        supplierTotals.set(order.supplier_id, current + order.amount);
      }
    });

    const belowMinimum = new Set<string>();
    supplierTotals.forEach((total, supplierId) => {
      const supplier = suppliers.find((s) => s.id === supplierId);
      if (supplier?.minimum_order_value && supplier.minimum_order_value > 0 && total < supplier.minimum_order_value) {
        belowMinimum.add(supplierId);
      }
    });

    return belowMinimum;
  })();

  // Check if an order's supplier is below minimum order value
  const isOrderBelowMinOrderValue = (order: Order): boolean => {
    if (order.status !== 'genehmigt' && order.status !== 'freigegeben_kommandant' || order.order_executed) return false;
    if (!order.supplier_id) return false;
    return suppliersBelowMinimum.has(order.supplier_id);
  };

  // Check if order is blocked due to minimum order value
  const isOrderBlockedByMinOrder = (order: Order): boolean => {
    if (!order.supplier_id) return false;
    if (!isOrderBelowMinOrderValue(order)) return false;
    return !allowBelowMinOrderSuppliers.has(order.supplier_id);
  };

  // Check if user can manage minimum order override (definiert nach hasKassierFunction)
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [processingOrders, setProcessingOrders] = useState<Set<string>>(new Set());
  const [showArchive, setShowArchive] = useState(false);



  // Sammelbestellung-Info Modal
  const [collectiveOrderInfo, setCollectiveOrderInfo] = useState<{order: Order;otherOrders: Order[];total: number;minimum: number;} | null>(null);

  // Get all approved orders for a supplier (for collective order detection)
  const getSupplierOrders = (supplierId: string): Order[] => {
    return orders.filter((o) =>
    o.supplier_id === supplierId && (
    o.status === 'genehmigt' || o.status === 'freigegeben_kommandant') &&
    !o.order_executed
    );
  };

  // Check if order is part of a collective order
  const getCollectiveOrderInfo = (order: Order): {isCollective: boolean;otherOrders: Order[];total: number;minimum: number;} | null => {
    if (!order.supplier_id || order.status !== 'genehmigt' || order.order_executed) return null;

    const supplier = suppliers.find((s) => s.id === order.supplier_id);
    if (!supplier?.minimum_order_value || supplier.minimum_order_value <= 0) return null;

    const supplierOrders = getSupplierOrders(order.supplier_id);
    if (supplierOrders.length <= 1) return null;

    const total = supplierOrders.reduce((sum, o) => sum + o.amount, 0);
    const otherOrders = supplierOrders.filter((o) => o.id !== order.id);

    // Only consider collective if total reaches minimum but individual order doesn't
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

  // Effektive User-ID (berücksichtigt Simulation)
  const currentUserId = isSimulationActive ? effectiveUserId : user?.id;

  // Check if user has Kassier or Kommandomitglied function
  const hasKassierFunction = profile?.functions?.includes('kassier') ?? false;
  const hasKommandomitgliedFunction = profile?.functions?.includes('kommandomitglied') ?? false;
  const canManageMinOrderOverride = isKommandant || isAdmin || hasKassierFunction;

  // Determine if user can view all orders
  // Kommandant, Admin, Kassier dürfen alle sehen + Benutzer in allOrdersViewUsers
  const canViewAllOrders = isAdmin || isKommandant || hasKassierFunction || allOrdersViewUsers.includes(currentUserId || '');

  // Filter orders based on user permissions
  const visibleOrders = canViewAllOrders ?
  orders :
  hasKommandomitgliedFunction ?
  // Kommandomitglieder: Eigene + Bestellungen zur Abstimmung
  orders.filter((order) =>
    order.created_by === currentUserId ||
    (order.requires_kommandomitglied_approval && 
     !order.kommandomitglied_approved_at &&
     order.status !== 'entwurf' &&
     order.status !== 'abgeschlossen')
  ) :
  isBereichsleiter ?
  orders.filter((order) => {
    // Eigene Bestellungen (inkl. Entwürfe)
    if (order.created_by === currentUserId) {
      return ['entwurf', 'eingereicht', 'ausstehend_bereichsleitung', 'ausstehend_kommandant', 'freigegeben_bereichsleitung', 'freigegeben_kommandant', 'genehmigt', 'abgelehnt', 'abgeschlossen'].includes(order.status);
    }
    // Als Bereichsleiter zugewiesene Bestellungen (ohne Entwürfe)
    if (order.bereichsleiter_id === currentUserId) {
      return ['eingereicht', 'ausstehend_bereichsleitung', 'ausstehend_kommandant', 'freigegeben_bereichsleitung', 'freigegeben_kommandant', 'genehmigt', 'abgelehnt', 'abgeschlossen'].includes(order.status);
    }
    return false;
  }) :
  orders.filter((order) =>
  order.created_by === currentUserId &&
  ['entwurf', 'eingereicht', 'ausstehend_bereichsleitung', 'ausstehend_kommandant', 'ausstehend_kommandomitglieder', 'freigegeben_bereichsleitung', 'freigegeben_kommandant', 'genehmigt', 'abgelehnt', 'abgeschlossen'].includes(order.status)
  );

  // Nicht-archivierte Bestellungen (auch abgeschlossene ausschließen)
  const activeOrders = visibleOrders.filter((order) => !order.is_archived && order.status !== 'abgeschlossen');

  // Archivierte Bestellungen (inkl. abgeschlossene)
  const archivedOrders = visibleOrders.filter((order) => order.is_archived || order.status === 'abgeschlossen');

  const filteredOrders = activeOrders.filter((order) => {
    const matchesSearch = order.title.toLowerCase().includes(search.toLowerCase()) ||
    order.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredArchivedOrders = archivedOrders.filter((order) => {
    const matchesSearch = order.title.toLowerCase().includes(search.toLowerCase()) ||
    order.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions: {value: OrderStatus | 'all';label: string;}[] = [
  { value: 'all', label: 'Alle Status' },
  { value: 'eingereicht', label: 'Eingereicht' },
  { value: 'ausstehend_bereichsleitung', label: 'Ausstehend Bereichsleitung' },
  { value: 'ausstehend_kommandant', label: 'Ausstehend Kommandant' },
  { value: 'freigegeben_bereichsleitung', label: 'Freigegeben Bereichsleitung' },
  { value: 'freigegeben_kommandant', label: 'Freigegeben Kommandant' },
  { value: 'genehmigt', label: 'Genehmigt' },
  { value: 'abgelehnt', label: 'Abgelehnt' }];


  // Check if user can mark orders (Kassier or Admin or Kommandant)
  const canMarkOrders = hasKassierFunction || isAdmin || isKommandant;

  // Check if user can mark a specific order (canMarkOrders OR is the creator)
  const canMarkOrder = (order: Order) => canMarkOrders || order.created_by === currentUserId;

  // Handle archiving order
  async function handleArchiveOrder(orderId: string) {
    setProcessingOrders((prev) => new Set(prev).add(orderId));
    await archiveOrder(orderId);
    setProcessingOrders((prev) => {
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });
  }

  // Handle unarchiving order
  async function handleUnarchiveOrder(orderId: string) {
    setProcessingOrders((prev) => new Set(prev).add(orderId));
    await unarchiveOrder(orderId);
    setProcessingOrders((prev) => {
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });
  }

  if (loading || settingsLoading) {
    return (
      <Layout>
        <div data-ev-id="ev_5f7244b092" className="flex items-center justify-center min-h-[400px]">
          <div data-ev-id="ev_55095ba4be" className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </Layout>);

  }

  return (
    <Layout>
      {/* Page Header Card */}
      <div data-ev-id="ev_36b481b2d2" className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-5 text-primary-foreground shadow-lg mb-6">
        <div data-ev-id="ev_d79a770a5e" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div data-ev-id="ev_ccef32c6c5" className="flex items-center gap-4">
            <div data-ev-id="ev_a8ea7a0bda" className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div data-ev-id="ev_21c693546d">
              <h1 data-ev-id="ev_3d1948305f" className="text-xl font-bold">Bestellungen</h1>
              <p data-ev-id="ev_8d3cbc1766" className="text-sm text-primary-foreground/80">{filteredOrders.length} aktive Bestellungen</p>
            </div>
          </div>
          <Link
            to="/bestellungen/neu"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-primary rounded-xl font-medium hover:bg-white/90 transition-colors shadow-lg group">

            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            Neue Bestellung
          </Link>
        </div>
      </div>

      {/* Filters Card */}
      <div data-ev-id="ev_307427668b" className="bg-card rounded-xl border border-border p-4 mb-6">
        <div data-ev-id="ev_7e960db13f" className="flex flex-col sm:flex-row gap-4">
          <div data-ev-id="ev_8b5959811b" className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input data-ev-id="ev_7d21f58614"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Bestellungen suchen..."
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />

          </div>
          <div data-ev-id="ev_0c43d753ee" className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <select data-ev-id="ev_398a9c19cc"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
            className="w-full sm:w-auto pl-10 pr-8 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none cursor-pointer transition-all">

              {statusOptions.map((option) =>
              <option data-ev-id="ev_fa73b34a15" key={option.value} value={option.value}>
                  {option.label}
                </option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* All Orders List */}
      <div data-ev-id="ev_71759a6a57" className="bg-card rounded-xl border border-border overflow-hidden">
        <div data-ev-id="ev_dd35e9d275" className="px-4 py-3 bg-muted/50 border-b border-border flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h2 data-ev-id="ev_dfec348b54" className="font-medium text-sm text-foreground">Alle Bestellungen</h2>
          <span data-ev-id="ev_6a9fd054b4" className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            {filteredOrders.length}
          </span>
        </div>
        <div data-ev-id="ev_f4fa909456" className="p-4">
          {filteredOrders.length === 0 ?
          <div data-ev-id="ev_f365a6ce4f" className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p data-ev-id="ev_02375317ef">Keine Bestellungen gefunden</p>
            </div> :

          <div data-ev-id="ev_5419d618d8" className="flex flex-col gap-3">
              {filteredOrders.map((order) =>
            <div data-ev-id="ev_63fc0ca505" key={order.id} className={`rounded-lg overflow-hidden ${isOrderBlockedByMinOrder(order) ? 'ring-2 ring-red-500' : ''}`}>
                  <OrderCard
                order={order}
                belowMinOrderValue={isOrderBelowMinOrderValue(order)}
                isCollectiveOrder={(() => {
                  const info = getCollectiveOrderInfo(order);
                  return info?.isCollective ?? false;
                })()}
                collectiveOrderCount={(() => {
                  const info = getCollectiveOrderInfo(order);
                  return info ? info.otherOrders.length + 1 : 0;
                })()}
                voteSummary={voteSummaries[order.id]}
                onCollectiveOrderClick={() => {
                  const info = getCollectiveOrderInfo(order);
                  if (info) {
                    setCollectiveOrderInfo({ order, ...info });
                  }
                }} />

                  {/* Action buttons for archiving - only for genehmigt, freigegeben_kommandant or abgelehnt */}
                  {canMarkOrder(order) && (order.status === 'genehmigt' || order.status === 'freigegeben_kommandant' || order.status === 'abgelehnt') &&
              <div data-ev-id="ev_4c95438ece" className="flex flex-wrap items-center gap-2 px-4 py-2 border-t border-border bg-muted/30">
                      <div data-ev-id="ev_14ac503a34" className="flex-1" />
                      
                      {/* Show "Ins Archiv verschieben" button */}
                      <button data-ev-id="ev_ad7ce65672"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleArchiveOrder(order.id);
                }}
                disabled={processingOrders.has(order.id)}
                className="px-3 py-1.5 bg-slate-500 text-white text-sm font-medium rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                title="Ins Archiv verschieben">
                          <Archive className="w-4 h-4" />
                          Ins Archiv verschieben
                        </button>
                    </div>
              }
                </div>
            )}
            </div>
          }
        </div>
      </div>
      
      {/* Archiv Section */}
      <div data-ev-id="ev_98c7066154" className="mt-6">
        <div data-ev-id="ev_15c180579b" className="bg-card rounded-xl border border-border overflow-hidden">
          <button data-ev-id="ev_402bbba820"
          onClick={() => setShowArchive(!showArchive)}
          className="w-full px-4 py-3 bg-muted/50 border-b border-border flex items-center gap-2 hover:bg-muted transition-colors">

            {showArchive ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            <Archive className="w-4 h-4 text-muted-foreground" />
            <span data-ev-id="ev_c05475ef18" className="font-medium text-sm text-foreground">Archiv</span>
            <span data-ev-id="ev_ffe089e164" className="ml-auto text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
              {filteredArchivedOrders.length}
            </span>
          </button>
          
          {showArchive &&
          <div data-ev-id="ev_650fdeda1f" className="p-4">
              {filteredArchivedOrders.length === 0 ?
            <div data-ev-id="ev_03b34b0c09" className="text-center py-12 text-muted-foreground">
                  <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p data-ev-id="ev_d28928c910">Keine archivierten Bestellungen</p>
                </div> :

            <div data-ev-id="ev_77228c4462" className="flex flex-col gap-3">
                  {filteredArchivedOrders.map((order) =>
              <div data-ev-id="ev_ba14e1248c" key={order.id} className="rounded-lg overflow-hidden">
                      <OrderCard order={order} voteSummary={voteSummaries[order.id]} />
                      {canMarkOrder(order) &&
                <div data-ev-id="ev_69380e0c8e" className="flex flex-wrap items-center gap-2 px-4 py-2 border-t border-border bg-muted/30">
                          <div data-ev-id="ev_50f60fed63" className="flex-1" />
                          <button data-ev-id="ev_831e4a39f9"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleUnarchiveOrder(order.id);
                  }}
                  disabled={processingOrders.has(order.id)}
                  className="px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  title="Aus Archiv zurückholen">

                            <ArchiveRestore className="w-4 h-4" />
                            Aus Archiv zurückholen
                          </button>
                        </div>
                }
                    </div>
              )}
                </div>
            }
            </div>
          }
        </div>
      </div>
      
      {/* Sammelbestellung-Info Modal */}
      {collectiveOrderInfo &&
      <div data-ev-id="ev_869bf39df9" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div data-ev-id="ev_0d333d170d" className="bg-card rounded-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div data-ev-id="ev_a02515e047" className="flex items-center justify-between mb-4">
              <div data-ev-id="ev_d2b0291f8f" className="flex items-center gap-3">
                <div data-ev-id="ev_40388a0c5b" className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100">
                  <Layers className="w-5 h-5 text-blue-600" />
                </div>
                <h3 data-ev-id="ev_1061c52419" className="text-lg font-semibold text-foreground">Sammelbestellung nötig</h3>
              </div>
              <button data-ev-id="ev_1510bda507"
            onClick={() => setCollectiveOrderInfo(null)}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div data-ev-id="ev_f63c27bfd1" className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div data-ev-id="ev_1c4a87a96a" className="flex items-start gap-3">
                <Layers className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div data-ev-id="ev_9bb52d2876">
                  <p data-ev-id="ev_a8ce18ec90" className="text-sm font-medium text-blue-800">Mindestbestellwert erreicht durch Sammelbestellung</p>
                  <p data-ev-id="ev_dc4b05601f" className="text-sm text-blue-700 mt-1">
                    Der Mindestbestellwert von <strong data-ev-id="ev_5f2d0b4668">{collectiveOrderInfo.minimum.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</strong> wird nur durch die Kombination mehrerer Bestellungen erreicht.
                  </p>
                  <p data-ev-id="ev_c20abfe85c" className="text-sm text-blue-700 mt-2">
                    Aktuelle Gesamtsumme: <strong data-ev-id="ev_e29c90d82d" className="text-blue-800">{collectiveOrderInfo.total.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</strong>
                  </p>
                </div>
              </div>
            </div>

            <div data-ev-id="ev_ecfeb335c6" className="mb-4">
              <p data-ev-id="ev_75ff6e9dbe" className="text-sm font-medium text-foreground mb-3">Folgende Bestellungen sollten gemeinsam bestellt werden:</p>
              <div data-ev-id="ev_d9495dd76c" className="flex flex-col gap-2">
                {/* Aktuelle Bestellung */}
                <div data-ev-id="ev_406ad9be52" className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div data-ev-id="ev_037c254ba5" className="flex items-center justify-between">
                    <div data-ev-id="ev_e5903be2ea" className="flex-1 min-w-0">
                      <p data-ev-id="ev_cad413403b" className="font-medium text-foreground truncate">{collectiveOrderInfo.order.title}</p>
                      <p data-ev-id="ev_bf88619dee" className="text-xs text-muted-foreground">Diese Bestellung</p>
                    </div>
                    <span data-ev-id="ev_52d19c215a" className="text-sm font-semibold text-blue-700">
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
                    <div data-ev-id="ev_f9295ad919" className="flex items-center justify-between">
                      <div data-ev-id="ev_d4c93cb22a" className="flex-1 min-w-0">
                        <p data-ev-id="ev_ee1fa410ed" className="font-medium text-foreground truncate hover:text-primary">{otherOrder.title}</p>
                        <p data-ev-id="ev_059fad5ff8" className="text-xs text-muted-foreground">
                          {otherOrder.creator?.full_name || 'Unbekannt'} • {new Date(otherOrder.created_at).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      <span data-ev-id="ev_c6407feef3" className="text-sm font-semibold text-foreground">
                        {otherOrder.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                      </span>
                    </div>
                  </Link>
              )}
              </div>
            </div>

            <div data-ev-id="ev_eb2c759648" className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <p data-ev-id="ev_90df6ed7af" className="text-sm text-amber-800">
                <strong data-ev-id="ev_89e5136738">Hinweis:</strong> Bitte führen Sie diese Bestellungen als Sammelbestellung beim Lieferanten <strong data-ev-id="ev_104ded8427">{collectiveOrderInfo.order.supplier?.name}</strong> aus, um den Mindestbestellwert zu erreichen.
              </p>
            </div>

            <div data-ev-id="ev_7c6b395dae" className="flex gap-3">
              <button data-ev-id="ev_7ebede4533"
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