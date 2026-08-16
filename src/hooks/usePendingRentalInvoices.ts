import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';

export interface PendingRentalInvoice {
  id: string;
  contract_number: string;
  customer_name: string;
  total_amount: number;
  rental_start: string;
  rental_end: string;
  created_at: string;
}

export function usePendingRentalInvoices() {
  const { effectiveProfile, effectiveIsAdmin, effectiveIsKommandant, effectiveHasKassierFunction } = useSimulation();
  const profile = effectiveProfile;
  const [pendingInvoices, setPendingInvoices] = useState<PendingRentalInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Mit Simulation
  const isKassier = effectiveHasKassierFunction;
  const isAdmin = effectiveIsAdmin;
  const isKommandant = effectiveIsKommandant;
  const canView = isKassier || isAdmin || isKommandant;

  const fetchPendingInvoices = useCallback(async () => {
    if (!supabase || !canView) {
      setPendingInvoices([]);
      setLoading(false);
      return;
    }

    try {
      const { data: contracts, error } = await supabase
        .from('rental_contracts')
        .select('id, contract_number, customer_name, total_amount, rental_start, rental_end, created_at')
        .eq('status', 'active')
        .eq('is_sponsor', false)
        .gt('total_amount', 0)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching rental contracts:', error);
        setPendingInvoices([]);
        return;
      }

      setPendingInvoices(contracts || []);
    } catch (err) {
      console.error('Error in usePendingRentalInvoices:', err);
      setPendingInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    fetchPendingInvoices();
  }, [fetchPendingInvoices]);

  return {
    pendingInvoices,
    loading,
    canView,
    refetch: fetchPendingInvoices
  };
}
