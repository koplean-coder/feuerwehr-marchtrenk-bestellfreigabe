import { useState, useMemo } from 'react';
import { ArrowLeft, Plus, X, Download, Calendar, FileText, ChevronLeft, ChevronRight, Settings, Save, Trash2, Copy, RotateCcw, Users } from 'lucide-react';

interface TrainingPlanSectionProps {
  onBack: () => void;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface ScenarioTemplate {
  id: string;
  name: string;
  categoryIds: string[];
  defaultInstructor?: string;
}

interface RecurrenceRule {
  id: string;
  weekOfMonth: 1 | 2 | 3 | 4 | 5; // 1st, 2nd, 3rd, 4th, last Wednesday
  scenarioTemplateId: string;
}

interface TrainingSession {
  id: string;
  date: Date;
  time: string;
  topic: string;
  categoryIds: string[];
  instructor: string;
  notes: string;
  isHoliday: boolean;
}

const DEFAULT_CATEGORIES: Category[] = [
{ id: 'brand', name: 'Brandeinsatz', color: 'bg-red-100 text-red-700 border-red-300' },
{ id: 'technisch', name: 'Technisch', color: 'bg-blue-100 text-blue-700 border-blue-300' },
{ id: 'erste-hilfe', name: 'Erste Hilfe', color: 'bg-green-100 text-green-700 border-green-300' },
{ id: 'theorie', name: 'Theorie', color: 'bg-purple-100 text-purple-700 border-purple-300' },
{ id: 'gemeinschaft', name: 'Gemeinschaft', color: 'bg-orange-100 text-orange-700 border-orange-300' },
{ id: 'atemschutz', name: 'Atemschutz', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' }];


const COLOR_OPTIONS = [
'bg-red-100 text-red-700 border-red-300',
'bg-blue-100 text-blue-700 border-blue-300',
'bg-green-100 text-green-700 border-green-300',
'bg-purple-100 text-purple-700 border-purple-300',
'bg-orange-100 text-orange-700 border-orange-300',
'bg-yellow-100 text-yellow-700 border-yellow-300',
'bg-pink-100 text-pink-700 border-pink-300',
'bg-cyan-100 text-cyan-700 border-cyan-300',
'bg-emerald-100 text-emerald-700 border-emerald-300',
'bg-indigo-100 text-indigo-700 border-indigo-300'];


// Mock instructors - in real app from DB
const INSTRUCTORS = [
'Mustermann Max',
'Huber Franz',
'Gruber Thomas',
'Maier Stefan',
'Berger Michael',
'Wagner Peter'];


// Österreichische Feiertage 2024-2026
const AUSTRIAN_HOLIDAYS: Record<number, string[]> = {
  2024: [
  '2024-01-01', '2024-01-06', '2024-04-01', '2024-05-01', '2024-05-09',
  '2024-05-20', '2024-05-30', '2024-08-15', '2024-10-26', '2024-11-01',
  '2024-12-08', '2024-12-25', '2024-12-26'],

  2025: [
  '2025-01-01', '2025-01-06', '2025-04-21', '2025-05-01', '2025-05-29',
  '2025-06-09', '2025-06-19', '2025-08-15', '2025-10-26', '2025-11-01',
  '2025-12-08', '2025-12-25', '2025-12-26'],

  2026: [
  '2026-01-01', '2026-01-06', '2026-04-06', '2026-05-01', '2026-05-14',
  '2026-05-25', '2026-06-04', '2026-08-15', '2026-10-26', '2026-11-01',
  '2026-12-08', '2026-12-25', '2026-12-26']

};

type PeriodType = 'H1' | 'H2' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

function getDateRangeForPeriod(year: number, period: PeriodType): {start: Date;end: Date;} {
  switch (period) {
    case 'Q1':return { start: new Date(year, 0, 1), end: new Date(year, 2, 31) };
    case 'Q2':return { start: new Date(year, 3, 1), end: new Date(year, 5, 30) };
    case 'Q3':return { start: new Date(year, 6, 1), end: new Date(year, 8, 30) };
    case 'Q4':return { start: new Date(year, 9, 1), end: new Date(year, 11, 31) };
    case 'H1':return { start: new Date(year, 0, 1), end: new Date(year, 5, 30) };
    case 'H2':return { start: new Date(year, 6, 1), end: new Date(year, 11, 31) };
  }
}

function getWednesdaysInRange(start: Date, end: Date): Date[] {
  const wednesdays: Date[] = [];
  const current = new Date(start);
  while (current.getDay() !== 3) current.setDate(current.getDate() + 1);
  while (current <= end) {
    wednesdays.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return wednesdays;
}

function isHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const dateStr = date.toISOString().split('T')[0];
  return AUSTRIAN_HOLIDAYS[year]?.includes(dateStr) || false;
}

function getWeekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstWednesday = new Date(firstDay);
  while (firstWednesday.getDay() !== 3) firstWednesday.setDate(firstWednesday.getDate() + 1);
  return Math.floor((date.getDate() - firstWednesday.getDate()) / 7) + 1;
}

function getMonthName(date: Date): string {
  return date.toLocaleDateString('de-AT', { month: 'long' });
}

export function TrainingPlanSection({ onBack }: TrainingPlanSectionProps) {
  // Period selection
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('Q1');

  // Data
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [scenarioTemplates, setScenarioTemplates] = useState<ScenarioTemplate[]>([]);
  const [recurrenceRules, setRecurrenceRules] = useState<RecurrenceRule[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState<'plan' | 'templates' | 'settings'>('plan');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(COLOR_OPTIONS[0]);

  // Template editing
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategoryIds, setNewTemplateCategoryIds] = useState<string[]>([]);
  const [newTemplateInstructor, setNewTemplateInstructor] = useState('');

  // Recurrence editing
  const [newRuleWeek, setNewRuleWeek] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [newRuleTemplateId, setNewRuleTemplateId] = useState('');

  // Calculate date range and wednesdays
  const dateRange = useMemo(() => getDateRangeForPeriod(selectedYear, selectedPeriod), [selectedYear, selectedPeriod]);
  const wednesdays = useMemo(() => getWednesdaysInRange(dateRange.start, dateRange.end), [dateRange]);

  // Group sessions by month for display
  const sessionsByMonth = useMemo(() => {
    const grouped: {month: string;sessions: TrainingSession[];}[] = [];
    let currentMonth = '';

    sessions.forEach((session) => {
      const month = getMonthName(session.date);
      if (month !== currentMonth) {
        currentMonth = month;
        grouped.push({ month, sessions: [session] });
      } else {
        grouped[grouped.length - 1].sessions.push(session);
      }
    });

    return grouped;
  }, [sessions]);

  // Initialize sessions with recurrence rules applied
  const initializeSessions = () => {
    const newSessions: TrainingSession[] = wednesdays.map((date) => {
      const weekNum = getWeekOfMonth(date);
      const rule = recurrenceRules.find((r) => r.weekOfMonth === weekNum);
      const template = rule ? scenarioTemplates.find((t) => t.id === rule.scenarioTemplateId) : null;

      return {
        id: date.toISOString(),
        date,
        time: '18:20',
        topic: template?.name || '',
        categoryIds: template?.categoryIds || [],
        instructor: template?.defaultInstructor || '',
        notes: isHoliday(date) ? 'FEIERTAG' : '',
        isHoliday: isHoliday(date)
      };
    });
    setSessions(newSessions);
  };

  const updateSession = (id: string, updates: Partial<TrainingSession>) => {
    setSessions((prev) => prev.map((s) => s.id === id ? { ...s, ...updates } : s));
  };

  const toggleSessionCategory = (sessionId: string, categoryId: string) => {
    setSessions((prev) => prev.map((s) => {
      if (s.id !== sessionId) return s;
      const has = s.categoryIds.includes(categoryId);
      return {
        ...s,
        categoryIds: has ?
        s.categoryIds.filter((c) => c !== categoryId) :
        [...s.categoryIds, categoryId]
      };
    }));
  };

  // Category management
  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: newCategoryName.trim(),
      color: newCategoryColor
    };
    setCategories((prev) => [...prev, newCat]);
    setNewCategoryName('');
    setNewCategoryColor(COLOR_OPTIONS[0]);
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setCategories((prev) => prev.map((c) => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    // Remove from sessions and templates
    setSessions((prev) => prev.map((s) => ({ ...s, categoryIds: s.categoryIds.filter((c) => c !== id) })));
    setScenarioTemplates((prev) => prev.map((t) => ({ ...t, categoryIds: t.categoryIds.filter((c) => c !== id) })));
  };

  // Scenario template management
  const addScenarioTemplate = () => {
    if (!newTemplateName.trim()) return;
    const newTemplate: ScenarioTemplate = {
      id: `tpl-${Date.now()}`,
      name: newTemplateName.trim(),
      categoryIds: newTemplateCategoryIds,
      defaultInstructor: newTemplateInstructor || undefined
    };
    setScenarioTemplates((prev) => [...prev, newTemplate]);
    setNewTemplateName('');
    setNewTemplateCategoryIds([]);
    setNewTemplateInstructor('');
  };

  const deleteScenarioTemplate = (id: string) => {
    setScenarioTemplates((prev) => prev.filter((t) => t.id !== id));
    setRecurrenceRules((prev) => prev.filter((r) => r.scenarioTemplateId !== id));
  };

  const applyTemplateToSession = (sessionId: string, template: ScenarioTemplate) => {
    updateSession(sessionId, {
      topic: template.name,
      categoryIds: template.categoryIds,
      instructor: template.defaultInstructor || ''
    });
  };

  // Recurrence rules
  const addRecurrenceRule = () => {
    if (!newRuleTemplateId) return;
    // Remove existing rule for same week
    const filtered = recurrenceRules.filter((r) => r.weekOfMonth !== newRuleWeek);
    setRecurrenceRules([...filtered, {
      id: `rule-${Date.now()}`,
      weekOfMonth: newRuleWeek,
      scenarioTemplateId: newRuleTemplateId
    }]);
  };

  const deleteRecurrenceRule = (id: string) => {
    setRecurrenceRules((prev) => prev.filter((r) => r.id !== id));
  };

  const getCategoryById = (id: string) => categories.find((c) => c.id === id);

  return (
    <div data-ev-id="ev_62dac0eb66" className="space-y-6">
      {/* Header */}
      <div data-ev-id="ev_7747045590" className="flex items-center justify-between">
        <div data-ev-id="ev_b379e845e6" className="flex items-center gap-4">
          <button data-ev-id="ev_176b6f4056" onClick={onBack} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div data-ev-id="ev_bc0125f795">
            <h1 data-ev-id="ev_2f22a3df2f" className="text-2xl font-bold text-foreground">Übungsplan Generator</h1>
            <p data-ev-id="ev_b2f0bffe70" className="text-muted-foreground">A3 Übungsplan für die Feuerwehr erstellen</p>
          </div>
        </div>
        {sessions.length > 0 &&
        <button data-ev-id="ev_78d76fc5d1"
        onClick={() => alert('PDF Export kommt als nächstes!')}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2">
            <Download className="w-4 h-4" />
            PDF Exportieren (A3)
          </button>
        }
      </div>

      {/* Tabs */}
      <div data-ev-id="ev_7e9ce8eb01" className="flex gap-2 border-b border-border">
        <button data-ev-id="ev_a834a00357"
        onClick={() => setActiveTab('plan')}
        className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors ${
        activeTab === 'plan' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`
        }>
          <Calendar className="w-4 h-4 inline mr-2" />
          Übungsplan
        </button>
        <button data-ev-id="ev_023d21342a"
        onClick={() => setActiveTab('templates')}
        className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors ${
        activeTab === 'templates' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`
        }>
          <Copy className="w-4 h-4 inline mr-2" />
          Vorlagen & Regeln
        </button>
        <button data-ev-id="ev_15bc85ce87"
        onClick={() => setActiveTab('settings')}
        className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors ${
        activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`
        }>
          <Settings className="w-4 h-4 inline mr-2" />
          Kategorien
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'plan' &&
      <div data-ev-id="ev_69a5cb0e1e" className="space-y-6">
          {/* Period Selection */}
          <div data-ev-id="ev_fa9f533d3b" className="bg-card border border-border rounded-xl p-6">
            <div data-ev-id="ev_02d3c71389" className="flex flex-wrap items-center gap-4">
              <div data-ev-id="ev_5b012759bf" className="flex items-center gap-2">
                <button data-ev-id="ev_303a58b11b" onClick={() => setSelectedYear((y) => y - 1)} className="p-2 hover:bg-muted rounded-lg">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span data-ev-id="ev_baf468dde2" className="text-xl font-bold min-w-[80px] text-center">{selectedYear}</span>
                <button data-ev-id="ev_e5d80b9a1e" onClick={() => setSelectedYear((y) => y + 1)} className="p-2 hover:bg-muted rounded-lg">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div data-ev-id="ev_522b61c7ce" className="flex gap-1 bg-muted p-1 rounded-lg">
                {(['Q1', 'Q2', 'Q3', 'Q4'] as PeriodType[]).map((p) =>
              <button data-ev-id="ev_e1cf7dc2ce"
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1.5 rounded-md font-medium text-sm transition-colors ${
              selectedPeriod === p ? 'bg-primary text-primary-foreground' : 'hover:bg-background'}`
              }>
                    {p}
                  </button>
              )}
              </div>
              
              <div data-ev-id="ev_2794811d1d" className="flex gap-1 bg-muted p-1 rounded-lg">
                {(['H1', 'H2'] as PeriodType[]).map((p) =>
              <button data-ev-id="ev_c1091b3bd7"
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1.5 rounded-md font-medium text-sm transition-colors ${
              selectedPeriod === p ? 'bg-primary text-primary-foreground' : 'hover:bg-background'}`
              }>
                    {p === 'H1' ? '1. Halbjahr' : '2. Halbjahr'}
                  </button>
              )}
              </div>

              <button data-ev-id="ev_2f002c9fbf"
            onClick={initializeSessions}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 ml-auto">
                <RotateCcw className="w-4 h-4" />
                {sessions.length > 0 ? 'Neu generieren' : 'Termine generieren'}
              </button>
            </div>

            <div data-ev-id="ev_c5413c8ec1" className="mt-4 flex gap-4 text-sm">
              <span data-ev-id="ev_6a2a17bcde"><strong data-ev-id="ev_dd6cecfff6">{wednesdays.length}</strong> Mittwoche</span>
              <span data-ev-id="ev_0825d42270" className="text-orange-600"><strong data-ev-id="ev_4e4a792cd3">{wednesdays.filter((d) => isHoliday(d)).length}</strong> Feiertage</span>
              {recurrenceRules.length > 0 &&
            <span data-ev-id="ev_8d1fce5322" className="text-green-600"><strong data-ev-id="ev_582ed624aa">{recurrenceRules.length}</strong> Wiederholungsregeln aktiv</span>
            }
            </div>
          </div>

          {/* Category Legend */}
          <div data-ev-id="ev_bb9707529b" className="flex flex-wrap gap-2">
            {categories.map((cat) =>
          <span data-ev-id="ev_a110750e17" key={cat.id} className={`px-3 py-1 rounded-full text-sm font-medium border ${cat.color}`}>
                {cat.name}
              </span>
          )}
          </div>

          {/* Sessions Table */}
          {sessions.length > 0 ?
        <div data-ev-id="ev_bc8c060181" className="space-y-6">
              {sessionsByMonth.map(({ month, sessions: monthSessions }) =>
          <div data-ev-id="ev_dd0945a101" key={month} className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Month Header */}
                  <div data-ev-id="ev_8c9624ec32" className="bg-[#C8102E] text-white px-4 py-2 font-bold text-lg">
                    {month} {selectedYear}
                  </div>
                  
                  <div data-ev-id="ev_f251e7a587" className="overflow-x-auto">
                    <table data-ev-id="ev_280f2b1aaa" className="w-full">
                      <thead data-ev-id="ev_e0617d1079">
                        <tr data-ev-id="ev_705c1e2e32" className="bg-gray-100 text-sm">
                          <th data-ev-id="ev_4e47d47722" className="px-4 py-2 text-left font-semibold w-[100px]">Datum</th>
                          <th data-ev-id="ev_55324edb62" className="px-4 py-2 text-left font-semibold w-[70px]">Uhrzeit</th>
                          <th data-ev-id="ev_3a4dadbc9f" className="px-4 py-2 text-left font-semibold">Übungsthema</th>
                          <th data-ev-id="ev_ca9a3abfb4" className="px-4 py-2 text-left font-semibold w-[200px]">Kategorien</th>
                          <th data-ev-id="ev_61f1b4bb66" className="px-4 py-2 text-left font-semibold w-[180px]">Übungsleiter</th>
                          <th data-ev-id="ev_1505de5c11" className="px-4 py-2 text-left font-semibold w-[120px]">Anmerkungen</th>
                          <th data-ev-id="ev_858c7eb4da" className="px-4 py-2 text-left font-semibold w-[100px]">Vorlage</th>
                        </tr>
                      </thead>
                      <tbody data-ev-id="ev_4ae88cf19a">
                        {monthSessions.map((session, idx) =>
                  <tr data-ev-id="ev_e3b1f0f512"
                  key={session.id}
                  className={`border-t border-border ${
                  session.isHoliday ? 'bg-orange-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`
                  }
                  style={{ height: '72px' }} // 3 lines height
                  >
                            <td data-ev-id="ev_917f76aaaa" className="px-4 py-2 align-top">
                              <div data-ev-id="ev_6b94a89050" className="font-medium">
                                {session.date.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })}
                              </div>
                              <div data-ev-id="ev_4fdc69e265" className="text-xs text-muted-foreground">
                                {session.date.toLocaleDateString('de-AT', { weekday: 'short' })}
                              </div>
                              {session.isHoliday &&
                      <span data-ev-id="ev_6efebf7377" className="text-xs text-orange-600 font-medium">Feiertag</span>
                      }
                            </td>
                            <td data-ev-id="ev_4c0ded7e1e" className="px-4 py-2 align-top">
                              <input data-ev-id="ev_fe4225b320"
                      type="time"
                      value={session.time}
                      onChange={(e) => updateSession(session.id, { time: e.target.value })}
                      className="px-2 py-1 border border-border rounded bg-background w-full text-sm" />

                            </td>
                            <td data-ev-id="ev_1a7d7407aa" className="px-4 py-2 align-top">
                              <textarea data-ev-id="ev_911a34b98b"
                      value={session.topic}
                      onChange={(e) => updateSession(session.id, { topic: e.target.value })}
                      placeholder="z.B. Löschangriff, THL PKW..."
                      rows={2}
                      className="px-2 py-1 border border-border rounded bg-background w-full text-sm resize-none" />

                            </td>
                            <td data-ev-id="ev_70cfde5a71" className="px-4 py-2 align-top">
                              <div data-ev-id="ev_10c87431df" className="flex flex-wrap gap-1">
                                {categories.map((cat) => {
                          const isSelected = session.categoryIds.includes(cat.id);
                          return (
                            <button data-ev-id="ev_e51d1819b3"
                            key={cat.id}
                            onClick={() => toggleSessionCategory(session.id, cat.id)}
                            className={`px-2 py-0.5 rounded text-xs font-medium border transition-all ${
                            isSelected ? cat.color : 'bg-gray-100 text-gray-400 border-gray-200 opacity-50'}`
                            }>
                                      {cat.name}
                                    </button>);

                        })}
                              </div>
                            </td>
                            <td data-ev-id="ev_0f5d2c282c" className="px-4 py-2 align-top">
                              <div data-ev-id="ev_9f82c7e206" className="relative">
                                <input data-ev-id="ev_156e56f311"
                        type="text"
                        list={`instructors-${session.id}`}
                        value={session.instructor}
                        onChange={(e) => updateSession(session.id, { instructor: e.target.value })}
                        placeholder="Name wählen/eingeben"
                        className="px-2 py-1 border border-border rounded bg-background w-full text-sm" />

                                <datalist data-ev-id="ev_32b329d6a6" id={`instructors-${session.id}`}>
                                  {INSTRUCTORS.map((name) =>
                          <option data-ev-id="ev_35085f66b2" key={name} value={name} />
                          )}
                                </datalist>
                              </div>
                            </td>
                            <td data-ev-id="ev_d384c02ff9" className="px-4 py-2 align-top">
                              <input data-ev-id="ev_68c5e7e648"
                      type="text"
                      value={session.notes}
                      onChange={(e) => updateSession(session.id, { notes: e.target.value })}
                      placeholder="Notizen"
                      className="px-2 py-1 border border-border rounded bg-background w-full text-sm" />

                            </td>
                            <td data-ev-id="ev_5d4f69b73e" className="px-4 py-2 align-top">
                              {scenarioTemplates.length > 0 &&
                      <select data-ev-id="ev_2d8ee907b2"
                      onChange={(e) => {
                        const tpl = scenarioTemplates.find((t) => t.id === e.target.value);
                        if (tpl) applyTemplateToSession(session.id, tpl);
                      }}
                      value=""
                      className="px-2 py-1 border border-border rounded bg-background w-full text-sm">
                                  <option data-ev-id="ev_41bb16ca76" value="">Anwenden...</option>
                                  {scenarioTemplates.map((tpl) =>
                        <option data-ev-id="ev_5ee18b71fb" key={tpl.id} value={tpl.id}>{tpl.name}</option>
                        )}
                                </select>
                      }
                            </td>
                          </tr>
                  )}
                      </tbody>
                    </table>
                  </div>
                </div>
          )}
            </div> :

        <div data-ev-id="ev_1a5c32510d" className="bg-card border border-border rounded-xl p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 data-ev-id="ev_013e52b068" className="text-lg font-semibold mb-2">Noch keine Termine</h3>
              <p data-ev-id="ev_13a101adca" className="text-muted-foreground mb-4">
                Wähle einen Zeitraum und klicke auf "Termine generieren".
              </p>
              {scenarioTemplates.length === 0 &&
          <p data-ev-id="ev_03e3c5ccad" className="text-sm text-muted-foreground">
                  Tipp: Erstelle zuerst Vorlagen und Wiederholungsregeln im Tab "Vorlagen & Regeln".
                </p>
          }
            </div>
        }
        </div>
      }

      {activeTab === 'templates' &&
      <div data-ev-id="ev_30ef2dddd2" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scenario Templates */}
          <div data-ev-id="ev_f1a8cc39db" className="bg-card border border-border rounded-xl p-6">
            <h3 data-ev-id="ev_104f7c62ad" className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Szenarien-Vorlagen
            </h3>
            <p data-ev-id="ev_2e4c6cbf05" className="text-sm text-muted-foreground mb-4">
              Häufige Übungen als Vorlage speichern für schnelles Einfügen.
            </p>

            {/* Existing Templates */}
            {scenarioTemplates.length > 0 &&
          <div data-ev-id="ev_13bd413209" className="space-y-2 mb-4">
                {scenarioTemplates.map((tpl) =>
            <div data-ev-id="ev_e9bdb505c7" key={tpl.id} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <div data-ev-id="ev_bfa883fd2d" className="flex-1">
                      <div data-ev-id="ev_a7ff1cfefb" className="font-medium">{tpl.name}</div>
                      <div data-ev-id="ev_3b7c65f9a6" className="flex flex-wrap gap-1 mt-1">
                        {tpl.categoryIds.map((catId) => {
                    const cat = getCategoryById(catId);
                    return cat ?
                    <span data-ev-id="ev_3fb7b9db0d" key={catId} className={`px-2 py-0.5 rounded text-xs ${cat.color}`}>
                              {cat.name}
                            </span> :
                    null;
                  })}
                      </div>
                      {tpl.defaultInstructor &&
                <div data-ev-id="ev_ee006c6cb3" className="text-xs text-muted-foreground mt-1">
                          <Users className="w-3 h-3 inline mr-1" />
                          {tpl.defaultInstructor}
                        </div>
                }
                    </div>
                    <button data-ev-id="ev_0972b85ef2"
              onClick={() => deleteScenarioTemplate(tpl.id)}
              className="p-1 hover:bg-red-100 text-red-600 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
            )}
              </div>
          }

            {/* Add Template Form */}
            <div data-ev-id="ev_e0854744de" className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <input data-ev-id="ev_791f039385"
            type="text"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            placeholder="Vorlagenname (z.B. Löschgruppenaufbau)"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background" />

              <div data-ev-id="ev_27ff03109a" className="flex flex-wrap gap-1">
                {categories.map((cat) =>
              <button data-ev-id="ev_5858dd2bba"
              key={cat.id}
              onClick={() => setNewTemplateCategoryIds((prev) =>
              prev.includes(cat.id) ? prev.filter((c) => c !== cat.id) : [...prev, cat.id]
              )}
              className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
              newTemplateCategoryIds.includes(cat.id) ? cat.color : 'bg-gray-100 text-gray-400 border-gray-200'}`
              }>
                    {cat.name}
                  </button>
              )}
              </div>
              <select data-ev-id="ev_866ce3d28c"
            value={newTemplateInstructor}
            onChange={(e) => setNewTemplateInstructor(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background">
                <option data-ev-id="ev_a73b2e5bf7" value="">Standard-Übungsleiter (optional)</option>
                {INSTRUCTORS.map((name) =>
              <option data-ev-id="ev_d46504d51c" key={name} value={name}>{name}</option>
              )}
              </select>
              <button data-ev-id="ev_c7480a38ef"
            onClick={addScenarioTemplate}
            disabled={!newTemplateName.trim()}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                Vorlage speichern
              </button>
            </div>
          </div>

          {/* Recurrence Rules */}
          <div data-ev-id="ev_3be9c2ede7" className="bg-card border border-border rounded-xl p-6">
            <h3 data-ev-id="ev_6fb8e22f3e" className="text-lg font-semibold mb-4 flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Wiederholungsregeln
            </h3>
            <p data-ev-id="ev_00376488b9" className="text-sm text-muted-foreground mb-4">
              Automatische Zuweisung von Vorlagen basierend auf dem Mittwoch im Monat.
            </p>

            {/* Existing Rules */}
            {recurrenceRules.length > 0 &&
          <div data-ev-id="ev_89122eefcf" className="space-y-2 mb-4">
                {recurrenceRules.map((rule) => {
              const tpl = scenarioTemplates.find((t) => t.id === rule.scenarioTemplateId);
              return (
                <div data-ev-id="ev_158cca88d5" key={rule.id} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <div data-ev-id="ev_3730272c83" className="flex-1">
                        <span data-ev-id="ev_9f7667d8d0" className="font-medium">{rule.weekOfMonth}. Mittwoch</span>
                        <span data-ev-id="ev_71c603ff29" className="text-muted-foreground mx-2">→</span>
                        <span data-ev-id="ev_a2c62ed085" className="text-primary font-medium">{tpl?.name || 'Unbekannt'}</span>
                      </div>
                      <button data-ev-id="ev_0f57cac7b7"
                  onClick={() => deleteRecurrenceRule(rule.id)}
                  className="p-1 hover:bg-red-100 text-red-600 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>);

            })}
              </div>
          }

            {/* Add Rule Form */}
            {scenarioTemplates.length > 0 ?
          <div data-ev-id="ev_7a9fac9b0a" className="space-y-3 p-4 bg-muted/30 rounded-lg">
                <div data-ev-id="ev_12b6bc1855" className="grid grid-cols-2 gap-3">
                  <select data-ev-id="ev_fa0cc0d917"
              value={newRuleWeek}
              onChange={(e) => setNewRuleWeek(parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5)}
              className="px-3 py-2 border border-border rounded-lg bg-background">
                    <option data-ev-id="ev_6cec39ef0a" value={1}>1. Mittwoch im Monat</option>
                    <option data-ev-id="ev_18d6228b71" value={2}>2. Mittwoch im Monat</option>
                    <option data-ev-id="ev_399e99a546" value={3}>3. Mittwoch im Monat</option>
                    <option data-ev-id="ev_1087fc56d6" value={4}>4. Mittwoch im Monat</option>
                    <option data-ev-id="ev_5ede26198b" value={5}>5. Mittwoch im Monat</option>
                  </select>
                  <select data-ev-id="ev_d583e4e8b5"
              value={newRuleTemplateId}
              onChange={(e) => setNewRuleTemplateId(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background">
                    <option data-ev-id="ev_fc2644a467" value="">Vorlage wählen...</option>
                    {scenarioTemplates.map((tpl) =>
                <option data-ev-id="ev_593cf4294a" key={tpl.id} value={tpl.id}>{tpl.name}</option>
                )}
                  </select>
                </div>
                <button data-ev-id="ev_7adfcbe40c"
            onClick={addRecurrenceRule}
            disabled={!newRuleTemplateId}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  Regel hinzufügen
                </button>
              </div> :

          <div data-ev-id="ev_49d34dc812" className="p-4 bg-muted/30 rounded-lg text-center text-muted-foreground">
                Erstelle zuerst eine Szenarien-Vorlage.
              </div>
          }
          </div>
        </div>
      }

      {activeTab === 'settings' &&
      <div data-ev-id="ev_ebad48787f" className="bg-card border border-border rounded-xl p-6">
          <h3 data-ev-id="ev_62110ab8ef" className="text-lg font-semibold mb-4">Kategorien verwalten</h3>
          <p data-ev-id="ev_ef3b1c3f60" className="text-sm text-muted-foreground mb-4">
            Kategorien für Übungstypen definieren. Jede Übung kann mehrere Kategorien haben.
          </p>

          {/* Existing Categories */}
          <div data-ev-id="ev_4e0576916b" className="space-y-2 mb-6">
            {categories.map((cat) =>
          <div data-ev-id="ev_6e60772823" key={cat.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <span data-ev-id="ev_4daf14553a" className={`px-3 py-1 rounded-full text-sm font-medium border ${cat.color}`}>
                  {cat.name}
                </span>
                <div data-ev-id="ev_ead83c3172" className="flex-1" />
                <div data-ev-id="ev_2da0e2da77" className="flex gap-1">
                  {COLOR_OPTIONS.map((color) =>
              <button data-ev-id="ev_3e502ea37a"
              key={color}
              onClick={() => updateCategory(cat.id, { color })}
              className={`w-6 h-6 rounded-full border-2 ${color.split(' ')[0]} ${
              cat.color === color ? 'ring-2 ring-primary ring-offset-2' : ''}`
              } />

              )}
                </div>
                <button data-ev-id="ev_f6fe7af327"
            onClick={() => deleteCategory(cat.id)}
            className="p-1 hover:bg-red-100 text-red-600 rounded ml-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
          )}
          </div>

          {/* Add Category */}
          <div data-ev-id="ev_92dd6c53e4" className="flex gap-3 items-end p-4 bg-muted/30 rounded-lg">
            <div data-ev-id="ev_25cfa1a22e" className="flex-1">
              <label data-ev-id="ev_3732157785" className="block text-sm font-medium mb-1">Neue Kategorie</label>
              <input data-ev-id="ev_fc4ba9b505"
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="z.B. Wasserdienst"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background" />

            </div>
            <div data-ev-id="ev_7a67af7b2b">
              <label data-ev-id="ev_c6ba1d54e9" className="block text-sm font-medium mb-1">Farbe</label>
              <div data-ev-id="ev_778b2636e0" className="flex gap-1">
                {COLOR_OPTIONS.slice(0, 5).map((color) =>
              <button data-ev-id="ev_2415911be5"
              key={color}
              onClick={() => setNewCategoryColor(color)}
              className={`w-8 h-8 rounded-full border-2 ${color.split(' ')[0]} ${
              newCategoryColor === color ? 'ring-2 ring-primary ring-offset-2' : ''}`
              } />

              )}
              </div>
            </div>
            <button data-ev-id="ev_f0eb94415d"
          onClick={addCategory}
          disabled={!newCategoryName.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Hinzufügen
            </button>
          </div>
        </div>
      }

      {/* PDF Preview */}
      {sessions.length > 0 && activeTab === 'plan' &&
      <div data-ev-id="ev_cfd7ad8d3f" className="bg-card border border-border rounded-xl p-6">
          <h3 data-ev-id="ev_5189142dbc" className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            PDF Vorschau (A3 Querformat)
          </h3>

          <div data-ev-id="ev_26a839b793" className="border-2 border-dashed border-border rounded-lg p-4 bg-white overflow-auto">
            <div data-ev-id="ev_3fa84f84e1" className="min-w-[900px]" style={{ aspectRatio: '1.414/1' }}>
              {/* Header with Logo */}
              <div data-ev-id="ev_bdf3f37d3a" className="flex items-start justify-between mb-4 pb-4 border-b-4 border-[#C8102E]">
                <div data-ev-id="ev_19211b4c62">
                  <h2 data-ev-id="ev_d4551620fa" className="text-2xl font-bold text-[#C8102E]">ÜBUNGSPLAN {selectedYear}</h2>
                  <p data-ev-id="ev_0cc3254fa4" className="text-lg font-medium text-gray-600">
                    {selectedPeriod.startsWith('Q') ? `${selectedPeriod.replace('Q', '')}. Quartal` :
                  selectedPeriod === 'H1' ? 'Jänner - Juni' : 'Juli - Dezember'}
                  </p>
                  <p data-ev-id="ev_897cc29e6c" className="text-sm text-gray-500 mt-1">Übung jeden Mittwoch, 18:20 Uhr</p>
                </div>
                <div data-ev-id="ev_7544577c00" className="text-right">
                  <div data-ev-id="ev_de44d6b6c4" className="w-20 h-20 bg-[#C8102E] rounded-lg flex items-center justify-center text-white font-bold text-xs">
                    FF LOGO
                  </div>
                  <div data-ev-id="ev_550d8cce5b" className="text-sm font-bold mt-2">Freiwillige Feuerwehr</div>
                  <div data-ev-id="ev_b62d51562a" className="text-sm font-bold text-[#C8102E]">Marchtrenk</div>
                </div>
              </div>

              {/* Mini Table Preview with Month Separators */}
              {sessionsByMonth.slice(0, 3).map(({ month, sessions: monthSessions }) =>
            <div data-ev-id="ev_c6288702ea" key={month} className="mb-3">
                  <div data-ev-id="ev_cc30b9c7e0" className="bg-[#C8102E] text-white px-2 py-1 text-xs font-bold rounded-t">
                    {month}
                  </div>
                  <table data-ev-id="ev_57412d3f82" className="w-full text-[10px] border-collapse">
                    <tbody data-ev-id="ev_3fbc24c0b5">
                      {monthSessions.slice(0, 2).map((session, idx) =>
                  <tr data-ev-id="ev_4d4d332dd3" key={session.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td data-ev-id="ev_15d0e795a2" className="border border-gray-200 px-2 py-2 w-[60px]" style={{ height: '36px' }}>
                            {session.date.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })}
                          </td>
                          <td data-ev-id="ev_7faecf45a9" className="border border-gray-200 px-2 py-2 w-[40px]">{session.time}</td>
                          <td data-ev-id="ev_ffa1119213" className="border border-gray-200 px-2 py-2">{session.topic || '-'}</td>
                          <td data-ev-id="ev_2b16a931e1" className="border border-gray-200 px-2 py-2 w-[120px]">
                            <div data-ev-id="ev_c36e2e7f56" className="flex flex-col gap-0.5">
                              {session.categoryIds.map((catId) => {
                          const cat = getCategoryById(catId);
                          return cat ?
                          <span data-ev-id="ev_4bc7d6e92f" key={catId} className={`px-1 rounded text-[8px] ${cat.color}`}>
                                    {cat.name}
                                  </span> :
                          null;
                        })}
                            </div>
                          </td>
                          <td data-ev-id="ev_e2ca1ee225" className="border border-gray-200 px-2 py-2 w-[80px]">{session.instructor || '-'}</td>
                          <td data-ev-id="ev_25850256a3" className="border border-gray-200 px-2 py-2 w-[80px]">{session.notes || '-'}</td>
                        </tr>
                  )}
                    </tbody>
                  </table>
                </div>
            )}
              
              <p data-ev-id="ev_b2713620f3" className="text-center text-gray-400 text-xs">
                ... Vorschau gekürzt ({sessions.length} Termine gesamt)
              </p>

              {/* Footer */}
              <div data-ev-id="ev_d32ea611da" className="mt-4 pt-2 border-t border-gray-200 flex justify-between text-[10px] text-gray-500">
                <span data-ev-id="ev_b8988f7299">Freiwillige Feuerwehr Marchtrenk · Linzerstraße 43 · 4614 Marchtrenk</span>
                <span data-ev-id="ev_c27c31d4a5">Stand: {new Date().toLocaleDateString('de-AT')}</span>
              </div>
            </div>
          </div>
          
          <p data-ev-id="ev_b7bde0e673" className="text-xs text-muted-foreground mt-2">
            * Schriftgröße wird im PDF automatisch angepasst, damit alle Termine auf eine A3-Seite passen.
          </p>
        </div>
      }
    </div>);

}