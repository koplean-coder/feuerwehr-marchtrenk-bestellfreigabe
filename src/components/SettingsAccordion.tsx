import { useState, ReactNode } from 'react';
import { ChevronDown, ChevronUp, LucideIcon } from 'lucide-react';

interface AccordionSectionProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function AccordionSection({
  title,
  subtitle,
  icon: Icon,
  iconBgColor = 'bg-primary/10',
  iconColor = 'text-primary',
  children,
  defaultOpen = false
}: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div data-ev-id="ev_01ab1d61d6" className="bg-card rounded-xl border border-border overflow-hidden">
      <button data-ev-id="ev_6272762d2b"
      onClick={() => setIsOpen(!isOpen)}
      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">

        <div data-ev-id="ev_e234bed1cf" className="flex items-center gap-3">
          <div data-ev-id="ev_8422c00944" className={`p-2 ${iconBgColor} rounded-lg`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div data-ev-id="ev_a7163ee19e" className="text-left">
            <h3 data-ev-id="ev_3c2ff015cd" className="font-semibold text-foreground">{title}</h3>
            {subtitle && <p data-ev-id="ev_be8ad7417a" className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {isOpen ?
        <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" /> :

        <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        }
      </button>
      
      <div data-ev-id="ev_8c0f533260"
      className={`transition-all duration-200 ease-in-out overflow-hidden ${
      isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`
      }>

        <div data-ev-id="ev_b5a702f1e2" className="px-4 pb-4">
          {children}
        </div>
      </div>
    </div>);

}