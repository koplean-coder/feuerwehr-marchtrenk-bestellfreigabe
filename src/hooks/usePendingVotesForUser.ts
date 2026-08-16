import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import type { Order } from '@/hooks/useOrders';

/**
 * Hook der Bestellungen zurückgibt, bei denen der aktuelle/simulierte User
 * als Kommandomitglied abstimmen kann (Abstimmung offen).
 * 
 * LOGIK: Zeigt NUR Bestellungen bei denen:
 * 1. User NOCH NICHT abgestimmt hat
 * 2. Abstimmung EXPLIZIT geöffnet wurde (voting_status === 'open')
 * 3. Bestellung nicht bereits genehmigt/abgelehnt/abgeschlossen ist
 * 
 * WICHTIG: voting_status === null/undefined wird NICHT als "offen" behandelt!
 * Nur explizit geöffnete Abstimmungen erscheinen unter "Zu erledigen".
 * 
 * BERECHTIGUNG: Kommandomitglieder, Kommandant UND Admin können abstimmen.
 */
export function usePendingVotesForUser(orders: Order[]) {
  const { user } = useAuth();
  const { effectiveUserId, effectiveHasKommandomitgliedFunction, effectiveIsAdmin, effectiveIsKommandant } = useSimulation();
  const [pendingVoteOrders, setPendingVoteOrders] = useState<Order[]>([]);
  const [votedOrderIds, setVotedOrderIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Prüfe ob (simulierter) User abstimmen kann: Kommandomitglied, Kommandant oder Admin
  // (wie in useOrderVotes.ts: canVoteAsKommandomitglied)
  const canVote = effectiveHasKommandomitgliedFunction || effectiveIsKommandant || effectiveIsAdmin;

  const fetchPendingVotes = useCallback(async () => {
    if (!supabase || !user || !canVote) {
      setPendingVoteOrders([]);
      setVotedOrderIds(new Set());
      setLoading(false);
      return;
    }

    // Finde Bestellungen mit EXPLIZIT OFFENER Abstimmung
    // STRENG: NUR voting_status === 'open' wird akzeptiert!
    // Zusätzliche Sicherheit: Bestellung darf nicht bereits abgeschlossen sein
    const ordersWithOpenVoting = orders.filter(o => 
      o.requires_kommandomitglied_approval && 
      o.voting_status === 'open' &&  // STRENG: Nur explizit geöffnete Abstimmungen
      !o.voting_result &&  // Kein Ergebnis vorhanden (noch nicht entschieden)
      !o.kommandomitglied_approved_at &&  // Noch nicht durch Abstimmung genehmigt
      !o.kommandomitglied_override_at &&  // Nicht vom Kommandant überschrieben
      o.status !== 'abgelehnt' &&
      o.status !== 'genehmigt' &&
      o.status !== 'abgeschlossen' &&
      o.status !== 'freigegeben_kommandant' &&  // Bereits vom KDT freigegeben
      o.status !== 'freigegeben_bereichsleitung'  // Bereits vom BL freigegeben
    );

    if (ordersWithOpenVoting.length === 0) {
      setPendingVoteOrders([]);
      setVotedOrderIds(new Set());
      setLoading(false);
      return;
    }

    try {
      // Lade alle Stimmen des (simulierten) Users für diese Bestellungen
      const orderIds = ordersWithOpenVoting.map(o => o.id);
      
      const { data: userVotes } = await supabase
        .from('order_votes')
        .select('order_id')
        .eq('user_id', effectiveUserId)
        .in('order_id', orderIds);

      // IDs bei denen der User bereits abgestimmt hat
      const voted = new Set(userVotes?.map(v => v.order_id) || []);
      setVotedOrderIds(voted);

      // NUR Abstimmungen zeigen wo User NOCH NICHT abgestimmt hat
      // Bereits abgestimmte erscheinen NICHT unter "Zu erledigen"
      const pendingOnly = ordersWithOpenVoting.filter(o => !voted.has(o.id));

      setPendingVoteOrders(pendingOnly);
    } catch (error) {
      console.error('Error fetching pending votes:', error);
      setPendingVoteOrders([]);
    }

    setLoading(false);
  }, [orders, user, canVote, effectiveUserId]);

  useEffect(() => {
    fetchPendingVotes();
  }, [fetchPendingVotes]);

  // Anzahl der offenen Abstimmungen wo User NOCH NICHT abgestimmt hat
  const pendingCount = pendingVoteOrders.filter(o => !votedOrderIds.has(o.id)).length;

  return {
    pendingVoteOrders,
    pendingCount,
    votedOrderIds,
    loading,
    canVote,
    hasVoted: (orderId: string) => votedOrderIds.has(orderId),
    refetch: fetchPendingVotes
  };
}
