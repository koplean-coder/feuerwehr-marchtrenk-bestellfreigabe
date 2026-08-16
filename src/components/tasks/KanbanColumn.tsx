import { KanbanCard } from './KanbanCard';
import { Inbox } from 'lucide-react';
import type { Task, TaskStatus } from '@/hooks/useTasks';

interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  color: string;
  bgColor: string;
  isDragOver: boolean;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onTaskClick: (task: Task) => void;
  onMoveToStatus?: (taskId: string, newStatus: TaskStatus) => void;
}

export function KanbanColumn({
  title,
  tasks,
  color,
  bgColor,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onTaskClick,
  onMoveToStatus
}: KanbanColumnProps) {
  return (
    <div
      data-ev-id="ev_29cd8b53e3"
      className={`flex-shrink-0 w-[280px] sm:w-72 flex flex-col rounded-xl border transition-all snap-center ${
        isDragOver
          ? 'border-primary border-2 bg-primary/5 scale-[1.02]'
          : 'border-border bg-card'
      }`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Column Header */}
      <div data-ev-id="ev_a38b3e5753" className={`p-3 rounded-t-xl ${bgColor}`}>
        <div data-ev-id="ev_cbe366b78e" className="flex items-center justify-between">
          <h3 data-ev-id="ev_a1bfd4ac70" className={`font-semibold text-sm sm:text-base ${color}`}>
            {title}
          </h3>
          <span
            data-ev-id="ev_7bb7d5795b"
            className={`px-2 py-0.5 rounded-full text-xs sm:text-sm font-medium ${bgColor} ${color}`}
          >
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks Container */}
      <div data-ev-id="ev_bf372fa2ab" className="flex-1 p-2 flex flex-col gap-2 overflow-y-auto max-h-[400px] sm:max-h-[500px]">
        {tasks.length === 0 ? (
          <div data-ev-id="ev_9074c2aa3b" className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div data-ev-id="ev_84eefb444c" className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center mb-3`}>
              <Inbox className={`w-6 h-6 ${color} opacity-60`} />
            </div>
            <p data-ev-id="ev_02280868f4" className="text-sm text-muted-foreground">
              Keine Aufgaben
            </p>
            <p data-ev-id="ev_d259bc8d16" className="text-xs text-muted-foreground/70 mt-1 hidden sm:block">
              Ziehe Aufgaben hierher
            </p>
            <p data-ev-id="ev_mobile_hint" className="text-xs text-muted-foreground/70 mt-1 sm:hidden">
              Tippe auf ⋮ zum Verschieben
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              onDragStart={() => onDragStart(task)}
              onDragEnd={onDragEnd}
              onClick={() => onTaskClick(task)}
              onMoveToStatus={onMoveToStatus}
            />
          ))
        )}
      </div>
    </div>
  );
}
