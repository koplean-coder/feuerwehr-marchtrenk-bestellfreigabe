/* eslint-disable react-refresh/only-export-components */
import { ClipboardCheck, Package, PackageCheck } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
}

interface DashboardStatsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function DashboardStats({ tabs, activeTab, onTabChange }: DashboardStatsProps) {
  return (
    <div data-ev-id="ev_869a705307" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {tabs.map((tab) =>
      <button data-ev-id="ev_ee3a3a8810"
      key={tab.id}
      onClick={() => onTabChange(tab.id)}
      className={`p-4 rounded-xl border transition-all text-left ${
      activeTab === tab.id ?
      'border-primary bg-primary/5 ring-2 ring-primary/20' :
      'border-border bg-card hover:border-primary/50'}`
      }>
          <div data-ev-id="ev_ec9af4e88f" className="flex items-center justify-between mb-2">
            <div data-ev-id="ev_80449bd1b7" className={`p-2 rounded-lg ${tab.color}`}>{tab.icon}</div>
            <span data-ev-id="ev_80f64074a9" className="text-2xl font-bold text-foreground">{tab.count}</span>
          </div>
          <p data-ev-id="ev_65d8b4a036" className="text-sm font-medium text-foreground">{tab.label}</p>
        </button>
      )}
    </div>);

}

// Helper to create tabs config
export function createDashboardTabs(
pendingCount: number,
approvedCount: number,
orderedCount: number)
: Tab[] {
  return [
  {
    id: 'pending',
    label: 'Offene Freigaben',
    count: pendingCount,
    icon: <ClipboardCheck className="w-5 h-5 text-amber-600" />,
    color: 'bg-amber-100'
  },
  {
    id: 'approved',
    label: 'Bereit zur Bestellung',
    count: approvedCount,
    icon: <Package className="w-5 h-5 text-green-600" />,
    color: 'bg-green-100'
  },
  {
    id: 'ordered',
    label: 'Bestellt',
    count: orderedCount,
    icon: <PackageCheck className="w-5 h-5 text-blue-600" />,
    color: 'bg-blue-100'
  }];

}