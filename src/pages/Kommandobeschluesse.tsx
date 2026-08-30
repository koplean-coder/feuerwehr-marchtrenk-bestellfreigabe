import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useKommandobeschluesse, type BeschlussStatus } from '@/hooks/useKommandobeschluesse';
import { useCommandDecisions } from '@/hooks/useCommandDecisions';
import { Layout } from '@/components/Layout';
import { BeschlussCard } from '@/components/BeschlussCard';
import { BeschlussVotingModal } from '@/components/BeschlussVotingModal';
import { CommandDecisionVotingModal } from '@/components/CommandDecisionVotingModal';
import {
  Search,
  Vote,
  CheckCircle2,
  XCircle,
  Archive,
  AlertCircle,
  Users,
  FileText,
  ShoppingCart,
  Trash2,
  Layers } from
'lucide-react';
import type { Order } from '@/hooks/useOrders';
import type { CommandDecisionWithCreator } from '@/hooks/useCommandDecisions';

const statusTabs: {id: BeschlussStatus;label: string;icon: React.ReactNode;}[] = [
{ id: 'laufend', label: 'Laufend', icon: <Vote className="w-4 h-4" /> },
{ id: 'genehmigt', label: 'Genehmigt', icon: <CheckCircle2 className="w-4 h-4" /> },
{ id: 'abgelehnt', label: 'Abgelehnt', icon: <XCircle className="w-4 h-4" /> },
{ id: 'archiv', label: 'Archiv', icon: <Archive className="w-4 h-4" /> }];

type MainTabType = 'orders' | 'decisions';

export default function Kommandobeschluesse() {
  const { profile } = useAuth();
  const {
    beschluesse,
    counts,
    loading,
    hasAccess,
    filter,
    setSearch,
    setStatus
  } = useKommandobeschluesse();

  const {
    decisions,
    loading: decisionsLoading,
    refetch: refetchDecisions,
    forceDeleteDecision,
    isAdmin
  } = useCommandDecisions();

  const [mainTab, setMainTab] = useState<MainTabType>('orders');
  const [decisionStatusFilter, setDecisionStatusFilter] = useState<'laufend' | 'genehmigt' | 'abgelehnt' | 'abgeschlossen'>('laufend');
  const [decisionSearch, setDecisionSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<CommandDecisionWithCreator | null>(null);
  const [showVotingModal, setShowVotingModal] = useState(false);
  const [showDecisionVotingModal, setShowDecisionVotingModal] = useState(false);
  const [deletingDecisionId, setDeletingDecisionId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Auto-open decision from URL parameter
  useEffect(() => {
    const decisionId = searchParams.get('decision');
    if (decisionId && decisions.length > 0 && !selectedDecision) {
      const decision = decisions.find((d) => d.id === decisionId);
      if (decision) {
        setMainTab('decisions');
        setSelectedDecision(decision);
        setShowDecisionVotingModal(true);
        // Clear URL parameter after opening
        setSearchParams({});
      }
    }
  }, [searchParams, decisions, selectedDecision, setSearchParams]);

  // Access check
  if (!hasAccess) {
    return (
      <Layout>
        <div data-ev-id="ev_5d6eb59096" className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertCircle className="w-16 h-16 text-muted-foreground" />
          <h1 data-ev-id="ev_16fe6913aa" className="text-2xl font-bold text-foreground">Kein Zugriff</h1>
          <p data-ev-id="ev_0a5891ab5f" className="text-muted-foreground text-center max-w-md">
            Diese Seite ist nur für Kommandomitglieder, Kommandanten und Administratoren zugänglich.
          </p>
          <Link data-ev-id="ev_230a159ed5" to="/" className="text-primary hover:underline">Zurück zur Startseite</Link>
        </div>
      </Layout>);

  }

  // Filter decisions based on status and search
  const filteredDecisions = decisions.filter((d) => {
    // Status filter
    if (decisionStatusFilter === 'laufend') {
      // Only show truly open voting (not closed)
      if (d.voting_status === 'closed' || d.status === 'approved' || d.status === 'rejected') return false;
      if (d.status !== 'submitted' || d.voting_status !== 'open') return false;
    } else if (decisionStatusFilter === 'genehmigt') {
      // Show approved OR closed with approved result
      const isApproved = d.status === 'approved' || d.voting_status === 'closed' && d.voting_result === 'approved';
      if (!isApproved) return false;
    } else if (decisionStatusFilter === 'abgelehnt') {
      // Show rejected OR closed with rejected result
      const isRejected = d.status === 'rejected' || d.voting_status === 'closed' && d.voting_result === 'rejected';
      if (!isRejected) return false;
    } else if (decisionStatusFilter === 'abgeschlossen') {
      // Show closed decisions that are neither approved nor rejected (e.g., deferred)
      if (d.voting_status !== 'closed' || d.voting_result === 'approved' || d.voting_result === 'rejected') return false;
    }

    // Search filter
    if (decisionSearch) {
      const search = decisionSearch.toLowerCase();
      return (
        d.reference_number.toLowerCase().includes(search) ||
        d.title.toLowerCase().includes(search) || (
        d.description?.toLowerCase().includes(search) ?? false) || (
        d.creator?.full_name?.toLowerCase().includes(search) ?? false));

    }
    return true;
  });

  // Count decisions by status
  const decisionCounts = {
    laufend: decisions.filter((d) =>
    d.status === 'submitted' && d.voting_status === 'open'
    ).length,
    genehmigt: decisions.filter((d) =>
    d.status === 'approved' || d.voting_status === 'closed' && d.voting_result === 'approved'
    ).length,
    abgelehnt: decisions.filter((d) =>
    d.status === 'rejected' || d.voting_status === 'closed' && d.voting_result === 'rejected'
    ).length,
    abgeschlossen: decisions.filter((d) =>
    d.voting_status === 'closed' && d.voting_result !== 'approved' && d.voting_result !== 'rejected'
    ).length
  };

  function handleOpenVoting(order: Order) {
    setSelectedOrder(order);
    setShowVotingModal(true);
  }

  function handleCloseVoting() {
    setSelectedOrder(null);
    setShowVotingModal(false);
  }

  function handleOpenDecisionVoting(decision: CommandDecisionWithCreator) {
    setSelectedDecision(decision);
    setShowDecisionVotingModal(true);
  }

  function handleCloseDecisionVoting() {
    setSelectedDecision(null);
    setShowDecisionVotingModal(false);
    refetchDecisions();
  }

  return (
    <Layout>
      <div data-ev-id="ev_03902784a0" className="max-w-6xl mx-auto">
        {/* Header */}
        <div data-ev-id="ev_41040ba42c" className="mb-8">
          <div data-ev-id="ev_02352d0aea" className="flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-primary" />
            <h1 data-ev-id="ev_de0493814a" className="text-3xl font-bold text-foreground">Kommandobeschlüsse</h1>
          </div>
          <p data-ev-id="ev_aabe72c10e" className="text-muted-foreground">
            Übersicht aller Abstimmungen der Kommandomitglieder
          </p>
        </div>

        {/* Main Tabs - Bestellungen / Kommandoabstimmungen */}
        <div data-ev-id="ev_60a68db3ea" className="flex gap-4 mb-6 border-b border-border">
          <button data-ev-id="ev_64bdb7732d"
          onClick={() => setMainTab('orders')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
          mainTab === 'orders' ?
          'text-primary border-primary' :
          'text-muted-foreground border-transparent hover:text-foreground'}`
          }>

            <ShoppingCart className="w-5 h-5" />
            Bestellungen
            <span data-ev-id="ev_81f152fa5c" className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
            mainTab === 'orders' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`
            }>
              {counts.laufend + counts.genehmigt + counts.abgelehnt + counts.archiv}
            </span>
          </button>
          <button data-ev-id="ev_f47493632b"
          onClick={() => setMainTab('decisions')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
          mainTab === 'decisions' ?
          'text-primary border-primary' :
          'text-muted-foreground border-transparent hover:text-foreground'}`
          }>

            <FileText className="w-5 h-5" />
            Kommandoabstimmungen
            <span data-ev-id="ev_8330813809" className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
            mainTab === 'decisions' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`
            }>
              {decisionCounts.laufend + decisionCounts.genehmigt + decisionCounts.abgelehnt + decisionCounts.abgeschlossen}
            </span>
          </button>
        </div>

        {/* Orders Tab Content */}
        {mainTab === 'orders' &&
        <>
            {/* Status Tabs */}
            <div data-ev-id="ev_8935acbd1a" className="flex flex-wrap gap-2 mb-6">
              {statusTabs.map((tab) =>
            <button data-ev-id="ev_aa6eda0d2f"
            key={tab.id}
            onClick={() => setStatus(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter.status === tab.id ?
            'bg-primary text-primary-foreground' :
            'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'}`
            }>

                  {tab.icon}
                  <span data-ev-id="ev_64266aa2a5">{tab.label}</span>
                  <span data-ev-id="ev_02853f76cd" className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
              filter.status === tab.id ?
              'bg-primary-foreground/20 text-primary-foreground' :
              'bg-background text-muted-foreground'}`
              }>
                    {counts[tab.id]}
                  </span>
                </button>
            )}
            </div>

            {/* Search */}
            <div data-ev-id="ev_2d42c4bf27" className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input data-ev-id="ev_b450babcde"
            type="text"
            placeholder="Suche nach Titel, Ersteller, Lieferant..."
            value={filter.search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />

            </div>

            {/* Loading */}
            {loading &&
          <div data-ev-id="ev_55bc28495f" className="flex justify-center py-12">
                <div data-ev-id="ev_67bd9a2f2c" className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
          }

            {/* Empty State */}
            {!loading && beschluesse.length === 0 &&
          <div data-ev-id="ev_bcebed5f9a" className="flex flex-col items-center justify-center py-16 text-center">
                <Vote className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <h2 data-ev-id="ev_f40b740f8a" className="text-xl font-semibold text-foreground mb-2">
                  {filter.search ?
              'Keine Ergebnisse gefunden' :
              `Keine ${filter.status === 'laufend' ? 'laufenden' : filter.status === 'genehmigt' ? 'genehmigten' : filter.status === 'abgelehnt' ? 'abgelehnten' : 'archivierten'} Beschlüsse`}
                </h2>
                <p data-ev-id="ev_786bb961ae" className="text-muted-foreground">
                  {filter.search ?
              'Versuche einen anderen Suchbegriff' :
              filter.status === 'laufend' ?
              'Es gibt derzeit keine offenen Abstimmungen' :
              'Hier werden abgeschlossene Beschlüsse angezeigt'}
                </p>
              </div>
          }

            {/* Results */}
            {!loading && beschluesse.length > 0 &&
          <div data-ev-id="ev_b38716a5ff" className="grid gap-4">
                {beschluesse.map((order) =>
            <BeschlussCard
              key={order.id}
              order={order}
              showVotingStatus={filter.status === 'laufend'}
              onVoteClick={() => handleOpenVoting(order)} />

            )}
              </div>
          }
          </>
        }

        {/* Decisions Tab Content */}
        {mainTab === 'decisions' &&
        <>
            {/* Status Tabs */}
            <div data-ev-id="ev_a942980d14" className="flex flex-wrap gap-2 mb-6">
              <button data-ev-id="ev_c814b4ba13"
            onClick={() => setDecisionStatusFilter('laufend')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            decisionStatusFilter === 'laufend' ?
            'bg-purple-600 text-white' :
            'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'}`
            }>

                <Vote className="w-4 h-4" />
                Laufend
                <span data-ev-id="ev_d09f19031c" className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
              decisionStatusFilter === 'laufend' ? 'bg-white/20' : 'bg-background text-muted-foreground'}`
              }>
                  {decisionCounts.laufend}
                </span>
              </button>
              <button data-ev-id="ev_99896301d0"
            onClick={() => setDecisionStatusFilter('genehmigt')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            decisionStatusFilter === 'genehmigt' ?
            'bg-green-600 text-white' :
            'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'}`
            }>

                <CheckCircle2 className="w-4 h-4" />
                Genehmigt
                <span data-ev-id="ev_fee7d101e4" className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
              decisionStatusFilter === 'genehmigt' ? 'bg-white/20' : 'bg-background text-muted-foreground'}`
              }>
                  {decisionCounts.genehmigt}
                </span>
              </button>
              <button data-ev-id="ev_222c10669b"
            onClick={() => setDecisionStatusFilter('abgelehnt')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            decisionStatusFilter === 'abgelehnt' ?
            'bg-red-600 text-white' :
            'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'}`
            }>

                <XCircle className="w-4 h-4" />
                Abgelehnt
                <span data-ev-id="ev_8656bf45ac" className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
              decisionStatusFilter === 'abgelehnt' ? 'bg-white/20' : 'bg-background text-muted-foreground'}`
              }>
                  {decisionCounts.abgelehnt}
                </span>
              </button>
              <button data-ev-id="ev_425ea994d2"
            onClick={() => setDecisionStatusFilter('abgeschlossen')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            decisionStatusFilter === 'abgeschlossen' ?
            'bg-blue-600 text-white' :
            'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'}`
            }>

                <Archive className="w-4 h-4" />
                Abgeschlossen/Verschoben
                <span data-ev-id="ev_bf9ad52fe0" className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
              decisionStatusFilter === 'abgeschlossen' ? 'bg-white/20' : 'bg-background text-muted-foreground'}`
              }>
                  {decisionCounts.abgeschlossen}
                </span>
              </button>
            </div>

            {/* Search */}
            <div data-ev-id="ev_18d5028765" className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input data-ev-id="ev_34f6624d37"
            type="text"
            placeholder="Suche nach Titel, Referenznummer, Ersteller..."
            value={decisionSearch}
            onChange={(e) => setDecisionSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />

            </div>

            {/* Loading */}
            {decisionsLoading &&
          <div data-ev-id="ev_ef2cf67957" className="flex justify-center py-12">
                <div data-ev-id="ev_8084e70fcd" className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              </div>
          }

            {/* Empty State */}
            {!decisionsLoading && filteredDecisions.length === 0 &&
          <div data-ev-id="ev_07b634d21e" className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <h2 data-ev-id="ev_afd680566f" className="text-xl font-semibold text-foreground mb-2">
                  {decisionSearch ?
              'Keine Ergebnisse gefunden' :
              `Keine ${decisionStatusFilter === 'laufend' ? 'laufenden' : decisionStatusFilter === 'genehmigt' ? 'genehmigten' : decisionStatusFilter === 'abgelehnt' ? 'abgelehnten' : 'abgeschlossenen/verschobenen'} Abstimmungen`}
                </h2>
                <p data-ev-id="ev_b5bdeddbcf" className="text-muted-foreground">
                  {decisionSearch ?
              'Versuche einen anderen Suchbegriff' :
              decisionStatusFilter === 'laufend' ?
              'Es gibt derzeit keine offenen Kommandoabstimmungen' :
              'Hier werden abgeschlossene Abstimmungen angezeigt'}
                </p>
              </div>
          }

            {/* Results */}
            {!decisionsLoading && filteredDecisions.length > 0 &&
          <div data-ev-id="ev_f60a0f067a" className="grid gap-4">
                {filteredDecisions.map((decision) =>
            <div data-ev-id="ev_7a5f59cb98"
            key={decision.id}
            className="bg-card border border-border rounded-xl p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-colors cursor-pointer"
            onClick={() => handleOpenDecisionVoting(decision)}>

                    <div data-ev-id="ev_725cf0d016" className="flex items-start justify-between gap-4">
                      <div data-ev-id="ev_245cc3b1b7" className="flex-1 min-w-0">
                        <div data-ev-id="ev_3598ef7c42" className="flex items-center gap-2 mb-1">
                          <span data-ev-id="ev_ad376b78b1" className="text-sm font-mono text-muted-foreground">{decision.reference_number}</span>
                          {(decision.itemCount ?? 0) > 1 &&
                    <span data-ev-id="ev_0c0ef03d6b" className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs rounded-full font-medium">
                              <Layers className="w-3 h-3" />
                              {decision.itemCount} Punkte
                            </span>
                    }
                          {decision.status === 'approved' || decision.voting_status === 'closed' && decision.voting_result === 'approved' ?
                    <span data-ev-id="ev_672340a6a0" className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Genehmigt</span> :
                    decision.status === 'rejected' || decision.voting_status === 'closed' && decision.voting_result === 'rejected' ?
                    <span data-ev-id="ev_28bbf33744" className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Abgelehnt</span> :
                    decision.voting_status === 'closed' ?
                    <span data-ev-id="ev_cde00f5db6" className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Abgeschlossen</span> :
                    decision.status === 'submitted' && decision.voting_status === 'open' ?
                    <span data-ev-id="ev_8c50e3b7d3" className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">Abstimmung läuft</span> :
                    null
                    }
                        </div>
                        <h3 data-ev-id="ev_94d4a6514c" className="font-semibold text-foreground">{decision.title}</h3>
                        {decision.description &&
                  <p data-ev-id="ev_419f4bac7e" className="text-sm text-muted-foreground mt-1 line-clamp-2">{decision.description}</p>
                  }
                        <div data-ev-id="ev_39064b0429" className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span data-ev-id="ev_2088e5f9ac">Erstellt von: {decision.creator?.full_name ?? 'Unbekannt'}</span>
                          <span data-ev-id="ev_e86663911a">{new Date(decision.created_at).toLocaleDateString('de-DE')}</span>
                        </div>
                      </div>
                      <div data-ev-id="ev_c004e93d90" className="flex items-center gap-2">
                        <button data-ev-id="ev_4070207a17"
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  decision.status === 'approved' || decision.status === 'rejected' || decision.voting_status === 'closed' ?
                  'bg-gray-500 text-white hover:bg-gray-600' :
                  'bg-purple-600 text-white hover:bg-purple-700'}`
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDecisionVoting(decision);
                  }}>

                          {decision.status === 'approved' || decision.status === 'rejected' || decision.voting_status === 'closed' ? 'Details' : 'Abstimmen'}
                        </button>
                        {isAdmin &&
                  <button data-ev-id="ev_2d1b10202a"
                  className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Dauerhaft löschen"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingDecisionId(decision.id);
                    setShowDeleteConfirm(true);
                  }}>
                            <Trash2 className="w-5 h-5" />
                          </button>
                  }
                      </div>
                    </div>
                  </div>
            )}
              </div>
          }
          </>
        }

        {/* Voting Modals */}
        {showVotingModal && selectedOrder &&
        <BeschlussVotingModal order={selectedOrder} onClose={handleCloseVoting} />
        }
        {showDecisionVotingModal && selectedDecision &&
        <CommandDecisionVotingModal decision={selectedDecision} onClose={handleCloseDecisionVoting} />
        }

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && deletingDecisionId &&
        <div data-ev-id="ev_cd6af45342" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div data-ev-id="ev_3b3be4dcbf" className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <div data-ev-id="ev_7288a823e4" className="flex items-center gap-3 mb-4">
                <div data-ev-id="ev_3afef5be74" className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 data-ev-id="ev_b17f88cc7e" className="text-lg font-semibold text-foreground">Umlaufbeschluss löschen</h3>
              </div>
              <p data-ev-id="ev_4435d4183b" className="text-muted-foreground mb-6">
                Möchten Sie diesen Umlaufbeschluss wirklich <strong data-ev-id="ev_bbaa589e14">dauerhaft löschen</strong>? 
                Alle zugehörigen Abstimmungen und Beschlusspunkte werden ebenfalls gelöscht. 
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <div data-ev-id="ev_1ed8d21a7d" className="flex gap-3 justify-end">
                <button data-ev-id="ev_16d980e70e"
              className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeletingDecisionId(null);
              }}>
                  Abbrechen
                </button>
                <button data-ev-id="ev_cf0fe42e0c"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              onClick={async () => {
                if (deletingDecisionId) {
                  await forceDeleteDecision(deletingDecisionId);
                  setShowDeleteConfirm(false);
                  setDeletingDecisionId(null);
                }
              }}>
                  Dauerhaft löschen
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </Layout>);

}