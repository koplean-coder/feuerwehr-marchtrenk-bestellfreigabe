import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { ArrowLeft, Settings, Bell, FileText, Users, Palette, Shield, Mail, Smartphone, Clock, Check, ChevronRight, Search, Info } from 'lucide-react';
import { Link } from 'react-router';

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  recommended?: boolean;
}

function SettingRow({ label, description, children, recommended }: SettingRowProps) {
  return (
    <div data-ev-id="ev_68a90e1911" className="flex items-start justify-between py-4 border-b border-border last:border-0">
      <div data-ev-id="ev_79b86c1643" className="flex-1 pr-4">
        <div data-ev-id="ev_3a01317268" className="flex items-center gap-2">
          <span data-ev-id="ev_87a3269da2" className="font-medium text-foreground">{label}</span>
          {recommended &&
          <span data-ev-id="ev_dce2d1129d" className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full font-medium">
              Empfohlen
            </span>
          }
        </div>
        {description &&
        <p data-ev-id="ev_271dbea1b5" className="text-sm text-muted-foreground mt-0.5">{description}</p>
        }
      </div>
      <div data-ev-id="ev_981c0556be" className="flex-shrink-0">{children}</div>
    </div>);

}

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button data-ev-id="ev_bc03118867"
    onClick={() => onChange(!checked)}
    className={`relative w-12 h-6 rounded-full transition-colors ${
    checked ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`
    }>

      <span data-ev-id="ev_16d5f0924c"
      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
      checked ? 'translate-x-7' : 'translate-x-1'}`
      } />

    </button>);

}

interface SelectProps {
  value: string;
  options: {value: string;label: string;}[];
  onChange: (value: string) => void;
}

function Select({ value, options, onChange }: SelectProps) {
  return (
    <select data-ev-id="ev_73e02fa01c"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="px-3 py-1.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[150px]">

      {options.map((opt) =>
      <option data-ev-id="ev_f91df3be8a" key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      )}
    </select>);

}

const categories = [
{ id: 'general', label: 'Allgemein', icon: Settings },
{ id: 'notifications', label: 'Benachrichtigungen', icon: Bell },
{ id: 'pdf', label: 'PDF & Dokumente', icon: FileText },
{ id: 'users', label: 'Benutzer', icon: Users },
{ id: 'appearance', label: 'Erscheinungsbild', icon: Palette },
{ id: 'security', label: 'Sicherheit', icon: Shield }];


export default function SettingsMockup() {
  const [activeCategory, setActiveCategory] = useState('notifications');
  const [searchTerm, setSearchTerm] = useState('');
  const [saved, setSaved] = useState<string | null>(null);

  // Mock states für interaktive Demo
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [reminderDays, setReminderDays] = useState('1');
  const [digestFrequency, setDigestFrequency] = useState('daily');
  const [soundEnabled, setSoundEnabled] = useState(false);

  const showSaved = (setting: string) => {
    setSaved(setting);
    setTimeout(() => setSaved(null), 2000);
  };

  const handleToggle = (setter: (v: boolean) => void, current: boolean, name: string) => {
    setter(!current);
    showSaved(name);
  };

  return (
    <Layout>
      <div data-ev-id="ev_269bcc4247" className="max-w-6xl mx-auto">
        {/* Header */}
        <div data-ev-id="ev_785162a7c9" className="flex items-center gap-4 mb-6">
          <Link to="/mockup-preview" className="p-2 hover:bg-muted rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div data-ev-id="ev_b62a209019" className="flex-1">
            <h1 data-ev-id="ev_fd8eab6ff5" className="text-2xl font-bold">Einstellungen</h1>
            <p data-ev-id="ev_52ee5166c9" className="text-muted-foreground text-sm">Mockup — Neues einheitliches Design</p>
          </div>
          <div data-ev-id="ev_48550f7616" className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-medium">
            🎨 Design-Preview
          </div>
        </div>

        {/* Info Banner */}
        <div data-ev-id="ev_535e101100" className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div data-ev-id="ev_893f5d2a03">
            <p data-ev-id="ev_7f1954fe2c" className="text-blue-800 dark:text-blue-200 text-sm font-medium">Interaktives Mockup</p>
            <p data-ev-id="ev_877d085644" className="text-blue-700 dark:text-blue-300 text-sm">Klicke auf die Kategorien links und teste die Einstellungen. Änderungen werden mit "Gespeichert ✓" bestätigt.</p>
          </div>
        </div>

        <div data-ev-id="ev_82127a435f" className="flex gap-6">
          {/* Sidebar */}
          <div data-ev-id="ev_6c80967c8d" className="w-64 flex-shrink-0">
            {/* Search */}
            <div data-ev-id="ev_f470e77ee7" className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input data-ev-id="ev_166d0131b4"
              type="text"
              placeholder="Einstellung suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />

            </div>

            {/* Categories */}
            <nav data-ev-id="ev_2b1fb406de" className="space-y-1">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button data-ev-id="ev_3cb6574c3d"
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  isActive ?
                  'bg-primary text-primary-foreground' :
                  'hover:bg-muted text-foreground'}`
                  }>

                    <Icon className="w-5 h-5" />
                    <span data-ev-id="ev_8da8c8ed85" className="font-medium text-sm">{cat.label}</span>
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </button>);

              })}
            </nav>
          </div>

          {/* Main Content */}
          <div data-ev-id="ev_3656fa7820" className="flex-1">
            {activeCategory === 'notifications' &&
            <div data-ev-id="ev_a3e8f04948" className="space-y-6">
                {/* Section: Kanäle */}
                <div data-ev-id="ev_e6e27cce39" className="bg-card border border-border rounded-xl p-6">
                  <h2 data-ev-id="ev_b24964b504" className="text-lg font-semibold mb-1">Benachrichtigungskanäle</h2>
                  <p data-ev-id="ev_c1d554f001" className="text-sm text-muted-foreground mb-4">Wähle wie du benachrichtigt werden möchtest</p>

                  <SettingRow
                  label="E-Mail Benachrichtigungen"
                  description="Erhalte wichtige Updates per E-Mail"
                  recommended>

                    <div data-ev-id="ev_447b5493d8" className="flex items-center gap-2">
                      {saved === 'email' &&
                    <span data-ev-id="ev_44177be577" className="text-green-600 text-sm flex items-center gap-1">
                          <Check className="w-4 h-4" /> Gespeichert
                        </span>
                    }
                      <Toggle
                      checked={emailEnabled}
                      onChange={() => handleToggle(setEmailEnabled, emailEnabled, 'email')} />

                    </div>
                  </SettingRow>

                  <SettingRow
                  label="Push-Benachrichtigungen"
                  description="Sofortige Benachrichtigungen auf deinem Gerät">

                    <div data-ev-id="ev_800dbab958" className="flex items-center gap-2">
                      {saved === 'push' &&
                    <span data-ev-id="ev_4eabdf630f" className="text-green-600 text-sm flex items-center gap-1">
                          <Check className="w-4 h-4" /> Gespeichert
                        </span>
                    }
                      <Toggle
                      checked={pushEnabled}
                      onChange={() => handleToggle(setPushEnabled, pushEnabled, 'push')} />

                    </div>
                  </SettingRow>

                  <SettingRow
                  label="In-App Benachrichtigungen"
                  description="Zeige Benachrichtigungen im Portal"
                  recommended>

                    <div data-ev-id="ev_f11977a52f" className="flex items-center gap-2">
                      {saved === 'inapp' &&
                    <span data-ev-id="ev_c280cc37ba" className="text-green-600 text-sm flex items-center gap-1">
                          <Check className="w-4 h-4" /> Gespeichert
                        </span>
                    }
                      <Toggle
                      checked={inAppEnabled}
                      onChange={() => handleToggle(setInAppEnabled, inAppEnabled, 'inapp')} />

                    </div>
                  </SettingRow>

                  <SettingRow
                  label="Benachrichtigungston"
                  description="Akustisches Signal bei neuen Benachrichtigungen">

                    <div data-ev-id="ev_1bd8abf046" className="flex items-center gap-2">
                      {saved === 'sound' &&
                    <span data-ev-id="ev_a544f73406" className="text-green-600 text-sm flex items-center gap-1">
                          <Check className="w-4 h-4" /> Gespeichert
                        </span>
                    }
                      <Toggle
                      checked={soundEnabled}
                      onChange={() => handleToggle(setSoundEnabled, soundEnabled, 'sound')} />

                    </div>
                  </SettingRow>
                </div>

                {/* Section: Erinnerungen */}
                <div data-ev-id="ev_737ff16404" className="bg-card border border-border rounded-xl p-6">
                  <h2 data-ev-id="ev_078d2de27a" className="text-lg font-semibold mb-1">Erinnerungen</h2>
                  <p data-ev-id="ev_89b5725505" className="text-sm text-muted-foreground mb-4">Einstellungen für automatische Erinnerungen</p>

                  <SettingRow
                  label="Erinnerungszeit"
                  description="Uhrzeit für tägliche Erinnerungen">

                    <div data-ev-id="ev_e656d6a530" className="flex items-center gap-2">
                      {saved === 'time' &&
                    <span data-ev-id="ev_42d66b1161" className="text-green-600 text-sm flex items-center gap-1">
                          <Check className="w-4 h-4" /> Gespeichert
                        </span>
                    }
                      <div data-ev-id="ev_72b96182fc" className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <input data-ev-id="ev_805b127f9f"
                      type="time"
                      value={reminderTime}
                      onChange={(e) => {
                        setReminderTime(e.target.value);
                        showSaved('time');
                      }}
                      className="bg-transparent text-sm focus:outline-none" />

                      </div>
                    </div>
                  </SettingRow>

                  <SettingRow
                  label="Erinnerung vor Frist"
                  description="Wie viele Tage vorher erinnert werden soll">

                    <div data-ev-id="ev_a742373fd8" className="flex items-center gap-2">
                      {saved === 'days' &&
                    <span data-ev-id="ev_3859d1648e" className="text-green-600 text-sm flex items-center gap-1">
                          <Check className="w-4 h-4" /> Gespeichert
                        </span>
                    }
                      <Select
                      value={reminderDays}
                      onChange={(v) => {
                        setReminderDays(v);
                        showSaved('days');
                      }}
                      options={[
                      { value: '1', label: '1 Tag vorher' },
                      { value: '2', label: '2 Tage vorher' },
                      { value: '3', label: '3 Tage vorher' },
                      { value: '7', label: '1 Woche vorher' }]
                      } />

                    </div>
                  </SettingRow>

                  <SettingRow
                  label="Zusammenfassung"
                  description="Regelmäßige Übersicht offener Aufgaben">

                    <div data-ev-id="ev_fcfa1298a8" className="flex items-center gap-2">
                      {saved === 'digest' &&
                    <span data-ev-id="ev_b478b1cc8a" className="text-green-600 text-sm flex items-center gap-1">
                          <Check className="w-4 h-4" /> Gespeichert
                        </span>
                    }
                      <Select
                      value={digestFrequency}
                      onChange={(v) => {
                        setDigestFrequency(v);
                        showSaved('digest');
                      }}
                      options={[
                      { value: 'none', label: 'Keine' },
                      { value: 'daily', label: 'Täglich' },
                      { value: 'weekly', label: 'Wöchentlich' }]
                      } />

                    </div>
                  </SettingRow>
                </div>

                {/* Section: E-Mail Vorlagen */}
                <div data-ev-id="ev_5217831eb4" className="bg-card border border-border rounded-xl p-6">
                  <h2 data-ev-id="ev_4b74fedf3a" className="text-lg font-semibold mb-1">E-Mail Vorlagen</h2>
                  <p data-ev-id="ev_91de376c27" className="text-sm text-muted-foreground mb-4">Anpassen der automatischen E-Mails</p>

                  <SettingRow
                  label="Neue Bestellung (an Bereichsleiter)"
                  description="E-Mail wenn eine neue Bestellung eingereicht wird">

                    <button data-ev-id="ev_06c0221d7c" className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors">
                      Bearbeiten
                    </button>
                  </SettingRow>

                  <SettingRow
                  label="Bestellung genehmigt"
                  description="E-Mail an den Ersteller bei Genehmigung">

                    <button data-ev-id="ev_88c256447c" className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors">
                      Bearbeiten
                    </button>
                  </SettingRow>

                  <SettingRow
                  label="Bestellung abgelehnt"
                  description="E-Mail an den Ersteller bei Ablehnung">

                    <button data-ev-id="ev_cfb712b28d" className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors">
                      Bearbeiten
                    </button>
                  </SettingRow>
                </div>
              </div>
            }

            {activeCategory !== 'notifications' &&
            <div data-ev-id="ev_efc1f7fb6b" className="bg-card border border-border rounded-xl p-12 text-center">
                <div data-ev-id="ev_ee958fb122" className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  {(() => {
                  const cat = categories.find((c) => c.id === activeCategory);
                  const Icon = cat?.icon || Settings;
                  return <Icon className="w-8 h-8 text-muted-foreground" />;
                })()}
                </div>
                <h2 data-ev-id="ev_b30315f061" className="text-lg font-semibold mb-2">
                  {categories.find((c) => c.id === activeCategory)?.label}
                </h2>
                <p data-ev-id="ev_aee0a50e1e" className="text-muted-foreground text-sm">
                  Klicke auf "Benachrichtigungen" um das interaktive Demo zu sehen.
                  <br data-ev-id="ev_2b84bd13c5" />
                  Die anderen Kategorien werden bei der Umsetzung befüllt.
                </p>
              </div>
            }
          </div>
        </div>
      </div>
    </Layout>);

}