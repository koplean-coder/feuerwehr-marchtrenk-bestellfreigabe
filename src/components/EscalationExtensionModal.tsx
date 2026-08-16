import { useState } from 'react';
import { X, Clock, Calendar, AlertCircle } from 'lucide-react';

interface EscalationExtensionModalProps {
  orderTitle: string;
  currentDeadline: Date; // Die aktuelle Frist (berechnet oder verlängert)
  isExtended: boolean; // Ob bereits verlängert wurde
  onClose: () => void;
  onExtend: (days: number, reason: string) => Promise<void>;
}

const QUICK_OPTIONS = [
{ label: '2 Tage', days: 2 },
{ label: '4 Tage', days: 4 },
{ label: '1 Woche', days: 7 },
{ label: '2 Wochen', days: 14 },
{ label: '4 Wochen', days: 28 }];


export function EscalationExtensionModal({
  orderTitle,
  currentDeadline,
  isExtended,
  onClose,
  onExtend
}: EscalationExtensionModalProps) {
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [customDays, setCustomDays] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const effectiveDays = selectedDays ?? (customDays ? parseInt(customDays, 10) : null);
  const isValid = effectiveDays && effectiveDays > 0 && reason.trim().length > 0;

  const handleQuickSelect = (days: number) => {
    setSelectedDays(days);
    setCustomDays('');
  };

  const handleCustomChange = (value: string) => {
    setCustomDays(value);
    setSelectedDays(null);
  };

  const handleSubmit = async () => {
    if (!effectiveDays || !reason.trim()) {
      setError('Bitte wählen Sie eine Verlängerung und geben Sie einen Grund an.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onExtend(effectiveDays, reason.trim());
      onClose();
    } catch (err) {
      setError('Fehler beim Verlängern der Eskalationsfrist.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate new deadline preview (addiert zur bisherigen Frist)
  const newDeadline = effectiveDays ? (() => {
    const date = new Date(currentDeadline);
    date.setDate(date.getDate() + effectiveDays);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  })() : null;

  // Format current deadline for display
  const currentDeadlineFormatted = currentDeadline.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div data-ev-id="ev_6bcd69301d" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div data-ev-id="ev_e0ba6a78f1" className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div data-ev-id="ev_48ef1c40e4" className="flex items-center justify-between p-4 border-b border-border">
          <div data-ev-id="ev_14673ad66d" className="flex items-center gap-3">
            <div data-ev-id="ev_0b1ba9d145" className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div data-ev-id="ev_8e618e4c1d">
              <h2 data-ev-id="ev_cc928e4a15" className="text-lg font-semibold text-foreground">Eskalationsfrist verlängern</h2>
              <p data-ev-id="ev_019631c6a9" className="text-sm text-muted-foreground truncate max-w-[200px]">{orderTitle}</p>
            </div>
          </div>
          <button data-ev-id="ev_b053e2bcac"
          onClick={onClose}
          className="p-2 hover:bg-muted rounded-lg transition-colors">

            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div data-ev-id="ev_cd99b10200" className="p-4 flex flex-col gap-4">
          {/* Current deadline info */}
          <div data-ev-id="ev_594e1da4c4" className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            <Calendar className="w-4 h-4" />
            <span data-ev-id="ev_8e5931b36d">
              {isExtended ? 'Aktuelle Frist (verlängert)' : 'Aktuelle Frist'}: {currentDeadlineFormatted} Uhr
            </span>
          </div>

          {/* Info about additive extension */}
          <div data-ev-id="ev_cb70978721" className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
            <Clock className="w-4 h-4" />
            <span data-ev-id="ev_e28d5417bb">Die Verlängerung wird zur bisherigen Frist addiert.</span>
          </div>

          {/* Quick select buttons */}
          <div data-ev-id="ev_e5cd0ede64">
            <label data-ev-id="ev_c8b18e0e5b" className="block text-sm font-medium text-foreground mb-2">
              Schnellauswahl
            </label>
            <div data-ev-id="ev_b48deec9e0" className="flex flex-wrap gap-2">
              {QUICK_OPTIONS.map((option) =>
              <button data-ev-id="ev_9fe9d35e9b"
              key={option.days}
              onClick={() => handleQuickSelect(option.days)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedDays === option.days ?
              'bg-amber-600 text-white' :
              'bg-muted hover:bg-muted/80 text-foreground'}`
              }>

                  {option.label}
                </button>
              )}
            </div>
          </div>

          {/* Custom days input */}
          <div data-ev-id="ev_8de436e5ee">
            <label data-ev-id="ev_3490d1c164" className="block text-sm font-medium text-foreground mb-2">
              Oder: Benutzerdefinierte Anzahl Tage
            </label>
            <input data-ev-id="ev_07f96a3070"
            type="number"
            min="1"
            max="90"
            value={customDays}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="z.B. 10"
            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" />

          </div>

          {/* New deadline preview */}
          {newDeadline &&
          <div data-ev-id="ev_7ce4eb5710" className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-sm text-green-700">
              <Calendar className="w-4 h-4" />
              <span data-ev-id="ev_3fd97e6c56">Neue Frist: <strong data-ev-id="ev_71fcb522bf">{newDeadline}</strong></span>
            </div>
          }

          {/* Reason input */}
          <div data-ev-id="ev_7dc868cde7">
            <label data-ev-id="ev_8197c384e8" className="block text-sm font-medium text-foreground mb-2">
              Grund für Verlängerung <span data-ev-id="ev_49e5a371b5" className="text-red-500">*</span>
            </label>
            <textarea data-ev-id="ev_9f621201c1"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="z.B. Urlaub des Bereichsleiters, Krankheit, Rücksprache erforderlich..."
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none" />

          </div>

          {/* Error message */}
          {error &&
          <div data-ev-id="ev_019db0409f" className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span data-ev-id="ev_e43d93f997">{error}</span>
            </div>
          }
        </div>

        {/* Footer */}
        <div data-ev-id="ev_9eadd20b40" className="flex justify-end gap-3 p-4 border-t border-border">
          <button data-ev-id="ev_3837e59095"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50">

            Abbrechen
          </button>
          <button data-ev-id="ev_703b905513"
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">

            {loading ?
            <>
                <div data-ev-id="ev_9f557c0f62" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Wird gespeichert...
              </> :

            <>
                <Clock className="w-4 h-4" />
                Frist verlängern
              </>
            }
          </button>
        </div>
      </div>
    </div>);

}