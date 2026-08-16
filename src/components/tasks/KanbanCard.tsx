import { useState } from 'react';
import { Flag, Calendar, User, CheckSquare, GripVertical, MoreVertical, ArrowRight, X } from 'lucide-react';
import type { Task, TaskStatus } from '@/hooks/useTasks';

interface KanbanCardProps {
  task: Task;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
  onMoveToStatus?: (taskId: string, newStatus: TaskStatus) => void;
}

const priorityConfig = {
  low: { color: 'bg-gray-100 text-gray-600', stripe: 'bg-gray-400', label: 'Niedrig' },
  medium: { color: 'bg-blue-100 text-blue-600', stripe: 'bg-blue-500', label: 'Mittel' },
  high: { color: 'bg-orange-100 text-orange-600', stripe: 'bg-orange-500', label: 'Hoch' },
  urgent: { color: 'bg-red-100 text-red-600', stripe: 'bg-red-500', label: 'Dringend' }
};

const statusOptions: {id: TaskStatus;label: string;color: string;}[] = [
{ id: 'todo', label: 'Zu erledigen', color: 'bg-gray-500' },
{ id: 'in_progress', label: 'In Arbeit', color: 'bg-blue-500' },
{ id: 'completed', label: 'Erledigt', color: 'bg-green-500' },
{ id: 'cancelled', label: 'Abgebrochen', color: 'bg-red-500' }];


function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit'
  });
}

export function KanbanCard({ task, onDragStart, onDragEnd, onClick, onMoveToStatus }: KanbanCardProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const priority = priorityConfig[task.priority];
  const completedSteps = task.steps?.filter((s) => s.completed).length || 0;
  const totalSteps = task.steps?.length || 0;
  const isOverdue = new Date(task.end_date) < new Date() && task.status !== 'completed';

  const handleMoveClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowMoveMenu(true);
  };

  const handleMoveToStatus = (newStatus: TaskStatus) => {
    if (onMoveToStatus && newStatus !== task.status) {
      onMoveToStatus(task.id, newStatus);
    }
    setShowMoveMenu(false);
  };

  const handleCloseMenu = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setShowMoveMenu(false);
  };

  return (
    <div
      data-ev-id="ev_57262d7c0a"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="bg-background border border-border rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/50 transition-all group overflow-hidden relative">

      {/* Mobile Move Menu Overlay */}
      {showMoveMenu &&
      <div data-ev-id="ev_d00cdb9f32"
      className="absolute inset-0 bg-background/95 backdrop-blur-sm z-20 rounded-lg flex flex-col p-3"
      onClick={(e) => e.stopPropagation()}>

          <div data-ev-id="ev_762edc265a" className="flex items-center justify-between mb-2">
            <span data-ev-id="ev_c638505d16" className="text-xs font-semibold text-muted-foreground">Verschieben nach:</span>
            <button data-ev-id="ev_62f79d3a3c"
          onClick={handleCloseMenu}
          onTouchEnd={handleCloseMenu}
          className="p-2 hover:bg-muted rounded-full touch-manipulation">

              <X className="w-4 h-4" />
            </button>
          </div>
          <div data-ev-id="ev_296887805f" className="flex flex-col gap-1.5">
            {statusOptions.map((status) =>
          <button data-ev-id="ev_55b057c4c1"
          key={status.id}
          onClick={() => handleMoveToStatus(status.id)}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleMoveToStatus(status.id);
          }}
          disabled={status.id === task.status}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
          status.id === task.status ?
          'bg-muted text-muted-foreground cursor-not-allowed opacity-50' :
          'bg-muted/50 hover:bg-muted text-foreground'}`
          }>

                <div data-ev-id="ev_6cffb698d2" className={`w-2 h-2 rounded-full ${status.color}`} />
                {status.label}
                {status.id === task.status && <span data-ev-id="ev_93cd8f94a8" className="ml-auto text-xs">(aktuell)</span>}
              </button>
          )}
          </div>
        </div>
      }

      {/* Priority Stripe */}
      <div data-ev-id="ev_7f87f3c592" className={`absolute left-0 top-0 bottom-0 w-1 ${priority.stripe}`} />
      
      <div data-ev-id="ev_5ef8f66b55" className="p-3 pl-4">
        {/* Drag Handle & Move Button */}
        <div data-ev-id="ev_7f87f3c592" className="flex items-start gap-2">
          {/* Desktop: Drag Handle */}
          <GripVertical className="w-4 h-4 text-muted-foreground/50 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
          
          {/* Mobile: Move Button */}
          {onMoveToStatus &&
          <button data-ev-id="ev_890e97cbf6"
          onClick={handleMoveClick}
          onTouchEnd={(e) => {
            e.preventDefault();
            setShowMoveMenu(true);
          }}
          className="sm:hidden p-2 -ml-1 -mt-0.5 rounded hover:bg-muted transition-colors touch-manipulation"
          title="Verschieben">

              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          }
          
          <div data-ev-id="ev_c692bb8866" className="flex-1 min-w-0">
            {/* Title */}
            <h4 data-ev-id="ev_1d4377c8af" className="font-medium text-foreground text-sm line-clamp-2 mb-2">
              {task.title}
            </h4>

            {/* Meta Info */}
            <div data-ev-id="ev_d8334ae51f" className="flex flex-wrap gap-2 text-xs">
              {/* Priority */}
              <span data-ev-id="ev_86b842d52a" className={`px-1.5 py-0.5 rounded ${priority.color} flex items-center gap-1`}>
                <Flag className="w-3 h-3" />
                {priority.label}
              </span>

              {/* Due Date */}
              <span
                data-ev-id="ev_179df827de"
                className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
                isOverdue ? 'bg-red-100 text-red-600' : 'bg-muted text-muted-foreground'}`
                }>

                <Calendar className="w-3 h-3" />
                {formatDate(task.end_date)}
              </span>
            </div>

            {/* Bottom Row */}
            <div data-ev-id="ev_8a465da575" className="flex items-center justify-between mt-2 pt-2 border-t border-border">
              {/* Assignee */}
              {task.assignee ?
              <div data-ev-id="ev_028a416eb1" className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div data-ev-id="ev_35466cbc44" className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-3 h-3 text-primary" />
                  </div>
                  <span data-ev-id="ev_d832adccb3" className="truncate max-w-[80px]">{task.assignee.full_name}</span>
                </div> :

              <div data-ev-id="ev_4dec3e2bb6" />
              }

              {/* Steps Progress */}
              {totalSteps > 0 &&
              <div data-ev-id="ev_6cbacffb4b" className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckSquare className="w-3 h-3" />
                  <span data-ev-id="ev_ce5d70f022">
                    {completedSteps}/{totalSteps}
                  </span>
                </div>
              }
            </div>

            {/* Progress Bar */}
            {task.progress > 0 &&
            <div data-ev-id="ev_dd82b1b090" className="mt-2">
                <div data-ev-id="ev_b1b91113c9" className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                  data-ev-id="ev_1630a82b10"
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${task.progress}%` }} />

                </div>
              </div>
            }

            {/* Description Preview on Hover */}
            {task.description &&
            <div data-ev-id="ev_465f79efbe" className="mt-2 max-h-0 overflow-hidden opacity-0 group-hover:max-h-20 group-hover:opacity-100 transition-all duration-300 hidden sm:block">
                <p data-ev-id="ev_af13ba14ae" className="text-xs text-muted-foreground line-clamp-3 pt-2 border-t border-border/50">
                  {task.description}
                </p>
              </div>
            }
          </div>
        </div>
      </div>
    </div>);

}