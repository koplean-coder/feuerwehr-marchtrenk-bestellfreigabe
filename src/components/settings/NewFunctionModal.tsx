import { useState } from 'react';
import { X, Briefcase, CheckCircle } from 'lucide-react';

interface NewFunctionModalProps {
  onClose: () => void;
  onCreateFunction: (name: string, description: string) => Promise<{error: Error | null;}>;
}

export function NewFunctionModal({ onClose, onCreateFunction }: NewFunctionModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const { error } = await onCreateFunction(name.toLowerCase().trim(), description.trim());

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Funktion erfolgreich erstellt!');
      setTimeout(() => {
        onClose();
      }, 1500);
    }
    setLoading(false);
  };

  return (
    <div data-ev-id="ev_a078cf9797" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div data-ev-id="ev_4757d711e5" className="bg-card rounded-lg border border-border shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto overflow-hidden">
        <div data-ev-id="ev_417764da4c" className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div data-ev-id="ev_255b18c5d6" className="flex items-center gap-3">
            <div data-ev-id="ev_155bbb7a57" className="p-2 bg-orange-100 rounded-lg">
              <Briefcase className="w-5 h-5 text-orange-600" />
            </div>
            <h3 data-ev-id="ev_fda30ce603" className="font-semibold text-foreground">Neue Funktion anlegen</h3>
          </div>
          <button data-ev-id="ev_7b3f3a0246"
          onClick={onClose}
          className="p-2.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground touch-manipulation">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form data-ev-id="ev_8dcfd27dec" onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {error &&
          <div data-ev-id="ev_0f022e8597" className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          }
          {success &&
          <div data-ev-id="ev_b07efb488c" className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          }

          <div data-ev-id="ev_5c688993f4">
            <label data-ev-id="ev_055b2ff9e9" className="block text-sm font-medium text-foreground mb-1.5">Name *</label>
            <input data-ev-id="ev_f1903dab3a"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. kassier, schriftfuehrer"
            className="w-full px-3 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-base"
            required />

            <p data-ev-id="ev_b7679da331" className="text-xs text-muted-foreground mt-1">
              Kleinbuchstaben, keine Umlaute/Sonderzeichen
            </p>
          </div>

          <div data-ev-id="ev_4c038f48d1">
            <label data-ev-id="ev_9c44476ae7" className="block text-sm font-medium text-foreground mb-1.5">Beschreibung</label>
            <input data-ev-id="ev_c0d34913e4"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kurze Beschreibung der Funktion"
            className="w-full px-3 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-base" />

          </div>

          <div data-ev-id="ev_d6a6f98e12" className="flex gap-3 mt-2">
            <button data-ev-id="ev_178247ff00"
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-input rounded-lg font-medium hover:bg-muted transition-colors">
              Abbrechen
            </button>
            <button data-ev-id="ev_afe26f220d"
            type="submit"
            disabled={loading || !name.trim()}
            className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading ? 'Erstelle...' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>);

}