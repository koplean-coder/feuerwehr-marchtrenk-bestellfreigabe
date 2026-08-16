import { Link } from 'react-router';
import { useOrderVotes } from '@/hooks/useOrderVotes';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { Order } from '@/hooks/useOrders';
import {
  ThumbsUp,
  ThumbsDown,
  Minus,
  Vote,
  CheckCircle2,
  XCircle,
  Crown,
  ExternalLink,
  Clock,
  User,
  Building2 } from
'lucide-react';

interface BeschlussCardProps {
  order: Order;
  showVotingStatus?: boolean;
  onVoteClick?: () => void;
}

export function BeschlussCard({ order, showVotingStatus = true, onVoteClick }: BeschlussCardProps) {
  const { profile } = useAuth();
  const { voteSummary, loading, kommandomitgliederCount } = useOrderVotes(order.id);

  const isKommandomitglied = profile?.functions?.includes('kommandomitglied') ||
  profile?.role === 'kommandant' ||
  profile?.role === 'admin';

  const wasOverridden = !!order.kommandomitglied_override_by;
  const isKommandantApproved = order.status === 'freigegeben_kommandant' || !!order.kommandant_approved_at;
  const isOpen = order.voting_status === 'open' ||
  order.voting_status !== 'closed' &&
  !order.kommandomitglied_approved_at &&
  !wasOverridden &&
  !isKommandantApproved &&
  order.status !== 'genehmigt' &&
  order.status !== 'abgelehnt';


  // Status Badge
  const getStatusBadge = () => {
    if (wasOverridden) {
      return (
        <span data-ev-id="ev_87ccb57a82" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Crown className="w-3 h-3" />
          Überstimmt
        </span>);

    }
    if (order.status === 'genehmigt' || order.voting_result === 'approved') {
      return (
        <span data-ev-id="ev_65d36ad33e" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          Genehmigt
        </span>);

    }
    if (isKommandantApproved) {
      return (
        <span data-ev-id="ev_kommfreig01" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          Freigegeben Kommandant
        </span>);
    }
    if (order.status === 'abgelehnt' || order.voting_result === 'rejected') {
      return (
        <span data-ev-id="ev_7b7c70bb81" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
          <XCircle className="w-3 h-3" />
          Abgelehnt
        </span>);

    }
    if (isOpen) {
      return (
        <span data-ev-id="ev_000df7c516" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          <Vote className="w-3 h-3" />
          Abstimmung läuft
        </span>);

    }
    return null;
  };

  // User's vote indicator
  const getUserVoteBadge = () => {
    if (!voteSummary.hasVoted) {
      return (
        <span data-ev-id="ev_b70e3412d6" className="text-xs text-amber-600 dark:text-amber-400 font-medium">
          Noch nicht abgestimmt
        </span>);

    }
    switch (voteSummary.userVote) {
      case 'approve':
        return (
          <span data-ev-id="ev_6b864e68ed" className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <ThumbsUp className="w-3 h-3" />
            Zugestimmt
          </span>);

      case 'reject':
        return (
          <span data-ev-id="ev_fd3436ec0b" className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
            <ThumbsDown className="w-3 h-3" />
            Abgelehnt
          </span>);

      case 'abstain':
        return (
          <span data-ev-id="ev_5f3a6fc700" className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
            <Minus className="w-3 h-3" />
            Enthalten
          </span>);

      default:
        return null;
    }
  };

  return (
    <div data-ev-id="ev_cbf1ffd6c1" className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
      <div data-ev-id="ev_588637cd9d" className="flex flex-col lg:flex-row lg:items-start gap-4">
        {/* Main Content */}
        <div data-ev-id="ev_10005735be" className="flex-1 min-w-0">
          <div data-ev-id="ev_458ca93604" className="flex items-start justify-between gap-4 mb-2">
            <div data-ev-id="ev_bd7d50edd0" className="flex items-center gap-3 flex-wrap">
              <Link
                to={`/bestellungen/${order.id}`}
                className="text-lg font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">

                {order.title}
              </Link>
              {getStatusBadge()}
            </div>
            <span data-ev-id="ev_fbc6759da4" className="text-lg font-bold text-foreground whitespace-nowrap">
              {formatCurrency(order.amount)}
            </span>
          </div>

          {/* Meta Info */}
          <div data-ev-id="ev_fb9863e6c0" className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
            <span data-ev-id="ev_a29c9ef77c" className="inline-flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {order.creator?.full_name || 'Unbekannt'}
            </span>
            {order.supplier?.name &&
            <span data-ev-id="ev_5521ebb4bf" className="inline-flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                {order.supplier.name}
              </span>
            }
            <span data-ev-id="ev_412fda28fe" className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {formatDate(order.created_at)}
            </span>
          </div>

          {/* Voting Progress (only for open votes) */}
          {showVotingStatus && !loading &&
          <div data-ev-id="ev_0f8725a5f9" className="bg-muted/50 rounded-lg p-3">
              <div data-ev-id="ev_55a8fd06a0" className="flex items-center justify-between text-sm mb-2">
                <span data-ev-id="ev_629509f515" className="text-muted-foreground">
                  {voteSummary.votedCount} von {kommandomitgliederCount} Stimmen
                </span>
                {isKommandomitglied && getUserVoteBadge()}
              </div>
              
              {/* Mini Progress Bars */}
              <div data-ev-id="ev_53a11e757b" className="flex gap-4">
                <div data-ev-id="ev_b91778f1cf" className="flex items-center gap-2 flex-1">
                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
                  <div data-ev-id="ev_2f98a8d384" className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                    <div data-ev-id="ev_558059a372"
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${kommandomitgliederCount > 0 ? voteSummary.approveCount / kommandomitgliederCount * 100 : 0}%` }} />

                  </div>
                  <span data-ev-id="ev_c3d283a8eb" className="text-xs font-medium w-4 text-right">{voteSummary.approveCount}</span>
                </div>
                <div data-ev-id="ev_bba5357962" className="flex items-center gap-2 flex-1">
                  <ThumbsDown className="w-3.5 h-3.5 text-red-500" />
                  <div data-ev-id="ev_f1ef1d06b4" className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                    <div data-ev-id="ev_8f7863e6dc"
                  className="bg-red-500 h-full transition-all"
                  style={{ width: `${kommandomitgliederCount > 0 ? voteSummary.rejectCount / kommandomitgliederCount * 100 : 0}%` }} />

                  </div>
                  <span data-ev-id="ev_e4247aed77" className="text-xs font-medium w-4 text-right">{voteSummary.rejectCount}</span>
                </div>
                <div data-ev-id="ev_3c0b73051f" className="flex items-center gap-2 flex-1">
                  <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                  <div data-ev-id="ev_3bc237a271" className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                    <div data-ev-id="ev_dd348307e1"
                  className="bg-muted-foreground/50 h-full transition-all"
                  style={{ width: `${kommandomitgliederCount > 0 ? voteSummary.abstainCount / kommandomitgliederCount * 100 : 0}%` }} />

                  </div>
                  <span data-ev-id="ev_a8e2d24588" className="text-xs font-medium w-4 text-right">{voteSummary.abstainCount}</span>
                </div>
              </div>
            </div>
          }
        </div>

        {/* Actions */}
        <div data-ev-id="ev_ee0a0d3cb4" className="flex items-center gap-2 lg:flex-col lg:items-end">
          {isOpen && isKommandomitglied && onVoteClick &&
          <button data-ev-id="ev_2a9fc71786"
          onClick={onVoteClick}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">

              <Vote className="w-4 h-4" />
              {voteSummary.hasVoted ? 'Stimme ändern' : 'Abstimmen'}
            </button>
          }
          <Link
            to={`/bestellungen/${order.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 hover:text-foreground transition-colors">

            <ExternalLink className="w-4 h-4" />
            Details
          </Link>
        </div>
      </div>
    </div>);

}