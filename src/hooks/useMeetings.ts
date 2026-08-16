import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

export type MeetingType = Database['public']['Enums']['meeting_type'];
export type MeetingStatus = Database['public']['Enums']['meeting_status'];
export type AttendanceStatus = Database['public']['Enums']['attendance_status'];
export type AgendaItemStatus = Database['public']['Enums']['agenda_item_status'];

export interface Meeting {
  id: string;
  meeting_type: MeetingType;
  meeting_number: string;
  title: string | null;
  scheduled_date: string;
  scheduled_time: string;
  location: string;
  status: MeetingStatus;
  entry_deadline_hours: number;
  is_quorate: boolean | null;
  voting_members_present: number | null;
  kdt_present: boolean | null;
  next_meeting_date: string | null;
  next_meeting_time: string | null;
  next_meeting_location: string | null;
  protocol_generated_at: string | null;
  protocol_sent_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface MeetingAttendance {
  id: string;
  meeting_id: string;
  profile_id: string;
  status: AttendanceStatus;
  is_voting_member: boolean;
  function_name: string | null;
  substitute_for: string | null;
  notes: string | null;
  updated_at: string;
  profile?: {
    id: string;
    full_name: string;
    email: string;
    functions: string[];
    role: string;
  };
}

export interface MeetingAgendaItem {
  id: string;
  meeting_id: string;
  title: string;
  description: string | null;
  category: string | null;
  submitted_by: string;
  submitted_by_name: string | null;
  status: AgendaItemStatus;
  priority: string | null;
  is_mandatory: boolean;
  is_fixed_item: boolean;
  sort_order: number;
  deferred_to_meeting_id: string | null;
  deferred_reason: string | null;
  deferred_from_meeting_id: string | null;
  discussion_notes: string | null;
  decision_required: boolean | null;
  traffic_light: 'rot' | 'gelb' | 'gruen' | null;
  requires_decision: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface FixedAgendaItem {
  id: string;
  sort_order: number;
  title: string;
  is_mandatory: boolean;
  meeting_type: MeetingType | null;
}

export interface MeetingDecision {
  id: string;
  meeting_id: string;
  order_id: string | null;
  command_decision_item_id: string | null;
  decision_number: string | null;
  decision_text: string;
  source: string | null;
  votes_for: number;
  votes_against: number;
  votes_abstain: number;
  result: string | null;
  recused_members: string[] | null;
  decided_at: string;
  created_at: string;
  is_in_register: boolean | null;
  register_added_at: string | null;
}

export interface DecisionVote {
  id: string;
  decision_id: string;
  profile_id: string;
  vote: 'dafuer' | 'dagegen' | 'enthaltung';
  voted_at: string;
  profile?: {
    id: string;
    full_name: string;
  };
}

// Pending orders from BANF that need meeting confirmation
export interface PendingBanfDecision {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  status: string;
  bedarfstraeger: string | null;
  voting_status: string | null;
  voting_result: string | null;
  requires_kommandomitglied_approval: boolean;
  kommandomitglied_approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  votes_for: number;
  votes_against: number;
  votes_abstain: number;
}

// Pending command decision items that need meeting confirmation
export interface PendingCommandDecisionItem {
  id: string;
  decision_id: string;
  decision_title: string;
  decision_reference: string;
  item_number: number;
  description: string;
  status: string;
  voting_result: string | null;
  voting_closed_at: string | null;
  created_at: string;
}

export interface CreateMeetingData {
  meeting_type: MeetingType;
  meeting_number: string;
  title?: string;
  scheduled_date: string;
  scheduled_time?: string;
  location?: string;
  entry_deadline_hours?: number;
}

// Track meetings user is invited to (via meeting_attendance)
interface InvitedMeetingInfo {
  meetingId: string;
  meetingType: MeetingType;
}

export function useMeetings() {
  const { user, profile } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [invitedMeetings, setInvitedMeetings] = useState<InvitedMeetingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManage = profile?.role === 'admin' || 
                   profile?.role === 'kommandant' || 
                   profile?.functions?.some(f => {
                     const lower = typeof f === 'string' ? f.toLowerCase() : '';
                     return lower === 'kdt_stellvertreter' || 
                            lower === 'kdt-stellvertreter' || 
                            (lower.includes('kdt') && (lower.includes('stv') || lower.includes('stellvertreter')));
                   });

  // Check if user has general role-based access to a meeting type
  const hasRoleAccess = (meetingType: MeetingType) => {
    if (profile?.role === 'admin' || profile?.role === 'kommandant') return true;
    if (profile?.functions?.includes('kommandomitglied')) return true;
    if (meetingType === 'erweitertes_kommando' && profile?.functions?.includes('erweitertes_kommando')) return true;
    return false;
  };

  // Check if user is invited to at least one meeting of this type
  const hasInvitationAccess = (meetingType: MeetingType) => {
    return invitedMeetings.some(inv => inv.meetingType === meetingType);
  };

  // Check if user can access a specific meeting (by ID)
  const isInvitedToMeeting = (meetingId: string) => {
    return invitedMeetings.some(inv => inv.meetingId === meetingId);
  };

  // Combined access check: role-based OR invitation-based
  const canAccess = (meetingType: MeetingType) => {
    return hasRoleAccess(meetingType) || hasInvitationAccess(meetingType);
  };

  // Check access to a specific meeting
  const canAccessMeeting = (meetingId: string, meetingType: MeetingType) => {
    return hasRoleAccess(meetingType) || isInvitedToMeeting(meetingId);
  };

  const fetchMeetings = useCallback(async () => {
    if (!supabase || !user) return;

    try {
      setLoading(true);
      
      // First fetch attendance records to know which meetings user is invited to
      // This query is allowed by the "Users can view their own attendance" policy
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('meeting_attendance')
        .select('meeting_id')
        .eq('profile_id', user.id);

      if (attendanceError) {
        // Silently handle - user might just not have any invitations
      }

      const invitedMeetingIds = attendanceData?.map(a => a.meeting_id) ?? [];
      
      // Fetch all meetings (RLS will filter based on role + attendance)
      const { data, error: fetchError } = await supabase
        .from('meetings')
        .select('*')
        .order('scheduled_date', { ascending: false });

      if (fetchError) throw fetchError;
      
      const allMeetings = (data as Meeting[]) ?? [];
      setMeetings(allMeetings);

      // Build invited meetings info from the meetings we fetched
      // and the attendance records we have
      const invited: InvitedMeetingInfo[] = invitedMeetingIds
        .map(meetingId => {
          const meeting = allMeetings.find(m => m.id === meetingId);
          if (meeting) {
            return {
              meetingId: meeting.id,
              meetingType: meeting.meeting_type
            };
          }
          return null;
        })
        .filter((inv): inv is InvitedMeetingInfo => inv !== null);
      
      setInvitedMeetings(invited);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createMeeting = async (data: CreateMeetingData) => {
    if (!supabase || !user || !canManage) {
      return { error: new Error('Keine Berechtigung') };
    }

    try {
      const { data: newMeeting, error: insertError } = await supabase
        .from('meetings')
        .insert({
          ...data,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchMeetings();
      return { data: newMeeting as Meeting, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  };

  const updateMeeting = async (id: string, updates: Partial<Meeting>) => {
    if (!supabase || !canManage) {
      return { error: new Error('Keine Berechtigung') };
    }

    try {
      const { error: updateError } = await supabase
        .from('meetings')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchMeetings();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const deleteMeeting = async (id: string) => {
    if (!supabase || !canManage) {
      return { error: new Error('Keine Berechtigung') };
    }

    try {
      const { error: deleteError } = await supabase
        .from('meetings')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchMeetings();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Generate meeting number (e.g., K-2026-01, EK-2026-03)
  const generateMeetingNumber = async (type: MeetingType): Promise<string> => {
    if (!supabase) return '';

    const prefix = type === 'kommandositzung' ? 'K' : 'EK';
    const year = new Date().getFullYear();

    const { data } = await supabase
      .from('meetings')
      .select('meeting_number')
      .eq('meeting_type', type)
      .ilike('meeting_number', `${prefix}-${year}-%`)
      .order('meeting_number', { ascending: false })
      .limit(1);

    let nextNum = 1;
    if (data && data.length > 0) {
      const lastNum = data[0].meeting_number.split('-').pop();
      nextNum = parseInt(lastNum || '0', 10) + 1;
    }

    return `${prefix}-${year}-${String(nextNum).padStart(2, '0')}`;
  };

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // Filter meetings to show only those user can access
  const accessibleMeetings = meetings.filter(m => 
    hasRoleAccess(m.meeting_type) || isInvitedToMeeting(m.id)
  );

  return {
    meetings: accessibleMeetings,
    allMeetings: meetings, // For admin purposes
    invitedMeetings,
    loading,
    error,
    canManage,
    canAccess,
    canAccessMeeting,
    isInvitedToMeeting,
    hasRoleAccess,
    fetchMeetings,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    generateMeetingNumber,
  };
}

export function useMeetingDetail(meetingId: string | undefined) {
  const { user, profile } = useAuth();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [attendance, setAttendance] = useState<MeetingAttendance[]>([]);
  const [agendaItems, setAgendaItems] = useState<MeetingAgendaItem[]>([]);
  const [fixedAgendaItems, setFixedAgendaItems] = useState<FixedAgendaItem[]>([]);
  const [decisions, setDecisions] = useState<MeetingDecision[]>([]);
  const [decisionVotes, setDecisionVotes] = useState<DecisionVote[]>([]);
  const [pendingBanfDecisions, setPendingBanfDecisions] = useState<PendingBanfDecision[]>([]);
  const [pendingCommandDecisionItems, setPendingCommandDecisionItems] = useState<PendingCommandDecisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManage = profile?.role === 'admin' || 
                   profile?.role === 'kommandant' || 
                   profile?.functions?.some(f => {
                     const lower = typeof f === 'string' ? f.toLowerCase() : '';
                     return lower === 'kdt_stellvertreter' || 
                            lower === 'kdt-stellvertreter' || 
                            (lower.includes('kdt') && (lower.includes('stv') || lower.includes('stellvertreter')));
                   });

  const isDeadlinePassed = useCallback(() => {
    if (!meeting) return true;
    const meetingDateTime = new Date(`${meeting.scheduled_date}T${meeting.scheduled_time}`);
    const deadline = new Date(meetingDateTime.getTime() - (meeting.entry_deadline_hours * 60 * 60 * 1000));
    return new Date() >= deadline;
  }, [meeting]);

  const canEditAgendaItems = canManage || !isDeadlinePassed();

  const fetchMeetingDetail = useCallback(async () => {
    if (!supabase || !meetingId) return;

    try {
      setLoading(true);

      // Fetch meeting
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (meetingError) throw meetingError;
      setMeeting(meetingData as Meeting);

      // Fetch attendance with profiles
      const { data: attendanceData } = await supabase
        .from('meeting_attendance')
        .select(`
          *,
          profile:profile_id(id, full_name, email, functions, role)
        `)
        .eq('meeting_id', meetingId)
        .order('function_name');

      setAttendance((attendanceData as MeetingAttendance[]) ?? []);

      // Fetch agenda items
      const { data: agendaData } = await supabase
        .from('meeting_agenda_items')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('sort_order');

      setAgendaItems((agendaData as MeetingAgendaItem[]) ?? []);

      // Fetch fixed agenda items
      const { data: fixedData } = await supabase
        .from('meeting_fixed_agenda_items')
        .select('*')
        .order('sort_order');

      setFixedAgendaItems((fixedData as FixedAgendaItem[]) ?? []);

      // Fetch decisions
      const { data: decisionsData } = await supabase
        .from('meeting_decisions')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('decided_at');

      setDecisions((decisionsData as MeetingDecision[]) ?? []);

      // Fetch decision votes for all decisions in this meeting
      if (decisionsData && decisionsData.length > 0) {
        const decisionIds = decisionsData.map(d => d.id);
        const { data: votesData } = await supabase
          .from('meeting_decision_votes')
          .select(`
            *,
            profile:profiles!meeting_decision_votes_profile_id_fkey(id, full_name)
          `)
          .in('decision_id', decisionIds);

        setDecisionVotes((votesData as DecisionVote[]) ?? []);
      } else {
        setDecisionVotes([]);
      }

      // Fetch pending BANF orders that need meeting confirmation
      // These are orders with kommandomitglied approval that haven't been confirmed in a meeting yet
      let pendingOrdersData: Array<{
        id: string;
        title: string;
        description: string | null;
        amount: number;
        status: string;
        bedarfstraeger: string | null;
        voting_status: string | null;
        voting_result: string | null;
        requires_kommandomitglied_approval: boolean;
        kommandomitglied_approved_at: string | null;
        created_at: string;
        rejected_at: string | null;
      }> = [];
      
      try {
        // Query all orders and filter in JS (avoids RLS/column issues)
        const { data, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (!ordersError && data) {
          // Filter to only orders requiring kommandomitglied approval
          pendingOrdersData = data
            .filter((o: { requires_kommandomitglied_approval?: boolean }) => o.requires_kommandomitglied_approval === true)
            .map((o: {
              id: string;
              title: string;
              description: string | null;
              amount: number;
              status: string;
              bedarfstraeger: string | null;
              voting_status: string | null;
              voting_result: string | null;
              requires_kommandomitglied_approval: boolean;
              kommandomitglied_approved_at: string | null;
              created_at: string;
              rejected_at: string | null;
            }) => ({
              id: o.id,
              title: o.title,
              description: o.description,
              amount: o.amount,
              status: o.status,
              bedarfstraeger: o.bedarfstraeger,
              voting_status: o.voting_status,
              voting_result: o.voting_result,
              requires_kommandomitglied_approval: o.requires_kommandomitglied_approval,
              kommandomitglied_approved_at: o.kommandomitglied_approved_at,
              created_at: o.created_at,
              rejected_at: o.rejected_at,
            }));
        }
      } catch {
        // Silently handle orders fetch error - may be RLS restriction
        console.log('Could not fetch pending BANF orders');
      }

      // Fetch all order votes for pending orders
      const orderIds = (pendingOrdersData ?? []).map(o => o.id);
      const { data: allOrderVotes } = orderIds.length > 0 ? await supabase
        .from('order_votes')
        .select('order_id, vote')
        .in('order_id', orderIds) : { data: [] };

      // Filter out orders that have already been confirmed in ANY meeting
      const { data: confirmedOrderIds } = await supabase
        .from('meeting_decisions')
        .select('order_id')
        .not('order_id', 'is', null);

      const confirmedIds = new Set((confirmedOrderIds ?? []).map(d => d.order_id));
      
      // Filter: only orders that have been decided (approved/rejected) but not yet confirmed in a meeting
      const pendingDecisions = (pendingOrdersData ?? [])
        .filter(order => !confirmedIds.has(order.id))
        .filter(order => 
          // Has a voting result
          order.voting_result !== null || 
          // Has been approved by Kommandomitglied
          order.kommandomitglied_approved_at !== null || 
          // Has been rejected
          order.rejected_at !== null ||
          // Status indicates it was processed (freigegeben, abgelehnt, etc.)
          order.status === 'freigegeben_kommandant' ||
          order.status === 'freigegeben' ||
          order.status === 'genehmigt' ||
          order.status === 'abgelehnt' ||
          order.status === 'rejected' ||
          // Voting status indicates completion
          order.voting_status === 'completed' ||
          order.voting_status === 'abgeschlossen'
        )
        .map(order => {
          const votes = (allOrderVotes ?? []).filter(v => v.order_id === order.id);
          const votesFor = votes.filter(v => v.vote === 'approve').length;
          const votesAgainst = votes.filter(v => v.vote === 'reject').length;
          const votesAbstain = votes.filter(v => v.vote === 'abstain').length;
          return {
            id: order.id,
            title: order.title,
            description: order.description,
            amount: order.amount,
            status: order.status,
            bedarfstraeger: order.bedarfstraeger,
            voting_status: order.voting_status,
            voting_result: order.voting_result,
            requires_kommandomitglied_approval: order.requires_kommandomitglied_approval,
            kommandomitglied_approved_at: order.kommandomitglied_approved_at,
            rejected_at: order.rejected_at,
            created_at: order.created_at,
            votes_for: votesFor,
            votes_against: votesAgainst,
            votes_abstain: votesAbstain,
          };
        });

      setPendingBanfDecisions(pendingDecisions);

      // Fetch pending command decision items that need meeting confirmation
      // Items that are approved/rejected but not yet confirmed in a meeting
      const { data: pendingCommandItems } = await supabase
        .from('command_decision_items')
        .select(`
          id,
          decision_id,
          item_number,
          description,
          status,
          voting_result,
          voting_closed_at,
          meeting_confirmed_at,
          created_at,
          command_decisions!inner (
            id,
            title,
            reference_number,
            status
          )
        `)
        .in('status', ['approved', 'rejected'])
        .is('meeting_confirmed_at', null)
        .not('voting_closed_at', 'is', null)
        .order('voting_closed_at', { ascending: true });

      const formattedCommandItems: PendingCommandDecisionItem[] = (pendingCommandItems ?? []).map((item) => ({
        id: item.id,
        decision_id: item.decision_id,
        decision_title: item.command_decisions?.title || 'Unbekannt',
        decision_reference: item.command_decisions?.reference_number || '',
        item_number: item.item_number,
        description: item.description,
        status: item.status,
        voting_result: item.voting_result,
        voting_closed_at: item.voting_closed_at,
        created_at: item.created_at,
      }));

      setPendingCommandDecisionItems(formattedCommandItems);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  // Attendance management - with optimistic update to prevent page reload
  const updateAttendance = async (profileId: string, status: AttendanceStatus, profileData?: { functions?: string[]; role?: string; forceVotingMember?: boolean }) => {
    if (!supabase || !meetingId || !canManage) {
      return { error: new Error('Keine Berechtigung') };
    }

    // Determine if this profile is a voting member
    const isKommandomitglied = profileData?.functions?.some(f => 
      f.toLowerCase() === 'kommandomitglied'
    );
    
    const isVotingMember = profileData?.forceVotingMember === true ||
                          isKommandomitglied || false;
    
    // Determine function name for display
    let functionName: string | null = null;
    if (profileData?.role === 'kommandant') {
      functionName = 'Kommandant';
    } else if (profileData?.functions?.includes('kdt_stellvertreter')) {
      functionName = 'Kdt-Stellvertreter';
    } else if (profileData?.functions?.includes('kassier')) {
      functionName = 'Kassier';
    } else if (profileData?.functions?.includes('schriftfuehrer')) {
      functionName = 'Schriftführer';
    } else if (profileData?.functions?.includes('zeugwart')) {
      functionName = 'Zeugwart';
    } else if (profileData?.functions?.includes('zugskommandant')) {
      functionName = 'Zugskommandant';
    } else if (profileData?.functions?.includes('jugendbetreuer')) {
      functionName = 'Jugendbetreuer';
    } else if (profileData?.functions?.includes('kommandomitglied')) {
      functionName = 'Kommandomitglied';
    } else if (profileData?.functions?.includes('erweitertes_kommando')) {
      functionName = 'Erweitertes Kommando (beratend)';
    }

    // Optimistic update: update local state immediately
    const previousAttendance = [...attendance];
    const existingIndex = attendance.findIndex(a => a.profile_id === profileId);
    
    if (existingIndex >= 0) {
      // Update existing entry
      const updatedAttendance = [...attendance];
      updatedAttendance[existingIndex] = {
        ...updatedAttendance[existingIndex],
        status,
        is_voting_member: profileData?.forceVotingMember ?? updatedAttendance[existingIndex].is_voting_member,
        function_name: functionName ?? updatedAttendance[existingIndex].function_name,
      };
      setAttendance(updatedAttendance);
    } else {
      // Add new entry (optimistic)
      const newEntry: MeetingAttendance = {
        id: `temp-${Date.now()}`,
        meeting_id: meetingId,
        profile_id: profileId,
        status,
        is_voting_member: isVotingMember,
        function_name: functionName,
        created_at: new Date().toISOString(),
        profile: null,
      };
      setAttendance([...attendance, newEntry]);
    }

    try {
      const { error: upsertError } = await supabase
        .from('meeting_attendance')
        .upsert({
          meeting_id: meetingId,
          profile_id: profileId,
          status,
          is_voting_member: isVotingMember,
          function_name: functionName,
        }, { onConflict: 'meeting_id,profile_id' });

      if (upsertError) throw upsertError;

      // Fetch only attendance data (not full page reload)
      const { data: attendanceData } = await supabase
        .from('meeting_attendance')
        .select(`
          *,
          profile:profile_id(id, full_name, email, functions, role)
        `)
        .eq('meeting_id', meetingId)
        .order('function_name');

      setAttendance((attendanceData as MeetingAttendance[]) ?? []);
      return { error: null };
    } catch (err) {
      // Rollback on error
      setAttendance(previousAttendance);
      return { error: err as Error };
    }
  };

  // Remove attendance (for manually added members) - with optimistic update
  const removeAttendance = async (profileId: string) => {
    if (!supabase || !meetingId || !canManage) {
      return { error: new Error('Keine Berechtigung') };
    }

    // Optimistic update: remove from local state immediately
    const previousAttendance = [...attendance];
    setAttendance(attendance.filter(a => a.profile_id !== profileId));

    try {
      const { error: deleteError } = await supabase
        .from('meeting_attendance')
        .delete()
        .eq('meeting_id', meetingId)
        .eq('profile_id', profileId);

      if (deleteError) throw deleteError;

      return { error: null };
    } catch (err) {
      // Rollback on error
      setAttendance(previousAttendance);
      return { error: err as Error };
    }
  };

  // Agenda item management - with optimistic update to prevent scroll reset
  const addAgendaItem = async (data: Omit<MeetingAgendaItem, 'id' | 'meeting_id' | 'created_at' | 'updated_at' | 'submitted_by'>) => {
    if (!supabase || !meetingId || !user || !canEditAgendaItems) {
      return { error: new Error('Keine Berechtigung oder Deadline überschritten') };
    }

    // Create optimistic item
    const tempId = `temp-${Date.now()}`;
    const optimisticItem: MeetingAgendaItem = {
      id: tempId,
      meeting_id: meetingId,
      title: data.title,
      description: data.description || null,
      category: data.category || null,
      status: 'offen' as AgendaItemStatus,
      traffic_light: data.traffic_light || 'gelb',
      sort_order: data.sort_order || agendaItems.length + 100,
      submitted_by: user.id,
      submitted_by_name: profile?.full_name || null,
      is_mandatory: false,
      is_fixed_item: false,
      deferred_to_meeting_id: null,
      deferred_from_meeting_id: null,
      deferred_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add optimistically
    const previousItems = [...agendaItems];
    setAgendaItems(prev => [...prev, optimisticItem]);

    try {
      const { data: insertedData, error: insertError } = await supabase
        .from('meeting_agenda_items')
        .insert({
          ...data,
          meeting_id: meetingId,
          submitted_by: user.id,
          submitted_by_name: profile?.full_name,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Replace temp item with real item
      setAgendaItems(prev => 
        prev.map(item => item.id === tempId ? (insertedData as MeetingAgendaItem) : item)
      );

      return { error: null };
    } catch (err) {
      // Revert on error
      setAgendaItems(previousItems);
      return { error: err as Error };
    }
  };

  const updateAgendaItem = async (itemId: string, updates: Partial<MeetingAgendaItem>) => {
    if (!supabase || !canEditAgendaItems) {
      return { error: new Error('Keine Berechtigung') };
    }

    try {
      const { error: updateError } = await supabase
        .from('meeting_agenda_items')
        .update(updates)
        .eq('id', itemId);

      if (updateError) throw updateError;

      await fetchMeetingDetail();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const deleteAgendaItem = async (itemId: string) => {
    if (!supabase || !canEditAgendaItems) {
      return { error: new Error('Keine Berechtigung') };
    }

    try {
      const { error: deleteError } = await supabase
        .from('meeting_agenda_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;

      await fetchMeetingDetail();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const deferAgendaItem = async (itemId: string, toMeetingId: string, reason?: string) => {
    if (!supabase || !canManage) {
      return { error: new Error('Nur Kommandant kann Punkte vertagen') };
    }

    try {
      // Update current item to deferred
      const { error: updateError } = await supabase
        .from('meeting_agenda_items')
        .update({
          status: 'vertagt' as AgendaItemStatus,
          deferred_to_meeting_id: toMeetingId,
          deferred_reason: reason,
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      // Get the item details
      const item = agendaItems.find(i => i.id === itemId);
      if (item) {
        // Create mandatory item in target meeting
        await supabase
          .from('meeting_agenda_items')
          .insert({
            meeting_id: toMeetingId,
            title: item.title,
            description: item.description,
            category: item.category,
            submitted_by: item.submitted_by,
            submitted_by_name: item.submitted_by_name,
            is_mandatory: true,
            deferred_from_meeting_id: meetingId,
          });
      }

      await fetchMeetingDetail();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Decision management
  const addDecision = async (data: Omit<MeetingDecision, 'id' | 'meeting_id' | 'created_at' | 'decided_at'>) => {
    if (!supabase || !meetingId || !canManage) {
      return { error: new Error('Keine Berechtigung') };
    }

    try {
      const { error: insertError } = await supabase
        .from('meeting_decisions')
        .insert({
          ...data,
          meeting_id: meetingId,
        });

      if (insertError) throw insertError;

      await fetchMeetingDetail();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const updateDecision = async (decisionId: string, updates: Partial<MeetingDecision>) => {
    if (!supabase || !canManage) {
      return { error: new Error('Keine Berechtigung') };
    }

    try {
      const { error: updateError } = await supabase
        .from('meeting_decisions')
        .update(updates)
        .eq('id', decisionId);

      if (updateError) throw updateError;

      await fetchMeetingDetail();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const deleteDecision = async (decisionId: string) => {
    if (!supabase || !canManage) {
      return { error: new Error('Keine Berechtigung') };
    }

    // Check if meeting is closed
    if (meeting?.status === 'abgeschlossen') {
      return { error: new Error('Sitzung ist bereits abgeschlossen') };
    }

    try {
      // First delete any votes for this decision
      await supabase
        .from('meeting_decision_votes')
        .delete()
        .eq('decision_id', decisionId);

      // Then delete the decision
      const { error: deleteError } = await supabase
        .from('meeting_decisions')
        .delete()
        .eq('id', decisionId);

      if (deleteError) throw deleteError;

      await fetchMeetingDetail();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Helper: Generate next Beschluss number
  const generateBeschlussNummer = async (): Promise<string> => {
    if (!supabase) return `KB-${new Date().getFullYear()}-0001`;
    const currentYear = new Date().getFullYear();
    
    const { data: registerData } = await supabase
      .from('beschluss_register')
      .select('beschluss_nummer')
      .like('beschluss_nummer', `KB-${currentYear}-%`)
      .order('beschluss_nummer', { ascending: false })
      .limit(1);

    const { data: commandData } = await supabase
      .from('command_decisions')
      .select('reference_number')
      .or(`reference_number.like.KB-${currentYear}-%,reference_number.like.KA-${currentYear}-%`)
      .order('reference_number', { ascending: false })
      .limit(1);

    let maxNum = 0;
    if (registerData && registerData.length > 0) {
      const match = registerData[0].beschluss_nummer.match(/K[AB]-(\d{4})-(\d+)/);
      if (match) maxNum = Math.max(maxNum, parseInt(match[2], 10));
    }
    if (commandData && commandData.length > 0) {
      const match = commandData[0].reference_number.match(/K[AB]-(\d{4})-(\d+)/);
      if (match) maxNum = Math.max(maxNum, parseInt(match[2], 10));
    }
    return `KB-${currentYear}-${String(maxNum + 1).padStart(4, '0')}`;
  };

  // Helper: Send notifications to Schriftführer and Kassier
  const sendBeschlussNotifications = async (params: {
    beschlussNummer: string;
    titel: string;
    result: string;
    betrag?: number;
    meetingNumber?: string;
  }) => {
    if (!supabase) return;
    
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const resultLabel = params.result === 'genehmigt' ? 'genehmigt' : 'abgelehnt';
      
      // Get Schriftführer email
      const { data: schriftData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'schriftfuehrer_email')
        .single();

      if (schriftData?.value) {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${anonKey}`,
              'apikey': anonKey
            },
            body: JSON.stringify({
              type: 'kommando_decision_schriftfuehrer',
              schriftfuehrerEmail: schriftData.value,
              orderTitle: `${params.beschlussNummer}: ${params.titel}`,
              decision: resultLabel,
              decisionType: 'Sitzungsbestätigung',
              votingResults: `Bestätigt in Sitzung ${params.meetingNumber || ''}`,
            })
          }
        );
      }

      // Notify Kassier if betrag > 0
      if (params.betrag && params.betrag > 0) {
        const { data: kassierData } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'kassier_email')
          .single();

        if (kassierData?.value) {
          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${anonKey}`,
                'apikey': anonKey
              },
              body: JSON.stringify({
                type: 'kommando_decision_kassier',
                kassierEmail: kassierData.value,
                orderTitle: `${params.beschlussNummer}: ${params.titel}`,
                orderAmount: `${params.betrag.toFixed(2)} €`,
                decision: resultLabel,
                decisionType: 'Sitzungsbestätigung',
                votingResults: `Bestätigt in Sitzung ${params.meetingNumber || ''}`,
              })
            }
          );
        }
      }
    } catch (err) {
      console.error('Error sending notifications:', err);
    }
  };

  // Confirm a BANF decision in the meeting
  const confirmBanfDecision = async (
    order: PendingBanfDecision,
    result: 'genehmigt' | 'abgelehnt' | 'bestätigt',
    votesFor: number = 0,
    votesAgainst: number = 0,
    votesAbstain: number = 0,
    gueltigBis?: string,
    hebtAufId?: string
  ) => {
    if (!supabase || !meetingId || !canManage || !user) {
      return { error: new Error('Keine Berechtigung') };
    }

    try {
      const decisionText = `${order.title} - ${notes || 'Bestätigung aus digitalem Umlaufbeschluss'}`;
      const confirmedAt = new Date().toISOString();
      
      // Insert meeting decision
      const { data: decisionData, error: insertError } = await supabase
        .from('meeting_decisions')
        .insert({
          meeting_id: meetingId,
          order_id: order.id,
          decision_text: decisionText,
          source: 'banf_confirmation',
          votes_for: votesFor,
          votes_against: votesAgainst,
          votes_abstain: votesAbstain,
          result: result,
          is_in_register: true,
          register_added_at: confirmedAt,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Auto-register in beschluss_register
      const beschlussNummer = await generateBeschlussNummer();
      const registerStatus = result === 'genehmigt' || result === 'bestätigt' ? 'genehmigt' : 'abgelehnt';

      const { data: registerData, error: registerError } = await supabase
        .from('beschluss_register')
        .insert({
          beschluss_nummer: beschlussNummer,
          jahr: new Date().getFullYear(),
          typ: 'banf',
          titel: order.title,
          beschreibung: decisionText,
          betrag: order.amount || null,
          status: registerStatus,
          abstimmung_ja: votesFor,
          abstimmung_nein: votesAgainst,
          abstimmung_enthaltung: votesAbstain,
          meeting_id: meetingId,
          meeting_decision_id: decisionData.id,
          order_id: order.id,
          erstellt_von: user.id,
          genehmigt_von: user.id,
          genehmigt_am: confirmedAt,
          bestaetigt_in_sitzung_am: confirmedAt,
          gueltig_bis: gueltigBis || null,
          hebt_auf_id: hebtAufId || null,
        })
        .select('id')
        .single();

      if (registerError) {
        console.error('Error registering Beschluss:', registerError);
      } else {
        const neuerBeschlussId = registerData?.id;

        // Wenn dieser Beschluss einen anderen aufhebt, alten Beschluss aktualisieren
        if (hebtAufId && neuerBeschlussId) {
          const { data: alterBeschluss } = await supabase
            .from('beschluss_register')
            .select('beschluss_nummer')
            .eq('id', hebtAufId)
            .single();

          await supabase
            .from('beschluss_register')
            .update({
              status: 'aufgehoben',
              aufgehoben_durch_id: neuerBeschlussId,
              aufgehoben_am: confirmedAt,
              aufhebung_notiz: `Ersetzt durch ${beschlussNummer}`,
            })
            .eq('id', hebtAufId);

          // Historie für aufgehobenen Beschluss
          await supabase.from('beschluss_historie').insert({
            beschluss_id: hebtAufId,
            aktion: 'aufgehoben',
            von_status: 'genehmigt',
            nach_status: 'aufgehoben',
            durchgefuehrt_von: user.id,
            notizen: `Aufgehoben durch ${beschlussNummer} in Sitzung ${meeting?.meeting_number || ''}`,
          });
        }

        // Add history entry for new Beschluss
        await supabase.from('beschluss_historie').insert({
          beschluss_id: neuerBeschlussId,
          aktion: 'bestaetigt',
          von_status: 'ausstehend',
          nach_status: registerStatus,
          durchgefuehrt_von: user.id,
          notizen: `In Sitzung ${meeting?.meeting_number || ''} bestätigt${hebtAufId ? ' (ersetzt früheren Beschluss)' : ''}`,
        });

        // Send notifications
        await sendBeschlussNotifications({
          beschlussNummer,
          titel: order.title,
          result: registerStatus,
          betrag: order.amount,
          meetingNumber: meeting?.meeting_number,
        });
      }

      await fetchMeetingDetail();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Confirm a command decision item in the meeting
  const confirmCommandDecisionItem = async (
    item: PendingCommandDecisionItem,
    notes?: string,
    options?: {
      generatePdf?: boolean;
      sendToSchriftfuehrer?: boolean;
      pdfBackgroundUrl?: string;
      pdfBackgroundOpacity?: number;
      signatureUrl?: string;
      stampUrl?: string;
      commanderName?: string;
      gueltigBis?: string;
      hebtAufId?: string;
    }
  ) => {
    if (!supabase || !meetingId || !canManage || !user) {
      return { error: new Error('Keine Berechtigung') };
    }

    try {
      const resultLabel = item.status === 'approved' ? 'Genehmigt' : 'Abgelehnt';
      const decisionText = `${item.decision_reference} Pkt. ${item.item_number}: ${item.description}${notes ? ` - ${notes}` : ''}`;
      const confirmedAt = new Date().toISOString();
      
      // Get vote counts from the item
      const { data: votesData } = await supabase
        .from('command_decision_item_votes')
        .select('vote')
        .eq('item_id', item.id);
      
      const votesFor = (votesData ?? []).filter(v => v.vote === 'approve').length;
      const votesAgainst = (votesData ?? []).filter(v => v.vote === 'reject').length;
      const votesAbstain = (votesData ?? []).filter(v => v.vote === 'abstain').length;
      
      // Create meeting decision entry
      const { data: decisionData, error: insertError } = await supabase
        .from('meeting_decisions')
        .insert({
          meeting_id: meetingId,
          command_decision_item_id: item.id,
          decision_text: decisionText,
          source: 'kommando_confirmation',
          votes_for: votesFor,
          votes_against: votesAgainst,
          votes_abstain: votesAbstain,
          result: resultLabel.toLowerCase(),
          is_in_register: true,
          register_added_at: confirmedAt,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Auto-register in beschluss_register
      const beschlussNummer = await generateBeschlussNummer();
      const registerStatus = item.status === 'approved' ? 'genehmigt' : 'abgelehnt';

      const { data: registerData, error: registerError } = await supabase
        .from('beschluss_register')
        .insert({
          beschluss_nummer: beschlussNummer,
          jahr: new Date().getFullYear(),
          typ: 'umlauf',
          titel: `${item.decision_reference} Pkt. ${item.item_number}`,
          beschreibung: item.description,
          status: registerStatus,
          abstimmung_ja: votesFor,
          abstimmung_nein: votesAgainst,
          abstimmung_enthaltung: votesAbstain,
          meeting_id: meetingId,
          meeting_decision_id: decisionData.id,
          command_decision_id: item.decision_id,
          command_decision_item_id: item.id,
          erstellt_von: user.id,
          genehmigt_von: user.id,
          genehmigt_am: confirmedAt,
          bestaetigt_in_sitzung_am: confirmedAt,
          gueltig_bis: options?.gueltigBis || null,
          hebt_auf_id: options?.hebtAufId || null,
        })
        .select('id')
        .single();

      if (registerError) {
        console.error('Error registering Beschluss:', registerError);
      } else {
        const neuerBeschlussId = registerData?.id;

        // Wenn dieser Beschluss einen anderen aufhebt, alten Beschluss aktualisieren
        if (options?.hebtAufId && neuerBeschlussId) {
          await supabase
            .from('beschluss_register')
            .update({
              status: 'aufgehoben',
              aufgehoben_durch_id: neuerBeschlussId,
              aufgehoben_am: confirmedAt,
              aufhebung_notiz: `Ersetzt durch ${beschlussNummer}`,
            })
            .eq('id', options.hebtAufId);

          // Historie für aufgehobenen Beschluss
          await supabase.from('beschluss_historie').insert({
            beschluss_id: options.hebtAufId,
            aktion: 'aufgehoben',
            von_status: 'genehmigt',
            nach_status: 'aufgehoben',
            durchgefuehrt_von: user.id,
            notizen: `Aufgehoben durch ${beschlussNummer} in Sitzung ${meeting?.meeting_number || ''}`,
          });
        }

        // Add history entry for new Beschluss
        if (neuerBeschlussId) {
          await supabase.from('beschluss_historie').insert({
            beschluss_id: neuerBeschlussId,
            aktion: 'bestaetigt',
            von_status: 'ausstehend',
            nach_status: registerStatus,
            durchgefuehrt_von: user.id,
            notizen: `In Sitzung ${meeting?.meeting_number || ''} bestätigt${options?.hebtAufId ? ' (ersetzt früheren Beschluss)' : ''}`,
          });
        }

        // Send notifications (Schriftführer + Kassier bei Betrag > 0)
        await sendBeschlussNotifications({
          beschlussNummer,
          titel: `${item.decision_reference} Pkt. ${item.item_number}`,
          result: registerStatus,
          meetingNumber: meeting?.meeting_number,
        });
      }

      // Mark the command decision item as confirmed
      const { error: updateError } = await supabase
        .from('command_decision_items')
        .update({
          meeting_confirmed_at: confirmedAt,
          meeting_confirmed_in: meetingId
        })
        .eq('id', item.id);

      if (updateError) throw updateError;

      // Generate PDF and send to Schriftführer if requested
      if (options?.generatePdf) {
        try {
          // Load full decision data with votes
          const { data: decisionData } = await supabase
            .from('command_decisions')
            .select('*')
            .eq('id', item.decision_id)
            .single();

          const { data: itemsData } = await supabase
            .from('command_decision_items')
            .select('*')
            .eq('decision_id', item.decision_id)
            .order('item_number');

          // Get creator profile
          const { data: creatorProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', decisionData?.created_by || '')
            .single();

          // Get votes for the specific item
          const { data: votesData } = await supabase
            .from('command_decision_item_votes')
            .select('user_id, vote, reason')
            .eq('item_id', item.id);

          // Get voter profiles
          const voterIds = (votesData ?? []).map(v => v.user_id);
          let voterProfiles: Record<string, string> = {};
          if (voterIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', voterIds);
            voterProfiles = (profiles ?? []).reduce((acc, p) => {
              acc[p.id] = p.full_name || 'Unbekannt';
              return acc;
            }, {} as Record<string, string>);
          }

          // Get missing voters
          const { data: missingData } = await supabase
            .from('command_decision_item_votes_missing')
            .select('user_id')
            .eq('item_id', item.id);

          let missingVoterNames: string[] = [];
          if (missingData && missingData.length > 0) {
            const missingIds = missingData.map(m => m.user_id);
            const { data: missingProfiles } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', missingIds);
            missingVoterNames = (missingProfiles ?? []).map(p => p.full_name || 'Unbekannt');
          }

          // Build PDF data for the single confirmed item
          const pdfData = {
            decision: {
              id: decisionData?.id || item.decision_id,
              reference_number: item.decision_reference,
              title: item.decision_title,
              status: item.status,
              created_at: decisionData?.created_at || item.created_at,
              submitted_at: decisionData?.submitted_at || null,
              voting_closed_at: item.voting_closed_at,
              voting_result: item.voting_result,
            },
            items: [{
              item_number: item.item_number,
              description: item.description,
              status: item.status,
              voting_result: item.voting_result,
              voting_override_by: null,
              voting_override_reason: null,
              votes: (votesData ?? []).map(v => ({
                voter_name: voterProfiles[v.user_id] || 'Unbekannt',
                vote: v.vote as 'approve' | 'reject' | 'abstain',
                reason: v.reason
              })),
              missingVoters: missingVoterNames
            }],
            creatorName: creatorProfile?.full_name || 'Unbekannt',
            pdfBackgroundUrl: options.pdfBackgroundUrl,
            pdfBackgroundOpacity: options.pdfBackgroundOpacity,
            signatureUrl: options.signatureUrl,
            stampUrl: options.stampUrl,
            commanderName: options.commanderName,
            meetingConfirmation: {
              meetingNumber: meeting?.meeting_number || '',
              meetingDate: meeting?.scheduled_date || '',
              confirmedAt: confirmedAt
            }
          };

          // Generate and download PDF
          const { generateCommandDecisionPdf } = await import('@/utils/generateCommandDecisionPdf');
          await generateCommandDecisionPdf(pdfData);

          // Send notification to Schriftführer if requested
          if (options.sendToSchriftfuehrer) {
            const { data: settingsData } = await supabase
              .from('settings')
              .select('value')
              .eq('key', 'schriftfuehrer_email')
              .single();

            if (settingsData?.value) {
              const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
              await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${anonKey}`,
                    'apikey': anonKey
                  },
                  body: JSON.stringify({
                    type: 'kommando_decision_schriftfuehrer',
                    schriftfuehrerEmail: settingsData.value,
                    decisionReference: item.decision_reference,
                    decisionTitle: item.decision_title,
                    itemNumber: item.item_number,
                    itemDescription: item.description,
                    result: resultLabel,
                    meetingNumber: meeting?.meeting_number || '',
                    confirmedAt: new Date(confirmedAt).toLocaleDateString('de-DE')
                  })
                }
              );
            }
          }
        } catch (pdfError) {
          console.error('Error generating PDF or sending notification:', pdfError);
          // Don't fail the whole operation if PDF generation fails
        }
      }

      await fetchMeetingDetail();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Vote on a decision (individual vote) - optimistic update to prevent scroll reset
  // Wenn vote = null, wird die Stimme entfernt (Toggle-Funktion)
  const voteOnDecision = async (decisionId: string, profileId: string, vote: 'dafuer' | 'dagegen' | 'enthaltung' | null) => {
    if (!supabase || !canManage) {
      return { error: new Error('Keine Berechtigung') };
    }

    // Optimistic update: immediately update local state
    const previousVotes = [...decisionVotes];
    const previousDecisions = [...decisions];
    
    // Find existing vote for this decision/profile
    const existingVoteIndex = decisionVotes.findIndex(
      v => v.decision_id === decisionId && v.profile_id === profileId
    );
    
    let newDecisionVotes: DecisionVote[];
    
    if (vote === null) {
      // Stimme entfernen (Toggle: erneuter Klick auf gleiche Option)
      if (existingVoteIndex >= 0) {
        newDecisionVotes = decisionVotes.filter((_, idx) => idx !== existingVoteIndex);
      } else {
        // Keine existierende Stimme zum Entfernen
        return { error: null };
      }
    } else {
      // Update decisionVotes state optimistically
      const newVote: DecisionVote = {
        id: existingVoteIndex >= 0 ? decisionVotes[existingVoteIndex].id : `temp-${Date.now()}`,
        decision_id: decisionId,
        profile_id: profileId,
        vote: vote,
        voted_at: new Date().toISOString()
      };
      
      if (existingVoteIndex >= 0) {
        newDecisionVotes = [...decisionVotes];
        newDecisionVotes[existingVoteIndex] = newVote;
      } else {
        newDecisionVotes = [...decisionVotes, newVote];
      }
    }
    
    setDecisionVotes(newDecisionVotes);
    
    // Calculate and update vote counts optimistically
    const votesForThisDecision = newDecisionVotes.filter(v => v.decision_id === decisionId);
    const votesFor = votesForThisDecision.filter(v => v.vote === 'dafuer').length;
    const votesAgainst = votesForThisDecision.filter(v => v.vote === 'dagegen').length;
    const votesAbstain = votesForThisDecision.filter(v => v.vote === 'enthaltung').length;
    const result = votesFor > votesAgainst ? 'Angenommen' : votesFor < votesAgainst ? 'Abgelehnt' : 'Unentschieden';
    
    setDecisions(prev => prev.map(d => 
      d.id === decisionId 
        ? { ...d, votes_for: votesFor, votes_against: votesAgainst, votes_abstain: votesAbstain, result }
        : d
    ));

    try {
      if (vote === null) {
        // Stimme aus Datenbank löschen
        const { error: deleteError } = await supabase
          .from('meeting_decision_votes')
          .delete()
          .eq('decision_id', decisionId)
          .eq('profile_id', profileId);

        if (deleteError) throw deleteError;
      } else {
        // Upsert the vote to server
        const { error: upsertError } = await supabase
          .from('meeting_decision_votes')
          .upsert({
            decision_id: decisionId,
            profile_id: profileId,
            vote: vote,
            voted_at: new Date().toISOString(),
          }, { onConflict: 'decision_id,profile_id' });

        if (upsertError) throw upsertError;
      }

      // Update decision totals on server
      await supabase
        .from('meeting_decisions')
        .update({ votes_for: votesFor, votes_against: votesAgainst, votes_abstain: votesAbstain, result })
        .eq('id', decisionId);

      // No full refetch needed - optimistic update already applied
      return { error: null };
    } catch (err) {
      // Revert optimistic update on error
      setDecisionVotes(previousVotes);
      setDecisions(previousDecisions);
      return { error: err as Error };
    }
  };

  // Update agenda item traffic light
  const updateAgendaItemTrafficLight = async (itemId: string, trafficLight: 'rot' | 'gelb' | 'gruen') => {
    if (!supabase || !canManage) {
      return { error: new Error('Keine Berechtigung') };
    }

    try {
      const { error: updateError } = await supabase
        .from('meeting_agenda_items')
        .update({ traffic_light: trafficLight })
        .eq('id', itemId);

      if (updateError) throw updateError;

      await fetchMeetingDetail();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Add decision to register
  const addDecisionToRegister = async (decisionId: string) => {
    if (!supabase || !canManage) {
      return { error: new Error('Keine Berechtigung') };
    }

    try {
      const { error: updateError } = await supabase
        .from('meeting_decisions')
        .update({ 
          is_in_register: true, 
          register_added_at: new Date().toISOString() 
        })
        .eq('id', decisionId);

      if (updateError) throw updateError;

      await fetchMeetingDetail();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Quorum calculation
  const calculateQuorum = useCallback(() => {
    const presentStatuses: AttendanceStatus[] = ['anwesend', 'remote'];
    const votingPresent = attendance.filter(
      a => a.is_voting_member && presentStatuses.includes(a.status)
    );
    const kdtPresent = attendance.some(
      a => presentStatuses.includes(a.status) && 
           (a.function_name === 'Kommandant' || a.function_name === 'Kdt-Stellvertreter')
    );
    const isQuorate = votingPresent.length >= 5 && kdtPresent;

    return {
      votingMembersPresent: votingPresent.length,
      kdtPresent,
      isQuorate,
      totalVotingMembers: 7,
    };
  }, [attendance]);

  // Close meeting and create next one with deferred items
  const closeMeeting = async (nextMeetingDate: string, nextMeetingTime: string, nextMeetingLocation: string) => {
    if (!supabase || !meeting || !meetingId || !user || !canManage) {
      return { error: new Error('Keine Berechtigung') };
    }

    try {
      // 1. Update current meeting to closed
      const { error: closeError } = await supabase
        .from('meetings')
        .update({
          status: 'abgeschlossen',
          closed_at: new Date().toISOString(),
          next_meeting_date: nextMeetingDate,
          next_meeting_time: nextMeetingTime,
          next_meeting_location: nextMeetingLocation,
        })
        .eq('id', meetingId);

      if (closeError) throw closeError;

      // 2. Generate new meeting number
      const year = new Date(nextMeetingDate).getFullYear();
      const { data: existingMeetings } = await supabase
        .from('meetings')
        .select('meeting_number')
        .eq('meeting_type', meeting.meeting_type)
        .ilike('meeting_number', `${year}-%`);

      const existingNumbers = (existingMeetings ?? []).map(m => {
        const parts = m.meeting_number.split('-');
        return parseInt(parts[1]) || 0;
      });
      const nextNumber = Math.max(0, ...existingNumbers) + 1;
      const newMeetingNumber = `${year}-${String(nextNumber).padStart(2, '0')}`;

      // 3. Create new meeting
      const { data: newMeeting, error: createError } = await supabase
        .from('meetings')
        .insert({
          meeting_type: meeting.meeting_type,
          meeting_number: newMeetingNumber,
          scheduled_date: nextMeetingDate,
          scheduled_time: nextMeetingTime,
          location: nextMeetingLocation,
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // 4. Copy deferred items (traffic_light = 'rot') to new meeting as mandatory
      const deferredItems = agendaItems.filter(item => item.traffic_light === 'rot');
      
      if (deferredItems.length > 0 && newMeeting) {
        const newItems = deferredItems.map((item, idx) => ({
          meeting_id: newMeeting.id,
          title: item.title,
          description: item.description,
          category: item.category,
          submitted_by: item.submitted_by,
          submitted_by_name: item.submitted_by_name,
          is_mandatory: true,
          deferred_from_meeting_id: meetingId,
          sort_order: idx + 1,
        }));

        await supabase
          .from('meeting_agenda_items')
          .insert(newItems);

        // Update original items as deferred
        for (const item of deferredItems) {
          await supabase
            .from('meeting_agenda_items')
            .update({ 
              deferred_to_meeting_id: newMeeting.id,
              status: 'vertagt'
            })
            .eq('id', item.id);
        }
      }

      return { error: null, newMeetingId: newMeeting?.id };
    } catch (err) {
      return { error: err as Error, newMeetingId: null };
    }
  };

  useEffect(() => {
    fetchMeetingDetail();
  }, [fetchMeetingDetail]);

  return {
    meeting,
    attendance,
    agendaItems,
    fixedAgendaItems,
    decisions,
    decisionVotes,
    pendingBanfDecisions,
    pendingCommandDecisionItems,
    loading,
    error,
    canManage,
    canEditAgendaItems,
    isDeadlinePassed,
    fetchMeetingDetail,
    updateAttendance,
    removeAttendance,
    addAgendaItem,
    updateAgendaItem,
    deleteAgendaItem,
    updateAgendaItemTrafficLight,
    deferAgendaItem,
    addDecision,
    updateDecision,
    deleteDecision,
    voteOnDecision,
    addDecisionToRegister,
    confirmBanfDecision,
    confirmCommandDecisionItem,
    calculateQuorum,
    closeMeeting,
  };
}
