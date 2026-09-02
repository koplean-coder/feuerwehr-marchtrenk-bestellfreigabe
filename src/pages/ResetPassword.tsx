import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { supabase } from '@/integrations/supabase/client';
import { Lock, ArrowLeft, CheckCircle, AlertCircle, Flame } from 'lucide-react';
import logoImage from '@/assets/uploads/logo.png';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Parse URL hash for recovery token
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    const errorCode = hashParams.get('error_code');
    const errorDescription = hashParams.get('error_description');

    if (errorCode) {
      setError(errorDescription || 'Der Link ist ungültig oder abgelaufen.');
      setIsValidSession(false);
      return;
    }

    if (accessToken && type === 'recovery') {
      setIsValidSession(true);
    } else {
      // Check if we have a valid session from the callback
      checkSession();
    }
  }, []);

  async function checkSession() {
    if (!supabase) {
      setIsValidSession(false);
      return;
    }

    const { data } = await supabase.auth.getSession();
    if (data.session) {
      setIsValidSession(true);
    } else {
      setIsValidSession(false);
      setError('Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;

    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein');
      return;
    }

    if (password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err) {
      setError('Ein Fehler ist aufgetreten');
    }
    setLoading(false);
  }

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div data-ev-id="ev_f2c9cbf406" className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-red-50 flex items-center justify-center">
        <div data-ev-id="ev_368ad29ad3" className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>);

  }

  return (
    <div data-ev-id="ev_eeb49ad63d" className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-red-50 flex items-center justify-center px-4 py-8">
      {/* Background decoration */}
      <div data-ev-id="ev_46bbf1402c" className="absolute inset-0 overflow-hidden pointer-events-none">
        <div data-ev-id="ev_bc2f72d6a0" className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div data-ev-id="ev_836db4887d" className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div data-ev-id="ev_77d2db153d" className="w-full max-w-md relative z-10">
        {/* Main Card */}
        <div data-ev-id="ev_5324c2dffc" className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
          {/* Header with Gradient */}
          <div data-ev-id="ev_0bc05565da" className="bg-gradient-to-r from-primary to-primary/80 px-8 py-8 text-center">
            <div data-ev-id="ev_1619a478bc" className="flex justify-center mb-4">
              <div data-ev-id="ev_ee60e98beb" className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center p-2">
                <img data-ev-id="ev_e79de6915d"
                src={logoImage}
                alt="FFM-Portal Logo"
                className="w-full h-full object-contain" />

              </div>
            </div>
            <h1 data-ev-id="ev_fdc2f49f87" className="text-xl font-bold text-white mb-1">
              Neues Passwort setzen
            </h1>
            <p data-ev-id="ev_3b7a06e8ca" className="text-white/80 text-sm">
              Gib dein neues Passwort ein
            </p>
          </div>

          {/* Form Section */}
          <div data-ev-id="ev_f75d63be7a" className="p-8">
            {!isValidSession ?
            // Invalid/expired link
            <div data-ev-id="ev_ccaa36a135" className="text-center">
                <div data-ev-id="ev_969793da1b" className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 data-ev-id="ev_4e27cbac3c" className="text-lg font-semibold text-foreground mb-2">
                  Link ungültig
                </h2>
                <p data-ev-id="ev_2286348029" className="text-muted-foreground text-sm mb-6">
                  {error || 'Der Link zum Zurücksetzen ist ungültig oder abgelaufen.'}
                </p>
                <Link data-ev-id="ev_8c8a83511f"
              to="/passwort-vergessen"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">

                  Neuen Link anfordern
                </Link>
              </div> :
            success ?
            // Success state
            <div data-ev-id="ev_2fa209a95e" className="text-center">
                <div data-ev-id="ev_9087750997" className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 data-ev-id="ev_4bb6a1c0d2" className="text-lg font-semibold text-foreground mb-2">
                  Passwort geändert!
                </h2>
                <p data-ev-id="ev_7b27aebafc" className="text-muted-foreground text-sm mb-6">
                  Dein Passwort wurde erfolgreich geändert. Du wirst gleich zum Login weitergeleitet...
                </p>
                <Link data-ev-id="ev_ac245cba61"
              to="/login"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium">

                  <ArrowLeft className="w-4 h-4" />
                  Jetzt zum Login
                </Link>
              </div> :

            // Form
            <>
                {/* Error Message */}
                {error &&
              <div data-ev-id="ev_54c0815e94" className="mb-6 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
                    {error}
                  </div>
              }

                <form data-ev-id="ev_5d26cb823c" onSubmit={handleSubmit} className="flex flex-col gap-5">
                  {/* New Password Field */}
                  <div data-ev-id="ev_f85e6d1448">
                    <label data-ev-id="ev_851328ab43" className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Neues Passwort
                    </label>
                    <div data-ev-id="ev_a64112116e" className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input data-ev-id="ev_a136a0ffaa"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    required
                    minLength={6} />

                    </div>
                    <p data-ev-id="ev_dd2f23eeec" className="mt-1 text-xs text-muted-foreground">
                      Mindestens 6 Zeichen
                    </p>
                  </div>

                  {/* Confirm Password Field */}
                  <div data-ev-id="ev_02159b28d2">
                    <label data-ev-id="ev_955a20787d" className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Passwort bestätigen
                    </label>
                    <div data-ev-id="ev_e92310c60a" className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input data-ev-id="ev_3701d49469"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    required
                    minLength={6} />

                    </div>
                  </div>

                  {/* Submit Button */}
                  <button data-ev-id="ev_377b2c7c5e"
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/25">

                    {loading ?
                  <span data-ev-id="ev_f1c92e7f48" className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> :

                  'Passwort speichern'
                  }
                  </button>
                </form>
              </>
            }
          </div>

          {/* Footer */}
          <div data-ev-id="ev_0a78674f18" className="px-8 py-4 bg-muted/30 border-t border-border">
            <Link data-ev-id="ev_9e1a951028"
            to="/login"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">

              <ArrowLeft className="w-4 h-4" />
              Zurück zum Login
            </Link>
          </div>
        </div>

        {/* Bottom Info */}
        <div data-ev-id="ev_0153b97306" className="mt-6 text-center">
          <div data-ev-id="ev_808060d953" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Flame className="w-4 h-4 text-primary" />
            <span data-ev-id="ev_b0f198feaa">FFM-Portal • Version 1.0</span>
          </div>
        </div>
      </div>
    </div>);

}