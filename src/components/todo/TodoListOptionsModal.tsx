import { useState } from 'react';
import { X, Palette, Trash2, Users, Edit2, SortAsc, Eye, EyeOff } from 'lucide-react';
import type { TodoListWithCounts } from '@/hooks/useTodoLists';

interface TodoListOptionsModalProps {
  list: TodoListWithCounts;
  onClose: () => void;
  onRename: (name: string) => void;
  onChangeColor: (color: string) => void;
  onDelete: () => void;
  onShare: () => void;
  onToggleShowCompleted: () => void;
  onChangeSortBy: (sortBy: string) => void;
}

const COLORS = [
'#3b82f6', // blue
'#ef4444', // red
'#f97316', // orange
'#eab308', // yellow
'#22c55e', // green
'#14b8a6', // teal
'#8b5cf6', // purple
'#ec4899', // pink
'#6b7280' // gray
];

const SORT_OPTIONS = [
{ value: 'manual', label: 'Manuell' },
{ value: 'due_date', label: 'Fälligkeitsdatum' },
{ value: 'importance', label: 'Wichtigkeit' },
{ value: 'alphabetical', label: 'Alphabetisch' },
{ value: 'created', label: 'Erstellungsdatum' }];


export function TodoListOptionsModal({
  list,
  onClose,
  onRename,
  onChangeColor,
  onDelete,
  onShare,
  onToggleShowCompleted,
  onChangeSortBy
}: TodoListOptionsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(list.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleRename = () => {
    if (name.trim() && name !== list.name) {
      onRename(name.trim());
    }
    setIsEditing(false);
  };

  return (
    <div data-ev-id="ev_e2e638d3e5" className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div data-ev-id="ev_800509b24a" className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Modal */}
      <div data-ev-id="ev_0948dbd5f3" className="relative bg-white dark:bg-slate-700 rounded-xl shadow-xl w-full max-w-sm mx-4">
        {/* Header */}
        <div data-ev-id="ev_4428e9ef5d" className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-600">
          <h2 data-ev-id="ev_ca810a4e3a" className="text-lg font-semibold text-slate-900 dark:text-white">Listenoptionen</h2>
          <button data-ev-id="ev_49d9df9bca"
          onClick={onClose}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">

            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div data-ev-id="ev_5dbae96ba8" className="p-4 flex flex-col gap-4">
          {/* Name */}
          <div data-ev-id="ev_651a2f8127">
            <label data-ev-id="ev_6e26724e14" className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2 block">Name</label>
            {isEditing ?
            <div data-ev-id="ev_480b486eb5" className="flex gap-2">
                <input data-ev-id="ev_6f56eb6c3d"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              autoFocus />

                <button data-ev-id="ev_d3fe7ce999"
              onClick={handleRename}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">

                  OK
                </button>
              </div> :

            <button data-ev-id="ev_4a1b9f68d8"
            onClick={() => setIsEditing(true)}
            className="w-full flex items-center justify-between px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">

                <span data-ev-id="ev_167790bb6f" className="text-slate-900 dark:text-white">{list.name}</span>
                <Edit2 size={16} className="text-slate-400" />
              </button>
            }
          </div>

          {/* Color */}
          <div data-ev-id="ev_31b3e184ca">
            <label data-ev-id="ev_f1f90c125b" className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2 block">Farbe</label>
            <div data-ev-id="ev_90bdbe981c" className="flex gap-2 flex-wrap">
              {COLORS.map((color) =>
              <button data-ev-id="ev_08161c120b"
              key={color}
              onClick={() => onChangeColor(color)}
              className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
              list.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`
              }
              style={{ backgroundColor: color }} />

              )}
            </div>
          </div>

          {/* Sort By */}
          <div data-ev-id="ev_9ab5dadc29">
            <label data-ev-id="ev_7840cb8cb9" className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2 block">Sortieren nach</label>
            <select data-ev-id="ev_30d2a4d615"
            value={list.sort_by}
            onChange={(e) => onChangeSortBy(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white">

              {SORT_OPTIONS.map((opt) =>
              <option data-ev-id="ev_6999e58d25" key={opt.value} value={opt.value}>{opt.label}</option>
              )}
            </select>
          </div>

          {/* Toggle completed */}
          <button data-ev-id="ev_38b2c2a154"
          onClick={onToggleShowCompleted}
          className="flex items-center gap-3 px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">

            {list.show_completed ? <Eye size={18} /> : <EyeOff size={18} />}
            <span data-ev-id="ev_495522a1f5" className="text-slate-700 dark:text-slate-300">
              {list.show_completed ? 'Erledigte anzeigen' : 'Erledigte ausblenden'}
            </span>
          </button>

          {/* Share */}
          <button data-ev-id="ev_d9af1894c5"
          onClick={onShare}
          className="flex items-center gap-3 px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400">

            <Users size={18} />
            <span data-ev-id="ev_e9e4849e99">Liste teilen</span>
          </button>

          {/* Delete */}
          {showDeleteConfirm ?
          <div data-ev-id="ev_d155d2a34f" className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <span data-ev-id="ev_b0ac7a3aaf" className="flex-1 text-sm text-red-700 dark:text-red-300">
                Wirklich löschen? Alle Aufgaben werden gelöscht.
              </span>
              <button data-ev-id="ev_448d454b84"
            onClick={onDelete}
            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700">

                Ja
              </button>
              <button data-ev-id="ev_a71370c5ef"
            onClick={() => setShowDeleteConfirm(false)}
            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-300">

                Nein
              </button>
            </div> :

          <button data-ev-id="ev_9fbb8651ad"
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center gap-3 px-3 py-2.5 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400">

              <Trash2 size={18} />
              <span data-ev-id="ev_b289bdb240">Liste löschen</span>
            </button>
          }
        </div>
      </div>
    </div>);

}