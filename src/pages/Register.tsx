import { useState } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Mail, Lock, User, Flame, Shield, CheckCircle, ArrowLeft } from 'lucide-react';
import logoImage from '@/assets/uploads/logo.png';

const ALLOWED_DOMAIN = 'feuerwehr-marchtrenk.at';

export default function Register() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    const domain = email.split('@')[1]?.toLowerCase();
    return domain === ALLOWED_DOMAIN;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validate email domain
    if (!validateEmail(email)) {
      setError(`Nur E-Mail-Adressen mit @${ALLOWED_DOMAIN} sind erlaubt.`);
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    if (!supabase) {
      setError('Verbindung zur Datenbank nicht möglich.');
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            created_by_admin: 'false' // Self-registration = limited access
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (signUpError) {
        console.error('SignUp Error:', signUpError);
        if (signUpError.message.includes('already registered')) {
          setError('Diese E-Mail-Adresse ist bereits registriert.');
        } else if (signUpError.message.includes('Database error')) {
          setError(`Datenbankfehler: ${signUpError.message}. Code: ${'code' in signUpError ? String(signUpError.code) : 'unbekannt'}`);
        } else {
          setError(signUpError.message);
        }
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
    }

    setLoading(false);
  }

  // Success message after registration
  if (success) {
    return (
      <div data-ev-id="ev_5b771af686" className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-emerald-50 flex items-center justify-center px-4 py-8">
        <div data-ev-id="ev_887b6ee09d" className="absolute inset-0 overflow-hidden pointer-events-none">
          <div data-ev-id="ev_fd41e1c324" className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
          <div data-ev-id="ev_8ac3590b37" className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
        </div>

        <div data-ev-id="ev_5a0bacc2f1" className="w-full max-w-md relative z-10">
          <div data-ev-id="ev_038d72930e" className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div data-ev-id="ev_e4c8ff1774" className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-8 text-center">
              <div data-ev-id="ev_25f5994ba1" className="flex justify-center mb-4">
                <div data-ev-id="ev_9ef9b86518" className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
              </div>
              <h1 data-ev-id="ev_103e63f8a6" className="text-xl font-bold text-white mb-1">
                Registrierung erfolgreich!
              </h1>
            </div>

            <div data-ev-id="ev_2f13351ca8" className="p-8">
              <div data-ev-id="ev_4762a23066" className="text-center">
                <p data-ev-id="ev_13c284917d" className="text-foreground mb-4">
                  Wir haben eine Bestätigungs-E-Mail an <strong data-ev-id="ev_e62e15d922">{email}</strong> gesendet.
                </p>
                <p data-ev-id="ev_9a4692b4a1" className="text-muted-foreground text-sm mb-6">
                  Bitte klicken Sie auf den Link in der E-Mail, um Ihr Konto zu aktivieren.
                  Danach können Sie sich anmelden.
                </p>
                <div data-ev-id="ev_816c4bbde5" className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                  <p data-ev-id="ev_e73036cd3e" className="text-amber-800 text-sm">
                    <strong data-ev-id="ev_39a85f874d">Hinweis:</strong> Überprüfen Sie auch Ihren Spam-Ordner, 
                    falls Sie die E-Mail nicht finden.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all">

                  <ArrowLeft className="w-4 h-4" />
                  Zurück zur Anmeldung
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>);

  }

  return (
    <div data-ev-id="ev_6e6ffaa970" className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-emerald-50 flex items-center justify-center px-4 py-8">
      {/* Background decoration */}
      <div data-ev-id="ev_8bf8b11347" className="absolute inset-0 overflow-hidden pointer-events-none">
        <div data-ev-id="ev_2a8dbbd2a0" className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
        <div data-ev-id="ev_afd427b584" className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div data-ev-id="ev_6bde81cb95" className="w-full max-w-md relative z-10">
        {/* Main Card */}
        <div data-ev-id="ev_75cdb53a1c" className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
          {/* Header with Gradient */}
          <div data-ev-id="ev_18a460d38a" className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-8 text-center">
            <div data-ev-id="ev_432d2906f7" className="flex justify-center mb-4">
              <div data-ev-id="ev_4817729885" className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center p-2">
                <img data-ev-id="ev_db0cc0d809"
                src={logoImage}
                alt="FFM-Portal Logo"
                className="w-full h-full object-contain" />

              </div>
            </div>
            <h1 data-ev-id="ev_83d36a75de" className="text-xl font-bold text-white mb-1">
              Mitglieder-Registrierung
            </h1>
            <p data-ev-id="ev_035361a3b8" className="text-white/80 text-sm">
              Freiwillige Feuerwehr Marchtrenk
            </p>
          </div>

          {/* Form Section */}
          <div data-ev-id="ev_650f8cba07" className="p-8">
            {/* Info Box */}
            <div data-ev-id="ev_b33741fa70" className="mb-6 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
              <p data-ev-id="ev_ebbe7f5a7d">Nur für Mitglieder mit <strong data-ev-id="ev_8c4572721c">@{ALLOWED_DOMAIN}</strong> E-Mail-Adresse.</p>
            </div>

            {/* Error Message */}
            {error &&
            <div data-ev-id="ev_fccba62b74" className="mb-6 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            }

            <form data-ev-id="ev_439ac61581" onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Full Name Field */}
              <div data-ev-id="ev_52ad0dcd17">
                <label data-ev-id="ev_69fee5ed68" className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Vollständiger Name
                </label>
                <div data-ev-id="ev_67ce5c51c9" className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input data-ev-id="ev_2965cb66ed"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Max Mustermann"
                  className="w-full pl-12 pr-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                  required />

                </div>
              </div>

              {/* Email Field */}
              <div data-ev-id="ev_8329a86599">
                <label data-ev-id="ev_272a65427d" className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  E-Mail Adresse
                </label>
                <div data-ev-id="ev_e5ed77c371" className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input data-ev-id="ev_ec6853f8fe"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`vorname.nachname@${ALLOWED_DOMAIN}`}
                  className="w-full pl-12 pr-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                  required />

                </div>
              </div>

              {/* Password Field */}
              <div data-ev-id="ev_61813e0d82">
                <label data-ev-id="ev_1c6f02d1fb" className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Passwort
                </label>
                <div data-ev-id="ev_141c558dbc" className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input data-ev-id="ev_c198f62ee8"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mindestens 6 Zeichen"
                  className="w-full pl-12 pr-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                  required
                  minLength={6} />

                </div>
              </div>

              {/* Confirm Password Field */}
              <div data-ev-id="ev_e77421f598">
                <label data-ev-id="ev_f3a38462af" className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Passwort bestätigen
                </label>
                <div data-ev-id="ev_9d362c5f59" className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input data-ev-id="ev_c6236e9237"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Passwort wiederholen"
                  className="w-full pl-12 pr-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                  required
                  minLength={6} />

                </div>
              </div>

              {/* Submit Button */}
              <button data-ev-id="ev_df511b1774"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 group">

                {loading ?
                <span data-ev-id="ev_ed2b3641c6" className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :

                <>
                    <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Registrieren
                  </>
                }
              </button>
            </form>
          </div>

          {/* Footer */}
          <div data-ev-id="ev_94624f19d6" className="px-8 py-4 bg-muted/30 border-t border-border">
            <p data-ev-id="ev_07969a75dc" className="text-center text-sm text-muted-foreground">
              Bereits registriert?{' '}
              <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
                Zur Anmeldung
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom Info */}
        <div data-ev-id="ev_de24fe205e" className="mt-6 text-center">
          <div data-ev-id="ev_739e87186f" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Flame className="w-4 h-4 text-emerald-500" />
            <span data-ev-id="ev_2f4bcdd9dc">FFM-Portal • Mitglieder-Registrierung</span>
          </div>
        </div>
      </div>
    </div>);

}