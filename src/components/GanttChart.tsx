import { useMemo, useState } from 'react';
import type { Task, TaskPriority, TaskStatus } from '@/hooks/useTasks';
import { ChevronLeft, ChevronRight, Link2 } from 'lucide-react';

interface GanttChartProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onProgressChange?: (taskId: string, progress: number) => void;
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-slate-400',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500'
};

const STATUS_OPACITY: Record<TaskStatus, string> = {
  todo: 'opacity-60',
  in_progress: 'opacity-100',
  completed: 'opacity-40',
  cancelled: 'opacity-20 line-through'
};

function getDaysBetween(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function GanttChart({ tasks, onTaskClick, onProgressChange }: GanttChartProps) {
  const [viewOffset, setViewOffset] = useState(0);
  const daysToShow = 28; // 4 weeks

  const { startDate, days } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = addDays(today, viewOffset);

    const daysArray = [];
    for (let i = 0; i < daysToShow; i++) {
      daysArray.push(addDays(start, i));
    }
    return { startDate: start, days: daysArray };
  }, [viewOffset]);

  const endDate = addDays(startDate, daysToShow - 1);

  // Group days by week
  const weeks = useMemo(() => {
    const weekMap = new Map<number, Date[]>();
    days.forEach((day) => {
      const weekNum = getWeekNumber(day);
      if (!weekMap.has(weekNum)) {
        weekMap.set(weekNum, []);
      }
      weekMap.get(weekNum)!.push(day);
    });
    return Array.from(weekMap.entries());
  }, [days]);

  function getTaskPosition(task: Task) {
    const taskStart = new Date(task.start_date);
    const taskEnd = new Date(task.end_date);

    const visibleStart = taskStart < startDate ? startDate : taskStart;
    const visibleEnd = taskEnd > endDate ? endDate : taskEnd;

    if (visibleStart > endDate || visibleEnd < startDate) {
      return null; // Task not visible in current view
    }

    const startOffset = getDaysBetween(startDate, visibleStart) - 1;
    const duration = getDaysBetween(visibleStart, visibleEnd);

    return {
      left: startOffset / daysToShow * 100,
      width: duration / daysToShow * 100,
      startsBeforeView: taskStart < startDate,
      endsAfterView: taskEnd > endDate
    };
  }

  function isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  // Find dependency lines
  function getDependencyLine(task: Task) {
    if (!task.depends_on) return null;
    const dependentTask = tasks.find((t) => t.id === task.depends_on);
    if (!dependentTask) return null;

    const depPos = getTaskPosition(dependentTask);
    const taskPos = getTaskPosition(task);

    if (!depPos || !taskPos) return null;

    return {
      from: depPos.left + depPos.width,
      to: taskPos.left
    };
  }

  return (
    <div data-ev-id="ev_e4b5350d25" className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header Controls */}
      <div data-ev-id="ev_5682e50003" className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div data-ev-id="ev_4177440b65" className="flex items-center gap-2">
          <button data-ev-id="ev_1aaf313896"
          onClick={() => setViewOffset((v) => v - 7)}
          className="p-2 hover:bg-muted rounded-lg transition-colors">

            <ChevronLeft className="w-5 h-5" />
          </button>
          <button data-ev-id="ev_c0810923d4"
          onClick={() => setViewOffset(0)}
          className="px-3 py-1.5 text-sm font-medium hover:bg-muted rounded-lg transition-colors">

            Heute
          </button>
          <button data-ev-id="ev_e7f47dfe61"
          onClick={() => setViewOffset((v) => v + 7)}
          className="p-2 hover:bg-muted rounded-lg transition-colors">

            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div data-ev-id="ev_3038c6c9f7" className="text-sm text-muted-foreground">
          {formatDate(startDate)} - {formatDate(endDate)}
        </div>
      </div>

      {/* Timeline Header */}
      <div data-ev-id="ev_967c2b8ba3" className="border-b border-border">
        {/* Week row */}
        <div data-ev-id="ev_7a5e0e05f8" className="flex border-b border-border">
          <div data-ev-id="ev_b3f094f729" className="w-64 flex-shrink-0 p-2 bg-muted/50 border-r border-border" />
          {weeks.map(([weekNum, weekDays]) =>
          <div data-ev-id="ev_45f7df202c"
          key={weekNum}
          className="flex-shrink-0 text-center text-xs font-medium text-muted-foreground p-1 bg-muted/50 border-r border-border"
          style={{ width: `${weekDays.length / daysToShow * 100}%` }}>

              KW {weekNum}
            </div>
          )}
        </div>
        {/* Days row */}
        <div data-ev-id="ev_4ee12e0456" className="flex">
          <div data-ev-id="ev_60bb6e9da8" className="w-64 flex-shrink-0 p-2 text-sm font-medium text-foreground bg-muted/30 border-r border-border">
            Aufgabe
          </div>
          <div data-ev-id="ev_fa14d677a0" className="flex-1 flex">
            {days.map((day, i) =>
            <div data-ev-id="ev_bc65be17c0"
            key={i}
            className={`flex-1 text-center text-xs p-1 border-r border-border last:border-r-0 ${
            isToday(day) ? 'bg-primary/20 font-bold text-primary' :
            isWeekend(day) ? 'bg-muted/50 text-muted-foreground' : 'text-muted-foreground'}`
            }>

                <div data-ev-id="ev_50c3c4b9a0">{day.toLocaleDateString('de-DE', { weekday: 'short' })}</div>
                <div data-ev-id="ev_20adc707c9">{day.getDate()}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Rows */}
      <div data-ev-id="ev_c438bac7f0" className="divide-y divide-border">
        {tasks.length === 0 ?
        <div data-ev-id="ev_0481a42ab8" className="p-8 text-center text-muted-foreground">
            Keine Aufgaben vorhanden
          </div> :

        tasks.map((task) => {
          const position = getTaskPosition(task);
          const depLine = getDependencyLine(task);

          return (
            <div data-ev-id="ev_c8b8cf2af6" key={task.id} className="flex hover:bg-muted/30 transition-colors">
                {/* Task Info */}
                <div data-ev-id="ev_7eb76e14cd"
              className="w-64 flex-shrink-0 p-3 border-r border-border cursor-pointer hover:bg-muted/50"
              onClick={() => onTaskClick(task)}>

                  <div data-ev-id="ev_44d1ccff99" className="flex items-center gap-2">
                    <div data-ev-id="ev_61ca0912d5" className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority]}`} />
                    <span data-ev-id="ev_670d3351c0" className={`font-medium text-sm truncate ${STATUS_OPACITY[task.status]}`}>
                      {task.title}
                    </span>
                  </div>
                  {task.assignee &&
                <div data-ev-id="ev_bd5e966aa3" className="text-xs text-muted-foreground mt-1 truncate">
                      {task.assignee.full_name}
                    </div>
                }
                  {task.depends_on &&
                <div data-ev-id="ev_4ac78112f3" className="flex items-center gap-1 text-xs text-primary mt-1">
                      <Link2 className="w-3 h-3" />
                      <span data-ev-id="ev_589cb9018e" className="truncate">{task.dependency?.title}</span>
                    </div>
                }
                </div>
                
                {/* Gantt Bar */}
                <div data-ev-id="ev_893e5672ef" className="flex-1 relative h-16">
                  {/* Grid lines */}
                  <div data-ev-id="ev_16c609025c" className="absolute inset-0 flex">
                    {days.map((day, i) =>
                  <div data-ev-id="ev_ef390ed7f2"
                  key={i}
                  className={`flex-1 border-r border-border last:border-r-0 ${
                  isToday(day) ? 'bg-primary/10' : isWeekend(day) ? 'bg-muted/30' : ''}`
                  } />

                  )}
                  </div>
                  
                  {/* Dependency line */}
                  {depLine && depLine.to > depLine.from &&
                <div data-ev-id="ev_4fd03f5953"
                className="absolute top-1/2 h-0.5 bg-primary/40 -translate-y-1/2"
                style={{
                  left: `${depLine.from}%`,
                  width: `${depLine.to - depLine.from}%`
                }} />

                }
                  
                  {/* Task bar */}
                  {position &&
                <div data-ev-id="ev_e6e763f986"
                className={`absolute top-3 h-10 rounded-lg cursor-pointer transition-all hover:brightness-110 ${
                PRIORITY_COLORS[task.priority]} ${
                STATUS_OPACITY[task.status]} ${
                position.startsBeforeView ? 'rounded-l-none' : ''} ${
                position.endsAfterView ? 'rounded-r-none' : ''}`}
                style={{
                  left: `${position.left}%`,
                  width: `${position.width}%`,
                  minWidth: '20px'
                }}
                onClick={() => onTaskClick(task)}>

                      {/* Progress bar */}
                      <div data-ev-id="ev_9216995678"
                  className="absolute inset-0 bg-white/30 rounded-lg origin-left"
                  style={{ transform: `scaleX(${task.progress / 100})` }} />

                      {/* Progress text */}
                      <div data-ev-id="ev_c2b6bdd0bf" className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
                        {task.progress}%
                      </div>
                    </div>
                }
                </div>
              </div>);

        })
        }
      </div>

      {/* Legend */}
      <div data-ev-id="ev_1790ef9a84" className="p-3 border-t border-border bg-muted/30 flex flex-wrap gap-4 text-xs">
        <div data-ev-id="ev_307d926b5a" className="flex items-center gap-2">
          <span data-ev-id="ev_64f82e3ee9" className="text-muted-foreground">Priorität:</span>
          <span data-ev-id="ev_a5f85fd904" className="flex items-center gap-1"><span data-ev-id="ev_81ecde6010" className="w-2 h-2 rounded-full bg-slate-400" /> Niedrig</span>
          <span data-ev-id="ev_f9208af0e7" className="flex items-center gap-1"><span data-ev-id="ev_20955c8947" className="w-2 h-2 rounded-full bg-blue-500" /> Mittel</span>
          <span data-ev-id="ev_aa21828787" className="flex items-center gap-1"><span data-ev-id="ev_60b650fb55" className="w-2 h-2 rounded-full bg-orange-500" /> Hoch</span>
          <span data-ev-id="ev_ad4ae84b9b" className="flex items-center gap-1"><span data-ev-id="ev_62426c8c6f" className="w-2 h-2 rounded-full bg-red-500" /> Dringend</span>
        </div>
      </div>
    </div>);

}