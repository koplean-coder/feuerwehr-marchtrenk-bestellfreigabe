import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Plus, X, Download, Calendar, FileText, ChevronLeft, ChevronRight, ChevronDown, Settings, Save, Trash2, Copy, RotateCcw, Users, FolderOpen, Check } from 'lucide-react';
import ffmLogo from '@/assets/uploads/ffm-logo-header.png';
import {
  useTrainingCategories,
  useScenarioTemplates,
  useRecurrenceRules,
  useTrainingPlans,
  useInstructors,
  type TrainingSession as DbTrainingSession } from
'@/hooks/use-training-data';

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
  intervalType: 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannually' | 'yearly';
  weekOfPeriod: 1 | 2 | 3 | 4 | 5;
  scenarioTemplateId: string;
  name: string;
}

const INTERVAL_LABELS: Record<string, string> = {
  'weekly': 'Wöchentlich',
  'biweekly': 'Alle 2 Wochen',
  'monthly': 'Monatlich',
  'bimonthly': 'Alle 2 Monate',
  'quarterly': 'Quartalsweise',
  'semiannually': 'Halbjährlich',
  'yearly': 'Jährlich'
};

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

// Tailwind color classes mapped from hex
const COLOR_MAP: Record<string, string> = {
  '#EF4444': 'bg-red-100 text-red-700 border-red-300',
  '#3B82F6': 'bg-blue-100 text-blue-700 border-blue-300',
  '#22C55E': 'bg-green-100 text-green-700 border-green-300',
  '#F97316': 'bg-orange-100 text-orange-700 border-orange-300',
  '#8B5CF6': 'bg-purple-100 text-purple-700 border-purple-300',
  '#EC4899': 'bg-pink-100 text-pink-700 border-pink-300',
  '#06B6D4': 'bg-cyan-100 text-cyan-700 border-cyan-300',
  '#6366F1': 'bg-indigo-100 text-indigo-700 border-indigo-300',
  '#FBBF24': 'bg-yellow-100 text-yellow-700 border-yellow-300',
  '#10B981': 'bg-emerald-100 text-emerald-700 border-emerald-300'
};

const HEX_COLORS = Object.keys(COLOR_MAP);

function hexToTailwind(hex: string): string {
  return COLOR_MAP[hex] || 'bg-gray-100 text-gray-700 border-gray-300';
}

// Österreichische Feiertage 2024-2030
const AUSTRIAN_HOLIDAYS: Record<number, string[]> = {
  2024: ['2024-01-01', '2024-01-06', '2024-04-01', '2024-05-01', '2024-05-09', '2024-05-20', '2024-05-30', '2024-08-15', '2024-10-26', '2024-11-01', '2024-12-08', '2024-12-25', '2024-12-26'],
  2025: ['2025-01-01', '2025-01-06', '2025-04-21', '2025-05-01', '2025-05-29', '2025-06-09', '2025-06-19', '2025-08-15', '2025-10-26', '2025-11-01', '2025-12-08', '2025-12-25', '2025-12-26'],
  2026: ['2026-01-01', '2026-01-06', '2026-04-06', '2026-05-01', '2026-05-14', '2026-05-25', '2026-06-04', '2026-08-15', '2026-10-26', '2026-11-01', '2026-12-08', '2026-12-25', '2026-12-26'],
  2027: ['2027-01-01', '2027-01-06', '2027-03-29', '2027-05-01', '2027-05-06', '2027-05-17', '2027-05-27', '2027-08-15', '2027-10-26', '2027-11-01', '2027-12-08', '2027-12-25', '2027-12-26'],
  2028: ['2028-01-01', '2028-01-06', '2028-04-17', '2028-05-01', '2028-05-25', '2028-06-05', '2028-06-15', '2028-08-15', '2028-10-26', '2028-11-01', '2028-12-08', '2028-12-25', '2028-12-26'],
  2029: ['2029-01-01', '2029-01-06', '2029-04-02', '2029-05-01', '2029-05-10', '2029-05-21', '2029-05-31', '2029-08-15', '2029-10-26', '2029-11-01', '2029-12-08', '2029-12-25', '2029-12-26'],
  2030: ['2030-01-01', '2030-01-06', '2030-04-22', '2030-05-01', '2030-05-30', '2030-06-10', '2030-06-20', '2030-08-15', '2030-10-26', '2030-11-01', '2030-12-08', '2030-12-25', '2030-12-26']
};

type PeriodType = 'H1' | 'H2' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'custom';

function getDateRangeForPeriod(year: number, period: PeriodType, customStart?: Date, customEnd?: Date): {start: Date;end: Date;} {
  switch (period) {
    case 'Q1':return { start: new Date(year, 0, 1), end: new Date(year, 2, 31) };
    case 'Q2':return { start: new Date(year, 3, 1), end: new Date(year, 5, 30) };
    case 'Q3':return { start: new Date(year, 6, 1), end: new Date(year, 8, 30) };
    case 'Q4':return { start: new Date(year, 9, 1), end: new Date(year, 11, 31) };
    case 'H1':return { start: new Date(year, 0, 1), end: new Date(year, 5, 30) };
    case 'H2':return { start: new Date(year, 6, 1), end: new Date(year, 11, 31) };
    case 'custom':return {
        start: customStart || new Date(year, 0, 1),
        end: customEnd || new Date(year, 11, 31)
      };
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
  // Current year as default
  const currentYear = new Date().getFullYear();

  // Period selection
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('Q1');
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date(currentYear, 0, 1));
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date(currentYear, 11, 31));

  // DB hooks
  const { categories: dbCategories, loading: catLoading, addCategory: dbAddCategory, updateCategory: dbUpdateCategory, deleteCategory: dbDeleteCategory } = useTrainingCategories();
  const { templates: dbTemplates, loading: tplLoading, addTemplate: dbAddTemplate, deleteTemplate: dbDeleteTemplate } = useScenarioTemplates();
  const { rules: dbRules, loading: rulesLoading, addRule: dbAddRule, deleteRule: dbDeleteRule } = useRecurrenceRules();
  const { plans: dbPlans, loading: plansLoading, savePlan: dbSavePlan, deletePlan: dbDeletePlan, fetchPlans } = useTrainingPlans();
  const { instructors: dbInstructors, allUsers, loading: instructorsLoading, toggleInstructor } = useInstructors();

  // Map DB data to local format
  const categories: Category[] = useMemo(() =>
  dbCategories.map((c) => ({ id: c.id, name: c.name, color: hexToTailwind(c.color) })),
  [dbCategories]
  );

  const scenarioTemplates: ScenarioTemplate[] = useMemo(() =>
  dbTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    categoryIds: t.category_ids,
    defaultInstructor: t.default_instructor ?? undefined
  })),
  [dbTemplates]
  );

  const recurrenceRules: RecurrenceRule[] = useMemo(() =>
  dbRules.map((r) => ({
    id: r.id,
    intervalType: (r.interval_type || 'monthly') as RecurrenceRule['intervalType'],
    weekOfPeriod: (r.week_of_period || 1) as 1 | 2 | 3 | 4 | 5,
    scenarioTemplateId: r.scenario_template_id ?? '',
    name: r.name
  })).filter((r) => r.scenarioTemplateId),
  [dbRules]
  );

  const instructorNames = useMemo(() => dbInstructors.map((i) => i.full_name), [dbInstructors]);

  // Local session state
  const [sessions, setSessions] = useState<TrainingSession[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState<'plan' | 'templates' | 'settings' | 'instructors' | 'saved'>('plan');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(HEX_COLORS[0]);

  // Template editing
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategoryIds, setNewTemplateCategoryIds] = useState<string[]>([]);
  const [newTemplateInstructor, setNewTemplateInstructor] = useState('');

  // Recurrence editing
  const [newRuleIntervalType, setNewRuleIntervalType] = useState<'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannually' | 'yearly'>('monthly');
  const [newRuleWeekOfPeriod, setNewRuleWeekOfPeriod] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [newRuleTemplateId, setNewRuleTemplateId] = useState('');

  // Save plan state
  const [planName, setPlanName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // PDF Export state
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [pdfPeriod, setPdfPeriod] = useState<'all' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'H1' | 'H2' | 'custom'>('all');
  const [pdfCustomStart, setPdfCustomStart] = useState<Date>(new Date(currentYear, 0, 1));
  const [pdfCustomEnd, setPdfCustomEnd] = useState<Date>(new Date(currentYear, 11, 31));

  // Calculate date range and wednesdays
  const dateRange = useMemo(() =>
  getDateRangeForPeriod(selectedYear, selectedPeriod, customStartDate, customEndDate),
  [selectedYear, selectedPeriod, customStartDate, customEndDate]
  );
  const wednesdays = useMemo(() => getWednesdaysInRange(dateRange.start, dateRange.end), [dateRange]);

  // Group sessions by month
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

  // Initialize sessions with recurrence rules
  const initializeSessions = () => {
    const newSessions: TrainingSession[] = wednesdays.map((date, index) => {
      const weekNum = getWeekOfMonth(date);
      const monthIndex = date.getMonth();

      // Find matching rule based on interval type
      const rule = recurrenceRules.find((r) => {
        switch (r.intervalType) {
          case 'weekly':
            return true; // Every week
          case 'biweekly':
            return index % 2 === 0; // Every 2 weeks
          case 'monthly':
            return r.weekOfPeriod === weekNum; // Specific week of month
          case 'bimonthly':
            return monthIndex % 2 === 0 && r.weekOfPeriod === weekNum;
          case 'quarterly':
            return [0, 3, 6, 9].includes(monthIndex) && r.weekOfPeriod === weekNum;
          case 'semiannually':
            return [0, 6].includes(monthIndex) && r.weekOfPeriod === weekNum;
          case 'yearly':
            return monthIndex === 0 && r.weekOfPeriod === weekNum;
          default:
            return false;
        }
      });

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
        categoryIds: has ? s.categoryIds.filter((c) => c !== categoryId) : [...s.categoryIds, categoryId]
      };
    }));
  };

  // Close category dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[id^="cat-dropdown-"]') && !target.closest('[data-ev-id="ev_cat_dropdown_btn"]')) {
        document.querySelectorAll('[id^="cat-dropdown-"]').forEach((el) => {
          el.classList.add('hidden');
        });
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  // Category management
  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await dbAddCategory(newCategoryName.trim(), newCategoryColor);
      setNewCategoryName('');
      setNewCategoryColor(HEX_COLORS[0]);
    } catch (e) {
      console.error('Failed to add category:', e);
    }
  };

  const updateCategory = async (id: string, color: string) => {
    try {
      await dbUpdateCategory(id, { color });
    } catch (e) {
      console.error('Failed to update category:', e);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await dbDeleteCategory(id);
      setSessions((prev) => prev.map((s) => ({ ...s, categoryIds: s.categoryIds.filter((c) => c !== id) })));
    } catch (e) {
      console.error('Failed to delete category:', e);
    }
  };

  // Template management
  const addScenarioTemplate = async () => {
    if (!newTemplateName.trim()) return;
    try {
      await dbAddTemplate({
        name: newTemplateName.trim(),
        category_ids: newTemplateCategoryIds,
        default_instructor: newTemplateInstructor || undefined
      });
      setNewTemplateName('');
      setNewTemplateCategoryIds([]);
      setNewTemplateInstructor('');
    } catch (e) {
      console.error('Failed to add template:', e);
    }
  };

  const deleteScenarioTemplate = async (id: string) => {
    try {
      await dbDeleteTemplate(id);
    } catch (e) {
      console.error('Failed to delete template:', e);
    }
  };

  const applyTemplateToSession = (sessionId: string, template: ScenarioTemplate) => {
    updateSession(sessionId, {
      topic: template.name,
      categoryIds: template.categoryIds,
      instructor: template.defaultInstructor || ''
    });
  };

  // Recurrence rules
  const addRecurrenceRule = async () => {
    if (!newRuleTemplateId) return;
    const tpl = scenarioTemplates.find((t) => t.id === newRuleTemplateId);
    const intervalLabel = INTERVAL_LABELS[newRuleIntervalType];
    const weekLabel = newRuleIntervalType === 'weekly' || newRuleIntervalType === 'biweekly' ?
    '' :
    `, ${newRuleWeekOfPeriod}. Mittwoch`;
    const ruleName = `${intervalLabel}${weekLabel}: ${tpl?.name || 'Vorlage'}`;

    try {
      await dbAddRule({
        name: ruleName,
        interval_type: newRuleIntervalType,
        week_of_period: newRuleWeekOfPeriod,
        scenario_template_id: newRuleTemplateId
      });
      setNewRuleTemplateId('');
    } catch (e) {
      console.error('Failed to add rule:', e);
    }
  };

  const deleteRecurrenceRule = async (id: string) => {
    try {
      await dbDeleteRule(id);
    } catch (e) {
      console.error('Failed to delete rule:', e);
    }
  };

  // Save plan
  const savePlan = async () => {
    if (!planName.trim() || sessions.length === 0) return;
    setSaving(true);
    try {
      const sessionsForDb: DbTrainingSession[] = sessions.map((s) => ({
        id: s.id,
        date: s.date.toISOString(),
        time: s.time,
        topic: s.topic,
        categoryIds: s.categoryIds,
        instructor: s.instructor,
        notes: s.notes,
        isHoliday: s.isHoliday
      }));
      await dbSavePlan({
        name: planName.trim(),
        year: selectedYear,
        period: selectedPeriod,
        sessions: sessionsForDb
      });
      setPlanName('');
      setShowSaveDialog(false);
    } catch (e) {
      console.error('Failed to save plan:', e);
    } finally {
      setSaving(false);
    }
  };

  // Load saved plan
  const loadPlan = (plan: typeof dbPlans[0]) => {
    const loadedSessions: TrainingSession[] = plan.sessions.map((s) => ({
      ...s,
      date: new Date(s.date)
    }));
    setSessions(loadedSessions);
    setSelectedYear(plan.year);
    setSelectedPeriod(plan.period as PeriodType);
    setActiveTab('plan');
  };

  const getCategoryById = (id: string) => categories.find((c) => c.id === id);
  const getDbCategoryById = (id: string) => dbCategories.find((c) => c.id === id);

  const loading = catLoading || tplLoading || rulesLoading || instructorsLoading;

  if (loading) {
    return (
      <div data-ev-id="ev_fe761164b1" className="flex items-center justify-center h-64">
        <div data-ev-id="ev_4ed72fe3e3" className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>);

  }

  return (
    <div data-ev-id="ev_c9375e9a92" className="space-y-6">
      {/* Header */}
      <div data-ev-id="ev_96e1db1443" className="flex items-center justify-between">
        <div data-ev-id="ev_12d211717e" className="flex items-center gap-4">
          <button data-ev-id="ev_d999c25751" onClick={onBack} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div data-ev-id="ev_49ebf34ddf">
            <h1 data-ev-id="ev_0dbebb4210" className="text-2xl font-bold text-foreground">Übungsplan Generator</h1>
            <p data-ev-id="ev_a239011ac1" className="text-muted-foreground">A3 Übungsplan für die Feuerwehr erstellen</p>
          </div>
        </div>
        <div data-ev-id="ev_ded24b5113" className="flex gap-2">
          {sessions.length > 0 &&
          <>
              <button data-ev-id="ev_d66b8eb6ef"
            onClick={() => setShowSaveDialog(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">

                <Save className="w-4 h-4" />
                Speichern
              </button>
              <button data-ev-id="ev_ff26d2678c"
            onClick={() => setShowPdfDialog(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2">

                <Download className="w-4 h-4" />
                PDF Exportieren (A3)
              </button>
            </>
          }
        </div>
      </div>

      {/* PDF Export Dialog */}
      {showPdfDialog &&
      <div data-ev-id="ev_80be118731" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div data-ev-id="ev_92109e4614" className="bg-card border border-border rounded-xl p-6 w-full max-w-lg">
            <h3 data-ev-id="ev_ba2f3d3306" className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Download className="w-5 h-5" />
              PDF Druckansicht wählen
            </h3>
            
            <p data-ev-id="ev_3b1b524dde" className="text-sm text-muted-foreground mb-4">
              Wähle aus, welcher Zeitraum im PDF angezeigt werden soll:
            </p>

            <div data-ev-id="ev_31349bb45b" className="space-y-3 mb-6">
              {/* All */}
              <label data-ev-id="ev_30760c2276" className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            pdfPeriod === 'all' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`
            }>
                <input data-ev-id="ev_4189257d5c"
              type="radio"
              name="pdfPeriod"
              checked={pdfPeriod === 'all'}
              onChange={() => setPdfPeriod('all')}
              className="w-4 h-4 text-primary" />

                <div data-ev-id="ev_33d316b6f2">
                  <div data-ev-id="ev_198247c188" className="font-medium">Gesamter Plan</div>
                  <div data-ev-id="ev_a8c0683aaf" className="text-sm text-muted-foreground">
                    Alle {sessions.length} Termine ({sessions.length > 0 ? `${sessions[0].date.toLocaleDateString('de-AT')} - ${sessions[sessions.length - 1].date.toLocaleDateString('de-AT')}` : '-'})
                  </div>
                </div>
              </label>

              {/* Quarters */}
              <div data-ev-id="ev_816abe1e0e" className="grid grid-cols-2 gap-2">
                {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => {
                const qSessions = sessions.filter((s) => {
                  const month = s.date.getMonth();
                  if (q === 'Q1') return month >= 0 && month <= 2;
                  if (q === 'Q2') return month >= 3 && month <= 5;
                  if (q === 'Q3') return month >= 6 && month <= 8;
                  return month >= 9 && month <= 11;
                });
                return (
                  <label data-ev-id="ev_fc395d6aa6" key={q} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  pdfPeriod === q ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'} ${
                  qSessions.length === 0 ? 'opacity-50' : ''}`}>
                      <input data-ev-id="ev_b05bb9da97"
                    type="radio"
                    name="pdfPeriod"
                    checked={pdfPeriod === q}
                    onChange={() => setPdfPeriod(q)}
                    disabled={qSessions.length === 0}
                    className="w-4 h-4 text-primary" />

                      <div data-ev-id="ev_154ffb9488">
                        <div data-ev-id="ev_de0e453dfe" className="font-medium">{q.replace('Q', '')}. Quartal</div>
                        <div data-ev-id="ev_f28fd4fa9c" className="text-sm text-muted-foreground">{qSessions.length} Termine</div>
                      </div>
                    </label>);

              })}
              </div>

              {/* Half Years */}
              <div data-ev-id="ev_a9e8fffd34" className="grid grid-cols-2 gap-2">
                {(['H1', 'H2'] as const).map((h) => {
                const hSessions = sessions.filter((s) => {
                  const month = s.date.getMonth();
                  return h === 'H1' ? month <= 5 : month >= 6;
                });
                return (
                  <label data-ev-id="ev_c5e64e66fd" key={h} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  pdfPeriod === h ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'} ${
                  hSessions.length === 0 ? 'opacity-50' : ''}`}>
                      <input data-ev-id="ev_0c55bb7aaa"
                    type="radio"
                    name="pdfPeriod"
                    checked={pdfPeriod === h}
                    onChange={() => setPdfPeriod(h)}
                    disabled={hSessions.length === 0}
                    className="w-4 h-4 text-primary" />

                      <div data-ev-id="ev_b934818e95">
                        <div data-ev-id="ev_26e7e272b3" className="font-medium">{h === 'H1' ? '1. Halbjahr' : '2. Halbjahr'}</div>
                        <div data-ev-id="ev_6d242acca1" className="text-sm text-muted-foreground">{hSessions.length} Termine</div>
                      </div>
                    </label>);

              })}
              </div>

              {/* Custom Range */}
              <label data-ev-id="ev_d237b03d9b" className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            pdfPeriod === 'custom' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`
            }>
                <input data-ev-id="ev_45760115e3"
              type="radio"
              name="pdfPeriod"
              checked={pdfPeriod === 'custom'}
              onChange={() => setPdfPeriod('custom')}
              className="w-4 h-4 text-primary" />

                <div data-ev-id="ev_a7ae801885" className="font-medium">Benutzerdefinierter Zeitraum</div>
              </label>

              {pdfPeriod === 'custom' &&
            <div data-ev-id="ev_ae6660d92e" className="flex gap-4 pl-7">
                  <div data-ev-id="ev_765f67e441" className="flex items-center gap-2">
                    <label data-ev-id="ev_6a11d442c9" className="text-sm">Von:</label>
                    <input data-ev-id="ev_e27695d3f5"
                type="date"
                value={pdfCustomStart.toISOString().split('T')[0]}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  if (!isNaN(date.getTime())) setPdfCustomStart(date);
                }}
                className="px-2 py-1 border border-border rounded bg-background text-sm" />

                  </div>
                  <div data-ev-id="ev_79af49e16c" className="flex items-center gap-2">
                    <label data-ev-id="ev_8891bb7036" className="text-sm">Bis:</label>
                    <input data-ev-id="ev_c283d96271"
                type="date"
                value={pdfCustomEnd.toISOString().split('T')[0]}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  if (!isNaN(date.getTime())) setPdfCustomEnd(date);
                }}
                className="px-2 py-1 border border-border rounded bg-background text-sm" />

                  </div>
                </div>
            }
            </div>

            {/* Preview count */}
            <div data-ev-id="ev_3891d105eb" className="p-3 bg-muted/50 rounded-lg mb-4 text-sm">
              <strong data-ev-id="ev_c00947f3b0">
                {(() => {
                let filtered = sessions;
                if (pdfPeriod === 'Q1') filtered = sessions.filter((s) => s.date.getMonth() <= 2);else
                if (pdfPeriod === 'Q2') filtered = sessions.filter((s) => s.date.getMonth() >= 3 && s.date.getMonth() <= 5);else
                if (pdfPeriod === 'Q3') filtered = sessions.filter((s) => s.date.getMonth() >= 6 && s.date.getMonth() <= 8);else
                if (pdfPeriod === 'Q4') filtered = sessions.filter((s) => s.date.getMonth() >= 9);else
                if (pdfPeriod === 'H1') filtered = sessions.filter((s) => s.date.getMonth() <= 5);else
                if (pdfPeriod === 'H2') filtered = sessions.filter((s) => s.date.getMonth() >= 6);else
                if (pdfPeriod === 'custom') filtered = sessions.filter((s) => s.date >= pdfCustomStart && s.date <= pdfCustomEnd);
                return filtered.length;
              })()}
              </strong> Termine werden im PDF angezeigt
            </div>

            <div data-ev-id="ev_04f9d4364d" className="flex gap-2 justify-end">
              <button data-ev-id="ev_e8818a28e4"
            onClick={() => setShowPdfDialog(false)}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted">

                Abbrechen
              </button>
              <button data-ev-id="ev_195a80c6e4"
            onClick={() => {
              // TODO: PDF generieren mit gefiltertem Zeitraum
              alert('PDF Export mit ' + pdfPeriod + ' wird erstellt...');
              setShowPdfDialog(false);
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2">

                <Download className="w-4 h-4" />
                PDF erstellen
              </button>
            </div>
          </div>
        </div>
      }

      {/* Save Dialog */}
      {showSaveDialog &&
      <div data-ev-id="ev_94a48bc8d1" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div data-ev-id="ev_ecc13dd937" className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
            <h3 data-ev-id="ev_85b71be092" className="text-lg font-semibold mb-4">Übungsplan speichern</h3>
            <input data-ev-id="ev_6c17424884"
          type="text"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          placeholder="Name des Plans (z.B. Übungsplan Q1 2025)"
          className="w-full px-3 py-2 border border-border rounded-lg bg-background mb-4" />

            <div data-ev-id="ev_e14d7d947d" className="flex gap-2 justify-end">
              <button data-ev-id="ev_e245c28515"
            onClick={() => setShowSaveDialog(false)}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted">

                Abbrechen
              </button>
              <button data-ev-id="ev_44cf86aeb6"
            onClick={savePlan}
            disabled={!planName.trim() || saving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">

                {saving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      }

      {/* Tabs */}
      <div data-ev-id="ev_94eba8cd2f" className="flex gap-2 border-b border-border overflow-x-auto">
        {[
        { id: 'plan', icon: Calendar, label: 'Übungsplan' },
        { id: 'saved', icon: FolderOpen, label: 'Gespeicherte Pläne' },
        { id: 'templates', icon: Copy, label: 'Vorlagen & Regeln' },
        { id: 'settings', icon: Settings, label: 'Kategorien' },
        { id: 'instructors', icon: Users, label: 'Übungsleiter' }].
        map((tab) =>
        <button data-ev-id="ev_517f65a863"
        key={tab.id}
        onClick={() => setActiveTab(tab.id as typeof activeTab)}
        className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
        activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`
        }>

            <tab.icon className="w-4 h-4 inline mr-2" />
            {tab.label}
          </button>
        )}
      </div>

      {/* Plan Tab */}
      {activeTab === 'plan' &&
      <div data-ev-id="ev_81aa411549" className="space-y-6">
          {/* Period Selection */}
          <div data-ev-id="ev_0ab8a74816" className="bg-card border border-border rounded-xl p-6">
            <div data-ev-id="ev_e06aa929ed" className="flex flex-wrap items-center gap-4">
              <div data-ev-id="ev_5717b02958" className="flex items-center gap-2">
                <button data-ev-id="ev_77f0cf7b1e" onClick={() => setSelectedYear((y) => y - 1)} className="p-2 hover:bg-muted rounded-lg">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span data-ev-id="ev_53ec98d4b1" className="text-xl font-bold min-w-[80px] text-center">{selectedYear}</span>
                <button data-ev-id="ev_fd045f5f2b" onClick={() => setSelectedYear((y) => y + 1)} className="p-2 hover:bg-muted rounded-lg">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div data-ev-id="ev_a075128ff2" className="flex gap-1 bg-muted p-1 rounded-lg">
                {(['Q1', 'Q2', 'Q3', 'Q4'] as PeriodType[]).map((p) =>
              <button data-ev-id="ev_11331da984"
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1.5 rounded-md font-medium text-sm transition-colors ${
              selectedPeriod === p ? 'bg-primary text-primary-foreground' : 'hover:bg-background'}`
              }>

                    {p}
                  </button>
              )}
              </div>
              
              <div data-ev-id="ev_5054f7787c" className="flex gap-1 bg-muted p-1 rounded-lg">
                {(['H1', 'H2'] as PeriodType[]).map((p) =>
              <button data-ev-id="ev_0e0fba696d"
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1.5 rounded-md font-medium text-sm transition-colors ${
              selectedPeriod === p ? 'bg-primary text-primary-foreground' : 'hover:bg-background'}`
              }>

                    {p === 'H1' ? '1. Halbjahr' : '2. Halbjahr'}
                  </button>
              )}
              </div>

              <button data-ev-id="ev_3af76c8627"
            onClick={() => setSelectedPeriod('custom')}
            className={`px-3 py-1.5 rounded-md font-medium text-sm transition-colors ${
            selectedPeriod === 'custom' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-background'}`
            }>

                Benutzerdefiniert
              </button>

              <button data-ev-id="ev_e2029d7251"
            onClick={initializeSessions}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 ml-auto">

                <RotateCcw className="w-4 h-4" />
                {sessions.length > 0 ? 'Neu generieren' : 'Termine generieren'}
              </button>
            </div>

            {/* Custom Date Range */}
            {selectedPeriod === 'custom' &&
          <div data-ev-id="ev_95c471a9a4" className="mt-4 flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div data-ev-id="ev_bc7d841089" className="flex items-center gap-2">
                  <label data-ev-id="ev_c40a9fdb2b" className="text-sm font-medium">Von:</label>
                  <input data-ev-id="ev_4ff9556e4f"
              type="date"
              value={customStartDate.toISOString().split('T')[0]}
              onChange={(e) => {
                const date = new Date(e.target.value);
                if (!isNaN(date.getTime())) setCustomStartDate(date);
              }}
              className="px-3 py-1.5 border border-border rounded-lg bg-background text-sm" />

                </div>
                <div data-ev-id="ev_0e018c589e" className="flex items-center gap-2">
                  <label data-ev-id="ev_5fe620158f" className="text-sm font-medium">Bis:</label>
                  <input data-ev-id="ev_66143478d6"
              type="date"
              value={customEndDate.toISOString().split('T')[0]}
              onChange={(e) => {
                const date = new Date(e.target.value);
                if (!isNaN(date.getTime())) setCustomEndDate(date);
              }}
              className="px-3 py-1.5 border border-border rounded-lg bg-background text-sm" />

                </div>
                <span data-ev-id="ev_c34cce9964" className="text-sm text-muted-foreground">
                  Zeitraum: {Math.ceil((customEndDate.getTime() - customStartDate.getTime()) / (1000 * 60 * 60 * 24))} Tage
                </span>
              </div>
          }

            <div data-ev-id="ev_c6b86069fd" className="mt-4 flex gap-4 text-sm">
              <span data-ev-id="ev_dba1163786"><strong data-ev-id="ev_3f19800e17">{wednesdays.length}</strong> Mittwoche</span>
              <span data-ev-id="ev_503454de59" className="text-orange-600"><strong data-ev-id="ev_c1a19aac01">{wednesdays.filter((d) => isHoliday(d)).length}</strong> Feiertage</span>
              {recurrenceRules.length > 0 &&
            <span data-ev-id="ev_881fc1dfd8" className="text-green-600"><strong data-ev-id="ev_41d1b02b12">{recurrenceRules.length}</strong> Wiederholungsregeln aktiv</span>
            }
            </div>
          </div>

          {/* Category Legend */}
          <div data-ev-id="ev_72f481a1cf" className="flex flex-wrap gap-2">
            {categories.map((cat) =>
          <span data-ev-id="ev_503ba29805" key={cat.id} className={`px-3 py-1 rounded-full text-sm font-medium border ${cat.color}`}>
                {cat.name}
              </span>
          )}
          </div>

          {/* Sessions Table */}
          {sessions.length > 0 ?
        <div data-ev-id="ev_767da81681" className="space-y-6">
              {sessionsByMonth.map(({ month, sessions: monthSessions }) =>
          <div data-ev-id="ev_d2edcd9198" key={month} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div data-ev-id="ev_f6536a4dd8" className="bg-[#C8102E] text-white px-4 py-2 font-bold text-lg">
                    {month} {selectedYear}
                  </div>
                  
                  <div data-ev-id="ev_01d33c66ed" className="overflow-x-auto">
                    <table data-ev-id="ev_490ed04263" className="w-full">
                      <thead data-ev-id="ev_2e502117de">
                        <tr data-ev-id="ev_2da10f53b2" className="bg-gray-100 text-sm">
                          <th data-ev-id="ev_dddc83d05b" className="px-3 py-2 text-left font-semibold w-[90px]">Datum</th>
                          <th data-ev-id="ev_5f42137efb" className="px-2 py-2 text-left font-semibold w-[65px]">Uhrzeit</th>
                          <th data-ev-id="ev_53ded59bef" className="px-2 py-2 text-left font-semibold">Übungsthema</th>
                          <th data-ev-id="ev_19113849b4" className="px-2 py-2 text-left font-semibold w-[180px]">Kategorien</th>
                          <th data-ev-id="ev_e4e249fa4a" className="px-2 py-2 text-left font-semibold w-[150px]">Übungsleiter</th>
                          <th data-ev-id="ev_f2a54c5be1" className="px-2 py-2 text-left font-semibold w-[100px]">Anmerkungen</th>
                          <th data-ev-id="ev_80bd8fd05e" className="px-2 py-2 text-left font-semibold w-[90px]">Vorlage</th>
                          <th data-ev-id="ev_8374afb55e" className="px-2 py-2 text-center font-semibold w-[40px]"></th>
                        </tr>
                      </thead>
                      <tbody data-ev-id="ev_a7317e3b1a">
                        {monthSessions.map((session, idx) =>
                  <tr data-ev-id="ev_0c83914dbd"
                  key={session.id}
                  className={`border-t border-border ${session.isHoliday ? 'bg-orange-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  style={{ height: '72px' }}>

                            <td data-ev-id="ev_367852b113" className="px-4 py-2 align-top">
                              <div data-ev-id="ev_3dccd43629" className="font-medium">
                                {session.date.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })}
                              </div>
                              <div data-ev-id="ev_63b381ff60" className="text-xs text-muted-foreground">
                                {session.date.toLocaleDateString('de-AT', { weekday: 'short' })}
                              </div>
                              {session.isHoliday &&
                      <span data-ev-id="ev_d38d09dcc1" className="text-xs text-orange-600 font-medium">Feiertag</span>
                      }
                            </td>
                            <td data-ev-id="ev_f4a5b62bbc" className="px-4 py-2 align-top">
                              <input data-ev-id="ev_0e0910fb1d"
                      type="time"
                      value={session.time}
                      onChange={(e) => updateSession(session.id, { time: e.target.value })}
                      className="px-2 py-1 border border-border rounded bg-background w-full text-sm" />

                            </td>
                            <td data-ev-id="ev_80aaa2bcae" className="px-4 py-2 align-top">
                              <textarea data-ev-id="ev_3dd20b85aa"
                      value={session.topic}
                      onChange={(e) => updateSession(session.id, { topic: e.target.value })}
                      placeholder={"z.B. Löschangriff\nTHL PKW Bergung"}
                      rows={3}
                      className="px-2 py-1 border border-border rounded bg-background w-full text-sm resize-none leading-snug" />

                            </td>
                            <td data-ev-id="ev_ca3111485f" className="px-4 py-2 align-top">
                              <div data-ev-id="ev_0d4805142d" className="relative">
                                <button
                          data-ev-id="ev_cat_dropdown_btn"
                          onClick={() => {
                            const el = document.getElementById(`cat-dropdown-${session.id}`);
                            if (el) el.classList.toggle('hidden');
                          }}
                          className="w-full px-2 py-1 border border-border rounded bg-background text-sm text-left flex items-center justify-between gap-2 min-h-[32px]">

                                  <span data-ev-id="ev_4d35bc78a0" className="flex flex-wrap gap-1 flex-1">
                                    {session.categoryIds.length === 0 ?
                            <span data-ev-id="ev_c2e5e06fd4" className="text-gray-400">Kategorien wählen...</span> :

                            session.categoryIds.map((catId) => {
                              const cat = getCategoryById(catId);
                              return cat ?
                              <span data-ev-id="ev_f1aa1b3095" key={catId} className={`px-1.5 py-0.5 rounded text-xs font-medium ${cat.color}`}>
                                            {cat.name}
                                          </span> :
                              null;
                            })
                            }
                                  </span>
                                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                </button>
                                <div data-ev-id="ev_79beb57f52"
                        id={`cat-dropdown-${session.id}`}
                        className="hidden absolute z-50 mt-1 w-full bg-white border border-border rounded-lg shadow-lg py-1 max-h-48 overflow-auto">

                                  {categories.map((cat) => {
                            const isSelected = session.categoryIds.includes(cat.id);
                            return (
                              <label data-ev-id="ev_f0f7a2da32"
                              key={cat.id}
                              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">

                                        <input data-ev-id="ev_a0a50f81f3"
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSessionCategory(session.id, cat.id)}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />

                                        <span data-ev-id="ev_02a387e115" className={`px-2 py-0.5 rounded text-xs font-medium ${cat.color}`}>
                                          {cat.name}
                                        </span>
                                      </label>);

                          })}
                                </div>
                              </div>
                            </td>
                            <td data-ev-id="ev_9a3429f307" className="px-4 py-2 align-top">
                              <input data-ev-id="ev_b9036c3b95"
                      type="text"
                      list={`instructors-${session.id}`}
                      value={session.instructor}
                      onChange={(e) => updateSession(session.id, { instructor: e.target.value })}
                      placeholder="Name wählen/eingeben"
                      className="px-2 py-1 border border-border rounded bg-background w-full text-sm" />

                              <datalist data-ev-id="ev_5aa7cfb385" id={`instructors-${session.id}`}>
                                {instructorNames.map((name) =>
                        <option data-ev-id="ev_f2f0f51475" key={name} value={name} />
                        )}
                              </datalist>
                            </td>
                            <td data-ev-id="ev_260164a127" className="px-4 py-2 align-top">
                              <input data-ev-id="ev_25dbb6e6bc"
                      type="text"
                      value={session.notes}
                      onChange={(e) => updateSession(session.id, { notes: e.target.value })}
                      placeholder="Notizen"
                      className="px-2 py-1 border border-border rounded bg-background w-full text-sm" />

                            </td>
                            <td data-ev-id="ev_b89905fb3d" className="px-2 py-2 align-top">
                              {scenarioTemplates.length > 0 ?
                      <select data-ev-id="ev_39a795caad"
                      onChange={(e) => {
                        const tpl = scenarioTemplates.find((t) => t.id === e.target.value);
                        if (tpl) {
                          applyTemplateToSession(session.id, tpl);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                      className="px-2 py-1 border border-border rounded bg-background w-full text-sm">

                                  <option data-ev-id="ev_234f16d213" value="">Vorlage...</option>
                                  {scenarioTemplates.map((tpl) =>
                        <option data-ev-id="ev_0992d10bd5" key={tpl.id} value={tpl.id}>{tpl.name}</option>
                        )}
                                </select> :

                      <span data-ev-id="ev_2cd1c6129c" className="text-xs text-muted-foreground">-</span>
                      }
                            </td>
                            <td data-ev-id="ev_497016e029" className="px-2 py-2 align-top text-center">
                              <button data-ev-id="ev_b48889a91a"
                      onClick={() => deleteSession(session.id)}
                      className="p-1 hover:bg-red-100 text-red-500 rounded transition-colors"
                      title="Termin löschen">

                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                  )}
                      </tbody>
                    </table>
                  </div>
                </div>
          )}
            </div> :

        <div data-ev-id="ev_61f4fabbec" className="bg-card border border-border rounded-xl p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 data-ev-id="ev_c39b79efac" className="text-lg font-semibold mb-2">Noch keine Termine</h3>
              <p data-ev-id="ev_8a000d8bca" className="text-muted-foreground mb-4">
                Wähle einen Zeitraum und klicke auf "Termine generieren".
              </p>
              {scenarioTemplates.length === 0 &&
          <p data-ev-id="ev_c9c412904b" className="text-sm text-muted-foreground">
                  Tipp: Erstelle zuerst Vorlagen und Wiederholungsregeln im Tab "Vorlagen & Regeln".
                </p>
          }
            </div>
        }
        </div>
      }

      {/* Saved Plans Tab */}
      {activeTab === 'saved' &&
      <div data-ev-id="ev_7d7392feb9" className="bg-card border border-border rounded-xl p-6">
          <h3 data-ev-id="ev_acbd8f9cb9" className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Gespeicherte Übungspläne
          </h3>
          
          {plansLoading ?
        <div data-ev-id="ev_f91c8af034" className="flex justify-center py-8">
              <div data-ev-id="ev_2264ffa066" className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div> :
        dbPlans.length > 0 ?
        <div data-ev-id="ev_a71227b762" className="space-y-3">
              {dbPlans.map((plan) =>
          <div data-ev-id="ev_aa7a7fe558" key={plan.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                  <div data-ev-id="ev_ed268728d0" className="flex-1">
                    <div data-ev-id="ev_c971a6b844" className="font-medium text-lg">{plan.name}</div>
                    <div data-ev-id="ev_0c47ab09e5" className="text-sm text-muted-foreground flex gap-4">
                      <span data-ev-id="ev_b7bbaa35b9">{plan.year} - {plan.period}</span>
                      <span data-ev-id="ev_36b47caefa">{plan.sessions.length} Termine</span>
                      <span data-ev-id="ev_87c1b9b37f">Erstellt von {plan.creator_name}</span>
                      <span data-ev-id="ev_4228581ba9">{new Date(plan.created_at).toLocaleDateString('de-AT')}</span>
                    </div>
                  </div>
                  <button data-ev-id="ev_bee7ef22d6"
            onClick={() => loadPlan(plan)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2">

                    <FolderOpen className="w-4 h-4" />
                    Laden
                  </button>
                  <button data-ev-id="ev_b8bcfd498f"
            onClick={() => dbDeletePlan(plan.id)}
            className="p-2 hover:bg-red-100 text-red-600 rounded-lg"
            title="Plan löschen">

                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
          )}
            </div> :

        <div data-ev-id="ev_b63ef32440" className="text-center py-12 text-muted-foreground">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p data-ev-id="ev_e609c335f1">Noch keine Pläne gespeichert.</p>
              <p data-ev-id="ev_c9be516697" className="text-sm mt-2">Erstelle einen Plan und speichere ihn zum späteren Abrufen.</p>
            </div>
        }
        </div>
      }

      {/* Templates Tab */}
      {activeTab === 'templates' &&
      <div data-ev-id="ev_41a7c8a0d2" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scenario Templates */}
          <div data-ev-id="ev_f69223a9da" className="bg-card border border-border rounded-xl p-6">
            <h3 data-ev-id="ev_7607d00e0c" className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Szenarien-Vorlagen
            </h3>
            <p data-ev-id="ev_bb8a7a7533" className="text-sm text-muted-foreground mb-4">
              Häufige Übungen als Vorlage speichern für schnelles Einfügen.
            </p>

            {scenarioTemplates.length > 0 &&
          <div data-ev-id="ev_778b2636e0" className="space-y-2 mb-4">
                {scenarioTemplates.map((tpl) =>
            <div data-ev-id="ev_bcca8d85ba" key={tpl.id} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <div data-ev-id="ev_f405f72929" className="flex-1">
                      <div data-ev-id="ev_25e8035d39" className="font-medium">{tpl.name}</div>
                      <div data-ev-id="ev_293e7c25e9" className="flex flex-wrap gap-1 mt-1">
                        {tpl.categoryIds.map((catId) => {
                    const cat = getCategoryById(catId);
                    return cat ?
                    <span data-ev-id="ev_ba6b2d9d56" key={catId} className={`px-2 py-0.5 rounded text-xs ${cat.color}`}>
                              {cat.name}
                            </span> :
                    null;
                  })}
                      </div>
                      {tpl.defaultInstructor &&
                <div data-ev-id="ev_81a45b83ba" className="text-xs text-muted-foreground mt-1">
                          <Users className="w-3 h-3 inline mr-1" />
                          {tpl.defaultInstructor}
                        </div>
                }
                    </div>
                    <button data-ev-id="ev_e1f8a60e57"
              onClick={() => deleteScenarioTemplate(tpl.id)}
              className="p-1 hover:bg-red-100 text-red-600 rounded">

                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
            )}
              </div>
          }

            {/* Add Template Form */}
            <div data-ev-id="ev_9830fce269" className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <input data-ev-id="ev_e0749de41e"
            type="text"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            placeholder="Vorlagenname (z.B. Löschgruppenaufbau)"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background" />

              <div data-ev-id="ev_e5f40d1c42" className="flex flex-wrap gap-1">
                {categories.map((cat) =>
              <button data-ev-id="ev_51112ad00d"
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
              <select data-ev-id="ev_9256542d8a"
            value={newTemplateInstructor}
            onChange={(e) => setNewTemplateInstructor(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background">

                <option data-ev-id="ev_5c82d3903e" value="">Standard-Übungsleiter (optional)</option>
                {instructorNames.map((name) =>
              <option data-ev-id="ev_652ab4c28d" key={name} value={name}>{name}</option>
              )}
              </select>
              <button data-ev-id="ev_4d2c014512"
            onClick={addScenarioTemplate}
            disabled={!newTemplateName.trim()}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">

                <Plus className="w-4 h-4" />
                Vorlage speichern
              </button>
            </div>
          </div>

          {/* Recurrence Rules */}
          <div data-ev-id="ev_5a4014ab86" className="bg-card border border-border rounded-xl p-6">
            <h3 data-ev-id="ev_634e14ea02" className="text-lg font-semibold mb-4 flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Wiederholungsregeln
            </h3>
            <p data-ev-id="ev_920215a385" className="text-sm text-muted-foreground mb-4">
              Automatische Zuweisung von Vorlagen mit flexiblen Intervallen.
            </p>

            {recurrenceRules.length > 0 &&
          <div data-ev-id="ev_b1cb8c85c4" className="space-y-2 mb-4">
                {recurrenceRules.map((rule) => {
              const tpl = scenarioTemplates.find((t) => t.id === rule.scenarioTemplateId);
              return (
                <div data-ev-id="ev_674214a0f0" key={rule.id} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <div data-ev-id="ev_05747dda87" className="flex-1">
                        <span data-ev-id="ev_8154311a52" className="font-medium">{INTERVAL_LABELS[rule.intervalType] || rule.name}</span>
                        {rule.intervalType !== 'weekly' && rule.intervalType !== 'biweekly' &&
                    <span data-ev-id="ev_3a50d3664c" className="text-muted-foreground text-sm ml-1">({rule.weekOfPeriod}. Mi)</span>
                    }
                        <span data-ev-id="ev_9657241250" className="text-muted-foreground mx-2">→</span>
                        <span data-ev-id="ev_1736c6a682" className="text-primary font-medium">{tpl?.name || 'Unbekannt'}</span>
                      </div>
                      <button data-ev-id="ev_f7312a8c35"
                  onClick={() => deleteRecurrenceRule(rule.id)}
                  className="p-1 hover:bg-red-100 text-red-600 rounded">

                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>);

            })}
              </div>
          }

            {scenarioTemplates.length > 0 ?
          <div data-ev-id="ev_502fcaa1ce" className="space-y-3 p-4 bg-muted/30 rounded-lg">
                {/* Interval Type */}
                <div data-ev-id="ev_f71c7c44d1">
                  <label data-ev-id="ev_02a4d05e90" className="block text-sm font-medium mb-1">Intervall</label>
                  <select data-ev-id="ev_4096f16490"
              value={newRuleIntervalType}
              onChange={(e) => setNewRuleIntervalType(e.target.value as typeof newRuleIntervalType)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background">

                    <option data-ev-id="ev_6581fb07e8" value="weekly">Wöchentlich (jeden Mittwoch)</option>
                    <option data-ev-id="ev_07b7c7351e" value="biweekly">Alle 2 Wochen</option>
                    <option data-ev-id="ev_9da0bb61e7" value="monthly">Monatlich</option>
                    <option data-ev-id="ev_484496de3a" value="bimonthly">Alle 2 Monate</option>
                    <option data-ev-id="ev_e498d4a8e1" value="quarterly">Quartalsweise</option>
                    <option data-ev-id="ev_c61869ba1a" value="semiannually">Halbjährlich</option>
                    <option data-ev-id="ev_3d8e556389" value="yearly">Jährlich</option>
                  </select>
                </div>

                {/* Week of Period - only show for non-weekly intervals */}
                {newRuleIntervalType !== 'weekly' && newRuleIntervalType !== 'biweekly' &&
            <div data-ev-id="ev_127bcdd2d7">
                    <label data-ev-id="ev_637a3564d3" className="block text-sm font-medium mb-1">Welcher Mittwoch im Zeitraum?</label>
                    <select data-ev-id="ev_3d55557276"
              value={newRuleWeekOfPeriod}
              onChange={(e) => setNewRuleWeekOfPeriod(parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background">

                      <option data-ev-id="ev_b877a1d14f" value={1}>1. Mittwoch</option>
                      <option data-ev-id="ev_05a119ca45" value={2}>2. Mittwoch</option>
                      <option data-ev-id="ev_9a58a35fd9" value={3}>3. Mittwoch</option>
                      <option data-ev-id="ev_fe6ad3285b" value={4}>4. Mittwoch</option>
                      <option data-ev-id="ev_cb2d0340c2" value={5}>5. Mittwoch (falls vorhanden)</option>
                    </select>
                  </div>
            }

                {/* Template Selection */}
                <div data-ev-id="ev_872a070f2c">
                  <label data-ev-id="ev_05ea8b553e" className="block text-sm font-medium mb-1">Vorlage zuweisen</label>
                  <select data-ev-id="ev_1e4ca0a4f5"
              value={newRuleTemplateId}
              onChange={(e) => setNewRuleTemplateId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background">

                    <option data-ev-id="ev_e229080d6a" value="">Vorlage wählen...</option>
                    {scenarioTemplates.map((tpl) =>
                <option data-ev-id="ev_96513adf52" key={tpl.id} value={tpl.id}>{tpl.name}</option>
                )}
                  </select>
                </div>

                <button data-ev-id="ev_27944bb917"
            onClick={addRecurrenceRule}
            disabled={!newRuleTemplateId}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">

                  <Plus className="w-4 h-4" />
                  Regel hinzufügen
                </button>
              </div> :

          <div data-ev-id="ev_c174f787d7" className="p-4 bg-muted/30 rounded-lg text-center text-muted-foreground">
                Erstelle zuerst eine Szenarien-Vorlage.
              </div>
          }
          </div>
        </div>
      }

      {/* Categories Tab */}
      {activeTab === 'settings' &&
      <div data-ev-id="ev_3cf71e02b2" className="bg-card border border-border rounded-xl p-6">
          <h3 data-ev-id="ev_3ebd6c2110" className="text-lg font-semibold mb-4">Kategorien verwalten</h3>
          <p data-ev-id="ev_b4d2fb9e8e" className="text-sm text-muted-foreground mb-4">
            Kategorien für Übungstypen definieren. Jede Übung kann mehrere Kategorien haben.
          </p>

          {/* Existing Categories */}
          <div data-ev-id="ev_c0869daf68" className="space-y-2 mb-6">
            {dbCategories.map((cat) =>
          <div data-ev-id="ev_89ed1573c3" key={cat.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <span data-ev-id="ev_e868c5cff7" className={`px-3 py-1 rounded-full text-sm font-medium border ${hexToTailwind(cat.color)}`}>
                  {cat.name}
                </span>
                <div data-ev-id="ev_d02a8d0090" className="flex-1" />
                <div data-ev-id="ev_30be3e87f7" className="flex gap-1">
                  {HEX_COLORS.map((color) =>
              <button data-ev-id="ev_65b8071fc3"
              key={color}
              onClick={() => updateCategory(cat.id, color)}
              className={`w-6 h-6 rounded-full border-2 ${
              cat.color === color ? 'ring-2 ring-primary ring-offset-2' : ''}`
              }
              style={{ backgroundColor: color }} />

              )}
                </div>
                <button data-ev-id="ev_5c4ba17367"
            onClick={() => deleteCategory(cat.id)}
            className="p-1 hover:bg-red-100 text-red-600 rounded ml-2">

                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
          )}
          </div>

          {/* Add Category */}
          <div data-ev-id="ev_da97e22f21" className="flex gap-3 items-end p-4 bg-muted/30 rounded-lg">
            <div data-ev-id="ev_8e251200fa" className="flex-1">
              <label data-ev-id="ev_317df9acaa" className="block text-sm font-medium mb-1">Neue Kategorie</label>
              <input data-ev-id="ev_6cd2aeaf30"
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="z.B. Wasserdienst"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background" />

            </div>
            <div data-ev-id="ev_8dd5b302fc">
              <label data-ev-id="ev_6f2c0e3676" className="block text-sm font-medium mb-1">Farbe</label>
              <div data-ev-id="ev_a582f973a1" className="flex gap-1">
                {HEX_COLORS.slice(0, 5).map((color) =>
              <button data-ev-id="ev_06f0e7a64a"
              key={color}
              onClick={() => setNewCategoryColor(color)}
              className={`w-8 h-8 rounded-full border-2 ${
              newCategoryColor === color ? 'ring-2 ring-primary ring-offset-2' : ''}`
              }
              style={{ backgroundColor: color }} />

              )}
              </div>
            </div>
            <button data-ev-id="ev_207f359355"
          onClick={addCategory}
          disabled={!newCategoryName.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">

              <Plus className="w-4 h-4" />
              Hinzufügen
            </button>
          </div>
        </div>
      }

      {/* Instructors Tab */}
      {activeTab === 'instructors' &&
      <div data-ev-id="ev_e867390327" className="bg-card border border-border rounded-xl p-6">
          <h3 data-ev-id="ev_f7d0401a0c" className="text-lg font-semibold mb-4">Übungsleiter verwalten</h3>
          <p data-ev-id="ev_82d3f0dd86" className="text-sm text-muted-foreground mb-4">
            Wähle aus den App-Benutzern aus, wer als Übungsleiter zur Verfügung steht.
          </p>

          {/* All Users with Checkbox */}
          <div data-ev-id="ev_74a6522bb7" className="space-y-2">
            {allUsers.map((user) =>
          <div data-ev-id="ev_5711f81571"
          key={user.id}
          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
          user.is_instructor ? 'bg-green-50 border border-green-200' : 'bg-muted/50 hover:bg-muted'}`
          }
          onClick={() => toggleInstructor(user.id, !user.is_instructor)}>

                <div data-ev-id="ev_62533ae7ab" className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
            user.is_instructor ? 'bg-green-600 border-green-600' : 'border-gray-300'}`
            }>
                  {user.is_instructor && <Check className="w-3 h-3 text-white" />}
                </div>
                <Users className="w-5 h-5 text-muted-foreground" />
                <span data-ev-id="ev_0789130138" className="flex-1 font-medium">{user.full_name}</span>
                {user.is_instructor &&
            <span data-ev-id="ev_d1e536fbb1" className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    Übungsleiter
                  </span>
            }
              </div>
          )}
            {allUsers.length === 0 &&
          <p data-ev-id="ev_56922d17fc" className="text-muted-foreground text-center py-4">Keine Benutzer gefunden.</p>
          }
          </div>

          <div data-ev-id="ev_f961acf566" className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <strong data-ev-id="ev_7020a4bbff">{dbInstructors.length}</strong> von {allUsers.length} Benutzern sind als Übungsleiter markiert.
          </div>
        </div>
      }

      {/* PDF Preview */}
      {sessions.length > 0 && activeTab === 'plan' &&
      <div data-ev-id="ev_3784ad4190" className="bg-card border border-border rounded-xl p-6">
          <h3 data-ev-id="ev_d48bea41ff" className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            PDF Vorschau (A3 Querformat)
          </h3>

          <div data-ev-id="ev_e92066105c" className="border-2 border-dashed border-border rounded-lg p-4 bg-white overflow-auto">
            <div data-ev-id="ev_a7f7a3e6c6" className="min-w-[900px]" style={{ aspectRatio: '1.414/1' }}>
              {/* Header with Logo */}
              <div data-ev-id="ev_e8fb3659a5" className="flex items-start justify-between mb-4 pb-4 border-b-4 border-[#C8102E]">
                <div data-ev-id="ev_e24f9fb4a9">
                  <h2 data-ev-id="ev_49dfd3fc5a" className="text-2xl font-bold text-[#C8102E]">ÜBUNGSPLAN {selectedYear}</h2>
                  <p data-ev-id="ev_9f701e00b6" className="text-lg font-medium text-gray-600">
                    {selectedPeriod.startsWith('Q') ? `${selectedPeriod.replace('Q', '')}. Quartal` :
                  selectedPeriod === 'H1' ? 'Jänner - Juni' : 'Juli - Dezember'}
                  </p>
                </div>
                <div data-ev-id="ev_f34e264433" className="text-right flex-shrink-0">
                  <img data-ev-id="ev_37ea19c2e6" src={ffmLogo} alt="FF Marchtrenk Logo" className="h-20 w-auto ml-auto" />
                </div>
              </div>

              {/* Mini Table Preview */}
              {sessionsByMonth.slice(0, 3).map(({ month, sessions: monthSessions }) =>
            <div data-ev-id="ev_a65944ab8a" key={month} className="mb-3">
                  <div data-ev-id="ev_baf3499184" className="bg-[#C8102E] text-white px-2 py-1 text-xs font-bold rounded-t">
                    {month}
                  </div>
                  <table data-ev-id="ev_365036f164" className="w-full text-[10px] border-collapse">
                    <tbody data-ev-id="ev_9478bf45b5">
                      {monthSessions.slice(0, 2).map((session, idx) =>
                  <tr data-ev-id="ev_5f894b6b8b" key={session.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td data-ev-id="ev_6ebfeeb7c0" className="border border-gray-200 px-2 py-2 w-[60px]" style={{ height: '36px' }}>
                            {session.date.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })}
                          </td>
                          <td data-ev-id="ev_66bd05d01a" className="border border-gray-200 px-2 py-2 w-[40px]">{session.time}</td>
                          <td data-ev-id="ev_11d8a53d86" className="border border-gray-200 px-2 py-2">{session.topic || '-'}</td>
                          <td data-ev-id="ev_0ecaf32930" className="border border-gray-200 px-2 py-2 w-[120px]">
                            <div data-ev-id="ev_56ec5cc9b8" className="flex flex-col gap-0.5">
                              {session.categoryIds.map((catId) => {
                          const cat = getCategoryById(catId);
                          return cat ?
                          <span data-ev-id="ev_a70cf4fd26" key={catId} className={`px-1 rounded text-[8px] ${cat.color}`}>
                                    {cat.name}
                                  </span> :
                          null;
                        })}
                            </div>
                          </td>
                          <td data-ev-id="ev_eb59d07417" className="border border-gray-200 px-2 py-2 w-[80px]">{session.instructor || '-'}</td>
                          <td data-ev-id="ev_1014692e81" className="border border-gray-200 px-2 py-2 w-[80px]">{session.notes || '-'}</td>
                        </tr>
                  )}
                    </tbody>
                  </table>
                </div>
            )}
              
              <p data-ev-id="ev_be77a0cffd" className="text-center text-gray-400 text-xs">
                ... Vorschau gekürzt ({sessions.length} Termine gesamt)
              </p>

              {/* Footer */}
              <div data-ev-id="ev_c7c3b80389" className="mt-4 pt-2 border-t border-gray-200 flex justify-between text-[10px] text-gray-500">
                <span data-ev-id="ev_8a101b5b45">Freiwillige Feuerwehr Marchtrenk · Linzerstraße 43 · 4614 Marchtrenk</span>
                <span data-ev-id="ev_b98ab8880e">Stand: {new Date().toLocaleDateString('de-AT')}</span>
              </div>
            </div>
          </div>
          
          <p data-ev-id="ev_6e7f80e8a6" className="text-xs text-muted-foreground mt-2">
            * Schriftgröße wird im PDF automatisch angepasst, damit alle Termine auf eine A3-Seite passen.
          </p>
        </div>
      }
    </div>);

}