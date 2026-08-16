import { useState } from 'react';
import { ArrowLeft, FileText, Plus, X, GripVertical, ChevronUp, ChevronDown, Upload, Trash2 } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { generateCrewListPdfTwoColumn } from '@/utils/generateCrewListPdfPreview';

interface Position {
  id: string;
  label: string;
  prefillName?: string;
}

interface Vehicle {
  id: string;
  name: string;
  positions: Position[];
  selected: boolean;
}

interface CrewListSectionProps {
  onBack: () => void;
}

// Standard-Fahrzeuge - standardmäßig NICHT ausgewählt (Benutzer wählt selbst)
const DEFAULT_VEHICLES: Vehicle[] = [
{
  id: 'kdo',
  name: 'KDO',
  positions: [
  { id: 'kdo-ma', label: 'Maschinist (MA)' },
  { id: 'kdo-el', label: 'Einsatzleiter (EL)' },
  { id: 'kdo-mann', label: 'Mann' }],
  selected: false
},
{
  id: 'tank2',
  name: 'Tank 2',
  positions: [
  { id: 't2-ma', label: 'Maschinist (MA)' },
  { id: 't2-fk', label: 'Fahrzeugkommandant (FK)' },
  { id: 't2-as1', label: 'AS-Mann 1 (AS)' },
  { id: 't2-as2', label: 'AS-Mann 2 (AS)' },
  { id: 't2-as3', label: 'AS-Mann 3 (AS)' },
  { id: 't2-m1', label: 'Mann 1' },
  { id: 't2-m2', label: 'Mann 2' }],
  selected: false
},
{
  id: 'tank3',
  name: 'Tank 3',
  positions: [
  { id: 't3-ma', label: 'Maschinist (MA)' },
  { id: 't3-fk', label: 'Fahrzeugkommandant (FK)' },
  { id: 't3-as1', label: 'AS-Mann 1 (AS)' },
  { id: 't3-as2', label: 'AS-Mann 2 (AS)' },
  { id: 't3-as3', label: 'AS-Mann 3 (AS)' },
  { id: 't3-m1', label: 'Mann 1' },
  { id: 't3-m2', label: 'Mann 2' }],
  selected: false
},
{
  id: 'dlk',
  name: 'DLK',
  positions: [
  { id: 'dlk-ma', label: 'Maschinist (MA)' },
  { id: 'dlk-fk', label: 'Fahrzeugkommandant (FK)' },
  { id: 'dlk-as1', label: 'AS-Mann 1 (AS)' }],
  selected: false
},
{
  id: 'tank1',
  name: 'Tank 1',
  positions: [
  { id: 't1-ma', label: 'Maschinist (MA)' },
  { id: 't1-fk', label: 'Fahrzeugkommandant (FK)' },
  { id: 't1-as1', label: 'AS-Mann 1 (AS)' }],
  selected: false
},
{
  id: 'ruest1',
  name: 'Rüst 1',
  positions: [
  { id: 'r1-ma', label: 'Maschinist (MA)' },
  { id: 'r1-fk', label: 'Fahrzeugkommandant (FK)' },
  { id: 'r1-m1', label: 'Mann 1' }],
  selected: false
},
{
  id: 'ruest2',
  name: 'Rüst 2',
  positions: [
  { id: 'r2-ma', label: 'Maschinist (MA)' },
  { id: 'r2-fk', label: 'Fahrzeugkommandant (FK)' },
  { id: 'r2-m1', label: 'Mann 1' },
  { id: 'r2-m2', label: 'Mann 2' },
  { id: 'r2-m3', label: 'Mann 3' }],
  selected: false
}];


export function CrewListSection({ onBack }: CrewListSectionProps) {
  const { pdfBackgroundUrl } = useSettings();

  // Event-Daten
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');

  // Fahrzeuge
  const [vehicles, setVehicles] = useState<Vehicle[]>(DEFAULT_VEHICLES);

  // Neues Fahrzeug
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState('');

  // Position bearbeiten
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [newPositionLabel, setNewPositionLabel] = useState('');

  // Drag & Drop
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // PDF generieren
  const [generating, setGenerating] = useState(false);

  const toggleVehicle = (id: string) => {
    setVehicles((prev) => prev.map((v) =>
    v.id === id ? { ...v, selected: !v.selected } : v
    ));
  };

  const moveVehicle = (id: string, direction: 'up' | 'down') => {
    const index = vehicles.findIndex((v) => v.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= vehicles.length) return;

    const newVehicles = [...vehicles];
    [newVehicles[index], newVehicles[newIndex]] = [newVehicles[newIndex], newVehicles[index]];
    setVehicles(newVehicles);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = vehicles.findIndex((v) => v.id === draggedId);
    const targetIndex = vehicles.findIndex((v) => v.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newVehicles = [...vehicles];
    const [draggedVehicle] = newVehicles.splice(draggedIndex, 1);
    newVehicles.splice(targetIndex, 0, draggedVehicle);
    setVehicles(newVehicles);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const addVehicle = () => {
    if (!newVehicleName.trim()) return;

    const id = `custom-${Date.now()}`;
    setVehicles((prev) => [...prev, {
      id,
      name: newVehicleName.trim(),
      positions: [
      { id: `${id}-ma`, label: 'Maschinist (MA)' },
      { id: `${id}-fk`, label: 'Fahrzeugkommandant (FK)' }],

      selected: true
    }]);
    setNewVehicleName('');
    setShowAddVehicle(false);
  };

  const deleteVehicle = (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  };

  const addPosition = (vehicleId: string) => {
    if (!newPositionLabel.trim()) return;

    setVehicles((prev) => prev.map((v) => {
      if (v.id !== vehicleId) return v;
      return {
        ...v,
        positions: [...v.positions, {
          id: `${vehicleId}-${Date.now()}`,
          label: newPositionLabel.trim()
        }]
      };
    }));
    setNewPositionLabel('');
  };

  const removePosition = (vehicleId: string, positionId: string) => {
    setVehicles((prev) => prev.map((v) => {
      if (v.id !== vehicleId) return v;
      return {
        ...v,
        positions: v.positions.filter((p) => p.id !== positionId)
      };
    }));
  };

  const updatePositionName = (vehicleId: string, positionId: string, name: string) => {
    setVehicles((prev) => prev.map((v) => {
      if (v.id !== vehicleId) return v;
      return {
        ...v,
        positions: v.positions.map((p) =>
        p.id === positionId ? { ...p, prefillName: name } : p
        )
      };
    }));
  };

  const handleGeneratePdf = async () => {
    // Validierung: Veranstaltungsname und Datum sind Pflichtfelder
    if (!eventName.trim()) {
      alert('Bitte geben Sie den Veranstaltungsnamen ein.');
      return;
    }
    if (!eventDate.trim()) {
      alert('Bitte geben Sie das Datum ein.');
      return;
    }

    const selectedVehicles = vehicles.filter((v) => v.selected);
    if (selectedVehicles.length === 0) {
      alert('Bitte wählen Sie mindestens ein Fahrzeug aus.');
      return;
    }

    setGenerating(true);
    try {
      const vehiclesForPdf = selectedVehicles.map((v) => ({
        name: v.name,
        positions: v.positions.map((p) => ({ label: p.label, prefillName: p.prefillName }))
      }));

      await generateCrewListPdfTwoColumn({
        eventName: eventName,
        eventDate: eventDate,
        eventTime: eventTime,
        vehicles: vehiclesForPdf,
        pdfBackgroundUrl
      });
    } finally {
      setGenerating(false);
    }
  };

  const selectedCount = vehicles.filter((v) => v.selected).length;

  return (
    <div data-ev-id="ev_b34f1d9893" className="flex flex-col gap-6">
      {/* Header */}
      <div data-ev-id="ev_eae1db6485" className="flex items-center justify-between">
        <div data-ev-id="ev_811d03afb5" className="flex items-center gap-4">
          <button data-ev-id="ev_13b14d4552"
          onClick={onBack}
          className="p-2 hover:bg-muted rounded-lg transition-colors">

            <ArrowLeft className="w-5 h-5" />
          </button>
          <div data-ev-id="ev_25ea700664">
            <h1 data-ev-id="ev_d4bd1494e9" className="text-2xl font-bold text-foreground">Besatzungsliste</h1>
            <p data-ev-id="ev_52dda01ef8" className="text-muted-foreground">Fahrzeugbesetzung für Übungen und Einsätze</p>
          </div>
        </div>
        <button data-ev-id="ev_e865756c03"
        onClick={handleGeneratePdf}
        disabled={generating || selectedCount === 0 || !eventName.trim() || !eventDate.trim()}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50">

          <FileText className="w-4 h-4" />
          {generating ? 'Wird erstellt...' : 'PDF erstellen'}
        </button>
      </div>

      <div data-ev-id="ev_66958321f4" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Linke Spalte: Event-Daten */}
        <div data-ev-id="ev_1a55315f41" className="lg:col-span-1 space-y-4">
          <div data-ev-id="ev_996292c45b" className="bg-card border border-border rounded-xl p-4">
            <h2 data-ev-id="ev_e4b910a180" className="font-semibold mb-4">Veranstaltung</h2>
            
            <div data-ev-id="ev_91dc06a04c" className="space-y-3">
              <div data-ev-id="ev_8409274745">
                <label data-ev-id="ev_311d183a40" className="block text-sm text-muted-foreground mb-1">Name <span data-ev-id="ev_3fe1149e9f" className="text-red-500">*</span></label>
                <input data-ev-id="ev_ff8abbf3a2"
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="z.B. Übung Waldbrand 2026"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                required />

              </div>
              
              <div data-ev-id="ev_0c146983df">
                <label data-ev-id="ev_370fa73f7c" className="block text-sm text-muted-foreground mb-1">Datum <span data-ev-id="ev_609f0d19d0" className="text-red-500">*</span></label>
                <input data-ev-id="ev_ffd08ff32b"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                required />

              </div>
              
              <div data-ev-id="ev_316abc1f2e">
                <label data-ev-id="ev_2b6081eb28" className="block text-sm text-muted-foreground mb-1">Uhrzeit</label>
                <input data-ev-id="ev_acc772ef87"
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background" />

              </div>
            </div>
          </div>

          {/* Info */}
          <div data-ev-id="ev_b1fe2288ad" className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4">
            <p data-ev-id="ev_9b05bb4745" className="text-sm text-red-800 dark:text-red-200">
              <strong data-ev-id="ev_cc22994396">{selectedCount}</strong> von {vehicles.length} Fahrzeugen ausgewählt
            </p>
          </div>
        </div>

        {/* Rechte Spalte: Fahrzeuge */}
        <div data-ev-id="ev_2b8b158a26" className="lg:col-span-2">
          <div data-ev-id="ev_3d823af71e" className="bg-card border border-border rounded-xl p-4">
            <div data-ev-id="ev_1abbc153da" className="flex items-center justify-between mb-4">
              <h2 data-ev-id="ev_cb306cf27b" className="font-semibold">Fahrzeuge</h2>
              <button data-ev-id="ev_c6b8ba74a3"
              onClick={() => setShowAddVehicle(true)}
              className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1">

                <Plus className="w-4 h-4" />
                Fahrzeug
              </button>
            </div>

            {/* Neues Fahrzeug hinzufügen */}
            {showAddVehicle &&
            <div data-ev-id="ev_abcc5b8cb7" className="mb-4 p-3 bg-muted rounded-lg flex gap-2">
                <input data-ev-id="ev_a7c60416f2"
              type="text"
              value={newVehicleName}
              onChange={(e) => setNewVehicleName(e.target.value)}
              placeholder="Fahrzeugname"
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addVehicle()} />

                <button data-ev-id="ev_85d31104a2"
              onClick={addVehicle}
              className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm">

                  Hinzufügen
                </button>
                <button data-ev-id="ev_af3af8feb7"
              onClick={() => {setShowAddVehicle(false);setNewVehicleName('');}}
              className="px-3 py-2 bg-muted-foreground/20 rounded-lg text-sm">

                  <X className="w-4 h-4" />
                </button>
              </div>
            }

            {/* Fahrzeugliste */}
            <div data-ev-id="ev_c1d480d0d0" className="space-y-2">
              {vehicles.map((vehicle, index) =>
              <div data-ev-id="ev_edc56068a7"
              key={vehicle.id}
              draggable
              onDragStart={(e) => handleDragStart(e, vehicle.id)}
              onDragOver={(e) => handleDragOver(e, vehicle.id)}
              onDragEnd={handleDragEnd}
              className={`border rounded-lg transition-all ${
              draggedId === vehicle.id ? 'opacity-50' : ''} ${

              vehicle.selected ?
              'border-red-300 bg-red-50 dark:bg-red-950/20' :
              'border-border bg-background'}`
              }>

                  <div data-ev-id="ev_966367c29d" className="flex items-center gap-2 p-3">
                    {/* Drag Handle */}
                    <div data-ev-id="ev_5d7807a7c5" className="cursor-grab text-muted-foreground hover:text-foreground">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    
                    {/* Checkbox */}
                    <input data-ev-id="ev_5cf36e6ac3"
                  type="checkbox"
                  checked={vehicle.selected}
                  onChange={() => toggleVehicle(vehicle.id)}
                  className="w-4 h-4 accent-red-600" />

                    
                    {/* Name */}
                    <span data-ev-id="ev_d322b0639d" className={`flex-1 font-medium ${
                  vehicle.selected ? 'text-foreground' : 'text-muted-foreground'}`
                  }>
                      {vehicle.name}
                    </span>
                    
                    {/* Position Count */}
                    <span data-ev-id="ev_23e1b0f694" className="text-xs text-muted-foreground">
                      {vehicle.positions.length} Pos.
                    </span>
                    
                    {/* Move Buttons */}
                    <button data-ev-id="ev_1fa3157c0e"
                  onClick={() => moveVehicle(vehicle.id, 'up')}
                  disabled={index === 0}
                  className="p-1 hover:bg-muted rounded disabled:opacity-30">

                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button data-ev-id="ev_44fda5de17"
                  onClick={() => moveVehicle(vehicle.id, 'down')}
                  disabled={index === vehicles.length - 1}
                  className="p-1 hover:bg-muted rounded disabled:opacity-30">

                      <ChevronDown className="w-4 h-4" />
                    </button>
                    
                    {/* Edit Button */}
                    <button data-ev-id="ev_dd7b0c16cd"
                  onClick={() => setEditingVehicleId(editingVehicleId === vehicle.id ? null : vehicle.id)}
                  className={`p-1 rounded ${
                  editingVehicleId === vehicle.id ?
                  'bg-red-600 text-white' :
                  'hover:bg-muted'}`
                  }>

                      <FileText className="w-4 h-4" />
                    </button>
                    
                    {/* Delete (nur für custom) */}
                    {vehicle.id.startsWith('custom-') &&
                  <button data-ev-id="ev_fb437065f0"
                  onClick={() => deleteVehicle(vehicle.id)}
                  className="p-1 hover:bg-red-100 text-red-600 rounded">

                        <Trash2 className="w-4 h-4" />
                      </button>
                  }
                  </div>
                  
                  {/* Positionen bearbeiten */}
                  {editingVehicleId === vehicle.id &&
                <div data-ev-id="ev_7e32d5b1ce" className="border-t border-border p-3 bg-muted/50">
                      <div data-ev-id="ev_2e96f6e17c" className="text-sm font-medium mb-2">Positionen:</div>
                      <div data-ev-id="ev_a43cfcd9da" className="space-y-2 mb-3">
                        {vehicle.positions.map((pos) =>
                    <div data-ev-id="ev_f558f7fcc4" key={pos.id} className="flex items-center gap-2 text-sm bg-background rounded border border-border p-2">
                            <span data-ev-id="ev_02cb644690" className="w-32 text-xs text-muted-foreground truncate" title={pos.label}>
                              {pos.label}
                            </span>
                            <input data-ev-id="ev_3bc135797f"
                      type="text"
                      value={pos.prefillName || ''}
                      onChange={(e) => updatePositionName(vehicle.id, pos.id, e.target.value)}
                      placeholder="Name eingeben..."
                      className="flex-1 px-2 py-1 text-sm border border-border rounded bg-white" />

                            <button data-ev-id="ev_106d2492c0"
                      onClick={() => removePosition(vehicle.id, pos.id)}
                      className="p-1 hover:bg-red-100 text-red-600 rounded">

                              <X className="w-3 h-3" />
                            </button>
                          </div>
                    )}
                      </div>
                      <div data-ev-id="ev_a3c3dd50bd" className="flex gap-2">
                        <input data-ev-id="ev_ef2c271b7a"
                    type="text"
                    value={newPositionLabel}
                    onChange={(e) => setNewPositionLabel(e.target.value)}
                    placeholder="Neue Position"
                    className="flex-1 px-2 py-1 text-sm border border-border rounded bg-background"
                    onKeyDown={(e) => e.key === 'Enter' && addPosition(vehicle.id)} />

                        <button data-ev-id="ev_bf872d959d"
                    onClick={() => addPosition(vehicle.id)}
                    className="px-2 py-1 bg-red-600 text-white rounded text-sm">

                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                }
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>);

}