import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/helpers';

export type CommandDecision = Tables<'command_decisions'>;
export type CommandDecisionInsert = TablesInsert<'command_decisions'>;
export type CommandDecisionUpdate = TablesUpdate<'command_decisions'>;

export type CommandDecisionStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type VotingResult = 'approved' | 'rejected' | 'overridden';

export interface CommandDecisionWithCreator extends CommandDecision {
  creator?: {
    id: string;
    full_name: string;
    email: string;
  };
  // True if decision has items that are not yet confirmed in a meeting
  hasUnconfirmedItems?: boolean;
  // True if all items have been confirmed in a meeting
  isFullyConfirmed?: boolean;
  // Number of voting items in this decision
  itemCount?: number;
}

export function useCommandDecisions() {
  const { user } = useAuth();
  const { effectiveProfile, effectiveIsAdmin, effectiveIsKommandant, effectiveHasKommandomitgliedFunction } = useSimulation();
  const profile = effectiveProfile;
  const [decisions, setDecisions] = useState<CommandDecisionWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Permission checks (mit Simulation)
  const isKommandomitglied = effectiveHasKommandomitgliedFunction;
  const isKommandant = effectiveIsKommandant;
  const isKdtStellvertreter = profile?.functions?.some(f => {
    const lower = typeof f === 'string' ? f.toLowerCase() : '';
    return lower === 'kdt_stellvertreter' || 
           lower === 'kdt-stellvertreter' || 
           (lower.includes('kdt') && (lower.includes('stv') || lower.includes('stellvertreter')));
  }) ?? false;
  const isAdmin = effectiveIsAdmin;
  const canCreate = isKommandomitglied || isKommandant || isKdtStellvertreter || isAdmin;
  const canEndVoting = isKommandant || isKdtStellvertreter || isAdmin;

  const fetchDecisions = useCallback(async (silent = false) => {
    if (!supabase) return;

    if (!silent) setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('command_decisions')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Fetch creator profiles
      const creatorIds = [...new Set((data ?? []).map(d => d.created_by))];
      let creatorsMap: Record<string, { id: string; full_name: string; email: string }> = {};
      
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', creatorIds);
        
        if (profiles) {
          creatorsMap = profiles.reduce((acc, p) => {
            acc[p.id] = { id: p.id, full_name: p.full_name ?? '', email: p.email ?? '' };
            return acc;
          }, {} as typeof creatorsMap);
        }
      }

      // Fetch items for all decisions to check confirmation status
      const decisionIds = (data ?? []).map(d => d.id);
      let itemsMap: Record<string, { total: number; confirmed: number }> = {};
      
      if (decisionIds.length > 0) {
        const { data: allItems } = await supabase
          .from('command_decision_items')
          .select('id, decision_id, status, meeting_confirmed_at')
          .in('decision_id', decisionIds);
        
        if (allItems) {
          // Group items by decision_id and count confirmed vs total
          itemsMap = allItems.reduce((acc, item) => {
            if (!acc[item.decision_id]) {
              acc[item.decision_id] = { total: 0, confirmed: 0 };
            }
            acc[item.decision_id].total++;
            // Item is considered for confirmation only if it has a final status
            if ((item.status === 'approved' || item.status === 'rejected') && item.meeting_confirmed_at) {
              acc[item.decision_id].confirmed++;
            }
            return acc;
          }, {} as typeof itemsMap);
        }
      }

      const decisionsWithCreators: CommandDecisionWithCreator[] = (data ?? []).map(d => {
        const itemInfo = itemsMap[d.id] || { total: 0, confirmed: 0 };
        const hasItemsNeedingConfirmation = itemInfo.total > 0 && itemInfo.confirmed < itemInfo.total;
        const isFullyConfirmed = itemInfo.total > 0 && itemInfo.confirmed === itemInfo.total;
        
        return {
          ...d,
          creator: creatorsMap[d.created_by],
          hasUnconfirmedItems: hasItemsNeedingConfirmation,
          isFullyConfirmed: isFullyConfirmed,
          itemCount: itemInfo.total
        };
      });

      setDecisions(decisionsWithCreators);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  // Generate reference number
  const generateReferenceNumber = async (): Promise<string> => {
    if (!supabase) return `KA-${Date.now()}`;

    const year = new Date().getFullYear();
    const prefix = `KA-${year}-`;

    const { data } = await supabase
      .from('command_decisions')
      .select('reference_number')
      .like('reference_number', `${prefix}%`)
      .order('reference_number', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].reference_number.split('-')[2], 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  };

  // Create decision
  const createDecision = async (data: { title: string; description?: string }): Promise<CommandDecision | null> => {
    if (!supabase || !user || !canCreate) return null;

    try {
      const referenceNumber = await generateReferenceNumber();

      const { data: newDecision, error: insertError } = await supabase
        .from('command_decisions')
        .insert({
          title: data.title,
          description: data.description ?? null,
          reference_number: referenceNumber,
          created_by: user.id,
          status: 'draft'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchDecisions(true);
      return newDecision;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen');
      return null;
    }
  };

  // Update decision
  const updateDecision = async (id: string, updates: CommandDecisionUpdate): Promise<boolean> => {
    if (!supabase) return false;

    try {
      const { error: updateError } = await supabase
        .from('command_decisions')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchDecisions(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren');
      return false;
    }
  };

  // Delete decision (only drafts)
  const deleteDecision = async (id: string): Promise<boolean> => {
    if (!supabase) return false;

    try {
      const { error: deleteError } = await supabase
        .from('command_decisions')
        .delete()
        .eq('id', id)
        .eq('status', 'draft');

      if (deleteError) throw deleteError;

      await fetchDecisions(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
      return false;
    }
  };

  // Force delete decision (admin only - any status)
  const forceDeleteDecision = async (id: string): Promise<boolean> => {
    if (!supabase || !isAdmin) {
      console.error('forceDeleteDecision: Not authorized or no supabase', { isAdmin, hasSupabase: !!supabase });
      return false;
    }

    try {
      console.log('forceDeleteDecision: Starting deletion for decision', id);

      // First get all item IDs for this decision
      const { data: items, error: itemsQueryError } = await supabase
        .from('command_decision_items')
        .select('id')
        .eq('decision_id', id);

      if (itemsQueryError) {
        console.error('forceDeleteDecision: Error fetching items', itemsQueryError);
      }

      console.log('forceDeleteDecision: Found items', items?.length || 0);

      // Delete item votes using item IDs (not decision_id!)
      if (items && items.length > 0) {
        const itemIds = items.map(item => item.id);
        console.log('forceDeleteDecision: Deleting item votes for item IDs', itemIds);
        
        const { error: itemVotesError, count: votesDeleted } = await supabase
          .from('command_decision_item_votes')
          .delete()
          .in('item_id', itemIds)
          .select();
        
        console.log('forceDeleteDecision: Item votes deleted count:', votesDeleted);
        if (itemVotesError) {
          console.error('forceDeleteDecision: Error deleting item votes', itemVotesError);
        }
      }

      // Delete the items themselves
      console.log('forceDeleteDecision: Deleting items');
      const { error: itemsDeleteError, count: itemsDeleted } = await supabase
        .from('command_decision_items')
        .delete()
        .eq('decision_id', id)
        .select();

      console.log('forceDeleteDecision: Items deleted count:', itemsDeleted);
      if (itemsDeleteError) {
        console.error('forceDeleteDecision: Error deleting items', itemsDeleteError);
        throw itemsDeleteError;
      }

      // Delete legacy decision votes (for decisions without items)
      console.log('forceDeleteDecision: Deleting decision votes');
      const { error: votesError } = await supabase
        .from('command_decision_votes')
        .delete()
        .eq('decision_id', id);

      if (votesError) {
        console.error('forceDeleteDecision: Error deleting votes', votesError);
      }

      // Finally delete the decision itself
      console.log('forceDeleteDecision: Deleting decision');
      const { error: deleteError, data: deletedData } = await supabase
        .from('command_decisions')
        .delete()
        .eq('id', id)
        .select();

      console.log('forceDeleteDecision: Decision delete result:', { deletedData, deleteError });

      if (deleteError) {
        console.error('forceDeleteDecision: Error deleting decision', deleteError);
        throw deleteError;
      }

      // Check if anything was actually deleted
      if (!deletedData || deletedData.length === 0) {
        console.error('forceDeleteDecision: No rows deleted - possibly RLS blocking');
        setError('Löschen fehlgeschlagen - möglicherweise keine Berechtigung in der Datenbank');
        return false;
      }

      console.log('forceDeleteDecision: Successfully deleted decision');
      await fetchDecisions();
      return true;
    } catch (err) {
      console.error('forceDeleteDecision: Error:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
      return false;
    }
  };

  // Submit decision (opens voting)
  const submitDecision = async (id: string): Promise<boolean> => {
    if (!supabase || !user) return false;

    try {
      const { error: updateError } = await supabase
        .from('command_decisions')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          voting_status: 'open',
          voting_opened_at: new Date().toISOString(),
          email_status: 'none'
        })
        .eq('id', id)
        .eq('status', 'draft');

      if (updateError) throw updateError;

      // Get the decision details for email
      const { data: decision } = await supabase
        .from('command_decisions')
        .select('*')
        .eq('id', id)
        .single();

      // Send email notification to all Kommandomitglieder
      if (decision) {
        const { data: kommandomitglieder } = await supabase
          .from('profiles')
          .select('email')
          .contains('functions', ['kommandomitglied']);

        if (kommandomitglieder && kommandomitglieder.length > 0) {
          const emails = kommandomitglieder.map(k => k.email).filter(Boolean);
          
          try {
            await supabase.functions.invoke('send-notification', {
              body: {
                type: 'new_command_decision',
                recipientEmails: emails,
                decisionTitle: decision.title,
                decisionDescription: decision.description || '',
                referenceNumber: decision.reference_number,
                creatorName: profile?.full_name ?? 'Unbekannt',
                recipientName: 'Kommandomitglied'
              }
            });
          } catch (emailErr) {
            console.error('Failed to send notification:', emailErr);
          }
        }
      }

      await fetchDecisions();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Einreichen');
      return false;
    }
  };

  // Complete voting (end and set result)
  const completeVoting = async (
    id: string,
    result: 'approved' | 'rejected',
    votingResultsHtml?: string
  ): Promise<boolean> => {
    if (!supabase || !user || !canEndVoting) return false;

    try {
      const { error: updateError } = await supabase
        .from('command_decisions')
        .update({
          status: result,
          voting_status: 'closed',
          voting_closed_at: new Date().toISOString(),
          voting_closed_by: user.id,
          voting_result: result
        })
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchDecisions();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Beenden');
      return false;
    }
  };

  // Override voting (Kommandant decision)
  const overrideVoting = async (
    id: string,
    result: 'approved' | 'rejected',
    reason: string,
    votingResultsHtml?: string
  ): Promise<boolean> => {
    if (!supabase || !user || !canEndVoting) return false;

    try {
      const { error: updateError } = await supabase
        .from('command_decisions')
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
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchDecisions();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Überstimmen');
      return false;
    }
  };

  // Record missing votes
  const recordMissingVotes = async (decisionId: string, userIds: string[]): Promise<boolean> => {
    if (!supabase || userIds.length === 0) return true;

    try {
      const inserts = userIds.map(userId => ({
        decision_id: decisionId,
        user_id: userId
      }));

      const { error: insertError } = await supabase
        .from('command_decision_votes_missing')
        .upsert(inserts, { onConflict: 'decision_id,user_id' });

      if (insertError) throw insertError;
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erfassen');
      return false;
    }
  };

  // Filter helpers
  const getOpenDecisions = () => decisions.filter(d => 
    d.voting_status === 'open' && d.status === 'submitted'
  );

  const getApprovedDecisions = () => decisions.filter(d => d.status === 'approved');
  const getRejectedDecisions = () => decisions.filter(d => d.status === 'rejected');
  const getDraftDecisions = () => decisions.filter(d => d.status === 'draft');

  return {
    decisions,
    loading,
    error,
    canCreate,
    canEndVoting,
    isKommandomitglied,
    isKommandant,
    isAdmin,
    refetch: fetchDecisions,
    createDecision,
    updateDecision,
    deleteDecision,
    forceDeleteDecision,
    submitDecision,
    completeVoting,
    overrideVoting,
    recordMissingVotes,
    getOpenDecisions,
    getApprovedDecisions,
    getRejectedDecisions,
    getDraftDecisions
  };
}
