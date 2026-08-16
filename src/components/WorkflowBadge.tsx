import { Clock, User, AlertTriangle, Vote, CheckCircle, Users, Crown, Shield } from 'lucide-react';
import type { Order } from '@/hooks/useOrders';

interface Profile {
  id: string;
  full_name: string | null;
  role?: string | null;
}

interface VoteSummary {
  approveCount: number;
  rejectCount: number;
  totalVoters: number;
}

interface WorkflowBadgeProps {
  order: Order;
  profiles: Profile[];
  voteSummary?: VoteSummary | null;
  escalationTimeoutHours?: number;
  compact?: boolean; // Für kompakte Darstellung in engen Listen
}

// Berechne ob eine Bestellung überfällig ist
function isOverdue(order: Order, escalationTimeoutHours: number): boolean {
  if (order.status !== 'eingereicht' || !order.submitted_at) return false;

  const deadline = order.escalation_extended_until ?
  new Date(order.escalation_extended_until) :
  new Date(new Date(order.submitted_at).getTime() + escalationTimeoutHours * 60 * 60 * 1000);

  return new Date() > deadline;
}

// Berechne Wartezeit in Tagen
function getWaitingDays(order: Order): number {
  if (!order.submitted_at) return 0;
  const submitted = new Date(order.submitted_at);
  const now = new Date();
  return Math.floor((now.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
}

export function WorkflowBadge({
  order,
  profiles,
  voteSummary,
  escalationTimeoutHours = 48,
  compact = false
}: WorkflowBadgeProps) {
  const bereichsleiter = profiles.find((p) => p.id === order.bereichsleiter_id);
  const waitingDays = getWaitingDays(order);
  const overdue = isOverdue(order, escalationTimeoutHours);

  // Bestimme den Workflow-Status basierend auf order.status
  const getWorkflowInfo = () => {
    switch (order.status) {
      case 'entwurf':
        return null; // Kein Badge für Entwürfe

      case 'eingereicht':
        // Eingereicht - wer muss als nächstes handeln?
        if (order.bereichsleiter_id) {
          // BL zugewiesen - prüfe ob danach noch Abstimmung kommt
          if (order.requires_kommandomitglied_approval) {
            return {
              type: 'waiting_bl_then_voting',
              label: 'BL + Abstimmung',
              fullLabel: 'Warten auf BL, dann KDT + Kommando-Abstimmung',
              person: bereichsleiter?.full_name,
              icon: Users,
              color: 'bg-amber-100 text-amber-700 border-amber-200',
              hasVotingAfter: true
            };
          }
          return {
            type: 'waiting_bl',
            label: 'Warten auf BL',
            fullLabel: 'Warten auf Bereichsleitung',
            person: bereichsleiter?.full_name,
            icon: Users,
            color: 'bg-amber-100 text-amber-700 border-amber-200'
          };
        } else if (order.requires_kommandant_approval) {
          // Kein BL, aber KDT-Freigabe - prüfe ob danach noch Abstimmung kommt
          if (order.requires_kommandomitglied_approval) {
            return {
              type: 'waiting_kdt_then_voting',
              label: 'KDT + Abstimmung',
              fullLabel: 'Warten auf KDT, dann Kommando-Abstimmung',
              person: null,
              icon: Crown,
              color: 'bg-purple-100 text-purple-700 border-purple-200',
              hasVotingAfter: true
            };
          }
          return {
            type: 'waiting_kdt',
            label: 'Warten auf KDT',
            fullLabel: 'Warten auf Kommandant',
            person: null,
            icon: Crown,
            color: 'bg-purple-100 text-purple-700 border-purple-200'
          };
        }
        return {
          type: 'submitted',
          label: 'Eingereicht',
          fullLabel: 'Eingereicht - Bearbeitung ausstehend',
          person: null,
          icon: Clock,
          color: 'bg-orange-100 text-orange-700 border-orange-200'
        };

      case 'ausstehend_bereichsleitung':
        return {
          type: 'waiting_bl',
          label: 'Warten auf BL',
          fullLabel: 'Warten auf Bereichsleitung',
          person: bereichsleiter?.full_name,
          icon: Users,
          color: 'bg-amber-100 text-amber-700 border-amber-200'
        };

      case 'ausstehend_kommandant':
        // Zeige Hinweis wenn danach noch Kommando-Abstimmung kommt
        if (order.requires_kommandomitglied_approval) {
          return {
            type: 'waiting_kdt_then_voting',
            label: 'KDT + Abstimmung',
            fullLabel: 'Warten auf KDT, dann Kommando-Abstimmung',
            person: null,
            icon: Crown,
            color: 'bg-purple-100 text-purple-700 border-purple-200',
            hasVotingAfter: true
          };
        }
        return {
          type: 'waiting_kdt',
          label: 'Warten auf KDT',
          fullLabel: 'Warten auf Kommandant',
          person: null,
          icon: Crown,
          color: 'bg-purple-100 text-purple-700 border-purple-200'
        };

      case 'ausstehend_kommandomitglieder':
        return {
          type: 'voting',
          label: voteSummary ? `Abstimmung ${voteSummary.approveCount + voteSummary.rejectCount}/${voteSummary.totalVoters}` : 'Abstimmung',
          fullLabel: 'Kommando-Abstimmung läuft',
          person: null,
          icon: Vote,
          color: 'bg-blue-100 text-blue-700 border-blue-200',
          voteSummary
        };

      case 'freigegeben_bereichsleitung':
        // Zeige Hinweis wenn danach noch Kommando-Abstimmung kommt
        if (order.requires_kommandomitglied_approval) {
          return {
            type: 'waiting_kdt_then_voting',
            label: 'KDT + Abstimmung',
            fullLabel: 'BL freigegeben - Warten auf KDT, dann Kommando-Abstimmung',
            person: null,
            icon: Crown,
            color: 'bg-purple-100 text-purple-700 border-purple-200',
            hasVotingAfter: true
          };
        }
        return {
          type: 'waiting_kdt',
          label: 'Warten auf KDT',
          fullLabel: 'BL freigegeben - Warten auf Kommandant',
          person: null,
          icon: Crown,
          color: 'bg-purple-100 text-purple-700 border-purple-200'
        };

      case 'freigegeben_kommandant':
        if (order.requires_kommandomitglied_approval && !order.kommandomitglied_approved_at) {
          return {
            type: 'voting',
            label: voteSummary ? `Abstimmung ${voteSummary.approveCount + voteSummary.rejectCount}/${voteSummary.totalVoters}` : 'Abstimmung',
            fullLabel: 'KDT freigegeben - Kommando-Abstimmung erforderlich',
            person: null,
            icon: Vote,
            color: 'bg-blue-100 text-blue-700 border-blue-200',
            voteSummary
          };
        }
        return {
          type: 'ready',
          label: 'Bereit',
          fullLabel: 'Bereit zur Bestellung',
          person: null,
          icon: CheckCircle,
          color: 'bg-green-100 text-green-700 border-green-200'
        };

      case 'genehmigt':
        if (!order.order_executed) {
          return {
            type: 'ready',
            label: 'Bereit',
            fullLabel: 'Genehmigt - Bereit zur Bestellung',
            person: null,
            icon: CheckCircle,
            color: 'bg-green-100 text-green-700 border-green-200'
          };
        } else if (!order.order_received) {
          return {
            type: 'delivery',
            label: 'Bestellt',
            fullLabel: 'Bestellt - Warten auf Lieferung',
            person: null,
            icon: Clock,
            color: 'bg-sky-100 text-sky-700 border-sky-200'
          };
        }
        return null;

      case 'abgelehnt':
        return {
          type: 'rejected',
          label: 'Abgelehnt',
          fullLabel: 'Bestellung wurde abgelehnt',
          person: null,
          icon: AlertTriangle,
          color: 'bg-red-100 text-red-700 border-red-200'
        };

      default:
        return null;
    }
  };

  const workflowInfo = getWorkflowInfo();

  if (!workflowInfo) return null;

  const Icon = workflowInfo.icon;

  return (
    <div data-ev-id="ev_52003447c4" className="flex flex-wrap items-center gap-1.5">
      {/* Haupt-Workflow-Badge */}
      <span data-ev-id="ev_c19b8ee890"
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${workflowInfo.color}`}
      title={workflowInfo.fullLabel}>

        <Icon className="w-3 h-3" />
        {compact ? workflowInfo.label : workflowInfo.fullLabel}
      </span>
      
      {/* Person die handeln muss */}
      {workflowInfo.person && !compact &&
      <span data-ev-id="ev_5d949c9556"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 border border-gray-200"
      title={`Zugewiesen an: ${workflowInfo.person}`}>

          <User className="w-3 h-3" />
          {workflowInfo.person.split(' ').slice(-1)[0]} {/* Nur Nachname */}
        </span>
      }
      
      {/* Abstimmungs-Fortschritt */}
      {workflowInfo.type === 'voting' && workflowInfo.voteSummary && !compact &&
      <span data-ev-id="ev_75d694ff4a" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600 border border-blue-200">
          <Vote className="w-3 h-3" />
          {workflowInfo.voteSummary.approveCount} ✓ / {workflowInfo.voteSummary.rejectCount} ✗
        </span>
      }
      
      {/* Hinweis: Kommando-Abstimmung folgt nach BL oder KDT */}
      {/* Wenn bereits Stimmen abgegeben wurden, zeige Fortschritt statt "folgt" */}
      {(workflowInfo.type === 'waiting_kdt_then_voting' || workflowInfo.type === 'waiting_bl_then_voting') &&
      <span data-ev-id="ev_voting_hint" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600 border border-blue-200">
          <Vote className="w-3 h-3" />
          {voteSummary && (voteSummary.approveCount + voteSummary.rejectCount) > 0 
            ? (compact 
                ? `${voteSummary.approveCount + voteSummary.rejectCount}/${voteSummary.totalVoters}` 
                : `Abstimmung läuft ${voteSummary.approveCount + voteSummary.rejectCount}/${voteSummary.totalVoters}`)
            : (compact ? 'Abstimmung' : 'Abstimmung folgt')
          }
        </span>
      }
      
      {/* Überfällig-Warnung */}
      {overdue &&
      <span data-ev-id="ev_a1c9778fc4"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200 animate-pulse"
      title={`Überfällig seit ${waitingDays} Tag${waitingDays !== 1 ? 'en' : ''}`}>

          <AlertTriangle className="w-3 h-3" />
          Überfällig
        </span>
      }
      
      {/* Wartezeit (nur wenn > 2 Tage und nicht überfällig) */}
      {!overdue && waitingDays >= 2 && !compact && ['waiting_bl', 'waiting_bl_then_voting', 'waiting_kdt', 'waiting_kdt_then_voting', 'voting'].includes(workflowInfo.type) &&
      <span data-ev-id="ev_517f36c94b"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 border border-gray-200"
      title={`Wartet seit ${waitingDays} Tagen`}>

          <Clock className="w-3 h-3" />
          {waitingDays}d
        </span>
      }
    </div>);

}

// Kompakte Version für enge Listen (nur Icon + Kurztext)
export function WorkflowBadgeCompact(props: Omit<WorkflowBadgeProps, 'compact'>) {
  return <WorkflowBadge {...props} compact={true} />;
}