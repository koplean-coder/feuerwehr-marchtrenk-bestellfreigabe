import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Order } from '@/hooks/useOrders';

export type BeschlussStatus = 'laufend' | 'genehmigt' | 'abgelehnt' | 'archiv';

export interface KommandobeschlussFilter {
  status: BeschlussStatus;
  search: string;
}

/**
 * Hook für die Kommandobeschlüsse-Seite.
 * Zeigt alle Bestellungen mit Kommandoabstimmung.
 */
export function useKommandobeschluesse() {
  const { profile } = useAuth();
  const [beschluesse, setBeschluesse] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<KommandobeschlussFilter>({
    status: 'laufend',
    search: ''
  });

  // Nur Kommandomitglieder, Kommandant und Admin haben Zugriff
  const hasAccess = profile?.role === 'kommandant' || 
                    profile?.role === 'admin' || 
                    profile?.functions?.includes('kommandomitglied');

  const fetchBeschluesse = useCallback(async () => {
    if (!supabase || !hasAccess) {
      setBeschluesse([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Alle Bestellungen mit Kommandoabstimmung laden
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          creator:profiles!orders_created_by_fkey(id, full_name, email),
          supplier:suppliers(id, name),
          bereichsleiter:profiles!orders_bereichsleiter_id_fkey(id, full_name)
        `)
        .eq('requires_kommandomitglied_approval', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching Kommandobeschlüsse:', error);
        setBeschluesse([]);
      } else {
        setBeschluesse((data ?? []) as Order[]);
      }
    } catch (err) {
      console.error('Error:', err);
      setBeschluesse([]);
    }

    setLoading(false);
  }, [hasAccess]);

  useEffect(() => {
    fetchBeschluesse();
  }, [fetchBeschluesse]);

  // Archivierungs-Check: Älter als 3 Monate
  const isArchivable = (order: Order): boolean => {
    if (!order.voting_closed_at) return false;
    const closedDate = new Date(order.voting_closed_at);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return closedDate < threeMonthsAgo;
  };

  // Gefilterte und kategorisierte Beschlüsse
  const categorizedBeschluesse = useMemo(() => {
    const laufend: Order[] = [];
    const genehmigt: Order[] = [];
    const abgelehnt: Order[] = [];
    const archiv: Order[] = [];

    beschluesse.forEach(order => {
      // Archiv: Abgeschlossen und älter als 3 Monate
      if ((order.voting_status === 'closed' || order.kommandomitglied_approved_at) && isArchivable(order)) {
        archiv.push(order);
        return;
      }

      // Kommandant bereits freigegeben → in "genehmigt" einordnen
      const isKommandantApproved = order.status === 'freigegeben_kommandant' || !!order.kommandant_approved_at;
      if (isKommandantApproved && order.status !== 'abgelehnt') {
        genehmigt.push(order);
        return;
      }

      // Laufend: voting_status = 'open' ODER noch nicht abgeschlossen
      if (order.voting_status === 'open' || (
        order.voting_status !== 'closed' &&
        !order.kommandomitglied_approved_at &&
        !order.kommandomitglied_override_by &&
        order.status !== 'genehmigt' &&
        order.status !== 'abgelehnt'
      )) {
        laufend.push(order);
        return;
      }

      // Genehmigt: Status genehmigt ODER voting_result = approved/overridden mit genehmigung
      if (order.status === 'genehmigt' || 
          order.voting_result === 'approved' ||
          (order.voting_result === 'overridden' && order.kommandomitglied_override_by && order.status === 'genehmigt')) {
        genehmigt.push(order);
        return;
      }

      // Abgelehnt
      if (order.status === 'abgelehnt' || order.voting_result === 'rejected') {
        abgelehnt.push(order);
        return;
      }

      // Fallback: In Kategorie basierend auf Status
      if (order.voting_status === 'closed') {
        if (order.status === 'genehmigt') {
          genehmigt.push(order);
        } else {
          abgelehnt.push(order);
        }
      } else {
        laufend.push(order);
      }
    });

    return { laufend, genehmigt, abgelehnt, archiv };
  }, [beschluesse]);

  // Aktuelle gefilterte Liste basierend auf Tab und Suche
  const filteredBeschluesse = useMemo(() => {
    let list: Order[];
    switch (filter.status) {
      case 'laufend':
        list = categorizedBeschluesse.laufend;
        break;
      case 'genehmigt':
        list = categorizedBeschluesse.genehmigt;
        break;
      case 'abgelehnt':
        list = categorizedBeschluesse.abgelehnt;
        break;
      case 'archiv':
        list = categorizedBeschluesse.archiv;
        break;
      default:
        list = categorizedBeschluesse.laufend;
    }
    
    // Suche anwenden
    if (!filter.search.trim()) return list;
    
    const searchLower = filter.search.toLowerCase();
    return list.filter(order => 
      order.title?.toLowerCase().includes(searchLower) ||
      order.description?.toLowerCase().includes(searchLower) ||
      order.creator?.full_name?.toLowerCase().includes(searchLower) ||
      order.supplier?.name?.toLowerCase().includes(searchLower) ||
      order.id.toLowerCase().includes(searchLower)
    );
  }, [categorizedBeschluesse, filter]);

  // Counts für Tabs
  const counts = useMemo(() => ({
    laufend: categorizedBeschluesse.laufend.length,
    genehmigt: categorizedBeschluesse.genehmigt.length,
    abgelehnt: categorizedBeschluesse.abgelehnt.length,
    archiv: categorizedBeschluesse.archiv.length,
    total: beschluesse.length
  }), [categorizedBeschluesse, beschluesse]);

  return {
    beschluesse: filteredBeschluesse,
    allBeschluesse: beschluesse,
    categorizedBeschluesse,
    counts,
    loading,
    hasAccess,
    filter,
    setFilter,
    setSearch: (search: string) => setFilter(f => ({ ...f, search })),
    setStatus: (status: BeschlussStatus) => setFilter(f => ({ ...f, status })),
    refetch: fetchBeschluesse
  };
}
