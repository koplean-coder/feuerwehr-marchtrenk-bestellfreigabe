import { useState } from 'react';
import { X, UserPlus, CheckCircle } from 'lucide-react';
import type { UserRole } from '@/hooks/useProfiles';

interface NewUserModalProps {
  onClose: () => void;
  onCreateUser: (email: string, password: string, fullName: string, role: UserRole) => Promise<{error: Error | null;}>;
}

export function NewUserModal({ onClose, onCreateUser }: NewUserModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('mitglied');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const { error } = await onCreateUser(email, password, fullName, role);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Benutzer erfolgreich erstellt!');
      setTimeout(() => {
        onClose();
      }, 1500);
    }
    setLoading(false);
  };

  return (
    <div data-ev-id="ev_5c7cfd9805" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div data-ev-id="ev_264b1ab57c" className="bg-card rounded-lg border border-border shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto overflow-hidden">
        <div data-ev-id="ev_2af5381f39" className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div data-ev-id="ev_e03db93b40" className="flex items-center gap-3">
            <div data-ev-id="ev_7c0b431b19" className="p-2 bg-primary/10 rounded-lg">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <h3 data-ev-id="ev_08df373ce8" className="font-semibold text-foreground">Neuen Benutzer anlegen</h3>
          </div>
          <button data-ev-id="ev_08f8c71dc6"
          onClick={onClose}
          className="p-2.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground touch-manipulation">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form data-ev-id="ev_aaaf82a3b0" onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {error &&
          <div data-ev-id="ev_ab4cea6650" className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          }
          {success &&
          <div data-ev-id="ev_f9693c725c" className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          }

          <div data-ev-id="ev_0480fd81c3">
            <label data-ev-id="ev_ec807f20c0" className="block text-sm font-medium text-foreground mb-1.5">Name *</label>
            <input data-ev-id="ev_8db8fd46bc"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Max Mustermann"
            className="w-full px-3 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-base"
            required />

          </div>

          <div data-ev-id="ev_86eb5de63d">
            <label data-ev-id="ev_9a80e0c1ee" className="block text-sm font-medium text-foreground mb-1.5">E-Mail *</label>
            <input data-ev-id="ev_b1e15197e4"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="max@example.com"
            className="w-full px-3 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-base"
            required />

          </div>

          <div data-ev-id="ev_b816bcd69c">
            <label data-ev-id="ev_e864e07f7d" className="block text-sm font-medium text-foreground mb-1.5">Passwort *</label>
            <input data-ev-id="ev_26ade622ad"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mindestens 6 Zeichen"
            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            required
            minLength={6} />

          </div>

          <div data-ev-id="ev_31346b2d89">
            <label data-ev-id="ev_5b6c1313f0" className="block text-sm font-medium text-foreground mb-1.5">Rolle</label>
            <select data-ev-id="ev_1d13733b4b"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full px-3 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-base">
              <option data-ev-id="ev_c71f1e03a0" value="mitglied">Mitglied</option>
              <option data-ev-id="ev_c2dff71422" value="bereichsleiter">Bereichsleiter</option>
              <option data-ev-id="ev_88e2eed179" value="kommandant">Kommandant</option>
              <option data-ev-id="ev_63df3e2d86" value="admin">Admin</option>
            </select>
          </div>

          <div data-ev-id="ev_f9fbac7017" className="flex gap-3 mt-2">
            <button data-ev-id="ev_4f1fea735e"
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-input rounded-lg font-medium hover:bg-muted transition-colors">
              Abbrechen
            </button>
            <button data-ev-id="ev_831db57051"
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading ? 'Erstelle...' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>);

}