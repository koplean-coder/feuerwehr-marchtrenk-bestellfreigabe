import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Order } from '@/hooks/useOrders';

export interface VoteSummaryMap {
  [orderId: string]: {
    approveCount: number;
    rejectCount: number;
    totalVoters: number;
  };
}

/**
 * Hook der die Abstimmungs-Summaries für alle Orders lädt,
 * die eine Kommando-Abstimmung erfordern.
 * Optimiert für Listen-Ansichten (eine Abfrage für alle Orders).
 */
export function useOrderVotesSummary(orders: Order[]) {
  const [voteSummaries, setVoteSummaries] = useState<VoteSummaryMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVoteSummaries() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      // Filter Orders die eine Kommando-Abstimmung erfordern
      const relevantOrderIds = orders
        .filter(o => o.requires_kommandomitglied_approval)
        .map(o => o.id);

      if (relevantOrderIds.length === 0) {
        setVoteSummaries({});
        setLoading(false);
        return;
      }

      try {
        // Lade alle Stimmen für die relevanten Orders in einer Abfrage
        const { data: votesData } = await supabase
          .from('order_votes')
          .select('order_id, vote')
          .in('order_id', relevantOrderIds);

        // Lade Anzahl der Kommandomitglieder (für totalVoters)
        const { data: kommandomitgliederData } = await supabase
          .from('profiles')
          .select('id')
          .contains('functions', ['kommandomitglied']);

        const totalVoters = kommandomitgliederData?.length || 0;

        // Gruppiere Stimmen nach Order
        const summaries: VoteSummaryMap = {};
        
        // Initialisiere alle relevanten Orders
        relevantOrderIds.forEach(orderId => {
          summaries[orderId] = {
            approveCount: 0,
            rejectCount: 0,
            totalVoters
          };
        });

        // Zähle Stimmen
        (votesData || []).forEach(vote => {
          if (summaries[vote.order_id]) {
            if (vote.vote === 'approve') {
              summaries[vote.order_id].approveCount++;
            } else if (vote.vote === 'reject') {
              summaries[vote.order_id].rejectCount++;
            }
          }
        });

        setVoteSummaries(summaries);
      } catch (error) {
        console.error('Error fetching vote summaries:', error);
      }
      
      setLoading(false);
    }

    fetchVoteSummaries();
  }, [orders]);

  return { voteSummaries, loading };
}
