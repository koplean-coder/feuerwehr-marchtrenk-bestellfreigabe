import { type ReactNode, useState } from 'react';
import { type LucideIcon, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export function SectionHeader({ icon: Icon, title, description }: SectionHeaderProps) {
  return (
    <div data-ev-id="ev_d33ca59492" className="mb-6">
      <div data-ev-id="ev_91ca65bd52" className="flex items-center gap-3 mb-2">
        <div data-ev-id="ev_8785945961" className="p-2 bg-primary/10 rounded-lg">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h2 data-ev-id="ev_2dddceb68b" className="text-xl font-semibold text-foreground">{title}</h2>
      </div>
      {description &&
      <p data-ev-id="ev_78f24e93cd" className="text-muted-foreground">{description}</p>
      }
    </div>);

}

interface SectionCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, description, children, className = '' }: SectionCardProps) {
  return (
    <div data-ev-id="ev_429cb8230d" className={`bg-card border border-border rounded-lg p-4 ${className}`}>
      {title && <h3 data-ev-id="ev_f908ce02f2" className="font-semibold text-foreground mb-1">{title}</h3>}
      {description && <p data-ev-id="ev_572009b785" className="text-sm text-muted-foreground mb-3">{description}</p>}
      {children}
    </div>);
}

// UserPermissionList for Zugriffsrechte
interface UserPermissionListProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  users: {id: string;full_name: string;email: string;role: string;}[];
  selectedUserIds: string[];
  onToggleUser: (userId: string) => void;
  saving: boolean;
  emptyMessage: string;
  selectedMessage: (count: number) => string;
}

export function UserPermissionList({
  title,
  description,
  icon: Icon,
  iconColor,
  bgColor,
  users,
  selectedUserIds,
  onToggleUser,
  saving,
  emptyMessage,
  selectedMessage
}: UserPermissionListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // Nur Zählen was auch in der users-Liste sichtbar ist (z.B. ohne Admins)
  const visibleSelectedIds = selectedUserIds.filter(id => users.some(u => u.id === id));
  const selectedCount = visibleSelectedIds.length;

  return (
    <div data-ev-id="ev_63a6a8f5af" className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header - always visible */}
      <button data-ev-id="ev_b71f5db524"
      onClick={() => setIsExpanded(!isExpanded)}
      className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">

        <div data-ev-id="ev_119bd0fe30" className="flex items-center gap-3">
          <div data-ev-id="ev_265937eee0" className={`p-2 rounded-lg ${bgColor}`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <div data-ev-id="ev_201f8dc0ed" className="text-left">
            <h3 data-ev-id="ev_24d5579c76" className="font-medium text-foreground">{title}</h3>
            {description &&
            <p data-ev-id="ev_4d7e090b0f" className="text-xs text-muted-foreground">{description}</p>
            }
          </div>
        </div>
        <div data-ev-id="ev_ce6fadd36c" className="flex items-center gap-3">
          {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          <span data-ev-id="ev_e55a71c858" className="text-sm text-muted-foreground">
            {selectedCount === 0 ? emptyMessage : selectedMessage(selectedCount)}
          </span>
          {isExpanded ?
          <ChevronUp className="w-5 h-5 text-muted-foreground" /> :

          <ChevronDown className="w-5 h-5 text-muted-foreground" />
          }
        </div>
      </button>

      {/* Expanded user list */}
      {isExpanded &&
      <div data-ev-id="ev_048698841d" className="border-t border-border p-4 bg-muted/20">
          <div data-ev-id="ev_2689d2473f" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {users.map((user) => {
            const isSelected = selectedUserIds.includes(user.id);
            return (
              <label data-ev-id="ev_7cede0eb99"
              key={user.id}
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
              isSelected ?
              'bg-primary/10 text-primary' :
              'bg-card hover:bg-muted text-foreground'}`
              }>

                  <input data-ev-id="ev_4400b17a0b"
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleUser(user.id)}
                className="w-4 h-4 rounded border-input text-primary focus:ring-primary" />

                  <span data-ev-id="ev_1258fcd2e8" className="text-sm truncate">{user.full_name}</span>
                </label>);

          })}
          </div>
        </div>
      }
    </div>);

}