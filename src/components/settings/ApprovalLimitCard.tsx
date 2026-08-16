import { useState } from 'react';
import { Euro, Save, Check } from 'lucide-react';

interface ApprovalLimitCardProps {
  title: string;
  subtitle: string;
  currentValue: number;
  onSave: (value: number) => Promise<{error: Error | null;}>;
  iconColor?: string;
  bgColor?: string;
}

export function ApprovalLimitCard({
  title,
  subtitle,
  currentValue,
  onSave,
  iconColor = 'text-primary',
  bgColor = 'bg-primary/10'
}: ApprovalLimitCardProps) {
  const [newValue, setNewValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const value = parseFloat(newValue);
    if (isNaN(value) || value < 0) return;

    setSaving(true);
    const { error } = await onSave(value);
    setSaving(false);

    if (!error) {
      setSaved(true);
      setNewValue('');
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div data-ev-id="ev_39ff07c933" className="bg-card rounded-xl border border-border p-5">
      <div data-ev-id="ev_6f51749fd2" className="flex items-center gap-3 mb-4">
        <div data-ev-id="ev_6ea1c4163b" className={`p-2 ${bgColor} rounded-lg`}>
          <Euro className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div data-ev-id="ev_fe51bf3f0e">
          <h3 data-ev-id="ev_44f5cd5567" className="font-semibold text-foreground">{title}</h3>
          <p data-ev-id="ev_f23779714b" className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div data-ev-id="ev_9a599385f3" className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg mb-4">
        <Euro className="w-5 h-5 text-green-600" />
        <span data-ev-id="ev_49b49e5e1b" className="text-2xl font-bold text-foreground">
          {currentValue.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
        </span>
      </div>

      <p data-ev-id="ev_128ca9c682" className="text-sm text-muted-foreground mb-4">
        {subtitle}
      </p>

      <div data-ev-id="ev_2966163d33" className="flex gap-2">
        <div data-ev-id="ev_ebea52a9da" className="relative flex-1">
          <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input data-ev-id="ev_955121bab3"
          type="number"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Neuer Betrag"
          step="0.01"
          min="0"
          className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />

        </div>
        <button data-ev-id="ev_082a10ec51"
        onClick={handleSave}
        disabled={saving || !newValue || parseFloat(newValue) < 0}
        className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'OK' : 'Speichern'}
        </button>
      </div>
    </div>);

}