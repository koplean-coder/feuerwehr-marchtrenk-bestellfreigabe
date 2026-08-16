import { useState } from 'react';
import { Briefcase, Plus, Save, Trash2, Check, X } from 'lucide-react';
import { SectionHeader, SectionCard } from '../SettingsContent';

interface FunctionDef {
  id: string;
  name: string;
  label: string;
}

interface FunktionenSectionProps {
  functions: FunctionDef[];
  addFunction: (name: string, label: string) => Promise<{error: Error | null;}>;
  updateFunction: (id: string, label: string) => Promise<{error: Error | null;}>;
  deleteFunction: (id: string) => Promise<{error: Error | null;}>;
  loading: boolean;
}

export function FunktionenSection({
  functions,
  addFunction,
  updateFunction,
  deleteFunction,
  loading
}: FunktionenSectionProps) {
  const [newFunc, setNewFunc] = useState({ name: '', label: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: '', label: '' });
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Show normalized key preview
  const normalizedPreview = newFunc.name ?
  newFunc.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_äöüß]/g, '') : '';

  const handleAdd = async () => {
    if (!newFunc.name || !newFunc.label) return;
    setAddError(null);
    setIsAdding(true);
    try {
      const result = await addFunction(newFunc.name, newFunc.label);
      if (result?.error) {
        // Check for duplicate key error
        if (result.error.message?.includes('duplicate') || result.error.message?.includes('unique')) {
          setAddError(`Schlüssel "${normalizedPreview}" existiert bereits!`);
        } else {
          setAddError(result.error.message || 'Fehler beim Anlegen');
        }
      } else {
        setNewFunc({ name: '', label: '' });
      }
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    } finally {
      setIsAdding(false);
    }
  };

  const handleEdit = (func: FunctionDef) => {
    setEditingId(func.id);
    setEditData({ name: func.name, label: func.label });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    await updateFunction(editingId, editData.label);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Diese Funktion wirklich löschen?')) {
      await deleteFunction(id);
    }
  };

  return (
    <div data-ev-id="ev_af24c4b0d4">
      <SectionHeader
        icon={Briefcase}
        title="Funktionen"
        description="Funktionen definieren, die Mitgliedern zugewiesen werden können." />


      {/* Add New Function */}
      <SectionCard className="mb-4">
        <h3 data-ev-id="ev_f560158912" className="font-semibold mb-3">Neue Funktion anlegen</h3>
        <div data-ev-id="ev_c553bbcf77" className="flex flex-col sm:flex-row gap-3">
          <input data-ev-id="ev_24ea2eb5cf"
          type="text"
          value={newFunc.name}
          onChange={(e) => setNewFunc((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Schlüssel (z.B. kassier)"
          className="flex-1 px-3 py-2 border border-input rounded-lg" />

          <input data-ev-id="ev_a37dc26b47"
          type="text"
          value={newFunc.label}
          onChange={(e) => setNewFunc((prev) => ({ ...prev, label: e.target.value }))}
          placeholder="Anzeigename (z.B. Kassier)"
          className="flex-1 px-3 py-2 border border-input rounded-lg" />

          <button data-ev-id="ev_eb44e3a991"
          onClick={handleAdd}
          disabled={!newFunc.name || !newFunc.label || isAdding}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">

            <Plus className="w-4 h-4" />
            {isAdding ? 'Speichern...' : 'Anlegen'}
          </button>
        </div>
        {normalizedPreview && normalizedPreview !== newFunc.name.toLowerCase() &&
        <p data-ev-id="ev_cadbb81ddf" className="text-xs text-muted-foreground mt-2">
            Wird gespeichert als: <code data-ev-id="ev_20e9292a46" className="bg-muted px-1 rounded">{normalizedPreview}</code>
          </p>
        }
        {addError &&
        <p data-ev-id="ev_488faacb4d" className="text-sm text-red-600 mt-2 flex items-center gap-1">
            <span data-ev-id="ev_bf35530ea0">⚠️</span> {addError}
          </p>
        }
      </SectionCard>

      {/* Functions List */}
      <div data-ev-id="ev_49f844b95f" className="bg-card border border-border rounded-lg overflow-hidden">
        <div data-ev-id="ev_7d3f1e8101" className="grid grid-cols-[1fr,1fr,auto] gap-4 p-3 bg-muted/50 text-sm font-medium text-muted-foreground border-b">
          <span data-ev-id="ev_e817d59a4f">Schlüssel</span>
          <span data-ev-id="ev_16bfe1c172">Anzeigename</span>
          <span data-ev-id="ev_288567d117" className="w-20"></span>
        </div>

        <div data-ev-id="ev_5f4dc0f66c" className="divide-y divide-border">
          {loading ?
          <div data-ev-id="ev_91856395e1" className="p-4 text-center text-muted-foreground">Laden...</div> :
          functions.length === 0 ?
          <div data-ev-id="ev_21b2d8c795" className="p-4 text-center text-muted-foreground">Keine Funktionen definiert</div> :

          functions.map((func) =>
          <div data-ev-id="ev_d45063a9d4"
          key={func.id}
          className="grid grid-cols-[1fr,1fr,auto] gap-4 items-center p-3 hover:bg-muted/30">

                {editingId === func.id ?
            <>
                    <input data-ev-id="ev_8fb45ff49c"
              type="text"
              value={editData.name}
              onChange={(e) => setEditData((prev) => ({ ...prev, name: e.target.value }))}
              className="px-2 py-1 border border-input rounded text-sm" />

                    <input data-ev-id="ev_b1a7527d06"
              type="text"
              value={editData.label}
              onChange={(e) => setEditData((prev) => ({ ...prev, label: e.target.value }))}
              className="px-2 py-1 border border-input rounded text-sm" />

                    <div data-ev-id="ev_f8f425aaa5" className="flex gap-1">
                      <button data-ev-id="ev_c6ed45837e"
                onClick={handleSaveEdit}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded">

                        <Check className="w-4 h-4" />
                      </button>
                      <button data-ev-id="ev_71fe40eb6c"
                onClick={() => setEditingId(null)}
                className="p-1.5 text-muted-foreground hover:bg-muted rounded">

                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </> :

            <>
                    <span data-ev-id="ev_75f2b724b0" className="font-mono text-sm text-muted-foreground">{func.name}</span>
                    <span data-ev-id="ev_82c8bda5e8" className="font-medium">{func.label}</span>
                    <div data-ev-id="ev_5ace4fb5b4" className="flex gap-1">
                      <button data-ev-id="ev_50c7dec7ea"
                onClick={() => handleEdit(func)}
                className="p-1.5 text-muted-foreground hover:bg-muted rounded">

                        <Save className="w-4 h-4" />
                      </button>
                      <button data-ev-id="ev_3ad234acea"
                onClick={() => handleDelete(func.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded">

                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
            }
              </div>
          )
          }
        </div>
      </div>
    </div>);

}