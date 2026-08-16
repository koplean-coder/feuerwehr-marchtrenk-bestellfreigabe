import { useState } from 'react';
import { Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { OrderCard } from '@/components/OrderCard';
import type { Order } from '@/hooks/useOrders';

interface CollapsibleOrderSectionProps {
  title: string;
  icon: React.ReactNode;
  orders: Order[];
  defaultExpanded?: boolean;
  showCreator?: boolean;
  emptyMessage?: string;
}

export function CollapsibleOrderSection({
  title,
  icon,
  orders,
  defaultExpanded = false,
  showCreator = true,
  emptyMessage
}: CollapsibleOrderSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (orders.length === 0 && !emptyMessage) return null;

  return (
    <div data-ev-id="ev_86f314022a" className="bg-card rounded-xl border border-border overflow-hidden mb-4">
      <button data-ev-id="ev_4c1be8a00c"
      onClick={() => setIsExpanded(!isExpanded)}
      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
        <div data-ev-id="ev_40fa0b7e6f" className="flex items-center gap-3">
          {icon}
          <span data-ev-id="ev_5797ca2d57" className="font-medium text-foreground">{title}</span>
          <span data-ev-id="ev_f13744601b" className="px-2 py-0.5 bg-muted text-muted-foreground text-sm rounded-full">
            {orders.length}
          </span>
        </div>
        <div data-ev-id="ev_01aeb1e710" className="flex items-center gap-2 text-muted-foreground">
          {isExpanded ?
          <>
              <EyeOff className="w-4 h-4" />
              <span data-ev-id="ev_c4bcec15d6" className="text-sm">Ausblenden</span>
              <ChevronUp className="w-4 h-4" />
            </> :

          <>
              <Eye className="w-4 h-4" />
              <span data-ev-id="ev_9ed0715661" className="text-sm">Anzeigen</span>
              <ChevronDown className="w-4 h-4" />
            </>
          }
        </div>
      </button>

      {isExpanded &&
      <div data-ev-id="ev_4b1ddebf65" className="border-t border-border">
          {orders.length === 0 ?
        <p data-ev-id="ev_a41b65fc40" className="p-4 text-sm text-muted-foreground text-center">{emptyMessage}</p> :

        <div data-ev-id="ev_01a0dd61d4" className="p-4 flex flex-col gap-3">
              {orders.map((order) =>
          <OrderCard key={order.id} order={order} showCreator={showCreator} />
          )}
            </div>
        }
        </div>
      }
    </div>);

}