import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  const { profile } = useAuth();
  const [pendingInvoices, setPendingInvoices] = useState<PendingRentalInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const isKassier = profile?.functions?.includes('kassier') ?? false;
  const isAdmin = profile?.role === 'admin';
  const isKommandant = profile?.role === 'kommandant';
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
