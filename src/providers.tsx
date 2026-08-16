import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { OrdersProvider } from '@/contexts/OrdersContext';
import { SimulationProvider } from '@/contexts/SimulationContext';

/**
 * ⚠️ App-wide providers. Add new providers here — they'll be available in all routes.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <OrdersProvider>
          <SimulationProvider>
            {children}
          </SimulationProvider>
        </OrdersProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
}
