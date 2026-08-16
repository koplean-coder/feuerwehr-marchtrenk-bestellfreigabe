import { useState } from 'react';
import { ArrowLeft, Download, Plus, X, Save, Copy, Trash2, Edit2, FileText, Loader2, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useEventFormTemplates, EventFormTemplate } from '@/hooks/useEventFormTemplates';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/contexts/AuthContext';
import { generateEventSignupFormPdf, CategoryOption, EventSignupFormData } from '@/utils/generateEventSignupFormPdf';
import { CrewListSection } from '@/components/CrewListSection';

interface FormGeneratorSectionProps {
  onBack: () => void;
}

interface FormState {
  eventName: string;
  description: string;
  location: string;
  dateTime: string;
  vehicles: string;
  adjustment: string;
  adjustmentNote: string;
  registrationDeadline: string;
  categories: CategoryOption[];
  prefillNames: string[];
}

const initialFormState: FormState = {
  eventName: '',
  description: '',
  location: '',
  dateTime: '',
  vehicles: '',
  adjustment: 'FF Sportbekleidung',
  adjustmentNote: 'muss getragen werden, wenn vorhanden',
  registrationDeadline: '',
  categories: [],
  prefillNames: []
};

export function FormGeneratorSection({ onBack }: FormGeneratorSectionProps) {
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate } = useEventFormTemplates();
  const { pdfBackgroundUrl } = useSettings();
  const { profile } = useAuth();

  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<EventFormTemplate | null>(null);
  const [generating, setGenerating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryShortName, setNewCategoryShortName] = useState('');
  const [newCategoryHasAs, setNewCategoryHasAs] = useState(false);
  const [newCategoryRequiresCheckbox, setNewCategoryRequiresCheckbox] = useState(true);
  const [activeTab, setActiveTab] = useState<'form' | 'templates' | 'crewlist'>('form');
  const [diagonalHeaders, setDiagonalHeaders] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<EventFormTemplate | null>(null);
  const [newPrefillName, setNewPrefillName] = useState('');

  // Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<string[][]>([]);
  const [importColumnMappings, setImportColumnMappings] = useState<string[]>([]);
  const [importSkipFirstRow, setImportSkipFirstRow] = useState(true);

  const resetForm = () => {
    setFormData(initialFormState);
    setSaveAsTemplate(false);
    setTemplateName('');
    setEditingTemplate(null);
  };

  const loadTemplate = (template: EventFormTemplate) => {
    setFormData({
      eventName: template.event_name,
      description: template.description || '',
      location: template.location,
      dateTime: template.date_time,
      vehicles: template.vehicles || '',
      adjustment: template.adjustment,
      adjustmentNote: template.adjustment_note || '',
      registrationDeadline: template.registration_deadline,
      categories: template.categories || [],
      prefillNames: (template as unknown as {prefill_names?: string[];}).prefill_names || []
    });
    setTemplateName(template.name);
    setEditingTemplate(template);
    setSaveAsTemplate(false);
    setActiveTab('form');
  };

  const addCategory = () => {
    if (!newCategoryName.trim()) return;

    setFormData((prev) => ({
      ...prev,
      categories: [
      ...prev.categories,
      {
        name: newCategoryName.trim(),
        shortName: newCategoryShortName.trim() || undefined,
        hasAsOption: newCategoryHasAs,
        requiresCheckbox: newCategoryRequiresCheckbox
      }]

    }));

    setNewCategoryName('');
    setNewCategoryShortName('');
    setNewCategoryHasAs(false);
    setNewCategoryRequiresCheckbox(true);
  };

  const removeCategory = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index)
    }));
  };

  const addPrefillName = () => {
    if (!newPrefillName.trim()) return;
    setFormData((prev) => ({
      ...prev,
      prefillNames: [...prev.prefillNames, newPrefillName.trim()]
    }));
    setNewPrefillName('');
  };

  const removePrefillName = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      prefillNames: prev.prefillNames.filter((_, i) => i !== index)
    }));
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        let rows: string[][] = [];

        if (file.name.endsWith('.csv')) {
          // CSV parsing
          const text = data as string;
          const lines = text.split(/\r?\n/).filter((line) => line.trim());
          rows = lines.map((line) => line.split(/[,;]/).map((cell) => cell.trim()));
        } else {
          // Excel parsing
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 });
          rows = rows.map((row) => (row || []).map((cell) => String(cell || '').trim()));
        }

        // Filter empty rows
        rows = rows.filter((row) => row.some((cell) => cell.length > 0));

        if (rows.length > 0) {
          // Determine number of columns
          const maxCols = Math.max(...rows.map((r) => r.length));
          // Initialize column mappings (default: first column = full name, rest = ignore)
          const defaultMappings = Array(maxCols).fill('ignorieren');
          if (maxCols > 0) defaultMappings[0] = 'name';

          setImportPreviewData(rows);
          setImportColumnMappings(defaultMappings);
          setImportSkipFirstRow(true);
          setImportModalOpen(true);
        } else {
          alert('Keine Daten in der Datei gefunden');
        }
      } catch (err) {
        console.error('Fehler beim Import:', err);
        alert('Fehler beim Importieren der Datei');
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }

    // Reset input
    event.target.value = '';
  };

  const processImport = () => {
    const startRow = importSkipFirstRow ? 1 : 0;
    const names: string[] = [];

    // Find column indices for each type
    const vornameIdx = importColumnMappings.indexOf('vorname');
    const nachnameIdx = importColumnMappings.indexOf('nachname');
    const nameIdx = importColumnMappings.indexOf('name');

    for (let i = startRow; i < importPreviewData.length; i++) {
      const row = importPreviewData[i];
      let fullName = '';

      if (nameIdx >= 0 && row[nameIdx]) {
        // Full name in one column
        fullName = row[nameIdx].trim();
      } else if (vornameIdx >= 0 || nachnameIdx >= 0) {
        // Combine first and last name
        const vorname = vornameIdx >= 0 ? (row[vornameIdx] || '').trim() : '';
        const nachname = nachnameIdx >= 0 ? (row[nachnameIdx] || '').trim() : '';
        fullName = [vorname, nachname].filter(Boolean).join(' ');
      }

      if (fullName.length > 0) {
        names.push(fullName);
      }
    }

    if (names.length > 0) {
      setFormData((prev) => ({
        ...prev,
        prefillNames: [...prev.prefillNames, ...names]
      }));
    }

    setImportModalOpen(false);
    setImportPreviewData([]);
    setImportColumnMappings([]);
  };

  const handleGeneratePdf = async () => {
    if (!formData.eventName || !formData.location || !formData.dateTime || !formData.registrationDeadline) {
      alert('Bitte fuellen Sie alle Pflichtfelder aus.');
      return;
    }

    setGenerating(true);
    try {
      // Save template if checkbox is checked
      if (saveAsTemplate && templateName.trim()) {
        const templateData = {
          name: templateName.trim(),
          event_name: formData.eventName,
          description: formData.description || null,
          location: formData.location,
          date_time: formData.dateTime,
          vehicles: formData.vehicles || null,
          adjustment: formData.adjustment,
          adjustment_note: formData.adjustmentNote || null,
          registration_deadline: formData.registrationDeadline,
          categories: formData.categories
        };

        if (editingTemplate) {
          await updateTemplate(editingTemplate.id, templateData);
        } else {
          await createTemplate(templateData);
        }
      }

      // Generate PDF
      const pdfData: EventSignupFormData = {
        eventName: formData.eventName,
        description: formData.description || undefined,
        location: formData.location,
        dateTime: formData.dateTime,
        vehicles: formData.vehicles || undefined,
        adjustment: formData.adjustment,
        adjustmentNote: formData.adjustmentNote,
        registrationDeadline: formData.registrationDeadline,
        categories: formData.categories.length > 0 ? formData.categories : undefined,
        prefillNames: formData.prefillNames.length > 0 ? formData.prefillNames : undefined,
        creatorName: profile?.full_name || 'Unbekannt',
        pdfBackgroundUrl,
        diagonalHeaders
      };

      await generateEventSignupFormPdf(pdfData);
    } catch (err) {
      console.error('Error:', err);
      alert('Fehler beim Erstellen');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteTemplate = async (template: EventFormTemplate) => {
    setTemplateToDelete(template);
  };

  const confirmDeleteTemplate = async () => {
    if (templateToDelete) {
      try {
        await deleteTemplate(templateToDelete.id);
        setTemplateToDelete(null);
      } catch (err) {
        console.error('Fehler beim Löschen:', err);
        alert('Fehler beim Löschen der Vorlage');
        setTemplateToDelete(null);
      }
    }
  };

  const handleDuplicateTemplate = async (template: EventFormTemplate) => {
    await duplicateTemplate(template);
  };

  return (
    <div data-ev-id="ev_5067c351c1" className="space-y-6">
      {/* Header */}
      <div data-ev-id="ev_0727dfa228" className="flex items-center justify-between">
        <div data-ev-id="ev_e5def0e86c" className="flex items-center gap-4">
          <button data-ev-id="ev_30fa43adb5"
          onClick={onBack}
          className="p-2 hover:bg-muted rounded-lg transition-colors">

            <ArrowLeft className="w-5 h-5" />
          </button>
          <div data-ev-id="ev_0c9a3e81d5">
            <h1 data-ev-id="ev_d0a3c81e24" className="text-2xl font-bold text-foreground">Formulargenerator</h1>
            <p data-ev-id="ev_286c16b905" className="text-muted-foreground">Anmeldeformulare fuer den Aushang erstellen</p>
          </div>
        </div>

      </div>

      {/* Tabs */}
      <div data-ev-id="ev_a840ec35bc" className="flex gap-2 border-b border-border">
        <button data-ev-id="ev_9a1097fed9"
        onClick={() => setActiveTab('form')}
        className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
        activeTab === 'form' ?
        'border-primary text-primary' :
        'border-transparent text-muted-foreground hover:text-foreground'}`
        }>

          <FileText className="w-4 h-4 inline mr-2" />
          Neues Formular
        </button>
        <button data-ev-id="ev_2163ef6de8"
        onClick={() => setActiveTab('templates')}
        className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
        activeTab === 'templates' ?
        'border-primary text-primary' :
        'border-transparent text-muted-foreground hover:text-foreground'}`
        }>

          <Save className="w-4 h-4 inline mr-2" />
          Gespeicherte Vorlagen ({templates.length})
        </button>
        <button data-ev-id="ev_41d4eab79a"
        onClick={() => setActiveTab('crewlist')}
        className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
        activeTab === 'crewlist' ?
        'border-red-600 text-red-600' :
        'border-transparent text-muted-foreground hover:text-foreground'}`
        }>
          <FileText className="w-4 h-4 inline mr-2" />
          Besatzungsliste
        </button>
      </div>

      {activeTab === 'form' ?
      <div data-ev-id="ev_097e2e7338" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div data-ev-id="ev_429e44a73e" className="lg:col-span-2 space-y-6">
            <div data-ev-id="ev_fdc9c0ce6b" className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h2 data-ev-id="ev_b558c9cca7" className="text-lg font-semibold">Veranstaltungsdaten</h2>
              
              {/* Event Name */}
              <div data-ev-id="ev_651c7e3e40">
                <label data-ev-id="ev_6e100d9f34" className="block text-sm font-medium mb-1">
                  Veranstaltungsname *
                </label>
                <input data-ev-id="ev_60c9ce3385"
              type="text"
              value={formData.eventName}
              onChange={(e) => setFormData((prev) => ({ ...prev, eventName: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              placeholder="z.B. Feuerwehr Meilenlauf 2026" />

              </div>

              {/* Description */}
              <div data-ev-id="ev_2aabd3ecc3">
                <label data-ev-id="ev_33fa984cdc" className="block text-sm font-medium mb-1">
                  Beschreibung <span data-ev-id="ev_b21d75d1ff" className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea data-ev-id="ev_ec315f2b94"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none"
              placeholder="Zusätzliche Informationen zur Veranstaltung... (Enter für Zeilenumbruch)"
              rows={3} />

              </div>

              {/* Location */}
              <div data-ev-id="ev_97c38f409e">
                <label data-ev-id="ev_8f844add02" className="block text-sm font-medium mb-1">
                  Ort *
                </label>
                <input data-ev-id="ev_deac118a65"
              type="text"
              value={formData.location}
              onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              placeholder="z.B. Sportplatz Marchtrenk" />

              </div>

              {/* Date/Time */}
              <div data-ev-id="ev_eed4bbb886">
                <label data-ev-id="ev_1f3fbb7aba" className="block text-sm font-medium mb-1">
                  Datum & Uhrzeit *
                </label>
                <input data-ev-id="ev_9ce15b078d"
              type="text"
              value={formData.dateTime}
              onChange={(e) => setFormData((prev) => ({ ...prev, dateTime: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              placeholder="z.B. 20. September 2026, 09:00 Uhr" />

              </div>

              {/* Vehicles */}
              <div data-ev-id="ev_6ddd17f154">
                <label data-ev-id="ev_0972a63044" className="block text-sm font-medium mb-1">Fahrzeuge

              </label>
                <input data-ev-id="ev_e6e0246afb"
              type="text"
              value={formData.vehicles}
              onChange={(e) => setFormData((prev) => ({ ...prev, vehicles: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              placeholder="z.B. KLF, MTF" />
              </div>

              {/* Registration Deadline */}
              <div data-ev-id="ev_570899ddf1">
                <label data-ev-id="ev_7ccac18236" className="block text-sm font-medium mb-1">
                  Anmeldefrist *
                </label>
                <input data-ev-id="ev_066caf1080"
              type="text"
              value={formData.registrationDeadline}
              onChange={(e) => setFormData((prev) => ({ ...prev, registrationDeadline: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              placeholder="z.B. 10. September 2026" />

              </div>

              {/* Adjustment */}
              <div data-ev-id="ev_a1cf51bf57" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div data-ev-id="ev_ce5f562760">
                  <label data-ev-id="ev_d97aafa07a" className="block text-sm font-medium mb-1">
                    Adjustierung
                  </label>
                  <input data-ev-id="ev_d482c6f3f0"
                type="text"
                value={formData.adjustment}
                onChange={(e) => setFormData((prev) => ({ ...prev, adjustment: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                placeholder="z.B. FF Sportbekleidung" />

                </div>
                <div data-ev-id="ev_fb8da22869">
                  <label data-ev-id="ev_59bb40aacc" className="block text-sm font-medium mb-1">
                    Hinweis zur Adjustierung
                  </label>
                  <input data-ev-id="ev_0ccca55328"
                type="text"
                value={formData.adjustmentNote}
                onChange={(e) => setFormData((prev) => ({ ...prev, adjustmentNote: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                placeholder="z.B. muss getragen werden" />

                </div>
              </div>
            </div>

            {/* Categories */}
            <div data-ev-id="ev_f51a109888" className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h2 data-ev-id="ev_3b0e384046" className="text-lg font-semibold">Kategorien (optional)</h2>
              <p data-ev-id="ev_96de9e9337" className="text-sm text-muted-foreground">
                Fuer Laufveranstaltungen etc. - jede Kategorie wird eine Spalte mit Checkbox
              </p>

              {/* Existing Categories */}
              {formData.categories.length > 0 &&
            <div data-ev-id="ev_ff18fdec6b" className="space-y-2">
                  {formData.categories.map((cat, idx) =>
              <div data-ev-id="ev_9c4e6882c9" key={idx} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div data-ev-id="ev_07b7b52f6b" className="flex-1">
                        <span data-ev-id="ev_6d43886d0e" className="font-medium">{cat.name}</span>
                        {cat.shortName &&
                  <span data-ev-id="ev_833a63e4c8" className="text-muted-foreground ml-2">({cat.shortName})</span>
                  }
                        {cat.hasAsOption &&
                  <span data-ev-id="ev_0527dd861f" className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                            +AS Option
                          </span>
                  }
                        {cat.requiresCheckbox === false &&
                  <span data-ev-id="ev_6403a06622" className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                            Textfeld
                          </span>
                  }
                      </div>
                      <button data-ev-id="ev_94615c95ca"
                onClick={() => removeCategory(idx)}
                className="p-1 hover:bg-red-100 text-red-600 rounded">

                        <X className="w-4 h-4" />
                      </button>
                    </div>
              )}
                </div>
            }

              {/* Add Category */}
              <div data-ev-id="ev_f2cc4dac11" className="flex flex-wrap gap-3 items-end p-4 bg-muted/30 rounded-lg">
                <div data-ev-id="ev_ed04ca27d0" className="flex-1 min-w-[150px]">
                  <label data-ev-id="ev_1228aea309" className="block text-xs font-medium mb-1">Name</label>
                  <input data-ev-id="ev_a3df86c827"
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                placeholder="z.B. 10 Meilen" />

                </div>
                <div data-ev-id="ev_8d5a7d9970" className="w-24">
                  <label data-ev-id="ev_a7ead1189d" className="block text-xs font-medium mb-1">Kuerzel</label>
                  <input data-ev-id="ev_f6898bfb08"
                type="text"
                value={newCategoryShortName}
                onChange={(e) => setNewCategoryShortName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                placeholder="10M" />

                </div>
                <div data-ev-id="ev_332187efbc" className="flex items-center gap-4">
                  <div data-ev-id="ev_a45a6c4857" className="flex items-center gap-2">
                    <input data-ev-id="ev_54c3574f3d"
                  type="checkbox"
                  id="hasAs"
                  checked={newCategoryHasAs}
                  onChange={(e) => setNewCategoryHasAs(e.target.checked)}
                  disabled={!newCategoryRequiresCheckbox}
                  className="w-4 h-4 disabled:opacity-50" />
                    <label data-ev-id="ev_3181c67211" htmlFor="hasAs" className={`text-sm ${!newCategoryRequiresCheckbox ? 'opacity-50' : ''}`}>+AS</label>
                  </div>
                  <div data-ev-id="ev_767a9ee986" className="flex items-center gap-2">
                    <input data-ev-id="ev_bb11ec9613"
                  type="checkbox"
                  id="requiresCheckbox"
                  checked={newCategoryRequiresCheckbox}
                  onChange={(e) => {
                    setNewCategoryRequiresCheckbox(e.target.checked);
                    if (!e.target.checked) setNewCategoryHasAs(false);
                  }}
                  className="w-4 h-4" />
                    <label data-ev-id="ev_01018aaa18" htmlFor="requiresCheckbox" className="text-sm">Checkbox</label>
                  </div>
                </div>
                <button data-ev-id="ev_f02d4cfecf"
              onClick={addCategory}
              disabled={!newCategoryName.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">

                  <Plus className="w-4 h-4" />
                  Hinzufuegen
                </button>
              </div>
            </div>

            {/* Prefill Names */}
            <div data-ev-id="ev_7f7f08e058" className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div data-ev-id="ev_5fdf69d261" className="flex items-center justify-between">
                <div data-ev-id="ev_8953c05f6d">
                  <h2 data-ev-id="ev_5d0c6ceda1" className="text-lg font-semibold">Teilnehmer vorerfassen (optional)</h2>
                  <p data-ev-id="ev_63e9041cbc" className="text-sm text-muted-foreground">
                    Namen die bereits im Formular eingetragen sein sollen
                  </p>
                </div>
                <label data-ev-id="ev_9dd997af75" className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg cursor-pointer flex items-center gap-2 text-sm font-medium transition-colors">
                  <Upload className="w-4 h-4" />
                  CSV/Excel importieren
                  <input data-ev-id="ev_a5a13e59a3"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileImport}
                className="hidden" />

                </label>
              </div>

              {/* Existing Names */}
              {formData.prefillNames.length > 0 &&
            <div data-ev-id="ev_404e617805" className="space-y-2">
                  <div data-ev-id="ev_e8ff0976ef" className="flex items-center justify-between mb-2">
                    <span data-ev-id="ev_b5d4767d72" className="text-sm text-muted-foreground">
                      {formData.prefillNames.length} Teilnehmer erfasst
                    </span>
                    <button data-ev-id="ev_fe996ecd60"
                onClick={() => setFormData((prev) => ({ ...prev, prefillNames: [] }))}
                className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1">

                      <Trash2 className="w-3 h-3" />
                      Alle löschen
                    </button>
                  </div>
                  <div data-ev-id="ev_0130d7545a" className="max-h-48 overflow-y-auto space-y-1">
                    {formData.prefillNames.map((name, idx) =>
                <div data-ev-id="ev_50d50da519" key={idx} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                        <span data-ev-id="ev_139b2cee04" className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                        <span data-ev-id="ev_0e8102375c" className="flex-1 font-medium text-sm">{name}</span>
                        <button data-ev-id="ev_f2ec9d5f0e"
                  onClick={() => removePrefillName(idx)}
                  className="p-1 hover:bg-red-100 text-red-600 rounded">

                          <X className="w-4 h-4" />
                        </button>
                      </div>
                )}
                  </div>
                </div>
            }

              {/* Add Name */}
              <div data-ev-id="ev_641b39190b" className="flex gap-3 items-end p-4 bg-muted/30 rounded-lg">
                <div data-ev-id="ev_f0003c0836" className="flex-1">
                  <label data-ev-id="ev_33ef492d52" className="block text-xs font-medium mb-1">Name</label>
                  <input data-ev-id="ev_a0554dbbf4"
                type="text"
                value={newPrefillName}
                onChange={(e) => setNewPrefillName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPrefillName()}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                placeholder="z.B. Max Mustermann" />

                </div>
                <button data-ev-id="ev_104cfb0f09"
              onClick={addPrefillName}
              disabled={!newPrefillName.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">

                  <Plus className="w-4 h-4" />
                  Hinzufügen
                </button>
              </div>
            </div>

            {/* Layout Options with Preview */}
            {formData.categories.length > 0 &&
          <div data-ev-id="ev_9343ed2cfe" className="bg-card border border-border rounded-xl p-6">
                <h2 data-ev-id="ev_a59dc79132" className="text-lg font-semibold mb-4">Layout-Optionen</h2>
                <div data-ev-id="ev_454f4deb4e" className="flex items-center gap-4 mb-4">
                  <span data-ev-id="ev_d5604a250c" className="text-sm font-medium">Ueberschriften-Stil:</span>
                  <div data-ev-id="ev_07643eff66" className="flex gap-2">
                    {/* Horizontal Button with Hover Preview */}
                    <div data-ev-id="ev_ba40cb7a17" className="relative group">
                      <button data-ev-id="ev_556907dadb"
                  onClick={() => setDiagonalHeaders(false)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                  !diagonalHeaders ?
                  'bg-primary text-primary-foreground border-primary' :
                  'bg-background border-border hover:bg-muted'}`
                  }>

                        Horizontal
                      </button>
                      {/* Hover Preview */}
                      <div data-ev-id="ev_ca66b47523" className="absolute left-0 top-full mt-2 p-3 bg-white border border-border rounded-lg shadow-xl z-50 hidden group-hover:block min-w-[280px]">
                        <p data-ev-id="ev_cc66f034c0" className="text-xs text-muted-foreground mb-2 font-medium">Vorschau:</p>
                        <div data-ev-id="ev_ed064b8d33" className="bg-gray-800 rounded overflow-hidden">
                          <div data-ev-id="ev_37692e3f34" className="flex text-white text-[8px] font-bold">
                            <div data-ev-id="ev_45c6bb24d1" className="flex-1 px-2 py-1 border-r border-gray-600">NAME</div>
                            {formData.categories.map((cat, i) =>
                        <div data-ev-id="ev_68364e9ebc" key={i} className="px-2 py-1 border-r border-gray-600 text-center" style={{ minWidth: '40px' }}>
                                {cat.shortName || cat.name}
                                {cat.hasAsOption && <span data-ev-id="ev_79751f20c4" className="block text-[6px] text-gray-400">+AS</span>}
                              </div>
                        )}
                            <div data-ev-id="ev_b4fb5a2458" className="px-2 py-1 text-center" style={{ minWidth: '60px' }}>UNTERSCHRIFT</div>
                          </div>
                        </div>
                        <div data-ev-id="ev_e3b38ce56a" className="mt-1 border border-gray-200 rounded">
                          <div data-ev-id="ev_3252c6facb" className="flex text-[8px] border-b border-gray-100">
                            <div data-ev-id="ev_8b22f7ad6d" className="flex-1 px-2 py-1 border-r border-gray-100"></div>
                            {formData.categories.map((cat, i) =>
                        <div data-ev-id="ev_238a63f1a1" key={i} className="px-2 py-1 border-r border-gray-100 flex justify-center gap-1" style={{ minWidth: '40px' }}>
                                <span data-ev-id="ev_2a5cf2d912" className="w-2 h-2 border border-gray-400"></span>
                                {cat.hasAsOption && <span data-ev-id="ev_2c5390bd56" className="w-2 h-2 border border-gray-400"></span>}
                              </div>
                        )}
                            <div data-ev-id="ev_babeda3978" className="px-2 py-1"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Diagonal Button with Hover Preview */}
                    <div data-ev-id="ev_f86b8da2b3" className="relative group">
                      <button data-ev-id="ev_4048ac63aa"
                  onClick={() => setDiagonalHeaders(true)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                  diagonalHeaders ?
                  'bg-primary text-primary-foreground border-primary' :
                  'bg-background border-border hover:bg-muted'}`
                  }>

                        Diagonal (45°)
                      </button>
                      {/* Hover Preview */}
                      <div data-ev-id="ev_f10a9e7d76" className="absolute left-0 top-full mt-2 p-3 bg-white border border-border rounded-lg shadow-xl z-50 hidden group-hover:block min-w-[280px]">
                        <p data-ev-id="ev_c1ee4a8080" className="text-xs text-muted-foreground mb-2 font-medium">Vorschau:</p>
                        <div data-ev-id="ev_e4a25fd36a" className="bg-gray-800 rounded overflow-hidden">
                          <div data-ev-id="ev_7a353a807a" className="flex text-white text-[8px] font-bold h-12 items-end">
                            <div data-ev-id="ev_b9522acfd9" className="flex-1 px-2 pb-1 border-r border-gray-600 flex items-end justify-center">
                              <span data-ev-id="ev_16b30a0af1">NAME</span>
                            </div>
                            {formData.categories.map((cat, i) =>
                        <div data-ev-id="ev_0f8828a4b9" key={i} className="px-1 pb-1 border-r border-gray-600 text-center overflow-visible" style={{ minWidth: '35px' }}>
                                <span data-ev-id="ev_857424f3c1" className="inline-block origin-bottom-left rotate-[-45deg] translate-y-[-8px] whitespace-nowrap">
                                  {cat.shortName || cat.name}
                                </span>
                              </div>
                        )}
                            <div data-ev-id="ev_1d18e381ea" className="px-1 pb-1 flex items-end justify-center" style={{ minWidth: '60px' }}>
                              <span data-ev-id="ev_40ec760a1e">UNTERSCHRIFT</span>
                            </div>
                          </div>
                        </div>
                        <div data-ev-id="ev_229dc29430" className="mt-1 border border-gray-200 rounded">
                          <div data-ev-id="ev_b9d9c2aeaa" className="flex text-[8px] border-b border-gray-100">
                            <div data-ev-id="ev_d8d9de5701" className="flex-1 px-2 py-1 border-r border-gray-100"></div>
                            {formData.categories.map((cat, i) =>
                        <div data-ev-id="ev_6fa007cc1e" key={i} className="px-1 py-1 border-r border-gray-100 flex justify-center gap-1" style={{ minWidth: '35px' }}>
                                <span data-ev-id="ev_363d220069" className="w-2 h-2 border border-gray-400"></span>
                                {cat.hasAsOption && <span data-ev-id="ev_f1909bcd1f" className="w-2 h-2 border border-gray-400"></span>}
                              </div>
                        )}
                            <div data-ev-id="ev_ce6978c216" className="px-2 py-1"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Current Selection Preview */}
                <div data-ev-id="ev_04d1bcb759" className="p-3 bg-muted/50 rounded-lg">
                  <p data-ev-id="ev_5aa7d72111" className="text-xs text-muted-foreground mb-2">Aktuelle Auswahl: <strong data-ev-id="ev_21e248e79d">{diagonalHeaders ? 'Diagonal (45°)' : 'Horizontal'}</strong></p>
                  <div data-ev-id="ev_351031182e" className="bg-gray-800 rounded overflow-hidden">
                    <div data-ev-id="ev_59ed087aea" className={`flex text-white text-[9px] font-bold ${diagonalHeaders ? 'h-10 items-end' : ''}`}>
                      <div data-ev-id="ev_17f3a12817" className={`flex-1 px-2 ${diagonalHeaders ? 'pb-1' : 'py-1'} border-r border-gray-600 ${diagonalHeaders ? 'flex items-end justify-center' : ''}`}>
                        NAME
                      </div>
                      {formData.categories.map((cat, i) =>
                  <div data-ev-id="ev_5734e3d863" key={i} className={`px-2 ${diagonalHeaders ? 'pb-1' : 'py-1'} border-r border-gray-600 text-center`} style={{ minWidth: diagonalHeaders ? '30px' : '40px' }}>
                          {diagonalHeaders ?
                    <span data-ev-id="ev_de1718ee55" className="inline-block origin-bottom-left rotate-[-45deg] translate-y-[-6px] whitespace-nowrap text-[8px]">
                              {cat.shortName || cat.name}
                            </span> :

                    <>
                              {cat.shortName || cat.name}
                              {cat.hasAsOption && <span data-ev-id="ev_31a20a4969" className="block text-[6px] text-gray-400">+AS</span>}
                            </>
                    }
                        </div>
                  )}
                      <div data-ev-id="ev_24452a9db6" className={`px-2 ${diagonalHeaders ? 'pb-1' : 'py-1'} ${diagonalHeaders ? 'flex items-end justify-center' : 'text-center'}`} style={{ minWidth: '65px' }}>
                        UNTERSCHRIFT
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          }

            {/* Save as Template & Generate */}
            <div data-ev-id="ev_93b5b9113b" className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div data-ev-id="ev_9ff2cc291e" className="flex items-start gap-3">
                <input data-ev-id="ev_1f81970ddc"
              type="checkbox"
              id="saveTemplate"
              checked={saveAsTemplate}
              onChange={(e) => setSaveAsTemplate(e.target.checked)}
              className="w-5 h-5 mt-0.5" />

                <div data-ev-id="ev_9ec128e887" className="flex-1">
                  <label data-ev-id="ev_fa8acbdd9b" htmlFor="saveTemplate" className="font-medium cursor-pointer">
                    Als Vorlage speichern
                  </label>
                  <p data-ev-id="ev_73ac3196c4" className="text-sm text-muted-foreground">
                    Fuer spaetere Verwendung (z.B. naechstes Jahr)
                  </p>
                </div>
              </div>

              {saveAsTemplate &&
            <div data-ev-id="ev_6e819ddfdd">
                  <label data-ev-id="ev_acf77aefc7" className="block text-sm font-medium mb-1">
                    Vorlagenname
                  </label>
                  <input data-ev-id="ev_5bc19e4732"
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              placeholder="z.B. Meilenlauf Standard" />

                </div>
            }

              <div data-ev-id="ev_4bee7bf66e" className="flex gap-3 pt-2">
                <button data-ev-id="ev_7bed885ed3"
              onClick={handleGeneratePdf}
              disabled={generating}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium">

                  {generating ?
                <Loader2 className="w-5 h-5 animate-spin" /> :

                <Download className="w-5 h-5" />
                }
                  PDF generieren
                </button>
                <button data-ev-id="ev_95d5e6c42a"
              onClick={resetForm}
              className="px-4 py-3 border border-border rounded-lg hover:bg-muted transition-colors">

                  Zuruecksetzen
                </button>
              </div>
            </div>
          </div>

          {/* Preview Info */}
          <div data-ev-id="ev_4f1103f596" className="space-y-4">
            <div data-ev-id="ev_4dd3e06dbd" className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 data-ev-id="ev_8853765ca8" className="font-semibold text-blue-900 mb-2">Vorschau</h3>
              <p data-ev-id="ev_6497f0461b" className="text-sm text-blue-800 mb-3">
                Das PDF wird mit dem aktuellen Corporate Design erstellt.
              </p>
              <ul data-ev-id="ev_6ef4a2ea98" className="text-sm text-blue-700 space-y-1">
                <li data-ev-id="ev_d26207e14c">• Logo der FF Marchtrenk</li>
                <li data-ev-id="ev_6cff186b48">• Professionelles Layout</li>
                <li data-ev-id="ev_82346c54e7">• Kategorien als Checkboxen</li>
                <li data-ev-id="ev_714434b400">• A4 optimiert fuer Aushang</li>
              </ul>
            </div>

            {editingTemplate &&
          <div data-ev-id="ev_b1feaf9a65" className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <h3 data-ev-id="ev_54a9a64666" className="font-semibold text-orange-900 mb-1">Bearbeitung aktiv</h3>
                <p data-ev-id="ev_65617407a7" className="text-sm text-orange-800">
                  Vorlage: <strong data-ev-id="ev_9e7a44f2fa">{editingTemplate.name}</strong>
                </p>
                <button data-ev-id="ev_46e02514cb"
            onClick={resetForm}
            className="mt-2 text-sm text-orange-700 underline">

                  Neue Vorlage erstellen
                </button>
              </div>
          }
          </div>
        </div> : activeTab === 'templates' ? (

      /* Templates List */
      <div data-ev-id="ev_fb0f09f51f" className="bg-card border border-border rounded-xl">
          {loading ?
        <div data-ev-id="ev_bc0b16a554" className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div> :
        templates.length === 0 ?
        <div data-ev-id="ev_1728003bcf" className="text-center py-12">
              <Save className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p data-ev-id="ev_9448a8a459" className="text-muted-foreground">Keine Vorlagen gespeichert</p>
              <button data-ev-id="ev_470af5d44e"
          onClick={() => setActiveTab('form')}
          className="mt-3 text-primary hover:underline">

                Erste Vorlage erstellen
              </button>
            </div> :

        <div data-ev-id="ev_6a289b71db" className="divide-y divide-border">
              {templates.map((template) =>
          <div data-ev-id="ev_d830b11463" key={template.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div data-ev-id="ev_d655993d4f" className="flex items-start justify-between gap-4">
                    <div data-ev-id="ev_dd6a9ceffe" className="flex-1">
                      <h3 data-ev-id="ev_48b187a9e2" className="font-semibold text-foreground">{template.name}</h3>
                      <p data-ev-id="ev_ffb9eddabe" className="text-sm text-muted-foreground mt-1">
                        {template.event_name} • {template.location}
                      </p>
                      <p data-ev-id="ev_5864435eaf" className="text-xs text-muted-foreground mt-1">
                        {template.categories?.length || 0} Kategorien • 
                        Aktualisiert: {new Date(template.updated_at).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    <div data-ev-id="ev_a9bd607e3b" className="flex gap-1">
                      <button data-ev-id="ev_3c7091fa07"
                onClick={() => loadTemplate(template)}
                className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                title="Laden & Bearbeiten">

                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button data-ev-id="ev_92da453798"
                onClick={() => handleDuplicateTemplate(template)}
                className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                title="Duplizieren">

                        <Copy className="w-4 h-4" />
                      </button>
                      <button data-ev-id="ev_c385eb0356"
                onClick={() => handleDeleteTemplate(template)}
                className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                title="Loeschen">

                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
          )}
            </div>
        }
        </div>) : (

      /* Besatzungsliste */
      <CrewListSection onBack={() => setActiveTab('form')} />)
      }

      {/* Delete Confirmation Modal */}
      {templateToDelete &&
      <div data-ev-id="ev_83019b6558" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div data-ev-id="ev_0d6f28fd9e" className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 data-ev-id="ev_f66b2136aa" className="text-lg font-semibold mb-2">Vorlage löschen?</h3>
            <p data-ev-id="ev_758c6cc61e" className="text-muted-foreground mb-6">
              Möchten Sie die Vorlage "{templateToDelete.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div data-ev-id="ev_f4bb1c962d" className="flex gap-3 justify-end">
              <button data-ev-id="ev_2123117acb"
            onClick={() => setTemplateToDelete(null)}
            className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors">

                Abbrechen
              </button>
              <button data-ev-id="ev_b7a36e1c05"
            onClick={confirmDeleteTemplate}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">

                Löschen
              </button>
            </div>
          </div>
        </div>
      }

      {/* Import Column Mapping Modal */}
      {importModalOpen &&
      <div data-ev-id="ev_5905c8118e" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div data-ev-id="ev_d0285973a9" className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 data-ev-id="ev_f4a29dc88b" className="text-lg font-semibold mb-4">CSV/Excel Import - Spaltenzuordnung</h3>
            
            {/* Preview Table */}
            <div data-ev-id="ev_3db050ae65" className="mb-4">
              <p data-ev-id="ev_c96f4cd02f" className="text-sm text-muted-foreground mb-2">Vorschau (erste 5 Zeilen):</p>
              <div data-ev-id="ev_557391b951" className="overflow-x-auto border border-border rounded-lg">
                <table data-ev-id="ev_cfe343bce4" className="w-full text-sm">
                  <thead data-ev-id="ev_d64a8a53a1" className="bg-muted">
                    <tr data-ev-id="ev_2330b2ff29">
                      {importColumnMappings.map((_, idx) =>
                    <th data-ev-id="ev_810370aa1c" key={idx} className="px-3 py-2 text-left font-medium border-r border-border last:border-r-0">
                          Spalte {idx + 1}
                        </th>
                    )}
                    </tr>
                  </thead>
                  <tbody data-ev-id="ev_32205a3551">
                    {importPreviewData.slice(0, 5).map((row, rowIdx) =>
                  <tr data-ev-id="ev_9b4a1fa554" key={rowIdx} className={rowIdx === 0 && importSkipFirstRow ? 'bg-yellow-50 text-muted-foreground' : ''}>
                        {importColumnMappings.map((_, colIdx) =>
                    <td data-ev-id="ev_6dcefef46d" key={colIdx} className="px-3 py-2 border-t border-r border-border last:border-r-0">
                            {row[colIdx] || ''}
                          </td>
                    )}
                      </tr>
                  )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Column Mappings */}
            <div data-ev-id="ev_41b7584786" className="mb-4">
              <p data-ev-id="ev_8ed6cdd805" className="text-sm font-medium mb-2">Spaltenzuordnung:</p>
              <div data-ev-id="ev_440b3563ea" className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {importColumnMappings.map((mapping, idx) =>
              <div data-ev-id="ev_ef471928ed" key={idx} className="flex items-center gap-2">
                    <span data-ev-id="ev_8dbbf683f2" className="text-sm text-muted-foreground w-16">Spalte {idx + 1}:</span>
                    <select data-ev-id="ev_361c1dc590"
                value={mapping}
                onChange={(e) => {
                  const newMappings = [...importColumnMappings];
                  newMappings[idx] = e.target.value;
                  setImportColumnMappings(newMappings);
                }}
                className="flex-1 px-2 py-1 border border-border rounded text-sm bg-background">

                      <option data-ev-id="ev_1ada9398dd" value="ignorieren">Ignorieren</option>
                      <option data-ev-id="ev_ce34088038" value="name">Kompletter Name</option>
                      <option data-ev-id="ev_6743871886" value="vorname">Vorname</option>
                      <option data-ev-id="ev_0abe513e41" value="nachname">Nachname</option>
                    </select>
                  </div>
              )}
              </div>
            </div>

            {/* Skip First Row Option */}
            <div data-ev-id="ev_c26dda67db" className="mb-6">
              <label data-ev-id="ev_becd50522f" className="flex items-center gap-2 cursor-pointer">
                <input data-ev-id="ev_8ec416ab45"
              type="checkbox"
              checked={importSkipFirstRow}
              onChange={(e) => setImportSkipFirstRow(e.target.checked)}
              className="w-4 h-4" />

                <span data-ev-id="ev_cfd54c602a" className="text-sm">Erste Zeile ist Überschrift (überspringen)</span>
              </label>
            </div>

            {/* Info */}
            <div data-ev-id="ev_061f46dcec" className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <strong data-ev-id="ev_d032e802b7">Hinweis:</strong> Wählen Sie "Kompletter Name" wenn Vor- und Nachname in einer Spalte stehen, 
              oder "Vorname" + "Nachname" wenn sie getrennt sind.
            </div>

            {/* Actions */}
            <div data-ev-id="ev_bad2443141" className="flex gap-3 justify-end">
              <button data-ev-id="ev_6133f8584b"
            onClick={() => {
              setImportModalOpen(false);
              setImportPreviewData([]);
              setImportColumnMappings([]);
            }}
            className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors">

                Abbrechen
              </button>
              <button data-ev-id="ev_f1b64c3d5c"
            onClick={processImport}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">

                {importPreviewData.length - (importSkipFirstRow ? 1 : 0)} Namen importieren
              </button>
            </div>
          </div>
        </div>
      }
    </div>);

}