import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/helpers';

export type TodoTag = Tables<'todo_tags'>;
export type TodoTaskTag = Tables<'todo_task_tags'>;

// Predefined colors for tags
export const TAG_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
];

export function useTodoTags() {
  const [tags, setTags] = useState<TodoTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async (silent = false) => {
    if (!supabase) return;

    try {
      if (!silent) setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTags([]);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('todo_tags')
        .select('*')
        .eq('created_by', user.id)
        .order('name');

      if (fetchError) throw fetchError;
      setTags(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Tags');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Create a new tag
  const createTag = async (name: string, color: string): Promise<TodoTag | null> => {
    if (!supabase) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    try {
      const { data, error: createError } = await supabase
        .from('todo_tags')
        .insert({ name, color, created_by: user.id })
        .select()
        .single();

      if (createError) throw createError;
      await fetchTags(true);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen des Tags');
      return null;
    }
  };

  // Update a tag
  const updateTag = async (id: string, updates: { name?: string; color?: string }): Promise<boolean> => {
    if (!supabase) return false;

    try {
      const { error: updateError } = await supabase
        .from('todo_tags')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;
      await fetchTags(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren des Tags');
      return false;
    }
  };

  // Delete a tag
  const deleteTag = async (id: string): Promise<boolean> => {
    if (!supabase) return false;

    try {
      // First delete all task-tag relations
      await supabase
        .from('todo_task_tags')
        .delete()
        .eq('tag_id', id);

      // Then delete the tag
      const { error: deleteError } = await supabase
        .from('todo_tags')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      // Optimistic update
      setTags(prev => prev.filter(t => t.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen des Tags');
      return false;
    }
  };

  // Get tags for a specific task
  const getTaskTags = async (taskId: string): Promise<TodoTag[]> => {
    if (!supabase) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('todo_task_tags')
        .select('tag_id, todo_tags(*)')
        .eq('task_id', taskId);

      if (fetchError) throw fetchError;
      return (data ?? []).map(d => d.todo_tags).filter(Boolean) as TodoTag[];
    } catch (err) {
      console.error('Error fetching task tags:', err);
      return [];
    }
  };

  // Add tag to task
  const addTagToTask = async (taskId: string, tagId: string): Promise<boolean> => {
    if (!supabase) return false;

    try {
      const { error: insertError } = await supabase
        .from('todo_task_tags')
        .insert({ task_id: taskId, tag_id: tagId });

      if (insertError) {
        // Ignore duplicate key error
        if (insertError.code === '23505') return true;
        throw insertError;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Hinzufügen des Tags');
      return false;
    }
  };

  // Remove tag from task
  const removeTagFromTask = async (taskId: string, tagId: string): Promise<boolean> => {
    if (!supabase) return false;

    try {
      const { error: deleteError } = await supabase
        .from('todo_task_tags')
        .delete()
        .eq('task_id', taskId)
        .eq('tag_id', tagId);

      if (deleteError) throw deleteError;
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Entfernen des Tags');
      return false;
    }
  };

  return {
    tags,
    loading,
    error,
    createTag,
    updateTag,
    deleteTag,
    getTaskTags,
    addTagToTask,
    removeTagFromTask,
    refetch: fetchTags
  };
}
