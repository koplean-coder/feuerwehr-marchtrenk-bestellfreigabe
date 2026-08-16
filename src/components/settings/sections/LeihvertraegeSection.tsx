import { useState, useEffect } from 'react';
import { FileText, Save, RotateCcw, ChevronDown, ChevronUp, Clock, Plus, Trash2, GripVertical, Info, Copy } from 'lucide-react';
import { SectionHeader, SectionCard } from '../SettingsContent';

// Flexible Klausel-Struktur
export interface ClauseItem {
  id: string;
  text: string;
}

export interface ClauseSection {
  id: string;
  title: string;
  clauses: ClauseItem[];
}

interface LeihvertraegeSectionProps {
  rentalContractHeader: string;
  updateRentalContractHeader: (value: string) => void;
  rentalContractClauses: Record<string, string>;
  updateRentalContractClauses: (value: Record<string, string>) => void;
  rentalOverduePerDay: number;
  updateRentalOverduePerDay: (value: number) => void;
}

const DEFAULT_HEADER = 'Ansprechperson: Marcel Gradauer | Tel: 0724358112585 / 0660 974 8617 | Mo–Do 07:00–16:00, Fr 07:00–12:00 | office@feuerwehr-marchtrenk.at';

// Platzhalter die im Text verwendet werden können
const PLACEHOLDERS = [
{ key: '{{kunde_name}}', label: 'Kundenname', example: 'Max Mustermann' },
{ key: '{{kunde_adresse}}', label: 'Kundenadresse', example: 'Musterstraße 1, 4614 Marchtrenk' },
{ key: '{{kunde_email}}', label: 'E-Mail', example: 'max@example.com' },
{ key: '{{kunde_telefon}}', label: 'Telefon', example: '+43 664 1234567' },
{ key: '{{vertragsnummer}}', label: 'Vertragsnummer', example: 'LV-2025-0001' },
{ key: '{{leihfrist_start}}', label: 'Startdatum', example: '01.06.2025' },
{ key: '{{leihfrist_ende}}', label: 'Enddatum', example: '03.06.2025' },
{ key: '{{leihgegenstand}}', label: 'Leihgegenstände', example: '1x Hüpfburg, 1x Fußballfeld' },
{ key: '{{gesamtbetrag}}', label: 'Gesamtbetrag', example: '250,00 €' },
{ key: '{{lieferkosten}}', label: 'Lieferkosten', example: '55,00 €' },
{ key: '{{datum_heute}}', label: 'Heutiges Datum', example: '15.05.2025' },
{ key: '{{verzugsgebuehr}}', label: 'Verzugsgebühr/Tag', example: '50,00 €' }];


// Konvertiere altes Format (Record<string, string>) zu neuem Format (ClauseSection[])
function convertToSections(clauses: Record<string, string>): ClauseSection[] {
  const sections: ClauseSection[] = [];
  const sectionMap = new Map<string, ClauseSection>();

  // Sortiere die Klausel-Keys
  const sortedKeys = Object.keys(clauses).sort((a, b) => {
    const [aMain, aSub] = a.split('_').map(Number);
    const [bMain, bSub] = b.split('_').map(Number);
    if (aMain !== bMain) return aMain - bMain;
    return aSub - bSub;
  });

  for (const key of sortedKeys) {
    const [mainNum] = key.split('_');
    const sectionId = mainNum;

    if (!sectionMap.has(sectionId)) {
      // Extrahiere Titel aus dem ersten Eintrag der Sektion (falls vorhanden)
      const text = clauses[key];
      let title = '';

      // Versuche den Titel aus bekannten Mustern zu extrahieren
      if (mainNum === '1') title = '1 Zustand';else
      if (mainNum === '2') title = '2 Haftung';else
      if (mainNum === '3') title = '3 Rückgabe';else
      if (mainNum === '4') title = '4 Leihkosten';else
      title = `${mainNum} Abschnitt`;

      const section: ClauseSection = {
        id: sectionId,
        title,
        clauses: []
      };
      sectionMap.set(sectionId, section);
      sections.push(section);
    }

    sectionMap.get(sectionId)!.clauses.push({
      id: key,
      text: clauses[key]
    });
  }

  return sections;
}

// Konvertiere zurück zu Record<string, string> für Speicherung
function convertToRecord(sections: ClauseSection[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const section of sections) {
    for (const clause of section.clauses) {
      record[clause.id] = clause.text;
    }
  }
  return record;
}

export function LeihvertraegeSection({
  rentalContractHeader,
  updateRentalContractHeader,
  rentalContractClauses,
  updateRentalContractClauses,
  rentalOverduePerDay,
  updateRentalOverduePerDay
}: LeihvertraegeSectionProps) {
  const [localHeader, setLocalHeader] = useState(rentalContractHeader);
  const [sections, setSections] = useState<ClauseSection[]>(() => convertToSections(rentalContractClauses));
  const [localOverdue, setLocalOverdue] = useState(rentalOverduePerDay);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['1']));
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [copiedPlaceholder, setCopiedPlaceholder] = useState<string | null>(null);

  // Sync wenn Props sich ändern
  useEffect(() => {
    setLocalHeader(rentalContractHeader);
    setSections(convertToSections(rentalContractClauses));
    setLocalOverdue(rentalOverduePerDay);
  }, [rentalContractHeader, rentalContractClauses, rentalOverduePerDay]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClauseChange = (sectionId: string, clauseId: string, value: string) => {
    setSections((prev) => prev.map((section) =>
    section.id === sectionId ?
    { ...section, clauses: section.clauses.map((c) => c.id === clauseId ? { ...c, text: value } : c) } :
    section
    ));
    setHasChanges(true);
  };

  const handleSectionTitleChange = (sectionId: string, title: string) => {
    setSections((prev) => prev.map((section) =>
    section.id === sectionId ? { ...section, title } : section
    ));
    setHasChanges(true);
  };

  const addClause = (sectionId: string) => {
    setSections((prev) => prev.map((section) => {
      if (section.id !== sectionId) return section;
      const newClauseNum = section.clauses.length + 1;
      const newId = `${sectionId}_${newClauseNum}`;
      return {
        ...section,
        clauses: [...section.clauses, { id: newId, text: `${sectionId}.${newClauseNum} ` }]
      };
    }));
    setHasChanges(true);
  };

  const removeClause = (sectionId: string, clauseId: string) => {
    setSections((prev) => prev.map((section) => {
      if (section.id !== sectionId) return section;
      if (section.clauses.length <= 1) return section; // Mindestens eine Klausel behalten
      return {
        ...section,
        clauses: section.clauses.filter((c) => c.id !== clauseId)
      };
    }));
    setHasChanges(true);
  };

  const addSection = () => {
    const maxId = Math.max(...sections.map((s) => parseInt(s.id) || 0), 0);
    const newId = String(maxId + 1);
    setSections((prev) => [...prev, {
      id: newId,
      title: `${newId} Neuer Abschnitt`,
      clauses: [{ id: `${newId}_1`, text: `${newId}.1 ` }]
    }]);
    setExpandedSections((prev) => new Set([...prev, newId]));
    setHasChanges(true);
  };

  const removeSection = (sectionId: string) => {
    if (sections.length <= 1) return; // Mindestens eine Sektion behalten
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    setHasChanges(true);
  };

  const handleHeaderChange = (value: string) => {
    setLocalHeader(value);
    setHasChanges(true);
  };

  const handleOverdueChange = (value: number) => {
    setLocalOverdue(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRentalContractHeader(localHeader);
      await updateRentalContractClauses(convertToRecord(sections));
      await updateRentalOverduePerDay(localOverdue);
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const defaultClauses: Record<string, string> = {
      '1_1': '1.1 Folgende besondere Merkmale oder Schäden waren dem Verleiher bereits vor dem Verleih bekannt:',
      '2_1': '2.1 Der Verleiher kann für finanzielle Schäden des Kunden oder Dritter, die durch technisches Versagen von verliehenem Equipment verursacht werden, nicht haften.',
      '2_2': '2.2 Der Kunde ist verpflichtet, Schäden am Equipment, die während der Leihfrist aufgetreten sind, dem Verleiher unmittelbar mitzuteilen.',
      '2_3': '2.3 Schäden durch unsachgemäßen Umgang gehen zu Lasten des Kunden (Reparaturkosten bzw. Ersatz). Bei Totalschaden oder Verlust zahlt der Kunde den Neupreis des betroffenen Artikels.',
      '3_1': '3.1 Die Rückgabe erfolgt zum vereinbarten Zeitpunkt bzw. Werktags zu den Geschäftszeiten. (siehe oben)',
      '3_2': '3.2 Verzögert sich die planmäßige Rückgabe ohne vorherige Absprache, wird für jeden weiteren Tag der übliche Tagessatz berechnet.',
      '3_3': '3.3 Der Kunde sorgt selbständig für die Abholung/Rückgabe beim Verleiher. Auf Wunsch kann das Equipment nach Absprache auch abgeholt werden – hierfür wird ein Entgelt berechnet.',
      '3_4': '3.4 Bringt der Kunde das Equipment beschädigt, verschmutzt oder gar nicht zurück, gilt Punkt 2.3.',
      '4_1': '4.1 Die Leihkosten werden je nach Leihgegenstand verrechnet. Die angeführten Preise verstehen sich inkl. Mehrwertsteuer.'
    };
    setLocalHeader(DEFAULT_HEADER);
    setSections(convertToSections(defaultClauses));
    setLocalOverdue(50);
    setHasChanges(true);
  };

  const copyPlaceholder = (key: string) => {
    // Fallback für blockierte Clipboard API
    const ta = document.createElement('textarea');
    ta.value = key;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    
    setCopiedPlaceholder(key);
    setTimeout(() => setCopiedPlaceholder(null), 1500);
  };

  return (
    <div data-ev-id="ev_282a9cfe97" className="flex flex-col gap-6">
      <SectionHeader
        icon={FileText}
        title="Leihverträge"
        description="Texte und Klauseln für das Leihvertrags-PDF bearbeiten" />


      {/* Save/Reset Bar */}
      {hasChanges &&
      <div data-ev-id="ev_7f40575ddf" className="sticky top-0 z-10 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
          <span data-ev-id="ev_b8b63e371d" className="text-sm text-amber-800 font-medium">
            Ungespeicherte Änderungen vorhanden
          </span>
          <div data-ev-id="ev_3cb4aea108" className="flex gap-2">
            <button data-ev-id="ev_9adfb0c9e4"
          onClick={handleReset}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5">

              <RotateCcw className="w-4 h-4" />
              Zurücksetzen
            </button>
            <button data-ev-id="ev_40c5ed6336"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-50">

              <Save className="w-4 h-4" />
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>
      }

      {/* Platzhalter Info */}
      <SectionCard>
        <div data-ev-id="ev_1db6596979" className="flex flex-col gap-3">
          <button data-ev-id="ev_405048fb52"
          onClick={() => setShowPlaceholders(!showPlaceholders)}
          className="flex items-center justify-between w-full">

            <div data-ev-id="ev_abee3398dd" className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-500" />
              <h3 data-ev-id="ev_a275ef5104" className="font-semibold">Verfügbare Platzhalter</h3>
            </div>
            {showPlaceholders ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {showPlaceholders &&
          <div data-ev-id="ev_f0b814e909" className="mt-2">
              <p data-ev-id="ev_d9ebc91447" className="text-sm text-muted-foreground mb-3">
                Diese Platzhalter werden beim Erstellen des PDFs automatisch durch die Vertragsdaten ersetzt.
                Klicken Sie auf einen Platzhalter, um ihn zu kopieren.
              </p>
              <div data-ev-id="ev_f3df86851d" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {PLACEHOLDERS.map((p) =>
              <button data-ev-id="ev_330cf56891"
              key={p.key}
              onClick={() => copyPlaceholder(p.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
              copiedPlaceholder === p.key ?
              'bg-green-50 border-green-300 text-green-800' :
              'bg-muted/30 border-border hover:bg-muted/50'}`
              }>

                    <Copy className="w-3.5 h-3.5 flex-shrink-0" />
                    <div data-ev-id="ev_5de5c73ba7" className="min-w-0">
                      <code data-ev-id="ev_0fb1edf10e" className="text-xs font-mono text-primary block truncate">{p.key}</code>
                      <span data-ev-id="ev_54af812a99" className="text-xs text-muted-foreground">{p.label}</span>
                    </div>
                  </button>
              )}
              </div>
            </div>
          }
        </div>
      </SectionCard>

      {/* Header/Kontakt */}
      <SectionCard>
        <div data-ev-id="ev_4b4a3fb6d9" className="flex flex-col gap-3">
          <div data-ev-id="ev_5aba29755c" className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 data-ev-id="ev_10572ba909" className="font-semibold">Kopfzeile / Kontaktdaten</h3>
          </div>
          <p data-ev-id="ev_a37a24ffc5" className="text-sm text-muted-foreground">
            Diese Zeile erscheint oben im PDF unter dem Logo. Platzhalter können verwendet werden.
          </p>
          <textarea data-ev-id="ev_d067e7ea95"
          value={localHeader}
          onChange={(e) => handleHeaderChange(e.target.value)}
          rows={2}
          className="w-full px-4 py-3 border border-input rounded-lg text-sm resize-none focus:border-primary focus:ring-1 focus:ring-primary"
          placeholder="Ansprechperson, Telefon, Öffnungszeiten, E-Mail..." />

        </div>
      </SectionCard>

      {/* Verzugsgebühr */}
      <SectionCard>
        <div data-ev-id="ev_29860fa72f" className="flex flex-col gap-3">
          <div data-ev-id="ev_157a424bde" className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h3 data-ev-id="ev_a063a68ded" className="font-semibold">Verzugsgebühr</h3>
          </div>
          <p data-ev-id="ev_1e5c10e98d" className="text-sm text-muted-foreground">
            Betrag, der pro Tag bei verspäteter Rückgabe zusätzlich berechnet wird.
          </p>
          <div data-ev-id="ev_c0e4b6c9b7" className="flex items-center gap-3">
            <div data-ev-id="ev_efc1678fee" className="relative w-40">
              <input data-ev-id="ev_95212cadad"
              type="text"
              inputMode="decimal"
              value={localOverdue}
              onChange={(e) => handleOverdueChange(parseFloat(e.target.value.replace(',', '.')) || 0)}
              className="w-full px-4 py-2.5 border border-input rounded-lg pr-8 text-right font-medium" />

              <span data-ev-id="ev_848962420e" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
            </div>
            <span data-ev-id="ev_eeed88312d" className="text-sm text-muted-foreground">pro Tag</span>
          </div>
        </div>
      </SectionCard>

      {/* Vertragsklauseln */}
      <SectionCard>
        <div data-ev-id="ev_87b32497e3" className="flex flex-col gap-4">
          <div data-ev-id="ev_eb8ba28c49" className="flex items-center justify-between">
            <div data-ev-id="ev_150a4bb8f7" className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h3 data-ev-id="ev_5905361a08" className="font-semibold">Vertragsklauseln</h3>
            </div>
            <button data-ev-id="ev_a61d49b9c6"
            onClick={addSection}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-1.5">

              <Plus className="w-4 h-4" />
              Neuer Abschnitt
            </button>
          </div>
          <p data-ev-id="ev_8d7eed98d6" className="text-sm text-muted-foreground">
            Diese Texte erscheinen im Leihvertrag als rechtliche Bedingungen. Platzhalter werden automatisch ersetzt.
          </p>

          {/* Kompakte Platzhalter-Übersicht */}
          <div data-ev-id="ev_c01e61d62f" className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div data-ev-id="ev_d36fe77f1d" className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span data-ev-id="ev_6306b7b096" className="text-sm font-medium text-blue-800">Platzhalter (zum Kopieren klicken):</span>
            </div>
            <div data-ev-id="ev_3f3d4b3bb6" className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map((p) =>
              <button data-ev-id="ev_d2a39a4f1b"
              key={p.key}
              onClick={() => copyPlaceholder(p.key)}
              title={`${p.label} – z.B. "${p.example}"`}
              className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
              copiedPlaceholder === p.key ?
              'bg-green-200 text-green-800' :
              'bg-blue-100 text-blue-700 hover:bg-blue-200'}`
              }>

                  {p.key}
                </button>
              )}
            </div>
          </div>

          <div data-ev-id="ev_c9ee4286ff" className="flex flex-col gap-3">
            {sections.map((section) =>
            <div data-ev-id="ev_72d3933749" key={section.id} className="border border-border rounded-lg overflow-hidden">
                {/* Section Header */}
                <div data-ev-id="ev_5a0f726a70" className="flex items-center bg-muted/30">
                  <button data-ev-id="ev_9fd6cb0fad"
                onClick={() => toggleSection(section.id)}
                className="flex-1 flex items-center gap-2 px-4 py-3 hover:bg-muted/50 transition-colors">

                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    {expandedSections.has(section.id) ?
                  <ChevronUp className="w-5 h-5 text-muted-foreground" /> :

                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  }
                    <span data-ev-id="ev_ee4e439041" className="font-medium text-sm">{section.title}</span>
                    <span data-ev-id="ev_5f84048e0e" className="text-xs text-muted-foreground">({section.clauses.length} Klauseln)</span>
                  </button>
                  {sections.length > 1 &&
                <button data-ev-id="ev_fe88031a02"
                onClick={() => removeSection(section.id)}
                className="p-2 mr-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Abschnitt löschen">

                      <Trash2 className="w-4 h-4" />
                    </button>
                }
                </div>

                {/* Section Content */}
                {expandedSections.has(section.id) &&
              <div data-ev-id="ev_64b9157a08" className="p-4 flex flex-col gap-4 bg-background">
                    {/* Section Title Edit */}
                    <div data-ev-id="ev_f3c74cab9e" className="flex flex-col gap-1">
                      <label data-ev-id="ev_34757bb37d" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Abschnittstitel
                      </label>
                      <input data-ev-id="ev_b84dfdacaf"
                  type="text"
                  value={section.title}
                  onChange={(e) => handleSectionTitleChange(section.id, e.target.value)}
                  className="px-3 py-2 border border-input rounded-lg text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary" />

                    </div>

                    {/* Clauses */}
                    {section.clauses.map((clause, index) =>
                <div data-ev-id="ev_a89189c63c" key={clause.id} className="flex flex-col gap-2">
                        <div data-ev-id="ev_78a2dc8f2f" className="flex items-center justify-between">
                          <label data-ev-id="ev_3f790832de" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Klausel {section.id}.{index + 1}
                          </label>
                          {section.clauses.length > 1 &&
                    <button data-ev-id="ev_7617acfb6c"
                    onClick={() => removeClause(section.id, clause.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Klausel löschen">

                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                    }
                        </div>
                        <textarea data-ev-id="ev_e0953f2ad0"
                  value={clause.text}
                  onChange={(e) => handleClauseChange(section.id, clause.id, e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-input rounded-lg text-sm resize-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder={`${section.id}.${index + 1} Klauseltext...`} />

                      </div>
                )}

                    {/* Add Clause Button */}
                    <button data-ev-id="ev_d8c79f621a"
                onClick={() => addClause(section.id)}
                className="w-full py-2 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">

                      <Plus className="w-4 h-4" />
                      Unterklausel hinzufügen
                    </button>
                  </div>
              }
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Info */}
      <div data-ev-id="ev_3a039492d6" className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p data-ev-id="ev_a8240d1f0c" className="text-sm text-blue-800">
          <strong data-ev-id="ev_f9c734cd6d">Hinweis:</strong> Änderungen wirken sich auf alle neu erstellten PDF-Verträge aus. 
          Bereits generierte PDFs bleiben unverändert. Platzhalter wie <code data-ev-id="ev_c14faf1c7c" className="bg-blue-100 px-1 rounded">{'{{kunde_name}}'}</code> werden 
          automatisch durch die echten Vertragsdaten ersetzt.
        </p>
      </div>
    </div>);

}