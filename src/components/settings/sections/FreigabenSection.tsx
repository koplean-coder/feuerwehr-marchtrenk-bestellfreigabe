import { useState } from 'react';
import { Euro, Save, Check } from 'lucide-react';
import { SectionHeader, SectionCard } from '../SettingsContent';

interface FreigabenSectionProps {
  freigabebetragKdt: number;
  freigabebetragKommandomitglied: number;
  updateFreigabebetragKdt: (value: number) => Promise<{error: Error | null;}>;
  updateFreigabebetragKommandomitglied: (value: number) => Promise<{error: Error | null;}>;
}

export function FreigabenSection({
  freigabebetragKdt,
  freigabebetragKommandomitglied,
  updateFreigabebetragKdt,
  updateFreigabebetragKommandomitglied
}: FreigabenSectionProps) {
  const [newBetragKdt, setNewBetragKdt] = useState('');
  const [newBetragKommando, setNewBetragKommando] = useState('');
  const [savingKdt, setSavingKdt] = useState(false);
  const [savingKommando, setSavingKommando] = useState(false);
  const [savedKdt, setSavedKdt] = useState(false);
  const [savedKommando, setSavedKommando] = useState(false);

  const handleSaveKdt = async () => {
    const value = parseFloat(newBetragKdt);
    if (isNaN(value) || value < 0) return;
    setSavingKdt(true);
    await updateFreigabebetragKdt(value);
    setSavingKdt(false);
    setSavedKdt(true);
    setNewBetragKdt('');
    setTimeout(() => setSavedKdt(false), 2000);
  };

  const handleSaveKommando = async () => {
    const value = parseFloat(newBetragKommando);
    if (isNaN(value) || value < 0) return;
    setSavingKommando(true);
    await updateFreigabebetragKommandomitglied(value);
    setSavingKommando(false);
    setSavedKommando(true);
    setNewBetragKommando('');
    setTimeout(() => setSavedKommando(false), 2000);
  };

  return (
    <div data-ev-id="ev_abfbdd7999">
      <SectionHeader
        icon={Euro}
        title="Freigabebeträge"
        description="Schwellwerte für die automatische Weiterleitung von Bestellungen." />


      <div data-ev-id="ev_b5f3aa1bc9" className="grid gap-4 md:grid-cols-2">
        {/* KDT Schwellwert */}
        <SectionCard
          title="Kommandant-Schwellwert"
          description="Ab diesem Betrag muss der Kommandant freigeben.">

          <div data-ev-id="ev_eab8c3fdf3" className="flex items-center gap-3 mb-4">
            <span data-ev-id="ev_f3235f3578" className="text-3xl font-bold text-primary">
              {freigabebetragKdt.toLocaleString('de-DE')} €
            </span>
          </div>
          <div data-ev-id="ev_a4970a1ca4" className="flex gap-2">
            <div data-ev-id="ev_f50e0a3938" className="relative flex-1">
              <span data-ev-id="ev_3c23756155" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              <input data-ev-id="ev_5fedf06be8"
              type="number"
              value={newBetragKdt}
              onChange={(e) => setNewBetragKdt(e.target.value)}
              placeholder="Neuer Betrag"
              className="w-full pl-8 pr-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20" />

            </div>
            <button data-ev-id="ev_c2147f9499"
            onClick={handleSaveKdt}
            disabled={savingKdt || !newBetragKdt}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">

              {savedKdt ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {savedKdt ? 'Gespeichert' : 'Speichern'}
            </button>
          </div>
        </SectionCard>

        {/* Kommandomitglied Schwellwert */}
        <SectionCard
          title="Kommandomitglied-Schwellwert"
          description="Ab diesem Betrag müssen Kommandomitglieder abstimmen.">

          <div data-ev-id="ev_9b2ea45094" className="flex items-center gap-3 mb-4">
            <span data-ev-id="ev_69491ed151" className="text-3xl font-bold text-amber-600">
              {freigabebetragKommandomitglied.toLocaleString('de-DE')} €
            </span>
          </div>
          <div data-ev-id="ev_ba41b0d68e" className="flex gap-2">
            <div data-ev-id="ev_ed37cc700f" className="relative flex-1">
              <span data-ev-id="ev_67021d9a82" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              <input data-ev-id="ev_b51e60c7e8"
              type="number"
              value={newBetragKommando}
              onChange={(e) => setNewBetragKommando(e.target.value)}
              placeholder="Neuer Betrag"
              className="w-full pl-8 pr-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20" />

            </div>
            <button data-ev-id="ev_d5320725ce"
            onClick={handleSaveKommando}
            disabled={savingKommando || !newBetragKommando}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">

              {savedKommando ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {savedKommando ? 'Gespeichert' : 'Speichern'}
            </button>
          </div>
        </SectionCard>
      </div>
    </div>);

}