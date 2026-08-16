import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { Order } from '@/hooks/useOrders';

interface DeleteOrderModalProps {
  order: Order;
  onClose: () => void;
  onDelete: (orderId: string) => Promise<{error: Error | null;}>;
}

export function DeleteOrderModal({ order, onClose, onDelete }: DeleteOrderModalProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await onDelete(order.id);
    setDeleting(false);

    if (!error) {
      onClose();
    }
  };

  return (
    <div data-ev-id="ev_4d80a26b54" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div data-ev-id="ev_ca48d6ab0f" className="bg-card rounded-xl border border-border p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div data-ev-id="ev_bc80cc0940" className="flex items-center justify-between mb-4">
          <h3 data-ev-id="ev_4580ad2f3b" className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            Entwurf löschen
          </h3>
          <button data-ev-id="ev_19493b4531" onClick={onClose} className="p-2.5 hover:bg-muted rounded-lg transition-colors touch-manipulation">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div data-ev-id="ev_3d6046b830" className="mb-4 p-3 bg-muted/50 rounded-lg">
          <p data-ev-id="ev_4ec0e25f87" className="text-sm font-medium text-foreground">{order.title}</p>
          <p data-ev-id="ev_70ba8e1638" className="text-sm text-muted-foreground">
            {order.amount?.toFixed(2)} €
          </p>
        </div>

        <p data-ev-id="ev_0c43a21f50" className="text-sm text-muted-foreground mb-6">
          Möchten Sie diesen Entwurf wirklich unwiderruflich löschen?
        </p>

        <div data-ev-id="ev_269a4d4229" className="flex gap-3">
          <button data-ev-id="ev_2e1964ca13"
          onClick={onClose}
          disabled={deleting}
          className="flex-1 px-4 py-2.5 border border-input rounded-lg font-medium hover:bg-muted transition-colors disabled:opacity-50">
            Abbrechen
          </button>
          <button data-ev-id="ev_515653a71a"
          onClick={handleDelete}
          disabled={deleting}
          className="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {deleting ?
            <span data-ev-id="ev_3ec71bc7f5" className="w-5 h-5 border-2 border-destructive-foreground/30 border-t-destructive-foreground rounded-full animate-spin" /> :

            <>
                <Trash2 className="w-4 h-4" />
                Löschen
              </>
            }
          </button>
        </div>
      </div>
    </div>);

}