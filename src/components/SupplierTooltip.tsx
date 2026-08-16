import { useState } from 'react';
import {
  ExternalLink,
  User,
  Lock,
  Eye,
  EyeOff,
  ShoppingCart,
  Mail,
  Building2 } from
'lucide-react';
import type { Supplier } from '@/hooks/useSuppliers';

const ORDER_METHOD_OPTIONS = [
{ id: 'webshop', label: 'Webshop' },
{ id: 'telefonisch', label: 'Telefonisch' },
{ id: 'email', label: 'Email' },
{ id: 'bereichsleiter', label: 'Bereichsleiter' },
{ id: 'ruecksprache_kdt', label: 'Rücksprache Kommandant' },
{ id: 'it_admin', label: 'IT-Administrator' }];


interface SupplierTooltipProps {
  supplier: Supplier;
  position?: 'top' | 'bottom';
}

export function SupplierTooltip({ supplier, position = 'bottom' }: SupplierTooltipProps) {
  const [showPassword, setShowPassword] = useState(false);

  const positionClasses = position === 'top' ?
  'bottom-full mb-2' :
  'top-full mt-2';

  return (
    <div data-ev-id="ev_e931cede02"
    className={`absolute left-0 right-0 ${positionClasses} z-50 bg-card border border-border rounded-lg shadow-xl p-4 min-w-[280px]`}
    onClick={(e) => e.stopPropagation()}>

      {/* Header */}
      <div data-ev-id="ev_fd7ff71015" className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
        <div data-ev-id="ev_2a4cbc41c3" className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div data-ev-id="ev_12e514e45a">
          <h4 data-ev-id="ev_722d0b40f0" className="font-semibold text-foreground">{supplier.name}</h4>
          {supplier.offered_articles &&
          <p data-ev-id="ev_afa3a0c301" className="text-xs text-muted-foreground line-clamp-1">{supplier.offered_articles}</p>
          }
        </div>
      </div>

      {/* Details */}
      <div data-ev-id="ev_ce46518e7e" className="flex flex-col gap-2 text-sm">
        {supplier.link &&
        <a data-ev-id="ev_abcb881f90"
        href={supplier.link}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}>

            <ExternalLink className="w-4 h-4" />
            Website öffnen
          </a>
        }
        
        {supplier.username &&
        <div data-ev-id="ev_29a1d61f18" className="flex items-center gap-2 text-muted-foreground">
            <User className="w-4 h-4" />
            <span data-ev-id="ev_dc7e645263">{supplier.username}</span>
          </div>
        }
        
        {supplier.password &&
        <div data-ev-id="ev_3834712a3c" className="flex items-center gap-2 text-muted-foreground">
            <Lock className="w-4 h-4" />
            <span data-ev-id="ev_f48026c4c3" className="font-mono">
              {showPassword ? supplier.password : '••••••••'}
            </span>
            <button data-ev-id="ev_821e482805"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowPassword(!showPassword);
          }}
          className="p-1 hover:bg-muted rounded transition-colors">

              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        }
        
        {(supplier.order_methods ?? []).length > 0 &&
        <div data-ev-id="ev_2e85a37198" className="flex items-start gap-2 text-muted-foreground mt-1">
            <ShoppingCart className="w-4 h-4 mt-0.5" />
            <div data-ev-id="ev_c8aa04885e" className="flex flex-wrap gap-1">
              {(supplier.order_methods ?? []).map((method) => {
              const option = ORDER_METHOD_OPTIONS.find((o) => o.id === method);
              return option ?
              <span data-ev-id="ev_a741b374a2" key={method} className="px-2 py-0.5 bg-muted rounded text-xs">
                    {option.label}
                  </span> :
              null;
            })}
            </div>
          </div>
        }
        
        {supplier.order_email &&
        <div data-ev-id="ev_57e469cc05" className="flex items-center gap-2 text-muted-foreground">
            <Mail className="w-4 h-4" />
            <a data-ev-id="ev_cba07edbcb"
          href={`mailto:${supplier.order_email}`}
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}>

              {supplier.order_email}
            </a>
          </div>
        }
      </div>

      {/* Footer hint */}
      <div data-ev-id="ev_8bee6714af" className="mt-3 pt-3 border-t border-border">
        <p data-ev-id="ev_8cbfb5e721" className="text-xs text-muted-foreground text-center">
          Doppelklick zum Öffnen der Lieferantenseite
        </p>
      </div>
    </div>);

}