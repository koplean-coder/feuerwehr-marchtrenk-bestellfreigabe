import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Layout } from '@/components/Layout';
import { useMeetingDetail, useMeetings, type AttendanceStatus, type AgendaItemStatus, type MeetingAgendaItem, type DecisionVote } from '@/hooks/useMeetings';
import { useSettings } from '@/hooks/useSettings';
import { useProfiles } from '@/hooks/useProfiles';
import { useBeschlussRegister } from '@/hooks/useBeschlussRegister';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { formatDate } from '@/utils/formatters';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Monitor,
  HelpCircle,
  Vote,
  Save,
  X,
  Flag,
  Send,
  Download,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Ban,
  RefreshCw,
  ExternalLink,
  Lock,
  Unlock,
  BookOpen,
  Mail,
  ClipboardList,
  Circle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Link2,
  CalendarX } from
'lucide-react';

type Tab = 'uebersicht' | 'eintraege' | 'beschluesse' | 'register' | 'abschluss';

const FUNCTION_ORDER = [
'Kommandant',
'Kdt-Stellvertreter',
'Kassier',
'Schriftführer',
'Schriftführer-Stv / FA Org.',
'Zeugwart',
'1. Zugskommandant',
'2. Zugskommandant',
'Zugskommandant',
'1. Gruppenkommandant',
'2. Gruppenkommandant',
'Gruppenkommandant',
'Atemschutzbeauftragter',
'Funkbeauftragter',
'Einsatzleiter',
'Jugendbetreuer',
'Jugendhelfer',
'Erweitertes Kommando',
'Kommandomitglied']; // Kommandomitglied am Ende - ist generisch

// Sort order for Kommandositzung entries
const SORT_ORDER_KOMMANDO = [
'Kommandant',
'Kommandant od. Kommandant Stv.',
'Kdt-Stellvertreter',
'Kassier',
'Schriftführer',
'Zeugwart',
'1. Zugskommandant',
'2. Zugskommandant',
'Zugskommandant'];


// Sort order for Erweitertes Kommando entries (includes more roles)
const SORT_ORDER_ERWEITERTES = [
'Kommandant',
'Kommandant od. Kommandant Stv.',
'Kdt-Stellvertreter',
'Kassier',
'Schriftführer',
'Zeugwart',
'1. Zugskommandant',
'2. Zugskommandant',
'Zugskommandant',
'1. Gruppenkommandant',
'2. Gruppenkommandant',
'Gruppenkommandant',
'Jugendbetreuer',
'Jugendhelfer',
'Atemschutzbeauftragter',
'Atemschutzwart',
'Funkbeauftragter',
'Erweitertes Kommando'];


// Category to display name mapping (static)
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  'kommandant': 'Kommandant',
  'kdt_stellvertreter': 'Kdt-Stellvertreter',
  'kdt-stellvertreter': 'Kdt-Stellvertreter',
  'kommandomitglied': 'Kommandomitglied',
  'zugskommandant': 'Zugskommandant',
  'gruppenkommandant': 'Gruppenkommandant',
  'kassier': 'Kassier',
  'schriftfuehrer': 'Schriftführer',
  'zeugwart': 'Zeugwart',
  'atemschutz': 'Atemschutzbeauftragter',
  'atemschutzbeauftragter': 'Atemschutzbeauftragter',
  'funk': 'Funkbeauftragter',
  'funkbeauftragter': 'Funkbeauftragter',
  'einsatzleiter': 'Einsatzleiter',
  'jugendbetreuer': 'Jugendbetreuer',
  'allfaelliges': 'Allfälliges',
  'erweitertes_kommando': 'Erweitertes Kommando'
};

// Reverse mapping: display name -> category key
const DISPLAY_NAME_TO_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_DISPLAY_NAMES).map(([key, value]) => [value.toLowerCase(), key])
);

// Get category key from any format (key, display name, or user function)
const normalizeToCategoryKey = (input: string): string => {
  if (!input) return 'allfaelliges';
  const lower = input.toLowerCase();

  // Already a valid key
  if (CATEGORY_DISPLAY_NAMES[lower]) return lower;

  // Check reverse mapping
  if (DISPLAY_NAME_TO_CATEGORY[lower]) return DISPLAY_NAME_TO_CATEGORY[lower];

  // Try to match partial (for user functions like "Kdt-Stellvertreter")
  for (const [key] of Object.entries(CATEGORY_DISPLAY_NAMES)) {
    if (lower.includes(key) || key.includes(lower.replace(/[\s-]/g, '_'))) {
      return key;
    }
  }

  return 'allfaelliges';
};

export default function SitzungDetail() {
  const { id } = useParams<{id: string;}>();
  const navigate = useNavigate();
  const { effectiveProfile: profile, effectiveUserId, effectiveIsAdmin, effectiveIsKommandant } = useSimulation();
  const { profiles } = useProfiles();
  const { gueltigeBeschluesse } = useBeschlussRegister();
  const {
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
    closeMeeting
  } = useMeetingDetail(id);

  const { updateMeeting, deleteMeeting, canAccessMeeting, isInvitedToMeeting } = useMeetings();

  const [activeTab, setActiveTab] = useState<Tab>('uebersicht');
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [showNewDecisionModal, setShowNewDecisionModal] = useState(false);
  const [showBanfDetailModal, setShowBanfDetailModal] = useState<typeof pendingBanfDecisions[0] | null>(null);
  const [newItemForm, setNewItemForm] = useState({ title: '', description: '', category: '' });
  const [newItemError, setNewItemError] = useState<string | null>(null);
  const [banfAttachments, setBanfAttachments] = useState<Array<{id: string;file_name: string;file_path: string;file_size: number;mime_type: string;}>>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [newDecisionForm, setNewDecisionForm] = useState({ decision_text: '', prefix: '' });
  const [selectedDecisionPrefix, setSelectedDecisionPrefix] = useState<string>('');
  const [customDecisionPrefix, setCustomDecisionPrefix] = useState('');
  const [showCreateDecisionModal, setShowCreateDecisionModal] = useState<{agendaItemId: string;title: string;description: string | null;} | null>(null);
  const [showConfirmBanfModal, setShowConfirmBanfModal] = useState<typeof pendingBanfDecisions[0] | null>(null);
  const [banfDecisionText, setBanfDecisionText] = useState('');
  const [banfGueltigBis, setBanfGueltigBis] = useState('');
  const [banfHebtAuf, setBanfHebtAuf] = useState('');
  const [commandItemGueltigBis, setCommandItemGueltigBis] = useState('');
  const [commandItemHebtAuf, setCommandItemHebtAuf] = useState('');
  const [expandedDecisions, setExpandedDecisions] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categoryInputs, setCategoryInputs] = useState<Record<string, string>>({});
  const [registerSearch, setRegisterSearch] = useState('');
  const [nextMeetingForm, setNextMeetingForm] = useState({ date: '', time: '18:30', location: 'FF-Haus Marchtrenk' });
  const [isClosing, setIsClosing] = useState(false);
  const [checkedAgendaItems, setCheckedAgendaItems] = useState<Set<string>>(new Set());
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState('');
  const [addMemberWithVoting, setAddMemberWithVoting] = useState(false);
  const [showDeleteBanfConfirm, setShowDeleteBanfConfirm] = useState<typeof pendingBanfDecisions[0] | null>(null);
  const [deletingBanf, setDeletingBanf] = useState(false);
  const [showConfirmCommandItemModal, setShowConfirmCommandItemModal] = useState<typeof pendingCommandDecisionItems[0] | null>(null);
  const [commandItemNotes, setCommandItemNotes] = useState('');
  const [generatePdfOnConfirm, setGeneratePdfOnConfirm] = useState(true);
  const [sendToSchriftfuehrer, setSendToSchriftfuehrer] = useState(true);
  const [isConfirmingItem, setIsConfirmingItem] = useState(false);
  const [showDeleteMeetingConfirm, setShowDeleteMeetingConfirm] = useState(false);
  const [deletingMeeting, setDeletingMeeting] = useState(false);
  const [editingMeetingDetails, setEditingMeetingDetails] = useState(false);
  const [editingAgendaItem, setEditingAgendaItem] = useState<string | null>(null);
  const [editingAgendaItemText, setEditingAgendaItemText] = useState('');
  const [meetingDetailsForm, setMeetingDetailsForm] = useState({ date: '', time: '', location: '' });
  const [editingDecision, setEditingDecision] = useState<typeof decisions[0] | null>(null);
  const [editDecisionText, setEditDecisionText] = useState('');
  // Gültigkeit & Aufhebung für neue/bearbeitete Beschlüsse
  const [newDecisionGueltigBis, setNewDecisionGueltigBis] = useState('');
  const [newDecisionHebtAuf, setNewDecisionHebtAuf] = useState('');
  const [createDecisionGueltigBis, setCreateDecisionGueltigBis] = useState('');
  const [createDecisionHebtAuf, setCreateDecisionHebtAuf] = useState('');
  const [editDecisionGueltigBis, setEditDecisionGueltigBis] = useState('');
  const [editDecisionHebtAuf, setEditDecisionHebtAuf] = useState('');
  const [downloadingPdfDecisionId, setDownloadingPdfDecisionId] = useState<string | null>(null);

  // Pause Timer (90 minutes first, then 60 minutes repeating)
  const [pauseTimerRunning, setPauseTimerRunning] = useState(false);
  const [pauseTimerSeconds, setPauseTimerSeconds] = useState(90 * 60); // 90 minutes in seconds
  const [showPausePopup, setShowPausePopup] = useState(false);
  const [pauseCount, setPauseCount] = useState(0); // 0 = not started, 1 = first pause done, 2+ = subsequent

  // Pause Timer Effect
  useEffect(() => {
    if (!pauseTimerRunning) return;

    if (pauseTimerSeconds <= 0) {
      setPauseTimerRunning(false);
      setShowPausePopup(true);
      return;
    }

    const interval = setInterval(() => {
      setPauseTimerSeconds((prev) => {
        if (prev <= 1) {
          setPauseTimerRunning(false);
          setShowPausePopup(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pauseTimerRunning, pauseTimerSeconds]);

  // Handle pause popup confirmation - start 60min timer for subsequent pauses
  const handlePauseConfirm = () => {
    setShowPausePopup(false);
    setPauseCount((prev) => prev + 1);
    // Start 60 minute timer for next pause
    setPauseTimerSeconds(60 * 60);
    setPauseTimerRunning(true);
  };

  // Format seconds to MM:SS
  const formatTimerTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Load PDF settings and decision templates
  const { pdfBackgroundUrl, pdfBackgroundOpacity, commanderSignatureUrl, commanderStampUrl, decisionTextTemplates } = useSettings();

  // Get commander name for PDF
  const commanderProfile = profiles.find((p) => p.role === 'kommandant');

  const quorum = useMemo(() => calculateQuorum(), [calculateQuorum]);

  // Check if user can access this specific meeting
  const hasAccess = meeting ? canAccessMeeting(meeting.id, meeting.meeting_type) : true;
  const isGuest = meeting && id ? isInvitedToMeeting(id) && !canManage : false;

  // Function to regenerate PDF for a confirmed command decision
  const handleDownloadDecisionPdf = async (decision: typeof decisions[0]) => {
    if (!decision.command_decision_item_id || !supabase) return;

    setDownloadingPdfDecisionId(decision.id);
    try {
      // Get the command decision item
      const { data: itemData } = await supabase.
      from('command_decision_items').
      select(`
          *,
          command_decisions!inner (
            id,
            title,
            reference_number,
            created_at,
            submitted_at,
            created_by
          )
        `).
      eq('id', decision.command_decision_item_id).
      single();

      if (!itemData) throw new Error('Beschluss nicht gefunden');

      // Get creator profile
      const { data: creatorProfile } = await supabase.
      from('profiles').
      select('full_name').
      eq('id', itemData.command_decisions?.created_by || '').
      single();

      // Get votes for the item
      const { data: votesData } = await supabase.
      from('command_decision_item_votes').
      select('user_id, vote, reason').
      eq('item_id', itemData.id);

      // Get voter profiles
      const voterIds = (votesData ?? []).map((v) => v.user_id);
      let voterProfiles: Record<string, string> = {};
      if (voterIds.length > 0) {
        const { data: voterProfilesData } = await supabase.
        from('profiles').
        select('id, full_name').
        in('id', voterIds);
        voterProfiles = (voterProfilesData ?? []).reduce((acc, p) => {
          acc[p.id] = p.full_name || 'Unbekannt';
          return acc;
        }, {} as Record<string, string>);
      }

      // Get missing voters
      const { data: missingData } = await supabase.
      from('command_decision_item_votes_missing').
      select('user_id').
      eq('item_id', itemData.id);

      let missingVoterNames: string[] = [];
      if (missingData && missingData.length > 0) {
        const missingIds = missingData.map((m) => m.user_id);
        const { data: missingProfiles } = await supabase.
        from('profiles').
        select('id, full_name').
        in('id', missingIds);
        missingVoterNames = (missingProfiles ?? []).map((p) => p.full_name || 'Unbekannt');
      }

      // Generate PDF
      const { generateCommandDecisionPdf } = await import('@/utils/generateCommandDecisionPdf');
      await generateCommandDecisionPdf({
        decision: {
          id: itemData.command_decisions?.id || '',
          reference_number: itemData.command_decisions?.reference_number || '',
          title: itemData.command_decisions?.title || '',
          status: itemData.status,
          created_at: itemData.command_decisions?.created_at || '',
          submitted_at: itemData.command_decisions?.submitted_at || null,
          voting_closed_at: itemData.voting_closed_at,
          voting_result: itemData.voting_result
        },
        items: [{
          item_number: itemData.item_number,
          description: itemData.description,
          status: itemData.status,
          voting_result: itemData.voting_result,
          voting_override_by: itemData.voting_override_by,
          voting_override_reason: itemData.voting_override_reason,
          votes: (votesData ?? []).map((v) => ({
            voter_name: voterProfiles[v.user_id] || 'Unbekannt',
            vote: v.vote as 'approve' | 'reject' | 'abstain',
            reason: v.reason
          })),
          missingVoters: missingVoterNames
        }],
        creatorName: creatorProfile?.full_name || 'Unbekannt',
        pdfBackgroundUrl: pdfBackgroundUrl || undefined,
        pdfBackgroundOpacity: pdfBackgroundOpacity,
        signatureUrl: commanderSignatureUrl || undefined,
        stampUrl: commanderStampUrl || undefined,
        commanderName: commanderProfile?.full_name,
        meetingConfirmation: {
          meetingNumber: meeting?.meeting_number || '',
          meetingDate: meeting?.scheduled_date || '',
          confirmedAt: itemData.meeting_confirmed_at || ''
        }
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setDownloadingPdfDecisionId(null);
    }
  };

  // Map user functions to category values
  const getUserDefaultCategory = useCallback(() => {
    if (!profile?.functions || profile.functions.length === 0) return 'allfaelliges';

    // Find first matching function using normalize helper
    for (const func of profile.functions) {
      const categoryKey = normalizeToCategoryKey(func);
      if (categoryKey !== 'allfaelliges') {
        return categoryKey;
      }
    }
    return 'allfaelliges';
  }, [profile?.functions]);

  // Check if user is Admin
  const isAdmin = profile?.role === 'admin';
  const isKommandant = profile?.role === 'kommandant';
  const canEditMeetingDetails = isAdmin || isKommandant;
  const canDeleteMeeting = isAdmin; // Nur Admin kann löschen

  // Handler: Meeting löschen (nur Admin, nur wenn nicht abgeschlossen)
  const handleDeleteMeeting = async () => {
    if (!meeting || !canDeleteMeeting || meeting.status === 'abgeschlossen') return;

    setDeletingMeeting(true);
    try {
      const { error } = await deleteMeeting(meeting.id);
      if (error) throw error;
      navigate('/sitzungen');
    } catch (err) {
      console.error('Error deleting meeting:', err);
      alert('Fehler beim Löschen der Sitzung');
    } finally {
      setDeletingMeeting(false);
      setShowDeleteMeetingConfirm(false);
    }
  };

  // Handler: Meeting-Details bearbeiten starten
  const startEditingMeetingDetails = () => {
    if (!meeting) return;
    setMeetingDetailsForm({
      date: meeting.scheduled_date,
      time: meeting.scheduled_time.slice(0, 5),
      location: meeting.location
    });
    setEditingMeetingDetails(true);
  };

  // Handler: Meeting-Details speichern
  const handleSaveMeetingDetails = async () => {
    if (!meeting || !canEditMeetingDetails) return;

    try {
      const { error } = await updateMeeting(meeting.id, {
        scheduled_date: meetingDetailsForm.date,
        scheduled_time: meetingDetailsForm.time,
        location: meetingDetailsForm.location
      });
      if (error) throw error;
      setEditingMeetingDetails(false);
      window.location.reload(); // Reload to get updated data
    } catch (err) {
      console.error('Error updating meeting:', err);
      alert('Fehler beim Speichern');
    }
  };

  const userCategoryKey = getUserDefaultCategory();

  // Check if user has Kdt-Stellvertreter function
  const isKdtStellvertreter = useMemo(() => {
    if (!profile?.functions) return false;
    return profile.functions.some((f) => {
      const lower = typeof f === 'string' ? f.toLowerCase() : '';
      return lower.includes('kdt') && (lower.includes('stv') || lower.includes('stellvertreter'));
    });
  }, [profile?.functions]);

  // Ampel/Traffic lights: Kommandant, Admin ODER Kdt-Stellvertreter
  const canManageTrafficLights = canManage || isKdtStellvertreter;

  // Check if current user can edit entries for a specific category
  const userId = profile?.id;
  const canUserEditCategory = useCallback((categoryKey: string): boolean => {
    // Allfälliges: everyone can write
    if (categoryKey === 'allfaelliges') return true;
    // Kommandant/Admin can edit everything
    if (canManage) return true;
    // Additional attendees can edit their own category (zusatz_<user_id>)
    if (categoryKey.startsWith('zusatz_') && userId && categoryKey === `zusatz_${userId}`) return true;
    // Otherwise: only if user's category matches
    return userCategoryKey === categoryKey;
  }, [userCategoryKey, canManage, userId]);

  // Check if current user can delete/edit a specific item
  const canUserEditItem = useCallback((item: MeetingAgendaItem): boolean => {
    // Kommandant/Admin can edit everything
    if (canManage) return true;
    // If deadline passed (locked), only canManage can edit
    if (isDeadlinePassed()) return false;
    // User can edit their own items
    return item.submitted_by === profile?.id;
  }, [canManage, profile?.id, isDeadlinePassed]);

  // Load attachments when BANF modal opens
  useEffect(() => {
    async function loadAttachments() {
      if (!showBanfDetailModal || !supabase) {
        setBanfAttachments([]);
        return;
      }

      setLoadingAttachments(true);
      try {
        const { data } = await supabase.
        from('order_attachments').
        select('id, file_name, file_path, file_size, mime_type').
        eq('order_id', showBanfDetailModal.id);

        setBanfAttachments(data || []);
      } catch {
        setBanfAttachments([]);
      } finally {
        setLoadingAttachments(false);
      }
    }

    loadAttachments();
  }, [showBanfDetailModal]);

  // Set default category when opening new item modal
  useEffect(() => {
    if (showNewItemModal) {
      const defaultCategory = getUserDefaultCategory();
      setNewItemForm((prev) => ({ ...prev, category: defaultCategory }));
      setNewItemError(null);
    }
  }, [showNewItemModal, getUserDefaultCategory]);

  // Helper: Check if profile is Kommandomitglied (case-insensitive)
  // NUR Funktion 'kommandomitglied' = stimmberechtigt
  // Erweitertes Kommando ohne kommandomitglied = beratend
  const isKommandomitglied = useCallback((functions: string[] | null | undefined): boolean => {
    if (!functions) return false;
    return functions.some((f) => f.toLowerCase() === 'kommandomitglied');
  }, []);

  // Get Kommandomitglieder for attendance
  const kommandomitglieder = useMemo(() => {
    if (!meeting) return [];
    return profiles.filter((p) => {
      if (meeting.meeting_type === 'kommandositzung') {
        return isKommandomitglied(p.functions);
      } else {
        // Erweitertes Kommando: Kommandomitglieder + erweitertes_kommando Mitglieder
        return isKommandomitglied(p.functions) ||
        p.functions?.some((f) => f.toLowerCase().includes('erweitertes_kommando'));
      }
    }).sort((a, b) => {
      const aIdx = FUNCTION_ORDER.findIndex((f) => a.functions?.some((fn) => fn.toLowerCase().includes(f.toLowerCase())));
      const bIdx = FUNCTION_ORDER.findIndex((f) => b.functions?.some((fn) => fn.toLowerCase().includes(f.toLowerCase())));
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });
  }, [profiles, meeting, isKommandomitglied]);

  // Additional attendees (manually added, not in kommandomitglieder)
  const additionalAttendees = useMemo(() => {
    const kommandomitgliederIds = new Set(kommandomitglieder.map((k) => k.id));
    return attendance.
    filter((a) => !kommandomitgliederIds.has(a.profile_id)).
    map((a) => {
      const memberProfile = profiles.find((p) => p.id === a.profile_id);
      return memberProfile ? { ...memberProfile, attendanceRecord: a } : null;
    }).
    filter(Boolean) as Array<typeof profiles[0] & {attendanceRecord: typeof attendance[0];}>;
  }, [attendance, kommandomitglieder, profiles]);

  // Available members to add (not already in attendance)
  const availableMembersToAdd = useMemo(() => {
    const attendeeIds = new Set([
    ...kommandomitglieder.map((k) => k.id),
    ...attendance.map((a) => a.profile_id)]
    );
    return profiles.filter((p) => !attendeeIds.has(p.id)).sort((a, b) =>
    (a.full_name || '').localeCompare(b.full_name || '')
    );
  }, [profiles, kommandomitglieder, attendance]);

  // Handle adding a member to attendance
  const handleAddMemberToAttendance = async () => {
    if (!selectedMemberToAdd) return;
    const memberProfile = profiles.find((p) => p.id === selectedMemberToAdd);
    if (!memberProfile) return;

    await updateAttendance(selectedMemberToAdd, 'anwesend', {
      functions: memberProfile.functions,
      role: memberProfile.role,
      forceVotingMember: addMemberWithVoting
    });

    setShowAddMemberModal(false);
    setSelectedMemberToAdd('');
    setAddMemberWithVoting(false);
  };

  // Handle deleting a BANF order (admin only)
  const handleDeleteBanfOrder = async (orderId: string) => {
    if (!supabase || !isAdmin) return;

    setDeletingBanf(true);
    try {
      // First delete related attachments
      await supabase.
      from('order_attachments').
      delete().
      eq('order_id', orderId);

      // Delete the order
      const { error } = await supabase.
      from('orders').
      delete().
      eq('id', orderId);

      if (error) throw error;

      // Refresh the page data
      window.location.reload();
    } catch (err) {
      console.error('Error deleting BANF order:', err);
    } finally {
      setDeletingBanf(false);
      setShowDeleteBanfConfirm(null);
      setShowBanfDetailModal(null);
    }
  };

  // Get display function for a profile - properly formatted
  // WICHTIG: Priorisiert spezifische Funktionen vor generischen wie "Erweitertes Kommando" oder "Kommandomitglied"
  const getProfileDisplayFunction = useCallback((profileFunctions: string[] | null): string => {
    if (!profileFunctions || profileFunctions.length === 0) return '';

    // Erst alle Funktionen sammeln und dann nach Priorität sortieren
    // Spezifische Funktionen haben höhere Priorität als generische
    const priorityMap: {[key: string]: number;} = {
      'kommandant': 1,
      'kdt_stellvertreter': 2,
      'kassier': 3,
      'schriftfuehrer': 4,
      'zeugwart': 5,
      'zugskommandant': 6,
      'gruppenkommandant': 7,
      'jugendwartstv': 8,
      'jugendbetreuer_stv': 8,
      'jugendwart': 9,
      'jugendbetreuer': 9,
      'atemschutzwart': 10,
      'funkbeauftragter': 11,
      'erweitertes_kommando': 50, // Niedrige Priorität
      'kommandomitglied': 100 // Niedrigste Priorität
    };

    // Finde die Funktion mit höchster Priorität (niedrigste Zahl)
    let bestMatch = '';
    let bestPriority = 999;

    for (const func of profileFunctions) {
      // Handle wenn func ein Objekt ist (z.B. {name: "x", label: "y"})
      let funcStr: string;
      if (typeof func === 'object' && func !== null) {
        funcStr = (func as {name?: string;}).name || JSON.stringify(func);
      } else {
        funcStr = String(func);
      }
      const lower = funcStr.toLowerCase().trim();

      // Direkte Schlüssel-Matches prüfen
      if (priorityMap[lower] !== undefined && priorityMap[lower] < bestPriority) {
        bestPriority = priorityMap[lower];
        bestMatch = lower;
        continue;
      }

      // Flexible Matches für Varianten (inkl. Umlaute)
      if ((lower.includes('schrift') || lower.includes('schriftf')) && 4 < bestPriority) {
        bestPriority = 4;
        bestMatch = 'schriftfuehrer';
      } else if (lower.includes('kassier') && 3 < bestPriority) {
        bestPriority = 3;
        bestMatch = 'kassier';
      } else if (lower.includes('zeugwart') && 5 < bestPriority) {
        bestPriority = 5;
        bestMatch = 'zeugwart';
      } else if (lower.includes('zugskommandant') && 6 < bestPriority) {
        bestPriority = 6;
        bestMatch = 'zugskommandant';
      } else if (lower.includes('gruppenkommandant') && 7 < bestPriority) {
        bestPriority = 7;
        bestMatch = 'gruppenkommandant';
      } else if ((lower === 'jugendwartstv' || lower === 'jugendbetreuer_stv' || lower.includes('jugend') && lower.includes('stv')) && 8 < bestPriority) {
        bestPriority = 8;
        bestMatch = 'jugendwartstv';
      } else if ((lower.includes('jugendwart') || lower.includes('jugendbetreuer')) && !lower.includes('stv') && 9 < bestPriority) {
        bestPriority = 9;
        bestMatch = 'jugendbetreuer';
      } else if (lower.includes('atemschutz') && 10 < bestPriority) {
        bestPriority = 10;
        bestMatch = 'atemschutzwart';
      } else if ((lower.startsWith('kdt') || lower.includes('stellvertreter')) && (lower.includes('stv') || lower.includes('stellvertreter')) && 2 < bestPriority) {
        bestPriority = 2;
        bestMatch = 'kdt_stellvertreter';
      } else if (lower.includes('kommandant') && !lower.includes('gruppen') && !lower.includes('zugs') && !lower.includes('mitglied') && 1 < bestPriority) {
        bestPriority = 1;
        bestMatch = 'kommandant';
      } else if ((lower.includes('erweitertes_kommando') || lower.includes('erweitertes kommando') || lower === 'erweitertes_kommando') && 50 < bestPriority) {
        bestPriority = 50;
        bestMatch = 'erweitertes_kommando';
      } else if (lower === 'kommandomitglied' && 100 < bestPriority) {
        bestPriority = 100;
        bestMatch = 'kommandomitglied';
      }
    }

    // Display-Namen zurückgeben
    const displayNames: {[key: string]: string;} = {
      'kommandant': 'Kommandant',
      'kdt_stellvertreter': 'Kdt-Stellvertreter',
      'kassier': 'Kassier',
      'schriftfuehrer': 'Schriftführer',
      'zeugwart': 'Zeugwart',
      'zugskommandant': 'Zugskommandant',
      'gruppenkommandant': 'Gruppenkommandant',
      'jugendwartstv': 'Jugendbetreuer Stv.',
      'jugendbetreuer_stv': 'Jugendbetreuer Stv.',
      'jugendwart': 'Jugendbetreuer',
      'jugendbetreuer': 'Jugendbetreuer',
      'atemschutzwart': 'Atemschutzwart',
      'funkbeauftragter': 'Funkbeauftragter',
      'erweitertes_kommando': 'Erweitertes Kommando',
      'kommandomitglied': 'Kommandomitglied'
    };

    if (bestMatch && displayNames[bestMatch]) {
      return displayNames[bestMatch];
    }

    // Fallback: erste Funktion formatiert
    if (profileFunctions.length > 0) {
      const firstFunc = profileFunctions[0];
      const funcStr = typeof firstFunc === 'object' ? (firstFunc as {name?: string;}).name || '' : String(firstFunc);
      return funcStr.split(/[_\s-]/).map((word) =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }

    return '';
  }, []);

  // Get category key from profile functions
  const getProfileCategoryKey = useCallback((profileFunctions: string[] | null): string => {
    if (!profileFunctions || profileFunctions.length === 0) return 'allfaelliges';

    for (const func of profileFunctions) {
      const key = normalizeToCategoryKey(func);
      if (key !== 'allfaelliges') return key;
    }
    return 'allfaelliges';
  }, []);

  // Get sort index based on meeting type - uses same priority logic as getProfileDisplayFunction
  const getSortIndex = useCallback((functions: string[] | null | undefined, meetingType: string): number => {
    if (!functions) return 999;

    // Finde die beste Funktion (höchste Priorität = niedrigste Zahl)
    let bestFunc = '';
    let bestPriority = 999;

    for (const func of functions) {
      // Handle wenn func ein Objekt ist
      let funcStr: string;
      if (typeof func === 'object' && func !== null) {
        funcStr = (func as {name?: string;}).name || '';
      } else {
        funcStr = String(func);
      }
      const lower = funcStr.toLowerCase().trim();

      // Direkte Schlüssel-Matches
      const directMatches: {[key: string]: [string, number];} = {
        'kommandant': ['kommandant', 1],
        'kdt_stellvertreter': ['stellvertreter', 2],
        'kassier': ['kassier', 3],
        'schriftfuehrer': ['schriftfuehrer', 4],
        'zeugwart': ['zeugwart', 5],
        'zugskommandant': ['zugskommandant', 6],
        'gruppenkommandant': ['gruppenkommandant', 7],
        'jugendwartstv': ['jugendbetreuer', 8],
        'jugendbetreuer_stv': ['jugendbetreuer', 8],
        'jugendwart': ['jugendbetreuer', 9],
        'jugendbetreuer': ['jugendbetreuer', 9],
        'atemschutzwart': ['atemschutz', 10],
        'erweitertes_kommando': ['erweitertes', 50],
        'kommandomitglied': ['kommandomitglied', 100]
      };

      if (directMatches[lower] && directMatches[lower][1] < bestPriority) {
        [bestFunc, bestPriority] = directMatches[lower];
        continue;
      }

      // Flexible Matches (inkl. Umlaute)
      if ((lower.includes('schrift') || lower.includes('schriftf')) && 4 < bestPriority) {
        bestFunc = 'schriftfuehrer';bestPriority = 4;
      } else if (lower.includes('kassier') && 3 < bestPriority) {
        bestFunc = 'kassier';bestPriority = 3;
      } else if (lower.includes('zeugwart') && 5 < bestPriority) {
        bestFunc = 'zeugwart';bestPriority = 5;
      } else if (lower.includes('zugskommandant') && 6 < bestPriority) {
        bestFunc = 'zugskommandant';bestPriority = 6;
      } else if (lower.includes('gruppenkommandant') && 7 < bestPriority) {
        bestFunc = 'gruppenkommandant';bestPriority = 7;
      } else if ((lower === 'jugendwartstv' || lower === 'jugendbetreuer_stv' || lower.includes('jugend') && lower.includes('stv')) && 8 < bestPriority) {
        bestFunc = 'jugendbetreuer';bestPriority = 8;
      } else if ((lower.includes('jugendwart') || lower.includes('jugendbetreuer')) && !lower.includes('stv') && 9 < bestPriority) {
        bestFunc = 'jugendbetreuer';bestPriority = 9;
      } else if (lower.includes('atemschutz') && 10 < bestPriority) {
        bestFunc = 'atemschutz';bestPriority = 10;
      } else if ((lower.startsWith('kdt') || lower.includes('stellvertreter')) && (lower.includes('stv') || lower.includes('stellvertreter')) && 2 < bestPriority) {
        bestFunc = 'stellvertreter';bestPriority = 2;
      } else if (lower.includes('kommandant') && !lower.includes('gruppen') && !lower.includes('zugs') && !lower.includes('mitglied') && 1 < bestPriority) {
        bestFunc = 'kommandant';bestPriority = 1;
      } else if ((lower.includes('erweitertes_kommando') || lower.includes('erweitertes kommando') || lower === 'erweitertes_kommando') && 50 < bestPriority) {
        bestFunc = 'erweitertes';bestPriority = 50;
      }
    }

    // Sortier-Reihenfolge pro Sitzungstyp
    const kommandoOrder = ['kommandant', 'stellvertreter', 'kassier', 'schriftfuehrer', 'zeugwart', 'zugskommandant'];
    const erweitertOrder = ['kommandant', 'stellvertreter', 'kassier', 'schriftfuehrer', 'zeugwart', 'zugskommandant', 'gruppenkommandant', 'jugendbetreuer', 'atemschutz', 'funkbeauftragter', 'erweitertes'];

    const sortOrder = meetingType === 'kommandositzung' ? kommandoOrder : erweitertOrder;
    const idx = sortOrder.indexOf(bestFunc);

    return idx >= 0 ? idx : 999;
  }, []);

  // People from attendance list with their items
  const peopleWithItems = useMemo(() => {
    if (!meeting) return [];

    // Build list of people: use kommandomitglieder
    const people = kommandomitglieder.map((person) => {
      const categoryKey = getProfileCategoryKey(person.functions);
      const displayFunction = getProfileDisplayFunction(person.functions);

      // Get items for this person - filtered by submitted_by (each person sees only their own items)
      // EXCLUDE items in Allfälliges - those are shown separately
      const items = agendaItems.filter((item) => {
        if (item.is_fixed_item) return false;
        // Item must be created by this person AND not in Allfälliges
        const itemCategoryKey = normalizeToCategoryKey(item.category || '');
        return item.submitted_by === person.id && itemCategoryKey !== 'allfaelliges';
      });

      return {
        id: person.id,
        name: person.full_name || 'Unbekannt',
        function: displayFunction,
        categoryKey,
        items,
        sortIndex: getSortIndex(person.functions, meeting.meeting_type),
        isAdditional: false
      };
    });

    // Sort by the meeting-type-specific order
    people.sort((a, b) => a.sortIndex - b.sortIndex);

    // Add additional attendees (manually added members) with their own categories
    additionalAttendees.forEach((person) => {
      const categoryKey = `zusatz_${person.id}`;
      const displayFunction = getProfileDisplayFunction(person.functions);

      // Get items for this additional person
      const items = agendaItems.filter((item) => {
        if (item.is_fixed_item) return false;
        return item.category === categoryKey;
      });

      people.push({
        id: person.id,
        name: person.full_name || 'Unbekannt',
        function: displayFunction ? `${displayFunction} (Gast)` : 'Gast',
        categoryKey,
        items,
        sortIndex: 900, // Before Allfälliges but after regular members
        isAdditional: true
      });
    });

    // Re-sort to include additional attendees
    people.sort((a, b) => a.sortIndex - b.sortIndex);

    // Add "Allfälliges" as special entry at the end
    const allfaelligesItems = agendaItems.filter((item) => {
      if (item.is_fixed_item) return false;
      const itemCategoryKey = normalizeToCategoryKey(item.category || '');
      return itemCategoryKey === 'allfaelliges';
    });

    people.push({
      id: 'allfaelliges',
      name: 'Allfälliges',
      function: '',
      categoryKey: 'allfaelliges',
      items: allfaelligesItems,
      sortIndex: 1000,
      isAdditional: false
    });

    return people;
  }, [kommandomitglieder, agendaItems, getProfileCategoryKey, getProfileDisplayFunction, meeting, getSortIndex, additionalAttendees]);

  // Auto-expand people with items on load
  useEffect(() => {
    const peopleWithEntries = new Set<string>();
    peopleWithItems.forEach((person) => {
      if (person.items.length > 0) {
        peopleWithEntries.add(person.id);
      }
    });
    setExpandedCategories(peopleWithEntries);
  }, [peopleWithItems]);

  // Legacy: keep for compatibility
  const groupedAgendaItems = useMemo(() => {
    const groups: Record<string, {profile: typeof profiles[0] | null;items: MeetingAgendaItem[];}> = {};

    agendaItems.filter((item) => !item.is_fixed_item).forEach((item) => {
      const submitterProfile = profiles.find((p) => p.id === item.submitted_by);
      const categoryKey = normalizeToCategoryKey(item.category || '');
      const functionName = CATEGORY_DISPLAY_NAMES[categoryKey] || 'Allfälliges';

      if (!groups[functionName]) {
        groups[functionName] = { profile: submitterProfile || null, items: [] };
      }
      groups[functionName].items.push(item);
    });

    // Sort groups by function order
    return Object.entries(groups).sort(([a], [b]) => {
      const aIdx = FUNCTION_ORDER.findIndex((f) => a.toLowerCase().includes(f.toLowerCase()));
      const bIdx = FUNCTION_ORDER.findIndex((f) => b.toLowerCase().includes(f.toLowerCase()));
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });
  }, [agendaItems, profiles]);

  // Stats
  const stats = useMemo(() => {
    const behandelt = agendaItems.filter((i) => i.status === 'behandelt' || i.traffic_light === 'gruen').length;
    const offen = agendaItems.filter((i) => i.status === 'offen' && i.traffic_light !== 'gruen').length;
    const verschoben = agendaItems.filter((i) => i.deferred_to_meeting_id).length;
    return { behandelt, offen, verschoben, beschluesse: decisions.length };
  }, [agendaItems, decisions]);

  // Voting members for decisions
  const votingMembers = useMemo(() => {
    return attendance.filter((a) => a.is_voting_member && (a.status === 'anwesend' || a.status === 'remote'));
  }, [attendance]);

  // Register decisions (filtered)
  const registerDecisions = useMemo(() => {
    return decisions.filter((d) => {
      if (!registerSearch) return true;
      return d.decision_text.toLowerCase().includes(registerSearch.toLowerCase()) ||
      d.decision_number?.toLowerCase().includes(registerSearch.toLowerCase());
    });
  }, [decisions, registerSearch]);

  const getFunctionDisplayName = (profileData: typeof profiles[0]) => {
    const funcs = profileData.functions || [];

    // Normalisiere für Vergleich (umlaute + lowercase)
    const normalize = (s: string) => s.toLowerCase().
    replace(/ü/g, 'ue').replace(/ö/g, 'oe').replace(/ä/g, 'ae').replace(/ß/g, 'ss');

    // Spezifische Funktionen zuerst prüfen
    for (const fn of funcs) {
      const lower = fn.toLowerCase();
      const normalized = normalize(fn);

      if (lower === 'kommandomitglied') continue;

      // Explizite Matches
      if (lower.includes('kdt') && (lower.includes('stv') || lower.includes('stellvertreter'))) return 'Kdt-Stellvertreter';
      if (lower === 'kdt_stellvertreter' || lower === 'kdt-stellvertreter') return 'Kdt-Stellvertreter';
      if (lower.includes('kommandant') && !lower.includes('gruppen') && !lower.includes('zugs') && !lower.includes('mitglied')) return 'Kommandant';
      if (lower.includes('kassier')) return 'Kassier';
      if (normalized.includes('schrift') || lower.includes('schrift')) return 'Schriftführer';
      if (lower.includes('zeugwart')) return 'Zeugwart';
      if (lower.includes('zugskommandant')) return 'Zugskommandant';
      if (lower.includes('gruppenkommandant')) return 'Gruppenkommandant';
      if (lower === 'jugendwartstv' || lower === 'jugendwart_stv') return 'Jugendbetreuer Stv.';
      if (lower.includes('jugendwart') || lower.includes('jugendbetreuer')) return 'Jugendbetreuer';
      if (lower.includes('atemschutz')) return 'Atemschutzwart';
      if (lower.includes('funkbeauftragter')) return 'Funkbeauftragter';
      if (lower.includes('einsatzleiter')) return 'Einsatzleiter';
      if (lower.includes('erweitertes')) return 'Erweitertes Kommando';
    }

    // Fallback: Kommandomitglied wenn vorhanden
    if (funcs.some((fn) => fn.toLowerCase() === 'kommandomitglied')) {
      return 'Kommandomitglied';
    }
    return funcs[0] || 'Mitglied';
  };

  const getAttendanceForProfile = (profileId: string) => {
    return attendance.find((a) => a.profile_id === profileId);
  };

  const handleAttendanceChange = async (profileId: string, status: AttendanceStatus, profileData: typeof profiles[0]) => {
    // Toggle-Verhalten: Wenn der gleiche Status erneut geklickt wird, Auswahl zurücksetzen
    const currentAttendance = getAttendanceForProfile(profileId);
    if (currentAttendance?.status === status) {
      // Gleicher Status -> Zurücksetzen (Eintrag entfernen)
      await removeAttendance(profileId);
    } else {
      // Neuer Status -> Setzen
      await updateAttendance(profileId, status, { functions: profileData.functions, role: profileData.role });
    }
  };

  const getVotesForDecision = (decisionId: string) => {
    return decisionVotes.filter((v) => v.decision_id === decisionId);
  };

  const getVoteForMember = (decisionId: string, profileId: string) => {
    return decisionVotes.find((v) => v.decision_id === decisionId && v.profile_id === profileId);
  };

  if (loading) {
    return (
      <Layout>
        <div data-ev-id="ev_e39ab8a2b0" className="flex items-center justify-center h-64">
          <div data-ev-id="ev_36b7f8925c" className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>);

  }

  if (error || !meeting) {
    return (
      <Layout>
        <div data-ev-id="ev_9118b3b701" className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p data-ev-id="ev_55f5506015" className="text-muted-foreground">{error || 'Sitzung nicht gefunden'}</p>
          <Link to="/sitzungen" className="text-primary hover:underline mt-4 inline-block">Zurück zur Übersicht</Link>
        </div>
      </Layout>);
  }

  // Access denied - user is neither a member nor invited
  if (!hasAccess) {
    return (
      <Layout>
        <div data-ev-id="ev_access_denied_detail" className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div data-ev-id="ev_access_icon" className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 data-ev-id="ev_access_title" className="text-xl font-semibold mb-2">Kein Zugriff</h2>
          <p data-ev-id="ev_access_desc" className="text-muted-foreground max-w-md mb-4">
            Sie haben keine Berechtigung, diese Sitzung zu öffnen.
            Wenn Sie als Gast eingeladen werden, erhalten Sie automatisch Zugriff.
          </p>
          <Link to="/sitzungen" className="text-primary hover:underline">Zurück zur Übersicht</Link>
        </div>
      </Layout>);
  }

  return (
    <Layout>
      {/* Header */}
      <div data-ev-id="ev_57bf388276" className="bg-primary text-primary-foreground rounded-t-xl p-4 flex items-center justify-between">
        <div data-ev-id="ev_24f77b4733" className="flex items-center gap-4">
          <Link to="/sitzungen" className="hover:opacity-80">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div data-ev-id="ev_1b29570433">
            <h1 data-ev-id="ev_0fe138ee08" className="text-xl font-bold">
              {meeting.meeting_type === 'kommandositzung' ? 'Kommandositzung' : 'Erweitertes Kommando'}
            </h1>
            <p data-ev-id="ev_3ff8b651c1" className="text-sm opacity-90">
              Protokoll-Nr.: {meeting.meeting_number} - {formatDate(meeting.scheduled_date)}
            </p>
          </div>
        </div>
        <div data-ev-id="ev_b2cd97b035" className="flex items-center gap-2">
          <button data-ev-id="ev_43c46d7752" onClick={() => window.location.reload()} className="px-3 py-1.5 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition-colors flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" /> Aktualisieren
          </button>
          {/* Pause Timer */}
          {pauseTimerRunning ?
          <div data-ev-id="ev_4920e938e8" className="px-3 py-1.5 bg-amber-500 rounded-lg text-sm flex items-center gap-2 font-mono">
                <Clock className="w-4 h-4" />
                <span data-ev-id="ev_a8d149183a">{formatTimerTime(pauseTimerSeconds)}</span>
                <button data-ev-id="ev_b93dc569a0"
            onClick={() => setPauseTimerRunning(false)}
            className="ml-1 hover:bg-amber-600 rounded p-0.5"
            title="Timer pausieren">

                  <X className="w-3 h-3" />
                </button>
              </div> :

          <button data-ev-id="ev_4ffe6840c7"
          onClick={() => {
            setPauseTimerSeconds(90 * 60);
            setPauseTimerRunning(true);
          }}
          className="px-3 py-1.5 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition-colors flex items-center gap-1.5"
          title="90-Minuten Pause-Timer starten">

                <Clock className="w-4 h-4" /> Timer
              </button>
          }
          {pauseCount > 0 && !pauseTimerRunning && !showPausePopup &&
          <div data-ev-id="ev_e909395e64" className="px-3 py-1.5 bg-green-500 rounded-lg text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> {pauseCount} Pause{pauseCount > 1 ? 'n' : ''}
            </div>
          }
          {/* Bearbeiten-Button für Admin/Kommandant wenn nicht abgeschlossen */}
          {canEditMeetingDetails && meeting.status !== 'abgeschlossen' &&
          <button data-ev-id="ev_fe05d3d946"
          onClick={startEditingMeetingDetails}
          className="px-3 py-1.5 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition-colors flex items-center gap-1.5">
            <Edit2 className="w-4 h-4" /> Bearbeiten
          </button>
          }
          {/* Löschen-Button nur für Admin wenn nicht abgeschlossen */}
          {canDeleteMeeting && meeting.status !== 'abgeschlossen' &&
          <button data-ev-id="ev_6adb44e32c"
          onClick={() => setShowDeleteMeetingConfirm(true)}
          className="px-3 py-1.5 bg-red-500/80 rounded-lg text-sm hover:bg-red-500 transition-colors flex items-center gap-1.5">
            <Trash2 className="w-4 h-4" /> Löschen
          </button>
          }
          {canManage && meeting.status !== 'abgeschlossen' &&
          <>
              <button data-ev-id="ev_e1925b9a3b"
            onClick={async () => {
              if (isDeadlinePassed()) {
                // Unlock: Reset deadline to 24 hours before meeting
                if (!confirm('Sitzung für Einträge wieder öffnen?')) return;
                await updateMeeting(meeting.id, { entry_deadline_hours: 24 });
              } else {
                // Lock: Set deadline to far past (99999 hours = always passed)
                if (!confirm('Sitzung für weitere Einträge sperren? Nur Kommandant/Admin können dann noch Einträge hinzufügen.')) return;
                await updateMeeting(meeting.id, { entry_deadline_hours: 99999 });
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
            isDeadlinePassed() ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-white/20 hover:bg-white/30'}`
            }>
                {isDeadlinePassed() ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {isDeadlinePassed() ? 'Entsperren' : 'Sperren'}
              </button>
              <button data-ev-id="ev_b454d69442"
            onClick={() => setActiveTab('abschluss')}
            className="px-3 py-1.5 bg-white rounded-lg text-sm text-primary font-medium hover:bg-white/90 transition-colors flex items-center gap-1.5">
                <Flag className="w-4 h-4" /> Abschließen
              </button>
            </>
          }
        </div>
      </div>

      {/* Tabs */}
      <div data-ev-id="ev_e01eb7ae21" className="bg-card border-x border-border">
        <div data-ev-id="ev_fa19fa4f7e" className="flex gap-1 p-2">
          {[
          { id: 'uebersicht', label: 'Übersicht', icon: ClipboardList },
          { id: 'eintraege', label: 'Einträge', icon: Edit2 },
          { id: 'beschluesse', label: 'Beschlüsse', icon: Vote },
          { id: 'register', label: 'Register', icon: BookOpen },
          { id: 'abschluss', label: 'Abschluss', icon: Flag }].
          map((tab) =>
          <button data-ev-id="ev_66fd5e6b72"
          key={tab.id}
          onClick={() => setActiveTab(tab.id as Tab)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
          activeTab === tab.id ?
          'bg-primary text-primary-foreground' :
          'text-muted-foreground hover:bg-muted'}`
          }>

              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div data-ev-id="ev_d8f5a81636" className="bg-card border-x border-border px-4 py-3">
        <div data-ev-id="ev_78c4776944" className="flex items-center gap-6 text-sm">
          <div data-ev-id="ev_0a562c2842" className="flex items-center gap-2">
            <span data-ev-id="ev_1cec657b35" className="text-muted-foreground">Beschlussfähig</span>
            <span data-ev-id="ev_f612750be7" className={`font-bold ${quorum.isQuorate ? 'text-emerald-600' : 'text-red-600'}`}>
              {quorum.isQuorate ? 'Ja' : 'Nein'}
            </span>
          </div>
          <div data-ev-id="ev_9b531d5f44" className="flex items-center gap-2">
            <span data-ev-id="ev_4d679b8ff9" className="text-muted-foreground">Stimmberechtigt</span>
            <span data-ev-id="ev_3daf257003" className="font-bold">{quorum.votingMembersPresent}/{quorum.totalVotingMembers}</span>
          </div>
          <div data-ev-id="ev_a11fb75825" className="flex items-center gap-2">
            <span data-ev-id="ev_ba2d47a94c" className="text-muted-foreground">Offen</span>
            <span data-ev-id="ev_a925edfbd0" className="font-bold text-amber-600">{stats.offen}</span>
          </div>
          <div data-ev-id="ev_090380718c" className="flex items-center gap-2">
            <span data-ev-id="ev_068a206aa6" className="text-muted-foreground">Behandelt</span>
            <span data-ev-id="ev_95046b3c62" className="font-bold text-emerald-600">{stats.behandelt}</span>
          </div>
          <div data-ev-id="ev_604a05b04f" className="flex items-center gap-2">
            <span data-ev-id="ev_38db353fcf" className="text-muted-foreground">Verschoben</span>
            <span data-ev-id="ev_3be5d9e0a8" className="font-bold">{stats.verschoben}</span>
          </div>
          <div data-ev-id="ev_11763d617d" className="flex items-center gap-2">
            <span data-ev-id="ev_a06acf0046" className="text-muted-foreground">Beschlüsse</span>
            <span data-ev-id="ev_a27ec47e32" className="font-bold">{stats.beschluesse}</span>
          </div>
        </div>
      </div>

      {/* Quorum Info */}
      <div data-ev-id="ev_f9a4420c70" className={`border-x border-border px-4 py-2 text-sm ${
      quorum.isQuorate ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`
      }>
        <CheckCircle2 className="w-4 h-4 inline mr-2" />
        <span data-ev-id="ev_a81aa82bd2" className="font-medium">Beschlussfähig</span> - {quorum.votingMembersPresent} von {quorum.totalVotingMembers} anwesend
      </div>

      {/* Status Info */}
      <div data-ev-id="ev_e9262321af" className="bg-muted/30 border-x border-border px-4 py-2 text-sm text-muted-foreground">
        Status: <span data-ev-id="ev_220d0693e8" className="font-medium">{meeting.status === 'geplant' ? 'Vorbereitung' : meeting.status}</span>
        {meeting.next_meeting_date ?
        <> | Nächste Sitzung: {formatDate(meeting.next_meeting_date)}</> :

        <> | Nächste Sitzung: Noch nicht festgelegt</>
        }
      </div>

      {/* Content */}
      <div data-ev-id="ev_93bbd12140" className="bg-card border border-border rounded-b-xl p-4">

        {/* ÜBERSICHT TAB */}
        {activeTab === 'uebersicht' &&
        <div data-ev-id="ev_196a22c870" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tagesordnung */}
            <div data-ev-id="ev_ee3d6b59a3">
              <div data-ev-id="ev_d6aef8bfda" className="flex items-center justify-between mb-3">
                <h3 data-ev-id="ev_cf7175fc5c" className="font-semibold flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" /> Tagesordnung
                </h3>
                <span data-ev-id="ev_9ddce4ee55" className="text-sm text-muted-foreground">
                  {checkedAgendaItems.size}/{fixedAgendaItems.length} erledigt
                </span>
              </div>
              <div data-ev-id="ev_bdc4d96f18" className="space-y-1">
                {fixedAgendaItems.map((item) => {
                const isChecked = checkedAgendaItems.has(item.id);
                return (
                  <div data-ev-id="ev_50f5123ba1"
                  key={item.id}
                  className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
                  isChecked ? 'bg-emerald-50 border border-emerald-200' : 'bg-muted/30'}`
                  }>

                      <div data-ev-id="ev_0090e810d1" className="flex items-center gap-3">
                        {/* Checkbox for Kommandant */}
                        {canManage ?
                      <button data-ev-id="ev_01970d2e77"
                      onClick={() => {
                        setCheckedAgendaItems((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.id)) {
                            next.delete(item.id);
                          } else {
                            next.add(item.id);
                          }
                          return next;
                        });
                      }}
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                      isChecked ?
                      'bg-emerald-500 border-emerald-600 text-white' :
                      'border-gray-300 hover:border-primary'}`
                      }>

                            {isChecked && <CheckCircle2 className="w-4 h-4" />}
                          </button> :

                      <span data-ev-id="ev_2ee30797d8" className={`w-6 h-6 rounded-full text-sm font-medium flex items-center justify-center ${
                      isChecked ?
                      'bg-emerald-500 text-white' :
                      'bg-primary/10 text-primary'}`
                      }>
                            {isChecked ? <CheckCircle2 className="w-4 h-4" /> : item.sort_order}
                          </span>
                      }
                        <span data-ev-id="ev_275978c7c4" className={`text-sm ${
                      isChecked ? 'text-emerald-700 line-through' : ''}`
                      }>
                          {item.title}
                        </span>
                        {item.is_mandatory &&
                      <span data-ev-id="ev_5e9a28f60f" className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Pflicht</span>
                      }
                      </div>
                      <span data-ev-id="ev_9a384cc7eb" className={`text-xs ${
                    isChecked ? 'text-emerald-600' : 'text-muted-foreground'}`
                    }>
                        {isChecked ? '✓ Erledigt' : ''}
                      </span>
                    </div>);

              })}
              </div>
            </div>

            {/* Anwesenheit */}
            <div data-ev-id="ev_9ed19b8153">
              <div data-ev-id="ev_cbde151c53" className="flex items-center justify-between mb-3">
                <h3 data-ev-id="ev_7cd7628e2f" className="font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5" /> Anwesenheit
                </h3>
                <div data-ev-id="ev_attendance_actions" className="flex items-center gap-3">
                  <span data-ev-id="ev_37dcda3b29" className="text-sm text-muted-foreground">
                    {attendance.filter((a) => a.status === 'anwesend' || a.status === 'remote').length} anwesend
                  </span>
                  {canManage && <button
                  data-ev-id="ev_add_member_btn"
                  onClick={() => setShowAddMemberModal(true)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">

                    <UserPlus className="w-3 h-3" /> Mitglied hinzufügen
                  </button>}
                </div>
              </div>
              <div data-ev-id="ev_66a4990cfb" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {kommandomitglieder.map((member) => {
                const att = getAttendanceForProfile(member.id);
                const isPresent = att?.status === 'anwesend' || att?.status === 'remote';
                const functionName = getFunctionDisplayName(member);

                return (
                  <div data-ev-id="ev_950a1ef836"
                  key={member.id}
                  className={`p-3 rounded-lg border ${
                  isPresent ? 'bg-emerald-50 border-emerald-200' : 'bg-card border-border'}`
                  }>

                      <div data-ev-id="ev_09a43f1ca6" className="font-medium text-sm">{member.full_name}</div>
                      <div data-ev-id="ev_d0a365e343" className="text-xs text-muted-foreground mb-2">
                        {functionName}
                        {att?.is_voting_member || isKommandomitglied(member.functions) ?
                      <span data-ev-id="ev_1af207555e" className="ml-1 text-emerald-600 font-medium">- stimmberechtigt</span> :
                      meeting.meeting_type === 'erweitertes_kommando' && !isKommandomitglied(member.functions) ?
                      <span data-ev-id="ev_ea09cd078f" className="ml-1 text-amber-600">- beratend</span> :
                      null}
                      </div>
                      {canManage &&
                    <div data-ev-id="ev_18767079c7" className="flex flex-col gap-2">
                          <div data-ev-id="ev_ba817fd7eb" className="flex gap-1 flex-wrap">
                            {['anwesend', 'remote', 'entschuldigt', 'unentschuldigt'].map((status) =>
                        <button data-ev-id="ev_361b7aedf0"
                        key={status}
                        onClick={() => handleAttendanceChange(member.id, status as AttendanceStatus, member)}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                        att?.status === status ?
                        status === 'anwesend' ? 'bg-emerald-600 text-white border-emerald-600' :
                        status === 'remote' ? 'bg-blue-600 text-white border-blue-600' :
                        status === 'entschuldigt' ? 'bg-amber-600 text-white border-amber-600' :
                        'bg-red-600 text-white border-red-600' :
                        'bg-card border-border hover:bg-muted'}`
                        }>

                                {status === 'anwesend' ? 'Anwesend' :
                          status === 'remote' ? 'Remote' :
                          status === 'entschuldigt' ? 'Entsch.' : 'Unentsch.'}
                              </button>
                        )}
                          </div>
                          {/* Stimmrecht-Checkbox für beratende Mitglieder im erweiterten Kommando */}
                          {meeting.meeting_type === 'erweitertes_kommando' &&
                      !isKommandomitglied(member.functions) &&
                      <label data-ev-id="ev_921c1d868c" className="flex items-center gap-2 text-xs cursor-pointer">
                              <input data-ev-id="ev_f001872807"
                        type="checkbox"
                        checked={att?.is_voting_member || false}
                        onChange={(e) => {
                          // Update voting member status
                          updateAttendance(member.id, att?.status || 'anwesend', {
                            functions: member.functions,
                            role: member.role,
                            forceVotingMember: e.target.checked
                          });
                        }}
                        className="rounded border-border" />

                              <span data-ev-id="ev_39084228ef" className="text-muted-foreground">Stimmrecht erteilen</span>
                            </label>
                      }
                        </div>
                    }
                    </div>);

              })}
                
                {/* Additional Attendees (manually added) */}
                {additionalAttendees.length > 0 && <>
                  <div data-ev-id="ev_additional_sep" className="col-span-full border-t border-dashed border-border mt-2 pt-3">
                    <span data-ev-id="ev_43b65f481e" className="text-xs text-muted-foreground font-medium">Zusätzliche Teilnehmer</span>
                  </div>
                  {additionalAttendees.map((member) => {
                  const att = member.attendanceRecord;
                  const isPresent = att?.status === 'anwesend' || att?.status === 'remote';
                  const functionName = getFunctionDisplayName(member);

                  return (
                    <div data-ev-id="ev_additional_member"
                    key={member.id}
                    className={`p-3 rounded-lg border ${
                    isPresent ? 'bg-blue-50 border-blue-200' : 'bg-card border-border'}`
                    }>
                        <div data-ev-id="ev_b95dc90153" className="font-medium text-sm">{member.full_name}</div>
                        <div data-ev-id="ev_55866ea8eb" className="text-xs text-muted-foreground mb-2">
                          {functionName || 'Mitglied'}
                          {att?.is_voting_member ?
                        <span data-ev-id="ev_77be828602" className="ml-1 text-emerald-600 font-medium">- stimmberechtigt</span> :
                        <span data-ev-id="ev_d32da8cf78" className="ml-1 text-blue-600">- Gast</span>
                        }
                        </div>
                        {canManage &&
                      <div data-ev-id="ev_91b367a78b" className="flex flex-col gap-2">
                            <div data-ev-id="ev_df69dd2ec1" className="flex gap-1 flex-wrap">
                              {['anwesend', 'remote', 'entschuldigt', 'unentschuldigt'].map((status) =>
                          <button data-ev-id="ev_ba44f8d5e5"
                          key={status}
                          onClick={() => handleAttendanceChange(member.id, status as AttendanceStatus, member)}
                          className={`px-2 py-1 text-xs rounded border transition-colors ${
                          att?.status === status ?
                          status === 'anwesend' ? 'bg-emerald-600 text-white border-emerald-600' :
                          status === 'remote' ? 'bg-blue-600 text-white border-blue-600' :
                          status === 'entschuldigt' ? 'bg-amber-600 text-white border-amber-600' :
                          'bg-red-600 text-white border-red-600' :
                          'bg-card border-border hover:bg-muted'}`
                          }>
                                  {status === 'anwesend' ? 'Anwesend' :
                            status === 'remote' ? 'Remote' :
                            status === 'entschuldigt' ? 'Entsch.' : 'Unentsch.'}
                                </button>
                          )}
                            </div>
                            <label data-ev-id="ev_70cd795d17" className="flex items-center gap-2 text-xs cursor-pointer">
                              <input data-ev-id="ev_149a1b54e2"
                          type="checkbox"
                          checked={att?.is_voting_member || false}
                          onChange={(e) => {
                            updateAttendance(member.id, att?.status || 'anwesend', {
                              functions: member.functions,
                              role: member.role,
                              forceVotingMember: e.target.checked
                            });
                          }}
                          className="rounded border-border" />
                              <span data-ev-id="ev_0bba3e3aa9" className="text-muted-foreground">Stimmrecht erteilen</span>
                            </label>
                            <button data-ev-id="ev_a8b2113d70"
                        onClick={() => removeAttendance(member.id)}
                        className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 mt-1"
                        title="Teilnehmer entfernen">

                              <Trash2 className="w-3 h-3" />
                              <span data-ev-id="ev_e0a96450e1">Entfernen</span>
                            </button>
                          </div>
                      }
                      </div>);

                })}
                </>}
              </div>
            </div>
          </div>
        }

        {/* Add Member Modal */}
        {showAddMemberModal &&
        <div data-ev-id="ev_c3ec42121f" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div data-ev-id="ev_c856265126" className="bg-card rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
              <div data-ev-id="ev_3204cfab6b" className="flex items-center justify-between mb-4">
                <h3 data-ev-id="ev_43cae8147f" className="font-semibold text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5" /> Mitglied zur Sitzung hinzufügen
                </h3>
                <button data-ev-id="ev_459d3abd8b" onClick={() => setShowAddMemberModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div data-ev-id="ev_cbb2201d4c" className="space-y-4">
                <div data-ev-id="ev_de24a0c05b">
                  <label data-ev-id="ev_32ffeb297f" className="block text-sm font-medium mb-1">Mitglied auswählen</label>
                  <select data-ev-id="ev_389ba6f89b"
                value={selectedMemberToAdd}
                onChange={(e) => setSelectedMemberToAdd(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background">

                    <option data-ev-id="ev_642ec98978" value="">-- Bitte wählen --</option>
                    {availableMembersToAdd.map((p) =>
                  <option data-ev-id="ev_1809ab4b3d" key={p.id} value={p.id}>
                        {p.full_name} {p.functions?.length ? `(${p.functions[0]})` : ''}
                      </option>
                  )}
                  </select>
                </div>
                
                <label data-ev-id="ev_55c0d8a1cf" className="flex items-center gap-2 cursor-pointer">
                  <input data-ev-id="ev_d2ee779091"
                type="checkbox"
                checked={addMemberWithVoting}
                onChange={(e) => setAddMemberWithVoting(e.target.checked)}
                className="rounded border-border" />

                  <span data-ev-id="ev_68b28db854" className="text-sm">Mit Stimmrecht</span>
                </label>
                
                <div data-ev-id="ev_4e44df319e" className="flex gap-2 pt-2">
                  <button data-ev-id="ev_4fd21543a9"
                onClick={() => setShowAddMemberModal(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted">

                    Abbrechen
                  </button>
                  <button data-ev-id="ev_bbe349013c"
                onClick={handleAddMemberToAttendance}
                disabled={!selectedMemberToAdd}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">

                    Hinzufügen
                  </button>
                </div>
              </div>
            </div>
          </div>
        }

        {/* EINTRÄGE TAB */}
        {activeTab === 'eintraege' &&
        <div data-ev-id="ev_51b3d36fbf" className="space-y-4">
            {/* Legend */}
            <div data-ev-id="ev_ab4c34940a" className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
              <span data-ev-id="ev_ce358ba143" className="font-medium">Ampel:</span>
              <span data-ev-id="ev_fc6bb2b778" className="flex items-center gap-1">
                <Circle className="w-3 h-3 fill-red-500 text-red-500" /> Rot = Nächste Sitzung
              </span>
              <span data-ev-id="ev_5625316fe0" className="flex items-center gap-1">
                <Circle className="w-3 h-3 fill-amber-500 text-amber-500" /> Gelb = Diese Sitzung
              </span>
              <span data-ev-id="ev_04e2d23ad5" className="flex items-center gap-1">
                <Circle className="w-3 h-3 fill-emerald-500 text-emerald-500" /> Grün = Erledigt
              </span>
            </div>

            {/* People from Attendance List */}
            {peopleWithItems.map((person) => {
            const isExpanded = expandedCategories.has(person.id);
            const hasItems = person.items.length > 0;
            const inputText = categoryInputs[person.id] || '';
            const isAllfaelliges = person.id === 'allfaelliges';

            return (
              <div data-ev-id="ev_8d7aca715d" key={person.id} className="border border-border rounded-xl overflow-hidden">
                  {/* Person Header - always clickable */}
                  <button data-ev-id="ev_c2ef74b730"
                onClick={() => {
                  setExpandedCategories((prev) => {
                    const next = new Set(prev);
                    if (next.has(person.id)) {
                      next.delete(person.id);
                    } else {
                      next.add(person.id);
                    }
                    return next;
                  });
                }}
                className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
                hasItems ? 'bg-primary/10' : 'bg-muted/30 hover:bg-muted/50'}`
                }>

                    <div data-ev-id="ev_b0ad3aafee" className="flex items-center gap-2">
                      {isExpanded ?
                    <ChevronUp className="w-4 h-4 text-muted-foreground" /> :

                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    }
                      <Users className="w-4 h-4 text-primary" />
                      <span data-ev-id="ev_eaf802f9a2" className={`font-semibold ${!hasItems ? 'text-muted-foreground' : ''}`}>
                        {isAllfaelliges ? person.name : `${person.name} (${person.function})`}
                      </span>
                      {person.isAdditional &&
                    <span data-ev-id="ev_bd9581a1c0" className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Zusätzlich</span>
                    }
                      {hasItems &&
                    <span data-ev-id="ev_8cbec1a2c7" className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          {person.items.length}
                        </span>
                    }
                    </div>
                    {person.items.every((i) => i.traffic_light === 'gruen') && hasItems &&
                  <span data-ev-id="ev_90f5bbceb3" className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">erledigt</span>
                  }
                  </button>

                  {/* Expanded Content */}
                  {isExpanded &&
                <div data-ev-id="ev_41d578b040" className="divide-y divide-border">
                      {/* Existing Items */}
                      {person.items.map((item, idx) =>
                  <div data-ev-id="ev_6d6de25a02"
                  key={item.id}
                  className={`px-4 py-3 flex items-start gap-3 ${
                  item.traffic_light === 'rot' ? 'bg-red-50 border-l-4 border-l-red-500' : ''}`
                  }>

                          <span data-ev-id="ev_12b611934b" className="text-xs text-muted-foreground w-6">{idx + 1}.</span>
                          <div data-ev-id="ev_6f6f23293c" className="flex-1">
                            {editingAgendaItem === item.id ?
                      <div data-ev-id="ev_c0ce976929" className="flex flex-col gap-2">
                                <textarea data-ev-id="ev_449611beeb"
                        value={editingAgendaItemText}
                        onChange={(e) => setEditingAgendaItemText(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none"
                        autoFocus />

                                <div data-ev-id="ev_2720e1d7ab" className="flex gap-2">
                                  <button data-ev-id="ev_b7dcebba99"
                          onClick={async () => {
                            if (editingAgendaItemText.trim()) {
                              await updateAgendaItem(item.id, { title: editingAgendaItemText.trim() });
                            }
                            setEditingAgendaItem(null);
                            setEditingAgendaItemText('');
                          }}
                          className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90 flex items-center gap-1">

                                    <Save className="w-3 h-3" /> Speichern
                                  </button>
                                  <button data-ev-id="ev_92fa47e1be"
                          onClick={() => {
                            setEditingAgendaItem(null);
                            setEditingAgendaItemText('');
                          }}
                          className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded hover:bg-muted/80 flex items-center gap-1">

                                    <X className="w-3 h-3" /> Abbrechen
                                  </button>
                                </div>
                              </div> :

                      <>
                                <p data-ev-id="ev_e5e4a8b15a" className={`text-sm whitespace-pre-wrap ${
                        item.traffic_light === 'gruen' ? 'line-through text-muted-foreground' : ''}`
                        }>
                                  {item.title}
                                </p>
                                {item.description &&
                        <p data-ev-id="ev_49e3d4d65f" className={`text-xs text-muted-foreground mt-1 whitespace-pre-wrap ${
                        item.traffic_light === 'gruen' ? 'line-through' : ''}`
                        }>
                                    {item.description}
                                  </p>
                        }
                                {/* Zeige Ersteller-Namen bei Allfälliges */}
                                {isAllfaelliges && item.submitted_by && (() => {
                          const creator = profiles.find((p) => p.id === item.submitted_by);
                          return creator ?
                          <p data-ev-id="ev_creator_name" className="text-xs text-muted-foreground mt-1 italic">
                                      Eingereicht von: {creator.full_name}
                                    </p> :
                          null;
                        })()}
                              </>
                      }
                          </div>
                          <div data-ev-id="ev_7bcbbc5c0b" className="flex items-center gap-2">
                            {/* Status Badge */}
                            {item.traffic_light === 'rot' &&
                      <span data-ev-id="ev_9ff6ca2c8b" className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">vertagt</span>
                      }
                            {item.traffic_light === 'gelb' &&
                      <span data-ev-id="ev_95163d8a0c" className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">unbehandelt</span>
                      }
                            {item.traffic_light === 'gruen' &&
                      <span data-ev-id="ev_bfe65c4212" className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">behandelt</span>
                      }
                            {/* Ampel: Kommandant, Admin ODER Kdt-Stellvertreter */}
                            {canManageTrafficLights &&
                      <>
                                {/* Traffic lights */}
                                <div data-ev-id="ev_74e12542f6" className="flex gap-1">
                                  <button data-ev-id="ev_f592a64f76"
                          onClick={() => updateAgendaItemTrafficLight(item.id, 'rot')}
                          title="Vertagen (nächste Sitzung)"
                          className={`w-4 h-4 rounded-full border-2 ${
                          item.traffic_light === 'rot' ?
                          'bg-red-500 border-red-600' :
                          'border-red-300 hover:border-red-500'}`
                          } />

                                  <button data-ev-id="ev_d5be6c3412"
                          onClick={() => updateAgendaItemTrafficLight(item.id, 'gelb')}
                          title="Unbehandelt"
                          className={`w-4 h-4 rounded-full border-2 ${
                          item.traffic_light === 'gelb' ?
                          'bg-amber-500 border-amber-600' :
                          'border-amber-300 hover:border-amber-500'}`
                          } />

                                  <button data-ev-id="ev_b8157bc8ee"
                          onClick={() => updateAgendaItemTrafficLight(item.id, 'gruen')}
                          title="Behandelt/Erledigt"
                          className={`w-4 h-4 rounded-full border-2 ${
                          item.traffic_light === 'gruen' ?
                          'bg-emerald-500 border-emerald-600' :
                          'border-emerald-300 hover:border-emerald-500'}`
                          } />

                                </div>
                                {/* Beschluss erforderlich Button */}
                                <button data-ev-id="ev_10c4d8a602"
                        onClick={() => updateAgendaItem(item.id, { requires_decision: !item.requires_decision })}
                        title={item.requires_decision ? 'Beschluss aufheben' : 'Beschluss erforderlich'}
                        className={`p-1 rounded ${
                        item.requires_decision ?
                        'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                        'hover:bg-blue-50 text-muted-foreground hover:text-blue-600'}`
                        }>

                                  <Vote className="w-4 h-4" />
                                </button>
                              </>
                      }
                            {/* Edit & Delete Buttons - für Kommandant/Admin ODER Ersteller des Eintrags */}
                            {canUserEditItem(item) && editingAgendaItem !== item.id &&
                      <>
                        <button data-ev-id="ev_edit_agenda_item"
                        onClick={() => {
                          setEditingAgendaItem(item.id);
                          setEditingAgendaItemText(item.title);
                        }}
                        title="Eintrag bearbeiten"
                        className="p-1 hover:bg-blue-100 rounded text-blue-500 hover:text-blue-700">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button data-ev-id="ev_4901b38a4e"
                        onClick={() => {
                          if (confirm('Diesen Eintrag wirklich löschen?')) {
                            deleteAgendaItem(item.id);
                          }
                        }}
                        title="Eintrag löschen"
                        className="p-1 hover:bg-red-100 rounded text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                      }
                            {item.requires_decision &&
                      <span data-ev-id="ev_c7755dac20" className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded flex items-center gap-1">
                                <Vote className="w-3 h-3" /> Beschluss nötig
                              </span>
                      }
                          </div>
                        </div>
                  )}

                      {/* New Entry Input - Textarea + Save Button */}
                      {/* Nur anzeigen wenn: eigene Person ODER Allfälliges ODER Admin/Kdt */}
                      {canEditAgendaItems && (
                        isAllfaelliges || 
                        person.id === profile?.id || 
                        (canManage && !isAllfaelliges)
                      ) &&
                  <div data-ev-id="ev_47503771b6" className="px-4 py-3 bg-muted/20">
                          <div data-ev-id="ev_11b08ed707" className="flex gap-2">
                            <textarea data-ev-id="ev_952ef8f3e5"
                      value={inputText}
                      onChange={(e) =>
                      setCategoryInputs((prev) => ({ ...prev, [person.id]: e.target.value }))
                      }
                      placeholder="Neuer Eintrag... (Enter = Zeilenumbruch)"
                      rows={2}
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground/50 resize-none" />

                            <button data-ev-id="ev_2f07240e8e"
                      onClick={async () => {
                        if (inputText.trim()) {
                          await addAgendaItem({
                            title: inputText.trim(),
                            category: person.categoryKey
                          });
                          setCategoryInputs((prev) => ({ ...prev, [person.id]: '' }));
                        }
                      }}
                      disabled={!inputText.trim()}
                      title="Speichern"
                      className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed self-end">

                              <Save className="w-4 h-4" />
                            </button>
                          </div>
                          <p data-ev-id="ev_f39aa22555" className="text-xs text-muted-foreground mt-1">Enter = Zeilenumbruch</p>
                        </div>
                  }
                    </div>
                }
                </div>);

          })}
          </div>
        }

        {/* BESCHLÜSSE TAB */}
        {activeTab === 'beschluesse' &&
        <div data-ev-id="ev_303b36c079" className="space-y-4">
            <div data-ev-id="ev_c5763380aa" className="flex items-center justify-between mb-4">
              <h3 data-ev-id="ev_a1474786ef" className="font-semibold flex items-center gap-2">
                <Vote className="w-5 h-5" /> Beschlüsse
              </h3>
              <span data-ev-id="ev_000e9ea70d" className="text-sm text-muted-foreground">{decisions.length}</span>
            </div>

            {/* Einträge die einen Beschluss erfordern */}
            {agendaItems.filter((item) => item.requires_decision && !item.is_fixed_item).length > 0 &&
          <div data-ev-id="ev_65175c22e8" className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 mb-4">
                <h4 data-ev-id="ev_012b6bedd3" className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" /> Einträge mit Beschlussbedarf ({agendaItems.filter((item) => item.requires_decision && !item.is_fixed_item).length})
                </h4>
                <div data-ev-id="ev_37d63ec2d2" className="space-y-2">
                  {agendaItems.filter((item) => item.requires_decision && !item.is_fixed_item).map((item) =>
              <div data-ev-id="ev_41d578b040" key={item.id} className="bg-white border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                      <div data-ev-id="ev_3f53835c07" className="flex-1">
                        <p data-ev-id="ev_72bd3bb062" className="font-medium text-sm">{item.title}</p>
                        {item.description &&
                  <p data-ev-id="ev_cd16eb4d14" className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  }
                        <div data-ev-id="ev_fe3a6d345f" className="flex items-center gap-2 mt-1">
                          <span data-ev-id="ev_a872f80609" className="text-xs text-muted-foreground">Eingereicht von: {item.submitted_by_name}</span>
                          {item.traffic_light === 'rot' &&
                    <span data-ev-id="ev_0ff0b6d05f" className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">vertagt</span>
                    }
                          {item.traffic_light === 'gruen' &&
                    <span data-ev-id="ev_b0ec1b1eae" className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">behandelt</span>
                    }
                        </div>
                      </div>
                      {canManage && item.traffic_light !== 'gruen' &&
                <button data-ev-id="ev_f1d031b3cd"
                onClick={() => {
                  // Open modal to enter decision text
                  setShowCreateDecisionModal({
                    agendaItemId: item.id,
                    title: item.title,
                    description: item.description
                  });
                  setNewDecisionForm({ decision_text: item.title + (item.description ? ` - ${item.description}` : '') });
                }}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">
                          Beschluss anlegen
                        </button>
                }
                    </div>
              )}
                </div>
              </div>
          }

            {/* Pending decisions (BANF + Command Decision Items) - zur Bestätigung in der Sitzung */}
            {meeting?.meeting_type === 'kommandositzung' && (pendingBanfDecisions.length > 0 || pendingCommandDecisionItems.length > 0) &&
          <div data-ev-id="ev_8cf31ad083" className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 mb-4">
                <h4 data-ev-id="ev_3710cbf8e5" className="font-medium text-amber-900 mb-3 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Umlaufbeschlüsse zur Bestätigung ({pendingBanfDecisions.length + pendingCommandDecisionItems.length})
                </h4>
                
                {/* Command Decision Items */}
                <div data-ev-id="ev_7b7665e696" className="space-y-2">
                  {pendingCommandDecisionItems.map((item) =>
              <div data-ev-id="ev_f1dd7b9801" key={`cmd-${item.id}`} className="bg-white border border-amber-200 rounded-lg p-3 flex items-center justify-between">
                      <div data-ev-id="ev_012606797c" className="flex-1">
                        <div data-ev-id="ev_d88ea2f891" className="flex items-center gap-2 mb-1">
                          <span data-ev-id="ev_cmd_type" className="px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-700">Kommando</span>
                          <span data-ev-id="ev_3188f77db4" className="font-mono text-xs text-violet-600">{item.decision_reference}</span>
                          <span data-ev-id="ev_d5e8987818" className="font-medium text-sm">Pkt. {item.item_number}</span>
                          <span data-ev-id="ev_1c14715a97" className={`px-2 py-0.5 rounded text-xs font-medium ${
                    item.status === 'approved' ?
                    'bg-emerald-100 text-emerald-700' :
                    'bg-red-100 text-red-700'}`
                    }>
                            {item.status === 'approved' ? 'Genehmigt' : 'Abgelehnt'}
                          </span>
                        </div>
                        <p data-ev-id="ev_e05a3d4abf" className="text-sm text-gray-700">{item.description}</p>
                        <div data-ev-id="ev_92c55affa3" className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span data-ev-id="ev_8357492a43">Abstimmung: {item.decision_title}</span>
                          {item.voting_closed_at &&
                    <span data-ev-id="ev_cad3e074ec">Abgeschlossen: {new Date(item.voting_closed_at).toLocaleDateString('de-DE')}</span>
                    }
                        </div>
                      </div>
                      {canManage &&
                <div data-ev-id="ev_17bde87f8e" className="flex gap-2 ml-3">
                          <button data-ev-id="ev_9e27855dd2"
                  onClick={() => {
                    setShowConfirmCommandItemModal(item);
                    setCommandItemNotes('');
                  }}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700">
                            Bestätigen
                          </button>
                        </div>
                }
                    </div>
              )}
                </div>
                <div data-ev-id="ev_9d5adb231d" className="space-y-2">
                  {pendingBanfDecisions.map((order) =>
              <div data-ev-id="ev_9968b72424" key={order.id} className="bg-white border border-amber-200 rounded-lg p-3 flex items-center justify-between">
                      <div data-ev-id="ev_d89e607e3f"
                className="flex-1 cursor-pointer hover:bg-amber-50 -m-2 p-2 rounded transition-colors"
                onClick={() => setShowBanfDetailModal(order)}>

                        <div data-ev-id="ev_771d9bef1d" className="flex items-center gap-2 mb-1">
                          <span data-ev-id="ev_banf_type" className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Bestellung</span>
                          <p data-ev-id="ev_8786ba4187" className="font-medium text-sm text-blue-600 hover:underline">{order.title}</p>
                          <span data-ev-id="ev_e84e12ab4f" className={`px-2 py-0.5 rounded text-xs font-medium ${
                    order.voting_result === 'approved' ||
                    order.kommandomitglied_approved_at ||
                    order.status === 'freigegeben_kommandant' ||
                    order.status === 'freigegeben' ||
                    order.status === 'genehmigt' ?
                    'bg-emerald-100 text-emerald-700' :
                    order.voting_result === 'rejected' ||
                    order.rejected_at ||
                    order.status === 'abgelehnt' ||
                    order.status === 'rejected' ?
                    'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'}`
                    }>
                            {order.voting_result === 'approved' ||
                      order.kommandomitglied_approved_at ||
                      order.status === 'freigegeben_kommandant' ||
                      order.status === 'freigegeben' ||
                      order.status === 'genehmigt' ?
                      'Genehmigt' :
                      order.voting_result === 'rejected' ||
                      order.rejected_at ||
                      order.status === 'abgelehnt' ||
                      order.status === 'rejected' ?
                      'Abgelehnt' :
                      'Offen'}
                          </span>
                        </div>
                        <div data-ev-id="ev_c8e3f1727b" className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span data-ev-id="ev_df5db73fd1">{order.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                          {(order.votes_for > 0 || order.votes_against > 0) &&
                    <span data-ev-id="ev_e00f720b09" className="flex items-center gap-2">
                              <span data-ev-id="ev_6a7f9661a9" className="text-emerald-600">{order.votes_for} dafür</span>
                              <span data-ev-id="ev_f4d6a81e10" className="text-red-600">{order.votes_against} dagegen</span>
                            </span>
                    }
                        </div>
                      </div>
                      {canManage &&
                <div data-ev-id="ev_a5fa039475" className="flex gap-2 ml-3">
                          <button data-ev-id="ev_a0d366114c"
                  onClick={() => {
                    setShowConfirmBanfModal(order);
                    setBanfDecisionText(order.title + (order.description ? ` - ${order.description}` : ''));
                  }}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700">

                            Bestätigen
                          </button>
                        </div>
                }
                    </div>
              )}
                </div>
              </div>
          }

            {/* Decisions */}
            {decisions.map((decision, idx) => {
            const votes = getVotesForDecision(decision.id);
            const isExpanded = expandedDecisions.has(decision.id);

            return (
              <div data-ev-id="ev_8e393c8d14" key={decision.id} className="border border-border rounded-xl overflow-hidden">
                  {/* Decision Header */}
                  <div data-ev-id="ev_edf493e051" className="bg-primary/5 px-4 py-3 flex items-center justify-between">
                    <div data-ev-id="ev_7b81610186" className="flex items-center gap-3">
                      <span data-ev-id="ev_86ab706349" className="font-semibold text-primary">{idx + 1}. Beschluss</span>
                      <span data-ev-id="ev_94d235908f" className="text-xs text-muted-foreground">
                        {decision.decision_number} | {decision.source || 'Manuell'}
                      </span>
                      {canManage && meeting?.status !== 'abgeschlossen' &&
                    <div data-ev-id="ev_0cd6b75888" className="flex items-center gap-1">
                          <button
                        data-ev-id="ev_dee403af79"
                        className="p-1 hover:bg-muted rounded"
                        title="Bearbeiten"
                        onClick={() => {
                          setEditingDecision(decision);
                          setEditDecisionText(decision.decision_text);
                          // Felder werden nach Migration verfügbar sein
                          setEditDecisionGueltigBis('gueltig_bis' in decision ? String(decision.gueltig_bis || '') : '');
                          setEditDecisionHebtAuf('hebt_auf_id' in decision ? String(decision.hebt_auf_id || '') : '');
                        }}>

                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button data-ev-id="ev_7bc715f720"
                      onClick={() => {
                        if (confirm('Diesen Beschluss wirklich löschen?')) {
                          deleteDecision(decision.id);
                        }
                      }}
                      className="p-1 hover:bg-red-100 rounded text-red-500 hover:text-red-700"
                      title="Beschluss löschen">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                    }
                    </div>
                  </div>

                  {/* Decision Text */}
                  <div data-ev-id="ev_850a6a18b2" className="px-4 py-3 border-b border-border">
                    <p data-ev-id="ev_6b9d759983" className="text-sm">
                      Das Kommando möge beschließen, <em data-ev-id="ev_c4cbcd85ad" className="text-primary">{decision.decision_text}</em>
                    </p>
                  </div>

                  {/* Vote Summary */}
                  <div data-ev-id="ev_87a71484b4" className="px-4 py-2 flex items-center justify-between bg-muted/20">
                    <div data-ev-id="ev_dbbb99068c" className="flex items-center gap-3">
                      <span data-ev-id="ev_c9e5489954" className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-sm">
                        <ThumbsUp className="w-3 h-3" /> {decision.votes_for} dafür
                      </span>
                      <span data-ev-id="ev_e03ce62a1d" className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-sm">
                        <ThumbsDown className="w-3 h-3" /> {decision.votes_against} dagegen
                      </span>
                      <span data-ev-id="ev_8a95cb18ea" className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground rounded text-sm">
                        <Minus className="w-3 h-3" /> {decision.votes_abstain} Enthaltung
                      </span>
                    </div>
                    <span data-ev-id="ev_d358e22dac" className={`px-3 py-1 rounded text-sm font-medium ${
                  decision.result === 'Angenommen' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`
                  }>
                      {decision.result || 'Offen'}
                    </span>
                  </div>

                  {/* Expand/Collapse */}
                  <button data-ev-id="ev_64dd16c6a3"
                onClick={() => {
                  const newExpanded = new Set(expandedDecisions);
                  if (isExpanded) newExpanded.delete(decision.id);else
                  newExpanded.add(decision.id);
                  setExpandedDecisions(newExpanded);
                }}
                className="w-full px-4 py-2 text-xs text-muted-foreground hover:bg-muted/30 flex items-center justify-center gap-1">

                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {votingMembers.length} stimmberechtigte Personen anwesend
                  </button>

                  {/* Individual Votes */}
                  {isExpanded &&
                <div data-ev-id="ev_b7e103e60b" className="border-t border-border divide-y divide-border">
                      {votingMembers.map((member) => {
                    const memberVote = getVoteForMember(decision.id, member.profile_id);
                    return (
                      <div data-ev-id="ev_3c76f60564" key={member.profile_id} className="px-4 py-2 flex items-center justify-between">
                            <span data-ev-id="ev_8920a2b596" className="text-sm">{member.profile?.full_name}</span>
                            {canManage ?
                        <div data-ev-id="ev_f3fc27edce" className="flex gap-1">
                                {['dafuer', 'dagegen', 'enthaltung'].map((voteType) =>
                          <button data-ev-id="ev_5202c4e092"
                          key={voteType}
                          onClick={() => {
                            // Toggle: Wenn gleiche Stimme erneut geklickt, wird sie zurückgesetzt
                            const newVote = memberVote?.vote === voteType ? null : voteType as 'dafuer' | 'dagegen' | 'enthaltung';
                            voteOnDecision(decision.id, member.profile_id, newVote);
                          }}
                          className={`px-3 py-1 text-xs rounded border transition-colors ${
                          memberVote?.vote === voteType ?
                          voteType === 'dafuer' ? 'bg-emerald-600 text-white border-emerald-600' :
                          voteType === 'dagegen' ? 'bg-red-600 text-white border-red-600' :
                          'bg-muted-foreground text-white border-muted-foreground' :
                          'border-border hover:bg-muted'}`
                          }>

                                    {voteType === 'dafuer' ? 'Dafür' : voteType === 'dagegen' ? 'Dagegen' : 'Enthaltung'}
                                  </button>
                          )}
                              </div> :

                        <span data-ev-id="ev_dc586277f4" className={`text-xs px-2 py-1 rounded ${
                        memberVote?.vote === 'dafuer' ? 'bg-emerald-100 text-emerald-700' :
                        memberVote?.vote === 'dagegen' ? 'bg-red-100 text-red-700' :
                        memberVote?.vote === 'enthaltung' ? 'bg-muted text-muted-foreground' :
                        'text-muted-foreground'}`
                        }>
                                {memberVote?.vote === 'dafuer' ? 'Dafür' :
                          memberVote?.vote === 'dagegen' ? 'Dagegen' :
                          memberVote?.vote === 'enthaltung' ? 'Enthaltung' :
                          '-'}
                              </span>
                        }
                          </div>);

                  })}
                    </div>
                }

                  {/* Actions */}
                  {canManage &&
                <div data-ev-id="ev_0fb1c30af0" className="px-4 py-3 bg-muted/20 flex items-center justify-between">
                      <div data-ev-id="ev_d65437dcee" className="flex gap-2">
                        <button data-ev-id="ev_c4ebae17e5" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" /> Als Eintrag zurückstufen
                        </button>
                        <button data-ev-id="ev_bc1e08df27" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" /> Stimmen zurücksetzen
                        </button>
                        {decision.source === 'kommando_confirmation' && decision.command_decision_item_id &&
                    <button
                      data-ev-id="ev_pdf_download_btn"
                      onClick={() => handleDownloadDecisionPdf(decision)}
                      disabled={downloadingPdfDecisionId === decision.id}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50">

                            {downloadingPdfDecisionId === decision.id ?
                      <>
                                <div data-ev-id="ev_5142db4ad3" className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                                PDF...
                              </> :

                      <>
                                <Download className="w-3 h-3" /> PDF
                              </>
                      }
                          </button>
                    }
                      </div>
                      <button data-ev-id="ev_576d2094be"
                  onClick={() => addDecisionToRegister(decision.id)}
                  className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 ${
                  decision.is_in_register ?
                  'bg-emerald-100 text-emerald-700' :
                  'bg-emerald-600 text-white hover:bg-emerald-700'}`
                  }
                  disabled={decision.is_in_register ?? false}>

                        <CheckCircle2 className="w-3 h-3" />
                        {decision.is_in_register ? 'Im Register' : 'Abgeschlossen - ins Register'}
                      </button>
                    </div>
                }
                </div>);

          })}

            {/* Add new decision */}
            {canManage &&
          <button data-ev-id="ev_40efe66e74"
          onClick={() => setShowNewDecisionModal(true)}
          className="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">

                <Plus className="w-4 h-4" /> Neuer Beschluss
              </button>
          }

            {decisions.length === 0 && pendingBanfDecisions.length === 0 && pendingCommandDecisionItems.length === 0 &&
          <div data-ev-id="ev_19f1960641" className="text-center py-12 text-muted-foreground">
                <Vote className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p data-ev-id="ev_5714968e58">Noch keine Beschlüsse</p>
              </div>
          }
          </div>
        }

        {/* REGISTER TAB */}
        {activeTab === 'register' &&
        <div data-ev-id="ev_ebc874e073">
            <div data-ev-id="ev_3f2b287c51" className="flex items-center gap-4 mb-4">
              <h3 data-ev-id="ev_dec924cb40" className="font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5" /> Beschluss-Register
              </h3>
            </div>
            <div data-ev-id="ev_8484bf3efa" className="flex gap-2 mb-4">
              <select data-ev-id="ev_734c378fa3" className="px-3 py-2 border border-border rounded-lg text-sm bg-background">
                <option data-ev-id="ev_314c85f32e">Alle Typen</option>
              </select>
              <select data-ev-id="ev_21caa4d661" className="px-3 py-2 border border-border rounded-lg text-sm bg-background">
                <option data-ev-id="ev_c5f0283afb">Alle Status</option>
              </select>
              <input data-ev-id="ev_7fd3f7d1b2"
            type="text"
            placeholder="Suchen..."
            value={registerSearch}
            onChange={(e) => setRegisterSearch(e.target.value)}
            className="flex-1 px-3 py-2 border border-border rounded-lg text-sm" />

            </div>
            {registerDecisions.length === 0 ?
          <div data-ev-id="ev_e8c8d3fa94" className="text-center py-12 text-muted-foreground">
                <p data-ev-id="ev_144d02b4cb">Keine Ergebnisse</p>
              </div> :

          <div data-ev-id="ev_3b12bf7f10" className="space-y-2">
                {registerDecisions.map((d) =>
            <div data-ev-id="ev_25d6b0734c" key={d.id} className="p-3 border border-border rounded-lg">
                    <div data-ev-id="ev_4f00cf056f" className="flex items-center justify-between">
                      <span data-ev-id="ev_22ce39491c" className="font-medium text-sm">{d.decision_number}</span>
                      <span data-ev-id="ev_8a3dc7afa6" className={`px-2 py-0.5 rounded text-xs ${
                d.result === 'Angenommen' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`
                }>{d.result}</span>
                    </div>
                    <p data-ev-id="ev_b6c02b2686" className="text-sm text-muted-foreground mt-1">{d.decision_text}</p>
                  </div>
            )}
              </div>
          }
          </div>
        }

        {/* ABSCHLUSS TAB */}
        {activeTab === 'abschluss' &&
        <div data-ev-id="ev_45537fcad3" className="space-y-6">
            {/* Protocol Preview */}
            <div data-ev-id="ev_4eebe984e8">
              <h3 data-ev-id="ev_aad074e8d8" className="font-semibold flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5" /> Protokoll-Vorschau
              </h3>
              <div data-ev-id="ev_6062fc8c90" className="flex gap-2 mb-3">
                <button data-ev-id="ev_155e807f11" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Vorschau aktualisieren
                </button>
                <button data-ev-id="ev_67c7ca1cfe" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm flex items-center gap-2">
                  <Download className="w-4 h-4" /> PDF herunterladen
                </button>
              </div>
              <div data-ev-id="ev_6b4355076a" className="bg-muted/30 border border-border rounded-xl h-96 flex items-center justify-center">
                <FileText className="w-16 h-16 text-muted-foreground/30" />
              </div>
            </div>

            {/* Deferred Items Info */}
            {agendaItems.filter((i) => i.traffic_light === 'rot').length > 0 &&
          <div data-ev-id="ev_5676d01f3c" className="bg-red-50 border border-red-200 rounded-xl p-4">
                <h4 data-ev-id="ev_2b6c43d164" className="font-medium text-red-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Verschobene Punkte
                </h4>
                <p data-ev-id="ev_25a9478534" className="text-sm text-red-700 mb-2">
                  {agendaItems.filter((i) => i.traffic_light === 'rot').length} Punkt(e) werden in die nächste Sitzung übernommen:
                </p>
                <ul data-ev-id="ev_44476bd05a" className="text-sm text-red-800 list-disc list-inside">
                  {agendaItems.filter((i) => i.traffic_light === 'rot').map((item) =>
              <li data-ev-id="ev_eae6a5c773" key={item.id}>{item.title}</li>
              )}
                </ul>
              </div>
          }

            {/* Next Meeting */}
            <div data-ev-id="ev_6a3dd2375c" className="border border-border rounded-xl p-4">
              <h3 data-ev-id="ev_9e909f680d" className="font-semibold flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5" /> Nächste Sitzung <span data-ev-id="ev_61d3b13785" className="text-red-500 text-sm">(Pflichtfeld)</span>
              </h3>
              <div data-ev-id="ev_54b048322a" className="grid grid-cols-3 gap-4">
                <div data-ev-id="ev_5998aee5b3">
                  <label data-ev-id="ev_b0ac32c4fb" className="block text-sm font-medium text-muted-foreground mb-1">Datum</label>
                  <input data-ev-id="ev_bf42955013"
                type="date"
                value={nextMeetingForm.date || meeting.next_meeting_date || ''}
                onChange={(e) => setNextMeetingForm({ ...nextMeetingForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg"
                disabled={!canManage || meeting.status === 'abgeschlossen'} />

                </div>
                <div data-ev-id="ev_ba671b2ec8">
                  <label data-ev-id="ev_2fbd044354" className="block text-sm font-medium text-muted-foreground mb-1">Uhrzeit</label>
                  <input data-ev-id="ev_5c746caa82"
                type="time"
                value={nextMeetingForm.time || meeting.next_meeting_time || '18:30'}
                onChange={(e) => setNextMeetingForm({ ...nextMeetingForm, time: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg"
                disabled={!canManage || meeting.status === 'abgeschlossen'} />

                </div>
                <div data-ev-id="ev_289fa0ee41">
                  <label data-ev-id="ev_e9fe7f643d" className="block text-sm font-medium text-muted-foreground mb-1">Ort</label>
                  <input data-ev-id="ev_cadea9d491"
                type="text"
                value={nextMeetingForm.location || meeting.next_meeting_location || 'FF-Haus Marchtrenk'}
                onChange={(e) => setNextMeetingForm({ ...nextMeetingForm, location: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg"
                disabled={!canManage || meeting.status === 'abgeschlossen'} />

                </div>
              </div>
            </div>

            {/* Actions */}
            {canManage && meeting.status !== 'abgeschlossen' &&
          <div data-ev-id="ev_03a613939b" className="border border-border rounded-xl p-4">
                <h3 data-ev-id="ev_16aae138f2" className="font-semibold mb-3">Abschluss-Aktionen</h3>
                <div data-ev-id="ev_b27280466b" className="flex gap-2 flex-wrap">
                  <button data-ev-id="ev_29c7b08af4" className="px-4 py-2 bg-muted rounded-lg text-sm flex items-center gap-2">
                    <Send className="w-4 h-4" /> Protokoll versenden
                  </button>
                  <button data-ev-id="ev_a3750ed168"
              onClick={async () => {
                const date = nextMeetingForm.date || meeting.next_meeting_date;
                if (!date) {
                  alert('Bitte Datum für die nächste Sitzung eingeben');
                  return;
                }
                if (!confirm('Sitzung wirklich abschließen? Dies erstellt automatisch die nächste Sitzung mit allen verschobenen Punkten.')) {
                  return;
                }
                setIsClosing(true);
                const { error, newMeetingId } = await closeMeeting(
                  date,
                  nextMeetingForm.time || meeting.next_meeting_time || '18:30',
                  nextMeetingForm.location || meeting.next_meeting_location || 'FF-Haus Marchtrenk'
                );
                setIsClosing(false);
                if (error) {
                  alert('Fehler: ' + error.message);
                } else if (newMeetingId) {
                  navigate(`/sitzungen/${newMeetingId}`);
                }
              }}
              disabled={isClosing}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">

                    <Flag className="w-4 h-4" /> 
                    {isClosing ? 'Wird abgeschlossen...' : 'Sitzung abschließen & Nächste erstellen'}
                  </button>
                </div>
              </div>
          }

            {meeting.status === 'abgeschlossen' &&
          <div data-ev-id="ev_da9c58d268" className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p data-ev-id="ev_ee12f29e8a" className="font-medium text-emerald-900">Diese Sitzung wurde abgeschlossen</p>
                <p data-ev-id="ev_cdbc2eaa55" className="text-sm text-emerald-700">Abgeschlossen am {meeting.closed_at ? formatDate(meeting.closed_at) : '-'}</p>
              </div>
          }
          </div>
        }
      </div>

      {/* New Decision Modal */}
      {showNewDecisionModal &&
      <div data-ev-id="ev_e8af05d5c5" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-ev-id="ev_2bd8f4027c" className="bg-card rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 data-ev-id="ev_61720d6ac9" className="text-lg font-semibold mb-4">Neuer Beschluss</h3>
            <div data-ev-id="ev_b4300a56d3" className="space-y-4">
              <div data-ev-id="ev_e837305461">
                <label data-ev-id="ev_50331f222d" className="block text-sm font-medium mb-1">Beschluss-Präfix</label>
                <select data-ev-id="ev_1272646c5f"
              value={selectedDecisionPrefix}
              onChange={(e) => {
                setSelectedDecisionPrefix(e.target.value);
                if (e.target.value !== '__custom__') {
                  setCustomDecisionPrefix('');
                }
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background mb-2">
                  <option data-ev-id="ev_d432497af2" value="">Vorlage wählen...</option>
                  {decisionTextTemplates.map((template, idx) =>
                <option data-ev-id="ev_d09256978d" key={idx} value={template}>{template}</option>
                )}
                  <option data-ev-id="ev_10ddc1b2be" value="__custom__">✏️ Eigener Text...</option>
                </select>
                {selectedDecisionPrefix === '__custom__' &&
              <input data-ev-id="ev_c1bbb60c34"
              type="text"
              value={customDecisionPrefix}
              onChange={(e) => setCustomDecisionPrefix(e.target.value)}
              placeholder="Eigenen Präfix eingeben..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background" />

              }
              </div>
              <div data-ev-id="ev_94ed80fda9">
                <label data-ev-id="ev_e5ee8e6a1b" className="block text-sm font-medium mb-1">Beschlusstext</label>
                {selectedDecisionPrefix && selectedDecisionPrefix !== '__custom__' &&
              <p data-ev-id="ev_bab8ab1c02" className="text-sm text-muted-foreground mb-2">{selectedDecisionPrefix}</p>
              }
                {selectedDecisionPrefix === '__custom__' && customDecisionPrefix &&
              <p data-ev-id="ev_45615f3c23" className="text-sm text-muted-foreground mb-2">{customDecisionPrefix}</p>
              }
                <textarea data-ev-id="ev_9928396229"
              value={newDecisionForm.decision_text}
              onChange={(e) => setNewDecisionForm({ ...newDecisionForm, decision_text: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg h-24"
              placeholder="dass..." />

              </div>

              {/* Gültigkeit und Aufhebung */}
              <div data-ev-id="ev_new_decision_gueltigkeit" className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
                <p data-ev-id="ev_new_gueltigkeit_title" className="text-sm font-medium flex items-center gap-2">
                  <CalendarX className="w-4 h-4 text-gray-600" />
                  Gültigkeit & Aufhebung (optional)
                </p>
                <div data-ev-id="ev_new_gueltig_bis_wrapper">
                  <label data-ev-id="ev_new_gueltig_bis_label" className="block text-xs text-muted-foreground mb-1">Gültig bis (leer = unbegrenzt)</label>
                  <input
                  data-ev-id="ev_new_gueltig_bis_input"
                  type="date"
                  value={newDecisionGueltigBis}
                  onChange={(e) => setNewDecisionGueltigBis(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
                <div data-ev-id="ev_new_hebt_auf_wrapper">
                  <label data-ev-id="ev_new_hebt_auf_label" className="block text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    Ersetzt Beschluss (optional)
                  </label>
                  <select
                  data-ev-id="ev_new_hebt_auf_select"
                  value={newDecisionHebtAuf}
                  onChange={(e) => setNewDecisionHebtAuf(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white">
                    <option data-ev-id="ev_eeffec602a" value="">Keinen Beschluss ersetzen</option>
                    {gueltigeBeschluesse.map((b) =>
                  <option data-ev-id="ev_9257459d61" key={b.id} value={b.id}>
                        {b.beschluss_nummer} - {b.titel.substring(0, 50)}{b.titel.length > 50 ? '...' : ''}
                      </option>
                  )}
                  </select>
                </div>
              </div>
            </div>
            <div data-ev-id="ev_543720da32" className="flex justify-end gap-2 mt-6">
              <button data-ev-id="ev_8cb232e717"
            onClick={() => {
              setShowNewDecisionModal(false);
              setSelectedDecisionPrefix('');
              setCustomDecisionPrefix('');
              setNewDecisionGueltigBis('');
              setNewDecisionHebtAuf('');
            }}
            className="px-4 py-2 border border-border rounded-lg">

                Abbrechen
              </button>
              <button data-ev-id="ev_034d00731a"
            onClick={async () => {
              if (newDecisionForm.decision_text.trim()) {
                const prefix = selectedDecisionPrefix === '__custom__' ? customDecisionPrefix : selectedDecisionPrefix;
                const fullText = prefix ? `${prefix} ${newDecisionForm.decision_text.trim()}` : newDecisionForm.decision_text.trim();
                await addDecision({
                  decision_text: fullText,
                  source: 'Manuell',
                  votes_for: 0,
                  votes_against: 0,
                  votes_abstain: 0,
                  result: null,
                  decision_number: null,
                  order_id: null,
                  recused_members: null,
                  gueltig_bis: newDecisionGueltigBis || null,
                  hebt_auf_id: newDecisionHebtAuf || null
                });
                setNewDecisionForm({ decision_text: '', prefix: '' });
                setSelectedDecisionPrefix('');
                setCustomDecisionPrefix('');
                setNewDecisionGueltigBis('');
                setNewDecisionHebtAuf('');
                setShowNewDecisionModal(false);
              }
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">

                Beschluss anlegen
              </button>
            </div>
          </div>
        </div>
      }

      {/* Create Decision from Agenda Item Modal */}
      {showCreateDecisionModal &&
      <div data-ev-id="ev_fed89f47e5" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-ev-id="ev_11fa7dbcd9" className="bg-card rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 data-ev-id="ev_9c0f9c402b" className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Vote className="w-5 h-5" /> Beschluss aus Eintrag erstellen
            </h3>
            <div data-ev-id="ev_951a4e667f" className="space-y-4">
              <div data-ev-id="ev_c3e40875c0" className="bg-muted/50 rounded-lg p-3">
                <p data-ev-id="ev_3c7337ff58" className="text-sm text-muted-foreground">Eintrag:</p>
                <p data-ev-id="ev_15cb191dc0" className="font-medium">{showCreateDecisionModal.title}</p>
                {showCreateDecisionModal.description &&
              <p data-ev-id="ev_1f62ff0985" className="text-sm text-muted-foreground mt-1">{showCreateDecisionModal.description}</p>
              }
              </div>
              <div data-ev-id="ev_8481a36f19">
                <label data-ev-id="ev_ebe2776159" className="block text-sm font-medium mb-1">Beschluss-Präfix</label>
                <select data-ev-id="ev_382ceee58e"
              value={selectedDecisionPrefix}
              onChange={(e) => {
                setSelectedDecisionPrefix(e.target.value);
                if (e.target.value !== '__custom__') {
                  setCustomDecisionPrefix('');
                }
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background mb-2">
                  <option data-ev-id="ev_a8d00ad1d6" value="">Vorlage wählen...</option>
                  {decisionTextTemplates.map((template, idx) =>
                <option data-ev-id="ev_39c58961b5" key={idx} value={template}>{template}</option>
                )}
                  <option data-ev-id="ev_f4b044ba71" value="__custom__">✏️ Eigener Text...</option>
                </select>
                {selectedDecisionPrefix === '__custom__' &&
              <input data-ev-id="ev_62274adab3"
              type="text"
              value={customDecisionPrefix}
              onChange={(e) => setCustomDecisionPrefix(e.target.value)}
              placeholder="Eigenen Präfix eingeben..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background" />

              }
              </div>
              <div data-ev-id="ev_d732c39bf1">
                <label data-ev-id="ev_044b4c7a80" className="block text-sm font-medium mb-1">Beschlusstext</label>
                {selectedDecisionPrefix && selectedDecisionPrefix !== '__custom__' &&
              <p data-ev-id="ev_47cdba1ef8" className="text-sm text-muted-foreground mb-2">{selectedDecisionPrefix}</p>
              }
                {selectedDecisionPrefix === '__custom__' && customDecisionPrefix &&
              <p data-ev-id="ev_0ea48230c2" className="text-sm text-muted-foreground mb-2">{customDecisionPrefix}</p>
              }
                <textarea data-ev-id="ev_90daac008e"
              value={newDecisionForm.decision_text}
              onChange={(e) => setNewDecisionForm({ ...newDecisionForm, decision_text: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg h-24"
              placeholder="dass..." />

              </div>

              {/* Gültigkeit und Aufhebung */}
              <div data-ev-id="ev_create_decision_gueltigkeit" className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
                <p data-ev-id="ev_create_gueltigkeit_title" className="text-sm font-medium flex items-center gap-2">
                  <CalendarX className="w-4 h-4 text-gray-600" />
                  Gültigkeit & Aufhebung (optional)
                </p>
                <div data-ev-id="ev_create_gueltig_bis_wrapper">
                  <label data-ev-id="ev_create_gueltig_bis_label" className="block text-xs text-muted-foreground mb-1">Gültig bis (leer = unbegrenzt)</label>
                  <input
                  data-ev-id="ev_create_gueltig_bis_input"
                  type="date"
                  value={createDecisionGueltigBis}
                  onChange={(e) => setCreateDecisionGueltigBis(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
                <div data-ev-id="ev_create_hebt_auf_wrapper">
                  <label data-ev-id="ev_create_hebt_auf_label" className="block text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    Ersetzt Beschluss (optional)
                  </label>
                  <select
                  data-ev-id="ev_create_hebt_auf_select"
                  value={createDecisionHebtAuf}
                  onChange={(e) => setCreateDecisionHebtAuf(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white">
                    <option data-ev-id="ev_dfc87d0931" value="">Keinen Beschluss ersetzen</option>
                    {gueltigeBeschluesse.map((b) =>
                  <option data-ev-id="ev_2822b8a559" key={b.id} value={b.id}>
                        {b.beschluss_nummer} - {b.titel.substring(0, 50)}{b.titel.length > 50 ? '...' : ''}
                      </option>
                  )}
                  </select>
                </div>
              </div>
            </div>
            <div data-ev-id="ev_ecaa6daafc" className="flex justify-end gap-2 mt-6">
              <button data-ev-id="ev_1a89652cb6"
            onClick={() => {
              setShowCreateDecisionModal(null);
              setNewDecisionForm({ decision_text: '', prefix: '' });
              setSelectedDecisionPrefix('');
              setCustomDecisionPrefix('');
              setCreateDecisionGueltigBis('');
              setCreateDecisionHebtAuf('');
            }}
            className="px-4 py-2 border border-border rounded-lg">
                Abbrechen
              </button>
              <button data-ev-id="ev_aaa39ac5e4"
            onClick={async () => {
              if (newDecisionForm.decision_text.trim()) {
                const prefix = selectedDecisionPrefix === '__custom__' ? customDecisionPrefix : selectedDecisionPrefix;
                const fullText = prefix ? `${prefix} ${newDecisionForm.decision_text.trim()}` : newDecisionForm.decision_text.trim();
                const result = await addDecision({
                  decision_text: fullText,
                  decision_number: `B-${decisions.length + 1}`,
                  source: 'Eintrag',
                  result: 'offen',
                  votes_for: 0,
                  votes_against: 0,
                  votes_abstain: 0,
                  gueltig_bis: createDecisionGueltigBis || null,
                  hebt_auf_id: createDecisionHebtAuf || null
                });
                if (!result.error) {
                  // Mark agenda item as treated
                  await updateAgendaItemTrafficLight(showCreateDecisionModal.agendaItemId, 'gruen');
                }
                setNewDecisionForm({ decision_text: '', prefix: '' });
                setSelectedDecisionPrefix('');
                setCustomDecisionPrefix('');
                setCreateDecisionGueltigBis('');
                setCreateDecisionHebtAuf('');
                setShowCreateDecisionModal(null);
              }
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
                Beschluss anlegen & Abstimmung starten
              </button>
            </div>
          </div>
        </div>
      }

      {/* New Entry Modal */}
      {showNewItemModal &&
      <div data-ev-id="ev_033f6918bc" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-ev-id="ev_15914b0263" className="bg-card rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 data-ev-id="ev_9607d2ed37" className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" /> Neuen Eintrag erstellen
            </h3>
            <div data-ev-id="ev_89f5ff9030" className="space-y-4">
              <div data-ev-id="ev_eb436f18fa">
                <label data-ev-id="ev_ed78156952" className="block text-sm font-medium mb-1">Titel *</label>
                <input data-ev-id="ev_6d32333709"
              type="text"
              value={newItemForm.title}
              onChange={(e) => setNewItemForm({ ...newItemForm, title: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg"
              placeholder="Thema des Eintrags" />

              </div>
              <div data-ev-id="ev_15cb288522">
                <label data-ev-id="ev_e5bc6ca803" className="block text-sm font-medium mb-1">Kategorie</label>
                <select data-ev-id="ev_b970ee2d28"
              value={newItemForm.category}
              onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg">

                  <option data-ev-id="ev_bc1c01e255" value="kommandant">Kommandant</option>
                  <option data-ev-id="ev_33375b5ec9" value="kdt_stellvertreter">Kdt-Stellvertreter</option>
                  <option data-ev-id="ev_8df4641c39" value="kassier">Kassier</option>
                  <option data-ev-id="ev_571b79c38f" value="schriftfuehrer">Schriftführer</option>
                  <option data-ev-id="ev_b1ae716a19" value="zeugwart">Zeugwart</option>
                  <option data-ev-id="ev_c375764591" value="atemschutz">Atemschutzbeauftragter</option>
                  <option data-ev-id="ev_f9dea60ee6" value="funk">Funkbeauftragter</option>
                  <option data-ev-id="ev_e9ec1fde84" value="einsatzleiter">Einsatzleiter</option>
                  <option data-ev-id="ev_3347305415" value="zugskommandant">Zugskommandant</option>
                  <option data-ev-id="ev_f4af3ac951" value="jugendbetreuer">Jugendbetreuer</option>
                  <option data-ev-id="ev_b580f674be" value="allfaelliges">Allfälliges</option>
                </select>
              </div>
              <div data-ev-id="ev_a9f6ef29a4">
                <label data-ev-id="ev_27a8d12467" className="block text-sm font-medium mb-1">Beschreibung</label>
                <textarea data-ev-id="ev_8a9be63d37"
              value={newItemForm.description}
              onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg h-24"
              placeholder="Details zum Eintrag..." />

              </div>
            </div>
            {newItemError &&
          <div data-ev-id="ev_ef281392c4" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {newItemError}
              </div>
          }
            <div data-ev-id="ev_e26aac8053" className="flex justify-end gap-2 mt-6">
              <button data-ev-id="ev_6ce34ca565"
            onClick={() => {
              setShowNewItemModal(false);
              setNewItemForm({ title: '', description: '', category: '' });
              setNewItemError(null);
            }}
            className="px-4 py-2 border border-border rounded-lg">

                Abbrechen
              </button>
              <button data-ev-id="ev_b54fa7f64c"
            onClick={async () => {
              if (!newItemForm.title.trim()) {
                setNewItemError('Bitte geben Sie einen Titel ein.');
                return;
              }
              setNewItemError(null);
              const result = await addAgendaItem({
                title: newItemForm.title.trim(),
                description: newItemForm.description.trim() || null,
                category: newItemForm.category || null,
                traffic_light: 'gelb',
                sort_order: agendaItems.length + 100
              });
              if (result.error) {
                setNewItemError(result.error.message || 'Fehler beim Speichern des Eintrags.');
              } else {
                setNewItemForm({ title: '', description: '', category: '' });
                setShowNewItemModal(false);
              }
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">

                Eintrag erstellen
              </button>
            </div>
          </div>
        </div>
      }

      {/* BANF Detail Modal */}
      {showBanfDetailModal &&
      <div data-ev-id="ev_6d4177806a" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-ev-id="ev_784d3b3c8e" className="bg-card rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div data-ev-id="ev_29cf254ff4" className="flex items-center justify-between mb-4">
              <h3 data-ev-id="ev_aca7f59fcc" className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" /> Umlaufbeschluss Details
              </h3>
              <button data-ev-id="ev_4e200f0e4e"
            onClick={() => setShowBanfDetailModal(null)}
            className="p-1 rounded-lg hover:bg-muted">

                <X className="w-5 h-5" />
              </button>
            </div>

            <div data-ev-id="ev_c9c10bd520" className="space-y-4">
              <div data-ev-id="ev_a9a38928ed" className="bg-muted/50 rounded-lg p-4">
                <h4 data-ev-id="ev_441bcdd089" className="font-medium text-sm text-muted-foreground mb-1">Titel</h4>
                <p data-ev-id="ev_a729500ddf" className="font-semibold">{showBanfDetailModal.title}</p>
              </div>

              <div data-ev-id="ev_f2b3863de3" className="grid grid-cols-2 gap-4">
                <div data-ev-id="ev_6caf8083a2" className="bg-muted/50 rounded-lg p-4">
                  <h4 data-ev-id="ev_e70d101976" className="font-medium text-sm text-muted-foreground mb-1">Betrag</h4>
                  <p data-ev-id="ev_222a4cd999" className="font-semibold">
                    {showBanfDetailModal.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
                <div data-ev-id="ev_db04c29b9e" className="bg-muted/50 rounded-lg p-4">
                  <h4 data-ev-id="ev_fd127027cf" className="font-medium text-sm text-muted-foreground mb-1">Status</h4>
                  <span data-ev-id="ev_f0f8735ee1" className={`px-2 py-1 rounded text-sm font-medium ${
                showBanfDetailModal.voting_result === 'approved' || showBanfDetailModal.kommandomitglied_approved_at ?
                'bg-emerald-100 text-emerald-700' :
                showBanfDetailModal.voting_result === 'rejected' || showBanfDetailModal.rejected_at ?
                'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-700'}`
                }>
                    {showBanfDetailModal.voting_result === 'approved' || showBanfDetailModal.kommandomitglied_approved_at ?
                  'Genehmigt' :
                  showBanfDetailModal.voting_result === 'rejected' || showBanfDetailModal.rejected_at ?
                  'Abgelehnt' :
                  'Offen'}
                  </span>
                </div>
              </div>

              {showBanfDetailModal.description &&
            <div data-ev-id="ev_61150659c5" className="bg-muted/50 rounded-lg p-4">
                  <h4 data-ev-id="ev_f3bd526338" className="font-medium text-sm text-muted-foreground mb-1">Beschreibung</h4>
                  <p data-ev-id="ev_1e5d8f39a5" className="text-sm">{showBanfDetailModal.description}</p>
                </div>
            }

              {(showBanfDetailModal.votes_for > 0 || showBanfDetailModal.votes_against > 0) &&
            <div data-ev-id="ev_76e9925d5c" className="bg-muted/50 rounded-lg p-4">
                  <h4 data-ev-id="ev_ae59c2814b" className="font-medium text-sm text-muted-foreground mb-2">Abstimmungsergebnis</h4>
                  <div data-ev-id="ev_1b909b9b21" className="flex items-center gap-6">
                    <div data-ev-id="ev_2a4493ea9e" className="flex items-center gap-2">
                      <span data-ev-id="ev_08fdc086a9" className="w-3 h-3 rounded-full bg-emerald-500"></span>
                      <span data-ev-id="ev_d3f7a5cc7f" className="text-sm">{showBanfDetailModal.votes_for} Dafür</span>
                    </div>
                    <div data-ev-id="ev_d72e78b6dc" className="flex items-center gap-2">
                      <span data-ev-id="ev_494a9f2dbe" className="w-3 h-3 rounded-full bg-red-500"></span>
                      <span data-ev-id="ev_b03b400c4e" className="text-sm">{showBanfDetailModal.votes_against} Dagegen</span>
                    </div>
                    {showBanfDetailModal.votes_abstain > 0 &&
                <div data-ev-id="ev_25e6339bc4" className="flex items-center gap-2">
                        <span data-ev-id="ev_d55682e9d5" className="w-3 h-3 rounded-full bg-gray-400"></span>
                        <span data-ev-id="ev_0f30259625" className="text-sm">{showBanfDetailModal.votes_abstain} Enthaltung</span>
                      </div>
                }
                  </div>
                </div>
            }

              <div data-ev-id="ev_e085e91fe9" className="grid grid-cols-2 gap-4 text-sm">
                <div data-ev-id="ev_22bccf11a4">
                  <span data-ev-id="ev_621a1d57bc" className="text-muted-foreground">Erstellt am:</span>{' '}
                  <span data-ev-id="ev_6a23cc5022" className="font-medium">{formatDate(showBanfDetailModal.created_at)}</span>
                </div>
                <div data-ev-id="ev_b901f3316f">
                  <span data-ev-id="ev_a5ddd18438" className="text-muted-foreground">Bedarfsträger:</span>{' '}
                  <span data-ev-id="ev_85c8334eae" className="font-medium">{showBanfDetailModal.bedarfstraeger || '-'}</span>
                </div>
              </div>

              {/* Anhänge Section */}
              <div data-ev-id="ev_ba79a6c21c" className="bg-muted/50 rounded-lg p-4">
                <h4 data-ev-id="ev_f155a28d2f" className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Anhänge
                </h4>
                {loadingAttachments ?
              <p data-ev-id="ev_e406729d53" className="text-sm text-muted-foreground">Lade Anhänge...</p> :
              banfAttachments.length === 0 ?
              <p data-ev-id="ev_9fe7dd0d95" className="text-sm text-muted-foreground">Keine Anhänge vorhanden</p> :

              <div data-ev-id="ev_dae0b477dd" className="flex flex-col gap-2">
                    {banfAttachments.map((attachment) =>
                <a data-ev-id="ev_bd77ea5fab"
                key={attachment.id}
                href={attachment.file_path}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-background rounded border border-border hover:border-primary transition-colors">

                        <Download className="w-4 h-4 text-muted-foreground" />
                        <span data-ev-id="ev_909acdcec5" className="text-sm font-medium flex-1 truncate">{attachment.file_name}</span>
                        <span data-ev-id="ev_943163ccc8" className="text-xs text-muted-foreground">
                          {(attachment.file_size / 1024).toFixed(1)} KB
                        </span>
                      </a>
                )}
                  </div>
              }
              </div>
            </div>

            <div data-ev-id="ev_b2e2f5d2a4" className="flex justify-between gap-2 mt-6 pt-4 border-t border-border">
              {/* Admin Delete Button */}
              {isAdmin &&
            <button data-ev-id="ev_07085634e3"
            onClick={() => setShowDeleteBanfConfirm(showBanfDetailModal)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            title="Dauerhaft löschen">
                  <Trash2 className="w-4 h-4" />
                  Löschen
                </button>
            }
              <div data-ev-id="ev_a4bde2daa5" className="flex gap-2 ml-auto">
                <button data-ev-id="ev_e3ab74a843"
              onClick={() => setShowBanfDetailModal(null)}
              className="px-4 py-2 border border-border rounded-lg">

                  Schließen
                </button>
                {canManage &&
              <button data-ev-id="ev_8abe77663b"
              onClick={() => {
                setShowConfirmBanfModal(showBanfDetailModal);
                setBanfDecisionText(showBanfDetailModal.title + (showBanfDetailModal.description ? ` - ${showBanfDetailModal.description}` : ''));
                setShowBanfDetailModal(null);
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">

                      Bestätigen
                    </button>
              }
              </div>
            </div>
          </div>
        </div>
      }

      {/* BANF Confirmation Modal */}
      {showConfirmBanfModal &&
      <div data-ev-id="ev_7ad9ea0956" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-ev-id="ev_75111b3d24" className="bg-card rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 data-ev-id="ev_45ccfcc2b3" className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Umlaufbeschluss bestätigen
            </h3>
            <div data-ev-id="ev_e99b46601b" className="space-y-4">
              <div data-ev-id="ev_dfd6b4cf90" className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div data-ev-id="ev_aeeb8cbc48" className="flex items-center justify-between mb-2">
                  <span data-ev-id="ev_0c4125c5e1" className="text-sm font-medium text-emerald-800">Bestellungs-Beschluss</span>
                  <span data-ev-id="ev_32bb808286" className="text-sm font-semibold text-emerald-700">
                    {showConfirmBanfModal.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
                <p data-ev-id="ev_6ef2875e63" className="text-sm text-emerald-700">{showConfirmBanfModal.title}</p>
                {showConfirmBanfModal.description &&
              <p data-ev-id="ev_0906370027" className="text-xs text-emerald-600 mt-1">{showConfirmBanfModal.description}</p>
              }
                {(showConfirmBanfModal.votes_for > 0 || showConfirmBanfModal.votes_against > 0) &&
              <div data-ev-id="ev_bb0d62ee67" className="flex gap-3 mt-2 text-xs">
                    <span data-ev-id="ev_dad3ffe31e" className="text-emerald-700">{showConfirmBanfModal.votes_for} dafür</span>
                    <span data-ev-id="ev_31bffdc9c6" className="text-red-600">{showConfirmBanfModal.votes_against} dagegen</span>
                  </div>
              }
              </div>
              <div data-ev-id="ev_787439c4c3">
                <label data-ev-id="ev_29bb030104" className="block text-sm font-medium mb-1">Beschlusstext für das Protokoll</label>
                <p data-ev-id="ev_ddb1e26f21" className="text-sm text-muted-foreground mb-2">Das Kommando bestätigt den Umlaufbeschluss:</p>
                <textarea data-ev-id="ev_950027802e"
              value={banfDecisionText}
              onChange={(e) => setBanfDecisionText(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg h-24"
              placeholder="Beschlusstext eingeben..." />
              </div>

              {/* Gültigkeit und Aufhebung */}
              <div data-ev-id="ev_banf_gueltigkeit" className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
                <p data-ev-id="ev_banf_gueltigkeit_title" className="text-sm font-medium flex items-center gap-2">
                  <CalendarX className="w-4 h-4 text-gray-600" />
                  Gültigkeit & Aufhebung (optional)
                </p>
                <div data-ev-id="ev_banf_gueltig_bis_wrapper">
                  <label data-ev-id="ev_banf_gueltig_bis_label" className="block text-xs text-muted-foreground mb-1">Gültig bis (leer = unbegrenzt)</label>
                  <input
                  data-ev-id="ev_banf_gueltig_bis_input"
                  type="date"
                  value={banfGueltigBis}
                  onChange={(e) => setBanfGueltigBis(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm" />

                </div>
                <div data-ev-id="ev_banf_hebt_auf_wrapper">
                  <label data-ev-id="ev_banf_hebt_auf_label" className="block text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    Ersetzt Beschluss (optional)
                  </label>
                  <select
                  data-ev-id="ev_banf_hebt_auf_select"
                  value={banfHebtAuf}
                  onChange={(e) => setBanfHebtAuf(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white">

                    <option data-ev-id="ev_aa27f30bb4" value="">Keinen Beschluss ersetzen</option>
                    {gueltigeBeschluesse.map((b) =>
                  <option data-ev-id="ev_126b1f675d" key={b.id} value={b.id}>
                        {b.beschluss_nummer} - {b.titel.substring(0, 50)}{b.titel.length > 50 ? '...' : ''}
                      </option>
                  )}
                  </select>
                </div>
              </div>
            </div>
            <div data-ev-id="ev_55682ddaa0" className="flex justify-end gap-2 mt-6">
              <button data-ev-id="ev_a1daa3c7ee"
            onClick={() => {
              setShowConfirmBanfModal(null);
              setBanfDecisionText('');
              setBanfGueltigBis('');
              setBanfHebtAuf('');
            }}
            className="px-4 py-2 border border-border rounded-lg">
                Abbrechen
              </button>
              <button data-ev-id="ev_3255885104"
            onClick={async () => {
              if (banfDecisionText.trim()) {
                await confirmBanfDecision(
                  { ...showConfirmBanfModal, title: banfDecisionText.trim() },
                  'bestätigt',
                  quorum.votingMembersPresent,
                  0,
                  0,
                  banfGueltigBis || undefined,
                  banfHebtAuf || undefined
                );
                setShowConfirmBanfModal(null);
                setBanfDecisionText('');
                setBanfGueltigBis('');
                setBanfHebtAuf('');
              }
            }}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Bestätigen
              </button>
            </div>
          </div>
        </div>
      }

      {/* Command Decision Item Confirmation Modal */}
      {showConfirmCommandItemModal &&
      <div data-ev-id="ev_90a8e50089" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-ev-id="ev_a8a8d19ca2" className="bg-card rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 data-ev-id="ev_b58adb4265" className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-violet-600" /> Kommandobeschluss bestätigen
            </h3>
            <div data-ev-id="ev_4dd212f740" className="space-y-4">
              <div data-ev-id="ev_275a09d2f8" className={`${showConfirmCommandItemModal.status === 'approved' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'} border rounded-lg p-3`}>
                <div data-ev-id="ev_e4b7e7c080" className="flex items-center justify-between mb-2">
                  <span data-ev-id="ev_41023f451b" className="font-mono text-sm">{showConfirmCommandItemModal.decision_reference}</span>
                  <span data-ev-id="ev_b707be68b4" className={`px-2 py-0.5 rounded text-xs font-medium ${
                showConfirmCommandItemModal.status === 'approved' ?
                'bg-emerald-100 text-emerald-700' :
                'bg-red-100 text-red-700'}`
                }>
                    {showConfirmCommandItemModal.status === 'approved' ? 'Genehmigt' : 'Abgelehnt'}
                  </span>
                </div>
                <p data-ev-id="ev_a796fd23d9" className="text-sm font-medium">Punkt {showConfirmCommandItemModal.item_number}: {showConfirmCommandItemModal.description}</p>
                <p data-ev-id="ev_e44ea475bd" className="text-xs text-muted-foreground mt-1">Abstimmung: {showConfirmCommandItemModal.decision_title}</p>
              </div>
              <div data-ev-id="ev_3dc10af5ec">
                <label data-ev-id="ev_a3de5d595b" className="block text-sm font-medium mb-1">Anmerkungen (optional)</label>
                <textarea data-ev-id="ev_32e1dcf90e"
              value={commandItemNotes}
              onChange={(e) => setCommandItemNotes(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg h-20"
              placeholder="Optionale Anmerkungen für das Protokoll..." />
              </div>

              {/* Gültigkeit und Aufhebung */}
              <div data-ev-id="ev_cmd_gueltigkeit" className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
                <p data-ev-id="ev_cmd_gueltigkeit_title" className="text-sm font-medium flex items-center gap-2">
                  <CalendarX className="w-4 h-4 text-gray-600" />
                  Gültigkeit & Aufhebung (optional)
                </p>
                <div data-ev-id="ev_cmd_gueltig_bis_wrapper">
                  <label data-ev-id="ev_cmd_gueltig_bis_label" className="block text-xs text-muted-foreground mb-1">Gültig bis (leer = unbegrenzt)</label>
                  <input
                  data-ev-id="ev_cmd_gueltig_bis_input"
                  type="date"
                  value={commandItemGueltigBis}
                  onChange={(e) => setCommandItemGueltigBis(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm" />

                </div>
                <div data-ev-id="ev_cmd_hebt_auf_wrapper">
                  <label data-ev-id="ev_cmd_hebt_auf_label" className="block text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    Ersetzt Beschluss (optional)
                  </label>
                  <select
                  data-ev-id="ev_cmd_hebt_auf_select"
                  value={commandItemHebtAuf}
                  onChange={(e) => setCommandItemHebtAuf(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white">

                    <option data-ev-id="ev_ed6361216f" value="">Keinen Beschluss ersetzen</option>
                    {gueltigeBeschluesse.map((b) =>
                  <option data-ev-id="ev_8ee628998e" key={b.id} value={b.id}>
                        {b.beschluss_nummer} - {b.titel.substring(0, 50)}{b.titel.length > 50 ? '...' : ''}
                      </option>
                  )}
                  </select>
                </div>
              </div>
              
              {/* PDF Generation Options */}
              <div data-ev-id="ev_pdf_options" className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <label data-ev-id="ev_pdf_checkbox" className="flex items-center gap-2 cursor-pointer">
                  <input data-ev-id="ev_5ce2712802"
                type="checkbox"
                checked={generatePdfOnConfirm}
                onChange={(e) => setGeneratePdfOnConfirm(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />

                  <span data-ev-id="ev_6dfe45e96e" className="text-sm font-medium text-blue-800">PDF generieren und herunterladen</span>
                </label>
                {generatePdfOnConfirm &&
              <label data-ev-id="ev_schrift_checkbox" className="flex items-center gap-2 cursor-pointer ml-6">
                    <input data-ev-id="ev_0cedd319a2"
                type="checkbox"
                checked={sendToSchriftfuehrer}
                onChange={(e) => setSendToSchriftfuehrer(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />

                    <span data-ev-id="ev_7cc37ef8b2" className="text-sm text-blue-700">Benachrichtigung an Schriftführer senden</span>
                  </label>
              }
              </div>
            </div>
            <div data-ev-id="ev_d752df11b8" className="flex justify-end gap-2 mt-6">
              <button data-ev-id="ev_a230ed93e8"
            onClick={() => {
              setShowConfirmCommandItemModal(null);
              setCommandItemNotes('');
              setCommandItemGueltigBis('');
              setCommandItemHebtAuf('');
            }}
            disabled={isConfirmingItem}
            className="px-4 py-2 border border-border rounded-lg disabled:opacity-50">
                Abbrechen
              </button>
              <button data-ev-id="ev_b7f7edac85"
            onClick={async () => {
              setIsConfirmingItem(true);
              try {
                await confirmCommandDecisionItem(
                  showConfirmCommandItemModal,
                  commandItemNotes.trim() || undefined,
                  {
                    generatePdf: generatePdfOnConfirm,
                    sendToSchriftfuehrer: sendToSchriftfuehrer,
                    pdfBackgroundUrl: pdfBackgroundUrl || undefined,
                    pdfBackgroundOpacity: pdfBackgroundOpacity,
                    signatureUrl: commanderSignatureUrl || undefined,
                    stampUrl: commanderStampUrl || undefined,
                    commanderName: commanderProfile?.full_name,
                    gueltigBis: commandItemGueltigBis || undefined,
                    hebtAufId: commandItemHebtAuf || undefined
                  }
                );
              } finally {
                setIsConfirmingItem(false);
                setShowConfirmCommandItemModal(null);
                setCommandItemNotes('');
                setCommandItemGueltigBis('');
                setCommandItemHebtAuf('');
              }
            }}
            disabled={isConfirmingItem}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50">
                {isConfirmingItem ?
              <>
                    <div data-ev-id="ev_a0a4d50700" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Wird verarbeitet...
                  </> :

              <>
                    <CheckCircle2 className="w-4 h-4" /> Bestätigen & Ins Register
                  </>
              }
              </button>
            </div>
          </div>
        </div>
      }

      {/* Delete BANF Confirmation Modal */}
      {showDeleteBanfConfirm &&
      <div data-ev-id="ev_794a4617e5" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-ev-id="ev_577702330b" className="bg-card rounded-xl shadow-xl max-w-md w-full p-6">
            <div data-ev-id="ev_4546e2a557" className="flex items-center gap-3 mb-4">
              <div data-ev-id="ev_46327edfab" className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 data-ev-id="ev_d6dc26be85" className="text-lg font-semibold text-foreground">Umlaufbeschluss löschen</h3>
            </div>
            <p data-ev-id="ev_810b2e38fc" className="text-muted-foreground mb-2">
              Möchten Sie diesen Umlaufbeschluss wirklich <strong data-ev-id="ev_8f2da4945c">dauerhaft löschen</strong>?
            </p>
            <div data-ev-id="ev_28a25b0d12" className="bg-muted/50 rounded-lg p-3 mb-4">
              <p data-ev-id="ev_3ce0990ffb" className="font-medium">{showDeleteBanfConfirm.title}</p>
              <p data-ev-id="ev_65eef8dd3d" className="text-sm text-muted-foreground">
                {showDeleteBanfConfirm.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
            <p data-ev-id="ev_52691525e0" className="text-sm text-red-600 mb-6">
              Diese Aktion kann nicht rückgängig gemacht werden. Alle zugehörigen Anhänge werden ebenfalls gelöscht.
            </p>
            <div data-ev-id="ev_d0e0975760" className="flex gap-3 justify-end">
              <button data-ev-id="ev_f2d6bd392f"
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
            onClick={() => setShowDeleteBanfConfirm(null)}
            disabled={deletingBanf}>
                Abbrechen
              </button>
              <button data-ev-id="ev_17aca7ddc3"
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            onClick={() => handleDeleteBanfOrder(showDeleteBanfConfirm.id)}
            disabled={deletingBanf}>
                {deletingBanf ?
              <>
                    <div data-ev-id="ev_29c0b430d9" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Löschen...
                  </> :

              <>
                    <Trash2 className="w-4 h-4" />
                    Dauerhaft löschen
                  </>
              }
              </button>
            </div>
          </div>
        </div>
      }

      {/* Edit Decision Modal */}
      {editingDecision &&
      <div data-ev-id="ev_edit_decision_modal" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-ev-id="ev_b40870879d" className="bg-card rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 data-ev-id="ev_17a5b9d951" className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-primary" /> Beschluss bearbeiten
            </h3>
            <div data-ev-id="ev_e68931e63b" className="space-y-4">
              <div data-ev-id="ev_4583260e8c" className="bg-muted/30 rounded-lg p-3">
                <span data-ev-id="ev_d1c51668c1" className="text-xs text-muted-foreground">
                  {editingDecision.decision_number} | {editingDecision.source || 'Manuell'}
                </span>
              </div>
              <div data-ev-id="ev_0c478c998f">
                <label data-ev-id="ev_fe6cbc7100" className="block text-sm font-medium mb-1">Beschlusstext</label>
                <p data-ev-id="ev_92b42c8cb1" className="text-sm text-muted-foreground mb-2">Das Kommando möge beschließen,</p>
                <textarea data-ev-id="ev_5446ca71f3"
              value={editDecisionText}
              onChange={(e) => setEditDecisionText(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg h-32"
              placeholder="Beschlusstext eingeben..." />

              </div>

              {/* Gültigkeit und Aufhebung */}
              <div data-ev-id="ev_edit_decision_gueltigkeit" className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
                <p data-ev-id="ev_edit_gueltigkeit_title" className="text-sm font-medium flex items-center gap-2">
                  <CalendarX className="w-4 h-4 text-gray-600" />
                  Gültigkeit & Aufhebung (optional)
                </p>
                <div data-ev-id="ev_edit_gueltig_bis_wrapper">
                  <label data-ev-id="ev_edit_gueltig_bis_label" className="block text-xs text-muted-foreground mb-1">Gültig bis (leer = unbegrenzt)</label>
                  <input
                  data-ev-id="ev_edit_gueltig_bis_input"
                  type="date"
                  value={editDecisionGueltigBis}
                  onChange={(e) => setEditDecisionGueltigBis(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
                <div data-ev-id="ev_edit_hebt_auf_wrapper">
                  <label data-ev-id="ev_edit_hebt_auf_label" className="block text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    Ersetzt Beschluss (optional)
                  </label>
                  <select
                  data-ev-id="ev_edit_hebt_auf_select"
                  value={editDecisionHebtAuf}
                  onChange={(e) => setEditDecisionHebtAuf(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white">
                    <option data-ev-id="ev_97cbf08296" value="">Keinen Beschluss ersetzen</option>
                    {gueltigeBeschluesse.map((b) =>
                  <option data-ev-id="ev_8e6dc0fec1" key={b.id} value={b.id}>
                        {b.beschluss_nummer} - {b.titel.substring(0, 50)}{b.titel.length > 50 ? '...' : ''}
                      </option>
                  )}
                  </select>
                </div>
              </div>
            </div>
            <div data-ev-id="ev_06c92d3cbd" className="flex justify-end gap-2 mt-6">
              <button data-ev-id="ev_09c13dc397"
            onClick={() => {
              setEditingDecision(null);
              setEditDecisionText('');
              setEditDecisionGueltigBis('');
              setEditDecisionHebtAuf('');
            }}
            className="px-4 py-2 border border-border rounded-lg">

                Abbrechen
              </button>
              <button data-ev-id="ev_2118793dd8"
            onClick={async () => {
              if (editDecisionText.trim()) {
                await updateDecision(editingDecision.id, {
                  decision_text: editDecisionText.trim(),
                  gueltig_bis: editDecisionGueltigBis || null,
                  hebt_auf_id: editDecisionHebtAuf || null
                });
                setEditingDecision(null);
                setEditDecisionText('');
                setEditDecisionGueltigBis('');
                setEditDecisionHebtAuf('');
              }
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2">

                <Save className="w-4 h-4" /> Speichern
              </button>
            </div>
          </div>
        </div>
      }

      {/* Delete Meeting Confirmation Modal - nur Admin */}
      {showDeleteMeetingConfirm &&
      <div data-ev-id="ev_f8d35e7d04" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-ev-id="ev_14a275b3bb" className="bg-card rounded-xl shadow-xl max-w-md w-full p-6">
            <div data-ev-id="ev_f30dc53028" className="flex items-center gap-3 mb-4">
              <div data-ev-id="ev_c8bb9b1709" className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 data-ev-id="ev_1cca193694" className="text-lg font-semibold text-foreground">Sitzung löschen</h3>
            </div>
            <p data-ev-id="ev_7f31d59b97" className="text-muted-foreground mb-2">
              Möchten Sie diese Sitzung wirklich <strong data-ev-id="ev_258c814722">dauerhaft löschen</strong>?
            </p>
            <p data-ev-id="ev_9cabbdc2f1" className="text-sm text-red-600 mb-4">
              Alle zugehörigen Einträge, Beschlüsse und Anwesenheiten werden ebenfalls gelöscht.
            </p>
            <div data-ev-id="ev_0f7ef577a6" className="flex justify-end gap-3">
              <button data-ev-id="ev_23640a7f04"
            onClick={() => setShowDeleteMeetingConfirm(false)}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                Abbrechen
              </button>
              <button data-ev-id="ev_881649ab87"
            onClick={handleDeleteMeeting}
            disabled={deletingMeeting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                {deletingMeeting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Löschen...</> : <><Trash2 className="w-4 h-4" /> Endgültig löschen</>}
              </button>
            </div>
          </div>
        </div>
      }

      {/* Edit Meeting Details Modal - Admin/Kommandant */}
      {editingMeetingDetails &&
      <div data-ev-id="ev_061e71e232" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-ev-id="ev_31c8d4188e" className="bg-card rounded-xl shadow-xl max-w-md w-full p-6">
            <div data-ev-id="ev_7f2e5c4421" className="flex items-center gap-3 mb-4">
              <div data-ev-id="ev_e762e4547e" className="p-3 bg-primary/10 rounded-full">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <h3 data-ev-id="ev_d5e72b8160" className="text-lg font-semibold text-foreground">Sitzung bearbeiten</h3>
            </div>
            <div data-ev-id="ev_1deb74ce7e" className="space-y-4">
              <div data-ev-id="ev_6f1a5a484f">
                <label data-ev-id="ev_b1b38e49fa" className="block text-sm font-medium text-foreground mb-1">Datum</label>
                <input data-ev-id="ev_aab8fceb0b"
              type="date"
              value={meetingDetailsForm.date}
              onChange={(e) => setMeetingDetailsForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary" />

              </div>
              <div data-ev-id="ev_ee92d5c967">
                <label data-ev-id="ev_41e482a820" className="block text-sm font-medium text-foreground mb-1">Uhrzeit</label>
                <input data-ev-id="ev_f2f55f5342"
              type="time"
              value={meetingDetailsForm.time}
              onChange={(e) => setMeetingDetailsForm((f) => ({ ...f, time: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary" />

              </div>
              <div data-ev-id="ev_7e7bb30bf3">
                <label data-ev-id="ev_29d4526c88" className="block text-sm font-medium text-foreground mb-1">Ort</label>
                <input data-ev-id="ev_b25bc9aa39"
              type="text"
              value={meetingDetailsForm.location}
              onChange={(e) => setMeetingDetailsForm((f) => ({ ...f, location: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary" />

              </div>
            </div>
            <div data-ev-id="ev_a6e83cc423" className="flex justify-end gap-3 mt-6">
              <button data-ev-id="ev_4f93748bd1"
            onClick={() => setEditingMeetingDetails(false)}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                Abbrechen
              </button>
              <button data-ev-id="ev_9819294b87"
            onClick={handleSaveMeetingDetails}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2">
                <Save className="w-4 h-4" /> Speichern
              </button>
            </div>
          </div>
        </div>
      }

      {/* Pause Popup */}
      {showPausePopup &&
      <div data-ev-id="ev_pause_popup_overlay" className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
          <div data-ev-id="ev_pause_popup" className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-lg mx-4 animate-pulse">
            <div data-ev-id="ev_0aeee45cc4" className="text-8xl mb-6">⏸️</div>
            <h2 data-ev-id="ev_f91ce4f04c" className="text-5xl font-bold text-gray-800 mb-4">PAUSE</h2>
            <p data-ev-id="ev_d616b65e94" className="text-xl text-gray-600 mb-8">
              {pauseCount === 0 ? '90 Minuten' : '60 Minuten'} sind vergangen.<br data-ev-id="ev_824db2ccec" />
              Zeit für eine kurze Pause!
            </p>
            <button data-ev-id="ev_7187ce9cfc"
          onClick={handlePauseConfirm}
          className="px-8 py-4 bg-primary text-white text-xl font-semibold rounded-xl hover:bg-primary/90 transition-colors">

              Weiter (nächste Pause in 60 Min)
            </button>
          </div>
        </div>
      }
    </Layout>);

}