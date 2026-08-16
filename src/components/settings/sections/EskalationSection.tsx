import { useState } from 'react';
import { Clock, Save, Check, AlertTriangle } from 'lucide-react';
import { SectionHeader, SectionCard } from '../SettingsContent';

interface EskalationSectionProps {
  escalationTimeoutHours: number;
  updateEscalationTimeoutHours: (value: number) => Promise<{error: Error | null;}>;
}

export function EskalationSection({
  escalationTimeoutHours,
  updateEscalationTimeoutHours
}: EskalationSectionProps) {
  const [newTimeout, setNewTimeout] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const value = parseInt(newTimeout);
    if (isNaN(value) || value < 1) return;
    setSaving(true);
    await updateEscalationTimeoutHours(value);
    setSaving(false);
    setSaved(true);
    setNewTimeout('');
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div data-ev-id="ev_9bd914dae8">
      <SectionHeader
        icon={Clock}
        title="Eskalation & Timeouts"
        description="Zeitlimits für automatische Eskalationen bei ausbleibender Freigabe." />


      <SectionCard
        title="Eskalations-Timeout"
        description="Nach dieser Zeit ohne Reaktion wird die Bestellung automatisch eskaliert.">

        <div data-ev-id="ev_a9981ecd59" className="flex items-center gap-4 mb-4">
          <div data-ev-id="ev_0fbd10b7ad" className="p-3 bg-amber-100 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div data-ev-id="ev_9e6a69d4b1">
            <span data-ev-id="ev_a3a86c8f39" className="text-3xl font-bold text-foreground">
              {escalationTimeoutHours}
            </span>
            <span data-ev-id="ev_e6b7a3e4d9" className="text-lg text-muted-foreground ml-2">Stunden</span>
          </div>
        </div>
        
        <p data-ev-id="ev_a81d8c1200" className="text-sm text-muted-foreground mb-4">
          Wenn ein Bereichsleiter oder Kommandant nicht innerhalb dieser Zeit reagiert,
          wird die Bestellung automatisch an die nächste Instanz eskaliert.
        </p>

        <div data-ev-id="ev_256e7851bf" className="flex gap-2">
          <div data-ev-id="ev_0f0551103c" className="relative flex-1">
            <input data-ev-id="ev_40ac01bc17"
            type="number"
            min="1"
            value={newTimeout}
            onChange={(e) => setNewTimeout(e.target.value)}
            placeholder="Stunden eingeben"
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20" />

          </div>
          <button data-ev-id="ev_057727f4a0"
          onClick={handleSave}
          disabled={saving || !newTimeout}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">

            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Gespeichert' : 'Speichern'}
          </button>
        </div>
      </SectionCard>
    </div>);

}