import { useState } from 'react';
import { useOrderVotes, type VoteSummary } from '@/hooks/useOrderVotes';
import { useOrders, type InvoiceTo } from '@/hooks/useOrders';
import {
  ThumbsUp,
  ThumbsDown,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Crown,
  MessageSquare,
  TrendingUp,
  TrendingDown } from
'lucide-react';

interface KommandomitgliedVotingProps {
  orderId: string;
  orderStatus: string;
  requiresKommandomitgliedApproval: boolean;
  kommandomitgliedOverrideBy?: string | null;
  kommandomitgliedOverrideReason?: string | null;
  overriderName?: string;
  onStatusChange?: () => void; // Callback wenn Status sich ändert
}

export function KommandomitgliedVoting({
  orderId,
  orderStatus,
  requiresKommandomitgliedApproval,
  kommandomitgliedOverrideBy,
  kommandomitgliedOverrideReason,
  overriderName,
  onStatusChange
}: KommandomitgliedVotingProps) {
  const {
    votes,
    voteSummary,
    loading,
    isKommandomitglied,
    isKommandant,
    kommandomitgliederCount,
    submitVote,
    removeVote
  } = useOrderVotes(orderId);

  const { overrideKommandomitgliedVote, completeKommandomitgliedVote } = useOrders();

  const [showVoteModal, setShowVoteModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [voteType, setVoteType] = useState<'approve' | 'reject' | 'abstain'>('approve');
  const [voteReason, setVoteReason] = useState('');
  const [overrideDecision, setOverrideDecision] = useState<'approve' | 'reject'>('approve');
  const [overrideReason, setOverrideReason] = useState('');
  const [selectedInvoiceTo, setSelectedInvoiceTo] = useState<InvoiceTo>('feuerwehr');
  const [showEndVotingModal, setShowEndVotingModal] = useState(false);
  const [endVotingInvoiceTo, setEndVotingInvoiceTo] = useState<InvoiceTo>('feuerwehr');
  const [submitting, setSubmitting] = useState(false);
  const [overrideError, setOverrideError] = useState('');

  // Don't render if this order doesn't require Kommandomitglied approval
  if (!requiresKommandomitgliedApproval) {
    return null;
  }

  // Check if voting is still active (order not yet approved/rejected)
  const isVotingActive = orderStatus !== 'genehmigt' && orderStatus !== 'freigegeben_kommandant' && orderStatus !== 'abgelehnt';
  const wasOverridden = !!kommandomitgliedOverrideBy;

  // Calculate required votes for majority
  const requiredVotes = Math.floor(kommandomitgliederCount / 2) + 1;

  async function handleSubmitVote() {
    setSubmitting(true);
    const { error } = await submitVote(voteType, voteReason || undefined);
    if (!error) {
      setShowVoteModal(false);
      setVoteReason('');
      // Abstimmung bleibt offen - wird nicht automatisch beendet
      // Kommandant muss explizit "Abstimmung beenden" klicken
    }
    setSubmitting(false);
  }

  async function handleOverride() {
    if (!overrideReason.trim()) return;

    setSubmitting(true);
    setOverrideError('');

    // Generate voting results HTML for Schriftführer email
    let votingResultsHtml = '';
    if (overrideDecision === 'reject') {
      const approveCount = votes.filter((v) => v.vote === 'approve').length;
      const rejectCount = votes.filter((v) => v.vote === 'reject').length;

      votingResultsHtml = `
        <p><strong>Abstimmungsstatus:</strong> ${votes.length} von ${kommandomitgliederCount} Stimmen abgegeben</p>
        <p><strong>Zustimmungen:</strong> ${approveCount}</p>
        <p><strong>Ablehnungen:</strong> ${rejectCount}</p>
        <p><strong>Benötigte Mehrheit:</strong> ${requiredVotes} Stimmen</p>
        <h4>Einzelne Stimmen:</h4>
        <ul>
          ${votes.map((vote) => {
        const voteDate = new Date(vote.created_at);
        const formattedDate = voteDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const formattedTime = voteDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const voteText = vote.vote === 'approve' ? '✓ Zugestimmt' : vote.vote === 'reject' ? '✗ Abgelehnt' : '○ Enthalten';
        return `<li>${vote.voter?.full_name || 'Unbekannt'} - ${voteText} (${formattedDate}, ${formattedTime} Uhr)${vote.reason ? ` - Begründung: ${vote.reason}` : ''}</li>`;
      }).join('')}
        </ul>
        <p><strong>Kommandant-Direktentscheidung:</strong> Abgelehnt</p>
      `;
    }

    const { error } = await overrideKommandomitgliedVote(
      orderId,
      overrideDecision,
      overrideReason,
      overrideDecision === 'approve' ? selectedInvoiceTo : undefined,
      votingResultsHtml
    );
    if (error) {
      setOverrideError(error.message || 'Ein Fehler ist aufgetreten');
    } else {
      setShowOverrideModal(false);
      setOverrideReason('');
      onStatusChange?.(); // Status hat sich geändert - Parent aktualisieren
    }
    setSubmitting(false);
  }

  async function handleRemoveVote() {
    await removeVote();
  }

  // Kommandant beendet die Abstimmung und wertet das Ergebnis aus
  async function handleEndVoting() {
    setSubmitting(true);

    const approveCount = voteSummary.approveCount;
    const rejectCount = voteSummary.rejectCount;

    // Entscheidung basierend auf Mehrheit oder bei Gleichstand zugunsten Ablehnung
    const decision: 'approve' | 'reject' = approveCount > rejectCount ? 'approve' : 'reject';

    // Generate voting results HTML
    const votesList = votes.map((vote) => {
      const voteDate = new Date(vote.created_at);
      const formattedDate = voteDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const formattedTime = voteDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      const voteText = vote.vote === 'approve' ? '✓ Zugestimmt' : '✗ Abgelehnt';
      const reasonText = vote.reason ? ` - Begründung: ${vote.reason}` : '';
      return `<li>${vote.voter?.full_name || 'Unbekannt'} - ${voteText} (${formattedDate}, ${formattedTime} Uhr)${reasonText}</li>`;
    }).join('');

    const votingResultsHtml = `
      <p><strong>Abstimmungsstatus:</strong> ${votes.length} von ${kommandomitgliederCount} Stimmen abgegeben</p>
      <p><strong>Zustimmungen:</strong> ${approveCount}</p>
      <p><strong>Ablehnungen:</strong> ${rejectCount}</p>
      <p><strong>Benötigte Mehrheit:</strong> ${requiredVotes} Stimmen</p>
      <h4>Einzelne Stimmen:</h4>
      <ul>${votesList}</ul>
      <p><strong>Ergebnis:</strong> ${decision === 'approve' ? 'Genehmigt' : 'Abgelehnt'} (${approveCount} zu ${rejectCount})</p>
      <p><strong>Abstimmung beendet durch:</strong> Kommandant</p>
    `;

    const { error } = await completeKommandomitgliedVote(
      orderId,
      decision,
      decision === 'approve' ? endVotingInvoiceTo : undefined,
      votingResultsHtml
    );

    if (!error) {
      setShowEndVotingModal(false);
      onStatusChange?.();
    }
    setSubmitting(false);
  }

  function openVoteModal(type: 'approve' | 'reject') {
    setVoteType(type);
    setShowVoteModal(true);
  }

  function openOverrideModal(decision: 'approve' | 'reject') {
    setOverrideDecision(decision);
    setOverrideError('');
    setShowOverrideModal(true);
  }

  if (loading) {
    return (
      <div data-ev-id="ev_739b086c2a" className="bg-card rounded-xl border border-border p-6">
        <div data-ev-id="ev_fd8a74bb22" className="flex items-center justify-center py-4">
          <div data-ev-id="ev_a58ab5b1e9" className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>);

  }

  return (
    <div data-ev-id="ev_bc2c96029f" className="bg-card rounded-xl border border-border p-6">
      <div data-ev-id="ev_50b14be916" className="flex items-center gap-3 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h3 data-ev-id="ev_67b246560a" className="text-lg font-semibold text-foreground">Kommandomitglieder-Abstimmung</h3>
      </div>

      {/* Voting Status */}
      <div data-ev-id="ev_fcac519a92" className="bg-muted/50 rounded-lg p-4 mb-4">
        <div data-ev-id="ev_6d0e5437af" className="flex items-center justify-between mb-3">
          <span data-ev-id="ev_260f2cff29" className="text-sm text-muted-foreground">Abstimmungsstatus</span>
          <span data-ev-id="ev_cb9319ce75" className="text-sm font-medium">
            {votes.length} von {kommandomitgliederCount} Stimmen abgegeben
          </span>
        </div>
        
        {/* Progress bars */}
        <div data-ev-id="ev_81af5a92b0" className="flex flex-col gap-2">
          <div data-ev-id="ev_172c33302b" className="flex items-center gap-3">
            <ThumbsUp className="w-4 h-4 text-emerald-500" />
            <div data-ev-id="ev_550478a5d6" className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
              <div data-ev-id="ev_6bfad0077f"
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${kommandomitgliederCount > 0 ? voteSummary.approveCount / kommandomitgliederCount * 100 : 0}%` }} />

            </div>
            <span data-ev-id="ev_4a8f20c7e0" className="text-sm font-medium w-8 text-right">{voteSummary.approveCount}</span>
          </div>
          <div data-ev-id="ev_25b6ff789d" className="flex items-center gap-3">
            <ThumbsDown className="w-4 h-4 text-red-500" />
            <div data-ev-id="ev_68600adbd5" className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
              <div data-ev-id="ev_32e8448413"
              className="bg-red-500 h-full transition-all duration-300"
              style={{ width: `${kommandomitgliederCount > 0 ? voteSummary.rejectCount / kommandomitgliederCount * 100 : 0}%` }} />

            </div>
            <span data-ev-id="ev_ca321ce117" className="text-sm font-medium w-8 text-right">{voteSummary.rejectCount}</span>
          </div>
          {voteSummary.abstainCount > 0 &&
          <div data-ev-id="ev_abstain_bar" className="flex items-center gap-3">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <div data-ev-id="ev_abstain_bar_bg" className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
              <div data-ev-id="ev_abstain_bar_fill"
              className="bg-muted-foreground/50 h-full transition-all duration-300"
              style={{ width: `${kommandomitgliederCount > 0 ? voteSummary.abstainCount / kommandomitgliederCount * 100 : 0}%` }} />
            </div>
            <span data-ev-id="ev_abstain_count" className="text-sm font-medium w-8 text-right text-muted-foreground">{voteSummary.abstainCount}</span>
          </div>
          }
        </div>
        
        <p data-ev-id="ev_c907b7033b" className="text-xs text-muted-foreground mt-2">
          Benötigte Mehrheit: {voteSummary.requiredVotes} Stimmen (Enthaltungen zählen nicht)
        </p>

        {/* Voting Status Indicator */}
        {votes.length > 0 && (() => {
          const totalVotes = votes.length;
          const approveCount = voteSummary.approveCount;
          const rejectCount = voteSummary.rejectCount;
          const allVoted = totalVotes === kommandomitgliederCount;

          // Einstimmigkeit
          const isUnanimousApprove = allVoted && approveCount === totalVotes;
          const isUnanimousReject = allVoted && rejectCount === totalVotes;

          // Mehrheit
          const hasApproveMajority = approveCount >= requiredVotes;
          const hasRejectMajority = rejectCount >= requiredVotes;

          // Gleichstand
          const isTie = approveCount === rejectCount && totalVotes > 0;

          if (isUnanimousApprove) {
            return (
              <div data-ev-id="ev_1b821757c4" className="mt-3 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span data-ev-id="ev_092e6b2ce1" className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Einstimmige Zustimmung
                </span>
              </div>);

          }

          if (isUnanimousReject) {
            return (
              <div data-ev-id="ev_07a5d5a391" className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span data-ev-id="ev_75de01c91c" className="text-sm font-medium text-red-700 dark:text-red-400">
                  Einstimmige Ablehnung
                </span>
              </div>);

          }

          if (hasApproveMajority) {
            return (
              <div data-ev-id="ev_20018d02e2" className="mt-3 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                <ThumbsUp className="w-4 h-4 text-emerald-500" />
                <span data-ev-id="ev_e27b00d5bd" className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Mehrheit für Freigabe ({approveCount} von {requiredVotes} benötigten Stimmen)
                </span>
              </div>);

          }

          if (hasRejectMajority) {
            return (
              <div data-ev-id="ev_da1db5c6be" className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                <ThumbsDown className="w-4 h-4 text-red-500" />
                <span data-ev-id="ev_68e8caf103" className="text-sm font-medium text-red-700 dark:text-red-400">
                  Mehrheit für Ablehnung ({rejectCount} von {requiredVotes} benötigten Stimmen)
                </span>
              </div>);

          }

          if (isTie) {
            return (
              <div data-ev-id="ev_eabdeeed65" className="mt-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span data-ev-id="ev_4d65258cd5" className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Gleichstand ({approveCount} zu {rejectCount}) - Abstimmung offen
                </span>
              </div>);

          }

          // Tendenz anzeigen
          if (approveCount > rejectCount) {
            return (
              <div data-ev-id="ev_7bca2b2320" className="mt-3 flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span data-ev-id="ev_165edd20f9" className="text-sm text-emerald-700 dark:text-emerald-400">
                  Tendenz: Freigabe ({approveCount} zu {rejectCount}) - noch {requiredVotes - approveCount} Stimme(n) für Mehrheit
                </span>
              </div>);

          }

          if (rejectCount > approveCount) {
            return (
              <div data-ev-id="ev_225155b127" className="mt-3 flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span data-ev-id="ev_251f7f8268" className="text-sm text-red-700 dark:text-red-400">
                  Tendenz: Ablehnung ({rejectCount} zu {approveCount}) - noch {requiredVotes - rejectCount} Stimme(n) für Mehrheit
                </span>
              </div>);

          }

          return null;
        })()}
      </div>

      {/* Override Notice */}
      {wasOverridden &&
      <div data-ev-id="ev_eb22d8295a" className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
          <div data-ev-id="ev_3635b17b06" className="flex items-start gap-3">
            <Crown className="w-5 h-5 text-amber-500 mt-0.5" />
            <div data-ev-id="ev_4137aff894">
              <p data-ev-id="ev_f2321792d3" className="font-medium text-amber-700 dark:text-amber-400">
                Kommandant-Direktentscheidung
              </p>
              <p data-ev-id="ev_7458ab99c2" className="text-sm text-amber-600 dark:text-amber-300 mt-1">
                {overriderName || 'Kommandant'} hat die Abstimmung überstimmt.
              </p>
              {kommandomitgliedOverrideReason &&
            <p data-ev-id="ev_27e66bfc6d" className="text-sm text-amber-600 dark:text-amber-300 mt-2">
                  <strong data-ev-id="ev_830fb9927f">Begründung:</strong> {kommandomitgliedOverrideReason}
                </p>
            }
            </div>
          </div>
        </div>
      }

      {/* Vote List */}
      {votes.length > 0 &&
      <div data-ev-id="ev_717367f340" className="mb-4">
          <h4 data-ev-id="ev_14f0c2eaaf" className="text-sm font-medium text-foreground mb-2">Abgegebene Stimmen</h4>
          <div data-ev-id="ev_913c4fbd14" className="flex flex-col gap-2">
            {votes.map((vote) => {
            const voteDate = new Date(vote.created_at);
            const formattedDate = voteDate.toLocaleDateString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
            const formattedTime = voteDate.toLocaleTimeString('de-DE', {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div data-ev-id="ev_bc40ab7d43" key={vote.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                  <div data-ev-id="ev_4ef2d9a4dd" className="flex items-center gap-2">
                    {vote.vote === 'approve' ?
                  <CheckCircle className="w-4 h-4 text-emerald-500" /> :
                  <XCircle className="w-4 h-4 text-red-500" />
                  }
                    <div data-ev-id="ev_419094dc5f" className="flex flex-col">
                      <span data-ev-id="ev_2b15eda95c" className="text-sm">{vote.voter?.full_name || 'Unbekannt'}</span>
                      <span data-ev-id="ev_fac55ccecc" className="text-xs text-muted-foreground">{formattedDate}, {formattedTime} Uhr</span>
                    </div>
                  </div>
                  {vote.reason &&
                <span data-ev-id="ev_e299cd44a3" className="text-xs text-muted-foreground truncate max-w-[200px]" title={vote.reason}>
                      {vote.reason}
                    </span>
                }
                </div>);

          })}
          </div>
        </div>
      }

      {/* Actions */}
      {isVotingActive && !wasOverridden &&
      <div data-ev-id="ev_d7db2be47b" className="flex flex-col gap-3">
          {/* Kommandomitglied voting */}
          {isKommandomitglied &&
        <div data-ev-id="ev_3093ffb3c7" className="flex flex-col gap-2">
              {voteSummary.hasVoted ?
          <div data-ev-id="ev_cf5c931f33" className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                  <div data-ev-id="ev_f446e57521" className="flex items-center gap-2">
                    {voteSummary.userVote === 'approve' ?
              <CheckCircle className="w-5 h-5 text-emerald-500" /> :
              voteSummary.userVote === 'reject' ?
              <XCircle className="w-5 h-5 text-red-500" /> :
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
              }
                    <span data-ev-id="ev_d2da755c45" className="text-sm">
                      Sie haben {voteSummary.userVote === 'approve' ? 'zugestimmt' : voteSummary.userVote === 'reject' ? 'abgelehnt' : 'sich enthalten'}
                    </span>
                  </div>
                  <button data-ev-id="ev_05ef3bd86a"
            onClick={handleRemoveVote}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      Stimme zurückziehen
                    </button>
                </div> :

          <div data-ev-id="ev_d29adca810" className="flex gap-2">
                  <button data-ev-id="ev_93f7bb4ede"
            onClick={() => openVoteModal('approve')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors">

                    <ThumbsUp className="w-4 h-4" />
                    Ja
                  </button>
                  <button data-ev-id="ev_d925098151"
            onClick={() => openVoteModal('reject')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors">

                    <ThumbsDown className="w-4 h-4" />
                    Nein
                  </button>
                  <button data-ev-id="ev_abstain_btn"
            onClick={() => openVoteModal('abstain')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors">

                    <MessageSquare className="w-4 h-4" />
                    Enthalten
                  </button>
                </div>
          }
            </div>
        }

          {/* Kommandant: Abstimmung beenden */}
          {isKommandant && votes.length > 0 &&
        <div data-ev-id="ev_end_voting_section" className="border-t border-border pt-4 mt-2">
              <div data-ev-id="ev_end_voting_header" className="flex items-center gap-2 mb-3">
                <Crown className="w-4 h-4 text-primary" />
                <span data-ev-id="ev_end_voting_title" className="text-sm font-medium text-foreground">Abstimmung beenden</span>
              </div>
              <p data-ev-id="ev_end_voting_desc" className="text-xs text-muted-foreground mb-3">
                Beenden Sie die Abstimmung und werten Sie das aktuelle Ergebnis aus.
                {voteSummary.approveCount > voteSummary.rejectCount ?
            ` Aktuell: ${voteSummary.approveCount} Zustimmungen, ${voteSummary.rejectCount} Ablehnungen → Freigabe` :
            voteSummary.rejectCount > voteSummary.approveCount ?
            ` Aktuell: ${voteSummary.approveCount} Zustimmungen, ${voteSummary.rejectCount} Ablehnungen → Ablehnung` :
            ` Aktuell: Gleichstand (${voteSummary.approveCount} zu ${voteSummary.rejectCount}) → Ablehnung`
            }
              </p>
              <button data-ev-id="ev_end_voting_btn"
          onClick={() => setShowEndVotingModal(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                <CheckCircle className="w-4 h-4" />
                Abstimmung beenden & Ergebnis übernehmen
              </button>
            </div>
        }

          {/* Kommandant: Direktentscheidung (Override) */}
          {isKommandant &&
        <div data-ev-id="ev_e38ff5ee97" className="border-t border-border pt-4 mt-2">
              <div data-ev-id="ev_85709e1cad" className="flex items-center gap-2 mb-3">
                <Crown className="w-4 h-4 text-amber-500" />
                <span data-ev-id="ev_473a8ce439" className="text-sm font-medium text-foreground">Kommandant-Direktentscheidung</span>
              </div>
              <p data-ev-id="ev_54f6862ee9" className="text-xs text-muted-foreground mb-3">
                Oder überstimmen Sie die Abstimmung und entscheiden Sie direkt (mit Begründung).
              </p>
              <div data-ev-id="ev_07a5d5a391" className="flex gap-2">
                <button data-ev-id="ev_4f938cc064"
            onClick={() => openOverrideModal('approve')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-emerald-500 text-emerald-600 rounded-lg font-medium hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors">

                  <CheckCircle className="w-4 h-4" />
                  Direkt freigeben
                </button>
                <button data-ev-id="ev_fd5c847897"
            onClick={() => openOverrideModal('reject')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-red-500 text-red-600 rounded-lg font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">

                  <XCircle className="w-4 h-4" />
                  Direkt ablehnen
                </button>
              </div>
            </div>
        }
        </div>
      }

      {/* Vote Modal */}
      {showVoteModal &&
      <div data-ev-id="ev_5c26838808" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-ev-id="ev_b5ec4ddfe8" className="bg-card rounded-xl border border-border p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 data-ev-id="ev_a360039ab4" className="text-lg font-semibold text-foreground mb-4">
              Stimme abgeben: {voteType === 'approve' ? 'Ja (Zustimmung)' : voteType === 'reject' ? 'Nein (Ablehnung)' : 'Enthaltung'}
            </h3>
            
            <p data-ev-id="ev_24634f2a37" className="text-sm text-muted-foreground mb-4">
              Sie geben Ihre Stimme zur Kommandoabstimmung ab. Die endgültige Entscheidung trifft der Kommandant nach Abschluss der Abstimmung.
            </p>
            
            <div data-ev-id="ev_6dee65157d" className="mb-4">
              <label data-ev-id="ev_2a8a1614b7" className="block text-sm font-medium text-foreground mb-1.5">
                Begründung (optional)
              </label>
              <textarea data-ev-id="ev_0c9300cd39"
            value={voteReason}
            onChange={(e) => setVoteReason(e.target.value)}
            placeholder="Optionale Begründung für Ihre Stimme..."
            rows={3}
            className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none" />

            </div>
            
            <div data-ev-id="ev_b6b511012f" className="flex gap-3">
              <button data-ev-id="ev_1ab812ca2a"
            onClick={() => setShowVoteModal(false)}
            className="flex-1 px-4 py-2.5 border border-input rounded-lg font-medium hover:bg-muted transition-colors">

                Abbrechen
              </button>
              <button data-ev-id="ev_9da36006dc"
            onClick={handleSubmitVote}
            disabled={submitting}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
            voteType === 'approve' ?
            'bg-emerald-500 text-white hover:bg-emerald-600' :
            voteType === 'reject' ?
            'bg-red-500 text-white hover:bg-red-600' :
            'bg-muted text-foreground hover:bg-muted/80'}`
            }>

                {submitting ? 'Wird gesendet...' : 'Stimme abgeben'}
              </button>
            </div>
          </div>
        </div>
      }

      {/* Override Modal */}
      {showOverrideModal &&
      <div data-ev-id="ev_b77326d5f8" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-ev-id="ev_ea92189935" className="bg-card rounded-xl border border-border p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div data-ev-id="ev_0a11d7c695" className="flex items-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-amber-500" />
              <h3 data-ev-id="ev_4c3d2f1145" className="text-lg font-semibold text-foreground">
                Kommandant-Direktentscheidung
              </h3>
            </div>
            
            <div data-ev-id="ev_0ec22eafe5" className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
              <p data-ev-id="ev_c595aa2d57" className="text-sm text-amber-700 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Sie überstimmen damit die laufende Abstimmung der Kommandomitglieder. Eine Begründung ist erforderlich.
              </p>
            </div>

            {overrideError &&
          <div data-ev-id="ev_0c1df21713" className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                <p data-ev-id="ev_7b39774249" className="text-sm text-red-700 dark:text-red-300">
                  {overrideError}
                </p>
              </div>
          }

            <div data-ev-id="ev_1631c7d5da" className="mb-4">
              <label data-ev-id="ev_3ed12ecfe4" className="block text-sm font-medium text-foreground mb-1.5">
                Begründung *
              </label>
              <textarea data-ev-id="ev_8965aa9e3f"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder="Begründung für Ihre Direktentscheidung..."
            rows={3}
            className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            required />

            </div>

            {overrideDecision === 'approve' &&
          <div data-ev-id="ev_ee129d3dc7" className="mb-4">
                <label data-ev-id="ev_f26501f6aa" className="block text-sm font-medium text-foreground mb-1.5">
                  Rechnung an
                </label>
                <select data-ev-id="ev_1e7e5f7102"
            value={selectedInvoiceTo}
            onChange={(e) => setSelectedInvoiceTo(e.target.value as InvoiceTo)}
            className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring">

                  <option data-ev-id="ev_7bf8f1ec40" value="feuerwehr">Feuerwehr</option>
                  <option data-ev-id="ev_b34193f2c5" value="gemeinde">Gemeinde</option>
                </select>
              </div>
          }
            
            <div data-ev-id="ev_3c6e3f419d" className="flex gap-3">
              <button data-ev-id="ev_6f647ebdba"
            onClick={() => setShowOverrideModal(false)}
            className="flex-1 px-4 py-2.5 border border-input rounded-lg font-medium hover:bg-muted transition-colors">

                Abbrechen
              </button>
              <button data-ev-id="ev_13839a1ab0"
            onClick={handleOverride}
            disabled={submitting || !overrideReason.trim()}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
            overrideDecision === 'approve' ?
            'bg-emerald-500 text-white hover:bg-emerald-600' :
            'bg-red-500 text-white hover:bg-red-600'}`
            }>

                {submitting ? 'Wird gesendet...' : overrideDecision === 'approve' ? 'Freigeben' : 'Ablehnen'}
              </button>
            </div>
          </div>
        </div>
      }

      {/* End Voting Modal */}
      {showEndVotingModal &&
      <div data-ev-id="ev_end_voting_modal" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-ev-id="ev_end_voting_modal_content" className="bg-card rounded-xl border border-border p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 data-ev-id="ev_end_voting_modal_title" className="text-lg font-semibold text-foreground mb-4">
              Abstimmung beenden
            </h3>
            
            <div data-ev-id="ev_end_voting_summary" className="bg-muted/50 rounded-lg p-4 mb-4">
              <p data-ev-id="ev_end_voting_votes" className="text-sm mb-2">
                <strong data-ev-id="ev_87cb38f42e">Abgegebene Stimmen:</strong> {votes.length} von {kommandomitgliederCount}
              </p>
              <p data-ev-id="ev_end_voting_approve" className="text-sm text-emerald-600">
                <strong data-ev-id="ev_2504ccf29d">Zustimmungen:</strong> {voteSummary.approveCount}
              </p>
              <p data-ev-id="ev_end_voting_reject" className="text-sm text-red-600">
                <strong data-ev-id="ev_1014d87d16">Ablehnungen:</strong> {voteSummary.rejectCount}
              </p>
              
              {/* Status Badge */}
              {(() => {
              const allVoted = votes.length === kommandomitgliederCount;
              const isUnanimousApprove = allVoted && voteSummary.approveCount === votes.length;
              const isUnanimousReject = allVoted && voteSummary.rejectCount === votes.length;
              const hasApproveMajority = voteSummary.approveCount >= requiredVotes;
              const hasRejectMajority = voteSummary.rejectCount >= requiredVotes;

              if (isUnanimousApprove) {
                return (
                  <div data-ev-id="ev_7da833cef5" className="mt-3 flex items-center gap-2 bg-emerald-500/20 rounded-lg px-3 py-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span data-ev-id="ev_90324a891e" className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        Einstimmige Freigabe
                      </span>
                    </div>);

              }
              if (isUnanimousReject) {
                return (
                  <div data-ev-id="ev_33b4384ca9" className="mt-3 flex items-center gap-2 bg-red-500/20 rounded-lg px-3 py-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span data-ev-id="ev_545a11e352" className="text-sm font-semibold text-red-700 dark:text-red-400">
                        Einstimmige Ablehnung
                      </span>
                    </div>);

              }
              if (hasApproveMajority) {
                return (
                  <div data-ev-id="ev_5da77f3bcf" className="mt-3 flex items-center gap-2 bg-emerald-500/20 rounded-lg px-3 py-2">
                      <ThumbsUp className="w-4 h-4 text-emerald-600" />
                      <span data-ev-id="ev_3e691b591e" className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        Mehrheitliche Freigabe
                      </span>
                    </div>);

              }
              if (hasRejectMajority) {
                return (
                  <div data-ev-id="ev_e8c50ef977" className="mt-3 flex items-center gap-2 bg-red-500/20 rounded-lg px-3 py-2">
                      <ThumbsDown className="w-4 h-4 text-red-600" />
                      <span data-ev-id="ev_f2c6d2620a" className="text-sm font-semibold text-red-700 dark:text-red-400">
                        Mehrheitliche Ablehnung
                      </span>
                    </div>);

              }
              // Keine Mehrheit - Tendenz
              if (voteSummary.approveCount > voteSummary.rejectCount) {
                return (
                  <div data-ev-id="ev_ada5f62e98" className="mt-3 flex items-center gap-2 bg-emerald-500/10 rounded-lg px-3 py-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span data-ev-id="ev_d83ca8345f" className="text-sm text-emerald-700 dark:text-emerald-400">
                        Tendenz: Freigabe (keine Mehrheit erreicht)
                      </span>
                    </div>);

              }
              return (
                <div data-ev-id="ev_4852c78c87" className="mt-3 flex items-center gap-2 bg-red-500/10 rounded-lg px-3 py-2">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <span data-ev-id="ev_11b4d5e5ab" className="text-sm text-red-700 dark:text-red-400">
                      Tendenz: Ablehnung (keine Mehrheit / Gleichstand)
                    </span>
                  </div>);

            })()}
            </div>
            
            {/* Email Info */}
            <div data-ev-id="ev_af9bbf86d7" className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
              <p data-ev-id="ev_55a2def385" className="text-sm text-blue-700 dark:text-blue-300">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Nach Beendigung werden automatisch E-Mails an den Antragsteller, Kassier und Schriftführer gesendet.
              </p>
            </div>

            {voteSummary.approveCount > voteSummary.rejectCount &&
          <div data-ev-id="ev_end_voting_invoice" className="mb-4">
                <label data-ev-id="ev_end_voting_invoice_label" className="block text-sm font-medium text-foreground mb-1.5">
                  Rechnung an
                </label>
                <select data-ev-id="ev_end_voting_invoice_select"
            value={endVotingInvoiceTo}
            onChange={(e) => setEndVotingInvoiceTo(e.target.value as InvoiceTo)}
            className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring">
                  <option data-ev-id="ev_5bb0979eb5" value="feuerwehr">Feuerwehr</option>
                  <option data-ev-id="ev_9b1bce0224" value="gemeinde">Gemeinde</option>
                </select>
              </div>
          }
            
            <div data-ev-id="ev_end_voting_actions" className="flex gap-3">
              <button data-ev-id="ev_end_voting_cancel"
            onClick={() => setShowEndVotingModal(false)}
            className="flex-1 px-4 py-2.5 border border-input rounded-lg font-medium hover:bg-muted transition-colors">
                Abbrechen
              </button>
              <button data-ev-id="ev_end_voting_confirm"
            onClick={handleEndVoting}
            disabled={submitting}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
            voteSummary.approveCount > voteSummary.rejectCount ?
            'bg-emerald-500 text-white hover:bg-emerald-600' :
            'bg-red-500 text-white hover:bg-red-600'}`
            }>
                {submitting ? 'Wird beendet...' : 'Abstimmung beenden'}
              </button>
            </div>
          </div>
        </div>
      }
    </div>);

}