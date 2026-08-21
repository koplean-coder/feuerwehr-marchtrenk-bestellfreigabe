import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/helpers';

export type TodoList = Tables<'todo_lists'>;
export type TodoListGroup = Tables<'todo_list_groups'>;
export type TodoListShare = Tables<'todo_list_shares'>;
export type TodoGroupShare = Tables<'todo_group_shares'>;
export type TodoFavorite = Tables<'todo_favorites'>;

export type TodoListInsert = TablesInsert<'todo_lists'>;
export type TodoListGroupInsert = TablesInsert<'todo_list_groups'>;
export type TodoListShareInsert = TablesInsert<'todo_list_shares'>;

export type SmartListType = 'my_day' | 'important' | 'planned' | 'assigned_to_me' | 'all' | 'today' | 'tomorrow' | 'overdue' | 'deleted';

export interface TodoListWithCounts extends TodoList {
  task_count?: number;
  completed_count?: number;
  shares?: TodoListShare[];
}

export interface TodoGroupWithShares extends TodoListGroup {
  shares?: TodoGroupShare[];
}

export function useTodoLists() {
  const [lists, setLists] = useState<TodoListWithCounts[]>([]);
  const [groups, setGroups] = useState<TodoGroupWithShares[]>([]);
  const [groupShares, setGroupShares] = useState<TodoGroupShare[]>([]);
  const [favorites, setFavorites] = useState<TodoFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLists = useCallback(async (currentGroupShares?: TodoGroupShare[]) => {
    if (!supabase) return;
    
    try {
      // Get current user for visibility filtering
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Fetch lists without joins (RLS-safe)
      const { data: listsData, error: listsError } = await supabase
        .from('todo_lists')
        .select('*')
        .order('sort_order', { ascending: true });

      if (listsError) throw listsError;

      // Fetch list shares separately
      const { data: sharesData, error: sharesError } = await supabase
        .from('todo_list_shares')
        .select('*');

      if (sharesError) throw sharesError;

      const sharesByListId = (sharesData ?? []).reduce((acc, share) => {
        if (!acc[share.list_id]) acc[share.list_id] = [];
        acc[share.list_id].push(share);
        return acc;
      }, {} as Record<string, TodoListShare[]>);

      // Use passed groupShares or current state
      const gShares = currentGroupShares ?? groupShares;

      // Filter: Show lists where user is:
      // 1. Owner of the list
      // 2. Direct member of the list (list share)
      // 3. Member of the list's group (group share)
      const visibleLists = (listsData ?? []).filter(list => {
        const isOwner = list.created_by === user.id;
        const isListMember = (sharesData ?? []).some(share => share.list_id === list.id && share.user_id === user.id);
        const isGroupMember = list.group_id && gShares.some(gs => gs.group_id === list.group_id && gs.user_id === user.id);
        return isOwner || isListMember || isGroupMember;
      });

      const listsWithCounts: TodoListWithCounts[] = visibleLists.map(list => ({
        ...list,
        shares: sharesByListId[list.id] ?? [],
        task_count: 0,
        completed_count: 0
      } as TodoListWithCounts));

      setLists(listsWithCounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Listen');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchGroups = useCallback(async () => {
    if (!supabase) return { groupShares: [] as TodoGroupShare[] };
    
    try {
      // Get current user for visibility filtering
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { groupShares: [] as TodoGroupShare[] };
      
      // Fetch groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('todo_list_groups')
        .select('*')
        .order('sort_order', { ascending: true });

      if (groupsError) throw groupsError;

      // Fetch group shares
      const { data: gSharesData, error: gSharesError } = await supabase
        .from('todo_group_shares')
        .select('*');

      if (gSharesError) throw gSharesError;
      
      const gShares = gSharesData ?? [];
      setGroupShares(gShares);

      const sharesByGroupId = gShares.reduce((acc, share) => {
        if (!acc[share.group_id]) acc[share.group_id] = [];
        acc[share.group_id].push(share);
        return acc;
      }, {} as Record<string, TodoGroupShare[]>);

      // Filter: Show groups where user is owner OR is a member
      const visibleGroups = (groupsData ?? []).filter(group => {
        const isOwner = group.created_by === user.id;
        const isMember = gShares.some(gs => gs.group_id === group.id && gs.user_id === user.id);
        return isOwner || isMember;
      });

      const groupsWithShares: TodoGroupWithShares[] = visibleGroups.map(group => ({
        ...group,
        shares: sharesByGroupId[group.id] ?? []
      }));

      setGroups(groupsWithShares);
      return { groupShares: gShares };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Gruppen');
      return { groupShares: [] as TodoGroupShare[] };
    }
  }, []);

  const fetchFavorites = useCallback(async () => {
    if (!supabase) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error: favError } = await supabase
      .from('todo_favorites')
      .select('*')
      .eq('user_id', user.id);

    if (favError) {
      console.error('Error fetching favorites:', favError);
      return;
    }

    setFavorites(data ?? []);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    // Fetch groups first to get group shares for list visibility
    const { groupShares: gShares } = await fetchGroups();
    await fetchLists(gShares);
    await fetchFavorites();
    setLoading(false);
  }, [fetchLists, fetchGroups, fetchFavorites]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // List CRUD
  const createList = async (list: Omit<TodoListInsert, 'created_by'>) => {
    if (!supabase) return null;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error: createError } = await supabase
      .from('todo_lists')
      .insert({ ...list, created_by: user.id })
      .select()
      .single();

    if (createError) {
      setError(createError.message);
      return null;
    }

    await fetchLists();
    return data;
  };

  const updateList = async (id: string, updates: TablesUpdate<'todo_lists'>) => {
    if (!supabase) return false;

    const { error: updateError } = await supabase
      .from('todo_lists')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    await fetchLists();
    return true;
  };

  const deleteList = async (id: string) => {
    if (!supabase) return false;

    const { error: deleteError } = await supabase
      .from('todo_lists')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
      return false;
    }

    await fetchLists();
    return true;
  };

  // Group CRUD
  const createGroup = async (name: string) => {
    if (!supabase) return null;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error: createError } = await supabase
      .from('todo_list_groups')
      .insert({ name, created_by: user.id })
      .select()
      .single();

    if (createError) {
      setError(createError.message);
      return null;
    }

    await fetchGroups();
    return data;
  };

  const updateGroup = async (id: string, updates: TablesUpdate<'todo_list_groups'>) => {
    if (!supabase) return false;

    const { error: updateError } = await supabase
      .from('todo_list_groups')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    await fetchGroups();
    return true;
  };

  const deleteGroup = async (id: string) => {
    if (!supabase) return false;

    const { error: deleteError } = await supabase
      .from('todo_list_groups')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
      return false;
    }

    await fetchGroups();
    return true;
  };

  // Group share management
  const shareGroup = async (groupId: string, userId: string, permission: 'view' | 'edit' = 'edit') => {
    if (!supabase) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error: shareError } = await supabase
      .from('todo_group_shares')
      .insert({ group_id: groupId, user_id: userId, permission });

    if (shareError) {
      setError(shareError.message);
      return false;
    }

    // Get sharer's name and group info for notification
    const group = groups.find(g => g.id === groupId);
    const { data: sharerProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    
    const sharerName = sharerProfile?.full_name || 'Jemand';
    const groupName = group?.name || 'Gruppe';
    const permissionLabel = permission === 'edit' ? 'Bearbeiten' : 'Ansehen';

    // In-app notification
    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Zu Gruppe hinzugefügt',
      message: `${sharerName} hat dich zur Gruppe "${groupName}" hinzugefügt (${permissionLabel})`,
      type: 'group_shared',
      link: '/aufgaben'
    });

    // Push notification
    try {
      await supabase.functions.invoke('send-push', {
        body: {
          userId: userId,
          title: '📁 Zu Gruppe hinzugefügt',
          body: `${sharerName} hat dich zur Gruppe "${groupName}" hinzugefügt`,
          url: '/aufgaben'
        }
      });
    } catch (e) {
      console.error('Push notification failed:', e);
    }

    await refresh();
    return true;
  };

  const unshareGroup = async (groupId: string, userId: string) => {
    if (!supabase) return false;

    const { error: unshareError } = await supabase
      .from('todo_group_shares')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (unshareError) {
      setError(unshareError.message);
      return false;
    }

    await refresh();
    return true;
  };

  const updateGroupSharePermission = async (groupId: string, userId: string, permission: 'view' | 'edit') => {
    if (!supabase) return false;

    const { error: updateError } = await supabase
      .from('todo_group_shares')
      .update({ permission })
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    await refresh();
    return true;
  };

  // List share management
  const shareList = async (listId: string, userId: string, permission: 'view' | 'edit' = 'edit') => {
    if (!supabase) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error: shareError } = await supabase
      .from('todo_list_shares')
      .insert({ list_id: listId, user_id: userId, permission });

    if (shareError) {
      setError(shareError.message);
      return false;
    }

    // Get sharer's name and list info for notification
    const list = lists.find(l => l.id === listId);
    const { data: sharerProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    
    const sharerName = sharerProfile?.full_name || 'Jemand';
    const listName = list?.name || 'Liste';
    const permissionLabel = permission === 'edit' ? 'Bearbeiten' : 'Ansehen';

    // In-app notification
    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Zu Liste hinzugefügt',
      message: `${sharerName} hat dich zur Liste "${listName}" hinzugefügt (${permissionLabel})`,
      type: 'list_shared',
      link: '/aufgaben'
    });

    // Push notification
    try {
      await supabase.functions.invoke('send-push', {
        body: {
          userId: userId,
          title: '📝 Zu Liste hinzugefügt',
          body: `${sharerName} hat dich zur Liste "${listName}" hinzugefügt`,
          url: '/aufgaben'
        }
      });
    } catch (e) {
      console.error('Push notification failed:', e);
    }

    await fetchLists();
    return true;
  };

  const unshareList = async (listId: string, userId: string) => {
    if (!supabase) return false;

    const { error: unshareError } = await supabase
      .from('todo_list_shares')
      .delete()
      .eq('list_id', listId)
      .eq('user_id', userId);

    if (unshareError) {
      setError(unshareError.message);
      return false;
    }

    await fetchLists();
    return true;
  };

  const updateSharePermission = async (listId: string, userId: string, permission: 'view' | 'edit') => {
    if (!supabase) return false;

    const { error: updateError } = await supabase
      .from('todo_list_shares')
      .update({ permission })
      .eq('list_id', listId)
      .eq('user_id', userId);

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    await fetchLists();
    return true;
  };

  // Reorder lists
  const reorderLists = async (listIds: string[]) => {
    if (!supabase) return false;

    const updates = listIds.map((id, index) => 
      supabase.from('todo_lists').update({ sort_order: index }).eq('id', id)
    );

    await Promise.all(updates);
    await fetchLists();
    return true;
  };

  // Favorites management
  const addFavorite = async (itemType: 'list' | 'group', itemId: string) => {
    if (!supabase) return false;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error: favError } = await supabase
      .from('todo_favorites')
      .insert({ user_id: user.id, item_type: itemType, item_id: itemId });

    if (favError) {
      // Ignore duplicate errors
      if (!favError.message.includes('duplicate')) {
        setError(favError.message);
        return false;
      }
    }

    await fetchFavorites();
    return true;
  };

  const removeFavorite = async (itemType: 'list' | 'group', itemId: string) => {
    if (!supabase) return false;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error: favError } = await supabase
      .from('todo_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('item_type', itemType)
      .eq('item_id', itemId);

    if (favError) {
      setError(favError.message);
      return false;
    }

    await fetchFavorites();
    return true;
  };

  const isFavorite = (itemType: 'list' | 'group', itemId: string): boolean => {
    return favorites.some(f => f.item_type === itemType && f.item_id === itemId);
  };

  const toggleFavorite = async (itemType: 'list' | 'group', itemId: string) => {
    if (isFavorite(itemType, itemId)) {
      return removeFavorite(itemType, itemId);
    } else {
      return addFavorite(itemType, itemId);
    }
  };

  return {
    lists,
    groups,
    favorites,
    loading,
    error,
    refresh,
    createList,
    updateList,
    deleteList,
    createGroup,
    updateGroup,
    deleteGroup,
    shareGroup,
    unshareGroup,
    updateGroupSharePermission,
    shareList,
    unshareList,
    updateSharePermission,
    reorderLists,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite
  };
}
