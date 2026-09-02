import { useState } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/integrations/supabase/client';
import { Mail, ArrowLeft, CheckCircle, Flame } from 'lucide-react';
import logoImage from '@/assets/uploads/logo.png';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;

    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('Ein Fehler ist aufgetreten');
    }
    setLoading(false);
  }

  return (
    <div data-ev-id="ev_7177f49b04" className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-red-50 flex items-center justify-center px-4 py-8">
      {/* Background decoration */}
      <div data-ev-id="ev_ace8ab5432" className="absolute inset-0 overflow-hidden pointer-events-none">
        <div data-ev-id="ev_e1012fb337" className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div data-ev-id="ev_3bd3d52c04" className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div data-ev-id="ev_2f5d125e72" className="w-full max-w-md relative z-10">
        {/* Main Card */}
        <div data-ev-id="ev_73dc723e91" className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
          {/* Header with Gradient */}
          <div data-ev-id="ev_1a5c18796b" className="bg-gradient-to-r from-primary to-primary/80 px-8 py-8 text-center">
            <div data-ev-id="ev_d0f31e8101" className="flex justify-center mb-4">
              <div data-ev-id="ev_425fa2faf0" className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center p-2">
                <img data-ev-id="ev_ea64dd3884"
                src={logoImage}
                alt="FFM-Portal Logo"
                className="w-full h-full object-contain" />

              </div>
            </div>
            <h1 data-ev-id="ev_8e2899284a" className="text-xl font-bold text-white mb-1">
              Passwort vergessen
            </h1>
            <p data-ev-id="ev_bca7b645f4" className="text-white/80 text-sm">
              Wir senden dir einen Link zum Zurücksetzen
            </p>
          </div>

          {/* Form Section */}
          <div data-ev-id="ev_6bd4e219b2" className="p-8">
            {success ?
            <div data-ev-id="ev_68dd367930" className="text-center">
                <div data-ev-id="ev_a14f6941e4" className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 data-ev-id="ev_1d38e8e369" className="text-lg font-semibold text-foreground mb-2">
                  E-Mail gesendet!
                </h2>
                <p data-ev-id="ev_cf6c22a20e" className="text-muted-foreground text-sm mb-6">
                  Falls ein Konto mit dieser E-Mail existiert, erhältst du in Kürze einen Link zum Zurücksetzen deines Passworts.
                </p>
                <Link data-ev-id="ev_df3911e366"
              to="/login"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium">

                  <ArrowLeft className="w-4 h-4" />
                  Zurück zum Login
                </Link>
              </div> :

            <>
                {/* Error Message */}
                {error &&
              <div data-ev-id="ev_530118acd5" className="mb-6 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
                    {error}
                  </div>
              }

                <form data-ev-id="ev_5575ccd203" onSubmit={handleSubmit} className="flex flex-col gap-5">
                  {/* Email Field */}
                  <div data-ev-id="ev_615e9d4f0b">
                    <label data-ev-id="ev_85f07971f4" className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      E-Mail Adresse
                    </label>
                    <div data-ev-id="ev_57dd89178e" className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input data-ev-id="ev_055e59dcea"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@beispiel.de"
                    className="w-full pl-12 pr-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    required />

                    </div>
                  </div>

                  {/* Submit Button */}
                  <button data-ev-id="ev_a691180bd6"
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/25">

                    {loading ?
                  <span data-ev-id="ev_54febdb6f5" className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> :

                  'Link senden'
                  }
                  </button>
                </form>
              </>
            }
          </div>

          {/* Footer */}
          <div data-ev-id="ev_1499daea1a" className="px-8 py-4 bg-muted/30 border-t border-border">
            <Link data-ev-id="ev_44fe8be560"
            to="/login"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">

              <ArrowLeft className="w-4 h-4" />
              Zurück zum Login
            </Link>
          </div>
        </div>

        {/* Bottom Info */}
        <div data-ev-id="ev_de20bba5c7" className="mt-6 text-center">
          <div data-ev-id="ev_dce0e2c112" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Flame className="w-4 h-4 text-primary" />
            <span data-ev-id="ev_933ebedabb">FFM-Portal • Version 1.0</span>
          </div>
        </div>
      </div>
    </div>);

}