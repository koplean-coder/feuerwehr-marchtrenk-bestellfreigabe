import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTodoLists, type SmartListType } from '@/hooks/useTodoLists';
import { useTodoTasks } from '@/hooks/useTodoTasks';
import { useTodoSettings } from '@/hooks/useTodoSettings';
import { useProfiles } from '@/hooks/useProfiles';
import { Layout } from '@/components/Layout';
import { TodoSidebar, TodoTaskList, TodoTaskDetail, TodoShareModal } from '@/components/todo';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Lock } from 'lucide-react';

export default function Tasks() {
  const { profile } = useAuth();
  const { canViewTodo, loading: settingsLoading } = useTodoSettings();
  const { lists, groups, favorites, loading: listsLoading, createList, updateList, deleteList, createGroup, updateGroup, deleteGroup, shareGroup, unshareGroup, updateGroupSharePermission, shareList, unshareList, updateSharePermission, refresh: refreshLists, isFavorite, toggleFavorite } = useTodoLists();
  const { profiles } = useProfiles();

  // Selection state
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedSmartList, setSelectedSmartList] = useState<SmartListType | null>('my_day');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [shareModalListId, setShareModalListId] = useState<string | null>(null);
  const [shareModalGroupId, setShareModalGroupId] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Determine current filter for tasks
  const taskFilters = selectedSmartList ?
  { smartList: selectedSmartList, showCompleted: true } :
  selectedListId ?
  { listId: selectedListId, showCompleted: true } :
  { showCompleted: true };

  const {
    tasks,
    loading: tasksLoading,
    refresh: refreshTasks,
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
    shareTask,
    unshareTask,
    updateTaskSharePermission,
    // Comments
    fetchComments,
    addComment,
    markCommentsAsRead
  } = useTodoTasks(taskFilters);

  // Smart list counts
  const [smartListCounts, setSmartListCounts] = useState({
    myDay: 0,
    important: 0,
    planned: 0,
    assignedToMe: 0,
    all: 0
  });

  // Fetch smart list counts
  const fetchSmartListCounts = useCallback(async () => {
    if (!supabase || !profile?.id) return;

    const today = new Date().toISOString().split('T')[0];

    try {
      // Get task IDs shared with this user
      const { data: sharedTasks } = await supabase
        .from('todo_task_shares')
        .select('task_id')
        .eq('shared_with_id', profile.id);
      
      const sharedTaskIds = (sharedTasks || []).map(s => s.task_id);
      
      // Base filter for "my tasks": created by me OR assigned to me OR shared with me
      const myTasksFilter = sharedTaskIds.length > 0
        ? `created_by.eq.${profile.id},assigned_to.eq.${profile.id},id.in.(${sharedTaskIds.join(',')})`
        : `created_by.eq.${profile.id},assigned_to.eq.${profile.id}`;

      // My Day count - only MY tasks: manually added + due today + overdue + no date
      const { count: myDayCount } = await supabase
        .from('todo_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('is_completed', false)
        .or(myTasksFilter)
        .or(
          `and(is_in_my_day.eq.true,my_day_date.eq.${today}),due_date.eq.${today},due_date.lt.${today},and(assigned_to.eq.${profile.id},due_date.is.null)`
        );

      // Important count - only MY tasks
      const { count: importantCount } = await supabase
        .from('todo_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('is_important', true)
        .eq('is_completed', false)
        .or(myTasksFilter);

      // Planned count - only MY tasks
      const { count: plannedCount } = await supabase
        .from('todo_tasks')
        .select('*', { count: 'exact', head: true })
        .not('due_date', 'is', null)
        .eq('is_completed', false)
        .or(myTasksFilter);

      // Assigned to me count
      const { count: assignedCount } = await supabase
        .from('todo_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', profile.id)
        .eq('is_completed', false);

      // All tasks count - only MY tasks
      const { count: allCount } = await supabase
        .from('todo_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('is_completed', false)
        .or(myTasksFilter);

      setSmartListCounts({
        myDay: myDayCount ?? 0,
        important: importantCount ?? 0,
        planned: plannedCount ?? 0,
        assignedToMe: assignedCount ?? 0,
        all: allCount ?? 0
      });
    } catch (err) {
      console.error('Error fetching smart list counts:', err);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchSmartListCounts();
  }, [fetchSmartListCounts, tasks]);

  // Get selected task
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  // Get current list info
  const currentList = selectedListId ? lists.find((l) => l.id === selectedListId) : null;
  const currentListName = currentList?.name ?? 'Aufgaben';
  const currentListColor = currentList?.color ?? '#3b82f6';

  // Handlers
  const handleSelectList = (listId: string) => {
    setSelectedListId(listId);
    setSelectedSmartList(null);
    setSelectedTaskId(null);
  };

  const handleSelectSmartList = (type: SmartListType) => {
    setSelectedSmartList(type);
    setSelectedListId(null);
    setSelectedTaskId(null);
  };

  const handleCreateList = async (name: string, groupId?: string) => {
    await createList({ name, group_id: groupId ?? null });
  };

  const handleRenameList = async (id: string, name: string) => {
    await updateList(id, { name });
  };

  const handleDeleteList = async (id: string) => {
    if (selectedListId === id) {
      setSelectedListId(null);
      setSelectedSmartList('my_day');
    }
    await deleteList(id);
  };

  const handleCreateGroup = async (name: string) => {
    await createGroup(name);
  };

  const handleRenameGroup = async (id: string, name: string) => {
    await updateGroup(id, { name });
  };

  const handleDeleteGroup = async (id: string) => {
    await deleteGroup(id);
  };

  const handleCreateTask = async (title: string) => {
    // Determine which list to create in
    let listId = selectedListId;

    // If in smart list, create in first available list or create default
    if (!listId && selectedSmartList) {
      const normalLists = lists.filter((l) => !l.is_smart_list);
      if (normalLists.length > 0) {
        listId = normalLists[0].id;
      } else {
        // Create a default "Aufgaben" list
        const newList = await createList({ name: 'Aufgaben' });
        if (newList) {
          listId = newList.id;
        }
      }
    }

    if (!listId) return;

    const taskData: Record<string, unknown> = {
      title,
      list_id: listId
    };

    // Apply smart list defaults
    if (selectedSmartList === 'my_day') {
      taskData.is_in_my_day = true;
      taskData.my_day_date = new Date().toISOString().split('T')[0];
    } else if (selectedSmartList === 'important') {
      taskData.is_important = true;
    }

    await createTask(taskData as Parameters<typeof createTask>[0]);
    await fetchSmartListCounts();
  };

  const handleUpdateTask = async (updates: Record<string, unknown>) => {
    if (!selectedTaskId) return;
    await updateTask(selectedTaskId, updates);
    await fetchSmartListCounts();
  };

  const handleDeleteTask = async () => {
    if (!selectedTaskId) return;
    const success = await deleteTask(selectedTaskId);
    if (success) {
      setSelectedTaskId(null);
      await fetchSmartListCounts();
    } else {
      alert('Aufgabe konnte nicht gelöscht werden. Möglicherweise fehlen die Berechtigungen.');
    }
  };

  const handleToggleComplete = async (taskId: string) => {
    await toggleComplete(taskId);
    await fetchSmartListCounts();
  };

  const handleToggleImportant = async (taskId: string) => {
    await toggleImportant(taskId);
    await fetchSmartListCounts();
  };

  const handleAddToMyDay = async (taskId: string) => {
    await addToMyDay(taskId);
    await fetchSmartListCounts();
  };

  const handleRemoveFromMyDay = async () => {
    if (!selectedTaskId) return;
    await removeFromMyDay(selectedTaskId);
    await fetchSmartListCounts();
  };

  // List share handlers
  const handleOpenShareModal = (listId: string) => {
    setShareModalListId(listId);
  };

  const handleShareList = async (userId: string, permission: 'view' | 'edit') => {
    if (!shareModalListId) return;
    await shareList(shareModalListId, userId, permission);
  };

  const handleUnshareList = async (userId: string) => {
    if (!shareModalListId) return;
    await unshareList(shareModalListId, userId);
  };

  const handleUpdateSharePermission = async (userId: string, permission: 'view' | 'edit') => {
    if (!shareModalListId) return;
    await updateSharePermission(shareModalListId, userId, permission);
  };

  // Group share handlers
  const handleOpenGroupShareModal = (groupId: string) => {
    setShareModalGroupId(groupId);
  };

  const handleShareGroup = async (userId: string, permission: 'view' | 'edit') => {
    if (!shareModalGroupId) return;
    await shareGroup(shareModalGroupId, userId, permission);
  };

  const handleUnshareGroup = async (userId: string) => {
    if (!shareModalGroupId) return;
    await unshareGroup(shareModalGroupId, userId);
  };

  const handleUpdateGroupSharePermission = async (userId: string, permission: 'view' | 'edit') => {
    if (!shareModalGroupId) return;
    await updateGroupSharePermission(shareModalGroupId, userId, permission);
  };

  // Loading state
  if (settingsLoading || listsLoading) {
    return (
      <Layout>
        <div data-ev-id="ev_1dac40cc3a" className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </Layout>);

  }

  // Access denied
  if (!canViewTodo()) {
    return (
      <Layout>
        <div data-ev-id="ev_6dbc583111" className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-slate-500">
          <Lock className="w-16 h-16 mb-4" />
          <h2 data-ev-id="ev_6057398a2b" className="text-xl font-semibold mb-2">Kein Zugriff</h2>
          <p data-ev-id="ev_72403ecd68">Du hast keine Berechtigung, die Aufgaben zu sehen.</p>
        </div>
      </Layout>);

  }

  // Handle list/smart list selection - close mobile sidebar after selection
  const handleMobileSelectList = (listId: string) => {
    handleSelectList(listId);
    setShowMobileSidebar(false);
  };

  const handleMobileSelectSmartList = (type: SmartListType) => {
    handleSelectSmartList(type);
    setShowMobileSidebar(false);
  };

  return (
    <Layout>
      <div data-ev-id="ev_7a043ae130" className="flex h-[calc(100vh-4rem)] overflow-hidden -m-4 sm:-m-6 relative">
        {/* Mobile Sidebar Overlay */}
        {showMobileSidebar &&
        <div data-ev-id="ev_188e5061ee"
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={() => setShowMobileSidebar(false)} />

        }
        
        {/* Sidebar - hidden on mobile by default, shown when toggled */}
        <div data-ev-id="ev_4fc02eaa12" className={`
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          transform transition-transform duration-300 ease-in-out
          ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <TodoSidebar
            lists={lists}
            groups={groups}
            favorites={favorites}
            selectedListId={selectedListId}
            selectedSmartList={selectedSmartList}
            onSelectList={handleMobileSelectList}
            onSelectSmartList={handleMobileSelectSmartList}
            onCreateList={handleCreateList}
            onCreateGroup={handleCreateGroup}
            onRenameList={handleRenameList}
            onDeleteList={handleDeleteList}
            onRenameGroup={handleRenameGroup}
            onDeleteGroup={handleDeleteGroup}
            onShareList={handleOpenShareModal}
            onShareGroup={handleOpenGroupShareModal}
            onToggleFavorite={toggleFavorite}
            isFavorite={isFavorite}
            smartListCounts={smartListCounts}
            currentUserId={profile?.id} />
        </div>


        {/* Task List */}
        <TodoTaskList
          tasks={tasks}
          listName={currentListName}
          listColor={currentListColor}
          smartListType={selectedSmartList}
          selectedTaskId={selectedTaskId}
          onSelectTask={setSelectedTaskId}
          onCreateTask={handleCreateTask}
          onToggleComplete={handleToggleComplete}
          onToggleImportant={handleToggleImportant}
          onAddToMyDay={handleAddToMyDay}
          onToggleMobileSidebar={() => setShowMobileSidebar(true)} />


        {/* Task Detail Panel */}
        {selectedTask && (() => {
          const taskList = lists.find(l => l.id === selectedTask.list_id);
          const isListOwner = taskList?.created_by === profile?.id;
          
          // Compute assignable profiles: all active organization members
          const assignableProfiles = profiles.filter(p => p.is_active !== false);
          
          return (
            <TodoTaskDetail
              task={selectedTask}
              profiles={profiles}
              assignableProfiles={assignableProfiles}
              currentUserId={profile?.id}
              isListOwner={isListOwner}
              onClose={() => setSelectedTaskId(null)}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onToggleComplete={() => handleToggleComplete(selectedTask.id)}
              onToggleImportant={() => handleToggleImportant(selectedTask.id)}
              onAddToMyDay={() => handleAddToMyDay(selectedTask.id)}
              onRemoveFromMyDay={handleRemoveFromMyDay}
              onCreateStep={(title) => createStep(selectedTask.id, title)}
              onToggleStepComplete={toggleStepComplete}
              onDeleteStep={deleteStep}
              onUpdateStep={(stepId, title) => updateStep(stepId, { title })}
              onAssign={(userId) => assignTask(selectedTask.id, userId)}
              onSetDueDate={(date, time) => setDueDate(selectedTask.id, date, time)}
              onSetReminder={(dateTime) => setReminder(selectedTask.id, dateTime)}
              onShareTask={(userId, permission) => shareTask(selectedTask.id, userId, permission)}
              onUnshareTask={(userId) => unshareTask(selectedTask.id, userId)}
              onUpdateTaskSharePermission={(userId, permission) => updateTaskSharePermission(selectedTask.id, userId, permission)}
              onFetchComments={fetchComments}
              onAddComment={addComment}
              onMarkCommentsAsRead={markCommentsAsRead} />
          );
        })()

        }

        {/* List Share Modal */}
        {shareModalListId && (() => {
          const shareList = lists.find((l) => l.id === shareModalListId);
          return shareList ?
          <TodoShareModal
            listName={shareList.name}
            shares={shareList.shares ?? []}
            profiles={profiles}
            currentUserId={profile?.id ?? ''}
            onClose={() => setShareModalListId(null)}
            onShare={handleShareList}
            onUnshare={handleUnshareList}
            onUpdatePermission={handleUpdateSharePermission} /> :
          null;
        })()}

        {/* Group Share Modal */}
        {shareModalGroupId && (() => {
          const shareGroupItem = groups.find((g) => g.id === shareModalGroupId);
          return shareGroupItem ?
          <TodoShareModal
            listName={shareGroupItem.name}
            shares={shareGroupItem.shares ?? []}
            profiles={profiles}
            currentUserId={profile?.id ?? ''}
            onClose={() => setShareModalGroupId(null)}
            onShare={handleShareGroup}
            onUnshare={handleUnshareGroup}
            onUpdatePermission={handleUpdateGroupSharePermission} /> :
          null;
        })()}
      </div>
    </Layout>);

}