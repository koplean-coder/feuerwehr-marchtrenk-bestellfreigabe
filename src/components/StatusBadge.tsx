/* eslint-disable react-refresh/only-export-components */
import type { OrderStatus } from '@/hooks/useOrders';

interface StatusBadgeProps {
  status: OrderStatus;
  showKommandantInfo?: boolean;
  belowMinOrderValue?: boolean;
}

export function StatusBadge({ status, showKommandantInfo, belowMinOrderValue }: StatusBadgeProps) {
  const getStatusConfig = (status: OrderStatus) => {
    // Show special badge for approved orders below minimum order value
    if ((status === 'genehmigt' || status === 'eingereicht' || status === 'ausstehend_bereichsleitung' || status === 'ausstehend_kommandant' || status === 'freigegeben_bereichsleitung' || status === 'freigegeben_kommandant') && belowMinOrderValue) {
      return {
        label: 'Mindestbestellwert nicht erreicht',
        className: 'bg-amber-500 text-white'
      };
    }

    switch (status) {
      case 'entwurf':
        return {
          label: 'Entwurf',
          className: 'bg-gray-400 text-white'
        };
      case 'eingereicht':
        return {
          label: 'Eingereicht',
          className: 'bg-orange-500 text-white'
        };
      case 'ausstehend_bereichsleitung':
        return {
          label: 'Ausstehend Bereichsleitung',
          className: 'bg-violet-500 text-white'
        };
      case 'ausstehend_kommandant':
        return {
          label: 'Ausstehend Kommandant',
          className: 'bg-blue-500 text-white'
        };
      case 'freigegeben_bereichsleitung':
        return {
          label: 'Freigegeben Bereichsleitung',
          className: 'bg-green-300 text-green-900'
        };
      case 'freigegeben_kommandant':
        return {
          label: 'Freigegeben Kommandant',
          className: 'bg-green-500 text-white'
        };
      case 'genehmigt':
        return {
          label: 'Genehmigt',
          className: 'bg-green-600 text-white'
        };
      case 'abgelehnt':
        return {
          label: 'Abgelehnt',
          className: 'bg-red-500 text-white'
        };
      case 'abgeschlossen':
        return {
          label: 'Abgeschlossen',
          className: 'bg-slate-500 text-white'
        };
      default:
        return {
          label: status,
          className: 'bg-gray-500 text-white'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span data-ev-id="ev_e794f0f734" className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>);

}

export function getRowBackgroundColor(status: OrderStatus, requiresKommandant: boolean): string {
  switch (status) {
    case 'entwurf':
      return 'bg-gray-400/10 hover:bg-gray-400/20';
    case 'genehmigt':
      return 'bg-green-600/10 hover:bg-green-600/20';
    case 'freigegeben_bereichsleitung':
      return 'bg-green-300/20 hover:bg-green-300/30';
    case 'freigegeben_kommandant':
      return 'bg-green-500/10 hover:bg-green-500/20';
    case 'ausstehend_kommandant':
      return 'bg-blue-500/10 hover:bg-blue-500/20';
    case 'eingereicht':
    case 'ausstehend_bereichsleitung':
      return 'bg-orange-500/10 hover:bg-orange-500/20';
    case 'abgelehnt':
      return 'bg-red-500/10 hover:bg-red-500/20';
    case 'abgeschlossen':
      return 'bg-slate-500/10 hover:bg-slate-500/20';
    default:
      return 'hover:bg-muted';
  }
}