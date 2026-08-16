import { useState, useEffect } from 'react';
import { Bell, BellOff, Smartphone, Check, X, Loader2, AlertCircle } from 'lucide-react';
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  hasActiveSubscription,
  registerServiceWorker } from
'@/lib/pushNotifications';

interface PushNotificationSettingsProps {
  userId: string;
}

export function PushNotificationSettings({ userId }: PushNotificationSettingsProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    setLoading(true);

    const supported = isPushSupported();
    setIsSupported(supported);

    if (supported) {
      setPermission(getNotificationPermission());
      const subscribed = await hasActiveSubscription();
      setIsSubscribed(subscribed);
    }

    setLoading(false);
  }

  async function handleEnableNotifications() {
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // First, register service worker if needed
      await registerServiceWorker();

      // Request permission
      const perm = await requestNotificationPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setError('Benachrichtigungen wurden blockiert. Bitte erlaube sie in den Browser-Einstellungen.');
        setActionLoading(false);
        return;
      }

      // Subscribe to push
      const subscription = await subscribeToPush(userId);

      if (subscription) {
        setIsSubscribed(true);
        setSuccess('Push-Benachrichtigungen aktiviert!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Konnte Push-Benachrichtigungen nicht aktivieren. VAPID-Key fehlt möglicherweise.');
      }
    } catch (err) {
      console.error('Enable notifications error:', err);
      setError('Fehler beim Aktivieren der Benachrichtigungen.');
    }

    setActionLoading(false);
  }

  async function handleDisableNotifications() {
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const unsubscribed = await unsubscribeFromPush(userId);

      if (unsubscribed) {
        setIsSubscribed(false);
        setSuccess('Push-Benachrichtigungen deaktiviert.');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Disable notifications error:', err);
      setError('Fehler beim Deaktivieren der Benachrichtigungen.');
    }

    setActionLoading(false);
  }

  if (loading) {
    return (
      <div data-ev-id="ev_812b0e2334" className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <div data-ev-id="ev_b02396f10c" className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
          <span data-ev-id="ev_5dde1504ac" className="text-zinc-400">Lade Benachrichtigungs-Status...</span>
        </div>
      </div>);

  }

  if (!isSupported) {
    return (
      <div data-ev-id="ev_9fc8a71c3e" className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <div data-ev-id="ev_44116fa6ad" className="flex items-start gap-4">
          <div data-ev-id="ev_41f78d5e71" className="p-3 bg-amber-500/10 rounded-lg">
            <AlertCircle className="w-6 h-6 text-amber-500" />
          </div>
          <div data-ev-id="ev_5292bc7496">
            <h3 data-ev-id="ev_e0dc147c7e" className="text-lg font-semibold text-white mb-1">Nicht unterstützt</h3>
            <p data-ev-id="ev_775c2f94e2" className="text-zinc-400 text-sm">
              Push-Benachrichtigungen werden in diesem Browser nicht unterstützt.
              Bitte verwende Chrome, Firefox, Edge oder Safari (iOS 16.4+).
            </p>
          </div>
        </div>
      </div>);

  }

  return (
    <div data-ev-id="ev_17259b5316" className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
      <div data-ev-id="ev_2bb88ac184" className="flex items-start gap-4">
        <div data-ev-id="ev_0db1afaee5" className={`p-3 rounded-lg ${isSubscribed ? 'bg-green-500/10' : 'bg-zinc-800'}`}>
          {isSubscribed ?
          <Bell className="w-6 h-6 text-green-500" /> :

          <BellOff className="w-6 h-6 text-zinc-400" />
          }
        </div>
        
        <div data-ev-id="ev_2270bdeb32" className="flex-1">
          <h3 data-ev-id="ev_a204fc1592" className="text-lg font-semibold text-white mb-1">Push-Benachrichtigungen</h3>
          <p data-ev-id="ev_b5b524b68c" className="text-zinc-400 text-sm mb-4">
            {isSubscribed ?
            'Du erhältst Benachrichtigungen bei neuen Nachrichten und Updates.' :
            'Aktiviere Push-Benachrichtigungen, um über neue Nachrichten informiert zu werden.'
            }
          </p>
          
          {/* Status indicators */}
          <div data-ev-id="ev_c256366576" className="flex flex-wrap gap-2 mb-4">
            <span data-ev-id="ev_84a5a8e07e" className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            permission === 'granted' ?
            'bg-green-500/10 text-green-400' :
            permission === 'denied' ?
            'bg-red-500/10 text-red-400' :
            'bg-zinc-800 text-zinc-400'}`
            }>
              {permission === 'granted' && <Check className="w-3 h-3" />}
              {permission === 'denied' && <X className="w-3 h-3" />}
              {permission === 'granted' ? 'Berechtigung erteilt' : permission === 'denied' ? 'Berechtigung verweigert' : 'Berechtigung ausstehend'}
            </span>
            
            <span data-ev-id="ev_7e8c9c74b1" className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            isSubscribed ?
            'bg-green-500/10 text-green-400' :
            'bg-zinc-800 text-zinc-400'}`
            }>
              <Smartphone className="w-3 h-3" />
              {isSubscribed ? 'Gerät registriert' : 'Nicht registriert'}
            </span>
          </div>
          
          {/* Error/Success messages */}
          {error &&
          <div data-ev-id="ev_e80adf4ee3" className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          }
          
          {success &&
          <div data-ev-id="ev_1d2f7f7d10" className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm flex items-center gap-2">
              <Check className="w-4 h-4" />
              {success}
            </div>
          }
          
          {/* Action button */}
          {permission === 'denied' ?
          <p data-ev-id="ev_4106aee4d7" className="text-amber-400 text-sm">
              Benachrichtigungen wurden blockiert. Öffne die Browser-Einstellungen, um sie zu erlauben.
            </p> :

          <button data-ev-id="ev_710bf46a62"
          onClick={isSubscribed ? handleDisableNotifications : handleEnableNotifications}
          disabled={actionLoading}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          isSubscribed ?
          'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' :
          'bg-red-600 text-white hover:bg-red-700'} disabled:opacity-50 disabled:cursor-not-allowed`
          }>

              {actionLoading ?
            <Loader2 className="w-4 h-4 animate-spin" /> :
            isSubscribed ?
            <BellOff className="w-4 h-4" /> :

            <Bell className="w-4 h-4" />
            }
              {actionLoading ?
            'Wird verarbeitet...' :
            isSubscribed ?
            'Benachrichtigungen deaktivieren' :
            'Benachrichtigungen aktivieren'
            }
            </button>
          }
        </div>
      </div>
      
      {/* PWA Install hint */}
      <div data-ev-id="ev_f12dba07ff" className="mt-6 pt-4 border-t border-zinc-800">
        <div data-ev-id="ev_a7f3e9bc47" className="flex flex-col gap-4 text-sm text-zinc-500">
          <div data-ev-id="ev_install_header" className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 shrink-0 text-zinc-400" />
            <strong data-ev-id="ev_install_title" className="text-zinc-400">App installieren für Push-Benachrichtigungen</strong>
          </div>
          
          {/* Android Chrome Instructions */}
          <div data-ev-id="ev_android_instructions" className="bg-zinc-800/50 rounded-lg p-3">
            <p data-ev-id="ev_android_title" className="font-medium text-zinc-300 mb-2 flex items-center gap-2">
              <span data-ev-id="ev_android_icon" className="text-green-500">▶</span> Android (Chrome)
            </p>
            <ol data-ev-id="ev_android_steps" className="list-decimal list-inside flex flex-col gap-1 text-zinc-400 ml-1">
              <li data-ev-id="ev_ca217f354c">Öffne diese Seite in <strong data-ev-id="ev_ad12f9797d" className="text-zinc-300">Chrome</strong></li>
              <li data-ev-id="ev_20af5d672f">Tippe auf das <strong data-ev-id="ev_e96b5ee1c4" className="text-zinc-300">⋮ Menü</strong> (drei Punkte oben rechts)</li>
              <li data-ev-id="ev_1ce4df6ff4">Wähle <strong data-ev-id="ev_eb104d809c" className="text-zinc-300">"App installieren"</strong> oder <strong data-ev-id="ev_38bfeb26b3" className="text-zinc-300">"Zum Startbildschirm hinzufügen"</strong></li>
              <li data-ev-id="ev_86f4299972">Bestätige mit <strong data-ev-id="ev_9df352dc90" className="text-zinc-300">"Installieren"</strong></li>
              <li data-ev-id="ev_85715b484d">Öffne die App vom Startbildschirm und aktiviere Benachrichtigungen</li>
            </ol>
          </div>
          
          {/* iOS Instructions */}
          <div data-ev-id="ev_ios_instructions" className="bg-zinc-800/50 rounded-lg p-3">
            <p data-ev-id="ev_ios_title" className="font-medium text-zinc-300 mb-2 flex items-center gap-2">
              <span data-ev-id="ev_ios_icon" className="text-blue-500">◆</span> iPhone/iPad (Safari)
            </p>
            <ol data-ev-id="ev_ios_steps" className="list-decimal list-inside flex flex-col gap-1 text-zinc-400 ml-1">
              <li data-ev-id="ev_05cf0372f1">Öffne diese Seite in <strong data-ev-id="ev_e3c3b573f1" className="text-zinc-300">Safari</strong></li>
              <li data-ev-id="ev_80bbe5e075">Tippe auf das <strong data-ev-id="ev_d38ea8e9d2" className="text-zinc-300">Teilen-Symbol</strong> (Quadrat mit Pfeil)</li>
              <li data-ev-id="ev_9ffde0533b">Scrolle und wähle <strong data-ev-id="ev_d433bf7bc6" className="text-zinc-300">"Zum Home-Bildschirm"</strong></li>
              <li data-ev-id="ev_fb8b6e6db2">Tippe auf <strong data-ev-id="ev_06de54ef93" className="text-zinc-300">"Hinzufügen"</strong></li>
              <li data-ev-id="ev_1731524226">Öffne die App vom Home-Bildschirm und aktiviere Benachrichtigungen</li>
            </ol>
            <p data-ev-id="ev_ios_note" className="mt-2 text-xs text-zinc-500 italic">
              Hinweis: iOS 16.4 oder neuer erforderlich für Push-Benachrichtigungen
            </p>
          </div>
        </div>
      </div>
    </div>);

}