import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SectionHeader, SectionCard } from '../SettingsContent';
import { Plus, Pencil, Trash2, Save, X, ChevronUp, ChevronDown, ListChecks, CheckCircle2, AlertCircle } from 'lucide-react';

interface FixedAgendaItem {
  id: string;
  title: string;
  sort_order: number;
  is_mandatory: boolean | null;
  created_at: string;
}

export function TagesordnungSection() {
  const [items, setItems] = useState<FixedAgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<FixedAgendaItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error';message: string;} | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const fetchItems = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.
    from('meeting_fixed_agenda_items').
    select('*').
    order('sort_order');

    if (error) {
      setFeedback({ type: 'error', message: 'Fehler beim Laden der Tagesordnungspunkte' });
      console.error(error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!supabase || !newItemTitle.trim()) return;
    setSaving(true);

    const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) : 0;

    const { error } = await supabase.
    from('meeting_fixed_agenda_items').
    insert({
      title: newItemTitle.trim(),
      sort_order: maxOrder + 1,
      is_mandatory: false
    });

    if (error) {
      setFeedback({ type: 'error', message: 'Fehler beim Hinzufügen' });
      console.error(error);
    } else {
      setFeedback({ type: 'success', message: 'Tagesordnungspunkt hinzugefügt' });
      setNewItemTitle('');
      setShowAddForm(false);
      fetchItems();
    }
    setSaving(false);
  };

  const handleEdit = (item: FixedAgendaItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
  };

  const handleSaveEdit = async (item: FixedAgendaItem) => {
    if (!supabase || !editTitle.trim()) return;
    setSaving(true);

    const { error } = await supabase.
    from('meeting_fixed_agenda_items').
    update({ title: editTitle.trim() }).
    eq('id', item.id);

    if (error) {
      setFeedback({ type: 'error', message: 'Fehler beim Speichern' });
      console.error(error);
    } else {
      setFeedback({ type: 'success', message: 'Gespeichert' });
      setEditingId(null);
      setEditTitle('');
      fetchItems();
    }
    setSaving(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleDelete = async (item: FixedAgendaItem) => {
    if (!supabase) return;
    setSaving(true);

    const { error } = await supabase.
    from('meeting_fixed_agenda_items').
    delete().
    eq('id', item.id);

    if (error) {
      setFeedback({ type: 'error', message: 'Fehler beim Löschen' });
      console.error(error);
    } else {
      setFeedback({ type: 'success', message: 'Tagesordnungspunkt gelöscht' });
      setDeleteConfirm(null);
      fetchItems();
    }
    setSaving(false);
  };

  const handleToggleMandatory = async (item: FixedAgendaItem) => {
    if (!supabase) return;

    const { error } = await supabase.
    from('meeting_fixed_agenda_items').
    update({ is_mandatory: !item.is_mandatory }).
    eq('id', item.id);

    if (error) {
      setFeedback({ type: 'error', message: 'Fehler beim Aktualisieren' });
      console.error(error);
    } else {
      fetchItems();
    }
  };

  const handleMoveUp = async (item: FixedAgendaItem, index: number) => {
    if (!supabase || index === 0) return;

    const prevItem = items[index - 1];
    const updates = [
    { id: item.id, sort_order: prevItem.sort_order },
    { id: prevItem.id, sort_order: item.sort_order }];


    for (const update of updates) {
      await supabase.
      from('meeting_fixed_agenda_items').
      update({ sort_order: update.sort_order }).
      eq('id', update.id);
    }

    fetchItems();
  };

  const handleMoveDown = async (item: FixedAgendaItem, index: number) => {
    if (!supabase || index === items.length - 1) return;

    const nextItem = items[index + 1];
    const updates = [
    { id: item.id, sort_order: nextItem.sort_order },
    { id: nextItem.id, sort_order: item.sort_order }];


    for (const update of updates) {
      await supabase.
      from('meeting_fixed_agenda_items').
      update({ sort_order: update.sort_order }).
      eq('id', update.id);
    }

    fetchItems();
  };

  if (loading) {
    return (
      <div data-ev-id="ev_75fc630eef" className="flex items-center justify-center py-12">
        <div data-ev-id="ev_ff1ebf12d6" className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>);

  }

  return (
    <div data-ev-id="ev_edb6f7b2ad" className="space-y-6">
      <SectionHeader
        icon={ListChecks}
        title="Tagesordnung"
        description="Verwalten Sie die festen Tagesordnungspunkte für Sitzungen" />


      {/* Feedback Message */}
      {feedback &&
      <div data-ev-id="ev_c1d61d7e98" className={`flex items-center gap-2 p-3 rounded-lg ${
      feedback.type === 'success' ?
      'bg-green-50 text-green-700 border border-green-200' :
      'bg-red-50 text-red-700 border border-red-200'}`
      }>
          {feedback.type === 'success' ?
        <CheckCircle2 className="h-5 w-5" /> :

        <AlertCircle className="h-5 w-5" />
        }
          <span data-ev-id="ev_2f04318794">{feedback.message}</span>
        </div>
      }

      <SectionCard>
        {/* Header with Add Button */}
        <div data-ev-id="ev_b88728243b" className="flex items-center justify-between mb-4">
          <h3 data-ev-id="ev_aa384e5a2a" className="font-semibold">Tagesordnungspunkte</h3>
          {!showAddForm &&
          <button data-ev-id="ev_8f2a2ce0c3"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">

              <Plus className="h-4 w-4" />
              Hinzufügen
            </button>
          }
        </div>

        {/* Add Form */}
        {showAddForm &&
        <div data-ev-id="ev_fa19cce827" className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-dashed mb-4">
            <input data-ev-id="ev_f6e243ab0d"
          type="text"
          placeholder="Neuer Tagesordnungspunkt..."
          value={newItemTitle}
          onChange={(e) => setNewItemTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          autoFocus
          className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />

            <button data-ev-id="ev_15540e05b4"
          onClick={handleAdd}
          disabled={!newItemTitle.trim() || saving}
          className="p-2 text-green-600 hover:bg-green-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">

              <Save className="h-4 w-4" />
            </button>
            <button data-ev-id="ev_62035ed478"
          onClick={() => {setShowAddForm(false);setNewItemTitle('');}}
          className="p-2 text-muted-foreground hover:bg-muted rounded-md">

              <X className="h-4 w-4" />
            </button>
          </div>
        }

        {/* Items List */}
        {items.length === 0 ?
        <div data-ev-id="ev_f18865e546" className="text-center py-8 text-muted-foreground">
            Keine Tagesordnungspunkte vorhanden
          </div> :

        <div data-ev-id="ev_eff789d546" className="space-y-2">
            {items.map((item, index) =>
          <div data-ev-id="ev_618947fedb"
          key={item.id}
          className="flex items-center gap-3 p-3 bg-background border border-border rounded-lg hover:shadow-sm transition-shadow">

                {/* Order Controls */}
                <div data-ev-id="ev_49b993734a" className="flex flex-col items-center gap-0.5 text-muted-foreground">
                  <button data-ev-id="ev_735c876c39"
              onClick={() => handleMoveUp(item, index)}
              disabled={index === 0}
              className="p-0.5 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">

                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <span data-ev-id="ev_9f9f8b7e1d" className="text-xs font-medium w-5 text-center">{index + 1}</span>
                  <button data-ev-id="ev_85248de2dc"
              onClick={() => handleMoveDown(item, index)}
              disabled={index === items.length - 1}
              className="p-0.5 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">

                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                {/* Title */}
                <div data-ev-id="ev_5be0c6b838" className="flex-1">
                  {editingId === item.id ?
              <div data-ev-id="ev_b9b07c401d" className="flex items-center gap-2">
                      <input data-ev-id="ev_0628a20e4d"
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit(item);
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                autoFocus
                className="flex-1 px-2 py-1 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />

                      <button data-ev-id="ev_4ddae5a3b2"
                onClick={() => handleSaveEdit(item)}
                disabled={!editTitle.trim() || saving}
                className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50">

                        <Save className="h-4 w-4" />
                      </button>
                      <button data-ev-id="ev_058ef61651"
                onClick={handleCancelEdit}
                className="p-1 text-muted-foreground hover:bg-muted rounded">

                        <X className="h-4 w-4" />
                      </button>
                    </div> :

              <div data-ev-id="ev_171ca8b684" className="flex items-center gap-2">
                      <span data-ev-id="ev_8ca5b55e24" className="font-medium">{item.title}</span>
                      {item.is_mandatory &&
                <span data-ev-id="ev_714a538a44" className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                          Pflicht
                        </span>
                }
                    </div>
              }
                </div>

                {/* Mandatory Toggle */}
                {editingId !== item.id &&
            <label data-ev-id="ev_14931f457e" className="flex items-center gap-2 cursor-pointer">
                    <span data-ev-id="ev_f06dbced26" className="text-xs text-muted-foreground">Pflicht</span>
                    <button data-ev-id="ev_23576151c6"
              onClick={() => handleToggleMandatory(item)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              item.is_mandatory ? 'bg-red-500' : 'bg-gray-300'}`
              }>

                      <span data-ev-id="ev_e7e7f721e5"
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                item.is_mandatory ? 'translate-x-4' : 'translate-x-0.5'}`
                } />

                    </button>
                  </label>
            }

                {/* Actions */}
                {editingId !== item.id &&
            <div data-ev-id="ev_49be9da2df" className="flex items-center gap-1">
                    <button data-ev-id="ev_bdaeb3ea88"
              onClick={() => handleEdit(item)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded">

                      <Pencil className="h-4 w-4" />
                    </button>
                    <button data-ev-id="ev_d5e101180b"
              onClick={() => setDeleteConfirm(item)}
              className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded">

                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
            }
              </div>
          )}
          </div>
        }

        {/* Info */}
        <div data-ev-id="ev_9b0d6c77cd" className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 mt-4">
          <p data-ev-id="ev_5998e81e4d">
            <strong data-ev-id="ev_e7d9adbf66">Hinweis:</strong> Diese Punkte erscheinen als feste Tagesordnungspunkte in jeder Sitzung. 
            Mit den Pfeilen können Sie die Reihenfolge ändern. Pflichtpunkte müssen vor Sitzungsabschluss erledigt werden.
          </p>
        </div>
      </SectionCard>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm &&
      <div data-ev-id="ev_a87d7eb7a9" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div data-ev-id="ev_9af4e673e1" className="bg-background rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 data-ev-id="ev_a548101d9f" className="text-lg font-semibold mb-2">Tagesordnungspunkt löschen?</h3>
            <p data-ev-id="ev_5e7f59f5b1" className="text-muted-foreground mb-4">
              Möchten Sie "{deleteConfirm.title}" wirklich löschen? 
              Dieser Punkt wird aus allen zukünftigen Sitzungen entfernt.
            </p>
            <div data-ev-id="ev_6cb6d6f0b3" className="flex justify-end gap-2">
              <button data-ev-id="ev_e786d2ba98"
            onClick={() => setDeleteConfirm(null)}
            className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted">

                Abbrechen
              </button>
              <button data-ev-id="ev_36afae4be0"
            onClick={() => handleDelete(deleteConfirm)}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">

                Löschen
              </button>
            </div>
          </div>
        </div>
      }
    </div>);

}