import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import type { CommandDecisionWithCreator } from '@/hooks/useCommandDecisions';

/**
 * Hook der Kommandoabstimmungen (command_decisions) zurückgibt, bei denen
 * der aktuelle/simulierte User als Kommandomitglied abstimmen kann.
 * 
 * LOGIK: Zeigt NUR Abstimmungen bei denen:
 * 1. User NOCH NICHT abgestimmt hat (Legacy: command_decision_votes, Items: command_decision_item_votes)
 * 2. Abstimmung EXPLIZIT offen ist (voting_status === 'open')
 * 3. Abstimmung noch nicht abgeschlossen ist (status === 'submitted')
 * 
 * WICHTIG: Abgeschlossene Abstimmungen (voting_status === 'closed') 
 * oder bereits abgestimmte werden NICHT angezeigt.
 * 
 * Für Item-basierte Beschlüsse: User hat abgestimmt wenn er bei ALLEN offenen Items gestimmt hat.
 */
export function usePendingCommandDecisionsForUser(decisions: CommandDecisionWithCreator[]) {
  const { user } = useAuth();
  const { effectiveUserId, effectiveHasKommandomitgliedFunction, effectiveIsKommandant, effectiveIsAdmin } = useSimulation();
  const [pendingDecisions, setPendingDecisions] = useState<CommandDecisionWithCreator[]>([]);
  const [votedDecisionIds, setVotedDecisionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Prüfe ob (simulierter) User ein Kommandomitglied ist (oder Kommandant/Admin)
  const canVote = effectiveHasKommandomitgliedFunction || effectiveIsKommandant || effectiveIsAdmin;

  const fetchPendingDecisions = useCallback(async () => {
    if (!supabase || !user || !canVote) {
      setPendingDecisions([]);
      setVotedDecisionIds(new Set());
      setLoading(false);
      return;
    }

    // Finde Abstimmungen mit EXPLIZIT OFFENEM Status
    // STRENG: NUR voting_status === 'open' UND status === 'submitted' wird akzeptiert!
    const openDecisions = decisions.filter(d => 
      d.voting_status === 'open' &&  // Abstimmung muss explizit offen sein
      d.status === 'submitted' &&    // Abstimmung muss eingereicht sein
      !d.voting_closed_at            // Zusätzliche Sicherheit: Nicht bereits geschlossen
    );

    if (openDecisions.length === 0) {
      setPendingDecisions([]);
      setVotedDecisionIds(new Set());
      setLoading(false);
      return;
    }

    try {
      const decisionIds = openDecisions.map(d => d.id);
      
      // 1. Legacy-Votes prüfen (für Beschlüsse ohne Items)
      const { data: legacyVotes } = await supabase
        .from('command_decision_votes')
        .select('decision_id')
        .eq('user_id', effectiveUserId)
        .in('decision_id', decisionIds);

      const votedLegacy = new Set(legacyVotes?.map(v => v.decision_id) || []);

      // 2. Item-basierte Votes prüfen
      // Lade alle Items für diese Beschlüsse
      const { data: allItems } = await supabase
        .from('command_decision_items')
        .select('id, decision_id, voting_status')
        .in('decision_id', decisionIds)
        .eq('voting_status', 'open'); // Nur offene Items

      // Lade alle Item-Votes des Users
      const itemIds = allItems?.map(i => i.id) || [];
      let votedItemIds = new Set<string>();
      
      if (itemIds.length > 0) {
        const { data: itemVotes } = await supabase
          .from('command_decision_item_votes')
          .select('item_id')
          .eq('user_id', effectiveUserId)
          .in('item_id', itemIds);
        
        votedItemIds = new Set(itemVotes?.map(v => v.item_id) || []);
      }

      // Prüfe für jeden Beschluss ob alle offenen Items abgestimmt wurden
      const votedItems = new Set<string>();
      for (const decision of openDecisions) {
        const decisionItems = allItems?.filter(i => i.decision_id === decision.id) || [];
        
        // Wenn der Beschluss Items hat, prüfe ob alle abgestimmt
        if (decisionItems.length > 0) {
          const allItemsVoted = decisionItems.every(item => votedItemIds.has(item.id));
          if (allItemsVoted) {
            votedItems.add(decision.id);
          }
        }
      }

      // Kombiniere Legacy- und Item-Votes
      const allVoted = new Set([...votedLegacy, ...votedItems]);
      setVotedDecisionIds(allVoted);

      // NUR Abstimmungen zeigen wo User NOCH NICHT abgestimmt hat
      const pendingOnly = openDecisions.filter(d => !allVoted.has(d.id));

      setPendingDecisions(pendingOnly);
    } catch (error) {
      console.error('Error fetching pending command decision votes:', error);
      setPendingDecisions([]);
    }

    setLoading(false);
  }, [decisions, user, canVote, effectiveUserId]);

  useEffect(() => {
    fetchPendingDecisions();
  }, [fetchPendingDecisions]);

  // Anzahl der offenen Abstimmungen wo User NOCH NICHT abgestimmt hat
  const pendingCount = pendingDecisions.filter(d => !votedDecisionIds.has(d.id)).length;

  return {
    pendingDecisions,
    pendingCount,
    votedDecisionIds,
    loading,
    canVote,
    hasVoted: (decisionId: string) => votedDecisionIds.has(decisionId),
    refetch: fetchPendingDecisions
  };
}
