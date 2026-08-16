import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

export interface TaskStep {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  sort_order: number;
  created_at: string;
  // Joined data
  completedByUser?: {
    id: string;
    full_name: string;
  } | null;
  assignedToUser?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  progress: number;
  priority: TaskPriority;
  category: string | null;
  status: TaskStatus;
  assigned_to: string | null;
  depends_on: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Recurrence fields
  is_recurring: boolean;
  recurrence_type: RecurrenceType | null;
  recurrence_interval: number | null;
  parent_task_id: string | null;
  // Visibility
  visible_to_all: boolean;
  // Joined data
  assignee?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  dependency?: {
    id: string;
    title: string;
  } | null;
  steps?: TaskStep[];
}

export interface CreateTaskData {
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  priority?: TaskPriority;
  category?: string;
  assigned_to?: string;
  depends_on?: string;
  steps?: { title: string; assigned_to?: string }[];
  // Recurrence fields
  is_recurring?: boolean;
  recurrence_type?: RecurrenceType;
  recurrence_interval?: number;
  // Visibility
  visible_to_all?: boolean;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  progress?: number;
  priority?: TaskPriority;
  category?: string;
  status?: TaskStatus;
  assigned_to?: string | null;
  depends_on?: string | null;
  // Recurrence fields
  is_recurring?: boolean;
  recurrence_type?: RecurrenceType | null;
  recurrence_interval?: number | null;
  // Visibility
  visible_to_all?: boolean;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin, isKommandant, isBereichsleiter } = useAuth();

  // Bereichsleiter, Admin and Kommandant can create/manage tasks
  const canManageTasks = isAdmin || isKommandant || isBereichsleiter;

  useEffect(() => {
    fetchTasks();
  }, []);

  // Send notification when task is assigned
  async function sendTaskAssignmentNotification(params: {
    taskTitle: string;
    taskDescription?: string;
    taskStartDate: string;
    taskEndDate: string;
    taskPriority: string;
    assignedToId: string;
    assignerName: string;
  }) {
    if (!supabase) return false;

    try {
      // Get the assigned user's profile
      const { data: assigneeProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', params.assignedToId)
        .single();

      if (!assigneeProfile?.email) {
        console.error('No email found for assignee');
        return false;
      }

      const priorityLabels: Record<string, string> = {
        low: 'Niedrig',
        medium: 'Mittel',
        high: 'Hoch',
        urgent: 'Dringend'
      };

      const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      };

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!anonKey) {
        console.error('ANON_KEY not available');
        return false;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
          },
          body: JSON.stringify({
            type: 'task_assigned',
            taskTitle: params.taskTitle,
            taskDescription: params.taskDescription || '',
            taskStartDate: formatDate(params.taskStartDate),
            taskEndDate: formatDate(params.taskEndDate),
            taskPriority: priorityLabels[params.taskPriority] || params.taskPriority,
            recipientEmail: assigneeProfile.email,
            recipientName: assigneeProfile.full_name || 'Benutzer',
            assignerName: params.assignerName,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Task notification error:', response.status, errorText);
        return false;
      }

      console.log('Task assignment notification sent');
      return true;
    } catch (error) {
      console.error('Task notification exception:', error);
      return false;
    }
  }

  async function fetchTasks() {
    if (!supabase) return;

    // Fetch tasks
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .order('start_date', { ascending: true });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      setLoading(false);
      return;
    }

    // Fetch profiles for assignee info
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, email');

    const profilesMap = new Map(
      (profilesData ?? []).map(p => [p.id, p])
    );

    // Create tasks map for dependency lookup
    const tasksMap = new Map(
      (tasksData ?? []).map(t => [t.id, t])
    );

    // Fetch all steps
    const { data: stepsData } = await supabase
      .from('task_steps')
      .select('*')
      .order('sort_order', { ascending: true });

    // Group steps by task_id and enrich with user info
    const stepsByTaskId = new Map<string, TaskStep[]>();
    (stepsData ?? []).forEach(step => {
      const enrichedStep: TaskStep = {
        ...step,
        completedByUser: step.completed_by ? {
          id: step.completed_by,
          full_name: profilesMap.get(step.completed_by)?.full_name || 'Unbekannt'
        } : null,
        assignedToUser: step.assigned_to ? profilesMap.get(step.assigned_to) || null : null
      };
      const existing = stepsByTaskId.get(step.task_id) || [];
      existing.push(enrichedStep);
      stepsByTaskId.set(step.task_id, existing);
    });

    // Enrich tasks with assignee, dependency, and steps
    const enrichedTasks: Task[] = (tasksData ?? []).map(task => ({
      ...task,
      assignee: task.assigned_to ? profilesMap.get(task.assigned_to) || null : null,
      dependency: task.depends_on ? {
        id: task.depends_on,
        title: tasksMap.get(task.depends_on)?.title || 'Unbekannt'
      } : null,
      steps: stepsByTaskId.get(task.id) || []
    }));

    setTasks(enrichedTasks);
    setLoading(false);
  }

  async function createTask(taskData: CreateTaskData) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };

    const { steps, ...taskDataWithoutSteps } = taskData;

    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert({
        ...taskDataWithoutSteps,
        created_by: user.id
      })
      .select('id')
      .single();

    if (error) {
      return { error };
    }

    // Get creator's name once for all notifications
    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const assignerName = creatorProfile?.full_name || 'Administrator';
    const skipEmailNotifications = taskData.visible_to_all === true;

    // Create steps if provided
    if (steps && steps.length > 0 && newTask) {
      const stepsToInsert = steps.map((step, index) => ({
        task_id: newTask.id,
        title: step.title,
        sort_order: index + 1,
        assigned_to: step.assigned_to || null
      }));

      const { data: createdSteps, error: stepsError } = await supabase
        .from('task_steps')
        .insert(stepsToInsert)
        .select('id, title, assigned_to');

      if (stepsError) {
        console.error('Error creating steps:', stepsError);
      } else if (createdSteps) {
        // Send notifications for assigned steps
        for (const step of createdSteps) {
          if (step.assigned_to) {
            // Email notification (skip if visible_to_all)
            if (!skipEmailNotifications) {
              await sendStepAssignmentNotification({
                stepTitle: step.title,
                taskTitle: taskData.title,
                assignedToId: step.assigned_to,
                assignerName
              });
            }
            // In-app notification (always send)
            await createInAppStepNotification({
              userId: step.assigned_to,
              taskId: newTask.id,
              stepId: step.id,
              stepTitle: step.title,
              taskTitle: taskData.title,
              assignerName
            });
            // Push notification for step
            await sendStepPushNotification({
              userId: step.assigned_to,
              taskId: newTask.id,
              stepTitle: step.title,
              taskTitle: taskData.title,
              assignerName
            });
          }
        }
      }
    }

    // Send notification if task is assigned to someone
    if (taskData.assigned_to && newTask) {
      // Email notification (skip if visible_to_all)
      if (!skipEmailNotifications) {
        await sendTaskAssignmentNotification({
          taskTitle: taskData.title,
          taskDescription: taskData.description,
          taskStartDate: taskData.start_date,
          taskEndDate: taskData.end_date,
          taskPriority: taskData.priority || 'medium',
          assignedToId: taskData.assigned_to,
          assignerName
        });
      }
      // In-app notification (always send)
      await createInAppTaskNotification({
        userId: taskData.assigned_to,
        taskId: newTask.id,
        taskTitle: taskData.title,
        assignerName
      });
      // Push notification (always send)
      await sendTaskPushNotification({
        userId: taskData.assigned_to,
        taskId: newTask.id,
        taskTitle: taskData.title,
        assignerName
      });
    }

    fetchTasks();
    return { error: null };
  }

  async function updateTask(taskId: string, taskData: UpdateTaskData, previousAssignedTo?: string | null) {
    if (!supabase || !user) return { error: new Error('Database not connected') };

    // Find the current task to check if it's recurring
    const currentTask = tasks.find(t => t.id === taskId);

    const { error } = await supabase
      .from('tasks')
      .update(taskData)
      .eq('id', taskId);

    if (!error) {
      // Check if task is being completed and is recurring
      if (taskData.status === 'completed' && currentTask?.is_recurring && currentTask.recurrence_type) {
        await createNextOccurrence(currentTask);
      }

      // Send notification if task is newly assigned to someone different
      if (taskData.assigned_to && taskData.assigned_to !== previousAssignedTo) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          const { data: creatorProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

          const assignerName = creatorProfile?.full_name || 'Administrator';

          // Email notification
          await sendTaskAssignmentNotification({
            taskTitle: taskData.title || task.title,
            taskDescription: taskData.description || task.description || undefined,
            taskStartDate: taskData.start_date || task.start_date,
            taskEndDate: taskData.end_date || task.end_date,
            taskPriority: taskData.priority || task.priority,
            assignedToId: taskData.assigned_to,
            assignerName
          });

          // In-app notification
          await createInAppTaskNotification({
            userId: taskData.assigned_to,
            taskId: taskId,
            taskTitle: taskData.title || task.title,
            assignerName
          });
          // Push notification
          await sendTaskPushNotification({
            userId: taskData.assigned_to,
            taskId: taskId,
            taskTitle: taskData.title || task.title,
            assignerName
          });
        }
      }
      fetchTasks();
    }
    return { error };
  }

  // Helper function to calculate next occurrence dates
  function calculateNextDates(
    currentStartDate: string,
    currentEndDate: string,
    recurrenceType: RecurrenceType,
    recurrenceInterval?: number | null
  ): { nextStartDate: string; nextEndDate: string } {
    const startDate = new Date(currentStartDate);
    const endDate = new Date(currentEndDate);
    const duration = endDate.getTime() - startDate.getTime();

    let daysToAdd = 0;
    switch (recurrenceType) {
      case 'daily':
        daysToAdd = 1;
        break;
      case 'weekly':
        daysToAdd = 7;
        break;
      case 'monthly': {
        startDate.setMonth(startDate.getMonth() + 1);
        const newEndDate = new Date(startDate.getTime() + duration);
        return {
          nextStartDate: startDate.toISOString().split('T')[0],
          nextEndDate: newEndDate.toISOString().split('T')[0]
        };
      }
      case 'quarterly': {
        startDate.setMonth(startDate.getMonth() + 3);
        const quarterlyEndDate = new Date(startDate.getTime() + duration);
        return {
          nextStartDate: startDate.toISOString().split('T')[0],
          nextEndDate: quarterlyEndDate.toISOString().split('T')[0]
        };
      }
      case 'yearly': {
        startDate.setFullYear(startDate.getFullYear() + 1);
        const yearlyEndDate = new Date(startDate.getTime() + duration);
        return {
          nextStartDate: startDate.toISOString().split('T')[0],
          nextEndDate: yearlyEndDate.toISOString().split('T')[0]
        };
      }
      case 'custom':
        daysToAdd = recurrenceInterval || 1;
        break;
    }

    const nextStartDate = new Date(startDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    const nextEndDate = new Date(nextStartDate.getTime() + duration);

    return {
      nextStartDate: nextStartDate.toISOString().split('T')[0],
      nextEndDate: nextEndDate.toISOString().split('T')[0]
    };
  }

  // Create next occurrence of a recurring task
  async function createNextOccurrence(completedTask: Task) {
    if (!supabase || !user || !completedTask.recurrence_type) return;

    const { nextStartDate, nextEndDate } = calculateNextDates(
      completedTask.start_date,
      completedTask.end_date,
      completedTask.recurrence_type,
      completedTask.recurrence_interval
    );

    // Determine the parent task ID (use original if this is already a child)
    const parentId = completedTask.parent_task_id || completedTask.id;

    // Create the new task occurrence
    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert({
        title: completedTask.title,
        description: completedTask.description,
        start_date: nextStartDate,
        end_date: nextEndDate,
        priority: completedTask.priority,
        category: completedTask.category,
        assigned_to: completedTask.assigned_to,
        created_by: completedTask.created_by,
        is_recurring: true,
        recurrence_type: completedTask.recurrence_type,
        recurrence_interval: completedTask.recurrence_interval,
        parent_task_id: parentId,
        progress: 0,
        status: 'todo'
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating next occurrence:', error);
      return;
    }

    // Copy steps from the completed task to the new task
    if (newTask && completedTask.steps && completedTask.steps.length > 0) {
      const stepsToInsert = completedTask.steps.map(step => ({
        task_id: newTask.id,
        title: step.title,
        sort_order: step.sort_order,
        assigned_to: step.assigned_to,
        completed: false,
        completed_by: null,
        completed_at: null
      }));

      await supabase.from('task_steps').insert(stepsToInsert);
    }

    // Send notification if task is assigned
    if (completedTask.assigned_to && newTask) {
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const assignerName = creatorProfile?.full_name || 'System';

      await createInAppTaskNotification({
        userId: completedTask.assigned_to,
        taskId: newTask.id,
        taskTitle: `${completedTask.title} (Wiederkehrend)`,
        assignerName
      });
    }
  }

  async function deleteTask(taskId: string) {
    if (!supabase) return { error: new Error('Database not connected') };

    // First, remove dependencies pointing to this task
    await supabase
      .from('tasks')
      .update({ depends_on: null })
      .eq('depends_on', taskId);

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (!error) {
      fetchTasks();
    }
    return { error };
  }

  async function updateProgress(taskId: string, progress: number) {
    const status: TaskStatus = progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'todo';
    return updateTask(taskId, { progress, status });
  }

  // Step management functions
  async function addStep(taskId: string, title: string, assignedTo?: string) {
    if (!supabase || !user) return { error: new Error('Database not connected') };

    // Get current max sort_order for this task
    const task = tasks.find(t => t.id === taskId);
    const maxOrder = Math.max(0, ...(task?.steps ?? []).map(s => s.sort_order));

    const { error } = await supabase
      .from('task_steps')
      .insert({
        task_id: taskId,
        title,
        sort_order: maxOrder + 1,
        assigned_to: assignedTo || null
      });

    if (!error && assignedTo && task) {
      // Send notification to assigned user
      const { data: assignerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      await sendStepAssignmentNotification({
        stepTitle: title,
        taskTitle: task.title,
        assignedToId: assignedTo,
        assignerName: assignerProfile?.full_name || 'Administrator'
      });
      // Push notification for step assignment
      await sendStepPushNotification({
        userId: assignedTo,
        taskId: taskId,
        stepTitle: title,
        taskTitle: task.title,
        assignerName: assignerProfile?.full_name || 'Administrator'
      });
    }

    if (!error && task) {
      // Recalculate progress after adding a new step
      // New step is not completed, so we add it to the count
      const newSteps = [...(task.steps || []), { id: 'temp', completed: false } as TaskStep];
      if (task.status !== 'completed') {
        const newProgress = calculateProgressFromSteps(newSteps);
        const newStatus: TaskStatus = newProgress > 0 ? 'in_progress' : 'todo';
        await supabase
          .from('tasks')
          .update({ progress: newProgress, status: newStatus })
          .eq('id', taskId);
      }
      fetchTasks();
    }
    return { error };
  }

  // Send notification for step assignment
  async function sendStepAssignmentNotification(params: {
    stepTitle: string;
    taskTitle: string;
    assignedToId: string;
    assignerName: string;
  }) {
    if (!supabase) return false;

    try {
      const { data: assigneeProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', params.assignedToId)
        .single();

      if (!assigneeProfile?.email) {
        console.error('No email found for step assignee');
        return false;
      }

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!anonKey) {
        console.error('ANON_KEY not available');
        return false;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
          },
          body: JSON.stringify({
            type: 'step_assigned',
            stepTitle: params.stepTitle,
            taskTitle: params.taskTitle,
            recipientEmail: assigneeProfile.email,
            recipientName: assigneeProfile.full_name || 'Benutzer',
            assignerName: params.assignerName,
          }),
        }
      );

      if (!response.ok) {
        console.error('Step notification error');
        return false;
      }

      console.log('Step assignment notification sent');
      return true;
    } catch (error) {
      console.error('Step notification exception:', error);
      return false;
    }
  }

  // Send push notification for task assignment
  async function sendTaskPushNotification(params: {
    userId: string;
    taskId: string;
    taskTitle: string;
    assignerName: string;
  }) {
    if (!supabase) return false;

    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!anonKey) return false;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
          },
          body: JSON.stringify({
            userIds: [params.userId],
            payload: {
              title: '📋 Neue Aufgabe zugewiesen',
              body: `${params.assignerName} hat dir "${params.taskTitle}" zugewiesen`,
              icon: '/icon-192.png',
              tag: `task-${params.taskId}`,
              data: { 
                taskId: params.taskId, 
                url: '/aufgaben',
                type: 'task_assignment'
              },
            },
          }),
        }
      );

      if (!response.ok) {
        console.error('Task push notification error:', response.status);
        return false;
      }

      console.log('Task push notification sent');
      return true;
    } catch (error) {
      console.error('Task push notification exception:', error);
      return false;
    }
  }

  // Send push notification for step assignment
  async function sendStepPushNotification(params: {
    userId: string;
    taskId: string;
    stepTitle: string;
    taskTitle: string;
    assignerName: string;
  }) {
    if (!supabase) return false;

    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!anonKey) return false;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
          },
          body: JSON.stringify({
            userIds: [params.userId],
            payload: {
              title: '📝 Neuer Schritt zugewiesen',
              body: `${params.assignerName}: "${params.stepTitle}" in "${params.taskTitle}"`,
              icon: '/icon-192.png',
              tag: `step-${params.taskId}`,
              data: { 
                taskId: params.taskId, 
                url: '/aufgaben',
                type: 'step_assignment'
              },
            },
          }),
        }
      );

      if (!response.ok) {
        console.error('Step push notification error:', response.status);
        return false;
      }

      console.log('Step push notification sent');
      return true;
    } catch (error) {
      console.error('Step push notification exception:', error);
      return false;
    }
  }

  // Create in-app notification for task assignment
  async function createInAppTaskNotification(params: {
    userId: string;
    taskId: string;
    taskTitle: string;
    assignerName: string;
  }) {
    if (!supabase) return;

    await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        task_id: params.taskId,
        notification_type: 'task',
        message: `Neue Aufgabe zugewiesen: "${params.taskTitle}" von ${params.assignerName}`,
        is_read: false
      });
  }

  // Create in-app notification for step assignment
  async function createInAppStepNotification(params: {
    userId: string;
    taskId: string;
    stepId: string;
    stepTitle: string;
    taskTitle: string;
    assignerName: string;
  }) {
    if (!supabase) return;

    await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        task_id: params.taskId,
        step_id: params.stepId,
        notification_type: 'step',
        message: `Neuer Unterschritt zugewiesen: "${params.stepTitle}" in Aufgabe "${params.taskTitle}" von ${params.assignerName}`,
        is_read: false
      });
  }

  // Assign a step to a user
  async function assignStep(stepId: string, assignedTo: string | null, taskId: string) {
    if (!supabase || !user) return { error: new Error('Database not connected') };

    const { error } = await supabase
      .from('task_steps')
      .update({ assigned_to: assignedTo })
      .eq('id', stepId);

    if (!error && assignedTo) {
      // Find the step and task to send notification
      const task = tasks.find(t => t.id === taskId);
      const step = task?.steps?.find(s => s.id === stepId);
      
      if (task && step) {
        const { data: assignerProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        const assignerName = assignerProfile?.full_name || 'Administrator';

        // Email notification
        await sendStepAssignmentNotification({
          stepTitle: step.title,
          taskTitle: task.title,
          assignedToId: assignedTo,
          assignerName
        });

        // In-app notification
        await createInAppStepNotification({
          userId: assignedTo,
          taskId: taskId,
          stepId: stepId,
          stepTitle: step.title,
          taskTitle: task.title,
          assignerName
        });
      }
    }

    if (!error) {
      fetchTasks();
    }
    return { error };
  }

  async function updateStep(stepId: string, title: string) {
    if (!supabase) return { error: new Error('Database not connected') };

    const { error } = await supabase
      .from('task_steps')
      .update({ title })
      .eq('id', stepId);

    if (!error) {
      fetchTasks();
    }
    return { error };
  }

  // Helper function to calculate progress from steps (max 90%)
  function calculateProgressFromSteps(steps: TaskStep[], newCompletedState?: { stepId: string; completed: boolean }): number {
    if (steps.length === 0) return 0;
    
    let completedCount = steps.filter(s => s.completed).length;
    
    // Adjust for the step being toggled
    if (newCompletedState) {
      const step = steps.find(s => s.id === newCompletedState.stepId);
      if (step) {
        if (newCompletedState.completed && !step.completed) {
          completedCount++;
        } else if (!newCompletedState.completed && step.completed) {
          completedCount--;
        }
      }
    }
    
    // Calculate percentage, max 90%
    const percentage = Math.round((completedCount / steps.length) * 90);
    return Math.min(percentage, 90);
  }

  // Helper function to update task progress based on steps
  async function updateTaskProgressFromSteps(taskId: string, steps: TaskStep[], newCompletedState?: { stepId: string; completed: boolean }) {
    if (!supabase) return;
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Don't auto-update if task is already completed (100%)
    if (task.status === 'completed') return;
    
    const newProgress = calculateProgressFromSteps(steps, newCompletedState);
    const newStatus: TaskStatus = newProgress > 0 ? 'in_progress' : 'todo';
    
    await supabase
      .from('tasks')
      .update({ progress: newProgress, status: newStatus })
      .eq('id', taskId);
  }

  async function toggleStepComplete(stepId: string, completed: boolean) {
    if (!supabase || !user) return { error: new Error('Not authenticated') };

    // Find the task that contains this step
    const task = tasks.find(t => t.steps?.some(s => s.id === stepId));
    
    const updateData = completed
      ? {
          completed: true,
          completed_by: user.id,
          completed_at: new Date().toISOString()
        }
      : {
          completed: false,
          completed_by: null,
          completed_at: null
        };

    const { error } = await supabase
      .from('task_steps')
      .update(updateData)
      .eq('id', stepId);

    if (!error && task?.steps) {
      // Update task progress based on steps
      await updateTaskProgressFromSteps(task.id, task.steps, { stepId, completed });
      fetchTasks();
    }
    return { error };
  }

  async function deleteStep(stepId: string) {
    if (!supabase) return { error: new Error('Database not connected') };

    // Find the task that contains this step
    const task = tasks.find(t => t.steps?.some(s => s.id === stepId));

    const { error } = await supabase
      .from('task_steps')
      .delete()
      .eq('id', stepId);

    if (!error) {
      // Recalculate progress after step deletion
      if (task?.steps) {
        const remainingSteps = task.steps.filter(s => s.id !== stepId);
        if (remainingSteps.length > 0 && task.status !== 'completed') {
          const newProgress = calculateProgressFromSteps(remainingSteps);
          const newStatus: TaskStatus = newProgress > 0 ? 'in_progress' : 'todo';
          await supabase
            .from('tasks')
            .update({ progress: newProgress, status: newStatus })
            .eq('id', task.id);
        }
      }
      fetchTasks();
    }
    return { error };
  }

  // Send deadline reminder to users with open steps or incomplete task
  async function sendDeadlineReminder(taskId: string) {
    if (!supabase || !user) return { error: new Error('Not authenticated'), notifiedCount: 0 };

    const task = tasks.find(t => t.id === taskId);
    if (!task) return { error: new Error('Task not found'), notifiedCount: 0 };

    // Check if user is the creator
    if (task.created_by !== user.id) {
      return { error: new Error('Only the creator can send reminders'), notifiedCount: 0 };
    }

    const usersToNotify = new Set<string>();

    // Find users with incomplete steps
    if (task.steps) {
      for (const step of task.steps) {
        if (!step.completed && step.assigned_to) {
          usersToNotify.add(step.assigned_to);
        }
      }
    }

    // Add main assignee if task not completed
    if (task.status !== 'completed' && task.assigned_to) {
      usersToNotify.add(task.assigned_to);
    }

    if (usersToNotify.size === 0) {
      return { error: null, notifiedCount: 0 };
    }

    // Get creator's name
    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const senderName = creatorProfile?.full_name || 'Aufgaben-Ersteller';

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };

    let notifiedCount = 0;

    for (const userId of usersToNotify) {
      // Get user profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      if (!userProfile) continue;

      // Create in-app notification
      await supabase.from('notifications').insert({
        user_id: userId,
        message: `Erinnerung: Die Frist für "${task.title}" läuft ab (${formatDate(task.end_date)})`,
        notification_type: 'task',
        task_id: taskId
      });

      // Send email notification
      if (userProfile.email) {
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (anonKey) {
          try {
            await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${anonKey}`,
                  'apikey': anonKey,
                },
                body: JSON.stringify({
                  type: 'task_deadline_reminder',
                  taskTitle: task.title,
                  taskEndDate: formatDate(task.end_date),
                  recipientEmail: userProfile.email,
                  recipientName: userProfile.full_name || 'Benutzer',
                  senderName: senderName,
                }),
              }
            );
          } catch (error) {
            console.error('Error sending deadline reminder email:', error);
          }
        }
      }

      notifiedCount++;
    }

    return { error: null, notifiedCount };
  }

  return {
    tasks,
    loading,
    canManageTasks,
    createTask,
    updateTask,
    deleteTask,
    updateProgress,
    addStep,
    updateStep,
    assignStep,
    toggleStepComplete,
    deleteStep,
    sendDeadlineReminder,
    refetch: fetchTasks
  };
}
