import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, Mail, Lock, Flame, Shield } from 'lucide-react';
import logoImage from '@/assets/uploads/logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    } catch (err) {
      setError('Ein Fehler ist aufgetreten');
    }
    setLoading(false);
  }

  return (
    <div data-ev-id="ev_a0a6529583" className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-red-50 flex items-center justify-center px-4 py-8">
      {/* Background decoration */}
      <div data-ev-id="ev_8c772ea56f" className="absolute inset-0 overflow-hidden pointer-events-none">
        <div data-ev-id="ev_ebb92305d5" className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div data-ev-id="ev_0b51920456" className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div data-ev-id="ev_c143a7715c" className="w-full max-w-md relative z-10">
        {/* Main Card */}
        <div data-ev-id="ev_2d699dea99" className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
          {/* Header with Gradient */}
          <div data-ev-id="ev_0e34a1cb6a" className="bg-gradient-to-r from-primary to-primary/80 px-8 py-8 text-center">
            <div data-ev-id="ev_373a3fa082" className="flex justify-center mb-4">
              <div data-ev-id="ev_43f7e657f7" className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center p-2">
                <img data-ev-id="ev_2039e01519"
                src={logoImage}
                alt="FFM-Portal Logo"
                className="w-full h-full object-contain" />

              </div>
            </div>
            <h1 data-ev-id="ev_453480d76a" className="text-xl font-bold text-white mb-1">FFM - Portal 

            </h1>
            <p data-ev-id="ev_f0db6e0e7c" className="text-white/80 text-sm">
              Freiwillige Feuerwehr Marchtrenk
            </p>
          </div>

          {/* Form Section */}
          <div data-ev-id="ev_24237be66b" className="p-8">
            {/* Error Message */}
            {error &&
            <div data-ev-id="ev_1719ec1bc6" className="mb-6 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            }

            <form data-ev-id="ev_fe8070c04c" onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Email Field */}
              <div data-ev-id="ev_f4b6259e74">
                <label data-ev-id="ev_fcaa6eb234" className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  E-Mail Adresse
                </label>
                <div data-ev-id="ev_677643a8ce" className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input data-ev-id="ev_0ab19c99a0"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@beispiel.de"
                  className="w-full pl-12 pr-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                  required />

                </div>
              </div>

              {/* Password Field */}
              <div data-ev-id="ev_69cde17526">
                <label data-ev-id="ev_182f9547e0" className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    Passwort
                  </label>
                <div data-ev-id="ev_98400c07e6" className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input data-ev-id="ev_c213a78c48"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                  required
                  minLength={6}
                  autoComplete="current-password" />

                </div>
              </div>

              {/* Submit Button */}
              <button data-ev-id="ev_a16a4a63c7"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/25 group">

                {loading ?
                <span data-ev-id="ev_b0fa36737f" className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> :

                <>
                    <LogIn className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                    Anmelden
                  </>
                }
              </button>
            </form>
          </div>

          {/* Footer */}
          <div data-ev-id="ev_888246fe3e" className="px-8 py-4 bg-muted/30 border-t border-border">
            <div data-ev-id="ev_3736d70382" className="text-center flex flex-col gap-2">
              <Link data-ev-id="ev_9366d85653" to="/passwort-vergessen" className="text-sm text-primary hover:text-primary/80 font-medium">
                Passwort vergessen?
              </Link>
              <p data-ev-id="ev_05bfadec7c" className="text-sm text-muted-foreground">
                Feuerwehr-Mitglied?{' '}
                <Link data-ev-id="ev_99a5d3a57d" to="/registrieren" className="text-primary hover:text-primary/80 font-medium">
                  Hier registrieren
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Info */}
        <div data-ev-id="ev_00e69305c4" className="mt-6 text-center">
          <div data-ev-id="ev_d5a195eac2" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Flame className="w-4 h-4 text-primary" />
            <span data-ev-id="ev_c791879ef0">FFM-Portal • Version 1.0</span>
          </div>
        </div>
      </div>
    </div>);

}