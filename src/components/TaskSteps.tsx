import { useState } from 'react';
import { Plus, Trash2, Check, User, UserPlus } from 'lucide-react';
import type { TaskStep } from '@/hooks/useTasks';

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface TaskStepsProps {
  steps: TaskStep[];
  taskId: string;
  taskCreatorId: string;
  currentUserId: string | undefined;
  canEdit: boolean;
  profiles: Profile[];
  onAddStep: (taskId: string, title: string, assignedTo?: string) => Promise<{error: Error | null;}>;
  onToggleStep: (stepId: string, completed: boolean) => Promise<{error: Error | null;}>;
  onDeleteStep: (stepId: string) => Promise<{error: Error | null;}>;
  onAssignStep: (stepId: string, assignedTo: string | null, taskId: string) => Promise<{error: Error | null;}>;
}

export function TaskSteps({
  steps,
  taskId,
  taskCreatorId,
  currentUserId,
  canEdit,
  profiles,
  onAddStep,
  onToggleStep,
  onDeleteStep,
  onAssignStep
}: TaskStepsProps) {
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepAssignee, setNewStepAssignee] = useState('');
  const [addingStep, setAddingStep] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;

  // Check if current user is the task creator
  const isTaskCreator = currentUserId === taskCreatorId;

  // Check if user can toggle a specific step
  function canToggleStep(step: TaskStep): boolean {
    if (!currentUserId) return false;
    // Task creator can toggle any step
    if (isTaskCreator) return true;
    // Admin/Kommandant can toggle any step (canEdit means they have full control)
    if (canEdit) return true;
    // Assigned user can toggle their own step
    if (step.assigned_to === currentUserId) return true;
    // If step has no assignment, only creator/admin can toggle
    return false;
  }

  async function handleAddStep() {
    if (!newStepTitle.trim()) return;

    setAddingStep(true);
    await onAddStep(taskId, newStepTitle.trim(), newStepAssignee || undefined);
    setNewStepTitle('');
    setNewStepAssignee('');
    setAddingStep(false);
  }

  async function handleToggleStep(step: TaskStep) {
    if (!canToggleStep(step)) return;
    setTogglingId(step.id);
    await onToggleStep(step.id, !step.completed);
    setTogglingId(null);
  }

  async function handleDeleteStep(stepId: string) {
    setDeletingId(stepId);
    await onDeleteStep(stepId);
    setDeletingId(null);
  }

  async function handleAssignStep(stepId: string, assignedTo: string) {
    setAssigningId(stepId);
    await onAssignStep(stepId, assignedTo || null, taskId);
    setAssigningId(null);
  }

  function formatDateTime(dateString: string | null) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <div data-ev-id="ev_386e2edcd7" className="mt-4">
      {/* Header */}
      <div data-ev-id="ev_5b1f83625d" className="flex items-center justify-between mb-3">
        <h4 data-ev-id="ev_42570c4178" className="text-sm font-medium text-foreground flex items-center gap-2">
          <Check className="w-4 h-4" />
          Unterschritte
          {totalCount > 0 &&
          <span data-ev-id="ev_3fab5fc8e7" className="text-xs text-muted-foreground font-normal">
              ({completedCount}/{totalCount} erledigt)
            </span>
          }
        </h4>
      </div>

      {/* Progress bar for steps */}
      {totalCount > 0 &&
      <div data-ev-id="ev_c61898b316" className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
          <div data-ev-id="ev_2f92f38d8f"
        className="h-full bg-green-500 transition-all duration-300"
        style={{ width: `${totalCount > 0 ? completedCount / totalCount * 100 : 0}%` }} />

        </div>
      }

      {/* Steps list */}
      <div data-ev-id="ev_a9189cf2be" className="flex flex-col gap-2">
        {steps.map((step) => {
          const canToggle = canToggleStep(step);
          const isAssignedToMe = step.assigned_to === currentUserId;

          return (
            <div data-ev-id="ev_f6455f2390"
            key={step.id}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
            step.completed ?
            'bg-green-50 border-green-200' :
            isAssignedToMe ?
            'bg-blue-50 border-blue-200' :
            'bg-muted/30 border-border hover:bg-muted/50'}`
            }>

              {/* Checkbox */}
              <button data-ev-id="ev_7432b700db"
              type="button"
              onClick={() => handleToggleStep(step)}
              disabled={togglingId === step.id || !canToggle}
              className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-colors ${
              step.completed ?
              'bg-green-500 border-green-500 text-white' :
              canToggle ?
              'border-muted-foreground/40 hover:border-primary' :
              'border-muted-foreground/20 cursor-not-allowed'} ${
              togglingId === step.id ? 'opacity-50' : ''}`}
              title={canToggle ? step.completed ? 'Als unerledigt markieren' : 'Als erledigt markieren' : 'Sie können diesen Schritt nicht bearbeiten'}>

                {step.completed && <Check className="w-3 h-3" />}
              </button>

              {/* Content */}
              <div data-ev-id="ev_11f851d95a" className="flex-1 min-w-0">
                <p data-ev-id="ev_cbb236438d" className={`text-sm ${step.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  {step.title}
                </p>

                {/* Assignment info */}
                {step.assignedToUser &&
                <p data-ev-id="ev_48f4d86f6c" className={`text-xs mt-1 flex items-center gap-1 ${
                isAssignedToMe ? 'text-blue-600 font-medium' : 'text-muted-foreground'}`
                }>
                    <User className="w-3 h-3" />
                    Zugewiesen: {step.assignedToUser.full_name}
                    {isAssignedToMe && ' (Sie)'}
                  </p>
                }

                {/* Completion info */}
                {step.completed && step.completedByUser &&
                <p data-ev-id="ev_50867253ea" className="text-xs text-green-600 mt-1">
                    ✓ Erledigt von {step.completedByUser.full_name} am {formatDateTime(step.completed_at)}
                  </p>
                }
              </div>

              {/* Assignment selector - only for task creator/admin */}
              {canEdit && !step.completed &&
              <div data-ev-id="ev_45d0038854" className="flex-shrink-0">
                  <select data-ev-id="ev_8e174879e1"
                value={step.assigned_to || ''}
                onChange={(e) => handleAssignStep(step.id, e.target.value)}
                disabled={assigningId === step.id}
                className="text-xs px-2 py-1 bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring min-w-[120px]"
                title="Person zuweisen">

                    <option data-ev-id="ev_da36b3eb0a" value="">-- Zuweisen --</option>
                    {profiles.map((profile) =>
                  <option data-ev-id="ev_892b4781af" key={profile.id} value={profile.id}>
                        {profile.full_name}
                      </option>
                  )}
                  </select>
                </div>
              }

              {/* Delete button - only for task creator/admin */}
              {canEdit &&
              <button data-ev-id="ev_387d2a3c16"
              type="button"
              onClick={() => handleDeleteStep(step.id)}
              disabled={deletingId === step.id}
              className="flex-shrink-0 p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded transition-colors">

                  {deletingId === step.id ?
                <div data-ev-id="ev_0dbb539d90" className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /> :

                <Trash2 className="w-4 h-4" />
                }
                </button>
              }
            </div>);

        })}

        {/* Empty state */}
        {steps.length === 0 &&
        <p data-ev-id="ev_13d3a353c8" className="text-sm text-muted-foreground text-center py-4">
            Keine Unterschritte vorhanden
          </p>
        }
      </div>

      {/* Add step form - only for task creator/admin */}
      {canEdit &&
      <div data-ev-id="ev_0cd28027a3" className="mt-3 flex flex-col gap-2">
          <div data-ev-id="ev_5f1e70e598" className="flex gap-2">
            <input data-ev-id="ev_5d7f95d8ca"
          type="text"
          value={newStepTitle}
          onChange={(e) => setNewStepTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newStepTitle.trim() && !addingStep) {
              e.preventDefault();
              handleAddStep();
            }
          }}
          placeholder="Neuen Schritt hinzufügen..."
          className="flex-1 px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />

            <select data-ev-id="ev_03ca04869e"
          value={newStepAssignee}
          onChange={(e) => setNewStepAssignee(e.target.value)}
          className="px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring min-w-[150px]">

              <option data-ev-id="ev_a5a2ea64f1" value="">-- Zuweisen an --</option>
              {profiles.map((profile) =>
            <option data-ev-id="ev_2f37d2b370" key={profile.id} value={profile.id}>
                  {profile.full_name}
                </option>
            )}
            </select>
            <button data-ev-id="ev_76f2026815"
          type="button"
          onClick={handleAddStep}
          disabled={!newStepTitle.trim() || addingStep}
          className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1">

              {addingStep ?
            <div data-ev-id="ev_01fd965c45" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :

            <Plus className="w-4 h-4" />
            }
              Hinzufügen
            </button>
          </div>
        </div>
      }
    </div>);

}