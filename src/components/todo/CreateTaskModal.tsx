import { useState } from 'react';
import {
  X,
  Calendar,
  User,
  UserCheck,
  Flag,
  Star,
  Clock,
  ChevronDown,
  FileText } from
'lucide-react';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface CreateTaskData {
  title: string;
  notes?: string;
  assigned_to?: string;
  due_date?: string;
  due_time?: string;
  priority?: number;
  is_important?: boolean;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (data: CreateTaskData) => void;
  profiles: Profile[];
  listName?: string;
}

const PRIORITY_LEVELS = [
{ value: 0, label: 'Keine', color: 'text-slate-400', bgColor: 'bg-slate-100' },
{ value: 1, label: 'Niedrig', color: 'text-blue-500', bgColor: 'bg-blue-100' },
{ value: 2, label: 'Mittel', color: 'text-amber-500', bgColor: 'bg-amber-100' },
{ value: 3, label: 'Hoch', color: 'text-red-500', bgColor: 'bg-red-100' }];


export function CreateTaskModal({
  isOpen,
  onClose,
  onCreateTask,
  profiles,
  listName
}: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState(0);
  const [isImportant, setIsImportant] = useState(false);

  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

  const selectedAssignee = profiles.find((p) => p.id === assignedTo);
  const selectedPriority = PRIORITY_LEVELS[priority];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onCreateTask({
      title: title.trim(),
      notes: notes.trim() || undefined,
      assigned_to: assignedTo || undefined,
      due_date: dueDate || undefined,
      due_time: dueTime || undefined,
      priority: priority > 0 ? priority : undefined,
      is_important: isImportant || undefined
    });

    // Reset form
    setTitle('');
    setNotes('');
    setAssignedTo('');
    setDueDate('');
    setDueTime('');
    setPriority(0);
    setIsImportant(false);
    onClose();
  };

  const handleClose = () => {
    setTitle('');
    setNotes('');
    setAssignedTo('');
    setDueDate('');
    setDueTime('');
    setPriority(0);
    setIsImportant(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        data-ev-id="ev_create_task_backdrop"
        className="fixed inset-0 bg-black/50 z-50"
        onClick={handleClose} />


      {/* Modal */}
      <div
        data-ev-id="ev_create_task_modal"
        className="fixed inset-x-4 top-[10%] md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl z-50 max-h-[80vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div data-ev-id="ev_modal_header" className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div data-ev-id="ev_200b8116f4">
            <h2 data-ev-id="ev_modal_title" className="text-lg font-semibold text-slate-900 dark:text-white">
              Neue Aufgabe
            </h2>
            {listName &&
            <p data-ev-id="ev_modal_subtitle" className="text-sm text-slate-500 dark:text-slate-400">
                in {listName}
              </p>
            }
          </div>
          <button
            data-ev-id="ev_modal_close"
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">

            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form data-ev-id="ev_6419904fce" onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div data-ev-id="ev_form_content" className="p-5 flex flex-col gap-4">
            {/* Title */}
            <div data-ev-id="ev_title_field">
              <label data-ev-id="ev_d44f2ae2cc" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Titel *
              </label>
              <input
                data-ev-id="ev_title_input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Was muss erledigt werden?"
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-white placeholder-slate-400"
                autoFocus />

            </div>

            {/* Notes */}
            <div data-ev-id="ev_notes_field">
              <label data-ev-id="ev_968acf5331" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <FileText size={14} className="inline mr-1.5" />
                Beschreibung
              </label>
              <textarea
                data-ev-id="ev_notes_input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Weitere Details..."
                rows={3}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-white placeholder-slate-400 resize-none" />

            </div>

            {/* Two Column Layout for smaller fields */}
            <div data-ev-id="ev_two_col" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assignee */}
              <div data-ev-id="ev_assignee_field" className="relative">
                <label data-ev-id="ev_13b9ffc508" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <User size={14} className="inline mr-1.5" />
                  Zuweisen an
                </label>
                <button
                  data-ev-id="ev_assignee_btn"
                  type="button"
                  onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border transition-colors ${
                  assignedTo ?
                  'border-blue-300 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-700' :
                  'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700'}`
                  }>

                  <span data-ev-id="ev_8aef2c7cae" className={`flex items-center gap-2 ${assignedTo ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500'}`}>
                    {assignedTo ? <UserCheck size={16} /> : <User size={16} />}
                    {selectedAssignee ? selectedAssignee.full_name || selectedAssignee.email : 'Niemand'}
                  </span>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${showAssigneeDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showAssigneeDropdown &&
                <>
                    <div data-ev-id="ev_51704fb599" className="fixed inset-0 z-10" onClick={() => setShowAssigneeDropdown(false)} />
                    <div data-ev-id="ev_assignee_dropdown" className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 z-20 max-h-48 overflow-y-auto">
                      <button data-ev-id="ev_f9e93d7a91"
                    type="button"
                    onClick={() => {setAssignedTo('');setShowAssigneeDropdown(false);}}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-600 ${!assignedTo ? 'bg-slate-100 dark:bg-slate-600' : ''}`}>

                        <User size={16} className="text-slate-400" />
                        <span data-ev-id="ev_515d939ebc" className="text-slate-500">Niemand</span>
                      </button>
                      {profiles.map((p) =>
                    <button data-ev-id="ev_57c9e90fa3"
                    key={p.id}
                    type="button"
                    onClick={() => {setAssignedTo(p.id);setShowAssigneeDropdown(false);}}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-600 ${assignedTo === p.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>

                          <div data-ev-id="ev_f98d32b378" className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-300">
                            {(p.full_name || p.email || '?')[0].toUpperCase()}
                          </div>
                          <span data-ev-id="ev_d00baa765e" className="text-slate-700 dark:text-slate-200">{p.full_name || p.email}</span>
                        </button>
                    )}
                    </div>
                  </>
                }
              </div>

              {/* Priority */}
              <div data-ev-id="ev_priority_field" className="relative">
                <label data-ev-id="ev_f5cfd139a4" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <Flag size={14} className="inline mr-1.5" />
                  Priorität
                </label>
                <button
                  data-ev-id="ev_priority_btn"
                  type="button"
                  onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border transition-colors ${
                  priority > 0 ?
                  `${selectedPriority.bgColor} border-current` :
                  'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700'}`
                  }>

                  <span data-ev-id="ev_d7e8b665ed" className={`flex items-center gap-2 ${selectedPriority.color}`}>
                    <Flag size={16} className={priority > 0 ? 'fill-current' : ''} />
                    {selectedPriority.label}
                  </span>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${showPriorityDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showPriorityDropdown &&
                <>
                    <div data-ev-id="ev_a42a2af6ba" className="fixed inset-0 z-10" onClick={() => setShowPriorityDropdown(false)} />
                    <div data-ev-id="ev_priority_dropdown" className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 z-20">
                      {PRIORITY_LEVELS.map((level) =>
                    <button data-ev-id="ev_b13bae650f"
                    key={level.value}
                    type="button"
                    onClick={() => {setPriority(level.value);setShowPriorityDropdown(false);}}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-600 ${priority === level.value ? level.bgColor + ' dark:bg-opacity-20' : ''}`}>

                          <Flag size={16} className={`${level.color} ${level.value > 0 ? 'fill-current' : ''}`} />
                          <span data-ev-id="ev_5f0590bcae" className={level.color}>{level.label}</span>
                        </button>
                    )}
                    </div>
                  </>
                }
              </div>
            </div>

            {/* Due Date & Time */}
            <div data-ev-id="ev_due_date_field">
              <label data-ev-id="ev_02e2fda39a" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <Calendar size={14} className="inline mr-1.5" />
                Fälligkeitsdatum
              </label>
              <div data-ev-id="ev_93f9104f13" className="flex gap-3">
                <input
                  data-ev-id="ev_due_date_input"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-white" />

                <div data-ev-id="ev_due_time_wrapper" className="relative">
                  <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    data-ev-id="ev_due_time_input"
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-32 pl-10 pr-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-white" />

                </div>
              </div>
            </div>

            {/* Important Toggle */}
            <div data-ev-id="ev_important_field">
              <button
                data-ev-id="ev_important_btn"
                type="button"
                onClick={() => setIsImportant(!isImportant)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all w-full ${
                isImportant ?
                'border-amber-300 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700' :
                'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600'}`
                }>

                <Star
                  size={20}
                  className={isImportant ? 'text-amber-500 fill-amber-500' : 'text-slate-400'} />

                <span data-ev-id="ev_a579acb7cc" className={isImportant ? 'text-amber-700 dark:text-amber-300 font-medium' : 'text-slate-600 dark:text-slate-300'}>
                  Als wichtig markieren
                </span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div data-ev-id="ev_modal_footer" className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <button
              data-ev-id="ev_cancel_btn"
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors">

              Abbrechen
            </button>
            <button
              data-ev-id="ev_submit_btn"
              type="submit"
              disabled={!title.trim()}
              className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">

              Aufgabe erstellen
            </button>
          </div>
        </form>
      </div>
    </>);

}