import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/helpers';

export type TodoTask = Tables<'todo_tasks'>;
export type TodoTaskStep = Tables<'todo_task_steps'>;
export type TodoTaskShare = Tables<'todo_task_shares'>;
export type TodoTaskComment = Tables<'todo_task_comments'>;
export type TodoTaskInsert = TablesInsert<'todo_tasks'>;
export type TodoTaskStepInsert = TablesInsert<'todo_task_steps'>;

export interface TodoTaskCommentWithUser extends TodoTaskComment {
  user?: { id: string; full_name: string | null; avatar_url?: string | null };
}

export interface TodoTaskWithSteps extends TodoTask {
  steps: TodoTaskStep[];
  shares?: TodoTaskShare[];
  creator?: { id: string; full_name: string | null };
  assignee?: { id: string; full_name: string | null };
  due_date_changer?: { id: string; full_name: string | null };
  notes_updater?: { id: string; full_name: string | null };
}

export interface TaskFilters {
  listId?: string;
  smartList?: 'my_day' | 'important' | 'planned' | 'assigned_to_me' | 'all' | 'today' | 'tomorrow' | 'overdue' | 'deleted';
  showCompleted?: boolean;
  search?: string;
  sortBy?: 'manual' | 'due_date' | 'importance' | 'alphabetical' | 'created' | 'priority';
  sortDirection?: 'asc' | 'desc';
}

// Calculate next due date based on recurrence
function calculateNextDueDate(
  currentDueDate: string | null,
  recurrenceType: string,
  interval: number
): string | null {
  // Base date is either the current due date or today
  const baseDate = currentDueDate ? new Date(currentDueDate) : new Date();
  const nextDate = new Date(baseDate);
  
  switch (recurrenceType) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + interval);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + (7 * interval));
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + interval);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      break;
    case 'weekdays':
      // Move to next weekday
      do {
        nextDate.setDate(nextDate.getDate() + 1);
      } while (nextDate.getDay() === 0 || nextDate.getDay() === 6);
      break;
    default:
      return null;
  }
  
  return nextDate.toISOString().split('T')[0];
}

export function useTodoTasks(filters: TaskFilters = {}) {
  const [tasks, setTasks] = useState<TodoTaskWithSteps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!supabase) return;
    
    try {
      setLoading(true);
      
      // Get current user first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTasks([]);
        setLoading(false);
        return;
      }

      // Get task IDs shared with this user
      const { data: sharedTasks } = await supabase
        .from('todo_task_shares')
        .select('task_id')
        .eq('shared_with_id', user.id);
      
      const sharedTaskIds = (sharedTasks || []).map(s => s.task_id);
      
      let query = supabase
        .from('todo_tasks')
        .select(`
          *,
          todo_task_steps(*)
        `);

      // Apply sorting based on sortBy parameter
      const sortDir = filters.sortDirection === 'desc' ? false : true;
      switch (filters.sortBy) {
        case 'due_date':
          query = query.order('due_date', { ascending: sortDir, nullsFirst: false });
          break;
        case 'importance':
          query = query.order('is_important', { ascending: false }).order('sort_order', { ascending: true });
          break;
        case 'alphabetical':
          query = query.order('title', { ascending: sortDir });
          break;
        case 'created':
          query = query.order('created_at', { ascending: sortDir });
          break;
        case 'priority':
          query = query.order('priority', { ascending: sortDir, nullsFirst: false }).order('sort_order', { ascending: true });
          break;
        default: // 'manual'
          query = query.order('sort_order', { ascending: true });
      }

      // BASE FILTER: Only show tasks that belong to this user
      // (created by me OR assigned to me OR shared with me)
      if (sharedTaskIds.length > 0) {
        query = query.or(`created_by.eq.${user.id},assigned_to.eq.${user.id},id.in.(${sharedTaskIds.join(',')})`);
      } else {
        query = query.or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`);
      }

      // Apply additional filters based on smart list or regular list
      if (filters.smartList) {
        const today = new Date().toISOString().split('T')[0];
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        switch (filters.smartList) {
          case 'my_day':
            // My Day: manually added to my day + due today + overdue + assigned without date
            query = query.or(
              `and(is_in_my_day.eq.true,my_day_date.eq.${today}),due_date.eq.${today},due_date.lt.${today},and(assigned_to.eq.${user.id},due_date.is.null)`
            );
            break;
          case 'important':
            query = query.eq('is_important', true);
            break;
          case 'planned':
            query = query.not('due_date', 'is', null);
            break;
          case 'assigned_to_me':
            query = query.eq('assigned_to', user.id);
            break;
          case 'today':
            query = query.eq('due_date', today);
            break;
          case 'tomorrow':
            query = query.eq('due_date', tomorrowStr);
            break;
          case 'overdue':
            query = query.lt('due_date', today);
            break;
          case 'deleted':
            query = query.eq('is_deleted', true);
            break;
          // 'all' - no additional filter, base filter already applied
        }
      } else if (filters.listId) {
        query = query.eq('list_id', filters.listId);
      }

      // Filter completed tasks (default: hide completed)
      if (filters.showCompleted !== true) {
        query = query.eq('is_completed', false);
      }

      // Search filter
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Get unique user IDs for creators, assignees, and changers
      const userIds = new Set<string>();
      (data ?? []).forEach(task => {
        if (task.created_by) userIds.add(task.created_by);
        if (task.assigned_to) userIds.add(task.assigned_to);
        if (task.due_date_changed_by) userIds.add(task.due_date_changed_by);
        if (task.notes_updated_by) userIds.add(task.notes_updated_by);
      });

      // Fetch profiles for these users
      let profilesMap: Record<string, { id: string; full_name: string | null }> = {};
      if (userIds.size > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(userIds));
        
        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.id] = { id: p.id, full_name: p.full_name };
            return acc;
          }, {} as typeof profilesMap);
        }
      }

      // Fetch task shares
      const taskIds = (data ?? []).map(t => t.id);
      let taskSharesMap: Record<string, TodoTaskShare[]> = {};
      if (taskIds.length > 0) {
        const { data: sharesData } = await supabase
          .from('todo_task_shares')
          .select('*')
          .in('task_id', taskIds);
        
        if (sharesData) {
          taskSharesMap = sharesData.reduce((acc, share) => {
            if (!acc[share.task_id]) acc[share.task_id] = [];
            acc[share.task_id].push(share);
            return acc;
          }, {} as typeof taskSharesMap);
        }
      }

      const tasksWithSteps: TodoTaskWithSteps[] = (data ?? []).map(task => ({
        ...task,
        steps: ((task as { todo_task_steps?: TodoTaskStep[] }).todo_task_steps ?? []).sort(
          (a, b) => a.sort_order - b.sort_order
        ),
        shares: taskSharesMap[task.id] ?? [],
        creator: task.created_by ? profilesMap[task.created_by] : undefined,
        assignee: task.assigned_to ? profilesMap[task.assigned_to] : undefined,
        due_date_changer: task.due_date_changed_by ? profilesMap[task.due_date_changed_by] : undefined,
        notes_updater: task.notes_updated_by ? profilesMap[task.notes_updated_by] : undefined,
        todo_task_steps: undefined
      }));

      setTasks(tasksWithSteps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Aufgaben');
    } finally {
      setLoading(false);
    }
  }, [filters.listId, filters.smartList, filters.showCompleted, filters.search, filters.sortBy, filters.sortDirection]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Task CRUD
  const createTask = async (task: Omit<TodoTaskInsert, 'created_by'>) => {
    if (!supabase) return null;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error: createError } = await supabase
      .from('todo_tasks')
      .insert({ ...task, created_by: user.id })
      .select()
      .single();

    if (createError) {
      setError(createError.message);
      return null;
    }

    await fetchTasks();
    return data;
  };

  const updateTask = async (id: string, updates: TablesUpdate<'todo_tasks'>) => {
    if (!supabase) return false;

    // Get current task for recurrence check
    const currentTask = tasks.find(t => t.id === id);
    
    // Handle completion
    if (updates.is_completed === true) {
      const { data: { user } } = await supabase.auth.getUser();
      updates.completed_at = new Date().toISOString();
      updates.completed_by = user?.id;
      
      // If recurring task, create next occurrence
      if (currentTask?.recurrence_type && user) {
        const nextDueDate = calculateNextDueDate(
          currentTask.due_date,
          currentTask.recurrence_type,
          currentTask.recurrence_interval ?? 1
        );
        
        // Check if we should create a new task (end date not reached)
        const shouldCreateNext = !currentTask.recurrence_end_date || 
          (nextDueDate && new Date(nextDueDate) <= new Date(currentTask.recurrence_end_date));
        
        if (shouldCreateNext) {
          // Create new recurring task
          await supabase.from('todo_tasks').insert({
            title: currentTask.title,
            notes: currentTask.notes,
            list_id: currentTask.list_id,
            created_by: user.id,
            due_date: nextDueDate,
            due_time: currentTask.due_time,
            recurrence_type: currentTask.recurrence_type,
            recurrence_interval: currentTask.recurrence_interval,
            recurrence_end_date: currentTask.recurrence_end_date,
            is_important: currentTask.is_important,
            assigned_to: currentTask.assigned_to,
            assigned_by: currentTask.assigned_to ? user.id : null,
            assigned_at: currentTask.assigned_to ? new Date().toISOString() : null,
          });
        }
      }
    } else if (updates.is_completed === false) {
      updates.completed_at = null;
      updates.completed_by = null;
    }

    const { error: updateError } = await supabase
      .from('todo_tasks')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    await fetchTasks();
    return true;
  };

  const deleteTask = async (id: string) => {
    if (!supabase) return false;

    const { error: deleteError } = await supabase
      .from('todo_tasks')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
      return false;
    }

    await fetchTasks();
    return true;
  };

  // Quick actions
  const toggleComplete = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return false;
    return updateTask(id, { is_completed: !task.is_completed });
  };

  const toggleImportant = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return false;
    return updateTask(id, { is_important: !task.is_important });
  };

  const addToMyDay = async (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    return updateTask(id, { is_in_my_day: true, my_day_date: today });
  };

  const removeFromMyDay = async (id: string) => {
    return updateTask(id, { is_in_my_day: false, my_day_date: null });
  };

  const assignTask = async (taskId: string, userId: string | null) => {
    if (!supabase) return false;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    const task = tasks.find(t => t.id === taskId);
    const previousAssignee = task?.assigned_to;
    
    const result = await updateTask(taskId, {
      assigned_to: userId,
      assigned_by: userId ? user.id : null,
      assigned_at: userId ? new Date().toISOString() : null
    });
    
    // Send notifications if task is newly assigned to someone different
    if (result && userId && userId !== previousAssignee) {
      // Get assigner's name
      const { data: assignerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      const assignerName = assignerProfile?.full_name || 'Jemand';
      const taskTitle = task?.title || 'Aufgabe';
      
      // In-app notification
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Neue Aufgabe zugewiesen',
        message: `${assignerName} hat dir "${taskTitle}" zugewiesen`,
        type: 'task_assigned',
        link: `/aufgaben?task=${taskId}`
      });
      
      // Push notification
      try {
        await supabase.functions.invoke('send-push', {
          body: {
            userId: userId,
            title: '📋 Neue Aufgabe zugewiesen',
            body: `${assignerName} hat dir "${taskTitle}" zugewiesen`,
            url: `/aufgaben?task=${taskId}`
          }
        });
      } catch (e) {
        console.error('Push notification failed:', e);
      }
    }
    
    return result;
  };

  const setDueDate = async (id: string, dueDate: string | null, dueTime?: string | null) => {
    if (!supabase) return false;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    // Get current task for history
    const currentTask = tasks.find(t => t.id === id);
    const oldValue = currentTask?.due_date;
    
    // Get user name for history
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    
    // Build history entry
    const historyEntry = {
      field: 'due_date',
      old_value: oldValue ?? null,
      new_value: dueDate,
      changed_by: user.id,
      changer_name: profile?.full_name ?? 'Unbekannt',
      changed_at: new Date().toISOString()
    };
    
    // Get current history and append
    const currentHistory = (currentTask as { change_history?: unknown[] })?.change_history ?? [];
    const newHistory = [...currentHistory, historyEntry];
    
    return updateTask(id, { 
      due_date: dueDate, 
      due_time: dueTime ?? null,
      due_date_changed_by: user.id,
      due_date_changed_at: new Date().toISOString(),
      change_history: newHistory
    });
  };

  const setReminder = async (id: string, reminderAt: string | null) => {
    return updateTask(id, { reminder_at: reminderAt });
  };

  // Step CRUD
  const createStep = async (taskId: string, title: string) => {
    if (!supabase) return null;

    // Get max sort_order
    const task = tasks.find(t => t.id === taskId);
    const maxOrder = task?.steps.length ?? 0;

    const { data, error: createError } = await supabase
      .from('todo_task_steps')
      .insert({ task_id: taskId, title, sort_order: maxOrder })
      .select()
      .single();

    if (createError) {
      setError(createError.message);
      return null;
    }

    await fetchTasks();
    return data;
  };

  const updateStep = async (id: string, updates: TablesUpdate<'todo_task_steps'>) => {
    if (!supabase) return false;

    if (updates.is_completed === true) {
      updates.completed_at = new Date().toISOString();
    } else if (updates.is_completed === false) {
      updates.completed_at = null;
    }

    const { error: updateError } = await supabase
      .from('todo_task_steps')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    await fetchTasks();
    return true;
  };

  const deleteStep = async (id: string) => {
    if (!supabase) return false;

    const { error: deleteError } = await supabase
      .from('todo_task_steps')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
      return false;
    }

    await fetchTasks();
    return true;
  };

  const toggleStepComplete = async (id: string) => {
    // Find the step in tasks
    for (const task of tasks) {
      const step = task.steps.find(s => s.id === id);
      if (step) {
        return updateStep(id, { is_completed: !step.is_completed });
      }
    }
    return false;
  };

  // Reorder tasks
  const reorderTasks = async (taskIds: string[]) => {
    if (!supabase) return false;

    const updates = taskIds.map((id, index) =>
      supabase.from('todo_tasks').update({ sort_order: index }).eq('id', id)
    );

    await Promise.all(updates);
    await fetchTasks();
    return true;
  };

  // Move task to another list
  const moveTask = async (taskId: string, targetListId: string) => {
    return updateTask(taskId, { list_id: targetListId });
  };

  // Task share management
  const shareTask = async (taskId: string, userId: string, permission: 'view' | 'edit' = 'edit') => {
    if (!supabase) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error: shareError } = await supabase
      .from('todo_task_shares')
      .insert({ task_id: taskId, user_id: userId, permission });

    if (shareError) {
      setError(shareError.message);
      return false;
    }

    // Get sharer's name and task info for notification
    const task = tasks.find(t => t.id === taskId);
    const { data: sharerProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    
    const sharerName = sharerProfile?.full_name || 'Jemand';
    const taskTitle = task?.title || 'Aufgabe';
    const permissionLabel = permission === 'edit' ? 'Bearbeiten' : 'Ansehen';

    // In-app notification for the invited user
    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Zu Aufgabe hinzugefügt',
      message: `${sharerName} hat dich zur Aufgabe "${taskTitle}" hinzugefügt (${permissionLabel})`,
      type: 'task_shared',
      link: `/aufgaben?task=${taskId}`
    });

    // Push notification
    try {
      await supabase.functions.invoke('send-push', {
        body: {
          userId: userId,
          title: '👥 Zu Aufgabe hinzugefügt',
          body: `${sharerName} hat dich zur Aufgabe "${taskTitle}" hinzugefügt`,
          url: `/aufgaben?task=${taskId}`
        }
      });
    } catch (e) {
      console.error('Push notification failed:', e);
    }

    await fetchTasks();
    return true;
  };

  const unshareTask = async (taskId: string, userId: string) => {
    if (!supabase) return false;

    const { error: unshareError } = await supabase
      .from('todo_task_shares')
      .delete()
      .eq('task_id', taskId)
      .eq('user_id', userId);

    if (unshareError) {
      setError(unshareError.message);
      return false;
    }

    await fetchTasks();
    return true;
  };

  const updateTaskSharePermission = async (taskId: string, userId: string, permission: 'view' | 'edit') => {
    if (!supabase) return false;

    const { error: updateError } = await supabase
      .from('todo_task_shares')
      .update({ permission })
      .eq('task_id', taskId)
      .eq('user_id', userId);

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    await fetchTasks();
    return true;
  };

  // Comment functions
  const fetchComments = async (taskId: string): Promise<TodoTaskCommentWithUser[]> => {
    if (!supabase) return [];
    
    const { data: comments, error: commentsError } = await supabase
      .from('todo_task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    
    if (commentsError || !comments) return [];
    
    // Fetch user profiles for comments
    const userIds = [...new Set(comments.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);
    
    const profilesMap = (profiles ?? []).reduce((acc, p) => {
      acc[p.id] = { id: p.id, full_name: p.full_name, avatar_url: p.avatar_url };
      return acc;
    }, {} as Record<string, { id: string; full_name: string | null; avatar_url?: string | null }>);
    
    return comments.map(c => ({
      ...c,
      user: profilesMap[c.user_id]
    }));
  };

  const addComment = async (taskId: string, content: string): Promise<boolean> => {
    if (!supabase || !content.trim()) return false;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    const { error: insertError } = await supabase
      .from('todo_task_comments')
      .insert({
        task_id: taskId,
        user_id: user.id,
        content: content.trim()
      });
    
    if (insertError) {
      setError(insertError.message);
      return false;
    }
    
    // Send notification to task owner/assignee
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const recipientIds: string[] = [];
      
      // Notify creator if commenter is not the creator
      if (task.created_by && task.created_by !== user.id) {
        recipientIds.push(task.created_by);
      }
      // Notify assignee if commenter is not the assignee
      if (task.assigned_to && task.assigned_to !== user.id && task.assigned_to !== task.created_by) {
        recipientIds.push(task.assigned_to);
      }
      
      // Get commenter name for notification
      const { data: commenterProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      const commenterName = commenterProfile?.full_name ?? 'Jemand';
      
      // Send notifications
      for (const recipientId of recipientIds) {
        await supabase.from('notifications').insert({
          user_id: recipientId,
          title: 'Neuer Kommentar',
          message: `${commenterName} hat einen Kommentar zu "${task.title}" hinterlassen`,
          type: 'task_comment',
          link: `/aufgaben?task=${taskId}`
        });
        
        // Trigger push notification
        try {
          await supabase.functions.invoke('send-push', {
            body: {
              userId: recipientId,
              title: 'Neuer Kommentar',
              body: `${commenterName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
              url: `/aufgaben?task=${taskId}`
            }
          });
        } catch (e) {
          console.error('Push notification failed:', e);
        }
      }
    }
    
    return true;
  };

  const markCommentsAsRead = async (taskId: string): Promise<boolean> => {
    if (!supabase) return false;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    // Mark all comments as read that were not written by the current user
    const { error: updateError } = await supabase
      .from('todo_task_comments')
      .update({ is_read: true })
      .eq('task_id', taskId)
      .neq('user_id', user.id);
    
    if (updateError) {
      console.error('Error marking comments as read:', updateError);
      return false;
    }
    
    return true;
  };

  const getUnreadCommentCount = async (taskId: string): Promise<number> => {
    if (!supabase) return 0;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    
    const { count } = await supabase
      .from('todo_task_comments')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', taskId)
      .eq('is_read', false)
      .neq('user_id', user.id);
    
    return count ?? 0;
  };

  return {
    tasks,
    loading,
    error,
    refresh: fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleComplete,
    toggleImportant,
    addToMyDay,
    removeFromMyDay,
    assignTask,
    setDueDate,
    setReminder,
    createStep,
    updateStep,
    deleteStep,
    toggleStepComplete,
    reorderTasks,
    moveTask,
    shareTask,
    unshareTask,
    updateTaskSharePermission,
    // Comment functions
    fetchComments,
    addComment,
    markCommentsAsRead,
    getUnreadCommentCount
  };
}
