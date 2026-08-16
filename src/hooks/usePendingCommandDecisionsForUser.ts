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
 * 1. User NOCH NICHT abgestimmt hat (keine Stimme in command_decision_votes)
 * 2. Abstimmung EXPLIZIT offen ist (voting_status === 'open')
 * 3. Abstimmung noch nicht abgeschlossen ist (status === 'submitted')
 * 
 * WICHTIG: Abgeschlossene Abstimmungen (voting_status === 'closed') 
 * oder bereits abgestimmte werden NICHT angezeigt.
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
      // Lade alle Stimmen des (simulierten) Users für diese Abstimmungen
      const decisionIds = openDecisions.map(d => d.id);
      
      const { data: userVotes } = await supabase
        .from('command_decision_votes')
        .select('decision_id')
        .eq('user_id', effectiveUserId)
        .in('decision_id', decisionIds);

      // IDs bei denen der User bereits abgestimmt hat
      const voted = new Set(userVotes?.map(v => v.decision_id) || []);
      setVotedDecisionIds(voted);

      // NUR Abstimmungen zeigen wo User NOCH NICHT abgestimmt hat
      // Bereits abgestimmte erscheinen NICHT unter "Zu erledigen"
      const pendingOnly = openDecisions.filter(d => !voted.has(d.id));

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
