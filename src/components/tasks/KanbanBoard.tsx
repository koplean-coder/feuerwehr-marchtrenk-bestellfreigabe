import { useState } from 'react';
import { KanbanColumn } from './KanbanColumn';
import type { Task, TaskStatus } from '@/hooks/useTasks';

interface KanbanBoardProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onTaskClick: (task: Task) => void;
}

interface Column {
  id: TaskStatus;
  title: string;
  color: string;
  bgColor: string;
}

const columns: Column[] = [
{ id: 'todo', title: 'Zu erledigen', color: 'text-gray-600', bgColor: 'bg-gray-100' },
{ id: 'in_progress', title: 'In Arbeit', color: 'text-blue-600', bgColor: 'bg-blue-100' },
{ id: 'completed', title: 'Erledigt', color: 'text-green-600', bgColor: 'bg-green-100' },
{ id: 'cancelled', title: 'Abgebrochen', color: 'text-red-600', bgColor: 'bg-red-100' }];


export function KanbanBoard({ tasks, onStatusChange, onTaskClick }: KanbanBoardProps) {
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  const handleDragStart = (task: Task) => {
    setDraggingTask(task);
  };

  const handleDragEnd = () => {
    setDraggingTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    if (draggingTask && draggingTask.status !== newStatus) {
      await onStatusChange(draggingTask.id, newStatus);
    }
    setDraggingTask(null);
    setDragOverColumn(null);
  };

  // Mobile: Handle status change via menu
  const handleMoveToStatus = async (taskId: string, newStatus: TaskStatus) => {
    await onStatusChange(taskId, newStatus);
  };

  return (
    <div data-ev-id="ev_752b2fea99" className="relative">
      {/* Mobile scroll hint */}
      <div
        data-ev-id="ev_82c763beff"
        className="sm:hidden absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />


      {/* Mobile instruction */}
      <p data-ev-id="ev_4f55c07d0c" className="sm:hidden text-xs text-muted-foreground mb-2 text-center">
        Wische horizontal • Tippe auf ⋮ zum Verschieben
      </p>

      <div
        data-ev-id="ev_752b2fea99"
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 min-h-[450px] sm:min-h-[600px] snap-x snap-mandatory sm:snap-none -mx-4 px-4 sm:mx-0 sm:px-0">

        {columns.map((column) =>
        <KanbanColumn
          key={column.id}
          title={column.title}
          status={column.id}
          tasks={getTasksByStatus(column.id)}
          color={column.color}
          bgColor={column.bgColor}
          isDragOver={dragOverColumn === column.id}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, column.id)}
          onDrop={(e) => handleDrop(e, column.id)}
          onTaskClick={onTaskClick}
          onMoveToStatus={handleMoveToStatus} />

        )}
      </div>
    </div>);

}