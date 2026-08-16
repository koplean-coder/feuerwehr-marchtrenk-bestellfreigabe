import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type VoteType = 'approve' | 'reject' | 'abstain';

export interface CommandDecisionVote {
  id: string;
  decision_id: string;
  user_id: string;
  vote: VoteType;
  reason: string | null;
  created_at: string;
  voter?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface VoteHistory {
  id: string;
  decision_id: string;
  user_id: string;
  old_vote: VoteType | null;
  new_vote: VoteType;
  old_reason: string | null;
  new_reason: string | null;
  changed_at: string;
  user?: {
    id: string;
    full_name: string;
  };
}

export interface MissingVote {
  id: string;
  decision_id: string;
  user_id: string;
  recorded_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface Kommandomitglied {
  id: string;
  full_name: string;
  email: string;
}

export interface VoteSummary {
  approveCount: number;
  rejectCount: number;
  abstainCount: number;
  totalVoters: number;
  votedCount: number;
  hasVoted: boolean;
  userVote: VoteType | null;
  isApproved: boolean;
  isRejected: boolean;
  requiredVotes: number;
}

export function useCommandDecisionVotes(decisionId: string | undefined) {
  const { user, profile } = useAuth();
  const [votes, setVotes] = useState<CommandDecisionVote[]>([]);
  const [voteHistory, setVoteHistory] = useState<VoteHistory[]>([]);
  const [missingVotes, setMissingVotes] = useState<MissingVote[]>([]);
  const [kommandomitglieder, setKommandomitglieder] = useState<Kommandomitglied[]>([]);
  const [loading, setLoading] = useState(true);

  // Permission checks
  const hasKommandomitgliedFunction = profile?.functions?.includes('kommandomitglied') ?? false;
  const isKommandant = profile?.role === 'kommandant' || profile?.role === 'admin';
  const canVoteAsKommandomitglied = hasKommandomitgliedFunction || isKommandant;

  const fetchVotes = useCallback(async () => {
    if (!supabase || !decisionId) return;

    setLoading(true);

    try {
      // Fetch votes for this decision
      const { data: votesData } = await supabase
        .from('command_decision_votes')
        .select('id, decision_id, user_id, vote, reason, created_at')
        .eq('decision_id', decisionId);

      // Fetch all Kommandomitglieder
      const { data: kommandomitgliederData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .contains('functions', ['kommandomitglied']);

      const kdmList = (kommandomitgliederData ?? []) as Kommandomitglied[];
      setKommandomitglieder(kdmList);

      if (votesData) {
        // Fetch voter profiles
        const voterIds = votesData.map(v => v.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', voterIds);

        const votesWithProfiles: CommandDecisionVote[] = votesData.map(vote => ({
          ...vote,
          vote: vote.vote as VoteType,
          voter: profiles?.find(p => p.id === vote.user_id) as Kommandomitglied | undefined
        }));

        setVotes(votesWithProfiles);
      } else {
        setVotes([]);
      }

      // Fetch vote history
      const { data: historyData } = await supabase
        .from('command_decision_vote_history')
        .select('id, decision_id, user_id, old_vote, new_vote, old_reason, new_reason, changed_at')
        .eq('decision_id', decisionId)
        .order('changed_at', { ascending: false });

      if (historyData && historyData.length > 0) {
        const historyUserIds = [...new Set(historyData.map(h => h.user_id))];
        const { data: historyProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', historyUserIds);

        const historyWithProfiles: VoteHistory[] = historyData.map(h => ({
          ...h,
          old_vote: h.old_vote as VoteType | null,
          new_vote: h.new_vote as VoteType,
          user: historyProfiles?.find(p => p.id === h.user_id)
        }));
        setVoteHistory(historyWithProfiles);
      } else {
        setVoteHistory([]);
      }

      // Fetch missing votes
      const { data: missingData } = await supabase
        .from('command_decision_votes_missing')
        .select('id, decision_id, user_id, recorded_at')
        .eq('decision_id', decisionId);

      if (missingData && missingData.length > 0) {
        const missingUserIds = missingData.map(m => m.user_id);
        const { data: missingProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', missingUserIds);

        const missingWithProfiles: MissingVote[] = missingData.map(m => ({
          ...m,
          user: missingProfiles?.find(p => p.id === m.user_id) as Kommandomitglied | undefined
        }));
        setMissingVotes(missingWithProfiles);
      } else {
        setMissingVotes([]);
      }
    } catch (err) {
      console.error('Error fetching votes:', err);
    } finally {
      setLoading(false);
    }
  }, [decisionId]);

  useEffect(() => {
    fetchVotes();
  }, [fetchVotes]);

  // Calculate vote summary - Enthaltungen zählen nicht zur Mehrheit
  const approveCount = votes.filter(v => v.vote === 'approve').length;
  const rejectCount = votes.filter(v => v.vote === 'reject').length;
  const abstainCount = votes.filter(v => v.vote === 'abstain').length;
  const totalVoters = kommandomitglieder.length;
  const votedCount = votes.length;

  // Einfache Mehrheit: Mehr als die Hälfte der ABGEGEBENEN Stimmen (ohne Enthaltungen)
  const validVotes = approveCount + rejectCount;
  const requiredVotes = validVotes > 0 ? Math.floor(validVotes / 2) + 1 : 1;

  const voteSummary: VoteSummary = {
    approveCount,
    rejectCount,
    abstainCount,
    totalVoters,
    votedCount,
    hasVoted: votes.some(v => v.user_id === user?.id),
    userVote: (votes.find(v => v.user_id === user?.id)?.vote as VoteType) || null,
    isApproved: approveCount >= requiredVotes && approveCount > rejectCount,
    isRejected: rejectCount >= requiredVotes && rejectCount > approveCount,
    requiredVotes
  };

  // Submit vote
  async function submitVote(vote: VoteType, reason?: string) {
    if (!supabase || !user || !decisionId) return { error: new Error('Not authenticated') };

    try {
      const { error } = await supabase
        .from('command_decision_votes')
        .upsert({
          decision_id: decisionId,
          user_id: user.id,
          vote,
          reason: reason || null
        }, {
          onConflict: 'decision_id,user_id'
        });

      if (!error) {
        fetchVotes();
      }

      return { error };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Unknown error') };
    }
  }

  // Remove vote
  async function removeVote() {
    if (!supabase || !user || !decisionId) return { error: new Error('Not authenticated') };

    try {
      const { error } = await supabase
        .from('command_decision_votes')
        .delete()
        .eq('decision_id', decisionId)
        .eq('user_id', user.id);

      if (!error) {
        fetchVotes();
      }

      return { error };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Unknown error') };
    }
  }

  // Get list of Kommandomitglieder who haven't voted yet
  function getPendingVoters(): Kommandomitglied[] {
    const votedUserIds = new Set(votes.map(v => v.user_id));
    return kommandomitglieder.filter(k => !votedUserIds.has(k.id));
  }

  // Check if all have voted
  function allHaveVoted(): boolean {
    return kommandomitglieder.length > 0 && votes.length >= kommandomitglieder.length;
  }

  return {
    votes,
    voteHistory,
    missingVotes,
    voteSummary,
    loading,
    isKommandomitglied: canVoteAsKommandomitglied,
    hasKommandomitgliedFunction,
    isKommandant,
    kommandomitglieder,
    kommandomitgliederCount: kommandomitglieder.length,
    submitVote,
    removeVote,
    getPendingVoters,
    allHaveVoted,
    refetch: fetchVotes
  };
}
