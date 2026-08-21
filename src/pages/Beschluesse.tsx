import { useState, useMemo, useCallback, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useBeschlussRegister, type BeschlussRegister, type BeschlussHistorie } from '@/hooks/useBeschlussRegister';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/contexts/AuthContext';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Vote,
  Euro,
  Calendar,
  Download,
  ChevronDown,
  ChevronRight,
  Search,
  Eye,
  X,
  History,
  ExternalLink,
  FileDown,
  Users,
  Gavel,
  Ban,
  AlertTriangle,
  Link2,
  CalendarOff,
  Timer,
  Plus,
  BookOpen,
  Save } from
'lucide-react';
import { Link } from 'react-router';

type FilterStatus = 'alle' | 'gueltig' | 'genehmigt' | 'abgelehnt' | 'offen' | 'ausstehend' | 'aufgehoben' | 'abgelaufen';
type FilterTyp = 'alle' | 'umlauf' | 'sitzung' | 'banf';

const STATUS_CONFIG: Record<string, {label: string;color: string;bgColor: string;icon: typeof CheckCircle;}> = {
  genehmigt: { label: 'Gültig', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: CheckCircle },
  abgelehnt: { label: 'Abgelehnt', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircle },
  offen: { label: 'Offen', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Clock },
  in_abstimmung: { label: 'In Abstimmung', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Vote },
  ausstehend: { label: 'Ausstehend', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: Clock },
  aufgehoben: { label: 'Aufgehoben', color: 'text-gray-700', bgColor: 'bg-gray-200', icon: Ban },
  abgelaufen: { label: 'Abgelaufen', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: CalendarOff }
};

const TYP_CONFIG: Record<string, {label: string;color: string;}> = {
  umlauf: { label: 'Umlaufbeschluss', color: 'bg-indigo-100 text-indigo-700' },
  sitzung: { label: 'Sitzungsbeschluss', color: 'bg-teal-100 text-teal-700' },
  banf: { label: 'BANF-Beschluss', color: 'bg-orange-100 text-orange-700' }
};

export default function Beschluesse() {
  const { beschluesse, loading, stats, fetchHistorie, gueltigeBeschluesse, createHistorischenBeschluss, generateBeschlussNummerForYear, canCreate } = useBeschlussRegister();
  const { beschlussRegisterViewRoles, beschlussRegisterCardsByRole } = useSettings();
  const { profile } = useAuth();
  const [nurGueltige, setNurGueltige] = useState(false);

  // Protokoll-Modal State (einfache Ansicht)
  const [protokollBeschluss, setProtokollBeschluss] = useState<BeschlussRegister | null>(null);

  // Berechtigungsprüfung
  const canViewRegister = useMemo(() => {
    if (!profile) return false;
    // Admin und Kommandant haben immer Zugriff
    if (profile.role === 'admin' || profile.role === 'kommandant') return true;
    return beschlussRegisterViewRoles.includes(profile.role);
  }, [profile, beschlussRegisterViewRoles]);

  // Berechtigung zum Nachtragen (Admin, Kommandant, Schriftführer)
  const canCreateHistorisch = useMemo(() => {
    if (!profile) return false;
    return ['admin', 'kommandant', 'schriftfuehrer'].includes(profile.role) && canCreate;
  }, [profile, canCreate]);

  // Modal für historische Beschlüsse
  const [showHistorischModal, setShowHistorischModal] = useState(false);
  const [historischForm, setHistorischForm] = useState({
    jahr: new Date().getFullYear(),
    typ: 'sitzung' as 'umlauf' | 'sitzung' | 'banf',
    titel: '',
    beschreibung: '',
    betrag: '',
    status: 'genehmigt' as 'genehmigt' | 'abgelehnt',
    beschlussDatum: '',
    abstimmung_ja: '',
    abstimmung_nein: '',
    abstimmung_enthaltung: '',
    gueltig_bis: '',
    anmerkungen: ''
  });
  const [previewNummer, setPreviewNummer] = useState('');
  const [savingHistorisch, setSavingHistorisch] = useState(false);

  // Vorschau der Beschlussnummer generieren wenn Jahr geändert wird
  const updatePreviewNummer = useCallback(async (jahr: number) => {
    const nummer = await generateBeschlussNummerForYear(jahr);
    setPreviewNummer(nummer);
  }, [generateBeschlussNummerForYear]);

  // Card-Sichtbarkeit prüfen (basierend auf Benutzerrolle)
  const isCardVisible = useCallback((cardId: string) => {
    if (!profile) return false;
    const roleCards = beschlussRegisterCardsByRole[profile.role] || [];
    return roleCards.includes(cardId);
  }, [beschlussRegisterCardsByRole, profile]);

  // Prüfen ob Benutzer erweiterte Filterrechte hat (Typ-Filter)
  const canFilterByType = useMemo(() => {
    if (!profile) return false;
    return ['admin', 'kommandant', 'schriftfuehrer', 'kassier', 'bereichsleiter'].includes(profile.role) ||
    profile.functions?.includes('kommandomitglied') ||
    profile.functions?.includes('erweitertes_kommando');
  }, [profile]);

  // Prüfen ob Benutzer Kommandomitglied ist (für Detail-Auge-Button)
  const isKommandomitglied = useMemo(() => {
    if (!profile) return false;
    return ['admin', 'kommandant', 'schriftfuehrer', 'kassier', 'bereichsleiter'].includes(profile.role) ||
    profile.functions?.includes('kommandomitglied') ||
    profile.functions?.includes('erweitertes_kommando');
  }, [profile]);

  // Verfügbare Status-Optionen basierend auf sichtbaren Cards
  const availableStatusOptions = useMemo(() => {
    const options: Array<{value: FilterStatus;label: string;}> = [];

    // Mapping von Card-ID zu Status-Filter-Option
    const cardToStatus: Record<string, {value: FilterStatus;label: string;}> = {
      'gesamt': { value: 'alle', label: 'Alle Status' },
      'gueltig': { value: 'gueltig', label: 'Gültig' },
      'abgelehnt': { value: 'abgelehnt', label: 'Abgelehnt' },
      'in_abstimmung': { value: 'offen', label: 'Offen / In Abstimmung' },
      'ausstehend': { value: 'ausstehend', label: 'Ausstehend' },
      'aufgehoben': { value: 'aufgehoben', label: 'Aufgehoben' },
      'abgelaufen': { value: 'abgelaufen', label: 'Abgelaufen' }
    };

    // Alle sichtbaren Cards durchgehen und entsprechende Status-Optionen hinzufügen
    const roleCards = profile ? beschlussRegisterCardsByRole[profile.role] || [] : [];
    const addedValues = new Set<FilterStatus>();

    for (const cardId of roleCards) {
      const statusOption = cardToStatus[cardId];
      if (statusOption && !addedValues.has(statusOption.value)) {
        options.push(statusOption);
        addedValues.add(statusOption.value);
      }
    }

    // Sortieren: "Alle Status" immer zuerst, dann alphabetisch
    return options.sort((a, b) => {
      if (a.value === 'alle') return -1;
      if (b.value === 'alle') return 1;
      return a.label.localeCompare(b.label);
    });
  }, [beschlussRegisterCardsByRole, profile]);

  const [statusFilter, setStatusFilter] = useState<FilterStatus>('alle');
  const [typFilter, setTypFilter] = useState<FilterTyp>('alle');

  // Status-Filter zurücksetzen wenn aktuelle Auswahl nicht mehr verfügbar
  useEffect(() => {
    if (availableStatusOptions.length > 0) {
      const currentValueAvailable = availableStatusOptions.some((opt) => opt.value === statusFilter);
      if (!currentValueAvailable) {
        // Auf ersten verfügbaren Wert setzen
        setStatusFilter(availableStatusOptions[0].value);
      }
    }
  }, [availableStatusOptions, statusFilter]);
  const [jahrFilter, setJahrFilter] = useState<number | 'alle'>('alle');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([new Date().getFullYear()]));
  const [selectedBeschluss, setSelectedBeschluss] = useState<BeschlussRegister | null>(null);
  const [historie, setHistorie] = useState<BeschlussHistorie[]>([]);
  const [loadingHistorie, setLoadingHistorie] = useState(false);

  // Verfügbare Jahre ermitteln
  const availableYears = useMemo(() => {
    const years = new Set(beschluesse.map((b) => b.jahr));
    return Array.from(years).sort((a, b) => b - a);
  }, [beschluesse]);

  // Hilfsfunktion: Prüft ob Beschluss abgelaufen ist
  const isAbgelaufen = useCallback((b: BeschlussRegister): boolean => {
    if (!b.gueltig_bis || b.status === 'aufgehoben') return false;
    return new Date(b.gueltig_bis) < new Date();
  }, []);

  // Hilfsfunktion: Prüft ob Beschluss bald abläuft (30 Tage)
  const isBaldAblaufend = useCallback((b: BeschlussRegister): boolean => {
    if (!b.gueltig_bis || b.status === 'aufgehoben' || b.status === 'abgelaufen') return false;
    const ablaufDatum = new Date(b.gueltig_bis);
    const heute = new Date();
    const in30Tagen = new Date();
    in30Tagen.setDate(in30Tagen.getDate() + 30);
    return ablaufDatum > heute && ablaufDatum <= in30Tagen;
  }, []);

  // Effektiver Status (berücksichtigt Ablaufdatum)
  const getEffektiverStatus = useCallback((b: BeschlussRegister): string => {
    if (b.status === 'aufgehoben') return 'aufgehoben';
    if (b.status === 'abgelaufen' || isAbgelaufen(b)) return 'abgelaufen';
    return b.status;
  }, [isAbgelaufen]);

  // Gefilterte Beschlüsse
  const filteredBeschluesse = useMemo(() => {
    return beschluesse.filter((b) => {
      const effektiverStatus = getEffektiverStatus(b);

      // Nur gültige Filter
      if (nurGueltige) {
        if (effektiverStatus !== 'genehmigt') return false;
      }

      if (statusFilter !== 'alle') {
        if (statusFilter === 'gueltig') {
          if (effektiverStatus !== 'genehmigt') return false;
        } else if (statusFilter === 'offen') {
          if (effektiverStatus !== 'offen' && effektiverStatus !== 'in_abstimmung') return false;
        } else if (statusFilter === 'aufgehoben') {
          if (effektiverStatus !== 'aufgehoben') return false;
        } else if (statusFilter === 'abgelaufen') {
          if (effektiverStatus !== 'abgelaufen') return false;
        } else {
          if (effektiverStatus !== statusFilter) return false;
        }
      }
      if (typFilter !== 'alle' && b.typ !== typFilter) return false;
      if (jahrFilter !== 'alle' && b.jahr !== jahrFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!b.titel.toLowerCase().includes(query) &&
        !b.beschluss_nummer.toLowerCase().includes(query) &&
        !b.beschreibung?.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [beschluesse, statusFilter, typFilter, jahrFilter, searchQuery, nurGueltige, getEffektiverStatus]);

  // Nach Jahr gruppieren
  const groupedByYear = useMemo(() => {
    const groups: Record<number, BeschlussRegister[]> = {};
    filteredBeschluesse.forEach((b) => {
      if (!groups[b.jahr]) groups[b.jahr] = [];
      groups[b.jahr].push(b);
    });
    return groups;
  }, [filteredBeschluesse]);

  const toggleYear = (year: number) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  const openDetail = async (beschluss: BeschlussRegister) => {
    setSelectedBeschluss(beschluss);
    setLoadingHistorie(true);
    const hist = await fetchHistorie(beschluss.id);
    setHistorie(hist);
    setLoadingHistorie(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-AT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('de-AT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const exportToExcel = () => {
    // Einfacher CSV Export
    const headers = ['Beschluss-Nr.', 'Titel', 'Typ', 'Status', 'Betrag', 'Ja', 'Nein', 'Enthaltung', 'Erstellt am', 'Genehmigt am'];
    const rows = filteredBeschluesse.map((b) => [
    b.beschluss_nummer,
    b.titel,
    TYP_CONFIG[b.typ]?.label || b.typ,
    STATUS_CONFIG[b.status]?.label || b.status,
    b.betrag?.toString() || '',
    b.abstimmung_ja?.toString() || '0',
    b.abstimmung_nein?.toString() || '0',
    b.abstimmung_enthaltung?.toString() || '0',
    formatDate(b.erstellt_am),
    formatDate(b.genehmigt_am)]
    );

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `beschluesse_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getAktionLabel = (aktion: string) => {
    const labels: Record<string, string> = {
      erstellt: 'Erstellt',
      eingereicht: 'Eingereicht',
      abstimmung_gestartet: 'Abstimmung gestartet',
      abgestimmt: 'Abgestimmt',
      genehmigt: 'Genehmigt',
      abgelehnt: 'Abgelehnt',
      bestaetigt: 'In Sitzung bestätigt',
      pdf_erstellt: 'PDF erstellt',
      email_gesendet: 'E-Mail gesendet',
      aufgehoben: 'Aufgehoben',
      abgelaufen: 'Abgelaufen',
      erinnerung_gesendet: 'Erinnerung gesendet'
    };
    return labels[aktion] || aktion;
  };

  if (loading) {
    return (
      <Layout>
        <div data-ev-id="ev_loading" className="flex items-center justify-center h-64">
          <div data-ev-id="ev_spinner" className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>);
  }

  // Zugriff prüfen
  if (!canViewRegister) {
    return (
      <Layout>
        <div data-ev-id="ev_no_access" className="flex flex-col items-center justify-center h-64 text-center">
          <Ban className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 data-ev-id="ev_no_access_title" className="text-lg font-semibold text-foreground mb-2">Kein Zugriff</h2>
          <p data-ev-id="ev_no_access_text" className="text-muted-foreground">Sie haben keine Berechtigung, das Beschlussregister einzusehen.</p>
        </div>
      </Layout>);
  }

  return (
    <Layout>
      <div data-ev-id="ev_beschluesse_page" className="flex flex-col gap-6 pb-8">
        {/* Header */}
        <div data-ev-id="ev_header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div data-ev-id="ev_title_area">
            <h1 data-ev-id="ev_title" className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Gavel className="w-6 h-6 text-primary" />
              Beschlüsse
            </h1>
            <p data-ev-id="ev_subtitle" className="text-muted-foreground mt-1">
              Zentrales Register aller Beschlüsse
            </p>
          </div>
          <div data-ev-id="ev_header_actions" className="flex gap-2">
            {canCreateHistorisch &&
            <button
              data-ev-id="ev_historisch_btn"
              onClick={async () => {
                setShowHistorischModal(true);
                await updatePreviewNummer(historischForm.jahr);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                <BookOpen className="w-4 h-4" />
                Historischen Beschluss erfassen
              </button>
            }
            <button
              data-ev-id="ev_export_btn"
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats Cards - Obere Reihe */}
        <div data-ev-id="ev_stats_grid" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {isCardVisible('gesamt') &&
          <div data-ev-id="ev_stat_gesamt" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div data-ev-id="ev_stat_icon" className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-gray-600" />
              </div>
              <p data-ev-id="ev_stat_value" className="text-2xl font-bold text-foreground">{stats.gesamt}</p>
              <p data-ev-id="ev_stat_label" className="text-sm text-muted-foreground">Gesamt</p>
            </div>
          }

          {isCardVisible('gueltig') &&
          <div
            data-ev-id="ev_stat_genehmigt"
            className="bg-white rounded-xl p-4 border border-emerald-200 shadow-sm cursor-pointer hover:border-emerald-400 transition-colors"
            onClick={() => setStatusFilter('gueltig')}>
              <div data-ev-id="ev_stat_icon2" className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-3">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <p data-ev-id="ev_stat_value2" className="text-2xl font-bold text-emerald-700">{stats.genehmigt}</p>
              <p data-ev-id="ev_stat_label2" className="text-sm text-muted-foreground">Gültig</p>
            </div>
          }

          {isCardVisible('abgelehnt') &&
          <div
            data-ev-id="ev_stat_abgelehnt"
            className="bg-white rounded-xl p-4 border border-red-200 shadow-sm cursor-pointer hover:border-red-400 transition-colors"
            onClick={() => setStatusFilter('abgelehnt')}>
              <div data-ev-id="ev_stat_icon3" className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center mb-3">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <p data-ev-id="ev_stat_value3" className="text-2xl font-bold text-red-700">{stats.abgelehnt}</p>
              <p data-ev-id="ev_stat_label3" className="text-sm text-muted-foreground">Abgelehnt</p>
            </div>
          }

          {isCardVisible('in_abstimmung') &&
          <div
            data-ev-id="ev_stat_abstimmung"
            className="bg-white rounded-xl p-4 border border-purple-200 shadow-sm cursor-pointer hover:border-purple-400 transition-colors"
            onClick={() => setStatusFilter('offen')}>
              <div data-ev-id="ev_stat_icon4" className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
                <Vote className="w-5 h-5 text-purple-600" />
              </div>
              <p data-ev-id="ev_stat_value4" className="text-2xl font-bold text-purple-700">{stats.inAbstimmung}</p>
              <p data-ev-id="ev_stat_label4" className="text-sm text-muted-foreground">In Abstimmung</p>
            </div>
          }

          {isCardVisible('ausstehend') &&
          <div
            data-ev-id="ev_stat_ausstehend"
            className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm cursor-pointer hover:border-amber-400 transition-colors"
            onClick={() => setStatusFilter('ausstehend')}>
              <div data-ev-id="ev_stat_icon5" className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <p data-ev-id="ev_stat_value5" className="text-2xl font-bold text-amber-700">{stats.ausstehend}</p>
              <p data-ev-id="ev_stat_label5" className="text-sm text-muted-foreground">Ausstehend</p>
            </div>
          }

          {isCardVisible('finanzvolumen') &&
          <div data-ev-id="ev_stat_finanz" className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm">
              <div data-ev-id="ev_stat_icon6" className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                <Euro className="w-5 h-5 text-blue-600" />
              </div>
              <p data-ev-id="ev_stat_value6" className="text-2xl font-bold text-blue-700">{formatCurrency(stats.finanzvolumen)}</p>
              <p data-ev-id="ev_stat_label6" className="text-sm text-muted-foreground">Finanzvolumen</p>
            </div>
          }
        </div>

        {/* Stats Cards - Untere Reihe (Aufgehoben, Abgelaufen, Bald Ablaufend) */}
        <div data-ev-id="ev_stats_grid_2" className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isCardVisible('aufgehoben') &&
          <div
            data-ev-id="ev_stat_aufgehoben"
            className="bg-white rounded-xl p-4 border border-gray-300 shadow-sm cursor-pointer hover:border-gray-500 transition-colors"
            onClick={() => setStatusFilter('aufgehoben')}>
              <div data-ev-id="ev_stat_icon7" className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center mb-3">
                <Ban className="w-5 h-5 text-gray-600" />
              </div>
              <p data-ev-id="ev_stat_value7" className="text-2xl font-bold text-gray-700">{stats.aufgehoben}</p>
              <p data-ev-id="ev_stat_label7" className="text-sm text-muted-foreground">Aufgehoben</p>
            </div>
          }

          {isCardVisible('abgelaufen') &&
          <div
            data-ev-id="ev_stat_abgelaufen"
            className="bg-white rounded-xl p-4 border border-orange-200 shadow-sm cursor-pointer hover:border-orange-400 transition-colors"
            onClick={() => setStatusFilter('abgelaufen')}>
              <div data-ev-id="ev_stat_icon8" className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center mb-3">
                <CalendarOff className="w-5 h-5 text-orange-600" />
              </div>
              <p data-ev-id="ev_stat_value8" className="text-2xl font-bold text-orange-700">{stats.abgelaufen}</p>
              <p data-ev-id="ev_stat_label8" className="text-sm text-muted-foreground">Abgelaufen</p>
            </div>
          }

          {isCardVisible('bald_ablaufend') && stats.baldAblaufend > 0 &&
          <div data-ev-id="ev_stat_bald" className="bg-white rounded-xl p-4 border border-yellow-300 shadow-sm bg-yellow-50">
              <div data-ev-id="ev_stat_icon9" className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center mb-3">
                <Timer className="w-5 h-5 text-yellow-600" />
              </div>
              <p data-ev-id="ev_stat_value9" className="text-2xl font-bold text-yellow-700">{stats.baldAblaufend}</p>
              <p data-ev-id="ev_stat_label9" className="text-sm text-yellow-700 font-medium">Läuft bald ab</p>
            </div>
          }
        </div>

        {/* Filter Bar */}
        <div data-ev-id="ev_filter_bar" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div data-ev-id="ev_filter_grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div data-ev-id="ev_search_wrapper" className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                data-ev-id="ev_search_input"
                type="text"
                placeholder="Suche nach Titel, Nummer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />

            </div>

            {/* Status Filter - nur verfügbare Optionen basierend auf Rollen-Cards */}
            <select
              data-ev-id="ev_status_filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white">
              {availableStatusOptions.map((option) =>
              <option data-ev-id="ev_72fbbd6af2" key={option.value} value={option.value}>{option.label}</option>
              )}
            </select>

            {/* Typ Filter - nur für Kommandomitglieder und höhere Rollen */}
            {canFilterByType &&
            <select
              data-ev-id="ev_typ_filter"
              value={typFilter}
              onChange={(e) => setTypFilter(e.target.value as FilterTyp)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white">
                <option data-ev-id="ev_1db2c1fa54" value="alle">Alle Typen</option>
                <option data-ev-id="ev_72653d749e" value="umlauf">Umlaufbeschluss</option>
                <option data-ev-id="ev_06940b6841" value="sitzung">Sitzungsbeschluss</option>
                <option data-ev-id="ev_3b47263d02" value="banf">BANF-Beschluss</option>
              </select>
            }

            {/* Jahr Filter */}
            <select
              data-ev-id="ev_jahr_filter"
              value={jahrFilter}
              onChange={(e) => setJahrFilter(e.target.value === 'alle' ? 'alle' : parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white">

              <option data-ev-id="ev_1d2e523778" value="alle">Alle Jahre</option>
              {availableYears.map((year) =>
              <option data-ev-id="ev_490503297f" key={year} value={year}>{year}</option>
              )}
            </select>
          </div>
        </div>

        {/* Beschlüsse Liste nach Jahr gruppiert */}
        <div data-ev-id="ev_list_container" className="flex flex-col gap-4">
          {Object.keys(groupedByYear).length === 0 ?
          <div data-ev-id="ev_empty_state" className="bg-white rounded-xl p-8 border border-gray-200 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p data-ev-id="ev_empty_text" className="text-muted-foreground">Keine Beschlüsse gefunden</p>
            </div> :

          Object.keys(groupedByYear).
          map(Number).
          sort((a, b) => b - a).
          map((year) =>
          <div data-ev-id={`ev_year_group_${year}`} key={year} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Year Header */}
                  <button
              data-ev-id={`ev_year_toggle_${year}`}
              onClick={() => toggleYear(year)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">

                    <div data-ev-id={`ev_year_info_${year}`} className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-primary" />
                      <span data-ev-id={`ev_year_label_${year}`} className="text-lg font-semibold text-foreground">{year}</span>
                      <span data-ev-id={`ev_year_count_${year}`} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-sm rounded-full">
                        {groupedByYear[year].length} Beschlüsse
                      </span>
                    </div>
                    {expandedYears.has(year) ?
              <ChevronDown className="w-5 h-5 text-muted-foreground" /> :

              <ChevronRight className="w-5 h-5 text-muted-foreground" />
              }
                  </button>

                  {/* Year Content */}
                  {expandedYears.has(year) &&
            <div data-ev-id={`ev_year_content_${year}`} className="border-t border-gray-100">
                      <div data-ev-id={`ev_table_wrapper_${year}`} className="overflow-x-auto">
                        <table data-ev-id={`ev_table_${year}`} className="w-full">
                          <thead data-ev-id={`ev_thead_${year}`}>
                            <tr data-ev-id={`ev_header_row_${year}`} className="bg-gray-50 text-left text-sm text-muted-foreground">
                              <th data-ev-id={`ev_th_nr_${year}`} className="px-6 py-3 font-medium">Nr.</th>
                              <th data-ev-id={`ev_th_titel_${year}`} className="px-6 py-3 font-medium">Titel</th>
                              <th data-ev-id={`ev_th_ergebnis_${year}`} className="px-6 py-3 font-medium">Ergebnis</th>
                              <th data-ev-id={`ev_th_datum_${year}`} className="px-6 py-3 font-medium">Datum</th>
                              <th data-ev-id={`ev_th_aktion_${year}`} className="px-6 py-3 font-medium"></th>
                            </tr>
                          </thead>
                          <tbody data-ev-id={`ev_tbody_${year}`}>
                            {groupedByYear[year].map((beschluss) => {
                      const effStatus = getEffektiverStatus(beschluss);
                      const baldAblaufend = isBaldAblaufend(beschluss);
                      // Ergebnis NUR auf Basis der tatsächlichen Stimmen
                      const jaStimmen = beschluss.abstimmung_ja || 0;
                      const neinStimmen = beschluss.abstimmung_nein || 0;
                      const isGenehmigt = jaStimmen > neinStimmen;
                      const isAbgelehnt = neinStimmen > jaStimmen;

                      return (
                        <tr
                          data-ev-id={`ev_row_${beschluss.id}`}
                          key={beschluss.id}
                          className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${
                          baldAblaufend ? 'bg-yellow-50' : ''} ${
                          effStatus === 'aufgehoben' ? 'opacity-60' : ''}`}>

                                  <td data-ev-id={`ev_td_nr_${beschluss.id}`} className="px-6 py-4">
                                    <span data-ev-id={`ev_nr_${beschluss.id}`} className="font-mono text-sm text-muted-foreground">
                                      {beschluss.beschluss_nummer}
                                    </span>
                                  </td>
                                  <td data-ev-id={`ev_td_titel_${beschluss.id}`} className="px-6 py-4">
                                    <div data-ev-id={`ev_titel_wrapper_${beschluss.id}`}>
                                      <button
                                data-ev-id={`ev_titel_btn_${beschluss.id}`}
                                onClick={() => setProtokollBeschluss(beschluss)}
                                className="font-medium text-foreground hover:text-primary hover:underline text-left">

                                        {beschluss.titel}
                                      </button>
                                      {beschluss.meeting_title &&
                              <p data-ev-id={`ev_meeting_${beschluss.id}`} className="text-xs text-muted-foreground mt-1">
                                        Sitzung: {beschluss.meeting_title}
                                      </p>
                              }
                                    </div>
                                  </td>
                                  <td data-ev-id={`ev_td_ergebnis_${beschluss.id}`} className="px-6 py-4">
                                    {isGenehmigt ?
                            <span data-ev-id="ev_7a8bbf0830" className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">Genehmigt</span> :
                            isAbgelehnt ?
                            <span data-ev-id="ev_1e668b9463" className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Abgelehnt</span> :

                            <span data-ev-id="ev_6877257c24" className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">Offen</span>
                            }
                                  </td>
                                  <td data-ev-id={`ev_td_datum_${beschluss.id}`} className="px-6 py-4">
                                    <span data-ev-id={`ev_datum_${beschluss.id}`} className="text-sm text-muted-foreground">
                                      {formatDate(beschluss.erstellt_am)}
                                    </span>
                                  </td>
                                  <td data-ev-id={`ev_td_aktion_${beschluss.id}`} className="px-6 py-4">
                                    <div data-ev-id={`ev_actions_${beschluss.id}`} className="flex items-center gap-2">
                                      {isKommandomitglied &&
                              <button
                                data-ev-id={`ev_detail_btn_${beschluss.id}`}
                                onClick={() => openDetail(beschluss)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Details anzeigen">

                                        <Eye className="w-4 h-4 text-muted-foreground" />
                                      </button>
                              }
                                      {beschluss.pdf_url &&
                              <a
                                data-ev-id={`ev_pdf_link_${beschluss.id}`}
                                href={beschluss.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="PDF anzeigen">

                                          <FileDown className="w-4 h-4 text-primary" />
                                        </a>
                              }
                                      {beschluss.order_id &&
                              <Link
                                data-ev-id={`ev_order_link_${beschluss.id}`}
                                to={`/bestellungen/${beschluss.order_id}`}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Zur Bestellung">

                                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                                        </Link>
                              }
                                    </div>
                                  </td>
                                </tr>);

                    })}
                          </tbody>
                        </table>
                      </div>
                    </div>
            }
                </div>
          )
          }
        </div>

        {/* Detail Modal */}
        {selectedBeschluss &&
        <>
            <div
            data-ev-id="ev_modal_backdrop"
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedBeschluss(null)} />

            <div data-ev-id="ev_modal" className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[90vh] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div data-ev-id="ev_modal_header" className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div data-ev-id="ev_modal_title_area">
                  <h3 data-ev-id="ev_modal_title" className="text-lg font-semibold text-foreground">
                    {selectedBeschluss.titel}
                  </h3>
                  <p data-ev-id="ev_modal_nummer" className="text-sm text-muted-foreground font-mono">
                    {selectedBeschluss.beschluss_nummer}
                  </p>
                </div>
                <button
                data-ev-id="ev_modal_close"
                onClick={() => setSelectedBeschluss(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div data-ev-id="ev_modal_content" className="flex-1 overflow-y-auto p-6">
                <div data-ev-id="ev_modal_grid" className="grid grid-cols-2 gap-4 mb-6">
                  <div data-ev-id="ev_detail_typ">
                    <p data-ev-id="ev_detail_typ_label" className="text-sm text-muted-foreground mb-1">Typ</p>
                    <div data-ev-id="ev_detail_typ_badges" className="flex flex-wrap gap-1">
                      <span data-ev-id="ev_detail_typ_value" className={`px-2 py-1 text-sm rounded-full ${TYP_CONFIG[selectedBeschluss.typ]?.color}`}>
                        {TYP_CONFIG[selectedBeschluss.typ]?.label}
                      </span>
                      {selectedBeschluss.ist_historisch &&
                    <span data-ev-id="ev_detail_historisch_badge" className="px-2 py-1 text-sm rounded-full bg-purple-100 text-purple-700 flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />Historisch
                        </span>
                    }
                    </div>
                  </div>
                  <div data-ev-id="ev_detail_status">
                    <p data-ev-id="ev_detail_status_label" className="text-sm text-muted-foreground mb-1">Status</p>
                    <span data-ev-id="ev_detail_status_value" className={`inline-flex items-center gap-1.5 px-2 py-1 text-sm rounded-full ${STATUS_CONFIG[selectedBeschluss.status]?.bgColor} ${STATUS_CONFIG[selectedBeschluss.status]?.color}`}>
                      {STATUS_CONFIG[selectedBeschluss.status]?.label}
                    </span>
                  </div>
                  <div data-ev-id="ev_detail_betrag">
                    <p data-ev-id="ev_detail_betrag_label" className="text-sm text-muted-foreground mb-1">Betrag</p>
                    <p data-ev-id="ev_detail_betrag_value" className="font-medium">{formatCurrency(selectedBeschluss.betrag)}</p>
                  </div>
                  <div data-ev-id="ev_detail_abstimmung">
                    <p data-ev-id="ev_detail_abstimmung_label" className="text-sm text-muted-foreground mb-1">Abstimmung</p>
                    <p data-ev-id="ev_detail_abstimmung_value" className="font-medium">
                      <span data-ev-id="ev_bf3581552a" className="text-emerald-600">{selectedBeschluss.abstimmung_ja || 0} Ja</span>
                      {' / '}
                      <span data-ev-id="ev_fe7a3aea05" className="text-red-600">{selectedBeschluss.abstimmung_nein || 0} Nein</span>
                      {' / '}
                      <span data-ev-id="ev_bdc1138c18" className="text-gray-500">{selectedBeschluss.abstimmung_enthaltung || 0} Enthaltung</span>
                    </p>
                  </div>
                  <div data-ev-id="ev_detail_erstellt">
                    <p data-ev-id="ev_detail_erstellt_label" className="text-sm text-muted-foreground mb-1">Erstellt am</p>
                    <p data-ev-id="ev_detail_erstellt_value" className="font-medium">{formatDateTime(selectedBeschluss.erstellt_am)}</p>
                  </div>
                  <div data-ev-id="ev_detail_ersteller">
                    <p data-ev-id="ev_detail_ersteller_label" className="text-sm text-muted-foreground mb-1">Erstellt von</p>
                    <p data-ev-id="ev_detail_ersteller_value" className="font-medium">{selectedBeschluss.ersteller_name || '-'}</p>
                  </div>
                  {selectedBeschluss.genehmigt_am &&
                <>
                      <div data-ev-id="ev_detail_genehmigt">
                        <p data-ev-id="ev_detail_genehmigt_label" className="text-sm text-muted-foreground mb-1">Genehmigt am</p>
                        <p data-ev-id="ev_detail_genehmigt_value" className="font-medium">{formatDateTime(selectedBeschluss.genehmigt_am)}</p>
                      </div>
                      <div data-ev-id="ev_detail_genehmiger">
                        <p data-ev-id="ev_detail_genehmiger_label" className="text-sm text-muted-foreground mb-1">Genehmigt von</p>
                        <p data-ev-id="ev_detail_genehmiger_value" className="font-medium">{selectedBeschluss.genehmiger_name || '-'}</p>
                      </div>
                    </>
                }
                  {/* Gültigkeit / Ablaufdatum */}
                  <div data-ev-id="ev_detail_gueltigkeit">
                    <p data-ev-id="ev_detail_gueltigkeit_label" className="text-sm text-muted-foreground mb-1">Gültigkeit</p>
                    <p data-ev-id="ev_detail_gueltigkeit_value" className={`font-medium ${getEffektiverStatus(selectedBeschluss) === 'aufgehoben' ? 'text-gray-500' : getEffektiverStatus(selectedBeschluss) === 'abgelaufen' ? 'text-orange-600' : isBaldAblaufend(selectedBeschluss) ? 'text-yellow-600' : ''}`}>
                      {getEffektiverStatus(selectedBeschluss) === 'aufgehoben' ?
                    `Aufgehoben${selectedBeschluss.aufgehoben_am ? ' am ' + formatDate(selectedBeschluss.aufgehoben_am) : ''}` :
                    selectedBeschluss.gueltig_bis ?
                    isAbgelaufen(selectedBeschluss) ?
                    `Abgelaufen am ${formatDate(selectedBeschluss.gueltig_bis)}` :
                    `Gültig bis ${formatDate(selectedBeschluss.gueltig_bis)}` :
                    'Unbegrenzt gültig'}
                    </p>
                  </div>
                </div>

                {/* Verknüpfungen */}
                {(selectedBeschluss.aufgehoben_durch_nummer || selectedBeschluss.hebt_auf_nummer) &&
              <div data-ev-id="ev_detail_verknuepfungen" className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <p data-ev-id="ev_verknuepfungen_title" className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      Verknüpfte Beschlüsse
                    </p>
                    {selectedBeschluss.aufgehoben_durch_nummer &&
                <p data-ev-id="ev_aufgehoben_durch" className="text-sm text-blue-600">
                        → Aufgehoben durch: <span data-ev-id="ev_fb04b4e5b0" className="font-mono font-medium">{selectedBeschluss.aufgehoben_durch_nummer}</span>
                      </p>
                }
                    {selectedBeschluss.hebt_auf_nummer &&
                <p data-ev-id="ev_hebt_auf" className="text-sm text-blue-600">
                        → Ersetzt Beschluss: <span data-ev-id="ev_f6b5e3a86f" className="font-mono font-medium">{selectedBeschluss.hebt_auf_nummer}</span>
                      </p>
                }
                    {selectedBeschluss.aufhebung_notiz &&
                <p data-ev-id="ev_aufhebung_notiz" className="text-sm text-gray-600 mt-2 italic">
                        "{selectedBeschluss.aufhebung_notiz}"
                      </p>
                }
                  </div>
              }

                {selectedBeschluss.beschreibung &&
              <div data-ev-id="ev_detail_beschreibung" className="mb-6">
                    <p data-ev-id="ev_detail_beschreibung_label" className="text-sm text-muted-foreground mb-2">Beschreibung</p>
                    <p data-ev-id="ev_detail_beschreibung_value" className="text-foreground whitespace-pre-wrap bg-gray-50 rounded-lg p-4">
                      {selectedBeschluss.beschreibung}
                    </p>
                  </div>
              }

                {/* Quick Actions */}
                <div data-ev-id="ev_quick_actions" className="flex flex-wrap gap-2 mb-6">
                  {selectedBeschluss.pdf_url &&
                <a
                  data-ev-id="ev_action_pdf"
                  href={selectedBeschluss.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                      <FileDown className="w-4 h-4" />
                      PDF anzeigen
                    </a>
                }
                  {selectedBeschluss.order_id &&
                <Link
                  data-ev-id="ev_action_order"
                  to={`/bestellungen/${selectedBeschluss.order_id}`}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-foreground rounded-lg hover:bg-gray-200 transition-colors">
                      <ExternalLink className="w-4 h-4" />
                      Zur Bestellung
                    </Link>
                }
                  {selectedBeschluss.meeting_id &&
                <Link
                  data-ev-id="ev_action_meeting"
                  to={`/sitzungen/${selectedBeschluss.meeting_id}`}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-foreground rounded-lg hover:bg-gray-200 transition-colors">
                      <Users className="w-4 h-4" />
                      Zur Sitzung
                    </Link>
                }
                </div>

                {/* Historie */}
                <div data-ev-id="ev_historie_section">
                  <h4 data-ev-id="ev_historie_title" className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                    <History className="w-4 h-4" />
                    Verlauf
                  </h4>
                  {loadingHistorie ?
                <div data-ev-id="ev_historie_loading" className="flex items-center justify-center py-4">
                      <div data-ev-id="ev_historie_spinner" className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div> :
                historie.length === 0 ?
                <p data-ev-id="ev_historie_empty" className="text-sm text-muted-foreground py-4">Keine Historie verfügbar</p> :

                <div data-ev-id="ev_historie_list" className="flex flex-col gap-3">
                      {historie.map((h, index) =>
                  <div
                    data-ev-id={`ev_historie_item_${h.id}`}
                    key={h.id}
                    className="flex items-start gap-3 relative">
                          {index < historie.length - 1 &&
                    <div data-ev-id={`ev_historie_line_${h.id}`} className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-200" />
                    }
                          <div data-ev-id={`ev_historie_dot_${h.id}`} className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 z-10">
                            <div data-ev-id={`ev_historie_dot_inner_${h.id}`} className="w-2 h-2 rounded-full bg-primary" />
                          </div>
                          <div data-ev-id={`ev_historie_content_${h.id}`} className="flex-1 min-w-0">
                            <p data-ev-id={`ev_historie_aktion_${h.id}`} className="text-sm font-medium text-foreground">
                              {getAktionLabel(h.aktion)}
                            </p>
                            <p data-ev-id={`ev_historie_meta_${h.id}`} className="text-xs text-muted-foreground">
                              {formatDateTime(h.durchgefuehrt_am)} • {h.durchgefuehrt_von_name || 'System'}
                            </p>
                            {h.notizen &&
                      <p data-ev-id={`ev_historie_notizen_${h.id}`} className="text-sm text-muted-foreground mt-1">
                                {h.notizen}
                              </p>
                      }
                          </div>
                        </div>
                  )}
                    </div>
                }
                </div>
              </div>
            </div>
          </>
        }

        {/* Modal: Historischen Beschluss erfassen */}
        {showHistorischModal &&
        <div data-ev-id="ev_historisch_modal" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div data-ev-id="ev_historisch_content" className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div data-ev-id="ev_historisch_header" className="flex items-center justify-between p-4 border-b border-border">
                <div data-ev-id="ev_historisch_title_area" className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-teal-600" />
                  <h2 data-ev-id="ev_historisch_title" className="text-lg font-bold text-foreground">Historischen Beschluss erfassen</h2>
                </div>
                <button
                data-ev-id="ev_historisch_close"
                onClick={() => setShowHistorischModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div data-ev-id="ev_historisch_form" className="p-4 flex flex-col gap-4">
                <div data-ev-id="ev_historisch_hint" className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                  <p data-ev-id="ev_historisch_hint_text" className="text-sm text-teal-700">
                    <strong data-ev-id="ev_e202d75e25">Hinweis:</strong> Hier können Sie Beschlüsse nachtragen, die vor Einführung des Systems getroffen wurden. Diese werden als "historisch" gekennzeichnet.
                  </p>
                </div>

                {/* Beschlussnummer-Vorschau */}
                <div data-ev-id="ev_historisch_nummer" className="bg-gray-50 rounded-lg p-3">
                  <label data-ev-id="ev_historisch_nummer_label" className="text-xs text-muted-foreground">Beschlussnummer (automatisch)</label>
                  <p data-ev-id="ev_historisch_nummer_value" className="text-lg font-mono font-bold text-foreground">{previewNummer || '...'}</p>
                </div>

                {/* Jahr */}
                <div data-ev-id="ev_historisch_jahr_field">
                  <label data-ev-id="ev_historisch_jahr_label" className="block text-sm font-medium mb-1">Jahr *</label>
                  <select
                  data-ev-id="ev_historisch_jahr_select"
                  value={historischForm.jahr}
                  onChange={async (e) => {
                    const jahr = parseInt(e.target.value);
                    setHistorischForm({ ...historischForm, jahr });
                    await updatePreviewNummer(jahr);
                  }}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-teal-500">
                    {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - i).map((year) =>
                  <option data-ev-id="ev_46935f0cfd" key={year} value={year}>{year}</option>
                  )}
                  </select>
                  <p data-ev-id="ev_historisch_jahr_hint" className="text-xs text-muted-foreground mt-1">Wählen Sie das Jahr, in dem der Beschluss gefasst wurde.</p>
                </div>

                {/* Typ */}
                <div data-ev-id="ev_historisch_typ_field">
                  <label data-ev-id="ev_historisch_typ_label" className="block text-sm font-medium mb-1">Beschlussart *</label>
                  <select
                  data-ev-id="ev_historisch_typ_select"
                  value={historischForm.typ}
                  onChange={(e) => setHistorischForm({ ...historischForm, typ: e.target.value as 'umlauf' | 'sitzung' | 'banf' })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-teal-500">
                    <option data-ev-id="ev_8c2896d986" value="sitzung">Sitzungsbeschluss</option>
                    <option data-ev-id="ev_fdbb34a0f5" value="umlauf">Umlaufbeschluss</option>
                    <option data-ev-id="ev_92f9986a18" value="banf">BANF-Beschluss</option>
                  </select>
                </div>

                {/* Titel */}
                <div data-ev-id="ev_historisch_titel_field">
                  <label data-ev-id="ev_historisch_titel_label" className="block text-sm font-medium mb-1">Titel / Betreff *</label>
                  <input
                  data-ev-id="ev_historisch_titel_input"
                  type="text"
                  value={historischForm.titel}
                  onChange={(e) => setHistorischForm({ ...historischForm, titel: e.target.value })}
                  placeholder="z.B. Anschaffung Schlauchpfleger"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-teal-500" />

                </div>

                {/* Beschlussdatum */}
                <div data-ev-id="ev_historisch_datum_field">
                  <label data-ev-id="ev_historisch_datum_label" className="block text-sm font-medium mb-1">Beschlussdatum *</label>
                  <input
                  data-ev-id="ev_historisch_datum_input"
                  type="date"
                  value={historischForm.beschlussDatum}
                  onChange={(e) => setHistorischForm({ ...historischForm, beschlussDatum: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-teal-500" />

                </div>

                {/* Status */}
                <div data-ev-id="ev_historisch_status_field">
                  <label data-ev-id="ev_historisch_status_label" className="block text-sm font-medium mb-1">Ergebnis *</label>
                  <div data-ev-id="ev_historisch_status_btns" className="flex gap-2">
                    <button
                    data-ev-id="ev_historisch_status_genehmigt"
                    type="button"
                    onClick={() => setHistorischForm({ ...historischForm, status: 'genehmigt' })}
                    className={`flex-1 py-2 px-3 rounded-lg border transition-colors ${
                    historischForm.status === 'genehmigt' ?
                    'bg-emerald-100 border-emerald-400 text-emerald-700' :
                    'border-border hover:bg-muted'}`
                    }>
                      <CheckCircle className="w-4 h-4 inline-block mr-1" /> Genehmigt
                    </button>
                    <button
                    data-ev-id="ev_historisch_status_abgelehnt"
                    type="button"
                    onClick={() => setHistorischForm({ ...historischForm, status: 'abgelehnt' })}
                    className={`flex-1 py-2 px-3 rounded-lg border transition-colors ${
                    historischForm.status === 'abgelehnt' ?
                    'bg-red-100 border-red-400 text-red-700' :
                    'border-border hover:bg-muted'}`
                    }>
                      <XCircle className="w-4 h-4 inline-block mr-1" /> Abgelehnt
                    </button>
                  </div>
                </div>

                {/* Abstimmung */}
                <div data-ev-id="ev_historisch_abstimmung_field">
                  <label data-ev-id="ev_historisch_abstimmung_label" className="block text-sm font-medium mb-1">Abstimmungsergebnis (optional)</label>
                  <div data-ev-id="ev_historisch_abstimmung_grid" className="grid grid-cols-3 gap-2">
                    <div data-ev-id="ev_historisch_ja_field">
                      <label data-ev-id="ev_historisch_ja_label" className="text-xs text-muted-foreground">Ja</label>
                      <input
                      data-ev-id="ev_historisch_ja_input"
                      type="number"
                      min="0"
                      value={historischForm.abstimmung_ja}
                      onChange={(e) => setHistorischForm({ ...historischForm, abstimmung_ja: e.target.value })}
                      className="w-full px-2 py-1.5 border border-border rounded-lg text-sm" />

                    </div>
                    <div data-ev-id="ev_historisch_nein_field">
                      <label data-ev-id="ev_historisch_nein_label" className="text-xs text-muted-foreground">Nein</label>
                      <input
                      data-ev-id="ev_historisch_nein_input"
                      type="number"
                      min="0"
                      value={historischForm.abstimmung_nein}
                      onChange={(e) => setHistorischForm({ ...historischForm, abstimmung_nein: e.target.value })}
                      className="w-full px-2 py-1.5 border border-border rounded-lg text-sm" />

                    </div>
                    <div data-ev-id="ev_historisch_enthaltung_field">
                      <label data-ev-id="ev_historisch_enthaltung_label" className="text-xs text-muted-foreground">Enthaltung</label>
                      <input
                      data-ev-id="ev_historisch_enthaltung_input"
                      type="number"
                      min="0"
                      value={historischForm.abstimmung_enthaltung}
                      onChange={(e) => setHistorischForm({ ...historischForm, abstimmung_enthaltung: e.target.value })}
                      className="w-full px-2 py-1.5 border border-border rounded-lg text-sm" />

                    </div>
                  </div>
                </div>

                {/* Betrag */}
                <div data-ev-id="ev_historisch_betrag_field">
                  <label data-ev-id="ev_historisch_betrag_label" className="block text-sm font-medium mb-1">Betrag (optional)</label>
                  <div data-ev-id="ev_historisch_betrag_wrapper" className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                    data-ev-id="ev_historisch_betrag_input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={historischForm.betrag}
                    onChange={(e) => setHistorischForm({ ...historischForm, betrag: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-9 pr-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-teal-500" />

                  </div>
                </div>

                {/* Gültig bis */}
                <div data-ev-id="ev_historisch_gueltig_field">
                  <label data-ev-id="ev_historisch_gueltig_label" className="block text-sm font-medium mb-1">Gültig bis (optional)</label>
                  <input
                  data-ev-id="ev_historisch_gueltig_input"
                  type="date"
                  value={historischForm.gueltig_bis}
                  onChange={(e) => setHistorischForm({ ...historischForm, gueltig_bis: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-teal-500" />

                  <p data-ev-id="ev_historisch_gueltig_hint" className="text-xs text-muted-foreground mt-1">Leer lassen für unbegrenzte Gültigkeit.</p>
                </div>

                {/* Beschreibung */}
                <div data-ev-id="ev_historisch_beschreibung_field">
                  <label data-ev-id="ev_historisch_beschreibung_label" className="block text-sm font-medium mb-1">Beschreibung (optional)</label>
                  <textarea
                  data-ev-id="ev_historisch_beschreibung_input"
                  value={historischForm.beschreibung}
                  onChange={(e) => setHistorischForm({ ...historischForm, beschreibung: e.target.value })}
                  rows={3}
                  placeholder="Weitere Details zum Beschluss..."
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-teal-500" />

                </div>

                {/* Anmerkungen */}
                <div data-ev-id="ev_historisch_anmerkungen_field">
                  <label data-ev-id="ev_historisch_anmerkungen_label" className="block text-sm font-medium mb-1">Anmerkungen zur Erfassung (optional)</label>
                  <input
                  data-ev-id="ev_historisch_anmerkungen_input"
                  type="text"
                  value={historischForm.anmerkungen}
                  onChange={(e) => setHistorischForm({ ...historischForm, anmerkungen: e.target.value })}
                  placeholder="z.B. Nachgetragen aus Protokoll vom..."
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-teal-500" />

                  <p data-ev-id="ev_historisch_anmerkungen_hint" className="text-xs text-muted-foreground mt-1">Wird in der Historie vermerkt.</p>
                </div>
              </div>

              <div data-ev-id="ev_historisch_footer" className="flex justify-end gap-2 p-4 border-t border-border">
                <button
                data-ev-id="ev_historisch_cancel"
                onClick={() => setShowHistorischModal(false)}
                disabled={savingHistorisch}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                  Abbrechen
                </button>
                <button
                data-ev-id="ev_historisch_save"
                onClick={async () => {
                  if (!historischForm.titel.trim() || !historischForm.beschlussDatum) {
                    alert('Bitte Titel und Beschlussdatum angeben.');
                    return;
                  }
                  setSavingHistorisch(true);
                  const { error } = await createHistorischenBeschluss({
                    jahr: historischForm.jahr,
                    typ: historischForm.typ,
                    titel: historischForm.titel.trim(),
                    beschreibung: historischForm.beschreibung.trim() || undefined,
                    betrag: historischForm.betrag ? parseFloat(historischForm.betrag) : undefined,
                    status: historischForm.status,
                    beschlussDatum: historischForm.beschlussDatum,
                    abstimmung_ja: historischForm.abstimmung_ja ? parseInt(historischForm.abstimmung_ja) : undefined,
                    abstimmung_nein: historischForm.abstimmung_nein ? parseInt(historischForm.abstimmung_nein) : undefined,
                    abstimmung_enthaltung: historischForm.abstimmung_enthaltung ? parseInt(historischForm.abstimmung_enthaltung) : undefined,
                    gueltig_bis: historischForm.gueltig_bis || undefined,
                    anmerkungen: historischForm.anmerkungen.trim() || undefined
                  });
                  setSavingHistorisch(false);
                  if (error) {
                    alert('Fehler: ' + error.message);
                  } else {
                    setShowHistorischModal(false);
                    setHistorischForm({
                      jahr: new Date().getFullYear(),
                      typ: 'sitzung',
                      titel: '',
                      beschreibung: '',
                      betrag: '',
                      status: 'genehmigt',
                      beschlussDatum: '',
                      abstimmung_ja: '',
                      abstimmung_nein: '',
                      abstimmung_enthaltung: '',
                      gueltig_bis: '',
                      anmerkungen: ''
                    });
                  }
                }}
                disabled={savingHistorisch || !historischForm.titel.trim() || !historischForm.beschlussDatum}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50">
                  {savingHistorisch ?
                <>
                      <div data-ev-id="ev_fd95a77308" className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Speichern...
                    </> :

                <>
                      <Save className="w-4 h-4" />
                      Beschluss erfassen
                    </>
                }
                </button>
              </div>
            </div>
          </div>
        }

        {/* Protokoll-Modal - Einfache protokollarische Ansicht */}
        {protokollBeschluss && (() => {
          const jaStimmen = protokollBeschluss.abstimmung_ja || 0;
          const neinStimmen = protokollBeschluss.abstimmung_nein || 0;
          const enthaltungen = protokollBeschluss.abstimmung_enthaltung || 0;
          const istGenehmigt = jaStimmen > neinStimmen;

          return (
            <div
              data-ev-id="ev_protokoll_modal_overlay"
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setProtokollBeschluss(null)}>

              <div
                data-ev-id="ev_protokoll_modal"
                className="bg-white rounded-xl shadow-xl w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div data-ev-id="ev_protokoll_header" className="flex items-center justify-between p-4 border-b border-gray-200">
                  <div data-ev-id="ev_protokoll_header_text">
                    <p data-ev-id="ev_protokoll_nummer" className="text-sm text-muted-foreground font-mono">
                      {protokollBeschluss.beschluss_nummer}
                    </p>
                    <p data-ev-id="ev_protokoll_datum" className="text-xs text-muted-foreground">
                      {formatDate(protokollBeschluss.erstellt_am)}
                    </p>
                  </div>
                  <button
                    data-ev-id="ev_protokoll_close"
                    onClick={() => setProtokollBeschluss(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors">

                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div data-ev-id="ev_protokoll_content" className="p-6">
                  <div data-ev-id="ev_protokoll_text" className="text-center mb-6">
                    {istGenehmigt ?
                    <p data-ev-id="ev_protokoll_genehmigt" className="text-lg text-foreground">
                        Das Kommando beschließt, <span data-ev-id="ev_aef6da725e" className="font-semibold">{protokollBeschluss.titel}</span> zuzustimmen.
                      </p> :

                    <p data-ev-id="ev_protokoll_abgelehnt" className="text-lg text-foreground">
                        Das Kommando hat <span data-ev-id="ev_1090ed4002" className="font-semibold">{protokollBeschluss.titel}</span> abgelehnt.
                      </p>
                    }
                  </div>

                  {/* Abstimmungsergebnis */}
                  <div data-ev-id="ev_protokoll_abstimmung" className="bg-gray-50 rounded-lg p-4">
                    <p data-ev-id="ev_protokoll_abstimmung_label" className="text-sm text-muted-foreground mb-3 text-center">Abstimmungsergebnis</p>
                    <div data-ev-id="ev_protokoll_votes" className="flex justify-center gap-6">
                      <div data-ev-id="ev_protokoll_ja" className="text-center">
                        <p data-ev-id="ev_43fbe4524e" className="text-2xl font-bold text-emerald-600">{jaStimmen}</p>
                        <p data-ev-id="ev_c59501609f" className="text-xs text-muted-foreground">Ja</p>
                      </div>
                      <div data-ev-id="ev_protokoll_nein" className="text-center">
                        <p data-ev-id="ev_c776408c8f" className="text-2xl font-bold text-red-600">{neinStimmen}</p>
                        <p data-ev-id="ev_499406820d" className="text-xs text-muted-foreground">Nein</p>
                      </div>
                      <div data-ev-id="ev_protokoll_enthaltung" className="text-center">
                        <p data-ev-id="ev_1e55de9217" className="text-2xl font-bold text-gray-500">{enthaltungen}</p>
                        <p data-ev-id="ev_fc871a194f" className="text-xs text-muted-foreground">Enthaltung</p>
                      </div>
                    </div>
                  </div>

                  {/* Ergebnis Badge */}
                  <div data-ev-id="ev_protokoll_ergebnis" className="mt-4 text-center">
                    {istGenehmigt ?
                    <span data-ev-id="ev_3d96b9123d" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                        <CheckCircle className="w-5 h-5" />
                        Genehmigt
                      </span> :

                    <span data-ev-id="ev_3e9260ed4c" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 text-red-700 font-medium">
                        <XCircle className="w-5 h-5" />
                        Abgelehnt
                      </span>
                    }
                  </div>
                </div>

                {/* Footer */}
                <div data-ev-id="ev_protokoll_footer" className="flex justify-end p-4 border-t border-gray-200">
                  <button
                    data-ev-id="ev_protokoll_schliessen"
                    onClick={() => setProtokollBeschluss(null)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">

                    Schließen
                  </button>
                </div>
              </div>
            </div>);

        })()}
      </div>
    </Layout>);

}