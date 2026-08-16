import { useState, useEffect } from 'react';
import { useCommandDecisions, type CommandDecisionWithCreator } from '@/hooks/useCommandDecisions';
import { useCommandDecisionItems, type ItemWithVotes } from '@/hooks/useCommandDecisionItems';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { useProfiles } from '@/hooks/useProfiles';
import { CommandDecisionVotingModal } from '@/components/CommandDecisionVotingModal';
import { generateCommandDecisionPdf, generateExampleCommandDecisionPdf } from '@/utils/generateCommandDecisionPdf';
import {
  ArrowLeft,
  Plus,
  Vote,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Trash2,
  Send,
  Edit2,
  Download,
  Loader2,
  AlertCircle,
  List,
  Layers } from
'lucide-react';

interface CommandDecisionSectionProps {
  onBack: () => void;
}

type TabType = 'overview' | 'new';
type FilterStatus = 'all' | 'draft' | 'submitted' | 'approved' | 'rejected';

interface ItemFormData {
  id?: string;
  description: string;
}

export function CommandDecisionSection({ onBack }: CommandDecisionSectionProps) {
  const { profile } = useAuth();
  const { profiles } = useProfiles();
  const { pdfBackgroundUrl, pdfBackgroundOpacity, commanderSignatureUrl, commanderStampUrl } = useSettings();
  const {
    decisions,
    loading,
    canCreate,
    createDecision,
    updateDecision,
    deleteDecision,
    submitDecision,
    refetch
  } = useCommandDecisions();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDecision, setSelectedDecision] = useState<CommandDecisionWithCreator | null>(null);
  const [editingDecision, setEditingDecision] = useState<CommandDecisionWithCreator | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formItems, setFormItems] = useState<ItemFormData[]>([{ description: '' }]);
  const [submitting, setSubmitting] = useState(false);

  // Items hook for editing
  const { items: existingItems, addItem, updateItem, deleteItem, refetch: refetchItems } =
  useCommandDecisionItems(editingDecision?.id);

  // Sync items when editing
  useEffect(() => {
    if (editingDecision && existingItems.length > 0) {
      setFormItems(existingItems.map((i) => ({ id: i.id, description: i.description })));
    }
  }, [editingDecision, existingItems]);

  // Filter decisions
  // Exclude fully confirmed decisions (all items confirmed in meetings) - they go to Beschlussregister
  const filteredDecisions = decisions.filter((d) => {
    // Hide fully confirmed decisions - they are now in the Beschlussregister
    if (d.isFullyConfirmed) return false;

    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        d.title.toLowerCase().includes(search) ||
        d.reference_number.toLowerCase().includes(search) || (
        d.description?.toLowerCase().includes(search) ?? false));

    }
    return true;
  });

  // Stats
  const stats = {
    draft: decisions.filter((d) => d.status === 'draft').length,
    submitted: decisions.filter((d) => d.status === 'submitted').length,
    approved: decisions.filter((d) => d.status === 'approved').length,
    rejected: decisions.filter((d) => d.status === 'rejected').length
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      submitted: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
    };
    const labels: Record<string, string> = {
      draft: 'Entwurf',
      submitted: 'Abstimmung läuft',
      approved: 'Genehmigt',
      rejected: 'Abgelehnt'
    };
    return (
      <span data-ev-id="ev_55b61d87c2" className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>);

  };

  // Add new item to form
  const handleAddItem = () => {
    setFormItems((prev) => [...prev, { description: '' }]);
  };

  // Update item in form
  const handleUpdateItemForm = (index: number, description: string) => {
    setFormItems((prev) => prev.map((item, i) => i === index ? { ...item, description } : item));
  };

  // Remove item from form
  const handleRemoveItemForm = (index: number) => {
    if (formItems.length <= 1) return;
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async (andSubmit: boolean = false) => {
    const validItems = formItems.filter((i) => i.description.trim());
    if (!formTitle.trim() || validItems.length === 0) return;

    setSubmitting(true);
    try {
      // Create decision with first item as description for backwards compatibility
      const newDecision = await createDecision({
        title: formTitle.trim(),
        description: validItems[0].description.trim()
      });

      if (newDecision) {
        // Add additional items if any
        if (validItems.length > 1) {
          const { supabase } = await import('@/integrations/supabase/client');
          if (supabase) {
            // First add item for the first description (already in decision.description)
            await supabase.from('command_decision_items').insert({
              decision_id: newDecision.id,
              item_number: 1,
              description: validItems[0].description.trim()
            });

            // Add remaining items
            for (let i = 1; i < validItems.length; i++) {
              await supabase.from('command_decision_items').insert({
                decision_id: newDecision.id,
                item_number: i + 1,
                description: validItems[i].description.trim()
              });
            }
          }
        } else {
          // Single item - still add to items table
          const { supabase } = await import('@/integrations/supabase/client');
          if (supabase) {
            await supabase.from('command_decision_items').insert({
              decision_id: newDecision.id,
              item_number: 1,
              description: validItems[0].description.trim()
            });
          }
        }

        if (andSubmit) {
          await submitDecision(newDecision.id);
        }
      }

      setFormTitle('');
      setFormItems([{ description: '' }]);
      setActiveTab('overview');
    } catch (err) {
      console.error('Error creating decision:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingDecision || !formTitle.trim()) return;
    const validItems = formItems.filter((i) => i.description.trim());
    if (validItems.length === 0) return;

    setSubmitting(true);
    try {
      // Update decision title and first description
      await updateDecision(editingDecision.id, {
        title: formTitle.trim(),
        description: validItems[0].description.trim()
      });

      // Update items
      const { supabase } = await import('@/integrations/supabase/client');
      if (supabase) {
        // Delete existing items
        await supabase.from('command_decision_items').
        delete().
        eq('decision_id', editingDecision.id);

        // Re-add all items
        for (let i = 0; i < validItems.length; i++) {
          await supabase.from('command_decision_items').insert({
            decision_id: editingDecision.id,
            item_number: i + 1,
            description: validItems[i].description.trim()
          });
        }
      }

      setFormTitle('');
      setFormItems([{ description: '' }]);
      setEditingDecision(null);
      setActiveTab('overview');
      await refetch();
    } catch (err) {
      console.error('Error updating decision:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (decision: CommandDecisionWithCreator) => {
    setEditingDecision(decision);
    setFormTitle(decision.title);

    // Load items
    const { supabase } = await import('@/integrations/supabase/client');
    if (supabase) {
      const { data: items } = await supabase.
      from('command_decision_items').
      select('*').
      eq('decision_id', decision.id).
      order('item_number');

      if (items && items.length > 0) {
        setFormItems(items.map((i) => ({ id: i.id, description: i.description })));
      } else {
        // Fallback to description
        setFormItems([{ description: decision.description || '' }]);
      }
    }
    setActiveTab('new');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Möchten Sie diesen Entwurf wirklich löschen?')) return;
    await deleteDecision(id);
  };

  const handleSubmit = async (id: string) => {
    if (!confirm('Möchten Sie diesen Antrag zur Abstimmung einreichen? Alle Beschlusspunkte werden dann einzeln abgestimmt.')) return;
    await submitDecision(id);
  };

  const cancelEdit = () => {
    setEditingDecision(null);
    setFormTitle('');
    setFormItems([{ description: '' }]);
    setActiveTab('overview');
  };

  const handleDownloadPdf = async (decision: CommandDecisionWithCreator) => {
    if (!decision.id) return;

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      if (!supabase) return;

      // Fetch items
      const { data: itemsData } = await supabase.
      from('command_decision_items').
      select('*').
      eq('decision_id', decision.id).
      order('item_number');

      const getProfileName = (id: string) => profiles.find((p) => p.id === id)?.full_name || 'Unbekannt';
      const commanderProfile = profiles.find((p) => p.role === 'kommandant');

      // Build items with votes
      const items = await Promise.all((itemsData || []).map(async (item) => {
        const { data: votes } = await supabase.
        from('command_decision_item_votes').
        select('user_id, vote, reason').
        eq('item_id', item.id);

        const { data: missing } = await supabase.
        from('command_decision_item_votes_missing').
        select('user_id').
        eq('item_id', item.id);

        return {
          item_number: item.item_number,
          description: item.description,
          status: item.status,
          voting_result: item.voting_result,
          voting_override_by: item.voting_override_by,
          voting_override_reason: item.voting_override_reason,
          votes: (votes || []).map((v) => ({
            voter_name: getProfileName(v.user_id),
            vote: v.vote as 'approve' | 'reject' | 'abstain',
            reason: v.reason
          })),
          missingVoters: (missing || []).map((m) => getProfileName(m.user_id))
        };
      }));

      // Fallback: if no items, use legacy votes
      if (items.length === 0) {
        const { data: legacyVotes } = await supabase.
        from('command_decision_votes').
        select('user_id, vote, reason').
        eq('decision_id', decision.id);

        const { data: legacyMissing } = await supabase.
        from('command_decision_votes_missing').
        select('user_id').
        eq('decision_id', decision.id);

        await generateCommandDecisionPdf({
          decision: {
            id: decision.id,
            reference_number: decision.reference_number,
            title: decision.title,
            description: decision.description,
            status: decision.status,
            created_at: decision.created_at,
            submitted_at: decision.submitted_at,
            voting_closed_at: decision.voting_closed_at,
            voting_result: decision.voting_result,
            voting_override_by: decision.voting_override_by,
            voting_override_reason: decision.voting_override_reason
          },
          creatorName: decision.creator?.full_name || 'Unbekannt',
          votes: (legacyVotes || []).map((v) => ({
            voter_name: getProfileName(v.user_id),
            vote: v.vote as 'approve' | 'reject' | 'abstain',
            reason: v.reason
          })),
          missingVoters: (legacyMissing || []).map((m) => getProfileName(m.user_id)),
          pdfBackgroundUrl,
          pdfBackgroundOpacity,
          signatureUrl: commanderSignatureUrl,
          stampUrl: commanderStampUrl,
          commanderName: commanderProfile?.full_name
        });
        return;
      }

      await generateCommandDecisionPdf({
        decision: {
          id: decision.id,
          reference_number: decision.reference_number,
          title: decision.title,
          status: decision.status,
          created_at: decision.created_at,
          submitted_at: decision.submitted_at,
          voting_closed_at: decision.voting_closed_at
        },
        items,
        creatorName: decision.creator?.full_name || 'Unbekannt',
        pdfBackgroundUrl,
        pdfBackgroundOpacity,
        signatureUrl: commanderSignatureUrl,
        stampUrl: commanderStampUrl,
        commanderName: commanderProfile?.full_name
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  const handleDownloadExamplePdf = async () => {
    try {
      await generateExampleCommandDecisionPdf();
    } catch (err) {
      console.error('Error generating example PDF:', err);
    }
  };

  // Access check
  if (!canCreate) {
    return (
      <div data-ev-id="ev_7d08615f71" className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 data-ev-id="ev_9267cea687" className="text-xl font-semibold mb-2">Kein Zugriff</h2>
        <p data-ev-id="ev_b8bea9cbd8">Nur Kommandomitglieder und Administratoren können Kommandoabstimmungen erstellen.</p>
        <div data-ev-id="ev_6c5040d3a9" className="flex gap-3 mt-4">
          <button data-ev-id="ev_63a4b8ee09" onClick={onBack} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Zurück
          </button>
          <button data-ev-id="ev_abcb5e123e"
          onClick={handleDownloadExamplePdf}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center gap-2">

            <Download size={16} />
            Beispiel-PDF
          </button>
        </div>
      </div>);

  }

  return (
    <div data-ev-id="ev_75cabb0315" className="flex flex-col gap-6">
      {/* Header */}
      <div data-ev-id="ev_47383d35eb" className="flex items-center justify-between">
        <div data-ev-id="ev_0afd06dd0e" className="flex items-center gap-4">
          <button data-ev-id="ev_406d5b522a" onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div data-ev-id="ev_35e0be9e08">
            <h1 data-ev-id="ev_c03d60b738" className="text-2xl font-bold text-slate-800 dark:text-slate-100">Kommandoabstimmungen</h1>
            <p data-ev-id="ev_24f7794296" className="text-sm text-slate-500 dark:text-slate-400">Anträge zur Abstimmung durch das Kommando</p>
          </div>
        </div>
        <button data-ev-id="ev_cd6cb49c6d"
        onClick={handleDownloadExamplePdf}
        className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2"
        title="Beispiel-PDF herunterladen">

          <Download size={16} />
          Beispiel-PDF
        </button>
      </div>

      {/* Tabs */}
      <div data-ev-id="ev_6e465d8973" className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button data-ev-id="ev_bff8600c91"
        onClick={() => {setActiveTab('overview');cancelEdit();}}
        className={`px-4 py-2 font-medium border-b-2 transition-colors ${
        activeTab === 'overview' ?
        'border-blue-500 text-blue-600 dark:text-blue-400' :
        'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`
        }>

          Übersicht
        </button>
        <button data-ev-id="ev_9946b20692"
        onClick={() => setActiveTab('new')}
        className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${
        activeTab === 'new' ?
        'border-blue-500 text-blue-600 dark:text-blue-400' :
        'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`
        }>

          <Plus size={16} />
          {editingDecision ? 'Bearbeiten' : 'Neuer Antrag'}
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' &&
      <div data-ev-id="ev_199cf5d20f" className="flex flex-col gap-6">
          {/* Stats */}
          <div data-ev-id="ev_c7456e520c" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div data-ev-id="ev_e170062a88"
          onClick={() => setFilterStatus('draft')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
          filterStatus === 'draft' ?
          'bg-gray-200 dark:bg-gray-700 ring-2 ring-gray-400' :
          'bg-gray-100 dark:bg-gray-800 hover:bg-gray-150'}`
          }>

              <div data-ev-id="ev_0e877d6734" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                <FileText size={16} />
                <span data-ev-id="ev_306d2952f5" className="text-sm">Entwürfe</span>
              </div>
              <div data-ev-id="ev_89a6120569" className="text-2xl font-bold text-gray-700 dark:text-gray-300">{stats.draft}</div>
            </div>
            <div data-ev-id="ev_78b395fe89"
          onClick={() => setFilterStatus('submitted')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
          filterStatus === 'submitted' ?
          'bg-orange-200 dark:bg-orange-900/50 ring-2 ring-orange-400' :
          'bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-150'}`
          }>

              <div data-ev-id="ev_8c59dd197c" className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
                <Clock size={16} />
                <span data-ev-id="ev_913a5dfa00" className="text-sm">Laufend</span>
              </div>
              <div data-ev-id="ev_92a3e47b14" className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.submitted}</div>
            </div>
            <div data-ev-id="ev_13a57dea49"
          onClick={() => setFilterStatus('approved')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
          filterStatus === 'approved' ?
          'bg-green-200 dark:bg-green-900/50 ring-2 ring-green-400' :
          'bg-green-100 dark:bg-green-900/30 hover:bg-green-150'}`
          }>

              <div data-ev-id="ev_14bf0b99e6" className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                <CheckCircle size={16} />
                <span data-ev-id="ev_d35fecf82d" className="text-sm">Genehmigt</span>
              </div>
              <div data-ev-id="ev_36b5ee9fa1" className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.approved}</div>
            </div>
            <div data-ev-id="ev_51041d74e7"
          onClick={() => setFilterStatus('rejected')}
          className={`p-4 rounded-xl cursor-pointer transition-all ${
          filterStatus === 'rejected' ?
          'bg-red-200 dark:bg-red-900/50 ring-2 ring-red-400' :
          'bg-red-100 dark:bg-red-900/30 hover:bg-red-150'}`
          }>

              <div data-ev-id="ev_52450a9fc1" className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                <XCircle size={16} />
                <span data-ev-id="ev_8ef5bd0cff" className="text-sm">Abgelehnt</span>
              </div>
              <div data-ev-id="ev_5ded006bc3" className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.rejected}</div>
            </div>
          </div>

          {/* Filter & Search */}
          <div data-ev-id="ev_a3a723786b" className="flex flex-col sm:flex-row gap-4">
            <div data-ev-id="ev_9d7d145742" className="flex-1">
              <input data-ev-id="ev_a94cad7087"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Suchen..."
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" />

            </div>
            <button data-ev-id="ev_cb10e9b31d"
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
          filterStatus === 'all' ?
          'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' :
          'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`
          }>

              Alle anzeigen
            </button>
          </div>

          {/* List */}
          {loading ?
        <div data-ev-id="ev_98766e7e57" className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div> :
        filteredDecisions.length === 0 ?
        <div data-ev-id="ev_8ee4a0c58e" className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Vote className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p data-ev-id="ev_89a83a3f66" className="text-lg font-medium">
                {searchTerm ? 'Keine Ergebnisse gefunden' : 'Keine Kommandoabstimmungen vorhanden'}
              </p>
              <p data-ev-id="ev_0e2d55be69" className="text-sm mt-1">
                {!searchTerm && 'Erstellen Sie einen neuen Antrag zur Abstimmung'}
              </p>
            </div> :

        <div data-ev-id="ev_0ec30dcfe4" className="flex flex-col gap-3">
              {filteredDecisions.map((decision) =>
          <div data-ev-id="ev_5e9b75effa"
          key={decision.id}
          className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow">

                  <div data-ev-id="ev_f688cdd81e" className="flex items-start justify-between gap-4">
                    <div data-ev-id="ev_38cd521db1" className="flex-1 min-w-0">
                      <div data-ev-id="ev_377736aa29" className="flex items-center gap-2 mb-1 flex-wrap">
                        <span data-ev-id="ev_8dd7726f86" className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {decision.reference_number}
                        </span>
                        {(decision.itemCount ?? 0) > 1 &&
                  <span data-ev-id="ev_6e715273cd" className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs rounded-full font-medium">
                            <Layers className="w-3 h-3" />
                            {decision.itemCount} Punkte
                          </span>
                  }
                        {getStatusBadge(decision.status)}
                        {(decision.status === 'approved' || decision.status === 'rejected') && decision.hasUnconfirmedItems &&
                  <span data-ev-id="ev_6e715273cd" className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                            → Zur Sitzungsbestätigung
                          </span>
                  }
                      </div>
                      <h3 data-ev-id="ev_ca4aa84c6e" className="font-medium text-slate-800 dark:text-slate-100 truncate">
                        {decision.title}
                      </h3>
                      {decision.description &&
                <p data-ev-id="ev_597b31b207" className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          <span data-ev-id="ev_6872e7f566" className="text-violet-600 dark:text-violet-400 font-medium">Das Kommando möge beschließen:</span>{' '}
                          "{decision.description}"
                        </p>
                }
                      <p data-ev-id="ev_127d5a2adc" className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                        Erstellt von {decision.creator?.full_name || 'Unbekannt'} am{' '}
                        {new Date(decision.created_at).toLocaleDateString('de-DE')}
                      </p>
                    </div>

                    <div data-ev-id="ev_a8dd0d40ac" className="flex items-center gap-2">
                      {decision.status === 'draft' && decision.created_by === profile?.id &&
                <>
                          <button data-ev-id="ev_a263f4139d"
                  onClick={() => handleSubmit(decision.id)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                  title="Einreichen">

                            <Send size={18} />
                          </button>
                          <button data-ev-id="ev_53580b6709"
                  onClick={() => handleEdit(decision)}
                  className="p-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  title="Bearbeiten">

                            <Edit2 size={18} />
                          </button>
                          <button data-ev-id="ev_971d218976"
                  onClick={() => handleDelete(decision.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                  title="Löschen">

                            <Trash2 size={18} />
                          </button>
                        </>
                }
                      {decision.status === 'submitted' &&
                <button data-ev-id="ev_13462389b1"
                onClick={() => setSelectedDecision(decision)}
                className="px-3 py-1.5 bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded-lg hover:bg-violet-200 dark:hover:bg-violet-900 font-medium text-sm flex items-center gap-2">

                          <Vote size={16} />
                          Abstimmen
                        </button>
                }
                      {(decision.status === 'approved' || decision.status === 'rejected') &&
                <>
                          <button data-ev-id="ev_adad1505aa"
                  onClick={() => setSelectedDecision(decision)}
                  className="p-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  title="Details ansehen">

                            <FileText size={18} />
                          </button>
                          <button data-ev-id="ev_f13058fc93"
                  onClick={() => handleDownloadPdf(decision)}
                  className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"
                  title="PDF herunterladen">

                            <Download size={18} />
                          </button>
                        </>
                }
                    </div>
                  </div>
                </div>
          )}
            </div>
        }
        </div>
      }

      {/* New/Edit Tab */}
      {activeTab === 'new' &&
      <div data-ev-id="ev_4e1d1e7108" className="max-w-2xl">
          <div data-ev-id="ev_3551c5a30f" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 data-ev-id="ev_600a4a098b" className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6">
              {editingDecision ? 'Antrag bearbeiten' : 'Neuen Antrag erstellen'}
            </h2>

            <div data-ev-id="ev_6edb02bdd4" className="flex flex-col gap-4">
              <div data-ev-id="ev_e3cb4f5b80">
                <label data-ev-id="ev_fedae0c317" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Titel / Betreff *
                </label>
                <input data-ev-id="ev_f112e91867"
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
              placeholder="z.B. Beschaffungsantrag Ausrüstung" />

              </div>

              {/* Items Section */}
              <div data-ev-id="ev_9b3b589ea4">
                <div data-ev-id="ev_1f6b6dfb03" className="flex items-center justify-between mb-2">
                  <label data-ev-id="ev_ee942d9b67" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Beschlusspunkte *
                  </label>
                  <span data-ev-id="ev_5eaab3769e" className="text-xs text-slate-500">{formItems.length} Punkt(e)</span>
                </div>

                <div data-ev-id="ev_08b792a0ef" className="flex flex-col gap-3">
                  {formItems.map((item, index) =>
                <div data-ev-id="ev_fe422580af" key={index} className="relative">
                      <div data-ev-id="ev_c14d02ba69" className="flex items-start gap-2">
                        <div data-ev-id="ev_8ab30d05e9" className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded-full text-sm font-medium">
                          {index + 1}
                        </div>
                        <div data-ev-id="ev_707aaac42b" className="flex-1">
                          <div data-ev-id="ev_b48ca9799d" className="text-xs text-violet-600 dark:text-violet-400 mb-1 font-medium">
                            Das Kommando möge beschließen:
                          </div>
                          <textarea data-ev-id="ev_064c99c5b6"
                      value={item.description}
                      onChange={(e) => handleUpdateItemForm(index, e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                      placeholder="Beschreiben Sie den Beschluss..." />

                          <div data-ev-id="ev_5fb40a029e" className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            zu beschließen.
                          </div>
                        </div>
                        {formItems.length > 1 &&
                    <button data-ev-id="ev_354e06d799"
                    onClick={() => handleRemoveItemForm(index)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                    title="Beschlusspunkt entfernen">

                            <Trash2 size={16} />
                          </button>
                    }
                      </div>
                    </div>
                )}
                </div>

                <button data-ev-id="ev_3689e5e466"
              onClick={handleAddItem}
              className="mt-3 w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 hover:border-violet-500 hover:text-violet-500 dark:hover:border-violet-400 dark:hover:text-violet-400 transition-colors flex items-center justify-center gap-2">

                  <Plus size={18} />
                  Weiteren Beschlusspunkt hinzufügen
                </button>

                <p data-ev-id="ev_e3faf25cd0" className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Jeder Beschlusspunkt wird separat abgestimmt.
                </p>
              </div>

              <div data-ev-id="ev_4bd8b1caf2" className="flex gap-3 pt-4">
                {editingDecision ?
              <>
                    <button data-ev-id="ev_1ddf883c08"
                onClick={cancelEdit}
                className="flex-1 py-3 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium">

                      Abbrechen
                    </button>
                    <button data-ev-id="ev_865e0c3f94"
                onClick={handleUpdate}
                disabled={!formTitle.trim() || !formItems.some((i) => i.description.trim()) || submitting}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium">

                      {submitting ? 'Wird gespeichert...' : 'Speichern'}
                    </button>
                  </> :

              <>
                    <button data-ev-id="ev_dfef19ae45"
                onClick={() => handleCreate(false)}
                disabled={!formTitle.trim() || !formItems.some((i) => i.description.trim()) || submitting}
                className="flex-1 py-3 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium disabled:opacity-50">

                      Als Entwurf speichern
                    </button>
                    <button data-ev-id="ev_c703992bc2"
                onClick={() => handleCreate(true)}
                disabled={!formTitle.trim() || !formItems.some((i) => i.description.trim()) || submitting}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded-lg font-medium flex items-center justify-center gap-2">

                      <Send size={18} />
                      {submitting ? 'Wird eingereicht...' : 'Speichern & Einreichen'}
                    </button>
                  </>
              }
              </div>
            </div>
          </div>
        </div>
      }

      {/* Voting Modal */}
      {selectedDecision &&
      <CommandDecisionVotingModal
        decision={selectedDecision}
        onClose={() => {setSelectedDecision(null);refetch();}} />

      }
    </div>);

}