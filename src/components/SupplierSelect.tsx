import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import type { Supplier } from '@/hooks/useSuppliers';
import { SupplierTooltip } from '@/components/SupplierTooltip';

interface SupplierSelectProps {
  suppliers: Supplier[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Helper function to highlight matching text
function highlightMatch(text: string, search: string) {
  if (!search.trim()) return text;

  const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) =>
  regex.test(part) ?
  <mark data-ev-id="ev_81cc8b2499" key={index} className="bg-yellow-200 text-yellow-900 rounded px-0.5">
        {part}
      </mark> :

  part

  );
}

export function SupplierSelect({ suppliers, value, onChange, placeholder = 'Lieferant auswählen...' }: SupplierSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Find selected supplier
  const selectedSupplier = suppliers.find((s) => s.id === value);

  // Filter suppliers based on search
  const filteredSuppliers = suppliers.filter((supplier) =>
  supplier.name.toLowerCase().includes(search.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
        setShowTooltip(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  function handleSelect(supplierId: string) {
    onChange(supplierId);
    setIsOpen(false);
    setSearch('');
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    setSearch('');
    setShowTooltip(false);
  }

  function handleMouseEnterButton() {
    if (selectedSupplier && !isOpen) {
      // Clear any pending hide timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      // Show tooltip after short delay
      tooltipTimeoutRef.current = setTimeout(() => {
        setShowTooltip(true);
      }, 300);
    }
  }

  function handleMouseLeaveButton() {
    // Clear show timeout if pending
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    // Delay hiding to allow moving to tooltip
    hideTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 150);
  }

  function handleMouseEnterTooltip() {
    // Cancel hide when entering tooltip
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }

  function handleMouseLeaveTooltip() {
    // Hide tooltip when leaving it
    setShowTooltip(false);
  }

  function handleDoubleClick() {
    if (selectedSupplier) {
      // Open suppliers page in new tab
      window.open('/lieferanten', '_blank');
    }
  }

  return (
    <div data-ev-id="ev_d594197c43" ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button data-ev-id="ev_c09225e89c"
      type="button"
      onClick={() => {
        setIsOpen(!isOpen);
        setShowTooltip(false);
      }}
      onMouseEnter={handleMouseEnterButton}
      onMouseLeave={handleMouseLeaveButton}
      onDoubleClick={handleDoubleClick}
      className="w-full flex items-center justify-between px-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-left">

        <span data-ev-id="ev_e0c3f93d74" className={selectedSupplier ? 'text-foreground' : 'text-muted-foreground'}>
          {selectedSupplier?.name || placeholder}
        </span>
        <div data-ev-id="ev_2c9976fbf5" className="flex items-center gap-1">
          {selectedSupplier &&
          <button data-ev-id="ev_45a764b944"
          type="button"
          onClick={handleClear}
          className="p-1 hover:bg-muted rounded transition-colors">

              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          }
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Tooltip for selected supplier - shown on hover */}
      {showTooltip && selectedSupplier && !isOpen &&
      <div data-ev-id="ev_304263ef0c"
      onMouseEnter={handleMouseEnterTooltip}
      onMouseLeave={handleMouseLeaveTooltip}>

          <SupplierTooltip supplier={selectedSupplier} position="bottom" />
        </div>
      }

      {/* Dropdown */}
      {isOpen &&
      <div data-ev-id="ev_c74e86b423" className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {/* Search Input */}
          <div data-ev-id="ev_b078d75a8c" className="p-2 border-b border-border">
            <div data-ev-id="ev_56759ac2a1" className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input data-ev-id="ev_9a0787c286"
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Lieferant suchen..."
            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />

            </div>
          </div>

          {/* Options List */}
          <div data-ev-id="ev_ee1171e34f" className="max-h-60 overflow-y-auto">
            {/* No Supplier Option */}
            <button data-ev-id="ev_2fa194d51f"
          type="button"
          onClick={() => handleSelect('')}
          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors ${
          !value ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'}`
          }>

              Kein Lieferant ausgewählt
            </button>

            {/* Filtered Suppliers */}
            {filteredSuppliers.length === 0 ?
          <div data-ev-id="ev_425061300f" className="px-4 py-3 text-sm text-muted-foreground text-center">
                Keine Lieferanten gefunden
              </div> :

          filteredSuppliers.map((supplier) =>
          <button data-ev-id="ev_ba96d0356f"
          type="button"
          key={supplier.id}
          onClick={() => handleSelect(supplier.id)}
          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors flex items-center justify-between ${
          value === supplier.id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'}`
          }>

                  <span data-ev-id="ev_242c7cd0de">{highlightMatch(supplier.name, search)}</span>
                  {supplier.offered_articles &&
            <span data-ev-id="ev_0a1a616523" className="text-xs text-muted-foreground truncate max-w-[150px] ml-2">
                      {supplier.offered_articles}
                    </span>
            }
                </button>
          )
          }
          </div>

          {/* Footer with count */}
          {search &&
        <div data-ev-id="ev_e9525c1616" className="px-4 py-2 border-t border-border bg-muted/50 text-xs text-muted-foreground">
              {filteredSuppliers.length} von {suppliers.length} Lieferanten
            </div>
        }
        </div>
      }
    </div>);

}