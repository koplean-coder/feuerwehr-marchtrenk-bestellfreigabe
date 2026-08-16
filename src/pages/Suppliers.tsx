import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSuppliers, type Supplier, ORDER_DAY_OPTIONS } from '@/hooks/useSuppliers';
import { useProfiles } from '@/hooks/useProfiles';
import { useSettings } from '@/hooks/useSettings';
import { Layout } from '@/components/Layout';
import { SupplierDetailModal } from '@/components/SupplierDetailModal';
import defaultSupplierLogo from '@/assets/generated/default-supplier-logo.png';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ExternalLink,
  Building2,
  User,
  Lock,
  Eye,
  EyeOff,
  X,
  ShoppingCart,
  Mail,
  Phone,
  Check,
  MessageSquare,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Hash,
  Percent,
  FileText,
  CreditCard,
  Download,
  FileSpreadsheet } from
'lucide-react';
import { exportSuppliersToPdf, exportSuppliersToExcel } from '@/utils/exportSuppliers';

const ORDER_METHOD_OPTIONS = [
{ id: 'webshop', label: 'Webshop', icon: ShoppingCart },
{ id: 'telefonisch', label: 'Telefonisch', icon: Phone },
{ id: 'email', label: 'Email', icon: Mail },
{ id: 'bereichsleiter', label: 'Bereichsleiter', icon: User },
{ id: 'ruecksprache_kdt', label: 'Rücksprache Kommandant', icon: MessageSquare },
{ id: 'it_admin', label: 'IT-Administrator', icon: User }];


function getFaviconUrl(websiteUrl: string): string {
  try {
    const url = new URL(websiteUrl);
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
  } catch {
    return '';
  }
}

function SupplierLogo({ link, name }: {link: string | null;name: string;}) {
  const [imgError, setImgError] = useState(false);
  const faviconUrl = link ? getFaviconUrl(link) : '';

  if (link && faviconUrl && !imgError) {
    return (
      <div data-ev-id="ev_24b66d6024" className="w-10 h-10 rounded-lg bg-white border border-border flex items-center justify-center overflow-hidden">
        <img data-ev-id="ev_8d70b5129c"
        src={faviconUrl}
        alt={`${name} Logo`}
        className="w-6 h-6 object-contain"
        onError={() => setImgError(true)} />
      </div>);
  }

  return (
    <div data-ev-id="ev_8199c5b7ef" className="w-10 h-10 rounded-lg bg-white border border-border flex items-center justify-center overflow-hidden">
      <img data-ev-id="ev_8b0d344da4"
      src={defaultSupplierLogo}
      alt="Standard-Lieferanten-Logo"
      className="w-6 h-6 object-contain" />

    </div>);
}

export default function Suppliers() {
  const { canManageSuppliers, canEditOrderFields, canEditDiscountFields } = useAuth();
  const { suppliers, pendingSuppliers, loading, canApproveSuppliers, createSupplier, updateSupplier, approveSupplier, deleteSupplier } = useSuppliers();
  const { profiles } = useProfiles();
  const { pdfBackgroundUrl, pdfBackgroundOpacity } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [supplierToReject, setSupplierToReject] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const supplierRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Handle highlight query parameter (from double-click in SupplierSelect)
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId && suppliers.length > 0 && !loading) {
      const supplierToHighlight = suppliers.find((s) => s.id === highlightId);
      if (supplierToHighlight) {
        setViewingSupplier(supplierToHighlight);
        // Clear the highlight parameter after opening
        setSearchParams({}, { replace: true });
        // Scroll to the supplier card
        setTimeout(() => {
          const element = supplierRefs.current[highlightId];
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  }, [searchParams, suppliers, loading, setSearchParams]);

  // Bereichsleiter und Kommandanten für Dropdown
  const bereichsleiterOptions = profiles.filter(
    (p) => p.role === 'bereichsleiter' || p.role === 'kommandant'
  );

  // Form state
  const [formName, setFormName] = useState('');
  const [formBereichsleiterId, setFormBereichsleiterId] = useState('');
  const [formOfferedArticles, setFormOfferedArticles] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formOrderMethods, setFormOrderMethods] = useState<string[]>([]);
  const [formOrderEmail, setFormOrderEmail] = useState('');
  const [formOrderPhone, setFormOrderPhone] = useState('');
  const [formMinOrderValue, setFormMinOrderValue] = useState('');
  const [formOrderDays, setFormOrderDays] = useState<string[]>([]);
  const [formCustomerNumber, setFormCustomerNumber] = useState('');
  const [formDiscountPercent, setFormDiscountPercent] = useState('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('');
  const [formSpecialConditions, setFormSpecialConditions] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const filteredSuppliers = suppliers.filter((supplier) => {
    const searchLower = search.toLowerCase();
    return (
      supplier.name.toLowerCase().includes(searchLower) || (
      supplier.offered_articles?.toLowerCase().includes(searchLower) ?? false));

  });

  function openModal(supplier?: Supplier) {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormName(supplier.name);
      setFormBereichsleiterId(supplier.assigned_bereichsleiter_id || '');
      setFormOfferedArticles(supplier.offered_articles || '');
      setFormLink(supplier.link || '');
      setFormUsername(supplier.username || '');
      setFormPassword(supplier.password || '');
      setFormOrderMethods(supplier.order_methods || []);
      setFormOrderEmail(supplier.order_email || '');
      setFormOrderPhone(supplier.order_phone || '');
      setFormMinOrderValue(supplier.minimum_order_value?.toString() || '');
      setFormOrderDays(supplier.order_days || []);
      setFormCustomerNumber(supplier.customer_number || '');
      setFormDiscountPercent(supplier.discount_percent?.toString() || '');
      setFormPaymentTerms(supplier.payment_terms || '');
      setFormSpecialConditions(supplier.special_conditions || '');
    } else {
      setEditingSupplier(null);
      setFormName('');
      setFormBereichsleiterId('');
      setFormOfferedArticles('');
      setFormLink('');
      setFormUsername('rechnungen@feuerwehr-marchtrenk.at');
      setFormPassword('');
      setFormOrderMethods([]);
      setFormOrderEmail('');
      setFormOrderPhone('');
      setFormMinOrderValue('');
      setFormOrderDays([]);
      setFormCustomerNumber('');
      setFormDiscountPercent('');
      setFormPaymentTerms('');
      setFormSpecialConditions('');
    }
    setFormError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingSupplier(null);
  }

  function toggleOrderMethod(methodId: string) {
    setFormOrderMethods((prev) =>
    prev.includes(methodId) ?
    prev.filter((m) => m !== methodId) :
    [...prev, methodId]
    );
  }

  function toggleOrderDay(dayId: string) {
    setFormOrderDays((prev) =>
    prev.includes(dayId) ?
    prev.filter((d) => d !== dayId) :
    [...prev, dayId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    const data = {
      name: formName,
      assigned_bereichsleiter_id: formBereichsleiterId || undefined,
      offered_articles: formOfferedArticles || undefined,
      link: formLink || undefined,
      username: formUsername || undefined,
      password: formPassword || undefined,
      order_methods: formOrderMethods,
      order_email: formOrderMethods.includes('email') ? formOrderEmail || undefined : undefined,
      order_phone: formOrderMethods.includes('telefonisch') ? formOrderPhone || undefined : undefined,
      minimum_order_value: formMinOrderValue ? parseFloat(formMinOrderValue) : null,
      order_days: formOrderDays.length > 0 ? formOrderDays : null,
      customer_number: formCustomerNumber || undefined,
      discount_percent: canEditDiscountFields && formDiscountPercent ? parseFloat(formDiscountPercent) : undefined,
      payment_terms: canEditDiscountFields ? formPaymentTerms || undefined : undefined,
      special_conditions: canEditDiscountFields ? formSpecialConditions || undefined : undefined
    };

    const { error } = editingSupplier ?
    await updateSupplier(editingSupplier.id, data) :
    await createSupplier(data);

    if (error) {
      setFormError(error.message);
    } else {
      closeModal();
    }
    setFormLoading(false);
  }

  async function handleDelete(id: string) {
    if (confirm('Möchten Sie diesen Lieferanten wirklich löschen?')) {
      await deleteSupplier(id);
    }
  }

  async function handleApprove(supplier: Supplier) {
    setApprovingId(supplier.id);
    await approveSupplier(supplier.id);
    setApprovingId(null);
  }

  function openRejectModal(supplier: Supplier) {
    setSupplierToReject(supplier);
    setRejectReason('');
    setShowRejectModal(true);
  }

  async function handleReject() {
    if (!supplierToReject) return;
    setRejectingId(supplierToReject.id);
    await deleteSupplier(supplierToReject.id, rejectReason);
    setRejectingId(null);
    setShowRejectModal(false);
    setSupplierToReject(null);
  }

  function togglePassword(id: string) {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Get creator name for pending suppliers
  function getCreatorName(createdBy: string | null) {
    if (!createdBy) return 'Unbekannt';
    const creator = profiles.find((p) => p.id === createdBy);
    return creator?.full_name || creator?.email || 'Unbekannt';
  }

  if (loading) {
    return (
      <Layout>
        <div data-ev-id="ev_94302d13f3" className="flex items-center justify-center min-h-[400px]">
          <div data-ev-id="ev_095548781c" className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </Layout>);

  }

  return (
    <Layout>
      {/* Page Header Card */}
      <div data-ev-id="ev_c0ca4e7bf5" className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-5 text-white shadow-lg mb-6">
        <div data-ev-id="ev_c5d1fbbe9f" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div data-ev-id="ev_7edff1b190" className="flex items-center gap-4">
            <div data-ev-id="ev_fa2f551c0c" className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div data-ev-id="ev_91536aa0e7">
              <h1 data-ev-id="ev_1773b6044f" className="text-xl font-bold">Lieferanten</h1>
              <p data-ev-id="ev_6a2a5fe1b1" className="text-sm text-white/80">{suppliers.length} aktive Lieferanten</p>
            </div>
          </div>
          {canManageSuppliers &&
          <button data-ev-id="ev_330f484ad2"
          onClick={() => openModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-blue-600 rounded-xl font-medium hover:bg-white/90 transition-colors shadow-lg group">

              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              Neuer Lieferant
            </button>
          }
        </div>
      </div>

      {/* Search Card */}
      <div data-ev-id="ev_46d7fb515b" className="bg-card rounded-xl border border-border p-4 mb-6">
        <div data-ev-id="ev_1fe73fdd9d" className="flex flex-col sm:flex-row gap-3">
          <div data-ev-id="ev_f9a382266a" className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input data-ev-id="ev_5039b69a66"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name oder Sortiment suchen..."
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
          </div>
          <div data-ev-id="ev_70cc445e0a" className="flex gap-2">
            <button data-ev-id="ev_b5da2b5485"
            onClick={() => exportSuppliersToPdf({ suppliers: filteredSuppliers, profiles, pdfBackgroundUrl, pdfBackgroundOpacity })}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg font-medium hover:bg-red-100 transition-colors"
            title="Als PDF exportieren">

              <Download className="w-4 h-4" />
              <span data-ev-id="ev_e942b820fa" className="hidden sm:inline">PDF</span>
            </button>
            <button data-ev-id="ev_26b60aeda7"
            onClick={() => exportSuppliersToExcel({ suppliers: filteredSuppliers, profiles })}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-600 border border-green-200 rounded-lg font-medium hover:bg-green-100 transition-colors"
            title="Als Excel exportieren">

              <FileSpreadsheet className="w-4 h-4" />
              <span data-ev-id="ev_1075e7c4b8" className="hidden sm:inline">Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pending Suppliers Section - Only for Admin/Kommandant */}
      {canApproveSuppliers && pendingSuppliers.length > 0 &&
      <div data-ev-id="ev_54f7499081" className="mb-6">
          <div data-ev-id="ev_d07167bfbd" className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-300 overflow-hidden shadow-xl shadow-amber-200/50">
            {/* Header */}
            <div data-ev-id="ev_60f4b57ba4" className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 px-6 py-5">
              <div data-ev-id="ev_dc9b866858" className="flex items-center justify-between">
                <div data-ev-id="ev_dc20ac9f6b" className="flex items-center gap-4">
                  <div data-ev-id="ev_be8a72790f" className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <Clock className="w-7 h-7 text-white" />
                  </div>
                  <div data-ev-id="ev_eb1ac5b962">
                    <h2 data-ev-id="ev_b8298e5de6" className="text-xl font-bold text-white">Neue Lieferanten-Anfragen</h2>
                    <p data-ev-id="ev_3be9dafb76" className="text-sm text-white/80">Warten auf Ihre Genehmigung</p>
                  </div>
                </div>
                <div data-ev-id="ev_b27f558e98" className="flex items-center gap-2">
                  <span data-ev-id="ev_75b76508c5" className="px-4 py-2 bg-white text-amber-600 rounded-xl text-sm font-bold shadow-lg">
                    {pendingSuppliers.length} {pendingSuppliers.length === 1 ? 'Anfrage' : 'Anfragen'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Pending Items */}
            <div data-ev-id="ev_912937e108" className="p-5 flex flex-col gap-4">
              {pendingSuppliers.map((supplier) =>
            <div data-ev-id="ev_faeab4fad7"
            key={supplier.id}
            className="bg-white rounded-2xl border-2 border-amber-200 overflow-hidden shadow-md hover:shadow-lg transition-all">

                  {/* Card Header mit Status */}
                  <div data-ev-id="ev_a8189ae144" className="bg-gradient-to-r from-amber-100 to-orange-100 px-5 py-3 border-b border-amber-200 flex items-center justify-between">
                    <div data-ev-id="ev_f7d78623a6" className="flex items-center gap-3">
                      <div data-ev-id="ev_fd19865bd0" className="w-12 h-12 rounded-xl bg-white border border-amber-200 flex items-center justify-center shadow-sm">
                        <SupplierLogo link={supplier.link} name={supplier.name} />
                      </div>
                      <div data-ev-id="ev_144c088c34">
                        <h3 data-ev-id="ev_abda4dfa28" className="font-bold text-foreground text-lg">{supplier.name}</h3>
                        <div data-ev-id="ev_dc59c66507" className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span data-ev-id="ev_37deb31cd7">{getCreatorName(supplier.created_by)}</span>
                          <span data-ev-id="ev_79e6f4dd4b" className="text-muted-foreground/50">•</span>
                          <span data-ev-id="ev_8631fd934c">{new Date(supplier.created_at).toLocaleDateString('de-DE')}</span>
                        </div>
                      </div>
                    </div>
                    {/* Status Badge */}
                    <span data-ev-id="ev_30bdae5aa8" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-full text-xs font-bold shadow-lg animate-pulse">
                      <Clock className="w-3.5 h-3.5" />
                      Wartend
                    </span>
                  </div>

                  {/* Sortiment */}
                  {supplier.offered_articles &&
              <div data-ev-id="ev_1904a7716f" className="px-5 py-3 bg-amber-50/50 border-b border-amber-100">
                      <p data-ev-id="ev_2075d23b3e" className="text-sm text-muted-foreground">
                        {supplier.offered_articles}
                      </p>
                    </div>
              }

                  {/* Quick Contact Tiles */}
                  {(supplier.link || supplier.order_email || supplier.order_phone) &&
              <div data-ev-id="ev_16b8a07d03" className="px-5 py-3 flex gap-3 border-b border-amber-100">
                      {supplier.link &&
                <a data-ev-id="ev_fc0428e6a8"
                href={supplier.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-medium transition-colors">

                          <ExternalLink className="w-4 h-4" />
                          Website
                        </a>
                }
                      {supplier.order_email &&
                <a data-ev-id="ev_1bb08cbd08"
                href={`mailto:${supplier.order_email}`}
                className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-sm font-medium transition-colors">

                          <Mail className="w-4 h-4" />
                          E-Mail
                        </a>
                }
                      {supplier.order_phone &&
                <a data-ev-id="ev_7b9a3ac1b8"
                href={`tel:${supplier.order_phone}`}
                className="flex items-center gap-2 px-4 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl text-sm font-medium transition-colors">

                          <Phone className="w-4 h-4" />
                          Anrufen
                        </a>
                }
                    </div>
              }
                    
                  {/* Action Buttons */}
                  <div data-ev-id="ev_b23f020e89" className="p-4 bg-gradient-to-r from-slate-50 to-white flex items-center gap-3">
                    <button data-ev-id="ev_9586ffbbb8"
                onClick={() => handleApprove(supplier)}
                disabled={approvingId === supplier.id}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 shadow-lg shadow-green-500/30 text-base">

                      {approvingId === supplier.id ?
                  <div data-ev-id="ev_b9200903a1" className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :

                  <CheckCircle className="w-5 h-5" />
                  }
                      Genehmigen
                    </button>
                    <button data-ev-id="ev_c7fec20c7c"
                onClick={() => openRejectModal(supplier)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-bold hover:from-red-600 hover:to-rose-600 transition-all shadow-lg shadow-red-500/30 text-base">

                      <XCircle className="w-5 h-5" />
                      Ablehnen
                    </button>
                  </div>
                </div>
            )}
            </div>
          </div>
        </div>
      }

      {/* Suppliers Grid */}
      {filteredSuppliers.length === 0 ?
      <div data-ev-id="ev_60b08d52bd" className="text-center py-16 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-border">
          <div data-ev-id="ev_bf0cf2f88c" className="w-20 h-20 mx-auto mb-4 bg-muted rounded-2xl flex items-center justify-center">
            <Building2 className="w-10 h-10 text-muted-foreground" />
          </div>
          <p data-ev-id="ev_fbc7ffa91a" className="text-lg font-medium text-muted-foreground">Keine Lieferanten gefunden</p>
          <p data-ev-id="ev_0491c9af02" className="text-sm text-muted-foreground/70 mt-1">Passen Sie Ihre Suche an oder fügen Sie einen neuen Lieferanten hinzu</p>
        </div> :

      <div data-ev-id="ev_52b186548d" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSuppliers.map((supplier) => {
          const assignedPerson = supplier.assigned_bereichsleiter_id ?
          profiles.find((p) => p.id === supplier.assigned_bereichsleiter_id) :
          null;
          const hasLoginData = supplier.username || supplier.password;

          return (
            <div data-ev-id="ev_84cd23ada3"
            key={supplier.id}
            ref={(el) => {supplierRefs.current[supplier.id] = el;}}
            className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-300">

                {/* Card Header mit Status Badge */}
                <div data-ev-id="ev_b829e5d2bc" className="bg-gradient-to-r from-slate-600 to-slate-500 p-4 relative">
                  {/* Status Badge */}
                  <div data-ev-id="ev_7bdc450487" className="absolute top-3 right-3">
                    <span data-ev-id="ev_9894aee6d9" className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-400/90 text-white rounded-full text-xs font-bold shadow-lg">
                      <CheckCircle className="w-3 h-3" />
                      Aktiv
                    </span>
                  </div>
                  
                  <div data-ev-id="ev_42161f8972" className="flex items-center gap-3">
                    <div data-ev-id="ev_6755bb2784" className="w-14 h-14 rounded-xl bg-white/90 border border-white/50 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <SupplierLogo link={supplier.link} name={supplier.name} />
                    </div>
                    <div data-ev-id="ev_70522cb886" className="min-w-0 flex-1">
                      <h3 data-ev-id="ev_d78f968773" className="font-bold text-white text-lg truncate">
                        {supplier.name}
                      </h3>
                      {assignedPerson &&
                    <p data-ev-id="ev_9d1319827f" className="text-xs text-white/80 flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3" />
                          {assignedPerson.full_name}
                        </p>
                    }
                      {supplier.customer_number &&
                    <p data-ev-id="ev_a83e68c459" className="text-xs text-white/70 flex items-center gap-1 mt-0.5">
                          <Hash className="w-3 h-3" />
                          {supplier.customer_number}
                        </p>
                    }
                    </div>
                  </div>
                  
                  {/* Admin Action Buttons */}
                  {canManageSuppliers &&
                <div data-ev-id="ev_beb6a98976" className="absolute bottom-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button data-ev-id="ev_a24725a6c3"
                  onClick={(e) => {e.stopPropagation();openModal(supplier);}}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
                  title="Bearbeiten">

                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button data-ev-id="ev_ff8fbd4366"
                  onClick={(e) => {e.stopPropagation();handleDelete(supplier.id);}}
                  className="p-2 rounded-lg bg-white/20 hover:bg-red-500/80 transition-colors text-white"
                  title="Löschen">

                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                }
                </div>

                {/* Sortiment */}
                {supplier.offered_articles &&
              <div data-ev-id="ev_5b4076e4a6" className="px-4 py-3 bg-slate-50 border-b border-border">
                    <p data-ev-id="ev_8e5a100145" className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {supplier.offered_articles}
                    </p>
                  </div>
              }

                {/* Prominente Kontakt-Kacheln */}
                <div data-ev-id="ev_6c8da74330" className="p-4">
                  <div data-ev-id="ev_328c0afd59" className="grid grid-cols-4 gap-2 mb-4">
                    {/* Website Kachel */}
                    {supplier.link &&
                  <a data-ev-id="ev_f673f7bde4"
                  href={supplier.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex flex-col items-center justify-center p-2.5 bg-gradient-to-br from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 rounded-lg border border-slate-200 transition-all group/tile">

                        <div data-ev-id="ev_55d42247d3" className="w-8 h-8 bg-slate-500 rounded-lg flex items-center justify-center mb-1 group-hover/tile:scale-110 transition-transform shadow-md">
                          <ExternalLink className="w-4 h-4 text-white" />
                        </div>
                        <span data-ev-id="ev_f47dfded4d" className="text-[11px] font-bold text-slate-600">Website</span>
                      </a>
                  }

                    {/* E-Mail Kachel */}
                    {supplier.order_email &&
                  <a data-ev-id="ev_2795584f04"
                  href={`mailto:${supplier.order_email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex flex-col items-center justify-center p-2.5 bg-gradient-to-br from-green-50 to-emerald-100 hover:from-green-100 hover:to-emerald-200 rounded-lg border border-green-200 transition-all group/tile">

                        <div data-ev-id="ev_ed63f5c11c" className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center mb-1 group-hover/tile:scale-110 transition-transform shadow-md">
                          <Mail className="w-4 h-4 text-white" />
                        </div>
                        <span data-ev-id="ev_df4f5a8ed2" className="text-[11px] font-bold text-emerald-600">E-Mail</span>
                      </a>
                  }

                    {/* Telefon Kachel */}
                    {supplier.order_phone &&
                  <a data-ev-id="ev_5d60d556ff"
                  href={`tel:${supplier.order_phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex flex-col items-center justify-center p-2.5 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg border border-blue-200 transition-all group/tile">

                        <div data-ev-id="ev_ffce568517" className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mb-1 group-hover/tile:scale-110 transition-transform shadow-md">
                          <Phone className="w-4 h-4 text-white" />
                        </div>
                        <span data-ev-id="ev_df996ce277" className="text-[11px] font-bold text-blue-600">Anrufen</span>
                      </a>
                  }

                    {/* Login Kachel mit Passwort-Toggle */}
                    {hasLoginData &&
                  <button data-ev-id="ev_85bc343e8c"
                  onClick={(e) => {e.stopPropagation();togglePassword(supplier.id);}}
                  className="flex flex-col items-center justify-center p-2.5 bg-gradient-to-br from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 rounded-lg border border-slate-300 transition-all group/tile">

                        <div data-ev-id="ev_83189a0ecd" className="w-8 h-8 bg-slate-500 rounded-lg flex items-center justify-center mb-1 group-hover/tile:scale-110 transition-transform shadow-md">
                          {showPasswords[supplier.id] ?
                      <EyeOff className="w-4 h-4 text-white" /> :

                      <Eye className="w-4 h-4 text-white" />
                      }
                        </div>
                        <span data-ev-id="ev_1dca80b5fb" className="text-[11px] font-bold text-slate-700">
                          {showPasswords[supplier.id] ? 'Verbergen' : 'Login'}
                        </span>
                      </button>
                  }
                  </div>

                  {/* Expanded Login Details */}
                  {hasLoginData && showPasswords[supplier.id] &&
                <div data-ev-id="ev_afc8cbf9ed"
                onClick={(e) => e.stopPropagation()}
                className="mb-4 p-3 bg-slate-100 rounded-xl border border-slate-200 animate-in slide-in-from-top-2 duration-200">

                      {supplier.username &&
                  <div data-ev-id="ev_06ee31a08a" className="flex items-center justify-between mb-2">
                          <span data-ev-id="ev_f6428e11ef" className="text-xs text-muted-foreground">Benutzer:</span>
                          <code data-ev-id="ev_8970c0fdb2" className="text-sm font-semibold bg-white px-2 py-0.5 rounded">{supplier.username}</code>
                        </div>
                  }
                      {supplier.password &&
                  <div data-ev-id="ev_869383a343" className="flex items-center justify-between">
                          <span data-ev-id="ev_82765d6093" className="text-xs text-muted-foreground">Passwort:</span>
                          <code data-ev-id="ev_1b57c72a0e" className="text-sm font-semibold bg-white px-2 py-0.5 rounded">{supplier.password}</code>
                        </div>
                  }
                    </div>
                }

                  {/* Order Methods */}
                  {(supplier.order_methods ?? []).length > 0 &&
                <div data-ev-id="ev_316673a28b" className="flex flex-wrap gap-1.5 mb-3">
                      {(supplier.order_methods ?? []).map((method) => {
                    const option = ORDER_METHOD_OPTIONS.find((o) => o.id === method);
                    if (!option) return null;
                    const Icon = option.icon;
                    return (
                      <span data-ev-id="ev_5976e79095"
                      key={method}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium border border-purple-200">

                            <Icon className="w-3 h-3" />
                            {option.label}
                          </span>);

                  })}
                    </div>
                }

                  {/* Footer Info */}
                  {(supplier.minimum_order_value != null && supplier.minimum_order_value > 0 || (supplier.order_days ?? []).length > 0) &&
                <div data-ev-id="ev_d8fe483fa8" className="flex items-center gap-2 pt-3 border-t border-border/50">
                      {supplier.minimum_order_value != null && supplier.minimum_order_value > 0 &&
                  <span data-ev-id="ev_4607f3dd53" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-xl text-xs font-bold border border-amber-200">
                          <span data-ev-id="ev_338c9e65a7" className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-white text-[10px]">€</span>
                          Min. {supplier.minimum_order_value.toFixed(2)}
                        </span>
                  }
                      {(supplier.order_days ?? []).length > 0 &&
                  <div data-ev-id="ev_eb19ca5291" className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-violet-500" />
                          <div data-ev-id="ev_7d7fd72dc6" className="flex gap-0.5">
                            {(supplier.order_days ?? []).map((dayId) => {
                        const day = ORDER_DAY_OPTIONS.find((d) => d.id === dayId);
                        return day ?
                        <span data-ev-id="ev_5feee5d082"
                        key={dayId}
                        className="w-7 h-7 flex items-center justify-center bg-violet-100 text-violet-700 rounded-lg text-xs font-bold border border-violet-200">

                                  {day.label.slice(0, 2)}
                                </span> :
                        null;
                      })}
                          </div>
                        </div>
                  }
                    </div>
                }
                </div>

                {/* Footer - Detail öffnen */}
                <button data-ev-id="ev_0313fd86e4"
              onClick={() => setViewingSupplier(supplier)}
              className="w-full px-4 py-3 bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 hover:to-slate-50 border-t border-border transition-all group/btn">

                  <p data-ev-id="ev_df5b7929a4" className="text-sm text-muted-foreground group-hover/btn:text-slate-700 font-medium flex items-center justify-center gap-2 transition-colors">
                    <Eye className="w-4 h-4" />
                    Alle Details anzeigen
                  </p>
                </button>
              </div>);

        })}
        </div>
      }

      {/* Modal */}
      {showModal &&
      <div data-ev-id="ev_2b2ecefacf" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div data-ev-id="ev_b0a568c0b4" className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Gradient Header */}
            <div data-ev-id="ev_45de36f4f1" className="bg-gradient-to-r from-slate-600 to-slate-500 px-6 py-5">
              <div data-ev-id="ev_f2989c2a34" className="flex items-center justify-between">
                <div data-ev-id="ev_6a4eafa43c" className="flex items-center gap-4">
                  <div data-ev-id="ev_05de0e7fe1" className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    {editingSupplier ? <Edit2 className="w-6 h-6 text-white" /> : <Plus className="w-6 h-6 text-white" />}
                  </div>
                  <div data-ev-id="ev_b09c08b344">
                    <h3 data-ev-id="ev_c95afa7fe4" className="text-xl font-bold text-white">
                      {editingSupplier ? 'Lieferant bearbeiten' : 'Neuen Lieferanten anlegen'}
                    </h3>
                    <p data-ev-id="ev_da94f955ec" className="text-sm text-white/80">
                      {editingSupplier ? 'Informationen aktualisieren' : 'Alle wichtigen Daten erfassen'}
                    </p>
                  </div>
                </div>
                <button data-ev-id="ev_959faa6308"
              onClick={closeModal}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white">

                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div data-ev-id="ev_aa23477069" className="flex-1 overflow-y-auto p-6">
              {formError &&
            <div data-ev-id="ev_1f5a8042d0" className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3">
                  <div data-ev-id="ev_3e41bdf7a7" className="p-1.5 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <div data-ev-id="ev_1222fdfd7f">
                    <p data-ev-id="ev_69c6a9dd1f" className="font-medium">Fehler beim Speichern</p>
                    <p data-ev-id="ev_1480c1ed91" className="text-red-600 mt-0.5">{formError}</p>
                  </div>
                </div>
            }

              {/* Approval Hint - only for new suppliers */}
              {!editingSupplier &&
            <div data-ev-id="ev_6efc29012e" className="mb-5 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                  <div data-ev-id="ev_cdb5b064e5" className="flex items-start gap-3">
                    <div data-ev-id="ev_9b0596bcda" className="p-2 bg-amber-100 rounded-xl">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div data-ev-id="ev_437751256d" className="flex-1">
                      <p data-ev-id="ev_5e10d83b63" className="text-sm font-semibold text-amber-900">Hinweis zur Genehmigung</p>
                      <p data-ev-id="ev_07a7fdf68d" className="text-sm text-amber-700 mt-1 leading-relaxed">
                        Neue Lieferanten werden nach dem Anlegen vom Kommandanten geprüft und freigegeben.
                      </p>
                      <div data-ev-id="ev_bfb83fd510" className="mt-3 p-2.5 bg-white/60 rounded-lg border border-amber-200/50">
                        <p data-ev-id="ev_9d7eb284d0" className="text-xs text-amber-700 flex items-center gap-2">
                          <User className="w-3.5 h-3.5" />
                          <span data-ev-id="ev_8f13e362cf">Benutzername: <code data-ev-id="ev_1c9f9e0421" className="font-mono bg-amber-100 px-1.5 py-0.5 rounded text-amber-800">rechnungen@feuerwehr-marchtrenk.at</code></span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
            }

            <form data-ev-id="ev_fff4f3c49c" onSubmit={handleSubmit} onKeyDown={(e) => {
              // Verhindere unbeabsichtigtes Absenden durch Enter-Taste
              if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }} className="flex flex-col gap-5">
              {/* Basis-Informationen */}
              <div data-ev-id="ev_f0a35cc6c2" className="bg-muted/30 rounded-xl p-4">
                <h4 data-ev-id="ev_2c0b09f0da" className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Basis-Informationen
                </h4>
                <div data-ev-id="ev_e8989411de" className="flex flex-col gap-4">
                  <div data-ev-id="ev_23d4e99f25">
                    <label data-ev-id="ev_dc947a397c" className="block text-sm font-medium text-foreground mb-1.5">
                      Firmenname <span data-ev-id="ev_427e43c841" className="text-red-500">*</span>
                    </label>
                    <input data-ev-id="ev_43039edd3a"
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="z.B. Rosenbauer, Ziegler, Magirus..."
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    required />

                  </div>

                  <div data-ev-id="ev_372c0e4e16">
                    <label data-ev-id="ev_f76dddd889" className="block text-sm font-medium text-foreground mb-1.5">
                      Zuständiger Bereichsleiter
                    </label>
                    <div data-ev-id="ev_8c12a7cd1c" className="relative">
                      <select data-ev-id="ev_02d1d3240e"
                      value={formBereichsleiterId}
                      onChange={(e) => setFormBereichsleiterId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer transition-all">

                        <option data-ev-id="ev_a4cce54907" value="">Keinen zuweisen</option>
                        {bereichsleiterOptions.map((person) =>
                        <option data-ev-id="ev_e2c4fce689" key={person.id} value={person.id}>
                            {person.full_name} ({person.role === 'kommandant' ? 'Kommandant' : 'Bereichsleiter'})
                          </option>
                        )}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                    </div>
                    <p data-ev-id="ev_fe942ccd69" className="text-xs text-muted-foreground mt-1">Wer ist für Bestellungen bei diesem Lieferanten verantwortlich?</p>
                  </div>

                  <div data-ev-id="ev_a6e955855b">
                    <label data-ev-id="ev_62388d9a4c" className="block text-sm font-medium text-foreground mb-1.5">
                      Sortiment / Angebotene Artikel
                    </label>
                    <textarea data-ev-id="ev_22cb638857"
                    value={formOfferedArticles}
                    onChange={(e) => setFormOfferedArticles(e.target.value)}
                    placeholder="Was kann bei diesem Lieferanten bestellt werden?"
                    rows={2}
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all" />

                  </div>

                  <div data-ev-id="ev_2654bfb399">
                    <label data-ev-id="ev_4540af172f" className="block text-sm font-medium text-foreground mb-1.5">
                      Website
                    </label>
                    <input data-ev-id="ev_f4e7c17cfa"
                    type="url"
                    value={formLink}
                    onChange={(e) => setFormLink(e.target.value)}
                    placeholder="https://www.lieferant.at"
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />

                  </div>

                  <div data-ev-id="ev_94255a870a">
                    <label data-ev-id="ev_c983377c74" className="block text-sm font-medium text-foreground mb-1.5">
                      Kundennummer
                    </label>
                    <input data-ev-id="ev_3aacfc353d"
                    type="text"
                    value={formCustomerNumber}
                    onChange={(e) => setFormCustomerNumber(e.target.value)}
                    placeholder="z.B. KD-123456"
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                    <p data-ev-id="ev_41e19c48a2" className="text-xs text-muted-foreground mt-1">Ihre Kundennummer bei diesem Lieferanten</p>
                  </div>
                </div>
              </div>

              {/* Zugangsdaten */}
              <div data-ev-id="ev_f7f3ad0567" className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                <h4 data-ev-id="ev_7cf90ee7b2" className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-600" />
                  Zugangsdaten für den Webshop
                </h4>
                <div data-ev-id="ev_34219fc986" className="flex flex-col gap-4">
                  <div data-ev-id="ev_676caf5107">
                    <label data-ev-id="ev_9b0f24431f" className="block text-sm font-medium text-foreground mb-1.5">
                      Benutzername
                    </label>
                    <input data-ev-id="ev_814c552047"
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="E-Mail oder Benutzername"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />

                  </div>

                  <div data-ev-id="ev_6998af17d4">
                    <label data-ev-id="ev_e56f3538d1" className="block text-sm font-medium text-foreground mb-1.5">
                      Passwort
                    </label>
                    <input data-ev-id="ev_b2803bc39b"
                    type="text"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Passwort für den Webshop"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />

                    <p data-ev-id="ev_28dd4aaf66" className="text-xs text-muted-foreground mt-1">Wird sicher gespeichert und nur autorisierten Nutzern angezeigt.</p>
                  </div>
                </div>
              </div>

              {/* Bestellvorgang */}
              <div data-ev-id="ev_9e16b6e41e" className="bg-muted/30 rounded-xl p-4">
                <h4 data-ev-id="ev_cf98d3e639" className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                  Wie wird bestellt?
                </h4>
                <div data-ev-id="ev_fa268e8be4" className="grid grid-cols-2 gap-2">
                  {ORDER_METHOD_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = formOrderMethods.includes(option.id);
                    return (
                      <button data-ev-id="ev_cfcd541beb"
                      key={option.id}
                      type="button"
                      onClick={() => toggleOrderMethod(option.id)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left ${
                      isSelected ?
                      'bg-blue-50 border-blue-300 text-blue-700 shadow-sm' :
                      'bg-white border-slate-200 text-muted-foreground hover:bg-slate-50 hover:border-slate-300'}`
                      }>

                        <div data-ev-id="ev_2d6c91fcac"
                        className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`
                        }>

                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <Icon className="w-4 h-4" />
                        <span data-ev-id="ev_ad1a2ad7ce" className="text-sm font-medium">{option.label}</span>
                      </button>);

                  })}
                </div>
              </div>

              {formOrderMethods.includes('email') &&
              <div data-ev-id="ev_075683b9a5">
                  <label data-ev-id="ev_11c2be58df" className="block text-sm font-medium text-foreground mb-1.5">
                    E-Mail-Adresse für Bestellungen <span data-ev-id="ev_8d29b10bd2" className="text-red-500">*</span>
                  </label>
                  <input data-ev-id="ev_6abeb9d5b6"
                type="email"
                value={formOrderEmail}
                onChange={(e) => setFormOrderEmail(e.target.value)}
                placeholder="bestellung@lieferant.at"
                required
                className="w-full px-4 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />

                </div>
              }

              {formOrderMethods.includes('telefonisch') &&
              <div data-ev-id="ev_13018a1e65">
                  <label data-ev-id="ev_17402229e7" className="block text-sm font-medium text-foreground mb-1.5">
                    Telefonnummer für Bestellungen <span data-ev-id="ev_1ff09a8b3c" className="text-red-500">*</span>
                  </label>
                  <input data-ev-id="ev_1e6a425572"
                type="tel"
                value={formOrderPhone}
                onChange={(e) => setFormOrderPhone(e.target.value)}
                placeholder="+43 123 456789"
                required
                className="w-full px-4 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />

                </div>
              }

              {/* Mindestbestellwert und Bestelltage - nur für Admin, Kommandant, Kassier */}
              {canEditOrderFields &&
              <div data-ev-id="ev_383aa1f9fc" className="bg-amber-50/50 rounded-xl p-4 border border-amber-200/50">
                  <h4 data-ev-id="ev_94aa9b554a" className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Bestellbedingungen
                  </h4>
                  <div data-ev-id="ev_cdaeb04e2d" className="flex flex-col gap-4">
                    <div data-ev-id="ev_48c14d5fdd">
                      <label data-ev-id="ev_df63450b16" className="block text-sm font-medium text-foreground mb-1.5">
                        Mindestbestellwert
                      </label>
                      <div data-ev-id="ev_53487358f2" className="relative">
                        <input data-ev-id="ev_94f638182b"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formMinOrderValue}
                      onChange={(e) => setFormMinOrderValue(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all pr-10" />

                        <span data-ev-id="ev_99078b5103" className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                      </div>
                      <p data-ev-id="ev_0c68714bcc" className="text-xs text-muted-foreground mt-1">Leer lassen, wenn kein Mindestbestellwert gilt.</p>
                    </div>

                    <div data-ev-id="ev_71f97e3ab1">
                      <label data-ev-id="ev_247284e742" className="block text-sm font-medium text-foreground mb-2">
                        Bestelltage
                      </label>
                      <div data-ev-id="ev_61b5cb4e9b" className="flex flex-wrap gap-2">
                        {ORDER_DAY_OPTIONS.map((day) => {
                        const isSelected = formOrderDays.includes(day.id);
                        return (
                          <button data-ev-id="ev_161c752d52"
                          key={day.id}
                          type="button"
                          onClick={() => toggleOrderDay(day.id)}
                          className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                          isSelected ?
                          'bg-amber-500 text-white border-amber-500 shadow-sm' :
                          'bg-white border-amber-200 text-amber-700 hover:bg-amber-50'}`
                          }>

                              {day.label.slice(0, 2)}
                            </button>);

                      })}
                      </div>
                      <p data-ev-id="ev_6ea2c79edd" className="text-xs text-muted-foreground mt-1.5">An welchen Wochentagen sind Bestellungen möglich?</p>
                    </div>
                  </div>
                </div>
              }

              {/* Rabatte & Konditionen - nur für Kassier, Admin, Kommandant */}
              {canEditDiscountFields &&
              <div data-ev-id="ev_4b26c0dd7c" className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <h4 data-ev-id="ev_db70b1a2e4" className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-green-600" />
                    Rabatte & Konditionen
                  </h4>
                  <p data-ev-id="ev_f0251b4ad6" className="text-xs text-green-700 mb-4 bg-green-100 px-3 py-2 rounded-lg">
                    Diese Felder sind nur für Kassier, Admin und Kommandant sichtbar und editierbar.
                  </p>
                  <div data-ev-id="ev_647631c9bf" className="flex flex-col gap-4">
                    <div data-ev-id="ev_02223bce13">
                      <label data-ev-id="ev_2a326b5703" className="block text-sm font-medium text-foreground mb-1.5">
                        Rabatt in %
                      </label>
                      <div data-ev-id="ev_0095d5a65c" className="relative">
                        <input data-ev-id="ev_324b45e2ab"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formDiscountPercent}
                      onChange={(e) => setFormDiscountPercent(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 bg-white border border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all pr-10" />

                        <span data-ev-id="ev_b8ac77a3f3" className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                      </div>
                      <p data-ev-id="ev_df8ef9edb9" className="text-xs text-muted-foreground mt-1">Vereinbarter Rabatt bei diesem Lieferanten</p>
                    </div>

                    <div data-ev-id="ev_20faf618e7">
                      <label data-ev-id="ev_19205a00c4" className="block text-sm font-medium text-foreground mb-1.5">
                        <CreditCard className="w-4 h-4 inline mr-1 text-blue-600" />
                        Zahlungsbedingungen
                      </label>
                      <input data-ev-id="ev_ac25d421c2"
                    type="text"
                    value={formPaymentTerms}
                    onChange={(e) => setFormPaymentTerms(e.target.value)}
                    placeholder="z.B. 30 Tage netto, 2% Skonto bei Zahlung innerhalb 14 Tagen"
                    className="w-full px-4 py-2.5 bg-white border border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all" />

                    </div>

                    <div data-ev-id="ev_8f4d9846a5">
                      <label data-ev-id="ev_20e5b5d981" className="block text-sm font-medium text-foreground mb-1.5">
                        <FileText className="w-4 h-4 inline mr-1 text-slate-600" />
                        Sonderkonditionen
                      </label>
                      <textarea data-ev-id="ev_e2f18bc3b5"
                    value={formSpecialConditions}
                    onChange={(e) => setFormSpecialConditions(e.target.value)}
                    placeholder="Besondere Vereinbarungen, Rahmenverträge, etc."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-white border border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 resize-none transition-all" />

                    </div>
                  </div>
                </div>
              }

            </form>
            </div>

            {/* Footer Buttons */}
            <div data-ev-id="ev_deef27097b" className="p-4 border-t border-border bg-muted/30 flex gap-3">
              <button data-ev-id="ev_9b4315f69f"
            type="button"
            onClick={closeModal}
            className="flex-1 px-4 py-3 border border-input rounded-xl font-medium hover:bg-muted transition-colors">

                Abbrechen
              </button>
              <button data-ev-id="ev_217e7c0dd1"
            type="submit"
            form="supplier-form"
            disabled={formLoading}
            onClick={handleSubmit}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20">

                {formLoading ?
              <>
                    <div data-ev-id="ev_0387903fbe" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Wird gespeichert...
                  </> :

              <>
                    <CheckCircle className="w-4 h-4" />
                    {editingSupplier ? 'Änderungen speichern' : 'Lieferant anlegen'}
                  </>
              }
              </button>
            </div>
          </div>
        </div>
      }

      {/* Reject Modal */}
      {showRejectModal && supplierToReject &&
      <div data-ev-id="ev_f7c384ca0c" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div data-ev-id="ev_43fde51b68" className="bg-card rounded-2xl border border-border w-full max-w-md overflow-hidden shadow-2xl">
            {/* Red Gradient Header */}
            <div data-ev-id="ev_567edd3243" className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4">
              <div data-ev-id="ev_e48a31d0cd" className="flex items-center justify-between">
                <div data-ev-id="ev_abc2e955eb" className="flex items-center gap-3">
                  <div data-ev-id="ev_2fae70fe0f" className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-white" />
                  </div>
                  <div data-ev-id="ev_2da41e3a73">
                    <h3 data-ev-id="ev_08bd6084dd" className="text-lg font-semibold text-white">Lieferant ablehnen</h3>
                    <p data-ev-id="ev_efd8d32009" className="text-xs text-white/70">{supplierToReject.name}</p>
                  </div>
                </div>
                <button data-ev-id="ev_a286e0e4da"
              onClick={() => setShowRejectModal(false)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white">

                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div data-ev-id="ev_b5fd041c94" className="p-6">
              <p data-ev-id="ev_07d0f33d7b" className="text-sm text-muted-foreground mb-4">
                Möchten Sie diesen Lieferanten wirklich ablehnen? Der Ersteller wird benachrichtigt.
              </p>

              <div data-ev-id="ev_a81b7bbdb1" className="mb-4">
                <label data-ev-id="ev_68e83edaf0" className="block text-sm font-medium text-foreground mb-1.5">
                  Begründung (optional)
                </label>
                <textarea data-ev-id="ev_33d6857492"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Grund für die Ablehnung..."
              rows={3}
              className="w-full px-4 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none transition-all" />

              </div>

              <div data-ev-id="ev_c3628afb69" className="flex gap-3">
                <button data-ev-id="ev_5711ef83e5"
              type="button"
              onClick={() => setShowRejectModal(false)}
              className="flex-1 px-4 py-2.5 border border-input rounded-xl font-medium hover:bg-muted transition-colors">

                  Abbrechen
                </button>
                <button data-ev-id="ev_4fa43dc23c"
              type="button"
              onClick={handleReject}
              disabled={rejectingId === supplierToReject.id}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">

                  {rejectingId === supplierToReject.id ?
                <div data-ev-id="ev_23a03f91a9" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :

                <XCircle className="w-4 h-4" />
                }
                  Ablehnen
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      {/* Supplier Detail Modal for viewing */}
      {viewingSupplier &&
      <SupplierDetailModal
        supplier={viewingSupplier}
        onClose={() => setViewingSupplier(null)}
        bereichsleiterName={
        viewingSupplier.assigned_bereichsleiter_id ?
        profiles.find((p) => p.id === viewingSupplier.assigned_bereichsleiter_id)?.full_name :
        undefined
        } />

      }
    </Layout>);

}