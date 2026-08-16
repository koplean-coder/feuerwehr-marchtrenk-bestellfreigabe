import {
  Euro,
  Clock,
  Bell,
  FileText,
  Mail,
  Globe,
  Shield,
  Users,
  Briefcase,
  Palette,
  Package,
  AlertTriangle,
  Settings,
  CheckSquare,
  ListChecks } from
'lucide-react';
import type { SettingsSection } from './settingsTypes';

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  canAccessSettings: boolean;
  canAdminRentalItems: boolean;
  isAdmin: boolean;
  isKommandant: boolean;
}

interface NavItem {
  id: SettingsSection;
  label: string;
  icon: React.ComponentType<{className?: string;}>;
  category: 'system' | 'benutzer' | 'kommunikation' | 'module';
}

const allNavItems: NavItem[] = [
// System
{ id: 'freigaben', label: 'Freigabebeträge', icon: Euro, category: 'system' },
{ id: 'eskalation', label: 'Eskalation', icon: Clock, category: 'system' },
{ id: 'erinnerungen', label: 'Erinnerungen', icon: Bell, category: 'system' },
{ id: 'pdf', label: 'PDF Einstellungen', icon: FileText, category: 'system' },
{ id: 'system', label: 'Allgemein', icon: Globe, category: 'system' },

// Benutzer & Rechte
{ id: 'mitglieder', label: 'Mitglieder', icon: Users, category: 'benutzer' },
{ id: 'funktionen', label: 'Funktionen', icon: Briefcase, category: 'benutzer' },
{ id: 'zugriffsrechte', label: 'Zugriffsrechte', icon: Shield, category: 'benutzer' },
{ id: 'modul-berechtigungen', label: 'Modul-Zugriffe', icon: Settings, category: 'benutzer' },

// Kommunikation
{ id: 'email-empfaenger', label: 'E-Mail Empfänger', icon: Mail, category: 'kommunikation' },
{ id: 'email-vorlagen', label: 'E-Mail Vorlagen', icon: Mail, category: 'kommunikation' },
{ id: 'email-design', label: 'E-Mail Design', icon: Palette, category: 'kommunikation' },

// Module
{ id: 'leihgeraete', label: 'Leihgeräte', icon: Package, category: 'module' },
{ id: 'leihvertraege', label: 'Leihverträge', icon: FileText, category: 'module' },
{ id: 'probleme', label: 'Problemberichte', icon: AlertTriangle, category: 'module' },
{ id: 'aufgaben', label: 'Aufgaben', icon: CheckSquare, category: 'module' },
{ id: 'tagesordnung', label: 'Tagesordnung', icon: ListChecks, category: 'module' }];


const categoryLabels: Record<string, string> = {
  system: 'System',
  benutzer: 'Benutzer & Rechte',
  kommunikation: 'Kommunikation',
  module: 'Module'
};

export function SettingsSidebar({
  activeSection,
  onSectionChange,
  canAccessSettings,
  canAdminRentalItems,
  isAdmin,
  isKommandant
}: SettingsSidebarProps) {
  // Filter nav items based on permissions
  const getVisibleItems = (): NavItem[] => {
    if (canAccessSettings) {
      // Admins/Kommandanten see everything
      return allNavItems;
    }

    // Rental item admins only see Leihgeräte
    if (canAdminRentalItems) {
      return allNavItems.filter((item) => item.id === 'leihgeraete');
    }

    return [];
  };

  const visibleItems = getVisibleItems();
  const categories = [...new Set(visibleItems.map((item) => item.category))];

  return (
    <aside data-ev-id="ev_e8fde8e3b0" className="w-64 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div data-ev-id="ev_7695fb0b44" className="p-4 border-b border-border">
        <div data-ev-id="ev_06f437e9cd" className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <h1 data-ev-id="ev_02dc98a448" className="font-semibold text-lg">Einstellungen</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav data-ev-id="ev_678b8f682b" className="flex-1 overflow-y-auto py-4">
        {categories.map((category) => {
          const categoryItems = visibleItems.filter((item) => item.category === category);
          if (categoryItems.length === 0) return null;

          return (
            <div data-ev-id="ev_be78a80a52" key={category} className="mb-6">
              <h2 data-ev-id="ev_34e79131e3" className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {categoryLabels[category]}
              </h2>
              <ul data-ev-id="ev_27fe264dd8" className="space-y-1">
                {categoryItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  return (
                    <li data-ev-id="ev_4e3fa520b3" key={item.id}>
                      <button data-ev-id="ev_a0a3cad099"
                      onClick={() => onSectionChange(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      isActive ?
                      'bg-primary/10 text-primary font-medium border-r-2 border-primary' :
                      'text-muted-foreground hover:bg-muted hover:text-foreground'}`
                      }>

                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span data-ev-id="ev_3366a538da" className="truncate">{item.label}</span>
                      </button>
                    </li>);

                })}
              </ul>
            </div>);

        })}
      </nav>
    </aside>);

}