import { X, List, FolderOpen } from 'lucide-react';
import type { TodoListWithCounts, TodoListGroup } from '@/hooks/useTodoLists';

interface TodoMoveTaskModalProps {
  taskTitle: string;
  lists: TodoListWithCounts[];
  groups: TodoListGroup[];
  currentListId: string;
  onClose: () => void;
  onMove: (listId: string) => void;
}

export function TodoMoveTaskModal({
  taskTitle,
  lists,
  groups,
  currentListId,
  onClose,
  onMove
}: TodoMoveTaskModalProps) {
  const normalLists = lists.filter((l) => !l.is_smart_list);
  const ungroupedLists = normalLists.filter((l) => !l.group_id);

  return (
    <div data-ev-id="ev_4989059baf" className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div data-ev-id="ev_209b74d772" className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Modal */}
      <div data-ev-id="ev_6deb7e7537" className="relative bg-white dark:bg-slate-700 rounded-xl shadow-xl w-full max-w-sm mx-4">
        {/* Header */}
        <div data-ev-id="ev_59d3a89d3c" className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div data-ev-id="ev_b4d4389bab">
            <h2 data-ev-id="ev_71d85e0d35" className="text-lg font-semibold text-slate-900 dark:text-white">Aufgabe verschieben</h2>
            <p data-ev-id="ev_210f089608" className="text-sm text-slate-500 dark:text-slate-300 truncate max-w-[250px]">{taskTitle}</p>
          </div>
          <button data-ev-id="ev_8b5b08910d"
          onClick={onClose}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">

            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Lists */}
        <div data-ev-id="ev_22c2e8932e" className="p-2 max-h-80 overflow-y-auto">
          {/* Ungrouped Lists */}
          {ungroupedLists.map((list) =>
          <button data-ev-id="ev_e31df1032d"
          key={list.id}
          onClick={() => {
            if (list.id !== currentListId) {
              onMove(list.id);
            }
          }}
          disabled={list.id === currentListId}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
          list.id === currentListId ?
          'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
          'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`
          }>

              <List size={20} style={{ color: list.color ?? '#3b82f6' }} />
              <span data-ev-id="ev_2bf14c7aec" className="flex-1 font-medium">{list.name}</span>
              {list.id === currentListId &&
            <span data-ev-id="ev_3422c819d6" className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                  Aktuell
                </span>
            }
            </button>
          )}

          {/* Groups with Lists */}
          {groups.map((group) => {
            const groupLists = normalLists.filter((l) => l.group_id === group.id);
            if (groupLists.length === 0) return null;

            return (
              <div data-ev-id="ev_37659f499f" key={group.id} className="mt-2">
                <div data-ev-id="ev_de2c87b176" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-300">
                  <FolderOpen size={16} />
                  <span data-ev-id="ev_ff52d2bce2">{group.name}</span>
                </div>
                {groupLists.map((list) =>
                <button data-ev-id="ev_f1f15d8e5b"
                key={list.id}
                onClick={() => {
                  if (list.id !== currentListId) {
                    onMove(list.id);
                  }
                }}
                disabled={list.id === currentListId}
                className={`w-full flex items-center gap-3 px-4 py-3 pl-8 rounded-lg text-left transition-colors ${
                list.id === currentListId ?
                'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`
                }>

                    <List size={20} style={{ color: list.color ?? '#3b82f6' }} />
                    <span data-ev-id="ev_df5ae2d883" className="flex-1 font-medium">{list.name}</span>
                    {list.id === currentListId &&
                  <span data-ev-id="ev_dc17e75fc2" className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                        Aktuell
                      </span>
                  }
                  </button>
                )}
              </div>);

          })}
        </div>
      </div>
    </div>);

}