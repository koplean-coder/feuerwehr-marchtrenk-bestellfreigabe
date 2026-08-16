/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type OrderStatus = 
  | 'entwurf'
  | 'eingereicht' 
  | 'ausstehend_bereichsleitung' 
  | 'ausstehend_kommandant'
  | 'ausstehend_kommandomitglieder'
  | 'freigegeben_bereichsleitung'
  | 'freigegeben_kommandant'
  | 'genehmigt' 
  | 'abgelehnt'
  | 'abgeschlossen';

export type EmailStatus = 'none' | 'sent' | 'failed' | 'partial';

export type InvoiceTo = 'gemeinde' | 'feuerwehr';

export interface Order {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  supplier_id: string | null;
  status: OrderStatus;
  created_by: string;
  bereichsleiter_id: string | null;
  kommandant_id: string | null;
  bereichsleiter_approved_at: string | null;
  kommandant_approved_at: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  reset_at: string | null;
  reset_by: string | null;
  reset_reason: string | null;
  requires_kommandant_approval: boolean;
  requires_kommandomitglied_approval: boolean;
  kommandomitglied_approved_at: string | null;
  kommandomitglied_override_by: string | null;
  kommandomitglied_override_reason: string | null;
  kommandomitglied_override_at: string | null;
  invoice_to: InvoiceTo | null;
  kassier_bestellt: boolean;
  kassier_bestellt_at: string | null;
  kassier_bestellt_by: string | null;
  order_executed: boolean;
  order_executed_at: string | null;
  order_executed_by: string | null;
  order_received: boolean;
  order_received_at: string | null;
  order_received_by: string | null;
  is_archived: boolean;
  archived_at: string | null;
  archived_by: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  // Eskalationsfrist-Verlängerung
  escalation_extended_until: string | null;
  escalation_extension_reason: string | null;
  escalation_extended_by: string | null;
  escalation_extended_at: string | null;
  // Kommandoabstimmung
  voting_status: 'open' | 'closed' | null;
  voting_opened_at: string | null;
  voting_closed_at: string | null;
  voting_closed_by: string | null;
  voting_result: 'approved' | 'rejected' | 'overridden' | null;
  voting_last_reminder_at: string | null;
  voting_reminder_count: number | null;
  creator?: { full_name: string; email: string };
  supplier?: { name: string; minimum_order_value: number | null; order_days: string[] | null };
}

export interface OrderHistory {
  id: string;
  order_id: string;
  action: string;
  old_status: OrderStatus | null;
  new_status: OrderStatus;
  performed_by: string;
  comment: string | null;
  email_status: EmailStatus | null;
  created_at: string;
  performer?: { full_name: string; email: string };
}

interface OrdersContextType {
  orders: Order[];
  loading: boolean;
  fetchOrders: () => Promise<void>;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

// Performance: Limit für geladene Bestellungen
const ORDERS_LIMIT = 200;
// Minimum Zeit zwischen Refetches (in ms)
const REFETCH_THROTTLE_MS = 30000;

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const { user, profile, loading: authLoading } = useAuth();

  // Check for orders that need escalation - nur für Admins/Kommandant/Bereichsleiter
  const checkEscalation = useCallback(async () => {
    if (!supabase) return;
    
    // Nur Admins, Kommandanten und Bereichsleiter dürfen Escalation prüfen
    if (!profile || !['admin', 'kommandant', 'bereichsleiter'].includes(profile.role)) {
      return;
    }
    
    try {
      const { data, error } = await supabase.rpc('check_and_escalate_orders');
      if (error) {
        console.error('Escalation check error:', error);
        return;
      }
      if (data && data.length > 0 && data[0].escalated_count > 0) {
        console.log(`Escalated ${data[0].escalated_count} orders`);
      }
    } catch (err) {
      console.error('Escalation check failed:', err);
    }
  }, [profile]);

  const fetchOrders = useCallback(async (force = false) => {
    if (!supabase || !user) {
      console.log('[OrdersContext] Skipping fetch - no supabase or user', { hasSupabase: !!supabase, hasUser: !!user });
      setLoading(false);
      return;
    }
    
    // Throttle: Skip wenn letzter Fetch zu kürzlich war (außer force=true)
    const now = Date.now();
    if (!force && lastFetchTime > 0 && (now - lastFetchTime) < REFETCH_THROTTLE_MS) {
      console.log('[OrdersContext] Skipping fetch - throttled');
      return;
    }
    
    console.log('[OrdersContext] Fetching orders for user:', user.id);
    setLastFetchTime(now);
    
    // Check for escalations nur beim ersten Laden oder wenn force
    if (force || orders.length === 0) {
      await checkEscalation();
    }
    
    // Alle Bestellungen laden (Filterung erfolgt im Frontend)
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        creator:profiles!orders_created_by_fkey(full_name, email),
        supplier:suppliers(name, minimum_order_value, order_days)
      `)
      .order('created_at', { ascending: false })
      .limit(ORDERS_LIMIT);
    
    if (error) {
      console.error('[OrdersContext] Error fetching orders:', error);
    } else {
      console.log('[OrdersContext] Fetched orders:', data?.length || 0);
    }
    
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }, [checkEscalation, user, lastFetchTime, orders.length]);

  useEffect(() => {
    // Warte auf Authentifizierung bevor Bestellungen geladen werden
    if (!authLoading && user) {
      console.log('[OrdersContext] Auth ready, fetching orders');
      fetchOrders();
    } else if (!authLoading && !user) {
      console.log('[OrdersContext] No user, clearing orders');
      setOrders([]);
      setLoading(false);
    }
  }, [fetchOrders, authLoading, user]);

  // Automatisch Daten neu laden wenn Tab/Fenster wieder fokussiert wird (mit Throttle)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        // Throttle ist bereits in fetchOrders eingebaut
        fetchOrders();
      }
    };
    
    // Nur visibilitychange, nicht focus (zu viele Events)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchOrders, user]);

  // Loading ist true wenn Auth noch lädt ODER Bestellungen noch laden
  const isLoading = authLoading || loading;

  return (
    <OrdersContext.Provider value={{ orders, loading: isLoading, fetchOrders }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrdersContext() {
  const context = useContext(OrdersContext);
  if (context === undefined) {
    throw new Error('useOrdersContext must be used within an OrdersProvider');
  }
  return context;
}
