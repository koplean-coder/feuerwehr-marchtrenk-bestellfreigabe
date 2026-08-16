import { Link } from 'react-router';
import { ListTodo, Flag, ArrowRight, Clock, Calendar, CheckSquare } from 'lucide-react';
import type { Task, TaskStep } from '@/hooks/useTasks';

interface MyTasksSectionProps {
  myAssignedTasks: Task[];
  myAssignedSteps: Array<{step: TaskStep;task: Task;}>;
  totalMyItems: number;
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700'
};

const priorityLabels: Record<string, string> = {
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
  urgent: 'Dringend'
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function MyTasksSection({ myAssignedTasks, myAssignedSteps, totalMyItems }: MyTasksSectionProps) {
  if (totalMyItems === 0) return null;

  return (
    <div data-ev-id="ev_4edc105437" className="bg-card rounded-xl border border-border p-5 mb-6">
      <div data-ev-id="ev_23ef58342b" className="flex items-center justify-between mb-4">
        <div data-ev-id="ev_17a11ff1b5" className="flex items-center gap-3">
          <div data-ev-id="ev_641a5136d6" className="p-2 bg-purple-100 rounded-lg">
            <ListTodo className="w-5 h-5 text-purple-600" />
          </div>
          <div data-ev-id="ev_84d9b00392">
            <h2 data-ev-id="ev_12ea73e677" className="font-semibold text-foreground">Meine Aufgaben</h2>
            <p data-ev-id="ev_800446e0db" className="text-xs text-muted-foreground">
              {totalMyItems} offene{totalMyItems === 1 ? ' Aufgabe' : ' Aufgaben'}
            </p>
          </div>
        </div>
        <Link
          to="/tasks"
          className="text-sm text-primary hover:underline flex items-center gap-1">
          Alle anzeigen
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div data-ev-id="ev_b3ad0334af" className="flex flex-col gap-3">
        {/* Tasks */}
        {myAssignedTasks.slice(0, 3).map((task) =>
        <Link
          key={task.id}
          to={`/tasks?taskId=${task.id}`}
          className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
            <div data-ev-id="ev_a288e4da4b" className="flex items-start justify-between gap-3">
              <div data-ev-id="ev_ecb1a9eead" className="flex-1">
                <div data-ev-id="ev_fd50327cbd" className="flex items-center gap-2 mb-1">
                  <span data-ev-id="ev_task_tag" className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">TASK</span>
                  <span data-ev-id="ev_2652b0ef78" className="font-medium text-foreground text-sm">{task.title}</span>
                  <span data-ev-id="ev_a018b2f610"
                className={`text-xs px-1.5 py-0.5 rounded-full ${priorityColors[task.priority]}`}>
                    <Flag className="w-3 h-3 inline mr-0.5" />
                    {priorityLabels[task.priority]}
                  </span>
                </div>
                <div data-ev-id="ev_6c11969d87" className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span data-ev-id="ev_cdee782b2d" className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(task.start_date)} - {formatDate(task.end_date)}
                  </span>
                  {task.steps && task.steps.length > 0 &&
                <span data-ev-id="ev_852fb2c9c8" className="flex items-center gap-1">
                      <CheckSquare className="w-3 h-3" />
                      {task.steps.filter((s) => s.is_completed).length}/{task.steps.length} Schritte
                    </span>
                }
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>
          </Link>
        )}

        {/* Steps */}
        {myAssignedSteps.slice(0, 3).map(({ step, task }) =>
        <Link
          key={step.id}
          to={`/tasks?taskId=${task.id}`}
          className="p-3 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors">
            <div data-ev-id="ev_88e76f7c74" className="flex items-start justify-between gap-3">
              <div data-ev-id="ev_a8fd603159" className="flex-1">
                <div data-ev-id="ev_91f4f3787a" className="flex items-center gap-2 mb-1">
                  <span data-ev-id="ev_731025ac75" className="text-xs bg-violet-200 text-violet-700 px-1.5 py-0.5 rounded">
                    Unterschritt
                  </span>
                  <span data-ev-id="ev_6cdf335f0a" className="font-medium text-foreground text-sm">{step.title}</span>
                </div>
                <div data-ev-id="ev_c49e92b30f" className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span data-ev-id="ev_37b8be4797">Aufgabe: {task.title}</span>
                  {step.due_date &&
                <span data-ev-id="ev_f5725ddf14" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Fällig: {formatDate(step.due_date)}
                    </span>
                }
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>
          </Link>
        )}
      </div>

      {totalMyItems > 6 &&
      <Link
        to="/tasks"
        className="block mt-3 text-center text-sm text-primary hover:underline">
          +{totalMyItems - 6} weitere anzeigen
        </Link>
      }
    </div>);

}