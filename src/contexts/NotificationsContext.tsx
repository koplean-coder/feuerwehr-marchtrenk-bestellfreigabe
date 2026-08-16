/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type NotificationType = 'order' | 'task' | 'step' | 'message' | 'problem_report' | 'idea';

export interface Notification {
  id: string;
  user_id: string;
  order_id: string | null;
  task_id: string | null;
  step_id: string | null;
  idea_id: string | null;
  notification_type: NotificationType;
  message: string;
  is_read: boolean;
  created_at: string;
  sender_id: string | null;
  original_recipients: string[] | null;
  is_reply: boolean | null;
  subject: string | null;
}

interface NotificationsContextType {
  notifications: Notification[];
  loading: boolean;
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  createTaskNotification: (params: { userId: string; taskId: string; message: string }) => Promise<{ error: Error | null }>;
  createStepNotification: (params: { userId: string; taskId: string; stepId: string; message: string }) => Promise<{ error: Error | null }>;
  markTaskNotificationsAsRead: (taskId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

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

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Subscribe to realtime changes for this user's notifications
      if (supabase) {
        const channel = supabase
          .channel(`notifications-${user.id}`)
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
    } else {
      setNotifications([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchNotifications ist stabil, user-Änderung triggert Neustart
  }, [user]);

  async function markAsRead(id: string) {
    if (!supabase) return;
    
    // Optimistic update
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
  }

  async function markAllAsRead() {
    if (!supabase || !user) return;
    
    // Optimistic update
    setNotifications(prev => 
      prev.map(n => ({ ...n, is_read: true }))
    );
    
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
  }

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

    return { error };
  }

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

    return { error };
  }

  async function markTaskNotificationsAsRead(taskId: string) {
    if (!supabase || !user) return;

    // Optimistic update
    setNotifications(prev => 
      prev.map(n => n.task_id === taskId ? { ...n, is_read: true } : n)
    );

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('task_id', taskId);
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        loading,
        unreadCount,
        markAsRead,
        markAllAsRead,
        createTaskNotification,
        createStepNotification,
        markTaskNotificationsAsRead,
        refetch: fetchNotifications
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
