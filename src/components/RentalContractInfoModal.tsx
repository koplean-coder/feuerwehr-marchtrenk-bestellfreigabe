import { X, Calendar, User, MapPin, Euro, FileText, Package, ExternalLink } from 'lucide-react';
import { Link } from 'react-router';
import { PendingRentalInvoice } from '@/hooks/usePendingRentalInvoices';

interface RentalContractInfoModalProps {
  contract: PendingRentalInvoice;
  onClose: () => void;
}

export function RentalContractInfoModal({ contract, onClose }: RentalContractInfoModalProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-AT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div
      data-ev-id="ev_rental_info_modal_backdrop"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>

      <div
        data-ev-id="ev_rental_info_modal"
        className="bg-card rounded-xl border border-border w-full max-w-md shadow-xl">

        {/* Header */}
        <div data-ev-id="ev_2d8fece97b" className="flex items-center justify-between p-4 border-b border-border">
          <div data-ev-id="ev_9ad83b7c9a" className="flex items-center gap-3">
            <div data-ev-id="ev_70d6c2fefd" className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <div data-ev-id="ev_66f899e740">
              <h2 data-ev-id="ev_c45e7ec776" className="font-semibold text-lg text-foreground">{contract.contract_number}</h2>
              <p data-ev-id="ev_d6b665c716" className="text-sm text-muted-foreground">Leihvertrag</p>
            </div>
          </div>
          <button data-ev-id="ev_01799f9d8f"
          onClick={onClose}
          className="p-2 hover:bg-muted rounded-lg transition-colors">

            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div data-ev-id="ev_abf4853fa0" className="p-4 flex flex-col gap-4">
          {/* Kunde */}
          <div data-ev-id="ev_20b7d7ee50" className="flex items-start gap-3">
            <div data-ev-id="ev_72b6027048" className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div data-ev-id="ev_d58fbf5c54">
              <p data-ev-id="ev_4cdb80565a" className="text-xs text-muted-foreground">Kunde</p>
              <p data-ev-id="ev_8208a1f658" className="font-medium text-foreground">{contract.customer_name}</p>
            </div>
          </div>

          {/* Zeitraum */}
          <div data-ev-id="ev_73ce702a79" className="flex items-start gap-3">
            <div data-ev-id="ev_4521391295" className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-green-600" />
            </div>
            <div data-ev-id="ev_95b74aa8fa">
              <p data-ev-id="ev_92e3511844" className="text-xs text-muted-foreground">Mietzeitraum</p>
              <p data-ev-id="ev_c97794d372" className="font-medium text-foreground">
                {formatDate(contract.rental_start)} – {formatDate(contract.rental_end)}
              </p>
            </div>
          </div>

          {/* Betrag */}
          <div data-ev-id="ev_b1ad5df323" className="flex items-start gap-3">
            <div data-ev-id="ev_62be001d55" className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Euro className="w-4 h-4 text-amber-600" />
            </div>
            <div data-ev-id="ev_6b784bf6e2">
              <p data-ev-id="ev_bd1ef1aaf9" className="text-xs text-muted-foreground">Gesamtbetrag</p>
              <p data-ev-id="ev_ac3804029f" className="font-semibold text-lg text-foreground">€ {contract.total_amount.toFixed(2)}</p>
            </div>
          </div>

          {/* Erstellt am */}
          <div data-ev-id="ev_6b057a820d" className="flex items-start gap-3">
            <div data-ev-id="ev_1b72d9f390" className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4 text-gray-600" />
            </div>
            <div data-ev-id="ev_e87019f86a">
              <p data-ev-id="ev_99202238b6" className="text-xs text-muted-foreground">Erstellt am</p>
              <p data-ev-id="ev_d7e361f765" className="font-medium text-foreground">{formatDate(contract.created_at)}</p>
            </div>
          </div>

          {/* Info-Box */}
          <div data-ev-id="ev_d1a8837360" className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
            <p data-ev-id="ev_62fc443c55" className="text-sm text-amber-800">
              <strong data-ev-id="ev_9b55e04bc1">Aktion erforderlich:</strong> Bitte Rechnung im Buchhaltungssystem erstellen.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div data-ev-id="ev_8ed1ffe1bb" className="flex gap-3 p-4 border-t border-border">
          <button data-ev-id="ev_c3562a5cc7"
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors font-medium">

            Schließen
          </button>
          <Link
            to="/antragsformulare"
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">

            <ExternalLink className="w-4 h-4" />
            Zur Bearbeitung
          </Link>
        </div>
      </div>
    </div>);

}