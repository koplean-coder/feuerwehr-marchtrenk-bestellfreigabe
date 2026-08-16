import { useState } from 'react';
import {
  Plus,
  Circle,
  CheckCircle2,
  Star,
  Sun,
  Calendar,
  User,
  UserPlus,
  UserCheck,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  GripVertical,
  Menu,
  AlertTriangle,
  Clock,
  Inbox,
  Edit3 } from
'lucide-react';
import type { TodoTaskWithSteps } from '@/hooks/useTodoTasks';
import type { SmartListType } from '@/hooks/useTodoLists';

interface TodoTaskListProps {
  tasks: TodoTaskWithSteps[];
  listName: string;
  listColor?: string;
  smartListType?: SmartListType | null;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onCreateTask: (title: string) => void;
  onToggleComplete: (taskId: string) => void;
  onToggleImportant: (taskId: string) => void;
  onAddToMyDay: (taskId: string) => void;
  showCompleted?: boolean;
  onToggleShowCompleted?: () => void;
  onToggleMobileSidebar?: () => void;
}

const SMART_LIST_HEADERS: Record<SmartListType, {title: string;subtitle?: string;bgClass: string;}> = {
  my_day: { title: 'Mein Tag', subtitle: new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }), bgClass: 'bg-gradient-to-br from-amber-400 to-orange-500' },
  important: { title: 'Wichtig', bgClass: 'bg-gradient-to-br from-rose-400 to-pink-500' },
  planned: { title: 'Geplant', bgClass: 'bg-gradient-to-br from-emerald-400 to-teal-500' },
  assigned_to_me: { title: 'Mir zugewiesen', bgClass: 'bg-gradient-to-br from-blue-400 to-indigo-500' },
  all: { title: 'Aufgaben', bgClass: 'bg-gradient-to-br from-indigo-400 to-purple-500' }
};

export function TodoTaskList({
  tasks,
  listName,
  listColor = '#3b82f6',
  smartListType,
  selectedTaskId,
  onSelectTask,
  onCreateTask,
  onToggleComplete,
  onToggleImportant,
  onAddToMyDay,
  showCompleted = true,
  onToggleShowCompleted,
  onToggleMobileSidebar
}: TodoTaskListProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [showCompletedSection, setShowCompletedSection] = useState(true);

  const incompleteTasks = tasks.filter((t) => !t.is_completed);
  const completedTasks = tasks.filter((t) => t.is_completed);

  // Categorize tasks for "Mein Tag"
  const today = new Date().toISOString().split('T')[0];

  const categorizeMyDayTasks = (taskList: TodoTaskWithSteps[]) => {
    const overdue: TodoTaskWithSteps[] = [];
    const dueToday: TodoTaskWithSteps[] = [];
    const manuallyAdded: TodoTaskWithSteps[] = [];
    const assignedNoDate: TodoTaskWithSteps[] = [];
    const processed = new Set<string>();

    taskList.forEach((task) => {
      // Überfällig (due_date < heute)
      if (task.due_date && task.due_date < today && !processed.has(task.id)) {
        overdue.push(task);
        processed.add(task.id);
        return;
      }
      // Heute fällig (due_date = heute)
      if (task.due_date === today && !processed.has(task.id)) {
        dueToday.push(task);
        processed.add(task.id);
        return;
      }
      // Manuell hinzugefügt (is_in_my_day = true, nicht schon kategorisiert)
      if (task.is_in_my_day && !processed.has(task.id)) {
        manuallyAdded.push(task);
        processed.add(task.id);
        return;
      }
      // Zugewiesen ohne Datum
      if (task.assigned_to && !task.due_date && !processed.has(task.id)) {
        assignedNoDate.push(task);
        processed.add(task.id);
      }
    });

    return { overdue, dueToday, manuallyAdded, assignedNoDate };
  };

  const myDayCategories = smartListType === 'my_day' ? categorizeMyDayTasks(incompleteTasks) : null;

  const handleCreateTask = () => {
    if (newTaskTitle.trim()) {
      onCreateTask(newTaskTitle.trim());
      setNewTaskTitle('');
    }
  };

  const headerInfo = smartListType ? SMART_LIST_HEADERS[smartListType] : null;

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return { text: 'Heute', color: 'text-blue-600 dark:text-blue-400' };
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return { text: 'Morgen', color: 'text-blue-600 dark:text-blue-400' };
    } else if (date < today) {
      return { text: date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }), color: 'text-red-600 dark:text-red-400' };
    }
    return { text: date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }), color: 'text-slate-500 dark:text-slate-300' };
  };

  const renderTask = (task: TodoTaskWithSteps) => {
    const dueInfo = formatDueDate(task.due_date);
    const stepsTotal = task.steps.length;
    const stepsCompleted = task.steps.filter((s) => s.is_completed).length;

    return (
      <div data-ev-id="ev_5d97c670f1"
      key={task.id}
      onClick={() => onSelectTask(task.id)}
      className={`group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
      selectedTaskId === task.id ?
      'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500' :
      'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-l-2 border-transparent'}`
      }>

        {/* Drag Handle */}
        <div data-ev-id="ev_8a419c3e05" className="opacity-0 group-hover:opacity-100 cursor-grab mt-0.5">
          <GripVertical size={16} className="text-slate-400" />
        </div>

        {/* Checkbox */}
        <button data-ev-id="ev_0b3aedbc91"
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(task.id);
        }}
        className="mt-0.5 flex-shrink-0">

          {task.is_completed ?
          <CheckCircle2 size={22} className="text-blue-500" /> :

          <Circle size={22} className="text-slate-400 hover:text-blue-500" />
          }
        </button>

        {/* Content */}
        <div data-ev-id="ev_1cef8a9db8" className="flex-1 min-w-0">
          <p data-ev-id="ev_b928d4c427" className={`font-medium ${
          task.is_completed ?
          'text-slate-400 line-through' :
          'text-slate-900 dark:text-white'}`
          }>
            {task.title}
          </p>

          {/* Meta info - Row 1 */}
          <div data-ev-id="ev_c27a983cf5" className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm">
            {/* Steps progress */}
            {stepsTotal > 0 &&
            <span data-ev-id="ev_e3c424c894" className="text-slate-500 dark:text-slate-400">
                {stepsCompleted}/{stepsTotal} Schritte
              </span>
            }

            {/* Due date */}
            {dueInfo &&
            <span data-ev-id="ev_4b568b2cb7" className={`flex items-center gap-1 ${dueInfo.color}`}>
                <Calendar size={14} />
                {dueInfo.text}
                {/* Badge if due date was changed by someone else */}
                {task.due_date_changed_by && task.due_date_changed_by !== task.created_by &&
              <span
                data-ev-id="ev_ad711002cd"
                className="ml-1 px-1.5 py-0.5 text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded cursor-help relative group">

                    <Edit3 size={10} className="inline mr-0.5" />
                    geändert
                    {/* Tooltip on hover - shows full history */}
                    <span data-ev-id="ev_dd72faba7d" className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-2 text-xs bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 min-w-[200px] max-w-[280px]">
                      <span data-ev-id="ev_ebb2f9e6da" className="block text-[10px] uppercase text-slate-400 dark:text-slate-500 mb-1">Änderungsverlauf</span>
                      {/* Show history entries */}
                      {((task as {change_history?: {field: string;old_value: string | null;new_value: string | null;changer_name: string;changed_at: string;}[];}).change_history ?? []).
                  filter((h) => h.field === 'due_date').
                  slice(-5) // Show last 5 entries
                  .reverse().
                  map((entry, idx) =>
                  <span data-ev-id="ev_fac7a1db10" key={idx} className="block py-1 border-b border-slate-700 dark:border-slate-300 last:border-0">
                            <span data-ev-id="ev_a48a25de8e" className="font-medium">{entry.changer_name}</span>
                            <span data-ev-id="ev_ef60b49292" className="block text-[10px] text-slate-300 dark:text-slate-500">
                              {entry.old_value ? new Date(entry.old_value).toLocaleDateString('de-DE') : 'Kein Datum'}
                              {' → '}
                              {entry.new_value ? new Date(entry.new_value).toLocaleDateString('de-DE') : 'Entfernt'}
                            </span>
                            <span data-ev-id="ev_24de5a879d" className="block text-[9px] text-slate-400 dark:text-slate-500">
                              {new Date(entry.changed_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </span>
                  )
                  }
                      {/* Fallback if no history yet */}
                      {(!(task as {change_history?: unknown[];}).change_history || ((task as {change_history?: {field: string;}[];}).change_history ?? []).filter((h) => h.field === 'due_date').length === 0) &&
                  <span data-ev-id="ev_2618f23f4b" className="block">
                          {task.due_date_changer?.full_name || 'Unbekannt'}
                          {task.due_date_changed_at &&
                    <span data-ev-id="ev_18d2443127" className="block text-[10px] text-slate-300 dark:text-slate-500">
                              {new Date(task.due_date_changed_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                    }
                        </span>
                  }
                    </span>
                  </span>
              }
              </span>
            }

            {/* My Day */}
            {task.is_in_my_day && smartListType !== 'my_day' &&
            <span data-ev-id="ev_0daff1490a" className="flex items-center gap-1 text-amber-500">
                <Sun size={14} />
                Mein Tag
              </span>
            }
          </div>
          
          {/* Meta info - Row 2: Creator & Assignee */}
          <div data-ev-id="ev_cdad4bb8d0" className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs">
            {/* Creator */}
            {task.creator &&
            <span data-ev-id="ev_dc7b28154a" className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                <UserPlus size={12} />
                <span data-ev-id="ev_5781f806f0" className="text-slate-500 dark:text-slate-400">{task.creator.full_name ?? 'Ersteller'}</span>
              </span>
            }

            {/* Assignee (only show if different from creator) */}
            {task.assignee && task.assignee.id !== task.creator?.id &&
            <span data-ev-id="ev_a3feafae8f" className="flex items-center gap-1 text-sky-500 dark:text-sky-400">
                <UserCheck size={12} />
                <span data-ev-id="ev_dc81a1807f">{task.assignee.full_name ?? 'Zugewiesen'}</span>
              </span>
            }
            
            {/* List name (in smart lists) */}
            {smartListType &&
            <span data-ev-id="ev_0ef76247bf" className="text-slate-400 dark:text-slate-500">
                📋 {listName}
              </span>
            }
          </div>
        </div>

        {/* Star */}
        <button data-ev-id="ev_2c8f64447d"
        onClick={(e) => {
          e.stopPropagation();
          onToggleImportant(task.id);
        }}
        className="flex-shrink-0 mt-0.5">

          <Star
            size={20}
            className={task.is_important ?
            'text-rose-500 fill-rose-500' :
            'text-slate-300 hover:text-rose-400'
            } />

        </button>
      </div>);

  };

  return (
    <div data-ev-id="ev_e75ae11a32" className="flex-1 flex flex-col bg-white dark:bg-slate-700 min-w-0">
      {/* Header */}
      {headerInfo ?
      <div data-ev-id="ev_db6856c4b7" className={`${headerInfo.bgClass} px-4 sm:px-6 py-6 sm:py-8 text-white`}>
          <div data-ev-id="ev_ca54ba1a38" className="flex items-center gap-3">
            {onToggleMobileSidebar &&
          <button data-ev-id="ev_9cd935f49f"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-white/20 transition-colors">

                <Menu size={24} />
              </button>
          }
            <div data-ev-id="ev_e5864490ab">
              <h1 data-ev-id="ev_d2b0884304" className="text-xl sm:text-2xl font-bold">{headerInfo.title}</h1>
              {headerInfo.subtitle &&
            <p data-ev-id="ev_9fefd4daa8" className="text-white/80 mt-1 text-sm sm:text-base">{headerInfo.subtitle}</p>
            }
            </div>
          </div>
        </div> :

      <div data-ev-id="ev_cde904655b" className="px-4 sm:px-6 py-4 sm:py-6 border-b border-slate-200 dark:border-slate-600">
          <div data-ev-id="ev_56fb8f3bf9" className="flex items-center gap-3">
            {onToggleMobileSidebar &&
          <button data-ev-id="ev_665a6f68ac"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">

                <Menu size={24} className="text-slate-600 dark:text-slate-300" />
              </button>
          }
            <h1 data-ev-id="ev_03e9a30157" className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white" style={{ color: listColor }}>
              {listName}
            </h1>
          </div>
        </div>
      }

      {/* Add Task */}
      <div data-ev-id="ev_565b743669" className="px-4 py-3 border-b border-slate-200 dark:border-slate-600">
        {isAddingTask ?
        <div data-ev-id="ev_48d9703602" className="flex items-center gap-3">
            <Circle size={22} className="text-slate-400 flex-shrink-0" />
            <input data-ev-id="ev_65bf328d28"
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreateTask();
            if (e.key === 'Escape') {
              setIsAddingTask(false);
              setNewTaskTitle('');
            }
          }}
          onBlur={() => {
            if (!newTaskTitle.trim()) {
              setIsAddingTask(false);
            }
          }}
          placeholder="Aufgabe hinzufügen..."
          className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-400"
          autoFocus />

            <button data-ev-id="ev_39a7f84eaa"
          onClick={handleCreateTask}
          disabled={!newTaskTitle.trim()}
          className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">

              Hinzufügen
            </button>
          </div> :

        <button data-ev-id="ev_2a7e17fa83"
        onClick={() => setIsAddingTask(true)}
        className="flex items-center gap-3 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 w-full">

            <Plus size={22} />
            <span data-ev-id="ev_7e0ef3e758" className="font-medium">Aufgabe hinzufügen</span>
          </button>
        }
      </div>

      {/* Task List */}
      <div data-ev-id="ev_a57f87e4eb" className="flex-1 overflow-y-auto">
        {/* Mein Tag - Kategorisierte Ansicht */}
        {smartListType === 'my_day' && myDayCategories ?
        <>
            {/* Überfällig */}
            {myDayCategories.overdue.length > 0 &&
          <div data-ev-id="ev_ebc04a3413" className="mb-2">
                <div data-ev-id="ev_dc3e64029e" className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800">
                  <AlertTriangle size={16} className="text-red-500" />
                  <span data-ev-id="ev_545bb2db16" className="text-sm font-medium text-red-700 dark:text-red-400">Überfällig</span>
                  <span data-ev-id="ev_6f4230fd32" className="text-xs text-red-500">({myDayCategories.overdue.length})</span>
                </div>
                {myDayCategories.overdue.map(renderTask)}
              </div>
          }

            {/* Heute fällig */}
            {myDayCategories.dueToday.length > 0 &&
          <div data-ev-id="ev_ff6db35285" className="mb-2">
                <div data-ev-id="ev_b46019a03d" className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
                  <Calendar size={16} className="text-blue-500" />
                  <span data-ev-id="ev_a683fe8a0f" className="text-sm font-medium text-blue-700 dark:text-blue-400">Heute fällig</span>
                  <span data-ev-id="ev_ec8fdafb3f" className="text-xs text-blue-500">({myDayCategories.dueToday.length})</span>
                </div>
                {myDayCategories.dueToday.map(renderTask)}
              </div>
          }

            {/* Manuell hinzugefügt */}
            {myDayCategories.manuallyAdded.length > 0 &&
          <div data-ev-id="ev_13fdfdfa1e" className="mb-2">
                <div data-ev-id="ev_ee33955d63" className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800">
                  <Sun size={16} className="text-amber-500" />
                  <span data-ev-id="ev_91f81f6382" className="text-sm font-medium text-amber-700 dark:text-amber-400">Manuell hinzugefügt</span>
                  <span data-ev-id="ev_517387bb25" className="text-xs text-amber-500">({myDayCategories.manuallyAdded.length})</span>
                </div>
                {myDayCategories.manuallyAdded.map(renderTask)}
              </div>
          }

            {/* Zugewiesen ohne Datum */}
            {myDayCategories.assignedNoDate.length > 0 &&
          <div data-ev-id="ev_9134ad1920" className="mb-2">
                <div data-ev-id="ev_37cf3cc6ea" className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-600">
                  <Inbox size={16} className="text-slate-500" />
                  <span data-ev-id="ev_c8e3b4d8d4" className="text-sm font-medium text-slate-600 dark:text-slate-300">Zugewiesen (ohne Datum)</span>
                  <span data-ev-id="ev_1fc8fe942e" className="text-xs text-slate-500">({myDayCategories.assignedNoDate.length})</span>
                </div>
                {myDayCategories.assignedNoDate.map(renderTask)}
              </div>
          }
          </> : (

        /* Standard-Ansicht für andere Listen */
        incompleteTasks.map(renderTask))
        }

        {/* Completed Tasks */}
        {showCompleted && completedTasks.length > 0 &&
        <div data-ev-id="ev_d8b2d4dc1c" className="mt-4">
            <button data-ev-id="ev_6d5687c392"
          onClick={() => setShowCompletedSection(!showCompletedSection)}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 w-full">

              {showCompletedSection ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              <span data-ev-id="ev_504d6540db" className="font-medium">Erledigt</span>
              <span data-ev-id="ev_25fccbfabe" className="text-sm">({completedTasks.length})</span>
            </button>
            {showCompletedSection && completedTasks.map(renderTask)}
          </div>
        }

        {/* Empty State */}
        {tasks.length === 0 &&
        <div data-ev-id="ev_ea3a96b179" className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div data-ev-id="ev_1ac393d310" className="w-24 h-24 mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              {smartListType === 'my_day' && <Sun size={40} className="text-amber-400" />}
              {smartListType === 'important' && <Star size={40} className="text-rose-400" />}
              {smartListType === 'planned' && <Calendar size={40} className="text-emerald-400" />}
              {smartListType === 'assigned_to_me' && <User size={40} className="text-blue-400" />}
              {!smartListType && <CheckCircle2 size={40} className="text-slate-300" />}
            </div>
            <p data-ev-id="ev_499ea03071" className="text-lg font-medium">Keine Aufgaben</p>
            <p data-ev-id="ev_4c01bac932" className="text-sm mt-1">
              {smartListType === 'my_day' && 'Füge Aufgaben zu "Mein Tag" hinzu'}
              {smartListType === 'important' && 'Markiere Aufgaben als wichtig'}
              {smartListType === 'planned' && 'Plane Aufgaben mit Fälligkeitsdatum'}
              {smartListType === 'assigned_to_me' && 'Keine Aufgaben zugewiesen'}
              {!smartListType && 'Erstelle deine erste Aufgabe'}
            </p>
          </div>
        }
      </div>
    </div>);

}