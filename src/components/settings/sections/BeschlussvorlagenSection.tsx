import { useState } from 'react';
import { Vote, Plus, Save, X, Edit2, Trash2 } from 'lucide-react';

interface BeschlussvorlagenSectionProps {
  decisionTextTemplates: string[];
  updateDecisionTextTemplates: (templates: string[]) => Promise<{ error: Error | null }>;
}

export function BeschlussvorlagenSection({
  decisionTextTemplates,
  updateDecisionTextTemplates
}: BeschlussvorlagenSectionProps) {
  const [newTemplate, setNewTemplate] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newTemplate.trim()) return;
    setSaving(true);
    await updateDecisionTextTemplates([...decisionTextTemplates, newTemplate.trim()]);
    setNewTemplate('');
    setSaving(false);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditText(decisionTextTemplates[index]);
  };

  const handleSaveEdit = async () => {
    if (editingIndex === null || !editText.trim()) return;
    setSaving(true);
    const newTemplates = [...decisionTextTemplates];
    newTemplates[editingIndex] = editText.trim();
    await updateDecisionTextTemplates(newTemplates);
    setEditingIndex(null);
    setEditText('');
    setSaving(false);
  };

  const handleDelete = async (index: number) => {
    if (!confirm('Diese Vorlage wirklich löschen?')) return;
    setSaving(true);
    const newTemplates = decisionTextTemplates.filter((_, i) => i !== index);
    await updateDecisionTextTemplates(newTemplates);
    setSaving(false);
  };

  return (
    <div data-ev-id="ev_beschlussvorlagen_section" className="max-w-2xl">
      {/* Header */}
      <div data-ev-id="ev_header" className="flex items-center gap-3 mb-6">
        <div data-ev-id="ev_icon" className="p-2 bg-indigo-100 rounded-lg">
          <Vote className="w-5 h-5 text-indigo-600" />
        </div>
        <div data-ev-id="ev_title_area">
          <h2 data-ev-id="ev_title" className="text-lg font-semibold text-foreground">Beschlussvorlagen</h2>
          <p data-ev-id="ev_subtitle" className="text-sm text-muted-foreground">
            Textvorlagen für Sitzungsbeschlüsse verwalten
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div data-ev-id="ev_info" className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p data-ev-id="ev_info_text" className="text-sm text-blue-700">
          Diese Vorlagen stehen bei der Erstellung neuer Beschlüsse in Sitzungen zur Auswahl.
          Zusätzlich kann immer auch ein eigener Text eingegeben werden.
        </p>
      </div>

      {/* Templates List */}
      <div data-ev-id="ev_templates_list" className="bg-card rounded-xl border border-border overflow-hidden mb-4">
        <div data-ev-id="ev_list_header" className="px-4 py-3 bg-muted/50 border-b border-border">
          <p data-ev-id="ev_list_title" className="text-sm font-medium text-foreground">
            {decisionTextTemplates.length} Vorlage{decisionTextTemplates.length !== 1 ? 'n' : ''}
          </p>
        </div>

        <div data-ev-id="ev_list_content" className="divide-y divide-border">
          {decisionTextTemplates.length === 0 ? (
            <div data-ev-id="ev_empty" className="p-8 text-center">
              <Vote className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p data-ev-id="ev_empty_text" className="text-muted-foreground">
                Noch keine Vorlagen definiert
              </p>
            </div>
          ) : (
            decisionTextTemplates.map((template, index) => (
              <div
                data-ev-id={`ev_template_${index}`}
                key={index}
                className="p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                {editingIndex === index ? (
                  <>
                    <input
                      data-ev-id={`ev_edit_input_${index}`}
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      autoFocus
                    />
                    <button
                      data-ev-id={`ev_save_edit_${index}`}
                      onClick={handleSaveEdit}
                      disabled={saving || !editText.trim()}
                      className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      data-ev-id={`ev_cancel_edit_${index}`}
                      onClick={() => { setEditingIndex(null); setEditText(''); }}
                      className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span data-ev-id={`ev_text_${index}`} className="flex-1 text-foreground">
                      {template}
                    </span>
                    <button
                      data-ev-id={`ev_edit_btn_${index}`}
                      onClick={() => handleEdit(index)}
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      data-ev-id={`ev_delete_btn_${index}`}
                      onClick={() => handleDelete(index)}
                      className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add New Template */}
      <div data-ev-id="ev_add_section" className="bg-card rounded-xl border border-border p-4">
        <label data-ev-id="ev_add_label" className="block text-sm font-medium text-foreground mb-2">
          Neue Vorlage hinzufügen
        </label>
        <div data-ev-id="ev_add_form" className="flex gap-2">
          <input
            data-ev-id="ev_add_input"
            type="text"
            value={newTemplate}
            onChange={(e) => setNewTemplate(e.target.value)}
            placeholder="z.B. Das Kommando möge beschließen,..."
            className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            data-ev-id="ev_add_btn"
            onClick={handleAdd}
            disabled={saving || !newTemplate.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
}
