import { useState, useEffect } from 'react';
import { X, Check, XCircle, MinusCircle, Users, Clock, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useCommandDecisionVotes, type VoteType } from '@/hooks/useCommandDecisionVotes';
import { useCommandDecisionItems, type ItemWithVotes } from '@/hooks/useCommandDecisionItems';
import { useCommandDecisions, type CommandDecisionWithCreator } from '@/hooks/useCommandDecisions';
import { useAuth } from '@/contexts/AuthContext';

interface CommandDecisionVotingModalProps {
  decision: CommandDecisionWithCreator;
  onClose: () => void;
}

export function CommandDecisionVotingModal({ decision, onClose }: CommandDecisionVotingModalProps) {
  const { profile } = useAuth();

  // Legacy votes hook (for decisions without items)
  const {
    votes: legacyVotes,
    voteSummary: legacyVoteSummary,
    loading: legacyLoading,
    kommandomitglieder,
    kommandomitgliederCount,
    submitVote: submitLegacyVote,
    getPendingVoters: getLegacyPendingVoters,
    isKommandomitglied,
    isKommandant,
    refetch: refetchLegacy
  } = useCommandDecisionVotes(decision.id);

  // Items hook
  const {
    items,
    loading: itemsLoading,
    canVote,
    canEndVoting,
    submitItemVote,
    completeItemVoting,
    overrideItemVoting,
    getPendingVoters: getItemPendingVoters,
    recordMissingVotes: recordItemMissingVotes,
    refetch: refetchItems
  } = useCommandDecisionItems(decision.id);

  const { completeVoting, overrideVoting, recordMissingVotes, forceDeleteDecision, isAdmin } = useCommandDecisions();

  // State
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [selectedVotes, setSelectedVotes] = useState<Record<string, VoteType | null>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showOverride, setShowOverride] = useState<string | null>(null);
  const [overrideDecision, setOverrideDecision] = useState<'approved' | 'rejected'>('approved');
  const [overrideReason, setOverrideReason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loading = legacyLoading || itemsLoading;
  const hasItems = items.length > 0;

  // Initialize selected votes from existing votes
  useEffect(() => {
    if (hasItems) {
      const votes: Record<string, VoteType | null> = {};
      items.forEach((item) => {
        votes[item.id] = item.voteSummary.userVote;
      });
      setSelectedVotes(votes);
    } else if (legacyVoteSummary.userVote) {
      setSelectedVotes({ legacy: legacyVoteSummary.userVote });
    }
  }, [items, legacyVoteSummary.userVote, hasItems]);

  // Expand first item by default
  useEffect(() => {
    if (hasItems && !expandedItem) {
      const votingItem = items.find((i) => i.status === 'voting');
      setExpandedItem(votingItem?.id || items[0]?.id || null);
    }
  }, [items, hasItems, expandedItem]);

  const wasOverridden = !!decision.voting_override_by;
  const isOpen = decision.voting_status === 'open' &&
  !decision.voting_closed_at &&
  !wasOverridden &&
  decision.status === 'submitted';

  // Submit vote for an item
  async function handleSubmitItemVote(itemId: string) {
    const vote = selectedVotes[itemId];
    if (!vote) return;

    setSubmitting(true);
    setError('');

    const success = await submitItemVote(itemId, vote, reasons[itemId] || undefined);

    if (!success) {
      setError('Fehler beim Speichern der Stimme');
    } else {
      setReasons((prev) => ({ ...prev, [itemId]: '' }));
      refetchItems();
    }

    setSubmitting(false);
  }

  // Submit legacy vote (for decisions without items)
  async function handleSubmitLegacyVote() {
    const vote = selectedVotes.legacy;
    if (!vote) return;

    setSubmitting(true);
    setError('');

    const { error } = await submitLegacyVote(vote, reasons.legacy || undefined);

    if (error) {
      setError(error.message || 'Fehler beim Speichern der Stimme');
    } else {
      setReasons((prev) => ({ ...prev, legacy: '' }));
      refetchLegacy();
    }

    setSubmitting(false);
  }

  // End voting for an item
  async function handleEndItemVoting(itemId: string) {
    setSubmitting(true);
    setError('');

    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    // Record missing votes
    const pendingVoters = getItemPendingVoters(itemId);
    if (pendingVoters.length > 0) {
      await recordItemMissingVotes(itemId, pendingVoters.map((v) => v.id));
    }

    // Determine result
    const result: 'approved' | 'rejected' =
    item.voteSummary.approveCount > item.voteSummary.rejectCount ? 'approved' : 'rejected';

    const success = await completeItemVoting(itemId, result);

    if (!success) {
      setError('Fehler beim Beenden der Abstimmung');
    } else {
      refetchItems();
    }

    setSubmitting(false);
  }

  // Override voting for an item
  async function handleOverrideItemVoting(itemId: string) {
    if (!overrideReason.trim()) {
      setError('Bitte geben Sie eine Begründung für die Überstimmung an');
      return;
    }

    setSubmitting(true);
    setError('');

    // Record missing votes
    const pendingVoters = getItemPendingVoters(itemId);
    if (pendingVoters.length > 0) {
      await recordItemMissingVotes(itemId, pendingVoters.map((v) => v.id));
    }

    const success = await overrideItemVoting(itemId, overrideDecision, overrideReason);

    if (!success) {
      setError('Fehler beim Überstimmen');
    } else {
      setShowOverride(null);
      setOverrideReason('');
      refetchItems();
    }

    setSubmitting(false);
  }

  // Legacy: End whole decision voting
  async function handleEndLegacyVoting() {
    setSubmitting(true);
    setError('');

    const pendingVoters = getLegacyPendingVoters();
    if (pendingVoters.length > 0) {
      await recordMissingVotes(decision.id, pendingVoters.map((v) => v.id));
    }

    const result: 'approved' | 'rejected' =
    legacyVoteSummary.approveCount > legacyVoteSummary.rejectCount ? 'approved' : 'rejected';

    const success = await completeVoting(decision.id, result);

    if (!success) {
      setError('Fehler beim Beenden der Abstimmung');
    } else {
      onClose();
    }

    setSubmitting(false);
  }

  // Legacy: Override whole decision
  async function handleOverrideLegacyVoting() {
    if (!overrideReason.trim()) {
      setError('Bitte geben Sie eine Begründung an');
      return;
    }

    setSubmitting(true);
    setError('');

    const pendingVoters = getLegacyPendingVoters();
    if (pendingVoters.length > 0) {
      await recordMissingVotes(decision.id, pendingVoters.map((v) => v.id));
    }

    const success = await overrideVoting(decision.id, overrideDecision, overrideReason);

    if (!success) {
      setError('Fehler beim Überstimmen');
    } else {
      onClose();
    }

    setSubmitting(false);
  }

  const voteOptions: {value: VoteType;label: string;icon: typeof Check;color: string;}[] = [
  { value: 'approve', label: 'Dafür', icon: Check, color: 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:border-green-700' },
  { value: 'reject', label: 'Dagegen', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:border-red-700' },
  { value: 'abstain', label: 'Enthaltung', icon: MinusCircle, color: 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-gray-700/50 dark:border-gray-600' }];


  const getItemStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      voting: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
    };
    const labels: Record<string, string> = {
      pending: 'Ausstehend',
      voting: 'Abstimmung läuft',
      approved: 'Genehmigt',
      rejected: 'Abgelehnt'
    };
    return (
      <span data-ev-id="ev_400535b684" className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>);

  };

  return (
    <div data-ev-id="ev_af9e472cce" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div data-ev-id="ev_8b73d6a7f9" className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div data-ev-id="ev_ed15f67454" className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div data-ev-id="ev_a77687c659">
            <h2 data-ev-id="ev_82cc71a575" className="text-xl font-semibold text-slate-800 dark:text-slate-100">
              Kommandoabstimmung
            </h2>
            <p data-ev-id="ev_df9d4e3e1e" className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {decision.reference_number} — {decision.title}
            </p>
          </div>
          <button data-ev-id="ev_ff349c0c10" onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div data-ev-id="ev_80abe41426" className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {loading ?
          <div data-ev-id="ev_cc2736d0bd" className="flex items-center justify-center py-12">
              <div data-ev-id="ev_98aa6068ee" className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
            </div> :
          hasItems ? (
          /* Items-based voting */
          <div data-ev-id="ev_521223f47e" className="flex flex-col gap-4">
              <p data-ev-id="ev_8cb6fe0ecf" className="text-sm text-slate-600 dark:text-slate-400">
                Dieser Antrag enthält <strong data-ev-id="ev_27f643e43d">{items.length} Beschlusspunkt(e)</strong>, die einzeln abgestimmt werden.
              </p>

              {items.map((item, index) => {
              const isExpanded = expandedItem === item.id;
              const itemIsVoting = item.status === 'voting' || item.status === 'pending' && isOpen;
              const pendingVoters = getItemPendingVoters(item.id);

              return (
                <div data-ev-id="ev_7e7d353f7d"
                key={item.id}
                className={`border rounded-xl overflow-hidden transition-all ${
                isExpanded ? 'border-violet-300 dark:border-violet-600' : 'border-slate-200 dark:border-slate-700'}`
                }>

                    {/* Item Header */}
                    <button data-ev-id="ev_2d213c372a"
                  onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700">

                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <div data-ev-id="ev_37793dde95" className="flex-1 text-left">
                        <div data-ev-id="ev_89a81b5037" className="flex items-center gap-2">
                          <span data-ev-id="ev_4ab993cd85" className="font-medium text-slate-800 dark:text-slate-100">
                            Beschlusspunkt {item.item_number}
                          </span>
                          {getItemStatusBadge(item.status)}
                        </div>
                        <p data-ev-id="ev_35f6081338" className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {item.description}
                        </p>
                      </div>
                      <div data-ev-id="ev_7aba0fa986" className="flex items-center gap-2 text-xs">
                        <span data-ev-id="ev_505f728fe5" className="text-green-600">{item.voteSummary.approveCount} ✓</span>
                        <span data-ev-id="ev_1f612af740" className="text-red-600">{item.voteSummary.rejectCount} ✗</span>
                        <span data-ev-id="ev_8b9a0744e4" className="text-gray-500">{item.voteSummary.abstainCount} ○</span>
                      </div>
                    </button>

                    {/* Item Content */}
                    {isExpanded &&
                  <div data-ev-id="ev_2e18769b3a" className="p-4 flex flex-col gap-4">
                        {/* Decision Text */}
                        <div data-ev-id="ev_8dc8808e30" className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-4 rounded-r-lg">
                          <p data-ev-id="ev_0b15670ffc" className="text-xs text-violet-600 dark:text-violet-400 font-medium mb-1">
                            Das Kommando möge beschließen:
                          </p>
                          <p data-ev-id="ev_08567fb854" className="text-slate-700 dark:text-slate-200 italic">
                            "{item.description}"
                          </p>
                          <p data-ev-id="ev_3b815dcb7c" className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            zu beschließen.
                          </p>
                        </div>

                        {/* Vote Summary */}
                        <div data-ev-id="ev_3a9c3aa071" className="grid grid-cols-3 gap-3">
                          <div data-ev-id="ev_e33800c274" className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 text-center">
                            <div data-ev-id="ev_a3518e2e3a" className="text-xl font-bold text-green-600">{item.voteSummary.approveCount}</div>
                            <div data-ev-id="ev_a900658712" className="text-xs text-green-700 dark:text-green-300">Dafür</div>
                          </div>
                          <div data-ev-id="ev_15f1bbe655" className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3 text-center">
                            <div data-ev-id="ev_30a3e2503e" className="text-xl font-bold text-red-600">{item.voteSummary.rejectCount}</div>
                            <div data-ev-id="ev_25e12cad0a" className="text-xs text-red-700 dark:text-red-300">Dagegen</div>
                          </div>
                          <div data-ev-id="ev_c4d168028e" className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                            <div data-ev-id="ev_a3a21f6f01" className="text-xl font-bold text-gray-600">{item.voteSummary.abstainCount}</div>
                            <div data-ev-id="ev_e92f7a00dd" className="text-xs text-gray-700 dark:text-gray-300">Enthaltung</div>
                          </div>
                        </div>

                        {/* Individual Votes - Wer hat wie abgestimmt */}
                        {item.votes.length > 0 &&
                    <div data-ev-id="ev_8dcc14d407" className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                            <div data-ev-id="ev_c2143ece4e" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-sm mb-2">
                              <Users size={14} />
                              <span data-ev-id="ev_3ec9cb6429" className="font-medium">Abgegebene Stimmen ({item.votes.length})</span>
                            </div>
                            <div data-ev-id="ev_419297819e" className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                              {item.votes.
                        sort((a, b) => a.voter?.full_name?.localeCompare(b.voter?.full_name || '') || 0).
                        map((vote) =>
                        <div data-ev-id="ev_fab9699707" key={vote.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-200 dark:border-slate-700 last:border-0">
                                    <span data-ev-id="ev_e499a80bbb" className="text-slate-700 dark:text-slate-300 font-medium">
                                      {vote.voter?.full_name || 'Unbekannt'}
                                    </span>
                                    <div data-ev-id="ev_37f523197a" className="flex items-center gap-2">
                                      <span data-ev-id="ev_9a2bdb6019" className={`px-2 py-0.5 rounded-full text-xs font-medium ${vote.vote === 'approve' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : vote.vote === 'reject' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                                        {vote.vote === 'approve' ? '✓ Dafür' : vote.vote === 'reject' ? '✗ Dagegen' : '○ Enthaltung'}
                                      </span>
                                      {vote.reason &&
                            <span data-ev-id="ev_dbc62a7e5f" className="text-slate-500 dark:text-slate-400 italic max-w-[120px] truncate" title={vote.reason}>
                                          „{vote.reason}"
                                        </span>
                            }
                                    </div>
                                  </div>
                        )}
                            </div>
                          </div>
                    }

                        {/* Pending Voters */}
                        {pendingVoters.length > 0 && itemIsVoting &&
                    <div data-ev-id="ev_fbba24233c" className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                            <div data-ev-id="ev_c2143ece4e" className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm mb-1">
                              <Clock size={14} />
                              <span data-ev-id="ev_3ec9cb6429" className="font-medium">Ausstehend ({pendingVoters.length})</span>
                            </div>
                            <p data-ev-id="ev_9a209d92fe" className="text-xs text-amber-600 dark:text-amber-400">
                              {pendingVoters.map((v) => v.full_name).join(', ')}
                            </p>
                          </div>
                    }

                        {/* Voting Interface */}
                        {itemIsVoting && canVote &&
                    <div data-ev-id="ev_b521d734b5" className="border-t pt-4">
                            <h5 data-ev-id="ev_ee22abfa8f" className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-3">
                              {item.voteSummary.hasVoted ? 'Ihre Stimme ändern' : 'Ihre Stimme abgeben'}
                            </h5>
                            <div data-ev-id="ev_3a3602df19" className="flex gap-2">
                              {voteOptions.map((option) =>
                        <button data-ev-id="ev_1edbd25bb8"
                        key={option.value}
                        onClick={() => setSelectedVotes((prev) => ({ ...prev, [item.id]: option.value }))}
                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        selectedVotes[item.id] === option.value ?
                        option.color + ' border-current' :
                        'border-slate-200 dark:border-slate-600 hover:border-slate-300'}`
                        }>

                                  <option.icon size={16} />
                                  <span data-ev-id="ev_47d7d68243" className="text-sm font-medium">{option.label}</span>
                                </button>
                        )}
                            </div>
                            <textarea data-ev-id="ev_3758de75b2"
                      value={reasons[item.id] || ''}
                      onChange={(e) => setReasons((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      rows={2}
                      className="mt-3 w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                      placeholder="Begründung (optional)" />

                            <button data-ev-id="ev_90f9ecc479"
                      onClick={() => handleSubmitItemVote(item.id)}
                      disabled={!selectedVotes[item.id] || submitting}
                      className="mt-3 w-full py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded-lg font-medium text-sm">

                              {submitting ? 'Wird gespeichert...' : 'Stimme abgeben'}
                            </button>
                          </div>
                    }

                        {/* Kommandant Actions */}
                        {itemIsVoting && canEndVoting &&
                    <div data-ev-id="ev_56261856d7" className="border-t pt-4">
                            <h5 data-ev-id="ev_a2c8ee6390" className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-3">
                              Kommandant-Aktionen
                            </h5>
                            {showOverride !== item.id ?
                      <div data-ev-id="ev_c1be020c66" className="flex gap-2">
                                <button data-ev-id="ev_d0017a8180"
                        onClick={() => handleEndItemVoting(item.id)}
                        disabled={submitting}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">

                                  Abstimmung beenden
                                </button>
                                <button data-ev-id="ev_a4286b77a5"
                        onClick={() => setShowOverride(item.id)}
                        className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium">

                                  Überstimmen
                                </button>
                              </div> :

                      <div data-ev-id="ev_b6f7176a38" className="flex flex-col gap-3">
                                <div data-ev-id="ev_b6462a2d01" className="flex gap-2">
                                  <button data-ev-id="ev_321151316f"
                          onClick={() => setOverrideDecision('approved')}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 ${
                          overrideDecision === 'approved' ?
                          'bg-green-50 border-green-500 text-green-700' :
                          'border-slate-200 text-slate-600'}`
                          }>

                                    Genehmigen
                                  </button>
                                  <button data-ev-id="ev_952a671add"
                          onClick={() => setOverrideDecision('rejected')}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 ${
                          overrideDecision === 'rejected' ?
                          'bg-red-50 border-red-500 text-red-700' :
                          'border-slate-200 text-slate-600'}`
                          }>

                                    Ablehnen
                                  </button>
                                </div>
                                <textarea data-ev-id="ev_9705d72630"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg"
                        placeholder="Begründung für Überstimmung *" />

                                <div data-ev-id="ev_975d4691d7" className="flex gap-2">
                                  <button data-ev-id="ev_8a7162f724"
                          onClick={() => setShowOverride(null)}
                          className="flex-1 py-2 border border-slate-300 rounded-lg text-sm">

                                    Abbrechen
                                  </button>
                                  <button data-ev-id="ev_6cdac4eec2"
                          onClick={() => handleOverrideItemVoting(item.id)}
                          disabled={!overrideReason.trim() || submitting}
                          className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg text-sm font-medium">

                                    Überstimmen
                                  </button>
                                </div>
                              </div>
                      }
                          </div>
                    }

                        {/* Closed Status */}
                        {(item.status === 'approved' || item.status === 'rejected') &&
                    <div data-ev-id="ev_72eda7543f" className={`p-3 rounded-lg flex items-center gap-2 ${
                    item.status === 'approved' ?
                    'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                    'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`
                    }>
                            {item.status === 'approved' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                            <span data-ev-id="ev_6291770c45" className="font-medium">
                              {item.status === 'approved' ? 'Genehmigt' : 'Abgelehnt'}
                              {item.voting_result === 'overridden' && ' (Überstimmt)'}
                            </span>
                          </div>
                    }
                      </div>
                  }
                  </div>);

            })}
            </div>) : (

          /* Legacy voting (no items) */
          <div data-ev-id="ev_f61de3e81c" className="flex flex-col gap-6">
              {/* Decision Info */}
              <div data-ev-id="ev_c2932967e0" className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-4 rounded-r-lg">
                <p data-ev-id="ev_59dc3cf62e" className="text-xs text-violet-600 dark:text-violet-400 font-medium mb-1">
                  Das Kommando möge beschließen:
                </p>
                <p data-ev-id="ev_26fd5d173c" className="text-slate-700 dark:text-slate-200 italic">
                  "{decision.description || decision.title}"
                </p>
                <p data-ev-id="ev_93c25c545d" className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  zu beschließen.
                </p>
              </div>

              {/* Vote Summary */}
              <div data-ev-id="ev_901bc2ba7f" className="grid grid-cols-3 gap-4">
                <div data-ev-id="ev_cf7c788a60" className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 text-center">
                  <div data-ev-id="ev_d846a3b8b4" className="text-2xl font-bold text-green-600">{legacyVoteSummary.approveCount}</div>
                  <div data-ev-id="ev_9725465633" className="text-sm text-green-700 dark:text-green-300">Dafür</div>
                </div>
                <div data-ev-id="ev_91f2529567" className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4 text-center">
                  <div data-ev-id="ev_65a13926ed" className="text-2xl font-bold text-red-600">{legacyVoteSummary.rejectCount}</div>
                  <div data-ev-id="ev_0317dab427" className="text-sm text-red-700 dark:text-red-300">Dagegen</div>
                </div>
                <div data-ev-id="ev_c02ba16a8d" className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
                  <div data-ev-id="ev_726626c058" className="text-2xl font-bold text-gray-600">{legacyVoteSummary.abstainCount}</div>
                  <div data-ev-id="ev_e668b10f40" className="text-sm text-gray-700 dark:text-gray-300">Enthaltung</div>
                </div>
              </div>

              {/* Individual Votes - Wer hat wie abgestimmt */}
              {legacyVotes.length > 0 &&
            <div data-ev-id="ev_27808c91c4" className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                  <div data-ev-id="ev_e671e558a9" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-sm mb-3">
                    <Users size={16} />
                    <span data-ev-id="ev_3721290931" className="font-medium">Abgegebene Stimmen ({legacyVotes.length})</span>
                  </div>
                  <div data-ev-id="ev_3c4d2c4e10" className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                    {legacyVotes.
                sort((a, b) => (a.voter?.full_name || '').localeCompare(b.voter?.full_name || '')).
                map((vote) =>
                <div data-ev-id="ev_500967df71" key={vote.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-200 dark:border-slate-700 last:border-0">
                          <span data-ev-id="ev_266254b574" className="text-slate-700 dark:text-slate-300 font-medium">
                            {vote.voter?.full_name || 'Unbekannt'}
                          </span>
                          <div data-ev-id="ev_601536335f" className="flex items-center gap-2">
                            <span data-ev-id="ev_a1ce8fdc92" className={`px-2 py-0.5 rounded-full text-xs font-medium ${vote.vote === 'approve' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : vote.vote === 'reject' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                              {vote.vote === 'approve' ? '✓ Dafür' : vote.vote === 'reject' ? '✗ Dagegen' : '○ Enthaltung'}
                            </span>
                            {vote.reason &&
                    <span data-ev-id="ev_9007c6bfd2" className="text-slate-500 dark:text-slate-400 italic text-xs max-w-[150px] truncate" title={vote.reason}>
                                „{vote.reason}"
                              </span>
                    }
                          </div>
                        </div>
                )}
                  </div>
                </div>
            }

              {/* Pending Voters */}
              {getLegacyPendingVoters().length > 0 && isOpen &&
            <div data-ev-id="ev_ee6b889bc8" className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                  <div data-ev-id="ev_f28cc9c557" className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm mb-2">
                    <Clock size={16} />
                    <span data-ev-id="ev_630b69264c" className="font-medium">Ausstehend ({getLegacyPendingVoters().length})</span>
                  </div>
                  <p data-ev-id="ev_b02afdc966" className="text-sm text-amber-600 dark:text-amber-400">
                    {getLegacyPendingVoters().map((v) => v.full_name).join(', ')}
                  </p>
                </div>
            }

              {/* Progress */}
              <div data-ev-id="ev_3202a326dc" className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                <Users size={16} />
                <span data-ev-id="ev_54c8e5ff59">{legacyVoteSummary.votedCount} von {kommandomitgliederCount} haben abgestimmt</span>
              </div>

              {/* Voting Interface */}
              {isOpen && isKommandomitglied &&
            <div data-ev-id="ev_7f2647e1d0" className="border-t pt-6">
                  <h4 data-ev-id="ev_f8d36e3b09" className="font-medium text-slate-800 dark:text-slate-100 mb-4">
                    {legacyVoteSummary.hasVoted ? 'Ihre Stimme ändern' : 'Ihre Stimme abgeben'}
                  </h4>
                  <div data-ev-id="ev_2d675823cf" className="flex flex-col gap-3">
                    {voteOptions.map((option) =>
                <button data-ev-id="ev_b0e1759d23"
                key={option.value}
                onClick={() => setSelectedVotes({ legacy: option.value })}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                selectedVotes.legacy === option.value ?
                option.color + ' border-current' :
                'border-slate-200 dark:border-slate-600 hover:border-slate-300'}`
                }>

                        <option.icon size={20} />
                        <span data-ev-id="ev_a3db2e5401" className="font-medium">{option.label}</span>
                      </button>
                )}
                  </div>
                  <textarea data-ev-id="ev_55617e80f1"
              value={reasons.legacy || ''}
              onChange={(e) => setReasons({ legacy: e.target.value })}
              rows={3}
              className="mt-4 w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
              placeholder="Begründung (optional)" />

                  <button data-ev-id="ev_0ef07ded59"
              onClick={handleSubmitLegacyVote}
              disabled={!selectedVotes.legacy || submitting}
              className="mt-4 w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded-lg font-medium">

                    {submitting ? 'Wird gespeichert...' : 'Stimme abgeben'}
                  </button>
                </div>
            }

              {/* Kommandant Actions */}
              {isOpen && isKommandant &&
            <div data-ev-id="ev_d806433866" className="border-t pt-6">
                  <h4 data-ev-id="ev_60fc2b6da7" className="font-medium text-slate-800 dark:text-slate-100 mb-4">Kommandant-Aktionen</h4>
                  {!showOverride ?
              <div data-ev-id="ev_333c2906d0" className="flex gap-3">
                      <button data-ev-id="ev_30dd447278"
                onClick={handleEndLegacyVoting}
                disabled={submitting}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">

                        Abstimmung beenden
                      </button>
                      <button data-ev-id="ev_3822b2cb7b"
                onClick={() => setShowOverride('legacy')}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium">

                        Überstimmen
                      </button>
                    </div> :

              <div data-ev-id="ev_281ebdd5c0" className="flex flex-col gap-3">
                      <div data-ev-id="ev_1f191b69ca" className="flex gap-2">
                        <button data-ev-id="ev_05c619bde9"
                  onClick={() => setOverrideDecision('approved')}
                  className={`flex-1 py-2 rounded-lg font-medium border-2 ${
                  overrideDecision === 'approved' ?
                  'bg-green-50 border-green-500 text-green-700' :
                  'border-slate-200 text-slate-600'}`
                  }>

                          Genehmigen
                        </button>
                        <button data-ev-id="ev_86f6db9096"
                  onClick={() => setOverrideDecision('rejected')}
                  className={`flex-1 py-2 rounded-lg font-medium border-2 ${
                  overrideDecision === 'rejected' ?
                  'bg-red-50 border-red-500 text-red-700' :
                  'border-slate-200 text-slate-600'}`
                  }>

                          Ablehnen
                        </button>
                      </div>
                      <textarea data-ev-id="ev_9500fa3995"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                placeholder="Begründung für Überstimmung *" />

                      <div data-ev-id="ev_7d0f50436d" className="flex gap-3">
                        <button data-ev-id="ev_7f45a0c605"
                  onClick={() => setShowOverride(null)}
                  className="flex-1 py-3 border border-slate-300 rounded-lg font-medium">

                          Abbrechen
                        </button>
                        <button data-ev-id="ev_92d6c7ec09"
                  onClick={handleOverrideLegacyVoting}
                  disabled={!overrideReason.trim() || submitting}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg font-medium">

                          Überstimmen
                        </button>
                      </div>
                    </div>
              }
                </div>
            }

              {/* Closed Status */}
              {!isOpen &&
            <div data-ev-id="ev_d1b5077acf" className={`p-4 rounded-lg flex items-center gap-3 ${
            decision.status === 'approved' ?
            'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
            'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`
            }>
                  {decision.status === 'approved' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                  <div data-ev-id="ev_a2ce407896">
                    <p data-ev-id="ev_312bac7fc2" className="font-medium">
                      {decision.status === 'approved' ? 'Genehmigt' : 'Abgelehnt'}
                      {wasOverridden && ' (Überstimmt)'}
                    </p>
                    {wasOverridden && decision.voting_override_reason &&
                <p data-ev-id="ev_76f0c88017" className="text-sm mt-1">Grund: {decision.voting_override_reason}</p>
                }
                  </div>
                </div>
            }
            </div>)
          }

          {/* Error */}
          {error &&
          <div data-ev-id="ev_ffa0a585bf" className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          }
        </div>

        {/* Footer */}
        <div data-ev-id="ev_44ff06714f" className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-between gap-3">
          {isAdmin ?
          <button data-ev-id="ev_94145e524c"
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
          title="Dauerhaft löschen">
              <Trash2 className="w-4 h-4" />
              Löschen
            </button> :
          <div data-ev-id="ev_cce78557cb" />}
          <button data-ev-id="ev_bd9c6b2027"
          onClick={onClose}
          className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium">

            Schließen
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm &&
      <div data-ev-id="ev_351b8970aa" className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div data-ev-id="ev_ec80b0b881" className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div data-ev-id="ev_2dfb207c90" className="flex items-center gap-3 mb-4">
              <div data-ev-id="ev_d67a743640" className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 data-ev-id="ev_5378a2bbbd" className="text-lg font-semibold">Kommandoabstimmung löschen</h3>
            </div>
            <p data-ev-id="ev_b74c87d44e" className="text-slate-600 dark:text-slate-400 mb-2">
              Möchten Sie diese Kommandoabstimmung wirklich <strong data-ev-id="ev_e37172b4f4">dauerhaft löschen</strong>?
            </p>
            <div data-ev-id="ev_38d098f54e" className="bg-slate-100 dark:bg-slate-700/50 rounded-lg p-3 mb-4">
              <p data-ev-id="ev_88b994156e" className="font-medium">{decision.title}</p>
              <p data-ev-id="ev_6b197caee6" className="text-sm text-slate-500">{decision.reference_number}</p>
            </div>
            <p data-ev-id="ev_0b184210a8" className="text-sm text-red-600 mb-6">
              Diese Aktion kann nicht rückgängig gemacht werden. Alle Abstimmungen und Beschlusspunkte werden ebenfalls gelöscht.
            </p>
            <div data-ev-id="ev_c2cc129869" className="flex gap-3 justify-end">
              <button data-ev-id="ev_f5bd1aaab6"
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
            onClick={() => setShowDeleteConfirm(false)}
            disabled={deleting}>
                Abbrechen
              </button>
              <button data-ev-id="ev_9c70211295"
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            onClick={async () => {
              setDeleting(true);
              const success = await forceDeleteDecision(decision.id);
              setDeleting(false);
              if (success) {
                setShowDeleteConfirm(false);
                onClose();
              }
            }}
            disabled={deleting}>
                {deleting ?
              <>
                    <div data-ev-id="ev_ccc3cb07ec" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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