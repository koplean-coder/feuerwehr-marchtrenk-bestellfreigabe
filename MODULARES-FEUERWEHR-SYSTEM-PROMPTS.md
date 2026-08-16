# Modulares Feuerwehrverwaltungs-System
## Komplette Prompt-Sammlung für schrittweise Implementierung

> **Anleitung:** Führe die Prompts der Reihe nach aus. Jeder Prompt baut auf den vorherigen auf. Kopiere den gewünschten Prompt-Abschnitt und füge ihn in den Chat ein.

---

# Inhaltsverzeichnis

1. [Prompt 1: Projekt-Setup & Grundstruktur](#prompt-1-projekt-setup--grundstruktur)
2. [Prompt 2: Benutzer, Rollen & Berechtigungssystem](#prompt-2-benutzer-rollen--berechtigungssystem)
3. [Prompt 3: Dashboard-System mit Modul-Widgets](#prompt-3-dashboard-system-mit-modul-widgets)
4. [Prompt 4: App-Konfiguration & Branding](#prompt-4-app-konfiguration--branding)
5. [Prompt 5: Profil- & Abwesenheitsverwaltung](#prompt-5-profil---abwesenheitsverwaltung)
6. [Prompt 6: Benachrichtigungssystem](#prompt-6-benachrichtigungssystem)
7. [Prompt 7: Authentifizierung & Session-Management](#prompt-7-authentifizierung--session-management)
8. [Prompt 8: Direktnachrichten-System](#prompt-8-direktnachrichten-system)
9. [Prompt 9: Admin Dashboard & Modul-Management](#prompt-9-admin-dashboard--modul-management)
10. [Prompt 10: Bestellungen-Modul](#prompt-10-bestellungen-modul)
11. [Prompt 11: Zahlungsanträge-Modul](#prompt-11-zahlungsanträge-modul)
12. [Prompt 12: Lieferanten-Modul](#prompt-12-lieferanten-modul)
13. [Prompt 13: Aufgaben-Modul](#prompt-13-aufgaben-modul)
14. [Prompt 14: Ideenpool-Modul](#prompt-14-ideenpool-modul)
15. [Prompt 15: Abschluss & Integration](#prompt-15-abschluss--integration)

---

# Prompt 1: Projekt-Setup & Grundstruktur

## Übersicht

Erstelle die Grundstruktur für ein **modulares Feuerwehrverwaltungs-System**. Das System soll:
- Vollständig modular aufgebaut sein (Module können pro Organisation aktiviert/deaktiviert werden)
- Single-Tenant by default (eine Installation = eine Feuerwehr)
- Responsive und PWA-fähig sein
- Komplett deutschsprachig sein

---

## Technologie-Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS v4
- **Routing:** React Router v7
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Icons:** Lucide React
- **State:** React Context + Custom Hooks
- **PDF:** jsPDF
- **Excel:** xlsx

---

## Ordnerstruktur

src/
├── components/
│   ├── common/          # Wiederverwendbare UI-Komponenten
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Badge.tsx
│   │   ├── Avatar.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── index.ts
│   ├── layout/          # Layout-Komponenten
│   │   ├── Layout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   └── index.ts
│   └── [module]/        # Modul-spezifische Komponenten
├── contexts/            # React Contexts
│   ├── AuthContext.tsx
│   ├── SimulationContext.tsx
│   ├── NotificationsContext.tsx
│   └── ModulesContext.tsx
├── hooks/               # Custom Hooks
│   ├── useAuth.ts
│   ├── useModules.ts
│   ├── useProfiles.ts
│   ├── useSettings.ts
│   └── useNotifications.ts
├── pages/               # Seiten-Komponenten
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Settings.tsx
│   └── [module]/
├── integrations/
│   └── supabase/
│       ├── client.ts
│       ├── types.ts
│       └── helpers.ts
├── utils/               # Hilfsfunktionen
│   ├── formatters.ts
│   ├── validators.ts
│   └── constants.ts
├── types/               # TypeScript Typen
│   └── index.ts
├── App.tsx
├── main.tsx
├── providers.tsx
├── theme.css
└── index.css

---

## Datenbank-Schema: Grundtabellen

### Tabelle: profiles (Benutzerprofile)

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'mitglied' CHECK (role IN ('admin', 'kommandant', 'bereichsleiter', 'mitglied')),
  functions TEXT[] DEFAULT '{}',
  default_bereichsleiter_id UUID REFERENCES public.profiles(id),
  is_absent BOOLEAN NOT NULL DEFAULT false,
  absent_until DATE,
  absence_reason TEXT,
  substitute_id UUID REFERENCES public.profiles(id),
  home_page TEXT DEFAULT '/dashboard',
  notification_settings JSONB DEFAULT '{"email": true, "push": true, "inApp": true}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ
);

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

### Tabelle: app_settings (Globale Einstellungen)

CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name TEXT NOT NULL DEFAULT 'Feuerwehr',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#dc2626',
  secondary_color TEXT DEFAULT '#1e3a8a',
  pdf_background_url TEXT,
  pdf_background_opacity NUMERIC DEFAULT 0.15,
  pdf_stamp_url TEXT,
  approval_limit_bereichsleiter NUMERIC DEFAULT 500,
  approval_limit_kommandant NUMERIC DEFAULT 2000,
  escalation_timeout_hours INTEGER DEFAULT 72,
  email_sender_name TEXT DEFAULT 'Feuerwehr System',
  email_footer_text TEXT,
  min_order_value_enabled BOOLEAN DEFAULT true,
  require_kommandomitglied_approval BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_app_settings_singleton ON public.app_settings ((true));

---

## Basis-Komponenten zu erstellen

Button.tsx - Verschiedene Varianten (primary, secondary, danger, ghost)
Card.tsx - Container für Inhalte
Modal.tsx - Dialog-Komponente
Input.tsx, Select.tsx - Formular-Elemente
Badge.tsx, Avatar.tsx - Kleine UI-Elemente
EmptyState.tsx, LoadingSpinner.tsx - Zustands-Anzeigen

---

## Theme-System (theme.css)

@theme {
  --color-primary: #dc2626;
  --color-primary-foreground: #ffffff;
  --color-secondary: #1e3a8a;
  --color-secondary-foreground: #ffffff;
  --color-background: #ffffff;
  --color-foreground: #0f172a;
  --color-muted: #f1f5f9;
  --color-muted-foreground: #64748b;
  --color-border: #e2e8f0;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #3b82f6;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;
  --font-sans: 'Inter', system-ui, sans-serif;
}

---

## Zu erstellende Dateien

1. Ordnerstruktur komplett anlegen
2. Basis-Komponenten (Button, Card, Modal, Input, Select, Badge, Avatar, EmptyState, LoadingSpinner)
3. Layout-Komponenten (Layout, Sidebar, Header, Navigation)
4. Theme-Datei (theme.css)
5. Supabase-Integration (client.ts, types.ts, helpers.ts)
6. Basis-Contexts (AuthContext, ModulesContext)
7. Providers-Datei (providers.tsx)
8. App.tsx mit Routing-Struktur
9. Login-Seite (einfache Version)
10. Dashboard-Seite (Platzhalter)

---

**Implementiere Prompt 1 vollständig, bevor du mit Prompt 2 fortfährst.**

---
---

# Prompt 2: Benutzer, Rollen & Berechtigungssystem

## Übersicht

Implementiere ein vollständiges **Rollen- und Berechtigungssystem** mit flexiblen Funktionen und einem Simulation-Mode zum Testen.

---

## Rollen-Hierarchie

| Rolle | Beschreibung | Berechtigungen |
|-------|--------------|----------------|
| **Admin** | System-Administrator | Alles, inkl. Benutzerverwaltung & Einstellungen |
| **Kommandant** | Feuerwehrkommandant | Alle Freigaben, Benutzer verwalten |
| **Bereichsleiter** | Leiter eines Bereichs | Zugewiesene Bestellungen freigeben |
| **Mitglied** | Normales Mitglied | Eigene Bestellungen/Anträge erstellen |

---

## Funktionen (zusätzlich zur Rolle)

- **Kassier** - Kann alle Bestellungen sehen, Zahlungen verwalten
- **Zeugwart** - Kann Inventar/Geräte verwalten
- **Schriftführer** - Kann Protokolle erstellen
- **Kommandomitglied** - Stimmberechtigt bei Kommando-Abstimmungen
- **Lieferanten-Erfasser** - Kann Lieferanten anlegen/bearbeiten

---

## Berechtigungsmatrix

const PERMISSIONS = {
  // Bestellungen
  'orders.view_own': ['mitglied', 'bereichsleiter', 'kommandant', 'admin'],
  'orders.view_all': ['kommandant', 'admin', 'kassier'],
  'orders.create': ['mitglied', 'bereichsleiter', 'kommandant', 'admin'],
  'orders.approve_bl': ['bereichsleiter', 'kommandant', 'admin'],
  'orders.approve_kdt': ['kommandant', 'admin'],
  'orders.delete': ['admin', 'kassier'],
  
  // Benutzer
  'users.view': ['kommandant', 'admin'],
  'users.create': ['admin'],
  'users.edit': ['kommandant', 'admin'],
  'users.delete': ['admin'],
  
  // Einstellungen
  'settings.view': ['kommandant', 'admin'],
  'settings.edit': ['admin'],
  
  // Lieferanten
  'suppliers.view': ['mitglied', 'bereichsleiter', 'kommandant', 'admin'],
  'suppliers.create': ['kommandant', 'admin', 'lieferanten_erfassen'],
  'suppliers.edit': ['kommandant', 'admin', 'lieferanten_erfassen'],
};

---

## SimulationContext

Erstelle einen SimulationContext der es Admins/Kommandanten erlaubt, die App als ein anderer Benutzer zu sehen (ohne dessen Daten zu ändern).

interface SimulationContextType {
  isSimulationActive: boolean;
  simulatedUserId: string | null;
  simulatedProfile: Profile | null;
  setSimulatedUserId: (userId: string | null) => void;
  resetSimulation: () => void;
  
  // Effective values (immer diese verwenden!)
  effectiveUserId: string | undefined;
  effectiveProfile: Profile | null;
  effectiveIsAdmin: boolean;
  effectiveIsKommandant: boolean;
  effectiveIsBereichsleiter: boolean;
  effectiveIsMitglied: boolean;
  effectiveHasKassierFunction: boolean;
  effectiveHasKommandomitgliedFunction: boolean;
  effectiveFunctions: string[];
  
  // Permission helpers
  canViewAllOrders: boolean;
  canApproveOrders: boolean;
  canManageUsers: boolean;
  canManageSuppliers: boolean;
  canAccessSettings: boolean;
  canDeleteOrders: boolean;
}

---

## Hook: usePermissions

export function usePermissions() {
  const { effectiveProfile, effectiveFunctions } = useSimulation();
  
  function hasPermission(permission: string): boolean;
  function hasRole(role: string): boolean;
  function hasFunction(func: string): boolean;
  function hasAnyRole(roles: string[]): boolean;
  function hasAnyFunction(functions: string[]): boolean;
  
  return {
    hasPermission,
    hasRole,
    hasFunction,
    hasAnyRole,
    hasAnyFunction,
  };
}

---

## Komponenten

### SandboxSwitcher (Simulations-Umschalter)

Ein Dropdown in der Navigation (nur für Admin/Kommandant sichtbar), mit dem man einen anderen Benutzer auswählen kann, um die App aus dessen Perspektive zu sehen.

### PermissionGate (Berechtigungs-Wrapper)

<PermissionGate permission="orders.approve_kdt">
  <ApproveButton />
</PermissionGate>

<PermissionGate roles={['admin', 'kommandant']}>
  <AdminMenu />
</PermissionGate>

---

## Zu erstellende Dateien

1. src/contexts/SimulationContext.tsx
2. src/hooks/usePermissions.ts
3. src/components/common/PermissionGate.tsx
4. src/components/layout/SandboxSwitcher.tsx
5. src/utils/permissions.ts (Berechtigungsmatrix)
6. AuthContext erweitern (Rollen-Logik)

---

**Implementiere Prompt 2 vollständig, bevor du mit Prompt 3 fortfährst.**

---
---

# Prompt 3: Dashboard-System mit Modul-Widgets

## Übersicht

Erstelle ein **flexibles Dashboard-System**, bei dem Module eigene Widgets registrieren können. Das Dashboard soll personalisierbar sein und verschiedene Widget-Typen unterstützen.

---

## Widget-Registry System

interface DashboardWidget {
  id: string;
  moduleSlug: string;
  title: string;
  description: string;
  component: React.ComponentType<WidgetProps>;
  defaultSize: 'small' | 'medium' | 'large' | 'full';
  minRole?: string;
  requiredFunctions?: string[];
  refreshInterval?: number; // in Sekunden
}

interface WidgetProps {
  size: 'small' | 'medium' | 'large' | 'full';
  onAction?: (action: string, data?: unknown) => void;
}

---

## Dashboard-Layout

+------------------------------------------+
|  Guten Morgen, Max!           [Anpassen] |
+------------------------------------------+
| +--------+ +--------+ +--------+ +------+|
| | Stats  | | Stats  | | Stats  | | Stats||
| | Karte  | | Karte  | | Karte  | | Karte||
| +--------+ +--------+ +--------+ +------+|
+------------------------------------------+
| +------------------+ +------------------+ |
| | Meine Aufgaben   | | Offene Freigaben | |
| | - Aufgabe 1      | | - Bestellung #1  | |
| | - Aufgabe 2      | | - Bestellung #2  | |
| +------------------+ +------------------+ |
+------------------------------------------+
| +--------------------------------------+ |
| | Letzte Aktivitäten                   | |
| | - Max hat Bestellung genehmigt       | |
| | - Anna hat Aufgabe erledigt          | |
| +--------------------------------------+ |
+------------------------------------------+

---

## Standard-Widgets

### StatsWidget (klein)
- Zeigt eine einzelne Zahl mit Icon und Trend
- Z.B. "12 offene Bestellungen" mit +3 Trend

### TaskListWidget (medium)
- Liste von Aufgaben/Items mit Quick-Actions
- Scrollbar bei vielen Einträgen

### ActivityFeedWidget (large)
- Chronologische Liste von Aktivitäten
- Mit Filtermöglichkeit

### ChartWidget (medium/large)
- Diagramm-Darstellung von Daten
- Verschiedene Chart-Typen

---

## Hook: useDashboard

export function useDashboard() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [layout, setLayout] = useState<WidgetLayout[]>([]);
  
  // Registriert ein Widget (von Modulen aufgerufen)
  function registerWidget(widget: DashboardWidget): void;
  
  // Entfernt ein Widget
  function unregisterWidget(widgetId: string): void;
  
  // Verfügbare Widgets für aktuellen Benutzer
  function getAvailableWidgets(): DashboardWidget[];
  
  // Benutzer-Layout speichern/laden
  async function saveLayout(layout: WidgetLayout[]): Promise<void>;
  async function loadLayout(): Promise<WidgetLayout[]>;
  
  return {
    widgets,
    layout,
    registerWidget,
    unregisterWidget,
    getAvailableWidgets,
    saveLayout,
    loadLayout,
  };
}

---

## Datenbank: Dashboard-Layout speichern

CREATE TABLE public.user_dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  layout JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

---

## Zu erstellende Dateien

1. src/contexts/DashboardContext.tsx
2. src/hooks/useDashboard.ts
3. src/pages/Dashboard.tsx
4. src/components/dashboard/WidgetContainer.tsx
5. src/components/dashboard/WidgetGrid.tsx
6. src/components/dashboard/widgets/StatsWidget.tsx
7. src/components/dashboard/widgets/TaskListWidget.tsx
8. src/components/dashboard/widgets/ActivityFeedWidget.tsx
9. src/components/dashboard/DashboardCustomizer.tsx

---

**Implementiere Prompt 3 vollständig, bevor du mit Prompt 4 fortfährst.**

---
---

# Prompt 4: App-Konfiguration & Branding

## Übersicht

Erstelle eine umfassende **Einstellungs-Seite** für die App-Konfiguration. Admins sollen hier das gesamte Erscheinungsbild und Verhalten der App anpassen können.

---

## Einstellungs-Bereiche

### 1. Branding & Erscheinungsbild
- Organisationsname
- Logo-Upload
- Primärfarbe (Color Picker)
- Sekundärfarbe
- Favicon

### 2. PDF-Einstellungen
- Hintergrund-Bild für PDFs
- Hintergrund-Transparenz (Slider)
- Stempel-Bild für genehmigte Dokumente
- Fußzeilen-Text

### 3. Workflow-Einstellungen
- Freigabegrenze Bereichsleiter (€)
- Freigabegrenze Kommandant (€)
- Eskalations-Timeout (Stunden)
- Mindestbestellwert aktivieren (ja/nein)
- Kommandomitglied-Abstimmung erforderlich (ja/nein)

### 4. E-Mail-Einstellungen
- Absender-Name
- Fußzeilen-Text
- E-Mail-Vorlagen (pro Ereignis)

### 5. Benachrichtigungen
- Standard-Einstellungen für neue Benutzer
- Erinnerungs-Intervalle

---

## Hook: useSettings

export interface AppSettings {
  organization_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  pdf_background_url: string | null;
  pdf_background_opacity: number;
  pdf_stamp_url: string | null;
  approval_limit_bereichsleiter: number;
  approval_limit_kommandant: number;
  escalation_timeout_hours: number;
  min_order_value_enabled: boolean;
  require_kommandomitglied_approval: boolean;
  email_sender_name: string;
  email_footer_text: string | null;
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  async function fetchSettings(): Promise<void>;
  async function updateSettings(updates: Partial<AppSettings>): Promise<void>;
  async function uploadLogo(file: File): Promise<string>;
  async function uploadPdfBackground(file: File): Promise<string>;
  async function uploadStamp(file: File): Promise<string>;
  
  return {
    settings,
    loading,
    fetchSettings,
    updateSettings,
    uploadLogo,
    uploadPdfBackground,
    uploadStamp,
  };
}

---

## Komponenten

### SettingsPage - Hauptseite
Tabs oder Akkordeon für die verschiedenen Bereiche

### ColorPicker - Farbauswahl
Mit Vorschau und Hex-Eingabe

### ImageUploader - Bild-Upload
Mit Vorschau, Crop-Möglichkeit, und Löschen

### SettingsSection - Bereichs-Container
Kollabierbare Sektionen

---

## Zu erstellende Dateien

1. src/pages/Settings.tsx (Hauptseite)
2. src/components/settings/BrandingSection.tsx
3. src/components/settings/PdfSection.tsx
4. src/components/settings/WorkflowSection.tsx
5. src/components/settings/EmailSection.tsx
6. src/components/settings/NotificationSection.tsx
7. src/components/common/ColorPicker.tsx
8. src/components/common/ImageUploader.tsx
9. src/hooks/useSettings.ts erweitern

---

**Implementiere Prompt 4 vollständig, bevor du mit Prompt 5 fortfährst.**

---
---

# Prompt 5: Profil- & Abwesenheitsverwaltung

## Übersicht

Erstelle eine **Profil-Verwaltung** für jeden Benutzer mit Abwesenheits-Management und automatischem Stellvertreter-System.

---

## Profil-Seite Features

### Persönliche Daten
- Name bearbeiten
- Avatar hochladen
- E-Mail (nur anzeigen)
- Rolle (nur anzeigen)
- Funktionen (nur anzeigen)

### Abwesenheit
- Abwesend melden (Datum von-bis)
- Abwesenheitsgrund
- Stellvertreter auswählen
- Automatische Benachrichtigung an Stellvertreter

### Benachrichtigungs-Einstellungen
- E-Mail-Benachrichtigungen (an/aus pro Typ)
- Push-Benachrichtigungen (an/aus pro Typ)
- In-App-Benachrichtigungen (an/aus pro Typ)

### Startseite
- Welche Seite nach Login angezeigt wird
- Dropdown mit verfügbaren Seiten

---

## Stellvertreter-System

Wenn ein Benutzer abwesend ist:
1. Bestellungen/Aufgaben gehen automatisch an den Stellvertreter
2. Stellvertreter sieht "Vertretung für [Name]" Badge
3. E-Mail-Benachrichtigung an Stellvertreter bei neuen Aufgaben
4. Nach Rückkehr: Automatische Rückmeldung

---

## Datenbank-Erweiterung

-- Bereits in profiles enthalten:
is_absent BOOLEAN DEFAULT false
absent_until DATE
absence_reason TEXT
substitute_id UUID REFERENCES profiles(id)

-- Benachrichtigungs-Einstellungen pro Benutzer
CREATE TABLE public.user_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  UNIQUE(user_id, notification_type)
);

---

## Hook: useProfile

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  async function updateProfile(updates: Partial<Profile>): Promise<void>;
  async function uploadAvatar(file: File): Promise<string>;
  async function setAbsence(data: {
    is_absent: boolean;
    absent_until?: Date;
    absence_reason?: string;
    substitute_id?: string;
  }): Promise<void>;
  async function clearAbsence(): Promise<void>;
  async function updateNotificationSettings(settings: NotificationSettings): Promise<void>;
  
  return {
    profile,
    loading,
    updateProfile,
    uploadAvatar,
    setAbsence,
    clearAbsence,
    updateNotificationSettings,
  };
}

---

## Komponenten

### ProfilePage - Profilseite
### AbsenceModal - Abwesenheit einstellen
### SubstituteSelector - Stellvertreter auswählen
### NotificationSettingsForm - Benachrichtigungs-Einstellungen
### AvatarUploader - Avatar hochladen

---

## Zu erstellende Dateien

1. src/pages/Profile.tsx
2. src/components/profile/PersonalDataSection.tsx
3. src/components/profile/AbsenceSection.tsx
4. src/components/profile/AbsenceModal.tsx
5. src/components/profile/SubstituteSelector.tsx
6. src/components/profile/NotificationSettingsForm.tsx
7. src/components/common/AvatarUploader.tsx
8. src/hooks/useProfile.ts

---

**Implementiere Prompt 5 vollständig, bevor du mit Prompt 6 fortfährst.**

---
---

# Prompt 6: Benachrichtigungssystem

## Übersicht

Erstelle ein vollständiges **Benachrichtigungssystem** mit drei Kanälen: In-App, E-Mail und Push-Notifications.

---

## Benachrichtigungs-Typen

| Typ | Beschreibung | Standard |
|-----|--------------|----------|
| order_submitted | Neue Bestellung eingereicht | Email + InApp |
| order_approved | Bestellung genehmigt | Email + InApp |
| order_rejected | Bestellung abgelehnt | Email + InApp |
| order_escalated | Bestellung eskaliert (Timeout) | Email + Push |
| task_assigned | Aufgabe zugewiesen | Email + InApp |
| task_due | Aufgabe fällig | Push + InApp |
| message_received | Neue Direktnachricht | Push + InApp |
| mention | Erwähnung in Kommentar | Push + InApp |
| substitute_active | Vertretung aktiv | Email |

---

## Datenbank-Schema

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  reference_type TEXT,
  reference_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  email_sent BOOLEAN DEFAULT false,
  push_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

---

## NotificationsContext

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

---

## Edge Functions

### send-notification
Zentrale Funktion zum Senden von Benachrichtigungen:
1. Prüft Benutzer-Einstellungen
2. Erstellt In-App Notification
3. Sendet E-Mail (falls aktiviert)
4. Sendet Push (falls aktiviert)

### send-push
Sendet Web Push Notifications an alle Subscriptions eines Benutzers.

---

## Komponenten

### NotificationBell - Glocke in der Navigation
Mit Badge für ungelesene Anzahl

### NotificationDropdown - Schnellübersicht
Liste der letzten 5 Benachrichtigungen

### NotificationsPage - Alle Benachrichtigungen
Vollständige Liste mit Filter und Suche

### NotificationItem - Einzelne Benachrichtigung
Mit Icon, Titel, Zeit, Gelesen-Status

---

## Zu erstellende Dateien

1. src/contexts/NotificationsContext.tsx
2. src/hooks/useNotifications.ts
3. src/pages/Notifications.tsx
4. src/components/notifications/NotificationBell.tsx
5. src/components/notifications/NotificationDropdown.tsx
6. src/components/notifications/NotificationItem.tsx
7. src/lib/pushNotifications.ts
8. supabase/functions/send-notification/index.ts
9. supabase/functions/send-push/index.ts

---

**Implementiere Prompt 6 vollständig, bevor du mit Prompt 7 fortfährst.**

---
---

# Prompt 7: Authentifizierung & Session-Management

## Übersicht

Erstelle ein vollständiges **Authentifizierungssystem** mit Login, Logout, Passwort-Reset und Session-Management.

---

## Features

### Login-Seite
- E-Mail + Passwort
- "Angemeldet bleiben" Option
- Passwort vergessen Link
- Fehlerbehandlung mit klaren Meldungen

### Passwort-Reset Flow
1. E-Mail eingeben
2. Reset-Link per E-Mail
3. Neues Passwort setzen
4. Automatischer Login

### Session-Management
- Automatische Token-Refresh
- Session-Timeout Warnung
- Sichere Logout-Funktion
- Multi-Tab Synchronisation

### Route Guards
- Protected Routes (nur eingeloggt)
- Role-based Routes (nur bestimmte Rollen)
- Redirect nach Login zur ursprünglichen Seite

---

## AuthContext erweitert

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  
  // Rollen-Checks
  isAdmin: boolean;
  isKommandant: boolean;
  isBereichsleiter: boolean;
  isMitglied: boolean;
  
  // Aktionen
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  
  // Session
  refreshSession: () => Promise<void>;
  sessionExpiresAt: Date | null;
}

---

## Komponenten

### LoginPage
Modernes Login-Formular mit Branding

### ForgotPasswordPage
E-Mail-Eingabe für Reset-Link

### ResetPasswordPage
Neues Passwort setzen

### ProtectedRoute
Wrapper für geschützte Routen

### SessionTimeoutWarning
Modal das vor Ablauf der Session warnt

---

## Zu erstellende Dateien

1. src/contexts/AuthContext.tsx (erweitern)
2. src/pages/Login.tsx
3. src/pages/ForgotPassword.tsx
4. src/pages/ResetPassword.tsx
5. src/components/auth/ProtectedRoute.tsx
6. src/components/auth/RoleRoute.tsx
7. src/components/auth/SessionTimeoutWarning.tsx
8. src/hooks/useSession.ts

---

**Implementiere Prompt 7 vollständig, bevor du mit Prompt 8 fortfährst.**

---
---

# Prompt 8: Direktnachrichten-System

## Übersicht

Erstelle ein vollständiges **Direktnachrichten-System**, das modul-unabhängig funktioniert und von allen Teilen der App genutzt werden kann. Es ermöglicht 1:1 Kommunikation zwischen Benutzern sowie Kontext-bezogene Nachrichten (z.B. zu einer Bestellung, Aufgabe, etc.).

---

## Datenbank-Schema

CREATE TABLE public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Sender & Empfänger
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Nachrichteninhalt
  subject TEXT,
  content TEXT NOT NULL,
  
  -- Kontext-Referenz (optional)
  context_type TEXT,
  context_id UUID,
  context_title TEXT,
  
  -- Status
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Archivierung
  archived_by_sender BOOLEAN NOT NULL DEFAULT false,
  archived_by_recipient BOOLEAN NOT NULL DEFAULT false,
  
  -- Antwort-Kette
  reply_to_id UUID REFERENCES public.direct_messages(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_direct_messages_sender ON public.direct_messages(sender_id);
CREATE INDEX idx_direct_messages_recipient ON public.direct_messages(recipient_id);
CREATE INDEX idx_direct_messages_context ON public.direct_messages(context_type, context_id);
CREATE INDEX idx_direct_messages_unread ON public.direct_messages(recipient_id, is_read) WHERE is_read = false;

---

## Hook: useDirectMessages

export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string | null;
  content: string;
  context_type: string | null;
  context_id: string | null;
  context_title: string | null;
  is_read: boolean;
  read_at: string | null;
  archived_by_sender: boolean;
  archived_by_recipient: boolean;
  reply_to_id: string | null;
  created_at: string;
  sender?: { id: string; full_name: string; email: string };
  recipient?: { id: string; full_name: string; email: string };
}

export interface SendMessageData {
  recipient_id: string;
  subject?: string;
  content: string;
  context_type?: string;
  context_id?: string;
  context_title?: string;
  reply_to_id?: string;
}

export function useDirectMessages() {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  async function fetchMessages(): Promise<void>;
  async function fetchConversation(otherUserId: string): Promise<DirectMessage[]>;
  async function fetchContextMessages(contextType: string, contextId: string): Promise<DirectMessage[]>;
  async function sendMessage(data: SendMessageData): Promise<DirectMessage | null>;
  async function markAsRead(messageId: string): Promise<void>;
  async function markConversationAsRead(otherUserId: string): Promise<void>;
  async function archiveMessage(messageId: string): Promise<void>;
  async function fetchUnreadCount(): Promise<number>;

  return {
    messages,
    loading,
    unreadCount,
    fetchMessages,
    fetchConversation,
    fetchContextMessages,
    sendMessage,
    markAsRead,
    markConversationAsRead,
    archiveMessage,
    fetchUnreadCount,
  };
}

---

## Komponenten

### MessagesPage - Hauptseite (/nachrichten)
Posteingang, Gesendet, Archiv

### ConversationView - Konversationsansicht
Chat-Style Darstellung einer Konversation

### NewMessageModal - Neue Nachricht erstellen
Empfänger auswählen, Betreff, Nachricht

### QuickMessageButton - Kontext-bezogene Schnellnachricht
Kann überall eingebettet werden:

<QuickMessageButton
  recipientId={order.created_by}
  contextType="order"
  contextId={order.id}
  contextTitle={order.title}
  buttonText="Nachricht an Ersteller"
/>

### MessageNotificationBadge - Ungelesene Badge
Für Navigation/Header

---

## Zu erstellende Dateien

1. src/hooks/useDirectMessages.ts
2. src/pages/Messages.tsx
3. src/components/messages/ConversationList.tsx
4. src/components/messages/ConversationView.tsx
5. src/components/messages/NewMessageModal.tsx
6. src/components/messages/QuickMessageButton.tsx
7. src/components/messages/MessageNotificationBadge.tsx

---

**Implementiere Prompt 8 vollständig, bevor du mit Prompt 9 fortfährst.**

---
---

# Prompt 9: Admin Dashboard & Modul-Management

## Übersicht

Erstelle ein **Admin Dashboard** mit zentraler Verwaltung aller Module, System-Einstellungen und Übersichts-Statistiken. Nur Admin/Kommandant haben Zugriff.

---

## Datenbank-Schema

### Tabelle: modules (Modul-Registry)

CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_core BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  depends_on TEXT[],
  required_roles TEXT[],
  required_functions TEXT[],
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.modules (slug, name, description, icon, is_core, sort_order, category) VALUES
  ('dashboard', 'Dashboard', 'Übersichts-Dashboard', 'LayoutDashboard', true, 0, 'core'),
  ('orders', 'Bestellungen', 'Bestellanforderungen verwalten', 'ShoppingCart', false, 10, 'finanzen'),
  ('payment_orders', 'Zahlungsanträge', 'Zahlungsanträge und Abrechnungen', 'CreditCard', false, 20, 'finanzen'),
  ('suppliers', 'Lieferanten', 'Lieferantenverwaltung', 'Truck', false, 30, 'finanzen'),
  ('tasks', 'Aufgaben', 'Aufgaben und Projekte', 'CheckSquare', false, 40, 'verwaltung'),
  ('ideas', 'Ideenpool', 'Ideen sammeln und abstimmen', 'Lightbulb', false, 50, 'kommunikation'),
  ('messages', 'Nachrichten', 'Direktnachrichten', 'MessageSquare', false, 60, 'kommunikation'),
  ('users', 'Benutzerverwaltung', 'Benutzer und Rollen verwalten', 'Users', true, 70, 'admin'),
  ('settings', 'Einstellungen', 'System-Einstellungen', 'Settings', true, 80, 'admin');

### Tabelle: audit_log (Aktivitätsprotokoll)

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_title TEXT,
  changes JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_date ON public.audit_log(created_at DESC);

---

## Hooks

### useModules

export function useModules() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchModules(): Promise<void>;
  function isModuleAvailable(slug: string): boolean;
  async function toggleModule(slug: string, enabled: boolean): Promise<void>;
  async function updateModuleSettings(slug: string, settings: Record<string, unknown>): Promise<void>;
  async function reorderModules(orderedSlugs: string[]): Promise<void>;

  const activeModules = modules.filter(m => m.is_enabled);
  const modulesByCategory = groupBy(activeModules, 'category');

  return {
    modules,
    activeModules,
    modulesByCategory,
    loading,
    isModuleAvailable,
    toggleModule,
    updateModuleSettings,
    reorderModules,
  };
}

### useAuditLog

export function useAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchEntries(filter?: AuditFilter, page?: number): Promise<void>;
  async function logAction(data: { action: string; entity_type: string; entity_id?: string; entity_title?: string; changes?: Record<string, unknown>; }): Promise<void>;
  async function exportLog(filter?: AuditFilter): Promise<void>;

  return { entries, loading, fetchEntries, logAction, exportLog };
}

### useSystemStats

export function useSystemStats() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchStats(): Promise<void>;
  async function fetchHistoricalStats(periodType: 'daily' | 'weekly' | 'monthly', from: Date, to: Date): Promise<SystemStats[]>;

  return { stats, loading, fetchStats, fetchHistoricalStats };
}

---

## Seiten & Komponenten

### AdminDashboard (/admin)
Übersicht mit Stats-Karten, Schnellzugriff, Letzte Aktivitäten

### ModuleManagement (/admin/module)
Module aktivieren/deaktivieren, Einstellungen pro Modul

### AuditLogPage (/admin/aktivitaeten)
Filterbare Liste aller Aktivitäten mit Export

### useNavigation Hook
Dynamische Navigation basierend auf aktiven Modulen

---

## Zu erstellende Dateien

1. src/hooks/useModules.ts
2. src/hooks/useAuditLog.ts
3. src/hooks/useSystemStats.ts
4. src/hooks/useNavigation.ts
5. src/pages/admin/AdminDashboard.tsx
6. src/pages/admin/ModuleManagement.tsx
7. src/pages/admin/AuditLog.tsx
8. src/components/admin/StatCard.tsx
9. src/components/admin/ModuleCard.tsx
10. src/components/admin/AuditLogEntry.tsx
11. src/utils/auditHelpers.ts

---

**Implementiere Prompt 9 vollständig, bevor du mit Prompt 10 fortfährst.**

---
---

# Prompt 10: Bestellungen-Modul

## Übersicht

Implementiere das **Bestellungen-Modul** - das Herzstück der App. Es ermöglicht das Erstellen, Freigeben und Verwalten von Bestellanforderungen mit mehrstufigem Workflow.

---

## Datenbank-Schema

CREATE TYPE order_status AS ENUM (
  'entwurf',
  'eingereicht',
  'ausstehend_bereichsleitung',
  'ausstehend_kommandant',
  'ausstehend_kommandomitglieder',
  'freigegeben_bereichsleitung',
  'freigegeben_kommandant',
  'genehmigt',
  'abgelehnt',
  'abgeschlossen'
);

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Grunddaten
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  
  -- Status & Workflow
  status order_status NOT NULL DEFAULT 'entwurf',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  bereichsleiter_id UUID REFERENCES auth.users(id),
  
  -- Freigaben
  requires_kommandant_approval BOOLEAN DEFAULT false,
  requires_kommandomitglied_approval BOOLEAN DEFAULT false,
  bereichsleiter_approved_at TIMESTAMPTZ,
  kommandant_approved_at TIMESTAMPTZ,
  kommandomitglied_approved_at TIMESTAMPTZ,
  
  -- Ablehnung
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  
  -- Kassier-Workflow
  kassier_bestellt BOOLEAN DEFAULT false,
  kassier_bestellt_at TIMESTAMPTZ,
  kassier_bestellt_by UUID REFERENCES auth.users(id),
  order_received BOOLEAN DEFAULT false,
  order_received_at TIMESTAMPTZ,
  
  -- Rechnung
  invoice_to TEXT CHECK (invoice_to IN ('gemeinde', 'feuerwehr')),
  
  -- Archivierung
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  
  -- Eskalation
  escalation_extended_until TIMESTAMPTZ,
  escalation_extension_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_created_by ON public.orders(created_by);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_bereichsleiter ON public.orders(bereichsleiter_id);

CREATE TABLE public.order_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.order_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  vote TEXT NOT NULL CHECK (vote IN ('ja', 'nein', 'enthaltung')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id, user_id)
);

---

## Workflow

1. **Entwurf** - Benutzer erstellt Bestellung
2. **Eingereicht** - Benutzer reicht ein
3. **Bereichsleiter-Freigabe** - Falls BL zugewiesen und Betrag > 0
4. **Kommandant-Freigabe** - Falls Betrag > BL-Limit
5. **Kommandomitglied-Abstimmung** - Falls aktiviert und Betrag > KDT-Limit
6. **Genehmigt** - Alle Freigaben erteilt
7. **Kassier bestellt** - Kassier hat bestellt
8. **Ware erhalten** - Lieferung eingetroffen
9. **Abgeschlossen** - Vorgang beendet

---

## Hook: useOrders

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchOrders(): Promise<void>;
  async function createOrder(data: CreateOrderData): Promise<Order>;
  async function updateOrder(id: string, data: Partial<Order>): Promise<void>;
  async function deleteOrder(id: string): Promise<void>;
  async function submitOrder(id: string): Promise<void>;
  async function approveOrder(id: string, role: 'bereichsleiter' | 'kommandant'): Promise<void>;
  async function rejectOrder(id: string, reason: string): Promise<void>;
  async function markAsOrdered(id: string): Promise<void>;
  async function markAsReceived(id: string): Promise<void>;
  async function archiveOrder(id: string): Promise<void>;
  async function castVote(orderId: string, vote: 'ja' | 'nein' | 'enthaltung', comment?: string): Promise<void>;

  // Gefilterte Listen
  const myOrders = orders.filter(o => o.created_by === userId);
  const pendingApproval = orders.filter(o => /* ... */);
  const pendingVotes = orders.filter(o => /* ... */);

  return {
    orders,
    loading,
    myOrders,
    pendingApproval,
    pendingVotes,
    fetchOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    submitOrder,
    approveOrder,
    rejectOrder,
    markAsOrdered,
    markAsReceived,
    archiveOrder,
    castVote,
  };
}

---

## Seiten & Komponenten

### OrdersPage (/bestellungen)
Liste aller Bestellungen mit Filtern und Tabs

### NewOrderPage (/bestellungen/neu)
Formular zum Erstellen einer neuen Bestellung

### OrderDetailPage (/bestellungen/:id)
Detailansicht mit Workflow-Aktionen

### OrderCard - Bestellungs-Karte
### OrderForm - Bestellungs-Formular
### OrderTimeline - Workflow-Verlauf
### VotingPanel - Abstimmungs-Panel
### ApprovalButtons - Freigabe-Buttons

---

## PDF-Export

async function generateOrderPdf(order: Order): Promise<void>;

Generiert ein PDF mit:
- Organisationslogo und -name
- Bestelldetails
- Genehmigungsstempel (wenn genehmigt)
- Unterschriftenfelder
- Workflow-Historie

---

## Zu erstellende Dateien

1. src/hooks/useOrders.ts
2. src/hooks/useOrderVotes.ts
3. src/hooks/useOrderHistory.ts
4. src/pages/orders/OrdersPage.tsx
5. src/pages/orders/NewOrderPage.tsx
6. src/pages/orders/OrderDetailPage.tsx
7. src/components/orders/OrderCard.tsx
8. src/components/orders/OrderForm.tsx
9. src/components/orders/OrderTimeline.tsx
10. src/components/orders/VotingPanel.tsx
11. src/components/orders/ApprovalButtons.tsx
12. src/components/orders/AttachmentList.tsx
13. src/utils/generateOrderPdf.ts

---

**Implementiere Prompt 10 vollständig, bevor du mit Prompt 11 fortfährst.**

---
---

# Prompt 11: Zahlungsanträge-Modul

## Übersicht

Implementiere das **Zahlungsanträge-Modul** für Kostenerstattungen, Veranstaltungsanmeldungen und andere finanzielle Anträge.

---

## Datenbank-Schema

CREATE TABLE public.payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Grunddaten
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('erstattung', 'veranstaltung', 'sonstiges')),
  
  -- Antragsteller
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'entwurf' CHECK (status IN ('entwurf', 'eingereicht', 'genehmigt', 'abgelehnt', 'ausgezahlt')),
  
  -- Genehmigung
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  
  -- Auszahlung
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES auth.users(id),
  payment_method TEXT,
  payment_reference TEXT,
  
  -- Bankdaten (optional)
  bank_iban TEXT,
  bank_bic TEXT,
  bank_holder TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ
);

CREATE TABLE public.payment_order_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_order_id UUID NOT NULL REFERENCES public.payment_orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

---

## Hook: usePaymentOrders

export function usePaymentOrders() {
  const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPaymentOrders(): Promise<void>;
  async function createPaymentOrder(data: CreatePaymentOrderData): Promise<PaymentOrder>;
  async function updatePaymentOrder(id: string, data: Partial<PaymentOrder>): Promise<void>;
  async function submitPaymentOrder(id: string): Promise<void>;
  async function approvePaymentOrder(id: string): Promise<void>;
  async function rejectPaymentOrder(id: string, reason: string): Promise<void>;
  async function markAsPaid(id: string, paymentInfo: PaymentInfo): Promise<void>;

  return {
    paymentOrders,
    loading,
    fetchPaymentOrders,
    createPaymentOrder,
    updatePaymentOrder,
    submitPaymentOrder,
    approvePaymentOrder,
    rejectPaymentOrder,
    markAsPaid,
  };
}

---

## Komponenten

### PaymentOrdersPage (/zahlungsantraege)
### NewPaymentOrderPage (/zahlungsantraege/neu)
### PaymentOrderDetailPage (/zahlungsantraege/:id)
### PaymentOrderCard
### PaymentOrderForm
### BankDataForm

---

## Zu erstellende Dateien

1. src/hooks/usePaymentOrders.ts
2. src/pages/payment-orders/PaymentOrdersPage.tsx
3. src/pages/payment-orders/NewPaymentOrderPage.tsx
4. src/pages/payment-orders/PaymentOrderDetailPage.tsx
5. src/components/payment-orders/PaymentOrderCard.tsx
6. src/components/payment-orders/PaymentOrderForm.tsx
7. src/components/payment-orders/BankDataForm.tsx
8. src/utils/generatePaymentOrderPdf.ts

---

**Implementiere Prompt 11 vollständig, bevor du mit Prompt 12 fortfährst.**

---
---

# Prompt 12: Lieferanten-Modul

## Übersicht

Implementiere das **Lieferanten-Modul** zur Verwaltung von Lieferanten, Kontaktpersonen und Dokumenten.

---

## Datenbank-Schema

CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Grunddaten
  name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  email TEXT,
  phone TEXT,
  
  -- Adresse
  street TEXT,
  zip TEXT,
  city TEXT,
  country TEXT DEFAULT 'Österreich',
  
  -- Bestellinfos
  minimum_order_value NUMERIC,
  order_days TEXT[],
  delivery_time_days INTEGER,
  payment_terms TEXT,
  customer_number TEXT,
  
  -- Kategorien & Tags
  categories TEXT[],
  tags TEXT[],
  
  -- Zuordnung
  default_bereichsleiter_id UUID REFERENCES auth.users(id),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.supplier_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.supplier_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  valid_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

---

## Hook: useSuppliers

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchSuppliers(): Promise<void>;
  async function createSupplier(data: CreateSupplierData): Promise<Supplier>;
  async function updateSupplier(id: string, data: Partial<Supplier>): Promise<void>;
  async function deleteSupplier(id: string): Promise<void>;
  async function addContact(supplierId: string, contact: SupplierContact): Promise<void>;
  async function addDocument(supplierId: string, document: SupplierDocument): Promise<void>;

  return {
    suppliers,
    loading,
    fetchSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    addContact,
    addDocument,
  };
}

---

## Komponenten

### SuppliersPage (/lieferanten)
Liste mit Suche, Filter nach Kategorie

### SupplierDetailPage (/lieferanten/:id)
Detailansicht mit Kontakten und Dokumenten

### SupplierForm
### SupplierCard
### ContactList
### DocumentList
### SupplierSelect (für Bestellungen)

---

## Zu erstellende Dateien

1. src/hooks/useSuppliers.ts
2. src/hooks/useSupplierContacts.ts
3. src/hooks/useSupplierDocuments.ts
4. src/pages/suppliers/SuppliersPage.tsx
5. src/pages/suppliers/SupplierDetailPage.tsx
6. src/components/suppliers/SupplierCard.tsx
7. src/components/suppliers/SupplierForm.tsx
8. src/components/suppliers/ContactList.tsx
9. src/components/suppliers/DocumentList.tsx
10. src/components/suppliers/SupplierSelect.tsx

---

**Implementiere Prompt 12 vollständig, bevor du mit Prompt 13 fortfährst.**

---
---

# Prompt 13: Aufgaben-Modul

## Übersicht

Implementiere das **Aufgaben-Modul** mit Kanban-Board, Projektplanung und wiederkehrenden Aufgaben.

---

## Datenbank-Schema

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Grunddaten
  title TEXT NOT NULL,
  description TEXT,
  
  -- Status & Priorität
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Zuweisung
  created_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  
  -- Termine
  due_date DATE,
  completed_at TIMESTAMPTZ,
  
  -- Wiederholung
  is_recurring BOOLEAN DEFAULT false,
  recurrence_type TEXT CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  recurrence_interval INTEGER DEFAULT 1,
  next_occurrence DATE,
  
  -- Kategorisierung
  category TEXT,
  tags TEXT[],
  
  -- Projekt-Zuordnung
  project_id UUID REFERENCES public.projects(id),
  parent_task_id UUID REFERENCES public.tasks(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.task_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

---

## Hook: useTasks

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchTasks(): Promise<void>;
  async function createTask(data: CreateTaskData): Promise<Task>;
  async function updateTask(id: string, data: Partial<Task>): Promise<void>;
  async function deleteTask(id: string): Promise<void>;
  async function updateTaskStatus(id: string, status: TaskStatus): Promise<void>;
  async function toggleStep(taskId: string, stepId: string): Promise<void>;
  async function assignTask(id: string, userId: string): Promise<void>;

  const myTasks = tasks.filter(t => t.assigned_to === userId);
  const overdueTasks = tasks.filter(t => /* ... */);

  return {
    tasks,
    loading,
    myTasks,
    overdueTasks,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    toggleStep,
    assignTask,
  };
}

---

## Komponenten

### TasksPage (/aufgaben)
Kanban-Board oder Listen-Ansicht

### KanbanBoard
Drag & Drop zwischen Spalten

### TaskCard
### TaskForm
### TaskDetailModal
### TaskStepList
### ProjectSelector

---

## Zu erstellende Dateien

1. src/hooks/useTasks.ts
2. src/hooks/useProjects.ts
3. src/pages/tasks/TasksPage.tsx
4. src/components/tasks/KanbanBoard.tsx
5. src/components/tasks/KanbanColumn.tsx
6. src/components/tasks/TaskCard.tsx
7. src/components/tasks/TaskForm.tsx
8. src/components/tasks/TaskDetailModal.tsx
9. src/components/tasks/TaskStepList.tsx
10. src/components/tasks/ProjectSelector.tsx

---

**Implementiere Prompt 13 vollständig, bevor du mit Prompt 14 fortfährst.**

---
---

# Prompt 14: Ideenpool-Modul

## Übersicht

Implementiere das **Ideenpool-Modul** zum Sammeln, Diskutieren und Abstimmen von Ideen.

---

## Datenbank-Schema

CREATE TABLE public.ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Grunddaten
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'neu' CHECK (status IN ('neu', 'genehmigt', 'in_bearbeitung', 'umgesetzt', 'abgelehnt')),
  
  -- Ersteller
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Kategorisierung
  category_id UUID REFERENCES public.idea_categories(id),
  tags TEXT[],
  
  -- Abstimmung
  votes_up INTEGER DEFAULT 0,
  votes_down INTEGER DEFAULT 0,
  
  -- Umsetzung
  assigned_to UUID REFERENCES auth.users(id),
  implemented_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.idea_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE public.idea_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  vote INTEGER NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(idea_id, user_id)
);

CREATE TABLE public.idea_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

---

## Hook: useIdeas

export function useIdeas() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchIdeas(): Promise<void>;
  async function createIdea(data: CreateIdeaData): Promise<Idea>;
  async function updateIdea(id: string, data: Partial<Idea>): Promise<void>;
  async function deleteIdea(id: string): Promise<void>;
  async function voteIdea(id: string, vote: 1 | -1): Promise<void>;
  async function addComment(ideaId: string, content: string): Promise<void>;
  async function updateStatus(id: string, status: IdeaStatus): Promise<void>;

  return {
    ideas,
    loading,
    fetchIdeas,
    createIdea,
    updateIdea,
    deleteIdea,
    voteIdea,
    addComment,
    updateStatus,
  };
}

---

## Komponenten

### IdeasPage (/ideen)
Liste mit Filter und Sortierung

### IdeaCard
Mit Voting-Buttons und Kommentar-Anzahl

### IdeaDetailPage (/ideen/:id)
Detailansicht mit Kommentaren

### IdeaForm
### VotingButtons
### CommentSection
### CategoryFilter

---

## Zu erstellende Dateien

1. src/hooks/useIdeas.ts
2. src/hooks/useIdeaCategories.ts
3. src/pages/ideas/IdeasPage.tsx
4. src/pages/ideas/IdeaDetailPage.tsx
5. src/components/ideas/IdeaCard.tsx
6. src/components/ideas/IdeaForm.tsx
7. src/components/ideas/VotingButtons.tsx
8. src/components/ideas/CommentSection.tsx
9. src/components/ideas/CategoryFilter.tsx

---

**Implementiere Prompt 14 vollständig, bevor du mit Prompt 15 fortfährst.**

---
---

# Prompt 15: Abschluss & Integration

## Übersicht

Finalisiere das System mit allen **Integrationen**, Dashboard-Widgets für alle Module und Performance-Optimierungen.

---

## Dashboard-Widgets registrieren

Jedes Modul sollte mindestens ein Dashboard-Widget haben:

### Bestellungen
- StatsWidget: Offene Bestellungen, Wartend auf Freigabe
- ListWidget: Meine offenen Bestellungen

### Zahlungsanträge
- StatsWidget: Offene Anträge, Ausstehende Zahlungen
- ListWidget: Meine Anträge

### Aufgaben
- StatsWidget: Offene Aufgaben, Überfällig
- ListWidget: Meine Aufgaben heute
- KanbanMiniWidget: Kompakte Kanban-Ansicht

### Ideen
- StatsWidget: Neue Ideen, Top-Ideen
- ListWidget: Neueste Ideen

### Nachrichten
- StatsWidget: Ungelesene Nachrichten
- ListWidget: Letzte Nachrichten

---

## Navigation finalisieren

Dynamische Navigation basierend auf:
- Aktiven Modulen
- Benutzer-Rolle
- Benutzer-Funktionen

---

## Globale Suche

Implementiere eine globale Suche die über alle Module sucht:
- Bestellungen
- Aufgaben
- Ideen
- Lieferanten
- Benutzer (für Admins)

---

## PWA-Features

1. Service Worker für Offline-Caching
2. Push Notifications
3. App-Manifest für Installation
4. Offline-Seite

---

## Performance-Optimierungen

1. React.memo für teure Komponenten
2. useMemo/useCallback wo sinnvoll
3. Virtualisierte Listen für lange Listen
4. Lazy Loading für Bilder
5. Debouncing für Suche

---

## Zu erstellende Dateien

1. src/components/dashboard/widgets/* (alle Modul-Widgets)
2. src/components/common/GlobalSearch.tsx
3. src/components/common/CommandPalette.tsx (Cmd+K)
4. public/sw.js (Service Worker)
5. public/manifest.json
6. src/pages/Offline.tsx
7. src/utils/registerServiceWorker.ts

---

## Checkliste vor Go-Live

- [ ] Alle Module implementiert und getestet
- [ ] RLS Policies für alle Tabellen
- [ ] E-Mail-Vorlagen konfiguriert
- [ ] PDF-Hintergrund hochgeladen
- [ ] Benutzer angelegt
- [ ] Rollen und Funktionen zugewiesen
- [ ] Lieferanten importiert
- [ ] Einstellungen konfiguriert
- [ ] Mobile-Ansicht getestet
- [ ] Offline-Funktionalität getestet

---

**🎉 Gratulation! Das modulare Feuerwehrverwaltungs-System ist fertig!**

---
---

# Anhang: Schnellreferenz

## Rollen
- admin - Voller Zugriff
- kommandant - Alle Freigaben
- bereichsleiter - Bereichs-Freigaben
- mitglied - Nur eigene Daten

## Funktionen
- kassier - Finanzen verwalten
- zeugwart - Geräte verwalten
- schriftfuehrer - Protokolle
- kommandomitglied - Abstimmungen
- lieferanten_erfassen - Lieferanten anlegen

## Module
- dashboard (Core)
- orders
- payment_orders
- suppliers
- tasks
- ideas
- messages
- users (Core)
- settings (Core)

## Wichtige Hooks
- useAuth() - Authentifizierung
- useSimulation() - Simulation
- usePermissions() - Berechtigungen
- useModules() - Module
- useSettings() - Einstellungen
- useNotifications() - Benachrichtigungen

---

**Ende der Prompt-Sammlung**