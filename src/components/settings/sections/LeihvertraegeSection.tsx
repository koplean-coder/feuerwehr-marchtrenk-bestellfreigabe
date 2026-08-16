import { useState } from 'react';
import { FileText, Save, RotateCcw, ChevronDown, ChevronUp, Euro, Clock } from 'lucide-react';
import { SectionHeader, SectionCard } from '../SettingsContent';

interface LeihvertraegeSectionProps {
  rentalContractHeader: string;
  updateRentalContractHeader: (value: string) => void;
  rentalContractClauses: Record<string, string>;
  updateRentalContractClauses: (value: Record<string, string>) => void;
  rentalOverduePerDay: number;
  updateRentalOverduePerDay: (value: number) => void;
}

const DEFAULT_HEADER = 'Ansprechperson: Marcel Gradauer | Tel: 0724358112585 / 0660 974 8617 | Mo–Do 07:00–16:00, Fr 07:00–12:00 | office@feuerwehr-marchtrenk.at';

const DEFAULT_CLAUSES: Record<string, string> = {
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

const CLAUSE_SECTIONS = [
{
  title: '1 Zustand',
  clauses: ['1_1'],
  description: 'Dokumentation des Zustands bei Übergabe'
},
{
  title: '2 Haftung',
  clauses: ['2_1', '2_2', '2_3'],
  description: 'Haftungsregelungen und Schadensmeldung'
},
{
  title: '3 Rückgabe',
  clauses: ['3_1', '3_2', '3_3', '3_4'],
  description: 'Rückgabebedingungen und Verzugsregelungen'
},
{
  title: '4 Leihkosten',
  clauses: ['4_1'],
  description: 'Preisgestaltung und Mehrwertsteuer'
}];


export function LeihvertraegeSection({
  rentalContractHeader,
  updateRentalContractHeader,
  rentalContractClauses,
  updateRentalContractClauses,
  rentalOverduePerDay,
  updateRentalOverduePerDay
}: LeihvertraegeSectionProps) {
  const [localHeader, setLocalHeader] = useState(rentalContractHeader);
  const [localClauses, setLocalClauses] = useState(rentalContractClauses);
  const [localOverdue, setLocalOverdue] = useState(rentalOverduePerDay);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['1 Zustand']));
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const handleClauseChange = (key: string, value: string) => {
    setLocalClauses((prev) => ({ ...prev, [key]: value }));
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
      await updateRentalContractClauses(localClauses);
      await updateRentalOverduePerDay(localOverdue);
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLocalHeader(DEFAULT_HEADER);
    setLocalClauses(DEFAULT_CLAUSES);
    setLocalOverdue(50);
    setHasChanges(true);
  };

  return (
    <div data-ev-id="ev_5b1275a6ca" className="flex flex-col gap-6">
      <SectionHeader
        icon={FileText}
        title="Leihverträge"
        description="Texte und Klauseln für das Leihvertrags-PDF bearbeiten" />


      {/* Save/Reset Bar */}
      {hasChanges &&
      <div data-ev-id="ev_791de4f23f" className="sticky top-0 z-10 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
          <span data-ev-id="ev_efc3938c6b" className="text-sm text-amber-800 font-medium">
            Ungespeicherte Änderungen vorhanden
          </span>
          <div data-ev-id="ev_fbd1374ac2" className="flex gap-2">
            <button data-ev-id="ev_dc68faa7f2"
          onClick={handleReset}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5">

              <RotateCcw className="w-4 h-4" />
              Zurücksetzen
            </button>
            <button data-ev-id="ev_c43ce53d5d"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-50">

              <Save className="w-4 h-4" />
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>
      }

      {/* Header/Kontakt */}
      <SectionCard>
        <div data-ev-id="ev_6b86a70719" className="flex flex-col gap-3">
          <div data-ev-id="ev_ad1a8482fd" className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 data-ev-id="ev_8a178efcd7" className="font-semibold">Kopfzeile / Kontaktdaten</h3>
          </div>
          <p data-ev-id="ev_f8cc54e96a" className="text-sm text-muted-foreground">
            Diese Zeile erscheint oben im PDF unter dem Logo.
          </p>
          <textarea data-ev-id="ev_a581ecd78c"
          value={localHeader}
          onChange={(e) => handleHeaderChange(e.target.value)}
          rows={2}
          className="w-full px-4 py-3 border border-input rounded-lg text-sm resize-none focus:border-primary focus:ring-1 focus:ring-primary"
          placeholder="Ansprechperson, Telefon, Öffnungszeiten, E-Mail..." />

        </div>
      </SectionCard>

      {/* Verzugsgebühr */}
      <SectionCard>
        <div data-ev-id="ev_7305db8e43" className="flex flex-col gap-3">
          <div data-ev-id="ev_f5c6957cf9" className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h3 data-ev-id="ev_f70de83645" className="font-semibold">Verzugsgebühr</h3>
          </div>
          <p data-ev-id="ev_ce1c2dd560" className="text-sm text-muted-foreground">
            Betrag, der pro Tag bei verspäteter Rückgabe zusätzlich berechnet wird.
          </p>
          <div data-ev-id="ev_03b4c16e17" className="flex items-center gap-3">
            <div data-ev-id="ev_d0cd41bb39" className="relative w-40">
              <input data-ev-id="ev_c2e29fdde1"
              type="text"
              inputMode="decimal"
              value={localOverdue}
              onChange={(e) => handleOverdueChange(parseFloat(e.target.value.replace(',', '.')) || 0)}
              className="w-full px-4 py-2.5 border border-input rounded-lg pr-8 text-right font-medium" />

              <span data-ev-id="ev_17ff4bd0ce" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
            </div>
            <span data-ev-id="ev_acc579346f" className="text-sm text-muted-foreground">pro Tag</span>
          </div>
        </div>
      </SectionCard>

      {/* Vertragsklauseln */}
      <SectionCard>
        <div data-ev-id="ev_56b790255d" className="flex flex-col gap-4">
          <div data-ev-id="ev_40addf3cc1" className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 data-ev-id="ev_1ffc642e05" className="font-semibold">Vertragsklauseln</h3>
          </div>
          <p data-ev-id="ev_e5a02cf858" className="text-sm text-muted-foreground">
            Diese Texte erscheinen im Leihvertrag als rechtliche Bedingungen.
          </p>

          <div data-ev-id="ev_b68340824f" className="flex flex-col gap-3">
            {CLAUSE_SECTIONS.map((section) =>
            <div data-ev-id="ev_6b0ad0c448" key={section.title} className="border border-border rounded-lg overflow-hidden">
                {/* Section Header */}
                <button data-ev-id="ev_42967d1c77"
              onClick={() => toggleSection(section.title)}
              className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors">

                  <div data-ev-id="ev_f7a473de95" className="flex flex-col items-start">
                    <span data-ev-id="ev_983326b558" className="font-medium text-sm">{section.title}</span>
                    <span data-ev-id="ev_69834a1720" className="text-xs text-muted-foreground">{section.description}</span>
                  </div>
                  {expandedSections.has(section.title) ?
                <ChevronUp className="w-5 h-5 text-muted-foreground" /> :

                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                }
                </button>

                {/* Clauses */}
                {expandedSections.has(section.title) &&
              <div data-ev-id="ev_6ed40bc00d" className="p-4 flex flex-col gap-4 bg-background">
                    {section.clauses.map((clauseKey) =>
                <div data-ev-id="ev_22b070c8d4" key={clauseKey} className="flex flex-col gap-2">
                        <label data-ev-id="ev_e95a70175f" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Klausel {clauseKey.replace('_', '.')}
                        </label>
                        <textarea data-ev-id="ev_9833be8c2f"
                  value={localClauses[clauseKey] || ''}
                  onChange={(e) => handleClauseChange(clauseKey, e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-input rounded-lg text-sm resize-none focus:border-primary focus:ring-1 focus:ring-primary" />

                      </div>
                )}
                  </div>
              }
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Info */}
      <div data-ev-id="ev_28a7848c08" className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p data-ev-id="ev_56b74d89ad" className="text-sm text-blue-800">
          <strong data-ev-id="ev_cb2d3805e1">Hinweis:</strong> Änderungen wirken sich auf alle neu erstellten PDF-Verträge aus. 
          Bereits generierte PDFs bleiben unverändert.
        </p>
      </div>
    </div>);

}