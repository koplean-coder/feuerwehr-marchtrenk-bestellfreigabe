import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import type { Tables, TablesInsert } from '@/integrations/supabase/helpers';

export type CommandDecisionItem = Tables<'command_decision_items'>;
export type CommandDecisionItemInsert = TablesInsert<'command_decision_items'>;

export type ItemStatus = 'pending' | 'voting' | 'approved' | 'rejected';
export type VoteType = 'approve' | 'reject' | 'abstain';

export interface ItemVote {
  id: string;
  item_id: string;
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

export interface ItemVoteSummary {
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

export interface ItemWithVotes extends CommandDecisionItem {
  votes: ItemVote[];
  voteSummary: ItemVoteSummary;
}

export interface Kommandomitglied {
  id: string;
  full_name: string;
  email: string;
}

export function useCommandDecisionItems(decisionId: string | undefined) {
  const { user } = useAuth();
  const { effectiveProfile, effectiveIsAdmin, effectiveIsKommandant, effectiveHasKommandomitgliedFunction } = useSimulation();
  const profile = effectiveProfile;
  const [items, setItems] = useState<ItemWithVotes[]>([]);
  const [kommandomitglieder, setKommandomitglieder] = useState<Kommandomitglied[]>([]);
  const [loading, setLoading] = useState(true);

  // Permission checks (mit Simulation)
  const hasKommandomitgliedFunction = effectiveHasKommandomitgliedFunction;
  const isAdmin = effectiveIsAdmin;
  const isKommandant = effectiveIsKommandant;
  const isKdtStellvertreter = profile?.functions?.some(f => {
    const lower = typeof f === 'string' ? f.toLowerCase() : '';
    return lower === 'kdt_stellvertreter' || 
           lower === 'kdt-stellvertreter' || 
           (lower.includes('kdt') && (lower.includes('stv') || lower.includes('stellvertreter')));
  }) ?? false;
  const canVote = hasKommandomitgliedFunction || isKommandant || isKdtStellvertreter || isAdmin;
  const canEndVoting = isKommandant || isKdtStellvertreter || isAdmin;

  const fetchItems = useCallback(async (silent = false) => {
    if (!supabase || !decisionId) return;

    if (!silent) setLoading(true);

    try {
      // Fetch items
      const { data: itemsData } = await supabase
        .from('command_decision_items')
        .select('*')
        .eq('decision_id', decisionId)
        .order('item_number', { ascending: true });

      // Fetch all Kommandomitglieder
      const { data: kdmData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .contains('functions', ['kommandomitglied']);

      const kdmList = (kdmData ?? []) as Kommandomitglied[];
      setKommandomitglieder(kdmList);

      if (!itemsData || itemsData.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Fetch votes for all items
      const itemIds = itemsData.map(i => i.id);
      const { data: allVotes } = await supabase
        .from('command_decision_item_votes')
        .select('id, item_id, user_id, vote, reason, created_at')
        .in('item_id', itemIds);

      // Fetch voter profiles
      const voterIds = [...new Set((allVotes ?? []).map(v => v.user_id))];
      let voterProfiles: Record<string, Kommandomitglied> = {};
      if (voterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', voterIds);
        if (profiles) {
          voterProfiles = profiles.reduce((acc, p) => {
            acc[p.id] = p as Kommandomitglied;
            return acc;
          }, {} as typeof voterProfiles);
        }
      }

      // Build items with votes
      const itemsWithVotes: ItemWithVotes[] = itemsData.map(item => {
        const itemVotes = (allVotes ?? [])
          .filter(v => v.item_id === item.id)
          .map(v => ({
            ...v,
            vote: v.vote as VoteType,
            voter: voterProfiles[v.user_id]
          }));

        const approveCount = itemVotes.filter(v => v.vote === 'approve').length;
        const rejectCount = itemVotes.filter(v => v.vote === 'reject').length;
        const abstainCount = itemVotes.filter(v => v.vote === 'abstain').length;
        const validVotes = approveCount + rejectCount;
        const requiredVotes = validVotes > 0 ? Math.floor(validVotes / 2) + 1 : 1;

        const voteSummary: ItemVoteSummary = {
          approveCount,
          rejectCount,
          abstainCount,
          totalVoters: kdmList.length,
          votedCount: itemVotes.length,
          hasVoted: itemVotes.some(v => v.user_id === user?.id),
          userVote: (itemVotes.find(v => v.user_id === user?.id)?.vote as VoteType) || null,
          isApproved: approveCount >= requiredVotes && approveCount > rejectCount,
          isRejected: rejectCount >= requiredVotes && rejectCount > approveCount,
          requiredVotes
        };

        return {
          ...item,
          votes: itemVotes,
          voteSummary
        };
      });

      setItems(itemsWithVotes);
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  }, [decisionId, user?.id]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Add item
  const addItem = async (description: string): Promise<boolean> => {
    if (!supabase || !decisionId) return false;

    try {
      const nextNumber = items.length + 1;
      const { error } = await supabase
        .from('command_decision_items')
        .insert({
          decision_id: decisionId,
          item_number: nextNumber,
          description
        });

      if (error) throw error;
      await fetchItems(true);
      return true;
    } catch (err) {
      console.error('Error adding item:', err);
      return false;
    }
  };

  // Update item
  const updateItem = async (itemId: string, description: string): Promise<boolean> => {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('command_decision_items')
        .update({ description })
        .eq('id', itemId);

      if (error) throw error;
      await fetchItems(true);
      return true;
    } catch (err) {
      console.error('Error updating item:', err);
      return false;
    }
  };

  // Delete item
  const deleteItem = async (itemId: string): Promise<boolean> => {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('command_decision_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      await fetchItems(true);
      return true;
    } catch (err) {
      console.error('Error deleting item:', err);
      return false;
    }
  };

  // Start voting for an item
  const startItemVoting = async (itemId: string): Promise<boolean> => {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('command_decision_items')
        .update({
          status: 'voting',
          voting_status: 'open',
          voting_opened_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;
      await fetchItems(true);
      return true;
    } catch (err) {
      console.error('Error starting voting:', err);
      return false;
    }
  };

  // Submit vote for an item
  const submitItemVote = async (itemId: string, vote: VoteType, reason?: string): Promise<boolean> => {
    if (!supabase || !user) return false;

    try {
      const { error } = await supabase
        .from('command_decision_item_votes')
        .upsert({
          item_id: itemId,
          user_id: user.id,
          vote,
          reason: reason || null
        }, {
          onConflict: 'item_id,user_id'
        });

      if (error) throw error;
      await fetchItems(true);
      return true;
    } catch (err) {
      console.error('Error submitting vote:', err);
      return false;
    }
  };

  // Complete voting for an item
  const completeItemVoting = async (itemId: string, result: 'approved' | 'rejected'): Promise<boolean> => {
    if (!supabase || !user || !canEndVoting) return false;

    try {
      const { error } = await supabase
        .from('command_decision_items')
        .update({
          status: result,
          voting_status: 'closed',
          voting_closed_at: new Date().toISOString(),
          voting_closed_by: user.id,
          voting_result: result
        })
        .eq('id', itemId);

      if (error) throw error;
      
      // Nach dem Abschließen eines Items: Prüfen ob ALLE Items abgeschlossen sind
      // Wenn ja, die Hauptentscheidung automatisch schließen
      await checkAndCloseDecisionIfAllItemsComplete();
      
      await fetchItems(true);
      return true;
    } catch (err) {
      console.error('Error completing voting:', err);
      return false;
    }
  };
  
  // Prüft ob alle Items abgeschlossen sind und schließt ggf. die Hauptentscheidung
  const checkAndCloseDecisionIfAllItemsComplete = async () => {
    if (!supabase || !decisionId || !user) return;
    
    try {
      // Alle Items dieser Entscheidung laden
      const { data: allItems } = await supabase
        .from('command_decision_items')
        .select('id, status, voting_status')
        .eq('decision_id', decisionId);
      
      if (!allItems || allItems.length === 0) return;
      
      // Prüfen ob ALLE Items abgeschlossen sind (voting_status === 'closed')
      const allClosed = allItems.every(item => item.voting_status === 'closed');
      
      if (allClosed) {
        // Gesamtergebnis berechnen: Genehmigt wenn mehr approved als rejected
        const approvedCount = allItems.filter(item => item.status === 'approved').length;
        const rejectedCount = allItems.filter(item => item.status === 'rejected').length;
        const overallResult = approvedCount >= rejectedCount ? 'approved' : 'rejected';
        
        // Hauptentscheidung automatisch schließen
        await supabase
          .from('command_decisions')
          .update({
            status: overallResult,
            voting_status: 'closed',
            voting_closed_at: new Date().toISOString(),
            voting_closed_by: user.id,
            voting_result: overallResult
          })
          .eq('id', decisionId);
        
        console.log(`Kommandoabstimmung ${decisionId} automatisch geschlossen: ${overallResult}`);
      }
    } catch (err) {
      console.error('Error checking/closing decision:', err);
    }
  };

  // Override voting for an item
  const overrideItemVoting = async (
    itemId: string,
    result: 'approved' | 'rejected',
    reason: string
  ): Promise<boolean> => {
    if (!supabase || !user || !canEndVoting) return false;

    try {
      const { error } = await supabase
        .from('command_decision_items')
        .update({
          status: result,
          voting_status: 'closed',
          voting_closed_at: new Date().toISOString(),
          voting_closed_by: user.id,
          voting_result: 'overridden',
          voting_override_by: user.id,
          voting_override_reason: reason,
          voting_override_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;
      
      // Nach dem Überstimmen eines Items: Prüfen ob ALLE Items abgeschlossen sind
      await checkAndCloseDecisionIfAllItemsComplete();
      
      await fetchItems();
      return true;
    } catch (err) {
      console.error('Error overriding voting:', err);
      return false;
    }
  };

  // Get pending voters for an item
  const getPendingVoters = (itemId: string): Kommandomitglied[] => {
    const item = items.find(i => i.id === itemId);
    if (!item) return [];
    const votedUserIds = new Set(item.votes.map(v => v.user_id));
    return kommandomitglieder.filter(k => !votedUserIds.has(k.id));
  };

  // Record missing votes for an item
  const recordMissingVotes = async (itemId: string, userIds: string[]): Promise<boolean> => {
    if (!supabase || !canEndVoting || userIds.length === 0) return false;

    try {
      const records = userIds.map(userId => ({
        item_id: itemId,
        user_id: userId
      }));

      const { error } = await supabase
        .from('command_decision_item_votes_missing')
        .insert(records);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error recording missing votes:', err);
      return false;
    }
  };

  return {
    items,
    loading,
    kommandomitglieder,
    canVote,
    canEndVoting,
    addItem,
    updateItem,
    deleteItem,
    startItemVoting,
    submitItemVote,
    completeItemVoting,
    overrideItemVoting,
    getPendingVoters,
    recordMissingVotes,
    refetch: fetchItems
  };
}
