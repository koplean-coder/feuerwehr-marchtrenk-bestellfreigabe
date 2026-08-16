import { Link } from 'react-router';
import type { Order } from '@/hooks/useOrders';
import { StatusBadge, getRowBackgroundColor } from '@/components/StatusBadge';
import { WorkflowBadge } from '@/components/WorkflowBadge';
import { useProfiles } from '@/hooks/useProfiles';
import { useSettings } from '@/hooks/useSettings';
import { Calendar, Euro, User, Building2, AlertCircle, Receipt, TrendingUp, Clock, Layers, Package, PackageCheck } from 'lucide-react';
import { ORDER_DAY_OPTIONS } from '@/hooks/useSuppliers';

interface VoteSummary {
  approveCount: number;
  rejectCount: number;
  totalVoters: number;
}

interface OrderCardProps {
  order: Order;
  showCreator?: boolean;
  belowMinOrderValue?: boolean;
  showSupplierDetails?: boolean;
  isCollectiveOrder?: boolean;
  collectiveOrderCount?: number;
  onCollectiveOrderClick?: () => void;
  voteSummary?: VoteSummary | null;
}

export function OrderCard({ order, showCreator = true, belowMinOrderValue = false, showSupplierDetails = true, isCollectiveOrder = false, collectiveOrderCount = 0, onCollectiveOrderClick, voteSummary }: OrderCardProps) {
  const { profiles } = useProfiles();
  const { escalationTimeoutHours } = useSettings();
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInvoiceToLabel = (invoiceTo: string | null) => {
    if (invoiceTo === 'gemeinde') return 'Gemeinde';
    if (invoiceTo === 'feuerwehr') return 'Feuerwehr';
    return null;
  };

  return (
    <Link
      to={`/bestellungen/${order.id}`}
      className={`block p-4 rounded-lg border border-border transition-all ${getRowBackgroundColor(order.status, order.requires_kommandant_approval)}`}>

      <div data-ev-id="ev_18926ad37f" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div data-ev-id="ev_bd98b720ce" className="flex-1 min-w-0">
          <h3 data-ev-id="ev_c1ad138861" className="font-semibold text-foreground truncate">{order.title}</h3>
          {order.description &&
          <p data-ev-id="ev_1252984fb1" className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {order.description}
            </p>
          }
          <div data-ev-id="ev_2898ec0375" className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-muted-foreground">
            <span data-ev-id="ev_da35678d71" className="flex items-center gap-1">
              <Euro className="w-4 h-4" />
              {formatCurrency(order.amount)}
            </span>
            <span data-ev-id="ev_18f60c0450" className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(order.created_at)}
            </span>
            {showCreator && order.creator &&
            <span data-ev-id="ev_6d59d7429a" className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {order.creator.full_name || order.creator.email}
              </span>
            }
            {order.supplier &&
            <span data-ev-id="ev_b00c144da1" className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                {order.supplier.name}
              </span>
            }
            {/* Mindestbestellwert */}
            {showSupplierDetails && order.supplier?.minimum_order_value && order.supplier.minimum_order_value > 0 &&
            <span data-ev-id="ev_dad296356e" className="flex items-center gap-1 text-amber-600">
                <TrendingUp className="w-4 h-4" />
                Min: {order.supplier.minimum_order_value.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
              </span>
            }
            {/* Bestelltage */}
            {showSupplierDetails && order.supplier?.order_days && order.supplier.order_days.length > 0 &&
            <span data-ev-id="ev_58553a7275" className="flex items-center gap-1 text-blue-600">
                <Clock className="w-4 h-4" />
                {order.supplier.order_days.map((day) => {
                const label = ORDER_DAY_OPTIONS.find((d) => d.id === day)?.label || day;
                return label.slice(0, 2);
              }).join(', ')}
              </span>
            }
            {order.invoice_to &&
            <span data-ev-id="ev_26b0b9cd65" className="flex items-center gap-1 text-primary font-medium">
                <Receipt className="w-4 h-4" />
                {getInvoiceToLabel(order.invoice_to)}
              </span>
            }
          </div>
        </div>
        
        <div data-ev-id="ev_5dcd9715fd" className="flex flex-col items-end gap-2">
          <StatusBadge status={order.status} belowMinOrderValue={belowMinOrderValue} />
          {/* Workflow-Status Badge */}
          <WorkflowBadge 
            order={order} 
            profiles={profiles} 
            escalationTimeoutHours={escalationTimeoutHours}
            voteSummary={voteSummary}
            compact={true}
          />
          {/* Sammelbestellung Badge */}
          {isCollectiveOrder && collectiveOrderCount > 1 &&
          <button data-ev-id="ev_9645309dcd"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCollectiveOrderClick?.();
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 transition-colors cursor-pointer"
          title="Sammelbestellung nötig">
              <Layers className="w-3.5 h-3.5" />
              Sammelbestellung ({collectiveOrderCount})
            </button>
          }
          {order.requires_kommandant_approval && order.status !== 'genehmigt' && order.status !== 'freigegeben_kommandant' && order.status !== 'abgelehnt' &&
          <span data-ev-id="ev_f34145857b" className="flex items-center gap-1 text-xs text-blue-600">
              <AlertCircle className="w-3 h-3" />
              KDT-Freigabe erforderlich
            </span>
          }
        </div>
      </div>
      
      {/* Status Messages */}
      {(order.order_executed || order.order_received) &&
      <div data-ev-id="ev_9386ad1577" className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-3">
          {order.order_executed &&
        <span data-ev-id="ev_85e1687fae" className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              <Package className="w-3.5 h-3.5" />
              Bestellung ausgelöst
              {order.order_executed_at &&
          <span data-ev-id="ev_cfd85330e0" className="text-blue-500">• {formatDateTime(order.order_executed_at)}</span>
          }
            </span>
        }
          {order.order_received &&
        <span data-ev-id="ev_a839214d47" className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              <PackageCheck className="w-3.5 h-3.5" />
              Ware erhalten
              {order.order_received_at &&
          <span data-ev-id="ev_5cfb5b17b0" className="text-green-500">• {formatDateTime(order.order_received_at)}</span>
          }
            </span>
        }
        </div>
      }
    </Link>);

}