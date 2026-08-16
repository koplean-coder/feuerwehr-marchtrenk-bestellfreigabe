import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import {
  Search,
  BookOpen,
  Home,
  User,
  Users,
  Shield,
  Crown,
  Wallet,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  Bell,
  Truck,
  Euro,
  Package,
  PackageCheck,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Calendar,
  ListChecks,
  Lightbulb,
  Upload,
  Download,
  ExternalLink,
  Info,
  AlertCircle,
  Check,
  X,
  Smartphone,
  Key,
  UserCheck,
  Copy,
  ArrowRight,
  Play,
  HelpCircle,
  Briefcase,
  CreditCard,
  Receipt,
  Building2,
  Mail,
  Phone,
  Globe } from
'lucide-react';

type TabType = 'grundlagen' | 'mitglied' | 'bereichsleiter' | 'kommandant' | 'kassier' | 'admin';

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  keywords: string[];
  content: React.ReactNode;
}

export default function Anleitung() {
  const { isBereichsleiter, isKommandant, isAdmin, profile } = useAuth();
  const { systemHomepageUrl } = useSettings();

  const [activeTab, setActiveTab] = useState<TabType>('grundlagen');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>(['willkommen']);
  const [copied, setCopied] = useState(false);

  const isKassier = profile?.functions?.includes('kassier') || isAdmin || isKommandant;
  const isKommandomitglied = profile?.functions?.includes('kommandomitglied') || isKommandant;

  const copyToClipboard = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
    prev.includes(sectionId) ?
    prev.filter((id) => id !== sectionId) :
    [...prev, sectionId]
    );
  };

  // Tab-Konfiguration
  const tabs = [
  { id: 'grundlagen' as const, label: 'Grundlagen', icon: Home, color: 'bg-blue-500' },
  { id: 'mitglied' as const, label: 'Mitglied', icon: User, color: 'bg-emerald-500' },
  { id: 'bereichsleiter' as const, label: 'Bereichsleiter', icon: Users, color: 'bg-amber-500', show: isBereichsleiter || isKommandant || isAdmin },
  { id: 'kommandant' as const, label: 'Kommandant', icon: Crown, color: 'bg-purple-500', show: isKommandant || isAdmin },
  { id: 'kassier' as const, label: 'Kassier', icon: Wallet, color: 'bg-teal-500', show: isKassier },
  { id: 'admin' as const, label: 'Admin', icon: Settings, color: 'bg-red-500', show: isAdmin || isKommandant }].
  filter((tab) => tab.show !== false);

  // ==================== GRUNDLAGEN ====================
  const grundlagenSections: Section[] = [
  {
    id: 'willkommen',
    title: 'Willkommen im FFM-Portal',
    icon: <BookOpen className="w-5 h-5" />,
    keywords: ['start', 'willkommen', 'einführung', 'übersicht', 'hilfe'],
    content:
    <div data-ev-id="ev_ade043e9de" className="space-y-4">
          <p data-ev-id="ev_12eb2e79a9" className="text-muted-foreground">
            Herzlich willkommen! Diese Anleitung hilft dir, das FFM-Portal zu verstehen und effektiv zu nutzen.
          </p>
          
          <div data-ev-id="ev_88caddcf60" className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
            <div data-ev-id="ev_d6e0397bff" className="flex items-start gap-3">
              <div data-ev-id="ev_f5fe6c3483" className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-white" />
              </div>
              <div data-ev-id="ev_1cff45f468">
                <p data-ev-id="ev_4cb5f203ed" className="font-semibold text-foreground mb-1">Was ist das FFM-Portal?</p>
                <p data-ev-id="ev_b40107cbb5" className="text-sm text-muted-foreground">
                  Das <strong data-ev-id="ev_1579d60c14">FFM-Portal</strong> ist das Verwaltungssystem der FF Marchtrenk. Hier kannst du Bestellungen, 
                  Auszahlungen, Veranstaltungsteilnahmen und vieles mehr verwalten.
                </p>
              </div>
            </div>
          </div>

          <div data-ev-id="ev_2199024694" className="grid gap-3">
            <div data-ev-id="ev_e23aa6a8f3" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <div data-ev-id="ev_819971ec35" className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <span data-ev-id="ev_1d32ebec32" className="text-emerald-600 font-bold">1</span>
              </div>
              <span data-ev-id="ev_9c98892033" className="text-sm">Du erstellst eine Bestellung mit allen wichtigen Details</span>
            </div>
            <div data-ev-id="ev_4f7ab09095" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <div data-ev-id="ev_79c7de4df9" className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <span data-ev-id="ev_1e14b0a458" className="text-amber-600 font-bold">2</span>
              </div>
              <span data-ev-id="ev_aac5659184" className="text-sm">Dein Bereichsleiter prüft und genehmigt die Bestellung</span>
            </div>
            <div data-ev-id="ev_da5750b410" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <div data-ev-id="ev_1297a788b5" className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span data-ev-id="ev_f5dc90aee4" className="text-purple-600 font-bold">3</span>
              </div>
              <span data-ev-id="ev_1421e88f45" className="text-sm">Bei größeren Beträgen genehmigt auch der Kommandant</span>
            </div>
            <div data-ev-id="ev_749268b078" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <div data-ev-id="ev_6125476e43" className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                <span data-ev-id="ev_dabc5fec4c" className="text-teal-600 font-bold">4</span>
              </div>
              <span data-ev-id="ev_ef6d855c4d" className="text-sm">Der Kassier oder eine berechtigte Person(meist der Ersteller) bestellt die Ware beim Lieferanten</span>
            </div>
          </div>

          {systemHomepageUrl &&
      <div data-ev-id="ev_5d84f5f7d3" className="bg-muted/50 rounded-lg p-4">
              <p data-ev-id="ev_341471bc1c" className="text-sm font-medium mb-2">🔗 Direktlink zum System:</p>
              <div data-ev-id="ev_10b19e4a74" className="flex items-center gap-2">
                <code data-ev-id="ev_dc68984243" className="flex-1 px-3 py-2 bg-background rounded border border-border text-sm truncate">
                  {systemHomepageUrl}
                </code>
                <button data-ev-id="ev_3051183354"
          onClick={() => copyToClipboard(systemHomepageUrl)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          title="Link kopieren">

                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
      }
        </div>

  },
  {
    id: 'navigation',
    title: 'Navigation & Menü',
    icon: <Home className="w-5 h-5" />,
    keywords: ['menü', 'navigation', 'seiten', 'bereiche', 'wo finde ich'],
    content:
    <div data-ev-id="ev_7b33d8ec67" className="space-y-4">
          <p data-ev-id="ev_90f0b94dc7" className="text-muted-foreground">
            Das Menü oben zeigt dir alle verfügbaren Bereiche. Je nach deiner Rolle siehst du unterschiedliche Optionen.
          </p>
          
          <div data-ev-id="ev_4c29a39d80" className="space-y-2">
            <div data-ev-id="ev_4301d2f26d" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <Home className="w-5 h-5 text-primary" />
              <div data-ev-id="ev_f8dea69ab9">
                <p data-ev-id="ev_cebb67d675" className="font-medium">Dashboard</p>
                <p data-ev-id="ev_fd7d151f2c" className="text-xs text-muted-foreground">Deine Startseite mit Übersicht aller Aktivitäten</p>
              </div>
            </div>
            <div data-ev-id="ev_a8d9c3f08e" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <Package className="w-5 h-5 text-blue-500" />
              <div data-ev-id="ev_7525961af4">
                <p data-ev-id="ev_c875672307" className="font-medium">Bestellungen</p>
                <p data-ev-id="ev_5f4567a0a7" className="text-xs text-muted-foreground">Alle Bestellungen anzeigen und verwalten</p>
              </div>
            </div>
            <div data-ev-id="ev_478b7ff5f7" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <Truck className="w-5 h-5 text-amber-500" />
              <div data-ev-id="ev_1de106be2c">
                <p data-ev-id="ev_1595d9159f" className="font-medium">Lieferanten</p>
                <p data-ev-id="ev_4afb18d8f7" className="text-xs text-muted-foreground">Lieferantenverzeichnis durchsuchen</p>
              </div>
            </div>
            <div data-ev-id="ev_38b6ae8c7f" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <FileText className="w-5 h-5 text-purple-500" />
              <div data-ev-id="ev_298922930a">
                <p data-ev-id="ev_5038bce8c3" className="font-medium">Antragsformulare</p>
                <p data-ev-id="ev_24f39f384f" className="text-xs text-muted-foreground">Veranstaltungen & Auszahlungen beantragen</p>
              </div>
            </div>
            <div data-ev-id="ev_e2fdc27b70" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <ListChecks className="w-5 h-5 text-teal-500" />
              <div data-ev-id="ev_60681f62c0">
                <p data-ev-id="ev_ba391ac79f" className="font-medium">Aufgaben</p>
                <p data-ev-id="ev_96947b5f41" className="text-xs text-muted-foreground">Aufgaben und To-Dos verwalten</p>
              </div>
            </div>
            <div data-ev-id="ev_ce554a56d7" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <div data-ev-id="ev_bb2e339310">
                <p data-ev-id="ev_aa952947f0" className="font-medium">Ideen-Pool</p>
                <p data-ev-id="ev_93e948780e" className="text-xs text-muted-foreground">Verbesserungsvorschläge einreichen</p>
              </div>
            </div>
          </div>
        </div>

  },
  {
    id: 'benachrichtigungen',
    title: 'Benachrichtigungen',
    icon: <Bell className="w-5 h-5" />,
    keywords: ['benachrichtigung', 'notification', 'glocke', 'nachricht', 'info'],
    content:
    <div data-ev-id="ev_0b9b71505c" className="space-y-4">
          <p data-ev-id="ev_ab13d2cd24" className="text-muted-foreground">
            Das Glockensymbol oben rechts zeigt dir neue Benachrichtigungen an.
          </p>
          
          {/* Mockup */}
          <div data-ev-id="ev_daa6ec5aad" className="bg-card rounded-xl border border-border overflow-hidden">
            <div data-ev-id="ev_e74e0a3fe1" className="bg-primary p-3 flex items-center justify-between">
              <span data-ev-id="ev_5b8025395b" className="text-white font-medium">Benachrichtigungen</span>
              <div data-ev-id="ev_611ba42981" className="relative">
                <Bell className="w-5 h-5 text-yellow-400" />
                <span data-ev-id="ev_a22768d5de" className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-yellow-900 text-xs rounded-full flex items-center justify-center font-bold">3</span>
              </div>
            </div>
            <div data-ev-id="ev_74856f72de" className="p-3 space-y-2">
              <div data-ev-id="ev_cf3264d51f" className="flex items-start gap-3 p-2 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                <div data-ev-id="ev_9c5fba6f2a">
                  <p data-ev-id="ev_b8f1b289c9" className="text-sm font-medium">Bestellung genehmigt</p>
                  <p data-ev-id="ev_356001e153" className="text-xs text-muted-foreground">Deine Bestellung "Schläuche" wurde freigegeben</p>
                </div>
              </div>
              <div data-ev-id="ev_b0ca60c469" className="flex items-start gap-3 p-2 bg-amber-50 rounded-lg border-l-4 border-amber-500">
                <Clock className="w-4 h-4 text-amber-500 mt-0.5" />
                <div data-ev-id="ev_e5463f9903">
                  <p data-ev-id="ev_2d74b44704" className="text-sm font-medium">Warte auf Freigabe</p>
                  <p data-ev-id="ev_eac4161368" className="text-xs text-muted-foreground">"Helmlampen" wartet auf Kommandant</p>
                </div>
              </div>
            </div>
          </div>

          <div data-ev-id="ev_c89ec114a4" className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
            <div data-ev-id="ev_b65cea51b5" className="flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div data-ev-id="ev_d2278e82b9">
                <p data-ev-id="ev_4913fdf445" className="font-medium text-emerald-800">Push-Benachrichtigungen</p>
                <p data-ev-id="ev_9588bccc32" className="text-sm text-emerald-700">
                  Aktiviere Push-Benachrichtigungen im Benutzermenü, um auch am Handy informiert zu werden!
                </p>
              </div>
            </div>
          </div>
        </div>

  },
  {
    id: 'profil',
    title: 'Persönliche Einstellungen',
    icon: <User className="w-5 h-5" />,
    keywords: ['profil', 'einstellungen', 'passwort', 'startseite', 'vertretung'],
    content:
    <div data-ev-id="ev_ad2e1846dd" className="space-y-4">
          <p data-ev-id="ev_701122e843" className="text-muted-foreground">
            Klicke oben rechts auf deinen Namen, um das Benutzermenü zu öffnen.
          </p>
          
          {/* Mockup Dropdown */}
          <div data-ev-id="ev_0b09dfa321" className="bg-card rounded-xl border border-border overflow-hidden max-w-xs">
            <div data-ev-id="ev_5e8f109dd0" className="p-3 border-b border-border">
              <p data-ev-id="ev_752cef353b" className="font-medium">Max Mustermann</p>
              <span data-ev-id="ev_195eb40bf1" className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">Mitglied</span>
            </div>
            <div data-ev-id="ev_17f1c3d2ce" className="p-2 space-y-1">
              <div data-ev-id="ev_148bdf0d2f" className="flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-lg cursor-pointer">
                <Home className="w-4 h-4 text-muted-foreground" />
                <span data-ev-id="ev_01ea47887c" className="text-sm">Persönliche Startseite</span>
              </div>
              <div data-ev-id="ev_a0aaf80191" className="flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-lg cursor-pointer">
                <Key className="w-4 h-4 text-muted-foreground" />
                <span data-ev-id="ev_3fcfb039a9" className="text-sm">Passwort ändern</span>
              </div>
              <div data-ev-id="ev_8d82b17e13" className="flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-lg cursor-pointer">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <span data-ev-id="ev_14504b4c6a" className="text-sm">Push-Benachrichtigungen</span>
              </div>
              <div data-ev-id="ev_ac66cfd0e9" className="flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-lg cursor-pointer">
                <UserCheck className="w-4 h-4 text-muted-foreground" />
                <span data-ev-id="ev_146610bd0f" className="text-sm">Meine Vertretung</span>
              </div>
            </div>
          </div>

          <div data-ev-id="ev_e3b232c1e6" className="space-y-3">
            <div data-ev-id="ev_6865d1a61b" className="p-3 bg-muted/50 rounded-lg">
              <p data-ev-id="ev_d701156622" className="font-medium flex items-center gap-2 mb-1">
                <Home className="w-4 h-4" /> Persönliche Startseite
              </p>
              <p data-ev-id="ev_ae51b983e0" className="text-sm text-muted-foreground">
                Wähle, welche Seite nach dem Login zuerst angezeigt wird.
              </p>
            </div>
            <div data-ev-id="ev_3f70596cd9" className="p-3 bg-muted/50 rounded-lg">
              <p data-ev-id="ev_8eb445c888" className="font-medium flex items-center gap-2 mb-1">
                <UserCheck className="w-4 h-4" /> Vertretung einrichten
              </p>
              <p data-ev-id="ev_0c1b43bf81" className="text-sm text-muted-foreground">
                Bei Abwesenheit kann ein Kollege deine Bestellungen freigeben.
              </p>
            </div>
          </div>
        </div>

  }];


  // ==================== MITGLIED ====================
  const mitgliedSections: Section[] = [
  {
    id: 'bestellung-erstellen',
    title: 'Bestellung erstellen',
    icon: <Plus className="w-5 h-5" />,
    keywords: ['neu', 'erstellen', 'bestellung', 'anlegen', 'neue bestellung'],
    content:
    <div data-ev-id="ev_5692d4c4a3" className="space-y-4">
          <p data-ev-id="ev_0c7825d86d" className="text-muted-foreground">
            So erstellst du eine neue Bestellung Schritt für Schritt:
          </p>
          
          {/* Schritt 1 */}
          <div data-ev-id="ev_d872d04927" className="border border-border rounded-xl overflow-hidden">
            <div data-ev-id="ev_ce0949d79c" className="bg-emerald-500 text-white px-4 py-2 flex items-center gap-2">
              <span data-ev-id="ev_c5ebaf0723" className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              <span data-ev-id="ev_6609bc8146" className="font-medium">Neue Bestellung starten</span>
            </div>
            <div data-ev-id="ev_9068841f74" className="p-4">
              <p data-ev-id="ev_4deb4a64ef" className="text-sm mb-3">Klicke auf dem Dashboard auf <strong data-ev-id="ev_ba801d4cc2">"+ Neue Bestellung"</strong> oder gehe zu <strong data-ev-id="ev_00f54a261c">Bestellungen → Neu</strong>.</p>
              <Link to="/bestellungen/neu" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm">
                <Plus className="w-4 h-4" />
                Jetzt ausprobieren
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Schritt 2 */}
          <div data-ev-id="ev_ebfb0b4f31" className="border border-border rounded-xl overflow-hidden">
            <div data-ev-id="ev_3a46db7e3b" className="bg-blue-500 text-white px-4 py-2 flex items-center gap-2">
              <span data-ev-id="ev_30a4037749" className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <span data-ev-id="ev_4732337622" className="font-medium">Details ausfüllen</span>
            </div>
            <div data-ev-id="ev_54c9f09b8e" className="p-4 space-y-3">
              <div data-ev-id="ev_0fe8ae747b" className="grid gap-3">
                <div data-ev-id="ev_3cf7ad4525" className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div data-ev-id="ev_744341a300">
                    <p data-ev-id="ev_a54f914328" className="font-medium">Bezeichnung</p>
                    <p data-ev-id="ev_71266e1a5b" className="text-sm text-muted-foreground">Was möchtest du bestellen? Z.B. "Schläuche C 20m"</p>
                  </div>
                </div>
                <div data-ev-id="ev_5141192565" className="flex items-start gap-3">
                  <Euro className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div data-ev-id="ev_ffccbc6ca4">
                    <p data-ev-id="ev_23c39f5327" className="font-medium">Betrag</p>
                    <p data-ev-id="ev_fb7d9becdf" className="text-sm text-muted-foreground">Der geschätzte oder exakte Preis</p>
                  </div>
                </div>
                <div data-ev-id="ev_a8e7f6e9d1" className="flex items-start gap-3">
                  <Truck className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div data-ev-id="ev_6c778e7184">
                    <p data-ev-id="ev_20e7ff91f3" className="font-medium">Lieferant</p>
                    <p data-ev-id="ev_86493d1c1a" className="text-sm text-muted-foreground">Bei welchem Händler soll bestellt werden?</p>
                  </div>
                </div>
                <div data-ev-id="ev_cbdc605202" className="flex items-start gap-3">
                  <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div data-ev-id="ev_90752f6739">
                    <p data-ev-id="ev_908f1581ca" className="font-medium">Bereichsleiter</p>
                    <p data-ev-id="ev_996a7498b6" className="text-sm text-muted-foreground">Wer soll die Bestellung freigeben?</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Schritt 3 */}
          <div data-ev-id="ev_f5fe63b56c" className="border border-border rounded-xl overflow-hidden">
            <div data-ev-id="ev_d7440d6fe2" className="bg-purple-500 text-white px-4 py-2 flex items-center gap-2">
              <span data-ev-id="ev_75f63de699" className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <span data-ev-id="ev_0c3af810ea" className="font-medium">Einreichen oder speichern</span>
            </div>
            <div data-ev-id="ev_301554e66b" className="p-4">
              <div data-ev-id="ev_c9c56db466" className="flex gap-3">
                <div data-ev-id="ev_9246bbb9e1" className="flex-1 p-3 bg-muted/50 rounded-lg">
                  <div data-ev-id="ev_6e068233e3" className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span data-ev-id="ev_5775cd2d3d" className="font-medium">Als Entwurf</span>
                  </div>
                  <p data-ev-id="ev_8ddeeb4490" className="text-xs text-muted-foreground">Speichert die Bestellung, ohne sie einzureichen. Du kannst sie später bearbeiten.</p>
                </div>
                <div data-ev-id="ev_a667c0d39b" className="flex-1 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div data-ev-id="ev_cd487a76a1" className="flex items-center gap-2 mb-2">
                    <Send className="w-4 h-4 text-emerald-600" />
                    <span data-ev-id="ev_823fed12a9" className="font-medium text-emerald-700">Einreichen</span>
                  </div>
                  <p data-ev-id="ev_a52d28b33c" className="text-xs text-emerald-600">Sendet die Bestellung zur Freigabe an den Bereichsleiter.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Info-Box Freigabestufen */}
          <div data-ev-id="ev_f440dac6bd" className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div data-ev-id="ev_a1b28472cb" className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div data-ev-id="ev_8851acf452">
                <p data-ev-id="ev_e8d8bdd2b4" className="font-semibold text-blue-800 mb-2">Gut zu wissen: Freigabestufen</p>
                <div data-ev-id="ev_9a967a855a" className="space-y-2 text-sm">
                  <div data-ev-id="ev_7dbf52c452" className="flex items-center gap-2">
                    <div data-ev-id="ev_0b2381912a" className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span data-ev-id="ev_abaf67834d" className="text-blue-700"><strong data-ev-id="ev_c612fe6033">Kleine Beträge:</strong> Nur Bereichsleiter-Freigabe</span>
                  </div>
                  <div data-ev-id="ev_f177d57946" className="flex items-center gap-2">
                    <div data-ev-id="ev_f342bdf3c1" className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span data-ev-id="ev_743eeb9d94" className="text-blue-700"><strong data-ev-id="ev_285bbd6e9a">Mittlere Beträge:</strong> + Kommandant-Freigabe</span>
                  </div>
                  <div data-ev-id="ev_2ca182ffc2" className="flex items-center gap-2">
                    <div data-ev-id="ev_06c16439da" className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span data-ev-id="ev_19ab99b08c" className="text-blue-700"><strong data-ev-id="ev_76f38aa335">Große Beträge:</strong> + Kommando-Abstimmung</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

  },
  {
    id: 'status-verstehen',
    title: 'Bestellstatus verstehen',
    icon: <Eye className="w-5 h-5" />,
    keywords: ['status', 'verfolgen', 'wo ist', 'stand', 'fortschritt'],
    content:
    <div data-ev-id="ev_e67e03e946" className="space-y-4">
          <p data-ev-id="ev_1dca692239" className="text-muted-foreground">
            Jede Bestellung durchläuft verschiedene Status. So erkennst du, wo deine Bestellung gerade steht:
          </p>
          
          <div data-ev-id="ev_dbe72941b4" className="space-y-2">
            <div data-ev-id="ev_96cfcb5423" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <span data-ev-id="ev_c42bd8e597" className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">Entwurf</span>
              <span data-ev-id="ev_8b5733c780" className="text-sm flex-1">Noch nicht eingereicht – du kannst noch bearbeiten</span>
              <Edit className="w-4 h-4 text-muted-foreground" />
            </div>
            <div data-ev-id="ev_7f9b8c4e0c" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <span data-ev-id="ev_6b22aa70f0" className="px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">Eingereicht</span>
              <span data-ev-id="ev_07196fec0e" className="text-sm flex-1">Wartet auf deinen Bereichsleiter</span>
              <Clock className="w-4 h-4 text-orange-500" />
            </div>
            <div data-ev-id="ev_fc33920e46" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <span data-ev-id="ev_994a20dc41" className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Warte auf KDT</span>
              <span data-ev-id="ev_c8626b62c5" className="text-sm flex-1">Bereichsleiter hat freigegeben, wartet auf Kommandant</span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <div data-ev-id="ev_ac18e30144" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <span data-ev-id="ev_267f7efc57" className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Abstimmung</span>
              <span data-ev-id="ev_6e2f01b9ab" className="text-sm flex-1">Kommandomitglieder stimmen ab</span>
              <ThumbsUp className="w-4 h-4 text-purple-500" />
            </div>
            <div data-ev-id="ev_546dde85f9" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <span data-ev-id="ev_5285185455" className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Genehmigt</span>
              <span data-ev-id="ev_a42fa1ddeb" className="text-sm flex-1">Alle Freigaben erteilt – wird bald bestellt</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div data-ev-id="ev_308ca77bf4" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <span data-ev-id="ev_e36b980ba7" className="px-2.5 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-medium">Bestellt</span>
              <span data-ev-id="ev_b9c002abe6" className="text-sm flex-1">Bestellung ist beim Lieferanten</span>
              <Package className="w-4 h-4 text-cyan-500" />
            </div>
            <div data-ev-id="ev_f87824660f" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <span data-ev-id="ev_1d7753c285" className="px-2.5 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">Geliefert</span>
              <span data-ev-id="ev_00c0db2c4d" className="text-sm flex-1">Ware ist eingetroffen</span>
              <PackageCheck className="w-4 h-4 text-teal-500" />
            </div>
            <div data-ev-id="ev_b07bf01a7f" className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <span data-ev-id="ev_3db9f609ae" className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Abgelehnt</span>
              <span data-ev-id="ev_bea9c69931" className="text-sm flex-1">Wurde nicht genehmigt – Grund steht in den Details</span>
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
          </div>
        </div>

  },
  {
    id: 'veranstaltung',
    title: 'Veranstaltung beantragen',
    icon: <Calendar className="w-5 h-5" />,
    keywords: ['veranstaltung', 'kurs', 'fortbildung', 'seminar', 'teilnahme'],
    content:
    <div data-ev-id="ev_0f19d7db66" className="space-y-4">
          <p data-ev-id="ev_1c32a96b65" className="text-muted-foreground">
            Für Kurse, Seminare und Veranstaltungen nutzt du das Antragsformular.
          </p>
          
          <div data-ev-id="ev_4abc7a40e1" className="border border-border rounded-xl overflow-hidden">
            <div data-ev-id="ev_1bce0e7db9" className="bg-blue-500 text-white px-4 py-3 flex items-center gap-3">
              <Calendar className="w-6 h-6" />
              <div data-ev-id="ev_2b595f9d2f">
                <p data-ev-id="ev_4c83cf50b1" className="font-medium">Teilnahme Veranstaltung</p>
                <p data-ev-id="ev_5062957038" className="text-xs text-white/70">Antragsformular</p>
              </div>
            </div>
            <div data-ev-id="ev_75add4637d" className="p-4 space-y-3">
              <p data-ev-id="ev_c1bd875784" className="text-sm">Fülle folgende Felder aus:</p>
              <ul data-ev-id="ev_58442da143" className="text-sm space-y-2 text-muted-foreground">
                <li data-ev-id="ev_4df17bdf09" className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Name der Veranstaltung</li>
                <li data-ev-id="ev_11f405e104" className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Datum und Ort</li>
                <li data-ev-id="ev_e523d07ac5" className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Veranstalter</li>
                <li data-ev-id="ev_51b8fae2df" className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Geschätzte Kosten</li>
                <li data-ev-id="ev_10fde10291" className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Ggf. Übernachtung & Transport</li>
              </ul>
              <Link to="/antragsformulare" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm mt-2">
                <FileText className="w-4 h-4" />
                Zu den Antragsformularen
              </Link>
            </div>
          </div>
        </div>

  },
  {
    id: 'ideen',
    title: 'Ideen einreichen',
    icon: <Lightbulb className="w-5 h-5" />,
    keywords: ['idee', 'vorschlag', 'verbesserung', 'feedback'],
    content:
    <div data-ev-id="ev_bb4a9375ba" className="space-y-4">
          <p data-ev-id="ev_6c3847ef0f" className="text-muted-foreground">
            Hast du eine Idee zur Verbesserung? Reiche sie im Ideen-Pool ein!
          </p>
          
          <div data-ev-id="ev_a2d54be1d7" className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
            <div data-ev-id="ev_434bc87626" className="flex items-start gap-3">
              <Lightbulb className="w-6 h-6 text-yellow-600" />
              <div data-ev-id="ev_d5d1cbaa9b">
                <p data-ev-id="ev_2c9b2b839d" className="font-semibold text-yellow-800 mb-2">So funktioniert's:</p>
                <ol data-ev-id="ev_8f35920a6d" className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                  <li data-ev-id="ev_faa996753b">Gehe zum <strong data-ev-id="ev_98ec2e8750">Ideen-Pool</strong></li>
                  <li data-ev-id="ev_a7f4de9a00">Klicke auf <strong data-ev-id="ev_1417a0da7c">"Neue Idee"</strong></li>
                  <li data-ev-id="ev_56bc7448fb">Beschreibe deine Idee mit Titel und Details</li>
                  <li data-ev-id="ev_b5c37efe67">Wähle eine Kategorie (z.B. Ausrüstung, Prozesse)</li>
                  <li data-ev-id="ev_2d4fe1f6d6">Andere können abstimmen und kommentieren</li>
                </ol>
              </div>
            </div>
          </div>

          <Link to="/ideen" className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm">
            <Lightbulb className="w-4 h-4" />
            Zum Ideen-Pool
          </Link>
        </div>

  }];


  // ==================== BEREICHSLEITER ====================
  const bereichsleiterSections: Section[] = [
  {
    id: 'bl-freigeben',
    title: 'Bestellungen freigeben',
    icon: <CheckCircle className="w-5 h-5" />,
    keywords: ['freigeben', 'genehmigen', 'bestätigen', 'freigabe'],
    content:
    <div data-ev-id="ev_05ed0a85b3" className="space-y-4">
          <p data-ev-id="ev_f79eb5093d" className="text-muted-foreground">
            Als Bereichsleiter siehst du auf dem Dashboard alle Bestellungen, die auf deine Freigabe warten.
          </p>
          
          {/* Mockup */}
          <div data-ev-id="ev_e1b226ad6a" className="bg-card rounded-xl border border-border overflow-hidden">
            <div data-ev-id="ev_b946f7475b" className="bg-amber-500 text-white px-4 py-3 flex items-center justify-between">
              <span data-ev-id="ev_915fb67645" className="font-medium">Freizugeben</span>
              <span data-ev-id="ev_17f39d04cf" className="bg-white/20 px-2 py-0.5 rounded-full text-sm">3 offen</span>
            </div>
            <div data-ev-id="ev_32b73f19d7" className="p-3 space-y-2">
              <div data-ev-id="ev_49621a99b8" className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div data-ev-id="ev_6d180a43e9">
                  <p data-ev-id="ev_81e76aa5de" className="font-medium">Schläuche C 20m</p>
                  <p data-ev-id="ev_9f62d10bae" className="text-sm text-muted-foreground">Max Mustermann • 450,00 €</p>
                </div>
                <div data-ev-id="ev_0d42db2562" className="flex gap-2">
                  <button data-ev-id="ev_52d34c0662" className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200">
                    <CheckCircle className="w-5 h-5" />
                  </button>
                  <button data-ev-id="ev_68185acb83" className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div data-ev-id="ev_2398541149" className="grid gap-3">
            <div data-ev-id="ev_61935bcece" className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div data-ev-id="ev_89d23a1aa6" className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span data-ev-id="ev_0b4d1cf79a" className="font-medium text-emerald-700">Freigeben</span>
              </div>
              <p data-ev-id="ev_78486a63c1" className="text-sm text-emerald-600">Die Bestellung geht weiter zum Kommandanten (bei höheren Beträgen) oder wird direkt genehmigt.</p>
            </div>
            <div data-ev-id="ev_2a6f1fb9ab" className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div data-ev-id="ev_c8419a511b" className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-600" />
                <span data-ev-id="ev_afa78988d2" className="font-medium text-red-700">Ablehnen</span>
              </div>
              <p data-ev-id="ev_1af6112c08" className="text-sm text-red-600">Du musst einen Grund angeben. Der Ersteller wird benachrichtigt.</p>
            </div>
          </div>
        </div>

  },
  {
    id: 'bl-vertretung',
    title: 'Vertretung bei Abwesenheit',
    icon: <UserCheck className="w-5 h-5" />,
    keywords: ['vertretung', 'abwesend', 'urlaub', 'vertreter'],
    content:
    <div data-ev-id="ev_3a877fd58a" className="space-y-4">
          <p data-ev-id="ev_3719b91d9b" className="text-muted-foreground">
            Wenn du nicht verfügbar bist, kann ein Vertreter deine Bestellungen freigeben.
          </p>
          
          <div data-ev-id="ev_4a81e8a9cf" className="border border-border rounded-xl overflow-hidden">
            <div data-ev-id="ev_2cbcfe5ffe" className="bg-purple-500 text-white px-4 py-3">
              <p data-ev-id="ev_330b018afb" className="font-medium">Vertretung einrichten</p>
            </div>
            <div data-ev-id="ev_4c0e8e1cde" className="p-4 space-y-3">
              <ol data-ev-id="ev_2c27ecbd96" className="text-sm space-y-2 list-decimal list-inside">
                <li data-ev-id="ev_fbcd67b2ee">Klicke oben rechts auf deinen Namen</li>
                <li data-ev-id="ev_06e8195965">Wähle <strong data-ev-id="ev_dee9ee32aa">"Meine Vertretung"</strong></li>
                <li data-ev-id="ev_684a1f71d3">Aktiviere <strong data-ev-id="ev_178a49b47f">"Ich bin abwesend"</strong></li>
                <li data-ev-id="ev_90a7c1dc27">Wähle deinen Vertreter aus</li>
                <li data-ev-id="ev_bc4e52e7a8">Optional: Gib an, bis wann du abwesend bist</li>
              </ol>
            </div>
          </div>

          <div data-ev-id="ev_144b8d1a97" className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div data-ev-id="ev_8e2afeec02" className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <p data-ev-id="ev_3548dec0fb" className="text-sm text-amber-700">
                <strong data-ev-id="ev_6a8bf743f0">Wichtig:</strong> Der Vertreter kann nur Bestellungen freigeben, die <em data-ev-id="ev_c3e85bbb91">dir</em> zugewiesen sind. 
                Er übernimmt nicht deine Rolle komplett.
              </p>
            </div>
          </div>
        </div>

  }];


  // ==================== KOMMANDANT ====================
  const kommandantSections: Section[] = [
  {
    id: 'kdt-freigabe',
    title: 'Zweite Freigabestufe',
    icon: <Shield className="w-5 h-5" />,
    keywords: ['kommandant', 'freigabe', 'zweite stufe'],
    content:
    <div data-ev-id="ev_5950a0c1d9" className="space-y-4">
          <p data-ev-id="ev_5e2c1ccc54" className="text-muted-foreground">
            Ab einem bestimmten Betrag ist zusätzlich zur Bereichsleiter-Freigabe auch deine Freigabe erforderlich.
          </p>
          
          <div data-ev-id="ev_e7988e93ed" className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <div data-ev-id="ev_1f1d2d3612" className="flex items-start gap-3">
              <Crown className="w-6 h-6 text-purple-600" />
              <div data-ev-id="ev_cd0c1db7ce">
                <p data-ev-id="ev_9ac3bcf7d6" className="font-semibold text-purple-800 mb-2">Deine Möglichkeiten:</p>
                <ul data-ev-id="ev_bf6492f20f" className="text-sm text-purple-700 space-y-2">
                  <li data-ev-id="ev_b5ea187b3c" className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <strong data-ev-id="ev_4b8b84d60d">Freigeben:</strong> Bestellung wird genehmigt
                  </li>
                  <li data-ev-id="ev_7f0b3906ee" className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <strong data-ev-id="ev_3fc1be41bc">Ablehnen:</strong> Mit Begründung
                  </li>
                  <li data-ev-id="ev_dde875a32f" className="flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-purple-500" />
                    <strong data-ev-id="ev_cf890d448e">Abstimmung anfordern:</strong> Kommandomitglieder entscheiden
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

  },
  {
    id: 'kdt-abstimmung',
    title: 'Kommando-Abstimmung',
    icon: <ThumbsUp className="w-5 h-5" />,
    keywords: ['abstimmung', 'voting', 'kommando', 'mehrheit'],
    content:
    <div data-ev-id="ev_62c6813603" className="space-y-4">
          <p data-ev-id="ev_59297fd3ec" className="text-muted-foreground">
            Bei sehr hohen Beträgen oder auf deinen Wunsch kann das Kommando abstimmen.
          </p>
          
          {/* Voting Mockup */}
          <div data-ev-id="ev_8696f2ac26" className="bg-card rounded-xl border border-border overflow-hidden">
            <div data-ev-id="ev_f4c9e6a234" className="bg-purple-500 text-white px-4 py-3">
              <p data-ev-id="ev_6e43fdf73f" className="font-medium">Abstimmung: Neues Fahrzeug</p>
              <p data-ev-id="ev_1c2202adad" className="text-xs text-white/70">25.000,00 € • 3 von 5 haben abgestimmt</p>
            </div>
            <div data-ev-id="ev_d5ef8a27c3" className="p-4">
              <div data-ev-id="ev_8658be4ef1" className="flex gap-4 mb-3">
                <div data-ev-id="ev_863a9b00f2" className="flex-1 text-center p-3 bg-emerald-50 rounded-lg">
                  <p data-ev-id="ev_7883b7f3ee" className="text-2xl font-bold text-emerald-600">2</p>
                  <p data-ev-id="ev_fb55fe4e94" className="text-xs text-emerald-700">Dafür</p>
                </div>
                <div data-ev-id="ev_41ab106d9c" className="flex-1 text-center p-3 bg-red-50 rounded-lg">
                  <p data-ev-id="ev_f584390931" className="text-2xl font-bold text-red-600">1</p>
                  <p data-ev-id="ev_499135477e" className="text-xs text-red-700">Dagegen</p>
                </div>
              </div>
              <div data-ev-id="ev_22dd8c5da8" className="h-2 bg-muted rounded-full overflow-hidden">
                <div data-ev-id="ev_6ce8d04371" className="h-full bg-emerald-500" style={{ width: '67%' }}></div>
              </div>
            </div>
          </div>

          <div data-ev-id="ev_f710848481" className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p data-ev-id="ev_0f081f542b" className="text-sm text-blue-700">
              <strong data-ev-id="ev_3cbea693ce">Ergebnis:</strong> Mehrheit entscheidet. Bei Gleichstand wird die Abstimmung verlängert oder du triffst die finale Entscheidung.
            </p>
          </div>
        </div>

  },
  {
    id: 'kdt-direkt',
    title: 'Direktfreigabe',
    icon: <CheckCircle className="w-5 h-5" />,
    keywords: ['direkt', 'schnell', 'sofort', 'direktfreigabe'],
    content:
    <div data-ev-id="ev_950d1d74a2" className="space-y-4">
          <p data-ev-id="ev_d1e17b1c11" className="text-muted-foreground">
            Als Kommandant kannst du Bestellungen auch direkt freigeben – ohne auf den Bereichsleiter zu warten.
          </p>
          
          <div data-ev-id="ev_34f0d57817" className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div data-ev-id="ev_dba4585394" className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div data-ev-id="ev_ba2a1a0bdf">
                <p data-ev-id="ev_244798ec0b" className="font-medium text-amber-800">Wann nutzen?</p>
                <p data-ev-id="ev_1bd8ae424d" className="text-sm text-amber-700">
                  Nur in dringenden Fällen, wenn der Bereichsleiter nicht erreichbar ist oder die Bestellung keinen Aufschub duldet.
                </p>
              </div>
            </div>
          </div>
        </div>

  }];


  // ==================== KASSIER ====================
  const kassierSections: Section[] = [
  {
    id: 'kassier-uebersicht',
    title: 'Übersicht Freigaben',
    icon: <Receipt className="w-5 h-5" />,
    keywords: ['übersicht', 'freigaben', 'kassier', 'liste'],
    content:
    <div data-ev-id="ev_f15d1fc056" className="space-y-4">
          <p data-ev-id="ev_1325c613ba" className="text-muted-foreground">
            In der Kassier-Übersicht siehst du alle genehmigten Bestellungen, die bestellt werden können.
          </p>
          
          <Link to="/kassier" className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm">
            <Receipt className="w-4 h-4" />
            Zur Kassier-Übersicht
          </Link>

          <div data-ev-id="ev_b08212b5f9" className="space-y-3">
            <div data-ev-id="ev_193a3a235a" className="p-3 bg-muted/50 rounded-lg">
              <p data-ev-id="ev_bb37da0e93" className="font-medium flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-emerald-500" /> Zur Bestellung
              </p>
              <p data-ev-id="ev_5d708d0724" className="text-sm text-muted-foreground">Alle genehmigten Bestellungen, gruppiert nach Lieferant</p>
            </div>
            <div data-ev-id="ev_064af414b1" className="p-3 bg-muted/50 rounded-lg">
              <p data-ev-id="ev_9c2f353d53" className="font-medium flex items-center gap-2 mb-1">
                <Truck className="w-4 h-4 text-blue-500" /> Warte auf Lieferung
              </p>
              <p data-ev-id="ev_9f245fa355" className="text-sm text-muted-foreground">Bestellungen, die unterwegs sind</p>
            </div>
            <div data-ev-id="ev_79c6d9b204" className="p-3 bg-muted/50 rounded-lg">
              <p data-ev-id="ev_649cabefc4" className="font-medium flex items-center gap-2 mb-1">
                <PackageCheck className="w-4 h-4 text-teal-500" /> Wareneingang
              </p>
              <p data-ev-id="ev_7b4f40c23e" className="text-sm text-muted-foreground">Bestätige, dass die Ware eingetroffen ist</p>
            </div>
          </div>
        </div>

  },
  {
    id: 'kassier-bestellen',
    title: 'Bestellung auslösen',
    icon: <Send className="w-5 h-5" />,
    keywords: ['bestellen', 'auslösen', 'ordern'],
    content:
    <div data-ev-id="ev_271dcf58e5" className="space-y-4">
          <p data-ev-id="ev_16fc894ff7" className="text-muted-foreground">
            So markierst du eine Bestellung als bestellt:
          </p>
          
          <ol data-ev-id="ev_66157cc4da" className="space-y-3">
            <li data-ev-id="ev_b7f31c1539" className="flex items-start gap-3">
              <span data-ev-id="ev_11f0ce85ca" className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
              <p data-ev-id="ev_67722c240b" className="text-sm">Öffne die <strong data-ev-id="ev_b01d1d6004">Kassier-Übersicht</strong></p>
            </li>
            <li data-ev-id="ev_f267b37fc9" className="flex items-start gap-3">
              <span data-ev-id="ev_9ec26f7954" className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
              <p data-ev-id="ev_ccb1a2d8d6" className="text-sm">Finde die Bestellung beim entsprechenden Lieferanten</p>
            </li>
            <li data-ev-id="ev_79ebaf35bf" className="flex items-start gap-3">
              <span data-ev-id="ev_f433551638" className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
              <p data-ev-id="ev_6a1c0b4963" className="text-sm">Bestelle die Ware (per Webshop, Telefon oder E-Mail)</p>
            </li>
            <li data-ev-id="ev_da415f6e7e" className="flex items-start gap-3">
              <span data-ev-id="ev_b515aa97bc" className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
              <p data-ev-id="ev_66bfe35dd2" className="text-sm">Klicke auf <strong data-ev-id="ev_15d2d625ec">"Als bestellt markieren"</strong></p>
            </li>
          </ol>
        </div>

  },
  {
    id: 'kassier-auszahlung',
    title: 'Auszahlungsanweisungen',
    icon: <CreditCard className="w-5 h-5" />,
    keywords: ['auszahlung', 'erstattung', 'zahlung'],
    content:
    <div data-ev-id="ev_30ab5d104f" className="space-y-4">
          <p data-ev-id="ev_d68c63fa9b" className="text-muted-foreground">
            Für Erstattungen und Auszahlungen nutzt du die Auszahlungsanweisungen.
          </p>
          
          <Link to="/antragsformulare" className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm">
            <CreditCard className="w-4 h-4" />
            Zu den Antragsformularen
          </Link>

          <div data-ev-id="ev_200cc4cc57" className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <p data-ev-id="ev_4839d6d851" className="text-sm text-purple-700">
              <strong data-ev-id="ev_c7b2f45142">Workflow:</strong> Erstellen → Einreichen → Kommandant genehmigt → Als bezahlt markieren
            </p>
          </div>
        </div>

  }];


  // ==================== ADMIN ====================
  const adminSections: Section[] = [
  {
    id: 'admin-benutzer',
    title: 'Benutzer verwalten',
    icon: <Users className="w-5 h-5" />,
    keywords: ['benutzer', 'anlegen', 'user', 'mitglied'],
    content:
    <div data-ev-id="ev_11ec707883" className="space-y-4">
          <p data-ev-id="ev_76897fe931" className="text-muted-foreground">
            In der Benutzerverwaltung kannst du neue Benutzer anlegen und Rollen zuweisen.
          </p>
          
          <Link to="/benutzer" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm">
            <Users className="w-4 h-4" />
            Zur Benutzerverwaltung
          </Link>

          <div data-ev-id="ev_39ad4984fb" className="space-y-2">
            <p data-ev-id="ev_c303ef64c1" className="font-medium">Verfügbare Rollen:</p>
            <div data-ev-id="ev_44e8ea7160" className="grid gap-2">
              <div data-ev-id="ev_43e82d4257" className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                <span data-ev-id="ev_dc894f03ec" className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">Mitglied</span>
                <span data-ev-id="ev_0cc21551a1" className="text-sm">Kann Bestellungen erstellen</span>
              </div>
              <div data-ev-id="ev_ca617a80df" className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                <span data-ev-id="ev_eb0067d72f" className="px-2 py-0.5 bg-amber-200 text-amber-700 rounded text-xs">Bereichsleiter</span>
                <span data-ev-id="ev_c2c797e159" className="text-sm">Kann zugewiesene Bestellungen freigeben</span>
              </div>
              <div data-ev-id="ev_0da8dc85c1" className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                <span data-ev-id="ev_08ab6f4edc" className="px-2 py-0.5 bg-purple-200 text-purple-700 rounded text-xs">Kommandant</span>
                <span data-ev-id="ev_3d07e26edf" className="text-sm">Höchste Freigabestufe, voller Zugriff</span>
              </div>
              <div data-ev-id="ev_8ccabe9644" className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                <span data-ev-id="ev_78247dd624" className="px-2 py-0.5 bg-red-200 text-red-700 rounded text-xs">Admin</span>
                <span data-ev-id="ev_f12d6b4b2d" className="text-sm">Technischer Administrator</span>
              </div>
            </div>
          </div>
        </div>

  },
  {
    id: 'admin-einstellungen',
    title: 'Systemeinstellungen',
    icon: <Settings className="w-5 h-5" />,
    keywords: ['einstellungen', 'konfiguration', 'schwellwert'],
    content:
    <div data-ev-id="ev_c44f334c00" className="space-y-4">
          <p data-ev-id="ev_e230c5c084" className="text-muted-foreground">
            Konfiguriere Freigabebeträge, E-Mail-Benachrichtigungen und mehr.
          </p>
          
          <Link to="/einstellungen" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm">
            <Settings className="w-4 h-4" />
            Zu den Einstellungen
          </Link>

          <div data-ev-id="ev_aacf93ec04" className="space-y-3">
            <div data-ev-id="ev_30359c9b25" className="p-3 bg-muted/50 rounded-lg">
              <p data-ev-id="ev_1ceeebc0f5" className="font-medium mb-1">Freigabebeträge</p>
              <p data-ev-id="ev_efdf6000d2" className="text-sm text-muted-foreground">Ab welchem Betrag ist Kommandant-/Kommando-Freigabe nötig?</p>
            </div>
            <div data-ev-id="ev_974f9fccfa" className="p-3 bg-muted/50 rounded-lg">
              <p data-ev-id="ev_c9800d0596" className="font-medium mb-1">E-Mail-Benachrichtigungen</p>
              <p data-ev-id="ev_d5776dda6f" className="text-sm text-muted-foreground">Wer wird per E-Mail informiert?</p>
            </div>
            <div data-ev-id="ev_60d6c7c14a" className="p-3 bg-muted/50 rounded-lg">
              <p data-ev-id="ev_069ff4b8fd" className="font-medium mb-1">Zugriffsrechte</p>
              <p data-ev-id="ev_0238447bb6" className="text-sm text-muted-foreground">Wer darf welche Bereiche sehen?</p>
            </div>
          </div>
        </div>

  }];


  // Alle Sektionen nach Tab
  const sectionsByTab: Record<TabType, Section[]> = {
    grundlagen: grundlagenSections,
    mitglied: mitgliedSections,
    bereichsleiter: bereichsleiterSections,
    kommandant: kommandantSections,
    kassier: kassierSections,
    admin: adminSections
  };

  // Suchfilter
  const filteredSections = useMemo(() => {
    if (!searchTerm.trim()) {
      return sectionsByTab[activeTab];
    }

    const term = searchTerm.toLowerCase();
    const allSections = Object.values(sectionsByTab).flat();

    return allSections.filter((section) =>
    section.title.toLowerCase().includes(term) ||
    section.keywords.some((kw) => kw.includes(term))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sectionsByTab ist statisch und ändert sich nicht
  }, [searchTerm, activeTab]);

  return (
    <Layout>
      <div data-ev-id="ev_f2351edfc5" className="space-y-6">
        {/* Header */}
        <div data-ev-id="ev_e4fc4695e4" className="flex flex-col gap-4">
          <div data-ev-id="ev_ae9971ae8f" className="flex items-center gap-3">
            <div data-ev-id="ev_ecdaa127a9" className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div data-ev-id="ev_4ffaa43dce">
              <h1 data-ev-id="ev_d86b5a0fc1" className="text-2xl font-bold text-foreground">Anleitung</h1>
              <p data-ev-id="ev_a0d419f553" className="text-muted-foreground">Schritt-für-Schritt Erklärungen für alle Funktionen</p>
            </div>
          </div>

          {/* Suchfeld */}
          <div data-ev-id="ev_5b408af49c" className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input data-ev-id="ev_44004c992d"
            type="text"
            placeholder="Suche in der Anleitung... (z.B. Bestellung erstellen)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary" />

            {searchTerm &&
            <button data-ev-id="ev_92132cc10c"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded">

                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            }
          </div>
        </div>

        {/* Tabs */}
        {!searchTerm &&
        <div data-ev-id="ev_c5f9b29a9f" className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) =>
          <button data-ev-id="ev_cff29676ae"
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
          activeTab === tab.id ?
          `${tab.color} text-white shadow-lg` :
          'bg-muted text-muted-foreground hover:bg-muted/80'}`
          }>

                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
          )}
          </div>
        }

        {/* Suchergebnis-Info */}
        {searchTerm &&
        <div data-ev-id="ev_ab01682499" className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p data-ev-id="ev_c0bc74c54e" className="text-sm text-blue-700">
              <Search className="w-4 h-4 inline mr-2" />
              {filteredSections.length} Ergebnis{filteredSections.length !== 1 ? 'se' : ''} für "{searchTerm}"
            </p>
          </div>
        }

        {/* Sektionen */}
        <div data-ev-id="ev_6c89dc43f3" className="space-y-3">
          {filteredSections.length === 0 ?
          <div data-ev-id="ev_1590732c5a" className="text-center py-12">
              <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p data-ev-id="ev_5a229dc566" className="text-muted-foreground">Keine Ergebnisse gefunden.</p>
              <p data-ev-id="ev_85ecb6c7ce" className="text-sm text-muted-foreground">Versuche andere Suchbegriffe.</p>
            </div> :

          filteredSections.map((section) =>
          <div data-ev-id="ev_2c04c36287"
          key={section.id}
          className="bg-card rounded-xl border border-border overflow-hidden">

                <button data-ev-id="ev_5543264d9d"
            onClick={() => toggleSection(section.id)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors">

                  <div data-ev-id="ev_036d2e4aaa" className="flex items-center gap-3">
                    <div data-ev-id="ev_c331a59108" className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                      {section.icon}
                    </div>
                    <span data-ev-id="ev_8d91b716f7" className="font-semibold text-foreground">{section.title}</span>
                  </div>
                  {expandedSections.includes(section.id) ?
              <ChevronDown className="w-5 h-5 text-muted-foreground" /> :

              <ChevronRight className="w-5 h-5 text-muted-foreground" />
              }
                </button>
                
                {expandedSections.includes(section.id) &&
            <div data-ev-id="ev_66e97cbc65" className="px-4 pb-4 border-t border-border pt-4">
                    {section.content}
                  </div>
            }
              </div>
          )
          }
        </div>

        {/* Hilfe-Footer */}
        <div data-ev-id="ev_2e2442dc6e" className="bg-muted/50 rounded-xl p-4 text-center">
          <p data-ev-id="ev_baf16b8aa4" className="text-sm text-muted-foreground">
            Noch Fragen? Wende dich an deinen Kommandanten oder Administrator.
          </p>
        </div>
      </div>
    </Layout>);

}