import { useState, useEffect } from 'react';
import { useOrderVotes, type VoteType, type OrderVoteHistory } from '@/hooks/useOrderVotes';
import { useOrders, type InvoiceTo } from '@/hooks/useOrders';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { formatCurrency, formatDate, formatTime } from '@/utils/formatters';
import type { Order } from '@/hooks/useOrders';
import {
  X,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Vote,
  Crown,
  CheckCircle2,
  XCircle,
  History,
  Users,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2 } from
'lucide-react';

interface BeschlussVotingModalProps {
  order: Order;
  onClose: () => void;
}

export function BeschlussVotingModal({ order, onClose }: BeschlussVotingModalProps) {
  const { effectiveProfile, effectiveIsAdmin, effectiveIsKommandant, effectiveHasKommandomitgliedFunction } = useSimulation();
  const profile = effectiveProfile;
  const {
    votes,
    voteHistory,
    voteSummary,
    loading,
    kommandomitglieder,
    kommandomitgliederCount,
    submitVote,
    getPendingVoters,
    refetch
  } = useOrderVotes(order.id);

  const {
    overrideKommandomitgliedVote,
    completeKommandomitgliedVote,
    recordMissingVotes,
    deleteOrder,
    isAdmin
  } = useOrders();

  const [selectedVote, setSelectedVote] = useState<VoteType | null>(voteSummary.userVote);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPendingVoters, setShowPendingVoters] = useState(false);
  const [showOverrideSection, setShowOverrideSection] = useState(false);
  const [overrideDecision, setOverrideDecision] = useState<'approve' | 'reject'>('approve');
  const [overrideReason, setOverrideReason] = useState('');
  const [selectedInvoiceTo, setSelectedInvoiceTo] = useState<InvoiceTo>('feuerwehr');
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Mit Simulation
  const isKommandant = effectiveIsKommandant || effectiveIsAdmin;
  const isKommandomitglied = effectiveHasKommandomitgliedFunction || isKommandant;

  const wasOverridden = !!order.kommandomitglied_override_by;
  const isOpen = order.voting_status === 'open' ||
  order.voting_status !== 'closed' &&
  !order.kommandomitglied_approved_at &&
  !wasOverridden &&
  order.status !== 'genehmigt' &&
  order.status !== 'abgelehnt';


  // Update selected vote when voteSummary changes
  useEffect(() => {
    if (voteSummary.userVote) {
      setSelectedVote(voteSummary.userVote);
    }
  }, [voteSummary.userVote]);

  const pendingVoters = getPendingVoters();

  async function handleSubmitVote() {
    if (!selectedVote) return;

    setSubmitting(true);
    setError('');

    const { error } = await submitVote(selectedVote, reason || undefined);

    if (error) {
      setError(error.message || 'Fehler beim Speichern der Stimme');
    } else {
      setReason('');
      refetch();
    }

    setSubmitting(false);
  }

  async function handleEndVoting() {
    setSubmitting(true);
    setError('');

    // Record missing votes
    const missingUserIds = pendingVoters.map((v) => v.id);
    if (missingUserIds.length > 0) {
      await recordMissingVotes(order.id, missingUserIds);
    }

    // Determine decision
    const decision: 'approve' | 'reject' = voteSummary.approveCount > voteSummary.rejectCount ? 'approve' : 'reject';

    // Generate voting results HTML
    const votesList = votes.map((vote) => {
      const voteDate = new Date(vote.created_at);
      const voteText = vote.vote === 'approve' ? '✓ Zugestimmt' : vote.vote === 'reject' ? '✗ Abgelehnt' : '○ Enthalten';
      return `<li>${vote.voter?.full_name || 'Unbekannt'} - ${voteText} (${formatDate(vote.created_at)}, ${formatTime(vote.created_at)} Uhr)${vote.reason ? ` - Begründung: ${vote.reason}` : ''}</li>`;
    }).join('');

    const missingList = pendingVoters.length > 0 ?
    `<h4>Nicht abgestimmt:</h4><ul>${pendingVoters.map((v) => `<li>${v.full_name}</li>`).join('')}</ul>` :
    '';

    const votingResultsHtml = `
      <p><strong>Abstimmungsstatus:</strong> ${votes.length} von ${kommandomitgliederCount} Stimmen abgegeben</p>
      <p><strong>Zustimmungen:</strong> ${voteSummary.approveCount}</p>
      <p><strong>Ablehnungen:</strong> ${voteSummary.rejectCount}</p>
      <p><strong>Enthaltungen:</strong> ${voteSummary.abstainCount}</p>
      <p><strong>Benötigte Mehrheit:</strong> ${voteSummary.requiredVotes} Stimmen</p>
      <h4>Einzelne Stimmen:</h4>
      <ul>${votesList}</ul>
      ${missingList}
      <p><strong>Ergebnis:</strong> ${decision === 'approve' ? 'Genehmigt' : 'Abgelehnt'} (${voteSummary.approveCount} zu ${voteSummary.rejectCount})</p>
    `;

    const { error } = await completeKommandomitgliedVote(
      order.id,
      decision,
      decision === 'approve' ? selectedInvoiceTo : undefined,
      votingResultsHtml
    );

    if (error) {
      setError(error.message || 'Fehler beim Beenden der Abstimmung');
    } else {
      onClose();
    }

    setSubmitting(false);
  }

  async function handleOverride() {
    if (!overrideReason.trim()) {
      setError('Bitte geben Sie eine Begründung für die Überstimmung an');
      return;
    }

    setSubmitting(true);
    setError('');

    // Record missing votes
    const missingUserIds = pendingVoters.map((v) => v.id);
    if (missingUserIds.length > 0) {
      await recordMissingVotes(order.id, missingUserIds);
    }

    // Generate voting results HTML
    const votesList = votes.map((vote) => {
      const voteText = vote.vote === 'approve' ? '✓ Zugestimmt' : vote.vote === 'reject' ? '✗ Abgelehnt' : '○ Enthalten';
      return `<li>${vote.voter?.full_name || 'Unbekannt'} - ${voteText} (${formatDate(vote.created_at)}, ${formatTime(vote.created_at)} Uhr)${vote.reason ? ` - Begründung: ${vote.reason}` : ''}</li>`;
    }).join('');

    const missingList = pendingVoters.length > 0 ?
    `<h4>Nicht abgestimmt:</h4><ul>${pendingVoters.map((v) => `<li>${v.full_name}</li>`).join('')}</ul>` :
    '';

    const votingResultsHtml = `
      <p><strong>Abstimmungsstatus:</strong> ${votes.length} von ${kommandomitgliederCount} Stimmen abgegeben</p>
      <p><strong>Zustimmungen:</strong> ${voteSummary.approveCount}</p>
      <p><strong>Ablehnungen:</strong> ${voteSummary.rejectCount}</p>
      <p><strong>Enthaltungen:</strong> ${voteSummary.abstainCount}</p>
      <h4>Einzelne Stimmen:</h4>
      <ul>${votesList}</ul>
      ${missingList}
      <p><strong>Kommandant-Direkt entscheidung:</strong> ${overrideDecision === 'approve' ? 'Genehmigt' : 'Abgelehnt'}</p>
      <p><strong>Begründung:</strong> ${overrideReason}</p>
    `;

    const { error } = await overrideKommandomitgliedVote(
      order.id,
      overrideDecision,
      overrideReason,
      overrideDecision === 'approve' ? selectedInvoiceTo : undefined,
      votingResultsHtml
    );

    if (error) {
      setError(error.message || 'Fehler bei der Überstimmung');
    } else {
      onClose();
    }

    setSubmitting(false);
  }

  return (
    <div data-ev-id="ev_4154a790d5" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div data-ev-id="ev_f2f08d0d27" className="bg-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div data-ev-id="ev_d0da42eb44" className="flex items-center justify-between p-6 border-b border-border">
          <div data-ev-id="ev_365553fb4a">
            <h2 data-ev-id="ev_fe175a98b8" className="text-xl font-bold text-foreground">{order.title}</h2>
            <p data-ev-id="ev_da97a2f870" className="text-sm text-muted-foreground mt-1">
              {formatCurrency(order.amount)} · {order.creator?.full_name}
            </p>
          </div>
          <button data-ev-id="ev_c3c693b980"
          onClick={onClose}
          className="p-2 hover:bg-muted rounded-lg transition-colors">

            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div data-ev-id="ev_528644b073" className="flex-1 overflow-y-auto p-6">
          {loading ?
          <div data-ev-id="ev_04b68d82f9" className="flex justify-center py-8">
              <div data-ev-id="ev_1dc8af0b23" className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div> :

          <div data-ev-id="ev_9edd35ae8e" className="flex flex-col gap-6">
              {/* Voting Status */}
              <div data-ev-id="ev_6368ab73a1" className="bg-muted/50 rounded-xl p-4">
                <div data-ev-id="ev_99781f52dd" className="flex items-center justify-between mb-4">
                  <span data-ev-id="ev_ecd2c04f0a" className="font-medium text-foreground">Abstimmungsstatus</span>
                  <span data-ev-id="ev_e400709f1d" className="text-sm text-muted-foreground">
                    {votes.length} von {kommandomitgliederCount} Stimmen
                  </span>
                </div>

                {/* Progress Bars */}
                <div data-ev-id="ev_d723f9921d" className="flex flex-col gap-3">
                  <div data-ev-id="ev_360fe2738f" className="flex items-center gap-3">
                    <ThumbsUp className="w-5 h-5 text-emerald-500" />
                    <div data-ev-id="ev_01c203029a" className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                      <div data-ev-id="ev_03195aa077"
                    className="bg-emerald-500 h-full transition-all"
                    style={{ width: `${kommandomitgliederCount > 0 ? voteSummary.approveCount / kommandomitgliederCount * 100 : 0}%` }} />

                    </div>
                    <span data-ev-id="ev_a9a0933a7a" className="text-sm font-medium w-8 text-right">{voteSummary.approveCount}</span>
                  </div>
                  <div data-ev-id="ev_603f2910c0" className="flex items-center gap-3">
                    <ThumbsDown className="w-5 h-5 text-red-500" />
                    <div data-ev-id="ev_d4c44624b7" className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                      <div data-ev-id="ev_2df2ddba1a"
                    className="bg-red-500 h-full transition-all"
                    style={{ width: `${kommandomitgliederCount > 0 ? voteSummary.rejectCount / kommandomitgliederCount * 100 : 0}%` }} />

                    </div>
                    <span data-ev-id="ev_710b412d3b" className="text-sm font-medium w-8 text-right">{voteSummary.rejectCount}</span>
                  </div>
                  <div data-ev-id="ev_ac793c7188" className="flex items-center gap-3">
                    <Minus className="w-5 h-5 text-muted-foreground" />
                    <div data-ev-id="ev_1cfea11242" className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                      <div data-ev-id="ev_60791548e8"
                    className="bg-muted-foreground/50 h-full transition-all"
                    style={{ width: `${kommandomitgliederCount > 0 ? voteSummary.abstainCount / kommandomitgliederCount * 100 : 0}%` }} />

                    </div>
                    <span data-ev-id="ev_2fd8f0ab11" className="text-sm font-medium w-8 text-right">{voteSummary.abstainCount}</span>
                  </div>
                </div>

                <p data-ev-id="ev_c476ad82e5" className="text-xs text-muted-foreground mt-3">
                  Benötigte Mehrheit: {voteSummary.requiredVotes} gültige Stimmen (Enthaltungen zählen nicht)
                </p>
              </div>

              {/* Voting Buttons (for Kommandomitglieder) */}
              {isOpen && isKommandomitglied &&
            <div data-ev-id="ev_8ee8bcb8f4" className="border border-border rounded-xl p-4">
                  <h3 data-ev-id="ev_f461dbff6f" className="font-medium text-foreground mb-3">
                    {voteSummary.hasVoted ? 'Ihre Stimme ändern' : 'Ihre Stimme abgeben'}
                  </h3>
                  
                  <div data-ev-id="ev_676fdc5470" className="grid grid-cols-3 gap-3 mb-4">
                    <button data-ev-id="ev_28de4e774c"
                onClick={() => setSelectedVote('approve')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                selectedVote === 'approve' ?
                'border-emerald-500 bg-emerald-500/10' :
                'border-border hover:border-emerald-500/50 hover:bg-emerald-500/5'}`
                }>

                      <ThumbsUp className={`w-6 h-6 ${selectedVote === 'approve' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                      <span data-ev-id="ev_5e0b0bc9c7" className={`text-sm font-medium ${selectedVote === 'approve' ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        Zustimmen
                      </span>
                    </button>
                    <button data-ev-id="ev_59da907ae8"
                onClick={() => setSelectedVote('reject')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                selectedVote === 'reject' ?
                'border-red-500 bg-red-500/10' :
                'border-border hover:border-red-500/50 hover:bg-red-500/5'}`
                }>

                      <ThumbsDown className={`w-6 h-6 ${selectedVote === 'reject' ? 'text-red-500' : 'text-muted-foreground'}`} />
                      <span data-ev-id="ev_6e850020a4" className={`text-sm font-medium ${selectedVote === 'reject' ? 'text-red-600' : 'text-muted-foreground'}`}>
                        Ablehnen
                      </span>
                    </button>
                    <button data-ev-id="ev_1dbac32e5a"
                onClick={() => setSelectedVote('abstain')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                selectedVote === 'abstain' ?
                'border-muted-foreground bg-muted' :
                'border-border hover:border-muted-foreground/50 hover:bg-muted/50'}`
                }>

                      <Minus className={`w-6 h-6 ${selectedVote === 'abstain' ? 'text-foreground' : 'text-muted-foreground'}`} />
                      <span data-ev-id="ev_52c98951d0" className={`text-sm font-medium ${selectedVote === 'abstain' ? 'text-foreground' : 'text-muted-foreground'}`}>
                        Enthalten
                      </span>
                    </button>
                  </div>

                  <textarea data-ev-id="ev_08a19050a6"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optionale Begründung..."
              className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              rows={2} />


                  <button data-ev-id="ev_f58088266f"
              onClick={handleSubmitVote}
              disabled={!selectedVote || submitting}
              className="w-full mt-3 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">

                    {submitting ? 'Wird gespeichert...' : voteSummary.hasVoted ? 'Stimme aktualisieren' : 'Stimme abgeben'}
                  </button>
                </div>
            }

              {/* Pending Voters */}
              {pendingVoters.length > 0 &&
            <button data-ev-id="ev_a637c512aa"
            onClick={() => setShowPendingVoters(!showPendingVoters)}
            className="flex items-center justify-between w-full p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left">

                  <div data-ev-id="ev_fa5cc1076b" className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-500" />
                    <span data-ev-id="ev_8b60b6a4d1" className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      {pendingVoters.length} Kommandomitglied{pendingVoters.length !== 1 ? 'er' : ''} noch ausstehend
                    </span>
                  </div>
                  {showPendingVoters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            }
              {showPendingVoters && pendingVoters.length > 0 &&
            <div data-ev-id="ev_32a6bf6226" className="bg-muted/50 rounded-xl p-4 -mt-4">
                  <ul data-ev-id="ev_31408e61c1" className="flex flex-col gap-2">
                    {pendingVoters.map((voter) =>
                <li data-ev-id="ev_1cc65571ab" key={voter.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        {voter.full_name}
                      </li>
                )}
                  </ul>
                </div>
            }

              {/* Vote History */}
              {voteHistory.length > 0 &&
            <>
                  <button data-ev-id="ev_e9b77122f3"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center justify-between w-full p-4 bg-muted/50 border border-border rounded-xl text-left">

                    <div data-ev-id="ev_624b7bcd8a" className="flex items-center gap-2">
                      <History className="w-5 h-5 text-muted-foreground" />
                      <span data-ev-id="ev_92ee3c8dfc" className="text-sm font-medium text-foreground">
                        {voteHistory.length} Stimmänderung{voteHistory.length !== 1 ? 'en' : ''}
                      </span>
                    </div>
                    {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showHistory &&
              <div data-ev-id="ev_720b51518c" className="bg-muted/50 rounded-xl p-4 -mt-4 max-h-48 overflow-y-auto">
                      <ul data-ev-id="ev_d3b1a15f73" className="flex flex-col gap-3">
                        {voteHistory.map((entry) =>
                  <li data-ev-id="ev_8051855e61" key={entry.id} className="text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                            <div data-ev-id="ev_8e6431f6f6" className="flex items-center justify-between">
                              <span data-ev-id="ev_cee59fa1ee" className="font-medium">{entry.user?.full_name || 'Unbekannt'}</span>
                              <span data-ev-id="ev_e5612993d5" className="text-xs text-muted-foreground">
                                {formatDate(entry.changed_at)} {formatTime(entry.changed_at)}
                              </span>
                            </div>
                            <p data-ev-id="ev_38f4d5d610" className="text-muted-foreground mt-1">
                              {entry.old_vote ?
                      <>
                                  <span data-ev-id="ev_abb85b41ef" className={entry.old_vote === 'approve' ? 'text-emerald-500' : entry.old_vote === 'reject' ? 'text-red-500' : ''}>
                                    {entry.old_vote === 'approve' ? 'Zustimmung' : entry.old_vote === 'reject' ? 'Ablehnung' : 'Enthaltung'}
                                  </span>
                                  {' → '}
                                </> :
                      'Neu: '}
                              <span data-ev-id="ev_5eeff910cf" className={entry.new_vote === 'approve' ? 'text-emerald-500' : entry.new_vote === 'reject' ? 'text-red-500' : ''}>
                                {entry.new_vote === 'approve' ? 'Zustimmung' : entry.new_vote === 'reject' ? 'Ablehnung' : 'Enthaltung'}
                              </span>
                            </p>
                          </li>
                  )}
                      </ul>
                    </div>
              }
                </>
            }

              {/* Kommandant Actions */}
              {isOpen && isKommandant &&
            <div data-ev-id="ev_021c88cbd6" className="border-t border-border pt-6">
                  <div data-ev-id="ev_19dd9a1db0" className="flex items-center gap-2 mb-4">
                    <Crown className="w-5 h-5 text-amber-500" />
                    <h3 data-ev-id="ev_1bc2d45ee2" className="font-medium text-foreground">Kommandant-Aktionen</h3>
                  </div>

                  {/* End Voting Button */}
                  <div data-ev-id="ev_b1afc484c7" className="flex flex-col gap-3">
                    <div data-ev-id="ev_1528a94fa4" className="bg-muted/50 rounded-xl p-4">
                      <p data-ev-id="ev_b70978832d" className="text-sm text-muted-foreground mb-3">
                        Abstimmung beenden und Ergebnis auswerten:
                        {voteSummary.approveCount > voteSummary.rejectCount ?
                    ` Genehmigung (${voteSummary.approveCount} zu ${voteSummary.rejectCount})` :
                    voteSummary.rejectCount > voteSummary.approveCount ?
                    ` Ablehnung (${voteSummary.rejectCount} zu ${voteSummary.approveCount})` :
                    ' Gleichstand (wird abgelehnt)'
                    }
                      </p>
                      
                      {voteSummary.approveCount > voteSummary.rejectCount &&
                  <div data-ev-id="ev_93cee4852d" className="mb-3">
                          <label data-ev-id="ev_5076fc431d" className="block text-sm font-medium text-foreground mb-2">
                            Rechnung an:
                          </label>
                          <div data-ev-id="ev_aaa8c0560c" className="flex gap-3">
                            <button data-ev-id="ev_5aa0437d29"
                      onClick={() => setSelectedInvoiceTo('feuerwehr')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                      selectedInvoiceTo === 'feuerwehr' ?
                      'border-primary bg-primary/10 text-primary' :
                      'border-border hover:border-primary/50'}`
                      }>

                              Feuerwehr
                            </button>
                            <button data-ev-id="ev_d365ee2104"
                      onClick={() => setSelectedInvoiceTo('gemeinde')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                      selectedInvoiceTo === 'gemeinde' ?
                      'border-primary bg-primary/10 text-primary' :
                      'border-border hover:border-primary/50'}`
                      }>

                              Gemeinde
                            </button>
                          </div>
                        </div>
                  }

                      <button data-ev-id="ev_685b01962d"
                  onClick={handleEndVoting}
                  disabled={submitting || votes.length === 0}
                  className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">

                        {submitting ? 'Wird beendet...' : 'Abstimmung beenden'}
                      </button>
                    </div>

                    {/* Override Section */}
                    <button data-ev-id="ev_1ec871f98f"
                onClick={() => setShowOverrideSection(!showOverrideSection)}
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">

                      <Crown className="w-4 h-4" />
                      Direkt entscheiden (Überstimmen)
                      {showOverrideSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showOverrideSection &&
                <div data-ev-id="ev_f4fe78488f" className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                        <p data-ev-id="ev_295220aee2" className="text-sm text-amber-700 dark:text-amber-400 mb-3">
                          Als Kommandant können Sie die Abstimmung überstimmen und selbst entscheiden.
                        </p>

                        <div data-ev-id="ev_226ebfc5c9" className="flex gap-3 mb-3">
                          <button data-ev-id="ev_380f2424e1"
                    onClick={() => setOverrideDecision('approve')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                    overrideDecision === 'approve' ?
                    'border-emerald-500 bg-emerald-500/10 text-emerald-600' :
                    'border-border hover:border-emerald-500/50'}`
                    }>

                            <CheckCircle2 className="w-4 h-4" />
                            Genehmigen
                          </button>
                          <button data-ev-id="ev_973e31dd4e"
                    onClick={() => setOverrideDecision('reject')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                    overrideDecision === 'reject' ?
                    'border-red-500 bg-red-500/10 text-red-600' :
                    'border-border hover:border-red-500/50'}`
                    }>

                            <XCircle className="w-4 h-4" />
                            Ablehnen
                          </button>
                        </div>

                        {overrideDecision === 'approve' &&
                  <div data-ev-id="ev_ba239da50c" className="mb-3">
                            <label data-ev-id="ev_3dccf66e38" className="block text-sm font-medium text-foreground mb-2">
                              Rechnung an:
                            </label>
                            <div data-ev-id="ev_456d2880ed" className="flex gap-3">
                              <button data-ev-id="ev_80510c4079"
                      onClick={() => setSelectedInvoiceTo('feuerwehr')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                      selectedInvoiceTo === 'feuerwehr' ?
                      'border-primary bg-primary/10 text-primary' :
                      'border-border hover:border-primary/50'}`
                      }>

                                Feuerwehr
                              </button>
                              <button data-ev-id="ev_9b9514579a"
                      onClick={() => setSelectedInvoiceTo('gemeinde')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                      selectedInvoiceTo === 'gemeinde' ?
                      'border-primary bg-primary/10 text-primary' :
                      'border-border hover:border-primary/50'}`
                      }>

                                Gemeinde
                              </button>
                            </div>
                          </div>
                  }

                        <textarea data-ev-id="ev_1a645d4db7"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Begründung für die Überstimmung (erforderlich)..."
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 mb-3"
                  rows={2} />


                        <button data-ev-id="ev_e850018a14"
                  onClick={handleOverride}
                  disabled={submitting || !overrideReason.trim()}
                  className="w-full px-4 py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">

                          {submitting ? 'Wird ausgeführt...' : `Abstimmung überstimmen & ${overrideDecision === 'approve' ? 'Genehmigen' : 'Ablehnen'}`}
                        </button>
                      </div>
                }
                  </div>
                </div>
            }

              {/* Error Display */}
              {error &&
            <div data-ev-id="ev_d925e67b2d" className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p data-ev-id="ev_85b24c7e80" className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            }
            </div>
          }
        </div>

        {/* Footer */}
        <div data-ev-id="ev_b8e20929cf" className="flex justify-between gap-3 p-6 border-t border-border">
          {isAdmin ?
          <button data-ev-id="ev_c34e884915"
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
          title="Dauerhaft löschen">
              <Trash2 className="w-4 h-4" />
              Löschen
            </button> :
          <div data-ev-id="ev_298ee02c27" />}
          <button data-ev-id="ev_236462be1d"
          onClick={onClose}
          className="px-4 py-2 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors">

            Schließen
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm &&
      <div data-ev-id="ev_401803d14f" className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div data-ev-id="ev_b77cf41f7a" className="bg-card rounded-xl shadow-xl max-w-md w-full p-6">
            <div data-ev-id="ev_6c82aac2d0" className="flex items-center gap-3 mb-4">
              <div data-ev-id="ev_0164af40c4" className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 data-ev-id="ev_a9b675b253" className="text-lg font-semibold text-foreground">Bestellung löschen</h3>
            </div>
            <p data-ev-id="ev_4a7f00fb67" className="text-muted-foreground mb-2">
              Möchten Sie diese Bestellung wirklich <strong data-ev-id="ev_a754968a15">dauerhaft löschen</strong>?
            </p>
            <div data-ev-id="ev_7cd2b01b51" className="bg-muted/50 rounded-lg p-3 mb-4">
              <p data-ev-id="ev_a43faf8fd0" className="font-medium">{order.title}</p>
              <p data-ev-id="ev_7f863d6f87" className="text-sm text-muted-foreground">
                {formatCurrency(order.total_amount)}
              </p>
            </div>
            <p data-ev-id="ev_399bd6b9b0" className="text-sm text-red-600 mb-6">
              Diese Aktion kann nicht rückgängig gemacht werden. Alle Abstimmungen und Anhänge werden ebenfalls gelöscht.
            </p>
            <div data-ev-id="ev_6479da1f0b" className="flex gap-3 justify-end">
              <button data-ev-id="ev_30fd01664e"
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
            onClick={() => setShowDeleteConfirm(false)}
            disabled={deleting}>
                Abbrechen
              </button>
              <button data-ev-id="ev_f2f92fe374"
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            onClick={async () => {
              setDeleting(true);
              const { error } = await deleteOrder(order.id);
              setDeleting(false);
              if (!error) {
                setShowDeleteConfirm(false);
                onClose();
              }
            }}
            disabled={deleting}>
                {deleting ?
              <>
                    <div data-ev-id="ev_86c02887a1" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Löschen...
                  </> :

              <>
                    <Trash2 className="w-4 h-4" />
                    Dauerhaft löschen
                  </>
              }
              </button>
            </div>
          </div>
        </div>
      }
    </div>);

}