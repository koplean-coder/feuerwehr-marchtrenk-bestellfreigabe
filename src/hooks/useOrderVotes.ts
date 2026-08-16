import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type VoteType = 'approve' | 'reject' | 'abstain';

export interface OrderVote {
  id: string;
  order_id: string;
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

export interface OrderVoteHistory {
  id: string;
  order_id: string;
  user_id: string;
  old_vote: VoteType | null;
  new_vote: VoteType;
  old_reason: string | null;
  new_reason: string | null;
  changed_at: string;
  user?: {
    full_name: string;
  };
}

export interface MissingVote {
  id: string;
  order_id: string;
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

export function useOrderVotes(orderId: string | undefined) {
  const { user, profile } = useAuth();
  const [votes, setVotes] = useState<OrderVote[]>([]);
  const [voteHistory, setVoteHistory] = useState<OrderVoteHistory[]>([]);
  const [missingVotes, setMissingVotes] = useState<MissingVote[]>([]);
  const [kommandomitglieder, setKommandomitglieder] = useState<Kommandomitglied[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if current user has the Kommandomitglied function
  const hasKommandomitgliedFunction = profile?.functions?.includes('kommandomitglied') || false;
  
  // Check if current user is Kommandant or Admin
  const isKommandant = profile?.role === 'kommandant' || profile?.role === 'admin';
  
  // Kommandant/Admin can also vote like a Kommandomitglied
  const canVoteAsKommandomitglied = hasKommandomitgliedFunction || isKommandant;

  const fetchVotes = useCallback(async () => {
    if (!supabase || !orderId) return;

    setLoading(true);

    // Fetch votes for this order
    const { data: votesData } = await supabase
      .from('order_votes')
      .select('id, order_id, user_id, vote, reason, created_at')
      .eq('order_id', orderId);

    // Fetch all Kommandomitglieder with full info
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

      const votesWithProfiles: OrderVote[] = votesData.map(vote => ({
        ...vote,
        vote: vote.vote as VoteType,
        voter: profiles?.find(p => p.id === vote.user_id)
      }));

      setVotes(votesWithProfiles);
    } else {
      setVotes([]);
    }

    // Fetch vote history
    const { data: historyData } = await supabase
      .from('order_vote_history')
      .select('id, order_id, user_id, old_vote, new_vote, old_reason, new_reason, changed_at')
      .eq('order_id', orderId)
      .order('changed_at', { ascending: false });

    if (historyData && historyData.length > 0) {
      const historyUserIds = [...new Set(historyData.map(h => h.user_id))];
      const { data: historyProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', historyUserIds);

      const historyWithProfiles: OrderVoteHistory[] = historyData.map(h => ({
        ...h,
        old_vote: h.old_vote as VoteType | null,
        new_vote: h.new_vote as VoteType,
        user: historyProfiles?.find(p => p.id === h.user_id)
      }));
      setVoteHistory(historyWithProfiles);
    } else {
      setVoteHistory([]);
    }

    // Fetch missing votes (Kommandomitglieder who didn't vote)
    const { data: missingData } = await supabase
      .from('order_votes_missing')
      .select('id, order_id, user_id, recorded_at')
      .eq('order_id', orderId);

    if (missingData && missingData.length > 0) {
      const missingUserIds = missingData.map(m => m.user_id);
      const { data: missingProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', missingUserIds);

      const missingWithProfiles: MissingVote[] = missingData.map(m => ({
        ...m,
        user: missingProfiles?.find(p => p.id === m.user_id)
      }));
      setMissingVotes(missingWithProfiles);
    } else {
      setMissingVotes([]);
    }

    setLoading(false);
  }, [orderId]);

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

  async function submitVote(vote: VoteType, reason?: string) {
    if (!supabase || !user || !orderId) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('order_votes')
      .upsert({
        order_id: orderId,
        user_id: user.id,
        vote,
        reason: reason || null
      }, {
        onConflict: 'order_id,user_id'
      });

    if (!error) {
      fetchVotes();
    }

    return { error };
  }

  async function removeVote() {
    if (!supabase || !user || !orderId) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('order_votes')
      .delete()
      .eq('order_id', orderId)
      .eq('user_id', user.id);

    if (!error) {
      fetchVotes();
    }

    return { error };
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
