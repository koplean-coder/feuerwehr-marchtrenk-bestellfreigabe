import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TodoNotificationSettings {
  assignment: { push: boolean; email: boolean };
  reminder: { push: boolean; email: boolean };
  due_today: { push: boolean; email: boolean };
  completed: { push: boolean; email: boolean };
  shared_list: { push: boolean; email: boolean };
}

export const DEFAULT_NOTIFICATION_SETTINGS: TodoNotificationSettings = {
  assignment: { push: true, email: true },
  reminder: { push: true, email: false },
  due_today: { push: true, email: false },
  completed: { push: false, email: false },
  shared_list: { push: true, email: true }
};

export function useTodoSettings() {
  const { profile } = useAuth();
  const [todoEnabled, setTodoEnabled] = useState(false);
  const [viewUsers, setViewUsers] = useState<string[]>([]);
  const [adminUsers, setAdminUsers] = useState<string[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<TodoNotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!supabase) return;

    try {
      setLoading(true);

      // Fetch global settings
      const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['todo_enabled', 'todo_view_users', 'todo_admin_users']);

      if (settingsError) throw settingsError;

      for (const setting of settings ?? []) {
        switch (setting.key) {
          case 'todo_enabled':
            setTodoEnabled(setting.value === 'true');
            break;
          case 'todo_view_users':
            try {
              setViewUsers(JSON.parse(setting.value));
            } catch {
              setViewUsers([]);
            }
            break;
          case 'todo_admin_users':
            try {
              setAdminUsers(JSON.parse(setting.value));
            } catch {
              setAdminUsers([]);
            }
            break;
        }
      }

      // Fetch user notification settings
      if (profile?.id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('todo_notifications')
          .eq('id', profile.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') throw profileError;

        if (profileData?.todo_notifications) {
          setNotificationSettings(profileData.todo_notifications as TodoNotificationSettings);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Einstellungen');
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Check permissions
  // VEREINFACHT: Wenn Todo aktiviert ist, hat jeder Zugriff
  // Die Menüpunkt-Sichtbarkeit wird über Modul-Berechtigungen (für 'nutzer') 
  // oder Layout-Logik (für andere Rollen) gesteuert
  const canViewTodo = useCallback(() => {
    if (!todoEnabled) return false;
    if (!profile) return false;
    
    // Wenn Todo aktiviert ist, hat jeder eingeloggte User Zugriff
    // Die Sichtbarkeit des Menüpunkts wird woanders gesteuert
    return true;
  }, [todoEnabled, profile]);

  const canAdminTodo = useCallback(() => {
    if (!profile) return false;
    
    // System admins can always admin
    if (profile.role === 'admin') return true;
    
    // Check if user is in admin list
    return adminUsers.includes(profile.id);
  }, [profile, adminUsers]);

  // Update global settings (admin only)
  const updateGlobalSettings = async (updates: {
    todoEnabled?: boolean;
    viewUsers?: string[];
    adminUsers?: string[];
  }) => {
    if (!supabase || !canAdminTodo()) return false;

    try {
      const settingsToUpdate: { key: string; value: string }[] = [];

      if (updates.todoEnabled !== undefined) {
        settingsToUpdate.push({ key: 'todo_enabled', value: String(updates.todoEnabled) });
      }
      if (updates.viewUsers !== undefined) {
        settingsToUpdate.push({ key: 'todo_view_users', value: JSON.stringify(updates.viewUsers) });
      }
      if (updates.adminUsers !== undefined) {
        settingsToUpdate.push({ key: 'todo_admin_users', value: JSON.stringify(updates.adminUsers) });
      }

      for (const setting of settingsToUpdate) {
        const { error: updateError } = await supabase
          .from('settings')
          .update({ value: setting.value })
          .eq('key', setting.key);

        if (updateError) throw updateError;
      }

      await fetchSettings();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
      return false;
    }
  };

  // Update user notification settings
  const updateNotificationSettings = async (settings: Partial<TodoNotificationSettings>) => {
    if (!supabase || !profile?.id) return false;

    try {
      const newSettings = { ...notificationSettings, ...settings };

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ todo_notifications: newSettings })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setNotificationSettings(newSettings);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
      return false;
    }
  };

  return {
    todoEnabled,
    viewUsers,
    adminUsers,
    notificationSettings,
    loading,
    error,
    canViewTodo,
    canAdminTodo,
    updateGlobalSettings,
    updateNotificationSettings,
    refresh: fetchSettings
  };
}
