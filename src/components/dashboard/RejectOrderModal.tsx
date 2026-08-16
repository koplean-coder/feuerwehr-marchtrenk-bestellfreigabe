import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { Order } from '@/hooks/useOrders';

interface RejectOrderModalProps {
  order: Order;
  onClose: () => void;
  onReject: (orderId: string, reason: string) => Promise<{error: Error | null;}>;
}

export function RejectOrderModal({ order, onClose, onReject }: RejectOrderModalProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const handleReject = async () => {
    if (!rejectReason.trim()) return;

    setRejecting(true);
    const { error } = await onReject(order.id, rejectReason);
    setRejecting(false);

    if (!error) {
      onClose();
    }
  };

  return (
    <div data-ev-id="ev_a1fa379dcf" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div data-ev-id="ev_700bc66b04" className="bg-card rounded-xl border border-border p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div data-ev-id="ev_94a7b33566" className="flex items-center justify-between mb-4">
          <h3 data-ev-id="ev_69300299cf" className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Bestellung ablehnen
          </h3>
          <button data-ev-id="ev_6dbff3b3dc" onClick={onClose} className="p-2.5 hover:bg-muted rounded-lg transition-colors touch-manipulation">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div data-ev-id="ev_388beac21e" className="mb-4 p-3 bg-muted/50 rounded-lg">
          <p data-ev-id="ev_cc2af639f5" className="text-sm font-medium text-foreground">{order.title}</p>
          <p data-ev-id="ev_d4738aec50" className="text-sm text-muted-foreground">
            {order.amount?.toFixed(2)} €
          </p>
        </div>

        <div data-ev-id="ev_b1c688722a" className="mb-4">
          <label data-ev-id="ev_e443471360" className="block text-sm font-medium text-foreground mb-2">
            Ablehnungsgrund *
          </label>
          <textarea data-ev-id="ev_68cc83c0b0"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Bitte geben Sie einen Grund für die Ablehnung an..."
          className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          rows={3}
          disabled={rejecting} />

        </div>

        <div data-ev-id="ev_96c664e20e" className="flex gap-3">
          <button data-ev-id="ev_aacb281af5"
          onClick={onClose}
          disabled={rejecting}
          className="flex-1 px-4 py-2.5 border border-input rounded-lg font-medium hover:bg-muted transition-colors disabled:opacity-50">
            Abbrechen
          </button>
          <button data-ev-id="ev_fe1de40dba"
          onClick={handleReject}
          disabled={rejecting || !rejectReason.trim()}
          className="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {rejecting ?
            <span data-ev-id="ev_b4cae9b557" className="w-5 h-5 border-2 border-destructive-foreground/30 border-t-destructive-foreground rounded-full animate-spin" /> :

            'Ablehnen'
            }
          </button>
        </div>
      </div>
    </div>);

}