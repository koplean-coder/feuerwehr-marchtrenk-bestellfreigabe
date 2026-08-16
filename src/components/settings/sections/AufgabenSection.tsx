import { useState, useEffect, useCallback } from 'react';
import { CheckSquare, Bell, Mail, Smartphone, ToggleLeft, ToggleRight, Info, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@/hooks/useProfiles';

interface AufgabenSectionProps {
  profiles: Profile[];
}

export function AufgabenSection({ profiles }: AufgabenSectionProps) {
  const { profile: currentUser } = useAuth();
  const [todoEnabled, setTodoEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!supabase) return;

    try {
      setLoading(true);
      const { data: settings } = await supabase.
      from('settings').
      select('key, value').
      eq('key', 'todo_enabled');

      for (const setting of settings ?? []) {
        if (setting.key === 'todo_enabled') {
          setTodoEnabled(setting.value === 'true');
        }
      }
    } catch (err) {
      console.error('Error fetching todo settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = async (key: string, value: string) => {
    if (!supabase) return;

    setSaving(key);
    try {
      // Try update first
      const { error: updateError } = await supabase.
      from('settings').
      update({ value }).
      eq('key', key);

      // If no rows updated, insert
      if (updateError) {
        await supabase.
        from('settings').
        insert({ key, value });
      }

      await fetchSettings();
    } catch (err) {
      console.error('Error updating setting:', err);
    } finally {
      setSaving(null);
    }
  };

  const toggleEnabled = async () => {
    await updateSetting('todo_enabled', String(!todoEnabled));
  };

  if (loading) {
    return (
      <div data-ev-id="ev_848f65d577" className="flex items-center justify-center p-8">
        <div data-ev-id="ev_4d9a958263" className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>);

  }

  return (
    <div data-ev-id="ev_f29b0975ab" className="flex flex-col gap-6">
      {/* Modul aktivieren */}
      <div data-ev-id="ev_3da4a93c7d" className="bg-card rounded-xl border border-border p-5">
        <div data-ev-id="ev_0393e8b787" className="flex items-center justify-between">
          <div data-ev-id="ev_97ff61d9b6" className="flex items-center gap-3">
            <div data-ev-id="ev_c70483f5d8" className="p-2 bg-blue-100 rounded-lg">
              <CheckSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div data-ev-id="ev_ff86d10410">
              <h3 data-ev-id="ev_aa83e1df44" className="font-semibold text-foreground">Aufgaben-Modul</h3>
              <p data-ev-id="ev_b0024eb9d6" className="text-sm text-muted-foreground">Microsoft To Do ähnliche Aufgabenverwaltung</p>
            </div>
          </div>
          <button data-ev-id="ev_574946b422"
          onClick={toggleEnabled}
          disabled={saving === 'todo_enabled'}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
          todoEnabled ?
          'bg-green-100 text-green-700 hover:bg-green-200' :
          'bg-muted text-muted-foreground hover:bg-muted/80'}`
          }>

            {saving === 'todo_enabled' ?
            <div data-ev-id="ev_cefdf9e8f2" className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div> :
            todoEnabled ?
            <><ToggleRight className="w-5 h-5" /> Aktiviert</> :

            <><ToggleLeft className="w-5 h-5" /> Deaktiviert</>
            }
          </button>
        </div>
      </div>

      {/* Info-Box mit Verweis auf Zugriffsrechte */}
      <div data-ev-id="ev_d56c5fbe55" className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div data-ev-id="ev_9f0ef9f36c" className="text-sm text-blue-800">
          <p data-ev-id="ev_866f48ed74" className="font-medium mb-1">Berechtigungen:</p>
          <ul data-ev-id="ev_bb01859a55" className="list-disc list-inside flex flex-col gap-1 text-blue-700">
            <li data-ev-id="ev_7b226dff51"><strong data-ev-id="ev_ca3666db1e">Sichtbarkeit:</strong> Wird über <em data-ev-id="ev_928a9c6de3">Modul-Berechtigungen</em> für "Nutzer" gesteuert.</li>
            <li data-ev-id="ev_747beea6bb"><strong data-ev-id="ev_52260f96fe">Administrieren:</strong> Wird über <em data-ev-id="ev_36eb52514b">Zugriffsrechte</em> gesteuert.</li>
            <li data-ev-id="ev_f8dfd0de57"><strong data-ev-id="ev_a9aa0115b4">Admins/Kommandanten</strong> haben immer vollen Zugriff.</li>
          </ul>
          <a data-ev-id="ev_d01bdd260f"
          href="/einstellungen?section=zugriffsrechte"
          className="inline-flex items-center gap-1 mt-2 text-blue-600 hover:text-blue-800 font-medium">

            <ExternalLink className="w-3.5 h-3.5" />
            Zu Zugriffsrechte
          </a>
        </div>
      </div>

      {/* Benachrichtigungs-Info */}
      <div data-ev-id="ev_db2dda9e84" className="bg-card rounded-xl border border-border p-5">
        <div data-ev-id="ev_43c8c170ed" className="flex items-center gap-3 mb-4">
          <div data-ev-id="ev_915e903d82" className="p-2 bg-yellow-100 rounded-lg">
            <Bell className="w-5 h-5 text-yellow-600" />
          </div>
          <div data-ev-id="ev_8fe516f171">
            <h3 data-ev-id="ev_f929bd9d42" className="font-semibold text-foreground">Benachrichtigungen</h3>
            <p data-ev-id="ev_3c9920bbd4" className="text-sm text-muted-foreground">Push & E-Mail Einstellungen</p>
          </div>
        </div>
        <div data-ev-id="ev_8bcf890c77" className="bg-muted/30 rounded-lg p-4 flex flex-col gap-3">
          <div data-ev-id="ev_cdeecc5ad4" className="flex items-center gap-3 text-sm">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
            <span data-ev-id="ev_2825d303ed">Push-Benachrichtigungen für Zuweisungen, Erinnerungen, Fälligkeiten</span>
          </div>
          <div data-ev-id="ev_529334d59e" className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span data-ev-id="ev_759da8cf4c">E-Mail-Benachrichtigungen (optional pro Ereignis)</span>
          </div>
          <p data-ev-id="ev_4187c614b8" className="text-xs text-muted-foreground mt-2">
            Jeder Benutzer kann seine eigenen Benachrichtigungseinstellungen im Aufgaben-Modul anpassen.
          </p>
        </div>
      </div>
    </div>);

}