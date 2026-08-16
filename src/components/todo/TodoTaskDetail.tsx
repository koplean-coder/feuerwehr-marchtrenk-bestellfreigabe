import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Circle,
  CheckCircle2,
  Star,
  Sun,
  Calendar,
  Bell,
  Repeat,
  User,
  Users,
  UserPlus,
  Search,
  Paperclip,
  Plus,
  Trash2,
  ChevronRight,
  Clock,
  MessageCircle,
  Send } from
'lucide-react';
import type { TodoTaskWithSteps, TodoTaskCommentWithUser } from '@/hooks/useTodoTasks';
import type { Profile } from '@/hooks/useProfiles';

interface TodoTaskDetailProps {
  task: TodoTaskWithSteps;
  profiles?: Profile[];
  assignableProfiles?: Profile[]; // Filtered profiles for assignment (only list/group members)
  currentUserId?: string;
  isListOwner?: boolean;
  onClose: () => void;
  onUpdateTask: (updates: Record<string, unknown>) => void;
  onDeleteTask: () => void;
  onToggleComplete: () => void;
  onToggleImportant: () => void;
  onAddToMyDay: () => void;
  onRemoveFromMyDay: () => void;
  onCreateStep: (title: string) => void;
  onToggleStepComplete: (stepId: string) => void;
  onDeleteStep: (stepId: string) => void;
  onUpdateStep: (stepId: string, title: string) => void;
  onAssign: (userId: string | null) => void;
  onSetDueDate: (date: string | null, time?: string | null) => void;
  onSetReminder: (dateTime: string | null) => void;
  onShareTask?: (userId: string, permission: 'view' | 'edit') => void;
  onUnshareTask?: (userId: string) => void;
  onUpdateTaskSharePermission?: (userId: string, permission: 'view' | 'edit') => void;
  // Comment functions
  onFetchComments?: (taskId: string) => Promise<TodoTaskCommentWithUser[]>;
  onAddComment?: (taskId: string, content: string) => Promise<boolean>;
  onMarkCommentsAsRead?: (taskId: string) => Promise<boolean>;
}

export function TodoTaskDetail({
  task,
  profiles = [],
  assignableProfiles,
  currentUserId,
  isListOwner = false,
  onClose,
  onUpdateTask,
  onDeleteTask,
  onToggleComplete,
  onToggleImportant,
  onAddToMyDay,
  onRemoveFromMyDay,
  onCreateStep,
  onToggleStepComplete,
  onDeleteStep,
  onUpdateStep,
  onAssign,
  onSetDueDate,
  onSetReminder,
  onShareTask,
  onUnshareTask,
  onUpdateTaskSharePermission,
  onFetchComments,
  onAddComment,
  onMarkCommentsAsRead
}: TodoTaskDetailProps) {
  // Use assignableProfiles for assignment dropdown, fallback to all profiles
  const profilesForAssignment = assignableProfiles ?? profiles;
  // Permission: Can edit if user is task creator, list owner, OR assigned to the task
  const canEditTask = currentUserId && (
  task.created_by === currentUserId ||
  isListOwner ||
  task.assigned_to === currentUserId);

  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? '');
  const [newStepTitle, setNewStepTitle] = useState('');
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStepTitle, setEditingStepTitle] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showAssignPicker, setShowAssignPicker] = useState(false);
  const [customReminderValue, setCustomReminderValue] = useState('');
  const [customDueDateValue, setCustomDueDateValue] = useState('');
  const [showRecurrencePicker, setShowRecurrencePicker] = useState(false);
  const [customDaysInterval, setCustomDaysInterval] = useState(2);
  const [showTaskShareModal, setShowTaskShareModal] = useState(false);
  const [shareSearchQuery, setShareSearchQuery] = useState('');
  const [selectedSharePermission, setSelectedSharePermission] = useState<'view' | 'edit'>('edit');

  // Comments state
  const [comments, setComments] = useState<TodoTaskCommentWithUser[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    setTitle(task.title);
    setNotes(task.notes ?? '');
  }, [task.id, task.title, task.notes]);

  // Fetch comments when section is opened
  const loadComments = useCallback(async () => {
    if (!onFetchComments) return;
    setLoadingComments(true);
    try {
      const fetchedComments = await onFetchComments(task.id);
      setComments(fetchedComments);
      // Mark as read
      if (onMarkCommentsAsRead) {
        await onMarkCommentsAsRead(task.id);
      }
    } catch (e) {
      console.error('Error loading comments:', e);
    } finally {
      setLoadingComments(false);
    }
  }, [task.id, onFetchComments, onMarkCommentsAsRead]);

  useEffect(() => {
    if (showComments) {
      loadComments();
    }
  }, [showComments, loadComments]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !onAddComment) return;
    const success = await onAddComment(task.id, newComment);
    if (success) {
      setNewComment('');
      await loadComments();
    }
  };

  const handleTitleBlur = () => {
    if (title.trim() && title !== task.title) {
      onUpdateTask({ title: title.trim() });
    }
  };

  const handleNotesBlur = () => {
    if (notes !== (task.notes ?? '')) {
      onUpdateTask({
        notes: notes || null,
        notes_updated_by: currentUserId ?? null,
        notes_updated_at: new Date().toISOString()
      });
    }
  };

  const handleCreateStep = () => {
    if (newStepTitle.trim()) {
      onCreateStep(newStepTitle.trim());
      setNewStepTitle('');
    }
  };

  const handleUpdateStep = (stepId: string) => {
    if (editingStepTitle.trim()) {
      onUpdateStep(stepId, editingStepTitle.trim());
    }
    setEditingStepId(null);
    setEditingStepTitle('');
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('de-DE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const formatDateWithTime = (date: string | null, time: string | null) => {
    if (!date) return null;
    const dateStr = new Date(date).toLocaleDateString('de-DE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
    // Check if time exists and is a valid string with content
    if (time && typeof time === 'string' && time.trim().length > 0) {
      // Format: "HH:MM" or "HH:MM:SS" - nur Stunden:Minuten anzeigen
      const timeParts = time.split(':');
      if (timeParts.length >= 2) {
        const formattedTime = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
        return `${dateStr}, ${formattedTime}`;
      }
    }
    return dateStr;
  };

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) return null;
    return new Date(dateTime).toLocaleString('de-DE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const today = new Date().toISOString().split('T')[0];

  const getRecurrenceLabel = (type: string | null, interval: number | null) => {
    if (!type) return null;
    const intervalNum = interval ?? 1;
    switch (type) {
      case 'daily':return intervalNum === 1 ? 'Täglich' : `Alle ${intervalNum} Tage`;
      case 'weekly':return intervalNum === 1 ? 'Wöchentlich' : `Alle ${intervalNum} Wochen`;
      case 'monthly':return intervalNum === 1 ? 'Monatlich' : `Alle ${intervalNum} Monate`;
      case 'yearly':return intervalNum === 1 ? 'Jährlich' : `Alle ${intervalNum} Jahre`;
      case 'weekdays':return 'An Werktagen';
      default:return 'Wiederholt';
    }
  };
  const isInMyDay = task.is_in_my_day && task.my_day_date === today;

  return (
    <div data-ev-id="ev_bb8652bc41" className="w-96 bg-slate-50 dark:bg-slate-700 border-l border-slate-200 dark:border-slate-600 flex flex-col h-full">
      {/* Header */}
      <div data-ev-id="ev_021afaa5fd" className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-600">
        <button data-ev-id="ev_931a3b34d1"
        onClick={onToggleComplete}
        className="flex items-center gap-2">

          {task.is_completed ?
          <CheckCircle2 size={24} className="text-blue-500" /> :

          <Circle size={24} className="text-slate-400 hover:text-blue-500" />
          }
        </button>
        <button data-ev-id="ev_a63564fee4"
        onClick={onClose}
        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg">

          <X size={20} className="text-slate-500" />
        </button>
      </div>

      <div data-ev-id="ev_a74e6f716d" className="flex-1 overflow-y-auto">
        {/* Title */}
        <div data-ev-id="ev_ca14b39d79" className="px-4 py-3">
          <input data-ev-id="ev_71feb1a817"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className={`w-full text-lg font-semibold bg-transparent border-none outline-none ${
          task.is_completed ?
          'text-slate-400 line-through' :
          'text-slate-900 dark:text-white'}`
          } />

        </div>

        {/* Steps */}
        <div data-ev-id="ev_9a5c6d2271" className="px-4 py-2 border-y border-slate-200 dark:border-slate-600">
          <div data-ev-id="ev_8e2521038f" className="flex flex-col gap-2">
            {task.steps.map((step) =>
            <div data-ev-id="ev_b0e0520a84" key={step.id} className="flex items-center gap-3 group">
                <button data-ev-id="ev_a34eb59499" onClick={() => onToggleStepComplete(step.id)}>
                  {step.is_completed ?
                <CheckCircle2 size={18} className="text-blue-500" /> :

                <Circle size={18} className="text-slate-400 hover:text-blue-500" />
                }
                </button>
                {editingStepId === step.id ?
              <input data-ev-id="ev_1b3eba51f9"
              type="text"
              value={editingStepTitle}
              onChange={(e) => setEditingStepTitle(e.target.value)}
              onBlur={() => handleUpdateStep(step.id)}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateStep(step.id)}
              className="flex-1 px-2 py-1 text-sm bg-white dark:bg-slate-700 border border-blue-500 rounded outline-none"
              autoFocus /> :


              <span data-ev-id="ev_9d2975e8df"
              onClick={() => {
                setEditingStepId(step.id);
                setEditingStepTitle(step.title);
              }}
              className={`flex-1 text-sm cursor-pointer ${
              step.is_completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`
              }>

                    {step.title}
                  </span>
              }
                <button data-ev-id="ev_faea20758a"
              onClick={() => onDeleteStep(step.id)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">

                  <X size={14} className="text-slate-400" />
                </button>
              </div>
            )}

            {/* Add Step */}
            <div data-ev-id="ev_b3222ad50e" className="flex items-center gap-3">
              <Plus size={18} className="text-blue-500" />
              <input data-ev-id="ev_cef6e6e6f8"
              type="text"
              value={newStepTitle}
              onChange={(e) => setNewStepTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateStep()}
              placeholder="Schritt hinzufügen"
              className="flex-1 text-sm bg-transparent border-none outline-none placeholder-slate-400 text-slate-700 dark:text-slate-300" />

            </div>
          </div>
        </div>

        {/* Actions */}
        <div data-ev-id="ev_03fce08b7a" className="flex flex-col gap-1 py-2">
          {/* My Day */}
          <button data-ev-id="ev_789188bb28"
          onClick={isInMyDay ? onRemoveFromMyDay : onAddToMyDay}
          className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-600 ${
          isInMyDay ? 'text-amber-500' : 'text-slate-600 dark:text-slate-300'}`
          }>

            <Sun size={20} />
            <span data-ev-id="ev_63d09c3409" className="flex-1">{isInMyDay ? 'Aus "Mein Tag" entfernen' : 'Zu "Mein Tag" hinzufügen'}</span>
          </button>

          {/* Reminder */}
          <div data-ev-id="ev_b756719dea" className="relative">
            <button data-ev-id="ev_4e6803cfa5"
            onClick={() => {
              if (!showReminderPicker && task.reminder_at) {
                // Initialize picker with current value (format: YYYY-MM-DDTHH:MM)
                const date = new Date(task.reminder_at);
                const localDateTime = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                setCustomReminderValue(localDateTime);
              }
              setShowReminderPicker(!showReminderPicker);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-600 ${
            task.reminder_at ? 'text-blue-500' : 'text-slate-600 dark:text-slate-300'}`
            }>

              <Bell size={20} />
              <div data-ev-id="ev_20c79fb0af" className="flex-1 text-left">
                <span data-ev-id="ev_3e4309afda" className="text-xs text-slate-500 dark:text-slate-400 block">Erinnerung am</span>
                <span data-ev-id="ev_4888ff7c33" className="text-sm">{task.reminder_at ? formatDateTime(task.reminder_at) : 'Keine Erinnerung'}</span>
              </div>
              {task.reminder_at &&
              <button data-ev-id="ev_2e56c1798b"
              onClick={(e) => {
                e.stopPropagation();
                onSetReminder(null);
              }}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">

                  <X size={14} />
                </button>
              }
            </button>
            {showReminderPicker &&
            <div data-ev-id="ev_43edb9980f" className="mx-4 my-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 p-3">
                <div data-ev-id="ev_8108580392" className="flex flex-col gap-2 mb-3">
                  <button data-ev-id="ev_3b94f81b3f"
                onClick={() => {
                  const reminder = new Date();
                  reminder.setMinutes(reminder.getMinutes() + 30);
                  onSetReminder(reminder.toISOString());
                  setShowReminderPicker(false);
                }}
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-left text-sm">
                    <Clock size={16} className="text-blue-500" />
                    <span data-ev-id="ev_91a73aedaf">In 30 Minuten</span>
                  </button>
                  <button data-ev-id="ev_bbff5b2ece"
                onClick={() => {
                  const reminder = new Date();
                  reminder.setHours(reminder.getHours() + 1);
                  onSetReminder(reminder.toISOString());
                  setShowReminderPicker(false);
                }}
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-left text-sm">
                    <Clock size={16} className="text-blue-500" />
                    <span data-ev-id="ev_1758f08a00">In 1 Stunde</span>
                  </button>
                  <button data-ev-id="ev_62aad10d0d"
                onClick={() => {
                  const reminder = new Date();
                  reminder.setHours(reminder.getHours() + 3);
                  onSetReminder(reminder.toISOString());
                  setShowReminderPicker(false);
                }}
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-left text-sm">
                    <Clock size={16} className="text-blue-500" />
                    <span data-ev-id="ev_ef36eff399">In 3 Stunden</span>
                  </button>
                  <button data-ev-id="ev_312cb53f2d"
                onClick={() => {
                  const reminder = new Date();
                  reminder.setDate(reminder.getDate() + 1);
                  reminder.setHours(9, 0, 0, 0);
                  onSetReminder(reminder.toISOString());
                  setShowReminderPicker(false);
                }}
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-left text-sm">
                    <Bell size={16} className="text-blue-500" />
                    <span data-ev-id="ev_6032be9c43">Morgen um 9:00</span>
                  </button>
                </div>
                <div data-ev-id="ev_a63c06f1fe" className="border-t border-slate-200 dark:border-slate-600 pt-3">
                  <p data-ev-id="ev_d7f7c726c5" className="text-xs text-slate-500 mb-2">Oder wähle Datum & Uhrzeit:</p>
                  <input data-ev-id="ev_7cfe1b868b"
                type="datetime-local"
                step="60"
                value={customReminderValue}
                onChange={(e) => setCustomReminderValue(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
                  <div data-ev-id="ev_5d36c2cc1a" className="flex gap-2 mt-3">
                    <button data-ev-id="ev_07375bcfe2"
                  onClick={() => {
                    setCustomReminderValue('');
                    setShowReminderPicker(false);
                  }}
                  className="flex-1 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-600">
                      Abbrechen
                    </button>
                    <button data-ev-id="ev_a1fc4ff33f"
                  onClick={() => {
                    if (customReminderValue) {
                      onSetReminder(new Date(customReminderValue).toISOString());
                    }
                    setCustomReminderValue('');
                    setShowReminderPicker(false);
                  }}
                  disabled={!customReminderValue}
                  className="flex-1 px-3 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg font-medium">
                      Speichern
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>

          {/* Due Date */}
          <div data-ev-id="ev_612fc864f6" className="relative">
            <button data-ev-id="ev_c05d44971f"
            onClick={() => {
              if (!showDatePicker && task.due_date) {
                // Initialize picker with current value
                const timeStr = task.due_time && task.due_time.trim() ? task.due_time.substring(0, 5) : '12:00';
                setCustomDueDateValue(`${task.due_date}T${timeStr}`);
              }
              setShowDatePicker(!showDatePicker);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-600 ${
            task.due_date ? 'text-blue-500' : 'text-slate-600 dark:text-slate-300'}`
            }>

              <Calendar size={20} />
              <div data-ev-id="ev_b2a98de833" className="flex-1 text-left">
                <span data-ev-id="ev_b29da2b142" className="text-xs text-slate-500 dark:text-slate-400 block">Fällig am</span>
                <span data-ev-id="ev_421656bd30" className="text-sm">{task.due_date ? formatDateWithTime(task.due_date, task.due_time) : 'Kein Fälligkeitsdatum'}</span>
              </div>
              {task.due_date &&
              <button data-ev-id="ev_b20d2ac91e"
              onClick={(e) => {
                e.stopPropagation();
                onSetDueDate(null);
              }}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">

                  <X size={14} />
                </button>
              }
            </button>
            {showDatePicker &&
            <div data-ev-id="ev_ae39e4e9b1" className="mx-4 my-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 p-3">
                <div data-ev-id="ev_3f9e9b3c6d" className="flex flex-col gap-2 mb-3">
                  <button data-ev-id="ev_1596379717"
                onClick={() => {
                  onSetDueDate(today);
                  setShowDatePicker(false);
                  setCustomDueDateValue('');
                }}
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-left text-sm">

                    <Calendar size={16} className="text-blue-500" />
                    <span data-ev-id="ev_66081871f6">Heute</span>
                  </button>
                  <button data-ev-id="ev_3186fa53e1"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  onSetDueDate(tomorrow.toISOString().split('T')[0]);
                  setShowDatePicker(false);
                  setCustomDueDateValue('');
                }}
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-left text-sm">

                    <Calendar size={16} className="text-blue-500" />
                    <span data-ev-id="ev_04d993ac65">Morgen</span>
                  </button>
                  <button data-ev-id="ev_next_week_btn"
                onClick={() => {
                  const nextWeek = new Date();
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  onSetDueDate(nextWeek.toISOString().split('T')[0]);
                  setShowDatePicker(false);
                  setCustomDueDateValue('');
                }}
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-left text-sm">

                    <Calendar size={16} className="text-blue-500" />
                    <span data-ev-id="ev_bef1c15699">Nächste Woche</span>
                  </button>
                </div>
                <div data-ev-id="ev_custom_date_section" className="border-t border-slate-200 dark:border-slate-600 pt-3">
                  <p data-ev-id="ev_baec37a3f0" className="text-xs text-slate-500 mb-2">Oder wähle Datum & Uhrzeit:</p>
                  <input data-ev-id="ev_a157781d0a"
                type="datetime-local"
                step="60"
                value={customDueDateValue}
                onChange={(e) => setCustomDueDateValue(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />

                  <div data-ev-id="ev_7a06debf82" className="flex gap-2 mt-3">
                    <button data-ev-id="ev_07abc1f297"
                  onClick={() => {
                    setCustomDueDateValue('');
                    setShowDatePicker(false);
                  }}
                  className="flex-1 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-600">

                      Abbrechen
                    </button>
                    <button data-ev-id="ev_b76d284a9a"
                  onClick={() => {
                    if (customDueDateValue) {
                      // datetime-local format: "YYYY-MM-DDTHH:MM"
                      const parts = customDueDateValue.split('T');
                      const dateStr = parts[0]; // "YYYY-MM-DD"
                      const timeStr = parts[1] ? parts[1].substring(0, 5) : null; // "HH:MM"
                      onSetDueDate(dateStr, timeStr);
                    }
                    setCustomDueDateValue('');
                    setShowDatePicker(false);
                  }}
                  disabled={!customDueDateValue}
                  className="flex-1 px-3 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg font-medium">

                      Speichern
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>

          {/* Recurrence */}
          <div data-ev-id="ev_recurrence_section" className="relative">
            <button data-ev-id="ev_recurrence_btn"
            onClick={() => setShowRecurrencePicker(!showRecurrencePicker)}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-600 ${
            task.recurrence_type ? 'text-sky-500' : 'text-slate-600 dark:text-slate-300'}`
            }>
              <Repeat size={20} />
              <div data-ev-id="ev_recurrence_label" className="flex-1 text-left">
                <span data-ev-id="ev_04271d45ed" className="text-xs text-slate-500 dark:text-slate-400 block">Wiederholen</span>
                <span data-ev-id="ev_26aa6c1baf" className="text-sm">{task.recurrence_type ? getRecurrenceLabel(task.recurrence_type, task.recurrence_interval) : 'Nicht wiederholen'}</span>
              </div>
              {task.recurrence_type &&
              <button data-ev-id="ev_recurrence_clear"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateTask({ recurrence_type: null, recurrence_interval: null, recurrence_end_date: null });
              }}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded">
                  <X size={14} />
                </button>
              }
            </button>
            {showRecurrencePicker &&
            <div data-ev-id="ev_recurrence_picker" className="absolute left-4 right-4 top-full mt-1 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 p-3 z-10">
                <div data-ev-id="ev_recurrence_options" className="flex flex-col gap-1">
                  {[
                { type: 'daily', interval: 1, label: 'Täglich' },
                { type: 'weekly', interval: 1, label: 'Wöchentlich' },
                { type: 'monthly', interval: 1, label: 'Monatlich' },
                { type: 'yearly', interval: 1, label: 'Jährlich' },
                { type: 'weekdays', interval: 1, label: 'An Werktagen' }].
                map(({ type, interval, label }) =>
                <button data-ev-id={`ev_rec_${type}`}
                key={type}
                onClick={() => {
                  onUpdateTask({ recurrence_type: type, recurrence_interval: interval });
                  setShowRecurrencePicker(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg text-left ${
                task.recurrence_type === type ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300' : ''}`
                }>
                      <Repeat size={16} className="text-sky-500" />
                      <span data-ev-id={`ev_rec_label_${type}`}>{label}</span>
                    </button>
                )}
                  {/* Custom days interval */}
                  <div data-ev-id="ev_rec_custom" className="flex items-center gap-2 px-3 py-2 border-t border-slate-200 dark:border-slate-600 mt-2 pt-2">
                    <Repeat size={16} className="text-sky-500" />
                    <span data-ev-id="ev_rec_custom_label" className="text-sm">Alle</span>
                    <input data-ev-id="ev_f5588323b4"
                  type="number"
                  min={2}
                  max={365}
                  value={customDaysInterval}
                  onChange={(e) => setCustomDaysInterval(Math.max(2, parseInt(e.target.value) || 2))}
                  className="w-14 px-2 py-1 text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-600 text-slate-900 dark:text-white text-sm" />

                    <span data-ev-id="ev_rec_custom_days" className="text-sm">Tage</span>
                    <button
                    data-ev-id="ev_rec_custom_save"
                    onClick={() => {
                      onUpdateTask({ recurrence_type: 'daily', recurrence_interval: customDaysInterval });
                      setShowRecurrencePicker(false);
                    }}
                    className="ml-auto px-3 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded text-sm font-medium">

                      OK
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>

          {/* Assign */}
          <div data-ev-id="ev_f2de37e6f1" className="relative">
            <div data-ev-id="ev_5ec2424e8c"
            onClick={() => setShowAssignPicker(!showAssignPicker)}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer ${
            task.assigned_to ? 'text-blue-500' : 'text-slate-600 dark:text-slate-300'}`
            }>

              <User size={20} />
              <div data-ev-id="ev_b32f0ded68" className="flex-1 text-left">
                <span data-ev-id="ev_653209ca56" className="text-xs text-slate-500 dark:text-slate-400 block">Zugewiesen an</span>
                <span data-ev-id="ev_faa59ff799" className="text-sm">{task.assignee ? task.assignee.full_name : 'Niemand'}</span>
              </div>
              {task.assigned_to &&
              <button data-ev-id="ev_b0f631195d"
              onClick={(e) => {
                e.stopPropagation();
                onAssign(null);
              }}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">

                  <X size={14} />
                </button>
              }
            </div>
            {showAssignPicker &&
            <div data-ev-id="ev_4252c7a967" className="absolute left-4 right-4 top-full mt-1 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 max-h-48 overflow-y-auto z-10">
                {profilesForAssignment.length === 0 ?
              <div data-ev-id="ev_a29c0d805e" className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 italic">
                    Keine Mitglieder in dieser Liste
                  </div> :
              profilesForAssignment.map((profile) =>
              <button data-ev-id="ev_9c59d39c52"
              key={profile.id}
              onClick={() => {
                onAssign(profile.id);
                setShowAssignPicker(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-left">

                    <div data-ev-id="ev_f7a24018d7" className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-medium text-sm">
                      {profile.full_name?.[0] ?? '?'}
                    </div>
                    <span data-ev-id="ev_fb857073b6" className="text-slate-700 dark:text-slate-300">{profile.full_name}</span>
                  </button>
              )}
              </div>
            }
          </div>

          {/* Important */}
          <button data-ev-id="ev_88e57b278a"
          onClick={onToggleImportant}
          className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-600 ${
          task.is_important ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`
          }>
            <Star size={20} className={task.is_important ? 'fill-rose-500' : ''} />
            <span data-ev-id="ev_96453e070a" className="flex-1">{task.is_important ? 'Als wichtig markiert' : 'Als wichtig markieren'}</span>
          </button>

          {/* Task Sharing */}
          {canEditTask && onShareTask &&
          <div data-ev-id="ev_task_share_section" className="relative">
            <button data-ev-id="ev_task_share_btn"
            onClick={() => setShowTaskShareModal(!showTaskShareModal)}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-600 ${
            (task.shares?.length ?? 0) > 0 ? 'text-sky-500' : 'text-slate-600 dark:text-slate-300'}`
            }>
              <Users size={20} />
              <span data-ev-id="ev_task_share_label" className="flex-1 text-left">
                {(task.shares?.length ?? 0) > 0 ? `${task.shares?.length} eingeladen` : 'Jemanden einladen'}
              </span>
            </button>

            {showTaskShareModal &&
            <div data-ev-id="ev_task_share_modal" className="absolute left-4 right-4 top-full mt-1 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 p-3 z-20 max-h-80 overflow-y-auto">
              {/* Search Input */}
              <div data-ev-id="ev_share_search_wrap" className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input data-ev-id="ev_share_search_input"
                type="text"
                value={shareSearchQuery}
                onChange={(e) => setShareSearchQuery(e.target.value)}
                placeholder="Person suchen..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-white text-sm" />

              </div>

              {/* Permission Select */}
              <div data-ev-id="ev_share_perm_wrap" className="flex gap-2 mb-3">
                <button data-ev-id="ev_perm_edit"
                onClick={() => setSelectedSharePermission('edit')}
                className={`flex-1 py-1.5 text-sm rounded-lg border ${
                selectedSharePermission === 'edit' ?
                'bg-sky-100 dark:bg-sky-900/30 border-sky-500 text-sky-700 dark:text-sky-300' :
                'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`
                }>
                  Bearbeiten
                </button>
                <button data-ev-id="ev_perm_view"
                onClick={() => setSelectedSharePermission('view')}
                className={`flex-1 py-1.5 text-sm rounded-lg border ${
                selectedSharePermission === 'view' ?
                'bg-sky-100 dark:bg-sky-900/30 border-sky-500 text-sky-700 dark:text-sky-300' :
                'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`
                }>
                  Nur ansehen
                </button>
              </div>

              {/* Available Profiles */}
              {shareSearchQuery && (() => {
                const sharedUserIds = new Set((task.shares ?? []).map((s) => s.user_id));
                const availableProfiles = profiles.filter((p) =>
                p.id !== currentUserId &&
                !sharedUserIds.has(p.id) && (
                p.full_name?.toLowerCase().includes(shareSearchQuery.toLowerCase()) ||
                p.email?.toLowerCase().includes(shareSearchQuery.toLowerCase()))
                );
                return availableProfiles.length > 0 ?
                <div data-ev-id="ev_share_results" className="flex flex-col gap-1 mb-3">
                    {availableProfiles.slice(0, 5).map((p) =>
                  <button data-ev-id={`ev_share_user_${p.id}`}
                  key={p.id}
                  onClick={() => {
                    onShareTask(p.id, selectedSharePermission);
                    setShareSearchQuery('');
                  }}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg text-left">
                        <UserPlus size={16} className="text-sky-500" />
                        <div data-ev-id="ev_share_user_info" className="flex-1 min-w-0">
                          <div data-ev-id="ev_share_user_name" className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{p.full_name}</div>
                          <div data-ev-id="ev_share_user_email" className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.email}</div>
                        </div>
                      </button>
                  )}
                  </div> :
                <p data-ev-id="ev_no_results" className="text-sm text-slate-500 dark:text-slate-400 text-center py-2 mb-3">Keine passenden Personen</p>;
              })()}

              {/* Currently Shared */}
              {(task.shares?.length ?? 0) > 0 &&
              <div data-ev-id="ev_current_shares">
                <div data-ev-id="ev_shares_label" className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-2">Eingeladen ({task.shares?.length})</div>
                <div data-ev-id="ev_shares_list" className="flex flex-col gap-1">
                  {task.shares?.map((share) => {
                    const shareProfile = profiles.find((p) => p.id === share.user_id);
                    return (
                      <div data-ev-id={`ev_share_item_${share.user_id}`} key={share.user_id} className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 dark:bg-slate-600 rounded-lg">
                        <div data-ev-id="ev_share_avatar" className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-900 flex items-center justify-center text-sky-600 dark:text-sky-300 text-xs font-medium">
                          {shareProfile?.full_name?.[0] ?? '?'}
                        </div>
                        <span data-ev-id="ev_share_name" className="flex-1 text-sm text-slate-700 dark:text-slate-200 truncate">{shareProfile?.full_name ?? 'Unbekannt'}</span>
                        <select data-ev-id="ev_share_perm_select"
                        value={share.permission}
                        onChange={(e) => onUpdateTaskSharePermission?.(share.user_id, e.target.value as 'view' | 'edit')}
                        className="text-xs bg-transparent border-none text-slate-500 dark:text-slate-400">
                          <option data-ev-id="ev_e8197fb57d" value="edit">Bearbeiten</option>
                          <option data-ev-id="ev_5c8002b243" value="view">Ansehen</option>
                        </select>
                        <button data-ev-id="ev_share_remove"
                        onClick={() => onUnshareTask?.(share.user_id)}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-500 rounded text-slate-400 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>);

                  })}
                </div>
              </div>
              }
            </div>
            }
          </div>
          }

          {/* Beteiligte Übersicht - immer sichtbar */}
          {(task.created_by || task.assigned_to || (task.shares?.length ?? 0) > 0) &&
          <div data-ev-id="ev_beteiligte_section" className="px-4 py-3 border-t border-slate-200 dark:border-slate-600">
            <div data-ev-id="ev_beteiligte_header" className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-2">
              <Users size={14} />
              Mitwirkende
            </div>
            <div data-ev-id="ev_beteiligte_list" className="flex flex-col gap-2">
              {/* Ersteller */}
              {task.created_by && (() => {
                const creator = profiles.find((p) => p.id === task.created_by);
                return creator ?
                <div data-ev-id="ev_beteiligte_creator" className="flex items-center gap-2">
                    <div data-ev-id="ev_e540755090" className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-300 text-xs font-medium">
                      {creator.full_name?.[0] ?? '?'}
                    </div>
                    <span data-ev-id="ev_773032ba1b" className="text-sm text-slate-700 dark:text-slate-200 truncate flex-1">{creator.full_name}</span>
                    <span data-ev-id="ev_3588e807e2" className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">Ersteller</span>
                  </div> :
                null;
              })()}
              
              {/* Zugewiesener */}
              {task.assigned_to && task.assigned_to !== task.created_by && (() => {
                const assignee = profiles.find((p) => p.id === task.assigned_to);
                return assignee ?
                <div data-ev-id="ev_beteiligte_assignee" className="flex items-center gap-2">
                    <div data-ev-id="ev_dc60827365" className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 text-xs font-medium">
                      {assignee.full_name?.[0] ?? '?'}
                    </div>
                    <span data-ev-id="ev_a5156f0014" className="text-sm text-slate-700 dark:text-slate-200 truncate flex-1">{assignee.full_name}</span>
                    <span data-ev-id="ev_501a579028" className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">Zugewiesen</span>
                  </div> :
                null;
              })()}
              
              {/* Eingeladene */}
              {(task.shares?.length ?? 0) > 0 && task.shares?.map((share) => {
                const sharedUser = profiles.find((p) => p.id === share.user_id);
                if (!sharedUser || share.user_id === task.created_by || share.user_id === task.assigned_to) return null;
                return (
                  <div data-ev-id={`ev_beteiligte_shared_${share.user_id}`} key={share.user_id} className="flex items-center gap-2">
                    <div data-ev-id="ev_a4df4bbbb1" className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-900 flex items-center justify-center text-sky-600 dark:text-sky-300 text-xs font-medium">
                      {sharedUser.full_name?.[0] ?? '?'}
                    </div>
                    <span data-ev-id="ev_cbd0aa2172" className="text-sm text-slate-700 dark:text-slate-200 truncate flex-1">{sharedUser.full_name}</span>
                    <span data-ev-id="ev_a9fabac74f" className="text-xs px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                      Eingeladen
                    </span>
                  </div>);

              })}
            </div>
          </div>
          }
        </div>

        {/* Notes */}
        <div data-ev-id="ev_901e9d87aa" className="px-4 py-3 border-t border-slate-200 dark:border-slate-600">
          <div data-ev-id="ev_ed73b49f7d" className="text-xs text-slate-500 dark:text-slate-400 mb-1">Notizen</div>
          <textarea data-ev-id="ev_9812deeb01"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Notizen hinzufügen..."
          rows={4}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg resize-none outline-none focus:border-blue-500 text-slate-700 dark:text-slate-300 placeholder-slate-400" />
          {/* Notes update info */}
          {task.notes_updated_at && task.notes_updater &&
          <div data-ev-id="ev_ff6ed94e49" className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 italic">
              Zuletzt bearbeitet von {task.notes_updater.full_name} am{' '}
              {new Date(task.notes_updated_at).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
            </div>
          }
        </div>

        {/* Comments Section */}
        {onFetchComments &&
        <div data-ev-id="ev_comments_section" className="border-t border-slate-200 dark:border-slate-600">
            <button
            data-ev-id="ev_comments_toggle"
            onClick={() => setShowComments(!showComments)}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-left">

              <MessageCircle size={18} className="text-blue-500" />
              <span data-ev-id="ev_c1b17b0396" className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                Nachrichten {comments.length > 0 && `(${comments.length})`}
              </span>
              <ChevronRight
              size={16}
              className={`text-slate-400 transition-transform ${showComments ? 'rotate-90' : ''}`} />

            </button>

            {showComments &&
          <div data-ev-id="ev_comments_content" className="px-4 pb-4">
                {loadingComments ?
            <div data-ev-id="ev_41c3622e94" className="text-center py-4 text-slate-400 text-sm">Lade Nachrichten...</div> :

            <>
                    {/* Comments List */}
                    <div data-ev-id="ev_comments_list" className="flex flex-col gap-3 max-h-64 overflow-y-auto mb-3">
                      {comments.length === 0 ?
                <div data-ev-id="ev_ba3d2c18ed" className="text-center py-4 text-slate-400 text-sm">
                          Noch keine Nachrichten. Schreibe eine Nachricht, um mit dem Ersteller oder Zugewiesenen zu kommunizieren.
                        </div> :

                comments.map((comment) =>
                <div
                  key={comment.id}
                  data-ev-id={`ev_comment_${comment.id}`}
                  className={`p-3 rounded-lg ${
                  comment.user_id === currentUserId ?
                  'bg-blue-50 dark:bg-blue-900/30 ml-4' :
                  'bg-slate-100 dark:bg-slate-700 mr-4'}`
                  }>

                            <div data-ev-id="ev_640ff8c841" className="flex items-center gap-2 mb-1">
                              <div data-ev-id="ev_de2d672485" className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-900 flex items-center justify-center text-sky-600 dark:text-sky-300 text-xs font-medium">
                                {comment.user?.full_name?.[0] ?? '?'}
                              </div>
                              <span data-ev-id="ev_da67d62d1e" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                {comment.user?.full_name ?? 'Unbekannt'}
                              </span>
                              <span data-ev-id="ev_e2c500d6bd" className="text-xs text-slate-400 ml-auto">
                                {new Date(comment.created_at).toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                              </span>
                            </div>
                            <p data-ev-id="ev_d233b5a1a2" className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                              {comment.content}
                            </p>
                          </div>
                )
                }
                    </div>

                    {/* New Comment Input */}
                    <div data-ev-id="ev_new_comment" className="flex gap-2">
                      <input
                  data-ev-id="ev_comment_input"
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                  placeholder="Nachricht schreiben..."
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:border-blue-500 text-slate-700 dark:text-slate-300 placeholder-slate-400" />

                      <button
                  data-ev-id="ev_send_comment"
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">

                        <Send size={16} />
                      </button>
                    </div>
                  </>
            }
              </div>
          }
          </div>
        }
      </div>

      {/* Footer */}
      <div data-ev-id="ev_a30a2fdc8f" className="px-4 py-3 border-t border-slate-200 dark:border-slate-600 flex items-center justify-between">
        <span data-ev-id="ev_bf6df27f1f" className="text-xs text-slate-400">
          Erstellt: {new Date(task.created_at).toLocaleDateString('de-DE')}
        </span>
        {canEditTask &&
        <button data-ev-id="ev_367117bc86"
        onClick={onDeleteTask}
        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
          <Trash2 size={18} />
        </button>
        }
      </div>
    </div>);

}