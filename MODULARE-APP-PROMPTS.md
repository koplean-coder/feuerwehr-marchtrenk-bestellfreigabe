# Modulare Feuerwehrverwaltung - Prompt-Sammlung

> **Anleitung:** Kopiere jeden Prompt der Reihe nach in ein neues Sticklight-Projekt. Warte bis jeder Schritt abgeschlossen ist, bevor du den nächsten startest.

---

# Inhaltsverzeichnis

1. [Prompt 1: Projekt-Setup & Grundstruktur](#prompt-1-projekt-setup--grundstruktur)
2. [Prompt 2: Benutzer, Rollen & Berechtigungssystem](#prompt-2-benutzer-rollen--berechtigungssystem)
3. [Prompt 3: Dashboard-System mit Modul-Hooks](#prompt-3-dashboard-system-mit-modul-hooks)
4. [Prompt 4: App-Konfiguration & Branding](#prompt-4-app-konfiguration--branding)
5. [Prompt 5: Profilverwaltung & Abwesenheiten](#prompt-5-profilverwaltung--abwesenheiten)
6. [Prompt 6: Benachrichtigungssystem](#prompt-6-benachrichtigungssystem)
7. [Prompt 7: Authentifizierung & Session-Management](#prompt-7-authentifizierung--session-management)
8. [Prompt 8: Direktnachrichten-System](#prompt-8-direktnachrichten-system)
9. [Prompt 9: Admin Dashboard & Modul-Management](#prompt-9-admin-dashboard--modul-management)
10. [Prompt 10: Bestellungen-Modul](#prompt-10-bestellungen-modul)
11. [Prompt 11: Zahlungsanträge-Modul](#prompt-11-zahlungsanträge-modul)
12. [Prompt 12: Lieferanten-Modul](#prompt-12-lieferanten-modul)
13. [Prompt 13: Aufgaben-Modul](#prompt-13-aufgaben-modul)
14. [Prompt 14: Ideenpool-Modul](#prompt-14-ideenpool-modul)
15. [Prompt 15: PDF-Export-System](#prompt-15-pdf-export-system)

---

# Prompt 1: Projekt-Setup & Grundstruktur

## Aufgabe

Erstelle die Grundstruktur für eine modulare Feuerwehrverwaltungs-App mit React, TypeScript, Tailwind CSS und Supabase.

## Anforderungen

### 1. Ordnerstruktur

```
src/
├── components/
│   ├── common/          # Wiederverwendbare UI-Komponenten
│   ├── layout/          # Layout-Komponenten (Sidebar, Header)
│   └── [modul]/         # Modul-spezifische Komponenten
├── contexts/            # React Contexts
├── hooks/               # Custom Hooks
├── pages/               # Seiten-Komponenten
├── modules/             # Modul-Registry & Definitionen
├── integrations/        # Externe Integrationen (Supabase)
├── utils/               # Hilfsfunktionen
├── types/               # TypeScript Typen
├── App.tsx
├── main.tsx
├── providers.tsx
├── theme.css
└── index.css
```

### 2. Theme-System (theme.css)

Erstelle ein flexibles Theme mit CSS-Variablen:

```css
@theme {
  /* Primärfarben */
  --color-primary: #dc2626;
  --color-primary-foreground: #ffffff;
  
  /* Sekundärfarben */
  --color-secondary: #f3f4f6;
  --color-secondary-foreground: #1f2937;
  
  /* Hintergrund & Oberflächen */
  --color-background: #ffffff;
  --color-foreground: #0f172a;
  --color-card: #ffffff;
  --color-card-foreground: #0f172a;
  --color-muted: #f1f5f9;
  --color-muted-foreground: #64748b;
  
  /* Borders */
  --color-border: #e2e8f0;
  
  /* Status-Farben */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
  
  /* Fonts */
  --font-sans: 'Inter', system-ui, sans-serif;
  
  /* Border Radius */
  --radius: 0.5rem;
}
```

### 3. Modul-Registry System

Erstelle `src/modules/types.ts`:

```typescript
export interface ModuleDefinition {
  slug: string;
  name: string;
  description: string;
  icon: string;
  version: string;
  isCore: boolean;
  routes: ModuleRoute[];
  navItems: ModuleNavItem[];
  dashboardWidgets?: ModuleDashboardWidget[];
  permissions: string[];
  dependencies?: string[];
}

export interface ModuleRoute {
  path: string;
  component: React.ComponentType;
  title: string;
  requiredPermissions?: string[];
}

export interface ModuleNavItem {
  label: string;
  path: string;
  icon: string;
  badge?: () => number;
  children?: ModuleNavItem[];
}

export interface ModuleDashboardWidget {
  id: string;
  title: string;
  component: React.ComponentType;
  size: 'small' | 'medium' | 'large';
  requiredPermissions?: string[];
}
```

Erstelle `src/modules/registry.ts`:

```typescript
import { ModuleDefinition } from './types';

class ModuleRegistry {
  private modules: Map<string, ModuleDefinition> = new Map();

  register(module: ModuleDefinition): void {
    this.modules.set(module.slug, module);
  }

  get(slug: string): ModuleDefinition | undefined {
    return this.modules.get(slug);
  }

  getAll(): ModuleDefinition[] {
    return Array.from(this.modules.values());
  }

  getEnabled(): ModuleDefinition[] {
    // Wird später mit DB-Status verknüpft
    return this.getAll();
  }
}

export const moduleRegistry = new ModuleRegistry();
```

### 4. Basis-Komponenten

Erstelle in `src/components/common/`:
- `Button.tsx` - Mit Varianten: primary, secondary, outline, ghost, danger
- `Card.tsx` - Container mit Header, Content, Footer
- `Modal.tsx` - Dialog mit Overlay
- `Input.tsx` - Text-Input mit Label und Error
- `Select.tsx` - Dropdown mit Suche
- `Badge.tsx` - Status-Badges
- `Spinner.tsx` - Loading-Indikator
- `EmptyState.tsx` - Leerer Zustand mit Icon und Aktion

### 5. Layout-Komponenten

Erstelle `src/components/layout/Layout.tsx`:
- Responsive Sidebar (collapsible auf Mobile)
- Header mit User-Info und Notifications
- Dynamische Navigation basierend auf Modulen
- Breadcrumbs
- Footer (optional)

### 6. Provider-Setup

Erstelle `src/providers.tsx`:

```typescript
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SimulationProvider>
          <ThemeProvider>
            <NotificationsProvider>
              <ModulesProvider>
                {children}
              </ModulesProvider>
            </NotificationsProvider>
          </ThemeProvider>
        </SimulationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

### 7. Cloud Backend

Aktiviere Cloud Backend (Supabase) für die Datenbank.

---

# Prompt 2: Benutzer, Rollen & Berechtigungssystem

## Aufgabe

Erstelle ein flexibles Benutzer- und Berechtigungssystem mit eigenen Rollen und Funktionen.

## Datenbank-Schema

### Tabelle: `roles`

```sql
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  hierarchy_level INTEGER NOT NULL DEFAULT 0,
  permissions TEXT[] DEFAULT '{}',
  is_system BOOLEAN NOT NULL DEFAULT false,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Standard-Rollen
INSERT INTO public.roles (slug, name, hierarchy_level, is_system, color) VALUES
  ('admin', 'Administrator', 100, true, '#dc2626'),
  ('kommandant', 'Kommandant', 90, true, '#7c3aed'),
  ('kommandant_stv', 'Kommandant-Stellvertreter', 85, true, '#8b5cf6'),
  ('bereichsleiter', 'Bereichsleiter', 70, true, '#2563eb'),
  ('mitglied', 'Mitglied', 10, true, '#6b7280');
```

### Tabelle: `functions`

```sql
CREATE TABLE public.functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  permissions TEXT[] DEFAULT '{}',
  icon TEXT,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Standard-Funktionen
INSERT INTO public.functions (slug, name, icon, color) VALUES
  ('kassier', 'Kassier', 'Wallet', '#22c55e'),
  ('zeugwart', 'Zeugwart', 'Wrench', '#f59e0b'),
  ('schriftfuehrer', 'Schriftführer', 'FileText', '#3b82f6'),
  ('kommandomitglied', 'Kommandomitglied', 'Users', '#8b5cf6'),
  ('jugendbetreuer', 'Jugendbetreuer', 'Baby', '#ec4899'),
  ('atemschutzwart', 'Atemschutzwart', 'Wind', '#06b6d4'),
  ('funkwart', 'Funkwart', 'Radio', '#84cc16'),
  ('edv_beauftragter', 'EDV-Beauftragter', 'Monitor', '#6366f1');
```

### Tabelle: `permissions`

```sql
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  module TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Basis-Berechtigungen
INSERT INTO public.permissions (slug, name, module, category) VALUES
  ('orders.view', 'Bestellungen ansehen', 'orders', 'read'),
  ('orders.create', 'Bestellungen erstellen', 'orders', 'write'),
  ('orders.approve', 'Bestellungen freigeben', 'orders', 'approve'),
  ('orders.delete', 'Bestellungen löschen', 'orders', 'delete'),
  ('users.view', 'Benutzer ansehen', 'users', 'read'),
  ('users.manage', 'Benutzer verwalten', 'users', 'admin'),
  ('settings.view', 'Einstellungen ansehen', 'settings', 'read'),
  ('settings.manage', 'Einstellungen verwalten', 'settings', 'admin');
```

### Tabelle: `profiles` (erweitern)

```sql
ALTER TABLE public.profiles
  ADD COLUMN role_id UUID REFERENCES public.roles(id),
  ADD COLUMN function_ids UUID[] DEFAULT '{}',
  ADD COLUMN is_absent BOOLEAN DEFAULT false,
  ADD COLUMN absent_from DATE,
  ADD COLUMN absent_until DATE,
  ADD COLUMN absence_reason TEXT,
  ADD COLUMN substitute_id UUID REFERENCES public.profiles(id);
```

## Hooks

### `usePermissions`

```typescript
// src/hooks/usePermissions.ts

export function usePermissions() {
  const { profile } = useAuth();
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [functionPermissions, setFunctionPermissions] = useState<string[]>([]);

  // Alle Berechtigungen des Benutzers (Rolle + Funktionen)
  const allPermissions = useMemo(() => {
    return [...new Set([...rolePermissions, ...functionPermissions])];
  }, [rolePermissions, functionPermissions]);

  function hasPermission(permission: string): boolean {
    return allPermissions.includes(permission) || allPermissions.includes('*');
  }

  function hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(p => hasPermission(p));
  }

  function hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(p => hasPermission(p));
  }

  return {
    permissions: allPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}
```

### `useRoles`

```typescript
// src/hooks/useRoles.ts

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchRoles(): Promise<void>;
  async function createRole(data: CreateRoleData): Promise<Role>;
  async function updateRole(id: string, data: UpdateRoleData): Promise<void>;
  async function deleteRole(id: string): Promise<void>;

  return { roles, loading, fetchRoles, createRole, updateRole, deleteRole };
}
```

## Komponenten

### `PermissionGate`

```typescript
// src/components/common/PermissionGate.tsx

interface PermissionGateProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  const hasAccess = useMemo(() => {
    if (permission) return hasPermission(permission);
    if (permissions) {
      return requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
    }
    return true;
  }, [permission, permissions, requireAll]);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
```

## RLS Policies

```sql
-- Profiles: Jeder kann lesen, nur eigenes Profil bearbeiten
CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- Roles: Alle können lesen, nur Admins können ändern
CREATE POLICY "Anyone can view roles"
  ON public.roles FOR SELECT
  TO authenticated
  USING (true);
```

---

# Prompt 3: Dashboard-System mit Modul-Hooks

## Aufgabe

Erstelle ein flexibles Dashboard-System, bei dem Module eigene Widgets registrieren können.

## Widget-System

### Typen

```typescript
// src/types/dashboard.ts

export interface DashboardWidget {
  id: string;
  moduleSlug: string;
  title: string;
  description?: string;
  component: React.ComponentType<WidgetProps>;
  size: 'small' | 'medium' | 'large' | 'full';
  defaultOrder: number;
  requiredPermissions?: string[];
  refreshInterval?: number; // in Sekunden
}

export interface WidgetProps {
  isLoading?: boolean;
  onRefresh?: () => void;
}

export interface DashboardLayout {
  userId: string;
  widgets: {
    id: string;
    visible: boolean;
    order: number;
    size?: 'small' | 'medium' | 'large' | 'full';
  }[];
}
```

### Widget-Registry

```typescript
// src/modules/widgetRegistry.ts

class WidgetRegistry {
  private widgets: Map<string, DashboardWidget> = new Map();

  register(widget: DashboardWidget): void {
    this.widgets.set(widget.id, widget);
  }

  unregister(id: string): void {
    this.widgets.delete(id);
  }

  get(id: string): DashboardWidget | undefined {
    return this.widgets.get(id);
  }

  getAll(): DashboardWidget[] {
    return Array.from(this.widgets.values());
  }

  getByModule(moduleSlug: string): DashboardWidget[] {
    return this.getAll().filter(w => w.moduleSlug === moduleSlug);
  }
}

export const widgetRegistry = new WidgetRegistry();
```

## Datenbank

```sql
CREATE TABLE public.dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widgets JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
```

## Standard-Widgets

### Stats-Widget

```typescript
// src/components/dashboard/StatsWidget.tsx

export function StatsWidget() {
  // Zeigt: Offene Bestellungen, Wartende Freigaben, Aufgaben, etc.
}

widgetRegistry.register({
  id: 'core-stats',
  moduleSlug: 'core',
  title: 'Übersicht',
  component: StatsWidget,
  size: 'full',
  defaultOrder: 0,
});
```

### Meine Aufgaben Widget

```typescript
// src/components/dashboard/MyTasksWidget.tsx

export function MyTasksWidget() {
  // Zeigt: Aufgaben die mir zugewiesen sind
}

widgetRegistry.register({
  id: 'my-tasks',
  moduleSlug: 'tasks',
  title: 'Meine Aufgaben',
  component: MyTasksWidget,
  size: 'medium',
  defaultOrder: 10,
});
```

### Wartende Freigaben Widget

```typescript
// src/components/dashboard/PendingApprovalsWidget.tsx

export function PendingApprovalsWidget() {
  // Zeigt: Bestellungen/Anträge die auf meine Freigabe warten
}

widgetRegistry.register({
  id: 'pending-approvals',
  moduleSlug: 'orders',
  title: 'Wartende Freigaben',
  component: PendingApprovalsWidget,
  size: 'medium',
  defaultOrder: 20,
  requiredPermissions: ['orders.approve'],
});
```

## Dashboard-Hook

```typescript
// src/hooks/useDashboard.ts

export function useDashboard() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [loading, setLoading] = useState(true);

  // Verfügbare Widgets (basierend auf Berechtigungen)
  const availableWidgets = useMemo(() => {
    return widgetRegistry.getAll().filter(widget => {
      if (!widget.requiredPermissions) return true;
      return widget.requiredPermissions.every(p => hasPermission(p));
    });
  }, [hasPermission]);

  // Layout laden
  async function fetchLayout(): Promise<void>;

  // Layout speichern
  async function saveLayout(widgets: DashboardLayout['widgets']): Promise<void>;

  // Widget ein-/ausblenden
  async function toggleWidget(widgetId: string): Promise<void>;

  // Reihenfolge ändern
  async function reorderWidgets(orderedIds: string[]): Promise<void>;

  // Layout zurücksetzen
  async function resetLayout(): Promise<void>;

  return {
    layout,
    loading,
    availableWidgets,
    fetchLayout,
    saveLayout,
    toggleWidget,
    reorderWidgets,
    resetLayout,
  };
}
```

## Dashboard-Seite

```typescript
// src/pages/Dashboard.tsx

export default function Dashboard() {
  const { layout, availableWidgets, loading, toggleWidget, reorderWidgets } = useDashboard();
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Widgets nach Layout sortieren
  const sortedWidgets = useMemo(() => {
    if (!layout) return availableWidgets.sort((a, b) => a.defaultOrder - b.defaultOrder);
    
    return layout.widgets
      .filter(w => w.visible)
      .sort((a, b) => a.order - b.order)
      .map(w => widgetRegistry.get(w.id))
      .filter(Boolean);
  }, [layout, availableWidgets]);

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1>Dashboard</h1>
        <Button onClick={() => setIsCustomizing(!isCustomizing)}>
          {isCustomizing ? 'Fertig' : 'Anpassen'}
        </Button>
      </div>

      {isCustomizing && (
        <WidgetCustomizer
          widgets={availableWidgets}
          layout={layout}
          onToggle={toggleWidget}
          onReorder={reorderWidgets}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedWidgets.map(widget => (
          <WidgetContainer key={widget.id} widget={widget} />
        ))}
      </div>
    </Layout>
  );
}
```

---

# Prompt 4: App-Konfiguration & Branding

## Aufgabe

Erstelle ein System für organisationsspezifische Einstellungen: Logo, Farben, Name, PDF-Hintergrund.

## Datenbank

```sql
CREATE TABLE public.organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basis-Info
  name TEXT NOT NULL DEFAULT 'Feuerwehr',
  short_name TEXT,
  slogan TEXT,
  
  -- Kontakt
  email TEXT,
  phone TEXT,
  website TEXT,
  address_street TEXT,
  address_city TEXT,
  address_zip TEXT,
  address_country TEXT DEFAULT 'Österreich',
  
  -- Branding
  logo_url TEXT,
  logo_dark_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#dc2626',
  secondary_color TEXT DEFAULT '#1e3a8a',
  
  -- PDF-Einstellungen
  pdf_background_url TEXT,
  pdf_background_opacity NUMERIC DEFAULT 0.15,
  pdf_header_text TEXT,
  pdf_footer_text TEXT,
  pdf_show_logo BOOLEAN DEFAULT true,
  
  -- E-Mail-Einstellungen
  email_from_name TEXT,
  email_signature TEXT,
  
  -- Lokalisierung
  timezone TEXT DEFAULT 'Europe/Vienna',
  locale TEXT DEFAULT 'de-AT',
  date_format TEXT DEFAULT 'DD.MM.YYYY',
  currency TEXT DEFAULT 'EUR',
  
  -- Feature Flags
  features JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Initial-Eintrag
INSERT INTO public.organization_settings (name) VALUES ('Meine Feuerwehr');
```

## Hook: `useOrganization`

```typescript
// src/hooks/useOrganization.ts

export interface OrganizationSettings {
  id: string;
  name: string;
  shortName: string | null;
  slogan: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: {
    street: string | null;
    city: string | null;
    zip: string | null;
    country: string;
  };
  branding: {
    logoUrl: string | null;
    logoDarkUrl: string | null;
    faviconUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
  };
  pdf: {
    backgroundUrl: string | null;
    backgroundOpacity: number;
    headerText: string | null;
    footerText: string | null;
    showLogo: boolean;
  };
  locale: {
    timezone: string;
    locale: string;
    dateFormat: string;
    currency: string;
  };
  features: Record<string, boolean>;
}

export function useOrganization() {
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchSettings(): Promise<void>;
  async function updateSettings(data: Partial<OrganizationSettings>): Promise<void>;
  async function uploadLogo(file: File): Promise<string>;
  async function uploadPdfBackground(file: File): Promise<string>;
  async function deleteLogo(): Promise<void>;

  return {
    settings,
    loading,
    fetchSettings,
    updateSettings,
    uploadLogo,
    uploadPdfBackground,
    deleteLogo,
  };
}
```

## Hook: `useTheme`

```typescript
// src/hooks/useTheme.ts

export function useTheme() {
  const { settings } = useOrganization();

  // CSS-Variablen setzen basierend auf Branding
  useEffect(() => {
    if (!settings?.branding) return;

    const root = document.documentElement;
    root.style.setProperty('--color-primary', settings.branding.primaryColor);
    root.style.setProperty('--color-secondary', settings.branding.secondaryColor);
  }, [settings?.branding]);

  return {
    primaryColor: settings?.branding.primaryColor || '#dc2626',
    secondaryColor: settings?.branding.secondaryColor || '#1e3a8a',
    logoUrl: settings?.branding.logoUrl,
  };
}
```

## Einstellungs-Seiten

### Branding-Sektion

```typescript
// src/pages/settings/BrandingSettings.tsx

export function BrandingSettings() {
  // Logo-Upload mit Vorschau
  // Color-Picker für Primär- und Sekundärfarbe
  // Live-Vorschau der Änderungen
}
```

### PDF-Sektion

```typescript
// src/pages/settings/PdfSettings.tsx

export function PdfSettings() {
  // Hintergrund-Upload
  // Transparenz-Slider
  // Kopf-/Fußzeilen-Text
  // Vorschau-Button
}
```

---

# Prompt 5: Profilverwaltung & Abwesenheiten

## Aufgabe

Erstelle eine Profilverwaltung mit Abwesenheits-/Vertretungsfunktion.

## Mein Profil Seite

```
/profil
├── Persönliche Daten (Name, Avatar, Kontakt)
├── Sicherheit (Passwort ändern)
├── Benachrichtigungen (E-Mail, Push Einstellungen)
├── Abwesenheit (Status, Vertretung)
└── Dashboard (Layout zurücksetzen)
```

## Abwesenheits-System

### Felder in `profiles`

```sql
ALTER TABLE public.profiles
  ADD COLUMN is_absent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN absent_from DATE,
  ADD COLUMN absent_until DATE,
  ADD COLUMN absence_reason TEXT,
  ADD COLUMN substitute_id UUID REFERENCES public.profiles(id),
  ADD COLUMN auto_forward_tasks BOOLEAN DEFAULT true,
  ADD COLUMN auto_forward_approvals BOOLEAN DEFAULT true;
```

### Vertretungslogik

```typescript
// src/hooks/useSubstitute.ts

export function useSubstitute() {
  // Prüft ob ein Benutzer abwesend ist
  function isUserAbsent(userId: string): boolean;

  // Holt den aktiven Vertreter eines Benutzers
  function getSubstitute(userId: string): Profile | null;

  // Setzt Abwesenheit
  async function setAbsence(data: {
    absentFrom: Date;
    absentUntil: Date;
    reason?: string;
    substituteId?: string;
    autoForwardTasks?: boolean;
    autoForwardApprovals?: boolean;
  }): Promise<void>;

  // Beendet Abwesenheit
  async function endAbsence(): Promise<void>;

  return {
    isUserAbsent,
    getSubstitute,
    setAbsence,
    endAbsence,
  };
}
```

### Automatische Weiterleitung

Wenn ein Benutzer abwesend ist und `auto_forward_approvals = true`:
- Bestellungen zur Freigabe gehen an den Vertreter
- Aufgaben werden dem Vertreter zugewiesen
- Benachrichtigungen gehen an beide

## Komponenten

### AbsenceModal

```typescript
// src/components/profile/AbsenceModal.tsx

export function AbsenceModal({ onClose }: { onClose: () => void }) {
  // Datumsauswahl (von/bis)
  // Grund (optional)
  // Vertreter-Auswahl (Dropdown mit Benutzern)
  // Optionen für automatische Weiterleitung
}
```

### UserCard mit Abwesenheits-Indikator

```typescript
// src/components/common/UserCard.tsx

export function UserCard({ user }: { user: Profile }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar user={user} />
      <div>
        <p className="font-medium">{user.full_name}</p>
        {user.is_absent && (
          <Badge variant="warning" size="sm">
            Abwesend bis {formatDate(user.absent_until)}
          </Badge>
        )}
      </div>
    </div>
  );
}
```

---

# Prompt 6: Benachrichtigungssystem

## Aufgabe

Erstelle ein vollständiges Benachrichtigungssystem mit In-App, E-Mail und Push-Notifications.

## Datenbank

### Tabelle: `notification_templates`

```sql
CREATE TABLE public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  email_subject_template TEXT,
  email_body_template TEXT,
  default_channels TEXT[] DEFAULT '{"in_app"}',
  variables TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Standard-Templates
INSERT INTO public.notification_templates (slug, name, title_template, body_template, default_channels) VALUES
  ('order_submitted', 'Bestellung eingereicht', 'Neue Bestellung eingereicht', '{{user_name}} hat die Bestellung "{{order_title}}" eingereicht.', '{"in_app","email"}'),
  ('order_approved', 'Bestellung genehmigt', 'Bestellung genehmigt', 'Ihre Bestellung "{{order_title}}" wurde von {{approver_name}} genehmigt.', '{"in_app","email"}'),
  ('order_rejected', 'Bestellung abgelehnt', 'Bestellung abgelehnt', 'Ihre Bestellung "{{order_title}}" wurde abgelehnt. Grund: {{reason}}', '{"in_app","email"}'),
  ('task_assigned', 'Aufgabe zugewiesen', 'Neue Aufgabe', 'Ihnen wurde die Aufgabe "{{task_title}}" zugewiesen.', '{"in_app"}'),
  ('message_received', 'Nachricht erhalten', 'Neue Nachricht', 'Sie haben eine Nachricht von {{sender_name}} erhalten.', '{"in_app","push"}');
```

### Tabelle: `notifications`

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_slug TEXT REFERENCES public.notification_templates(slug),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  reference_type TEXT,
  reference_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  channels_sent TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
```

### Tabelle: `notification_preferences`

```sql
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  preferences JSONB DEFAULT '{}',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Tabelle: `push_subscriptions`

```sql
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
```

## Hook: `useNotifications`

```typescript
// src/hooks/useNotifications.ts

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function fetchNotifications(): Promise<void>;
  async function markAsRead(id: string): Promise<void>;
  async function markAllAsRead(): Promise<void>;
  async function deleteNotification(id: string): Promise<void>;
  async function clearAll(): Promise<void>;

  // Benachrichtigung erstellen (für andere Hooks)
  async function notify(data: {
    userId: string;
    templateSlug?: string;
    title: string;
    body: string;
    link?: string;
    referenceType?: string;
    referenceId?: string;
  }): Promise<void>;

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    notify,
  };
}
```

## Edge Function: `send-notification`

```typescript
// supabase/functions/send-notification/index.ts

// Sendet Benachrichtigungen über alle aktivierten Kanäle:
// 1. In-App (DB Insert)
// 2. E-Mail (Resend/SMTP)
// 3. Push (Web Push API)

// Beachtet:
// - Benutzer-Präferenzen
// - Ruhezeiten
// - Template-Variablen ersetzen
```

## Komponenten

### NotificationBell

```typescript
// src/components/notifications/NotificationBell.tsx

export function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}>
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {isOpen && <NotificationDropdown onClose={() => setIsOpen(false)} />}
    </div>
  );
}
```

---

# Prompt 7: Authentifizierung & Session-Management

## Aufgabe

Erstelle ein sicheres Authentifizierungssystem mit Login, Logout, Passwort-Reset und Session-Management.

## Seiten

### Login (`/login`)

```typescript
// src/pages/Login.tsx

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login mit E-Mail/Passwort
  // "Angemeldet bleiben" Option
  // Link zu Passwort-Vergessen
  // Fehlerbehandlung
}
```

### Passwort vergessen (`/passwort-vergessen`)

```typescript
// src/pages/ForgotPassword.tsx

export default function ForgotPassword() {
  // E-Mail eingeben
  // Reset-Link per E-Mail senden
  // Erfolgs-/Fehlermeldung
}
```

### Passwort zurücksetzen (`/passwort-reset`)

```typescript
// src/pages/ResetPassword.tsx

export default function ResetPassword() {
  // Neues Passwort eingeben
  // Passwort-Stärke Anzeige
  // Bestätigung
}
```

## AuthContext

```typescript
// src/contexts/AuthContext.tsx

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Session-Management
  // Auto-Refresh
  // Inaktivitäts-Timeout (30 Min)
  // Profile laden
}
```

## ProtectedRoute

```typescript
// src/components/auth/ProtectedRoute.tsx

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  roles?: string[];
  fallback?: ReactNode;
}

export function ProtectedRoute({
  children,
  permission,
  permissions,
  roles,
  fallback,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermissions();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" />;

  // Permission/Role Check
  const hasAccess = /* ... */;
  if (!hasAccess) return fallback || <AccessDenied />;

  return <>{children}</>;
}
```

## Session-Timeout

```typescript
// src/hooks/useSessionTimeout.ts

export function useSessionTimeout(timeoutMinutes = 30) {
  const { signOut } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout>();

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      signOut();
      // Optional: Warnung anzeigen vor Logout
    }, timeoutMinutes * 60 * 1000);
  }, [timeoutMinutes, signOut]);

  useEffect(() => {
    // Events die den Timer zurücksetzen
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimeout));
    resetTimeout();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimeout));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resetTimeout]);
}
```

---

# Prompt 8: Direktnachrichten-System

## Aufgabe

Erstelle ein Direktnachrichten-System für 1:1 Kommunikation zwischen Benutzern, das auch Kontext-bezogene Nachrichten (zu Bestellungen, Aufgaben, etc.) unterstützt.

## Datenbank

```sql
CREATE TABLE public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT,
  content TEXT NOT NULL,
  context_type TEXT,
  context_id UUID,
  context_title TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  archived_by_sender BOOLEAN NOT NULL DEFAULT false,
  archived_by_recipient BOOLEAN NOT NULL DEFAULT false,
  reply_to_id UUID REFERENCES public.direct_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_direct_messages_sender ON public.direct_messages(sender_id);
CREATE INDEX idx_direct_messages_recipient ON public.direct_messages(recipient_id);
CREATE INDEX idx_direct_messages_unread ON public.direct_messages(recipient_id, is_read) WHERE is_read = false;
```

## RLS Policies

```sql
CREATE POLICY "Users can view own messages"
  ON public.direct_messages FOR SELECT
  TO authenticated
  USING (sender_id = (SELECT auth.uid()) OR recipient_id = (SELECT auth.uid()));

CREATE POLICY "Users can send messages"
  ON public.direct_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own messages"
  ON public.direct_messages FOR UPDATE
  TO authenticated
  USING (sender_id = (SELECT auth.uid()) OR recipient_id = (SELECT auth.uid()));
```

## Hook: `useDirectMessages`

```typescript
// src/hooks/useDirectMessages.ts

export function useDirectMessages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function fetchConversations(): Promise<void>;
  async function fetchMessages(otherUserId: string): Promise<DirectMessage[]>;
  async function sendMessage(data: SendMessageData): Promise<DirectMessage>;
  async function markAsRead(messageId: string): Promise<void>;
  async function markConversationAsRead(otherUserId: string): Promise<void>;
  async function archiveMessage(messageId: string): Promise<void>;

  return {
    conversations,
    unreadCount,
    loading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    markAsRead,
    markConversationAsRead,
    archiveMessage,
  };
}
```

## Seiten

### Nachrichten-Übersicht (`/nachrichten`)

- Liste aller Konversationen
- Ungelesene hervorgehoben
- Letzte Nachricht als Vorschau
- Neue Nachricht Button

### Konversation (`/nachrichten/:userId`)

- Chat-Ansicht mit Bubbles
- Kontext-Link wenn vorhanden
- Eingabefeld unten
- Auto-Scroll zu neuesten

## Komponenten

### QuickMessageButton

Kann überall eingebettet werden:

```typescript
<QuickMessageButton
  recipientId={order.created_by}
  contextType="order"
  contextId={order.id}
  contextTitle={order.title}
/>
```

---

# Prompt 9: Admin Dashboard & Modul-Management

## Aufgabe

Erstelle ein Admin Dashboard für System-Übersicht und Modul-Verwaltung.

## Datenbank

### Tabelle: `modules`

```sql
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

INSERT INTO public.modules (slug, name, icon, is_core, sort_order, category) VALUES
  ('dashboard', 'Dashboard', 'LayoutDashboard', true, 0, 'core'),
  ('orders', 'Bestellungen', 'ShoppingCart', false, 10, 'finanzen'),
  ('payment_orders', 'Zahlungsanträge', 'CreditCard', false, 20, 'finanzen'),
  ('suppliers', 'Lieferanten', 'Truck', false, 30, 'finanzen'),
  ('tasks', 'Aufgaben', 'CheckSquare', false, 40, 'verwaltung'),
  ('ideas', 'Ideenpool', 'Lightbulb', false, 50, 'kommunikation'),
  ('messages', 'Nachrichten', 'MessageSquare', false, 60, 'kommunikation'),
  ('users', 'Benutzerverwaltung', 'Users', true, 70, 'admin'),
  ('settings', 'Einstellungen', 'Settings', true, 80, 'admin');
```

### Tabelle: `audit_log`

```sql
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
```

## Seiten

### Admin Dashboard (`/admin`)

- Statistik-Karten (Bestellungen, Benutzer, Aufgaben, etc.)
- Letzte Aktivitäten
- Schnellzugriff-Buttons
- System-Status

### Modul-Verwaltung (`/admin/module`)

- Liste aller Module nach Kategorie
- Toggle zum Aktivieren/Deaktivieren
- Core-Module sind gesperrt
- Modul-Einstellungen

### Aktivitätsprotokoll (`/admin/aktivitaeten`)

- Filterbar nach Benutzer, Aktion, Zeitraum
- Paginierung
- CSV-Export

## Hooks

### `useModules`

```typescript
export function useModules() {
  async function toggleModule(slug: string, enabled: boolean): Promise<void>;
  async function updateModuleSettings(slug: string, settings: object): Promise<void>;
  function isModuleAvailable(slug: string): boolean;
}
```

### `useAuditLog`

```typescript
export function useAuditLog() {
  async function fetchEntries(filter?: AuditFilter): Promise<AuditEntry[]>;
  async function logAction(data: LogActionData): Promise<void>;
  async function exportLog(filter?: AuditFilter): Promise<void>;
}
```

---

# Prompt 10: Bestellungen-Modul

## Aufgabe

Erstelle das Bestellungen-Modul mit vollständigem Workflow.

## Workflow

```
Entwurf → Eingereicht → [BL-Freigabe] → [KDT-Freigabe] → [KDO-Abstimmung] → Genehmigt → Bestellt → Erhalten → Archiviert
```

## Datenbank

### Tabelle: `orders`

```sql
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  needed_by DATE,
  supplier_id UUID REFERENCES public.suppliers(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  bereichsleiter_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'entwurf',
  
  -- Freigaben
  requires_kommandant_approval BOOLEAN DEFAULT false,
  requires_kommandomitglied_approval BOOLEAN DEFAULT false,
  bereichsleiter_approved_at TIMESTAMPTZ,
  bereichsleiter_approved_by UUID REFERENCES auth.users(id),
  kommandant_approved_at TIMESTAMPTZ,
  kommandant_approved_by UUID REFERENCES auth.users(id),
  kommandomitglied_approved_at TIMESTAMPTZ,
  
  -- Ablehnung
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  
  -- Bestellung/Erhalt
  order_executed BOOLEAN DEFAULT false,
  order_executed_at TIMESTAMPTZ,
  order_executed_by UUID REFERENCES auth.users(id),
  order_received BOOLEAN DEFAULT false,
  order_received_at TIMESTAMPTZ,
  order_received_by UUID REFERENCES auth.users(id),
  
  -- Rechnung
  invoice_to TEXT DEFAULT 'feuerwehr',
  
  -- Archiv
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ
);
```

### Tabelle: `order_attachments`

```sql
CREATE TABLE public.order_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Tabelle: `order_votes` (für Kommandomitglied-Abstimmungen)

```sql
CREATE TABLE public.order_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  vote TEXT NOT NULL CHECK (vote IN ('approve', 'reject', 'abstain')),
  comment TEXT,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id, user_id)
);
```

## Hook: `useOrders`

```typescript
export function useOrders() {
  async function createOrder(data: CreateOrderData): Promise<Order>;
  async function updateOrder(id: string, data: UpdateOrderData): Promise<void>;
  async function deleteOrder(id: string): Promise<void>;
  async function submitOrder(id: string): Promise<void>;
  async function approveAsBereichsleiter(id: string): Promise<void>;
  async function approveAsKommandant(id: string): Promise<void>;
  async function rejectOrder(id: string, reason: string): Promise<void>;
  async function markAsOrdered(id: string): Promise<void>;
  async function markAsReceived(id: string): Promise<void>;
  async function archiveOrder(id: string): Promise<void>;
}
```

## Seiten

- `/bestellungen` - Übersicht mit Tabs (Alle, Meine, Archiv)
- `/bestellungen/neu` - Neue Bestellung erstellen
- `/bestellungen/:id` - Details mit Workflow-Anzeige

---

# Prompt 11: Zahlungsanträge-Modul

## Aufgabe

Erstelle das Zahlungsanträge-Modul für Rückerstattungen und Abrechnungen.

## Datenbank

```sql
CREATE TABLE public.payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Bankdaten
  iban TEXT,
  account_holder TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'entwurf',
  
  -- Genehmigung
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  
  -- Auszahlung
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES auth.users(id),
  payment_reference TEXT,
  
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
```

## Seiten

- `/zahlungsantraege` - Übersicht
- `/zahlungsantraege/neu` - Neuer Antrag
- `/zahlungsantraege/:id` - Details

---

# Prompt 12: Lieferanten-Modul

## Aufgabe

Erstelle das Lieferanten-Modul zur Verwaltung von Lieferanten.

## Datenbank

```sql
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  
  -- Kontakt
  email TEXT,
  phone TEXT,
  website TEXT,
  
  -- Adresse
  address_street TEXT,
  address_city TEXT,
  address_zip TEXT,
  address_country TEXT DEFAULT 'Österreich',
  
  -- Bestellinfos
  customer_number TEXT,
  minimum_order_value NUMERIC,
  order_days TEXT[],
  delivery_time_days INTEGER,
  notes TEXT,
  
  -- Zuordnung
  default_bereichsleiter_id UUID REFERENCES auth.users(id),
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
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
  name TEXT NOT NULL,
  document_type TEXT,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Seiten

- `/lieferanten` - Übersicht mit Suche & Filter
- `/lieferanten/neu` - Neuer Lieferant
- `/lieferanten/:id` - Details mit Kontakten & Dokumenten

---

# Prompt 13: Aufgaben-Modul

## Aufgabe

Erstelle das Aufgaben-Modul mit Kanban-Board und Unteraufgaben.

## Datenbank

```sql
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  
  -- Status & Priorität
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  
  -- Zuweisungen
  created_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  
  -- Termine
  due_date DATE,
  completed_at TIMESTAMPTZ,
  
  -- Hierarchie
  parent_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  
  -- Wiederkehrend
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern JSONB,
  
  -- Kontext
  context_type TEXT,
  context_id UUID,
  
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
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Seiten

- `/aufgaben` - Kanban-Board oder Listenansicht
- `/aufgaben/neu` - Neue Aufgabe
- `/aufgaben/:id` - Aufgabendetails

---

# Prompt 14: Ideenpool-Modul

## Aufgabe

Erstelle das Ideenpool-Modul zum Sammeln und Abstimmen von Ideen.

## Datenbank

```sql
CREATE TABLE public.idea_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.idea_categories(id),
  
  -- Ersteller
  created_by UUID NOT NULL REFERENCES auth.users(id),
  is_anonymous BOOLEAN DEFAULT false,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'neu',
  
  -- Abstimmung
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  
  -- Umsetzung
  implemented_at TIMESTAMPTZ,
  implementation_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Seiten

- `/ideen` - Übersicht mit Filter nach Kategorie/Status
- `/ideen/neu` - Neue Idee einreichen
- `/ideen/:id` - Ideen-Details mit Kommentaren

---

# Prompt 15: PDF-Export-System

## Aufgabe

Erstelle ein PDF-Export-System für Bestellungen, Zahlungsanträge und andere Dokumente.

## Funktionen

### PDF-Vorlage

- Organisations-Logo (wenn konfiguriert)
- Hintergrundbild mit einstellbarer Transparenz
- Konsistentes Layout mit Kopf-/Fußzeile
- Automatische Seitennummerierung

### PDF-Typen

1. **Bestellung** - Details, Lieferant, Genehmigungsverlauf
2. **Zahlungsantrag** - Details, Belege, Genehmigung
3. **Lieferantenliste** - Alle Lieferanten mit Kontakten
4. **Ideenpool-Antrag** - Idee mit Abstimmungsergebnis

## Utilities

```typescript
// src/utils/pdfHelpers.ts

export async function loadPdfBackground(url: string): Promise<string | null>;
export function applyBackgroundToPage(doc: jsPDF, base64: string, opacity: number): void;
export async function createPdfWithBranding(title: string): Promise<jsPDF>;
```

```typescript
// src/utils/generateOrderPdf.ts

export async function generateOrderPdf(order: Order, options?: PdfOptions): Promise<void>;
```

```typescript
// src/utils/generatePaymentOrderPdf.ts

export async function generatePaymentOrderPdf(paymentOrder: PaymentOrder): Promise<void>;
```

---

# Anhang: Wichtige Hinweise

## Technologie-Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Icons:** Lucide React
- **PDF:** jsPDF
- **Routing:** React Router v7

## Best Practices

1. **Immer RLS aktivieren** für alle Tabellen
2. **Indexes** für häufig abgefragte Spalten
3. **Timestamps** (created_at, updated_at) für alle Tabellen
4. **Soft Deletes** wo sinnvoll (is_deleted statt DELETE)
5. **Audit-Logging** für wichtige Aktionen

## Reihenfolge der Implementierung

1. **Prompts 1-7:** Grundlagen (müssen zuerst)
2. **Prompts 8-9:** Kommunikation & Admin
3. **Prompts 10-14:** Geschäftsmodule (können parallel)
4. **Prompt 15:** PDF-Export (zum Schluss)

## Import-Hinweise

- Immer `@/` Pfad-Alias verwenden
- Icons von `lucide-react` importieren
- Supabase Client: `@/integrations/supabase/client`
- Typen: `@/integrations/supabase/helpers`

---

**Ende der Prompt-Sammlung**
