import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  variant?: 'default' | 'compact' | 'card';
  color?: 'gray' | 'blue' | 'purple' | 'amber' | 'green' | 'red';
}

const colorClasses = {
  gray: {
    bg: 'bg-gray-100',
    icon: 'text-gray-400',
    title: 'text-gray-600',
    desc: 'text-gray-500',
    btn: 'bg-gray-600 hover:bg-gray-700 text-white'
  },
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-400',
    title: 'text-blue-600',
    desc: 'text-blue-500',
    btn: 'bg-blue-600 hover:bg-blue-700 text-white'
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-400',
    title: 'text-purple-600',
    desc: 'text-purple-500',
    btn: 'bg-purple-600 hover:bg-purple-700 text-white'
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'text-amber-400',
    title: 'text-amber-600',
    desc: 'text-amber-500',
    btn: 'bg-amber-600 hover:bg-amber-700 text-white'
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-400',
    title: 'text-green-600',
    desc: 'text-green-500',
    btn: 'bg-green-600 hover:bg-green-700 text-white'
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-400',
    title: 'text-red-600',
    desc: 'text-red-500',
    btn: 'bg-red-600 hover:bg-red-700 text-white'
  }
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default',
  color = 'gray'
}: EmptyStateProps) {
  const colors = colorClasses[color];
  const ActionIcon = action?.icon;

  if (variant === 'compact') {
    return (
      <div data-ev-id="ev_fbd28bfd65" className="flex flex-col items-center justify-center py-8 px-4">
        <div data-ev-id="ev_6d807221d7" className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center mb-3`}>
          <Icon className={`w-6 h-6 ${colors.icon}`} />
        </div>
        <p data-ev-id="ev_fd5fdbb8e9" className={`text-sm font-medium ${colors.title}`}>{title}</p>
        {description &&
        <p data-ev-id="ev_34d522dc35" className={`text-xs ${colors.desc} mt-1 text-center max-w-xs`}>{description}</p>
        }
        {action &&
        <button data-ev-id="ev_085fb44dd8"
        onClick={action.onClick}
        className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 ${colors.btn} rounded-lg text-sm font-medium transition-colors`}>

            {ActionIcon && <ActionIcon className="w-4 h-4" />}
            {action.label}
          </button>
        }
      </div>);

  }

  if (variant === 'card') {
    return (
      <div data-ev-id="ev_55ba5286d0" className="bg-card rounded-xl border border-border p-8">
        <div data-ev-id="ev_64295cece6" className="flex flex-col items-center justify-center text-center">
          <div data-ev-id="ev_63140e258a" className={`w-16 h-16 ${colors.bg} rounded-2xl flex items-center justify-center mb-4 relative`}>
            <Icon className={`w-8 h-8 ${colors.icon}`} />
            <div data-ev-id="ev_85f3b8da20" className={`absolute inset-0 ${colors.bg} rounded-2xl animate-ping opacity-20`} />
          </div>
          <h3 data-ev-id="ev_fa3e61c802" className={`text-lg font-semibold ${colors.title} mb-1`}>{title}</h3>
          {description &&
          <p data-ev-id="ev_d91a034d71" className={`text-sm ${colors.desc} max-w-sm`}>{description}</p>
          }
          {action &&
          <button data-ev-id="ev_ef557e6e53"
          onClick={action.onClick}
          className={`mt-4 inline-flex items-center gap-2 px-4 py-2.5 ${colors.btn} rounded-xl font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5`}>

              {ActionIcon && <ActionIcon className="w-5 h-5" />}
              {action.label}
            </button>
          }
        </div>
      </div>);

  }

  // Default variant
  return (
    <div data-ev-id="ev_4087f33961" className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div data-ev-id="ev_7164fa0c52" className={`w-20 h-20 ${colors.bg} rounded-2xl flex items-center justify-center mb-5 relative`}>
        <Icon className={`w-10 h-10 ${colors.icon}`} />
        {/* Decorative rings */}
        <div data-ev-id="ev_5cf23284ef" className={`absolute inset-0 ${colors.bg} rounded-2xl opacity-50 scale-110`} />
        <div data-ev-id="ev_baef906250" className={`absolute inset-0 ${colors.bg} rounded-2xl opacity-25 scale-125`} />
      </div>
      <h3 data-ev-id="ev_e1bd17c827" className={`text-xl font-semibold ${colors.title} mb-2`}>{title}</h3>
      {description &&
      <p data-ev-id="ev_2d5f2b5052" className={`text-sm ${colors.desc} max-w-md mb-4`}>{description}</p>
      }
      {action &&
      <button data-ev-id="ev_9c506ed168"
      onClick={action.onClick}
      className={`inline-flex items-center gap-2 px-5 py-2.5 ${colors.btn} rounded-xl font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5`}>

          {ActionIcon && <ActionIcon className="w-5 h-5" />}
          {action.label}
        </button>
      }
    </div>);

}