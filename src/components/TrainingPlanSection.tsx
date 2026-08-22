import { useState, useMemo } from 'react';
import { ArrowLeft, Plus, X, Download, Calendar, Users, Truck, FileText, ChevronLeft, ChevronRight, GripVertical, Edit2, Check } from 'lucide-react';

interface TrainingPlanSectionProps {
  onBack: () => void;
}

interface TrainingSession {
  id: string;
  date: Date;
  time: string;
  topic: string;
  category: 'brand' | 'technisch' | 'erste-hilfe' | 'theorie' | 'gemeinschaft' | 'atemschutz';
  instructor: string;
  vehicles: string;
  notes: string;
}

const CATEGORIES = {
  'brand': { label: 'Brandeinsatz', color: 'bg-red-100 text-red-700 border-red-200' },
  'technisch': { label: 'Technisch', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  'erste-hilfe': { label: 'Erste Hilfe', color: 'bg-green-100 text-green-700 border-green-200' },
  'theorie': { label: 'Theorie', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  'gemeinschaft': { label: 'Gemeinschaft', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  'atemschutz': { label: 'Atemschutz', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' }
};

// Österreichische Feiertage 2025
const AUSTRIAN_HOLIDAYS_2025 = [
'2025-01-01', // Neujahr
'2025-01-06', // Heilige Drei Könige
'2025-04-21', // Ostermontag
'2025-05-01', // Staatsfeiertag
'2025-05-29', // Christi Himmelfahrt
'2025-06-09', // Pfingstmontag
'2025-06-19', // Fronleichnam
'2025-08-15', // Mariä Himmelfahrt
'2025-10-26', // Nationalfeiertag
'2025-11-01', // Allerheiligen
'2025-12-08', // Mariä Empfängnis
'2025-12-25', // Christtag
'2025-12-26' // Stefanitag
];

function getWednesdaysInRange(start: Date, end: Date): Date[] {
  const wednesdays: Date[] = [];
  const current = new Date(start);

  // Find first Wednesday
  while (current.getDay() !== 3) {
    current.setDate(current.getDate() + 1);
  }

  while (current <= end) {
    wednesdays.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }

  return wednesdays;
}

function isHoliday(date: Date): boolean {
  const dateStr = date.toISOString().split('T')[0];
  return AUSTRIAN_HOLIDAYS_2025.includes(dateStr);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('de-AT', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function TrainingPlanSection({ onBack }: TrainingPlanSectionProps) {
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedHalf, setSelectedHalf] = useState<'H1' | 'H2'>('H1');
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Calculate date range based on selection
  const dateRange = useMemo(() => {
    const start = selectedHalf === 'H1' ?
    new Date(selectedYear, 0, 1) :
    new Date(selectedYear, 6, 1);
    const end = selectedHalf === 'H1' ?
    new Date(selectedYear, 5, 30) :
    new Date(selectedYear, 11, 31);
    return { start, end };
  }, [selectedYear, selectedHalf]);

  // Get all Wednesdays in the range
  const wednesdays = useMemo(() => {
    return getWednesdaysInRange(dateRange.start, dateRange.end);
  }, [dateRange]);

  // Initialize sessions for all Wednesdays
  const initializeSessions = () => {
    const newSessions: TrainingSession[] = wednesdays.map((date) => ({
      id: date.toISOString(),
      date,
      time: '18:20',
      topic: '',
      category: 'brand' as const,
      instructor: '',
      vehicles: '',
      notes: isHoliday(date) ? 'FEIERTAG - keine Übung' : ''
    }));
    setSessions(newSessions);
  };

  const updateSession = (id: string, updates: Partial<TrainingSession>) => {
    setSessions((prev) => prev.map((s) => s.id === id ? { ...s, ...updates } : s));
  };

  const getSessionForDate = (date: Date): TrainingSession | undefined => {
    return sessions.find((s) => s.date.toDateString() === date.toDateString());
  };

  return (
    <div data-ev-id="ev_84d92c9c0b" className="space-y-6">
      {/* Header */}
      <div data-ev-id="ev_fff9a4d1eb" className="flex items-center justify-between">
        <div data-ev-id="ev_93ddb734f7" className="flex items-center gap-4">
          <button data-ev-id="ev_0efc09d1ec"
          onClick={onBack}
          className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div data-ev-id="ev_c1af43817f">
            <h1 data-ev-id="ev_0c541e47a2" className="text-2xl font-bold text-foreground">Übungsplan Generator</h1>
            <p data-ev-id="ev_21b1a82ae2" className="text-muted-foreground">A3 Übungsplan für die Feuerwehr erstellen</p>
          </div>
        </div>
        <button data-ev-id="ev_b99a570460"
        onClick={() => alert('PDF Export kommt noch!')}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2">
          <Download className="w-4 h-4" />
          PDF Exportieren (A3)
        </button>
      </div>
      
      {/* Period Selection */}
      <div data-ev-id="ev_380c53deaa" className="bg-card border border-border rounded-xl p-6">
        <div data-ev-id="ev_9667a6f3be" className="flex flex-wrap items-center gap-4">
          <div data-ev-id="ev_c2a829d97b" className="flex items-center gap-2">
            <button data-ev-id="ev_b67af7c03a"
            onClick={() => setSelectedYear((y) => y - 1)}
            className="p-2 hover:bg-muted rounded-lg">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span data-ev-id="ev_a8529775da" className="text-xl font-bold min-w-[80px] text-center">{selectedYear}</span>
            <button data-ev-id="ev_59d73f76a5"
            onClick={() => setSelectedYear((y) => y + 1)}
            className="p-2 hover:bg-muted rounded-lg">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div data-ev-id="ev_1fcc01c99f" className="flex gap-2">
            <button data-ev-id="ev_9f7527cac3"
            onClick={() => setSelectedHalf('H1')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedHalf === 'H1' ?
            'bg-primary text-primary-foreground' :
            'bg-muted hover:bg-muted/80'}`
            }>
              1. Halbjahr (Jan - Jun)
            </button>
            <button data-ev-id="ev_1358cf89de"
            onClick={() => setSelectedHalf('H2')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedHalf === 'H2' ?
            'bg-primary text-primary-foreground' :
            'bg-muted hover:bg-muted/80'}`
            }>
              2. Halbjahr (Jul - Dez)
            </button>
          </div>
          
          <button data-ev-id="ev_d2cf1abce6"
          onClick={initializeSessions}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 ml-auto">
            <Calendar className="w-4 h-4" />
            {sessions.length > 0 ? 'Termine zurücksetzen' : 'Termine generieren'}
          </button>
        </div>
        
        <div data-ev-id="ev_1088b1126b" className="mt-4 text-sm text-muted-foreground">
          <span data-ev-id="ev_df5f0d9934" className="font-medium">{wednesdays.length} Mittwoche</span> im ausgewählten Zeitraum
          {' · '}
          <span data-ev-id="ev_f8619ab8d9" className="text-orange-600 font-medium">
            {wednesdays.filter((d) => isHoliday(d)).length} Feiertage
          </span>
        </div>
      </div>
      
      {/* Category Legend */}
      <div data-ev-id="ev_21de18f117" className="flex flex-wrap gap-2">
        {Object.entries(CATEGORIES).map(([key, { label, color }]) =>
        <span data-ev-id="ev_53a6e514bb" key={key} className={`px-3 py-1 rounded-full text-sm font-medium border ${color}`}>
            {label}
          </span>
        )}
      </div>
      
      {/* Training Sessions Table */}
      {sessions.length > 0 ?
      <div data-ev-id="ev_282830e61e" className="bg-card border border-border rounded-xl overflow-hidden">
          <div data-ev-id="ev_067318315c" className="overflow-x-auto">
            <table data-ev-id="ev_f9e98093f2" className="w-full">
              <thead data-ev-id="ev_9b861c3c1f">
                <tr data-ev-id="ev_b8482571ef" className="bg-[#C8102E] text-white">
                  <th data-ev-id="ev_2d049e868a" className="px-4 py-3 text-left font-semibold w-[140px]">Datum</th>
                  <th data-ev-id="ev_84f79dc06f" className="px-4 py-3 text-left font-semibold w-[80px]">Uhrzeit</th>
                  <th data-ev-id="ev_0040c410f3" className="px-4 py-3 text-left font-semibold">Übungsthema</th>
                  <th data-ev-id="ev_07666ea19d" className="px-4 py-3 text-left font-semibold w-[140px]">Kategorie</th>
                  <th data-ev-id="ev_dee8ff960e" className="px-4 py-3 text-left font-semibold w-[150px]">Übungsleiter</th>
                  <th data-ev-id="ev_ec897deeb8" className="px-4 py-3 text-left font-semibold w-[120px]">Fahrzeuge</th>
                  <th data-ev-id="ev_22297c8918" className="px-4 py-3 text-left font-semibold w-[150px]">Anmerkungen</th>
                </tr>
              </thead>
              <tbody data-ev-id="ev_f689a2c1f8">
                {sessions.map((session, idx) => {
                const holiday = isHoliday(session.date);
                return (
                  <tr data-ev-id="ev_3d8b19a637"
                  key={session.id}
                  className={`border-t border-border ${
                  holiday ?
                  'bg-orange-50' :
                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`
                  }>
                      <td data-ev-id="ev_2afe9b9be0" className="px-4 py-2">
                        <div data-ev-id="ev_928444c494" className="font-medium">
                          {formatDate(session.date)}
                        </div>
                        {holiday &&
                      <span data-ev-id="ev_51b3f4874f" className="text-xs text-orange-600 font-medium">Feiertag</span>
                      }
                      </td>
                      <td data-ev-id="ev_7ffcb94c3a" className="px-4 py-2">
                        <input data-ev-id="ev_ca15dd17e6"
                      type="time"
                      value={session.time}
                      onChange={(e) => updateSession(session.id, { time: e.target.value })}
                      className="px-2 py-1 border border-border rounded bg-background w-full" />

                      </td>
                      <td data-ev-id="ev_8669fb402a" className="px-4 py-2">
                        <input data-ev-id="ev_a4af329706"
                      type="text"
                      value={session.topic}
                      onChange={(e) => updateSession(session.id, { topic: e.target.value })}
                      placeholder="z.B. Löschangriff, THL PKW..."
                      className="px-2 py-1 border border-border rounded bg-background w-full" />

                      </td>
                      <td data-ev-id="ev_9451c0f148" className="px-4 py-2">
                        <select data-ev-id="ev_62b1a4a496"
                      value={session.category}
                      onChange={(e) => updateSession(session.id, { category: e.target.value as TrainingSession['category'] })}
                      className={`px-2 py-1 border rounded w-full text-sm font-medium ${CATEGORIES[session.category].color}`}>
                          {Object.entries(CATEGORIES).map(([key, { label }]) =>
                        <option data-ev-id="ev_36ad156466" key={key} value={key}>{label}</option>
                        )}
                        </select>
                      </td>
                      <td data-ev-id="ev_4ce80786f0" className="px-4 py-2">
                        <input data-ev-id="ev_6f2742da7a"
                      type="text"
                      value={session.instructor}
                      onChange={(e) => updateSession(session.id, { instructor: e.target.value })}
                      placeholder="Name"
                      className="px-2 py-1 border border-border rounded bg-background w-full" />

                      </td>
                      <td data-ev-id="ev_940be5055a" className="px-4 py-2">
                        <input data-ev-id="ev_3509f527a2"
                      type="text"
                      value={session.vehicles}
                      onChange={(e) => updateSession(session.id, { vehicles: e.target.value })}
                      placeholder="z.B. TLF, RLF"
                      className="px-2 py-1 border border-border rounded bg-background w-full" />

                      </td>
                      <td data-ev-id="ev_f301c7630e" className="px-4 py-2">
                        <input data-ev-id="ev_f39fc0e8f0"
                      type="text"
                      value={session.notes}
                      onChange={(e) => updateSession(session.id, { notes: e.target.value })}
                      placeholder="Notizen"
                      className="px-2 py-1 border border-border rounded bg-background w-full" />

                      </td>
                    </tr>);

              })}
              </tbody>
            </table>
          </div>
        </div> :

      <div data-ev-id="ev_c3085a1a52" className="bg-card border border-border rounded-xl p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 data-ev-id="ev_428bb0eeda" className="text-lg font-semibold mb-2">Noch keine Termine</h3>
          <p data-ev-id="ev_4baa60a9d4" className="text-muted-foreground mb-4">
            Klicke auf "Termine generieren" um alle Mittwoche im gewählten Zeitraum anzulegen.
          </p>
        </div>
      }
      
      {/* PDF Preview */}
      {sessions.length > 0 &&
      <div data-ev-id="ev_0171ad38a5" className="bg-card border border-border rounded-xl p-6">
          <h3 data-ev-id="ev_2ed27719de" className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            PDF Vorschau (A3 Querformat)
          </h3>
          
          <div data-ev-id="ev_7e233e7aca" className="border-2 border-dashed border-border rounded-lg p-4 bg-white overflow-auto">
            {/* Simulated A3 Preview */}
            <div data-ev-id="ev_d37a5558d9" className="min-w-[800px]" style={{ aspectRatio: '1.414/1' }}>
              {/* Header */}
              <div data-ev-id="ev_435f9dabd9" className="flex items-center justify-between mb-4 pb-4 border-b-4 border-[#C8102E]">
                <div data-ev-id="ev_bd850532f4">
                  <h2 data-ev-id="ev_673f3c4bea" className="text-2xl font-bold text-[#C8102E]">ÜBUNGSPLAN {selectedYear}</h2>
                  <p data-ev-id="ev_91669bb37d" className="text-lg font-medium text-gray-600">
                    {selectedHalf === 'H1' ? 'Jänner - Juni' : 'Juli - Dezember'}
                  </p>
                </div>
                <div data-ev-id="ev_71622449a4" className="text-right">
                  <div data-ev-id="ev_62935034ac" className="text-xl font-bold">Freiwillige Feuerwehr</div>
                  <div data-ev-id="ev_9bc1631a83" className="text-xl font-bold text-[#C8102E]">Marchtrenk</div>
                  <div data-ev-id="ev_f44e129d67" className="text-sm text-gray-500">Linzerstraße 43, 4614 Marchtrenk</div>
                </div>
              </div>
              
              {/* Mini Table Preview */}
              <table data-ev-id="ev_d339c2ea55" className="w-full text-xs border-collapse">
                <thead data-ev-id="ev_10dc14fb98">
                  <tr data-ev-id="ev_34109b3f6d" className="bg-[#C8102E] text-white">
                    <th data-ev-id="ev_9dde17e231" className="border border-gray-300 px-2 py-1 text-left">Datum</th>
                    <th data-ev-id="ev_c6f286fb14" className="border border-gray-300 px-2 py-1 text-left">Zeit</th>
                    <th data-ev-id="ev_073559ffb3" className="border border-gray-300 px-2 py-1 text-left">Übungsthema</th>
                    <th data-ev-id="ev_f7ac03cfc1" className="border border-gray-300 px-2 py-1 text-left">Kategorie</th>
                    <th data-ev-id="ev_50cc1dcc7c" className="border border-gray-300 px-2 py-1 text-left">Übungsleiter</th>
                    <th data-ev-id="ev_4638cff8d5" className="border border-gray-300 px-2 py-1 text-left">Fahrzeuge</th>
                    <th data-ev-id="ev_6532fba6a6" className="border border-gray-300 px-2 py-1 text-left">Anmerkungen</th>
                  </tr>
                </thead>
                <tbody data-ev-id="ev_abec383cc8">
                  {sessions.slice(0, 8).map((session, idx) =>
                <tr data-ev-id="ev_50f934c618" key={session.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td data-ev-id="ev_6c4efc4639" className="border border-gray-200 px-2 py-1">
                        {session.date.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })}
                      </td>
                      <td data-ev-id="ev_0efeabe20b" className="border border-gray-200 px-2 py-1">{session.time}</td>
                      <td data-ev-id="ev_cf1bcd8a4e" className="border border-gray-200 px-2 py-1">{session.topic || '-'}</td>
                      <td data-ev-id="ev_19df65cec5" className="border border-gray-200 px-2 py-1">
                        <span data-ev-id="ev_7ad66827c7" className={`px-1 rounded text-[10px] ${CATEGORIES[session.category].color}`}>
                          {CATEGORIES[session.category].label}
                        </span>
                      </td>
                      <td data-ev-id="ev_4800e1487a" className="border border-gray-200 px-2 py-1">{session.instructor || '-'}</td>
                      <td data-ev-id="ev_0dac4561f9" className="border border-gray-200 px-2 py-1">{session.vehicles || '-'}</td>
                      <td data-ev-id="ev_c5cca90bde" className="border border-gray-200 px-2 py-1">{session.notes || '-'}</td>
                    </tr>
                )}
                </tbody>
              </table>
              {sessions.length > 8 &&
            <p data-ev-id="ev_e372a78832" className="text-center text-gray-400 mt-2 text-xs">
                  ... und {sessions.length - 8} weitere Termine
                </p>
            }
              
              {/* Footer */}
              <div data-ev-id="ev_240b0c8b65" className="mt-4 pt-2 border-t border-gray-200 flex justify-between text-xs text-gray-500">
                <span data-ev-id="ev_3d781611ec">Übung jeden Mittwoch, 18:20 Uhr</span>
                <span data-ev-id="ev_922f69e879">Stand: {new Date().toLocaleDateString('de-AT')}</span>
              </div>
            </div>
          </div>
        </div>
      }
    </div>);

}