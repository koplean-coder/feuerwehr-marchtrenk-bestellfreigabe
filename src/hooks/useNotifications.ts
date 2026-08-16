import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type NotificationType = 'order' | 'task' | 'step' | 'message';

export interface Notification {
  id: string;
  user_id: string;
  order_id: string | null;
  task_id: string | null;
  step_id: string | null;
  notification_type: NotificationType;
  message: string;
  is_read: boolean;
  created_at: string;
  sender_id: string | null;
  original_recipients: string[] | null;
  is_reply: boolean | null;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Subscribe to realtime changes for this user's notifications
      if (supabase) {
        const channel = supabase
          .channel('notifications-realtime')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`
            },
            () => {
              // Refetch notifications on any change
              fetchNotifications();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchNotifications ist stabil, user-Änderung triggert Neustart
  }, [user]);

  async function fetchNotifications() {
    if (!supabase || !user) return;
    
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    setNotifications((data as Notification[]) ?? []);
    setLoading(false);
  }

  async function markAsRead(id: string) {
    if (!supabase) return;
    
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    
    fetchNotifications();
  }

  async function markAllAsRead() {
    if (!supabase || !user) return;
    
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    
    fetchNotifications();
  }

  // Create a task notification
  async function createTaskNotification(params: {
    userId: string;
    taskId: string;
    message: string;
  }) {
    if (!supabase) return { error: new Error('Database not connected') };

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        task_id: params.taskId,
        notification_type: 'task',
        message: params.message,
        is_read: false
      });

    if (!error) {
      fetchNotifications();
    }
    return { error };
  }

  // Create a step notification
  async function createStepNotification(params: {
    userId: string;
    taskId: string;
    stepId: string;
    message: string;
  }) {
    if (!supabase) return { error: new Error('Database not connected') };

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        task_id: params.taskId,
        step_id: params.stepId,
        notification_type: 'step',
        message: params.message,
        is_read: false
      });

    if (!error) {
      fetchNotifications();
    }
    return { error };
  }

  // Mark task notifications as read when task is completed
  async function markTaskNotificationsAsRead(taskId: string) {
    if (!supabase || !user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('task_id', taskId);

    fetchNotifications();
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    createTaskNotification,
    createStepNotification,
    markTaskNotificationsAsRead,
    unreadCount,
    refetch: fetchNotifications
  };
}
