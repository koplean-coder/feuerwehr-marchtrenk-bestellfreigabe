import { useState } from 'react';
import {
  Sun,
  Star,
  Calendar,
  User,
  List,
  Plus,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  FolderPlus,
  Pencil,
  Trash2,
  Users,
  UsersRound,
  Home,
  Folder,
  X } from
'lucide-react';
import type { TodoListWithCounts, TodoGroupWithShares, SmartListType, TodoFavorite } from '@/hooks/useTodoLists';

interface TodoSidebarProps {
  lists: TodoListWithCounts[];
  groups: TodoGroupWithShares[];
  favorites: TodoFavorite[];
  selectedListId: string | null;
  selectedSmartList: SmartListType | null;
  onSelectList: (listId: string) => void;
  onSelectSmartList: (type: SmartListType) => void;
  onCreateList: (name: string, groupId?: string) => void;
  onCreateGroup: (name: string) => void;
  onRenameList: (id: string, name: string) => void;
  onDeleteList: (id: string) => void;
  onRenameGroup: (id: string, name: string) => void;
  onDeleteGroup: (id: string) => void;
  onShareList?: (listId: string) => void;
  onShareGroup?: (groupId: string) => void;
  onToggleFavorite: (itemType: 'list' | 'group', itemId: string) => void;
  isFavorite: (itemType: 'list' | 'group', itemId: string) => boolean;
  smartListCounts: {
    myDay: number;
    important: number;
    planned: number;
    assignedToMe: number;
    all: number;
  };
  currentUserId?: string;
}

const SMART_LISTS: {type: SmartListType;label: string;icon: typeof Sun;color: string;}[] = [
{ type: 'my_day', label: 'Mein Tag', icon: Sun, color: 'text-amber-500' },
{ type: 'important', label: 'Wichtig', icon: Star, color: 'text-rose-500' },
{ type: 'planned', label: 'Geplant', icon: Calendar, color: 'text-emerald-500' },
{ type: 'assigned_to_me', label: 'Mir zugewiesen', icon: User, color: 'text-blue-500' },
{ type: 'all', label: 'Aufgaben', icon: Home, color: 'text-indigo-500' }];


export function TodoSidebar({
  lists,
  groups,
  favorites,
  selectedListId,
  selectedSmartList,
  onSelectList,
  onSelectSmartList,
  onCreateList,
  onCreateGroup,
  onRenameList,
  onDeleteList,
  onRenameGroup,
  onDeleteGroup,
  onShareList,
  onShareGroup,
  onToggleFavorite,
  isFavorite,
  smartListCounts,
  currentUserId
}: TodoSidebarProps) {
  // Section collapse states - Favorites open, Groups/Lists closed
  const [favoritesExpanded, setFavoritesExpanded] = useState(true);
  const [groupsExpanded, setGroupsExpanded] = useState(false);
  const [listsExpanded, setListsExpanded] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListGroupId, setNewListGroupId] = useState<string | undefined>();
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [contextMenu, setContextMenu] = useState<{type: 'list' | 'group';id: string;x: number;y: number;} | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const handleCreateList = () => {
    if (newListName.trim()) {
      onCreateList(newListName.trim(), newListGroupId);
      setNewListName('');
      setShowNewListInput(false);
      setNewListGroupId(undefined);
    }
  };

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      onCreateGroup(newGroupName.trim());
      setNewGroupName('');
      setShowNewGroupInput(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, type: 'list' | 'group', id: string) => {
    e.preventDefault();
    const menuHeight = 180; // approximate menu height
    const viewportHeight = window.innerHeight;
    let y = e.clientY;

    // If menu would go below viewport, position it above the click point
    if (y + menuHeight > viewportHeight) {
      y = Math.max(10, viewportHeight - menuHeight - 10);
    }

    setContextMenu({ type, id, x: e.clientX, y });
  };

  const handleRename = () => {
    if (!contextMenu) return;
    setEditingId(contextMenu.id);
    const item = contextMenu.type === 'list' ?
    lists.find((l) => l.id === contextMenu.id) :
    groups.find((g) => g.id === contextMenu.id);
    setEditingName(item?.name ?? '');
    setContextMenu(null);
  };

  const handleDelete = () => {
    if (!contextMenu) return;
    if (contextMenu.type === 'list') {
      onDeleteList(contextMenu.id);
    } else {
      onDeleteGroup(contextMenu.id);
    }
    setContextMenu(null);
  };

  const handleShare = () => {
    if (!contextMenu) return;
    if (contextMenu.type === 'list') {
      onShareList?.(contextMenu.id);
    } else {
      onShareGroup?.(contextMenu.id);
    }
    setContextMenu(null);
  };

  const handleToggleFavorite = () => {
    if (!contextMenu) return;
    onToggleFavorite(contextMenu.type, contextMenu.id);
    setContextMenu(null);
  };

  const isListOwner = (listId: string): boolean => {
    const list = lists.find((l) => l.id === listId);
    return list?.created_by === currentUserId;
  };

  const isGroupOwner = (groupId: string): boolean => {
    const group = groups.find((g) => g.id === groupId);
    return group?.created_by === currentUserId;
  };

  const saveRename = (type: 'list' | 'group', id: string) => {
    if (editingName.trim()) {
      if (type === 'list') {
        onRenameList(id, editingName.trim());
      } else {
        onRenameGroup(id, editingName.trim());
      }
    }
    setEditingId(null);
    setEditingName('');
  };

  // Get favorite lists and groups
  const favoriteLists = lists.filter((l) => isFavorite('list', l.id));
  const favoriteGroups = groups.filter((g) => isFavorite('group', g.id));
  const hasFavorites = favoriteLists.length > 0 || favoriteGroups.length > 0;

  // Ungrouped lists (not in any group)
  const ungroupedLists = lists.filter((l) => !l.group_id && !l.is_smart_list);

  const getSmartListCount = (type: SmartListType): number => {
    switch (type) {
      case 'my_day':return smartListCounts.myDay;
      case 'important':return smartListCounts.important;
      case 'planned':return smartListCounts.planned;
      case 'assigned_to_me':return smartListCounts.assignedToMe;
      case 'all':return smartListCounts.all;
      default:return 0;
    }
  };

  // Render a list item
  const renderListItem = (list: TodoListWithCounts, inGroup = false) =>
  <div data-ev-id="ev_ac55801fdf" key={list.id} onContextMenu={(e) => handleContextMenu(e, 'list', list.id)} className="group relative">
      {editingId === list.id ?
    <input data-ev-id="ev_6400960197"
    type="text"
    value={editingName}
    onChange={(e) => setEditingName(e.target.value)}
    onBlur={() => saveRename('list', list.id)}
    onKeyDown={(e) => e.key === 'Enter' && saveRename('list', list.id)}
    className="w-full px-3 py-2 rounded-lg border border-sky-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
    autoFocus /> :

    <div data-ev-id="ev_7ab1b00ed9" className="flex items-center">
      <button data-ev-id="ev_04a6c89f18"
      onClick={() => onSelectList(list.id)}
      className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
      selectedListId === list.id ?
      'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300' :
      'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'}`
      }>
        <List size={inGroup ? 16 : 18} style={{ color: list.color ?? '#0ea5e9' }} />
        <span data-ev-id="ev_3a7bf06911" className="flex-1 font-medium truncate text-sm">{list.name}</span>
        {isFavorite('list', list.id) &&
        <Star size={14} className="text-amber-500 fill-amber-500" />
        }
        {(list.shares?.length ?? 0) > 0 &&
        <Users size={14} className="text-slate-400" />
        }
        {(list.task_count ?? 0) > 0 &&
        <span data-ev-id="ev_33ba55d085" className="text-xs text-slate-500 dark:text-slate-400">
            {(list.task_count ?? 0) - (list.completed_count ?? 0)}
          </span>
        }
      </button>
      <button data-ev-id="ev_d181231353"
      onClick={(e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const menuHeight = 180;
        const viewportHeight = window.innerHeight;
        let y = rect.bottom;
        if (y + menuHeight > viewportHeight) {
          y = Math.max(10, rect.top - menuHeight);
        }
        setContextMenu({ type: 'list', id: list.id, x: rect.left, y });
      }}
      className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">

        <MoreHorizontal size={16} className="text-slate-500" />
      </button>
    </div>
    }
  </div>;


  // Render a group item
  const renderGroupItem = (group: TodoGroupWithShares, showChildren = true) => {
    const groupLists = lists.filter((l) => l.group_id === group.id);
    const isExpanded = expandedGroups.has(group.id);

    return (
      <div data-ev-id="ev_6cf0078330" key={group.id} className="group/grp">
        <div data-ev-id="ev_d96caef39a"
        onContextMenu={(e) => handleContextMenu(e, 'group', group.id)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
        onClick={() => showChildren && toggleGroup(group.id)}>

          {showChildren && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
          {!showChildren && <UsersRound size={16} className="text-sky-500" />}
          {editingId === group.id ?
          <input data-ev-id="ev_97a4332c7e"
          type="text"
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          onBlur={() => saveRename('group', group.id)}
          onKeyDown={(e) => e.key === 'Enter' && saveRename('group', group.id)}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 px-2 py-1 rounded border border-sky-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
          autoFocus /> :


          <span data-ev-id="ev_26357dab6d" className="flex-1 font-medium text-slate-600 dark:text-slate-300 text-sm">
              {group.name}
            </span>
          }
          {isFavorite('group', group.id) &&
          <Star size={14} className="text-amber-500 fill-amber-500" />
          }
          {(group.shares?.length ?? 0) > 0 &&
          <Users size={14} className="text-slate-400" />
          }
          <span data-ev-id="ev_9d9f2c8392" className="text-xs text-slate-400">{groupLists.length}</span>
          <button data-ev-id="ev_a26b5f535a"
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const menuHeight = 180;
            const viewportHeight = window.innerHeight;
            let y = rect.bottom;
            if (y + menuHeight > viewportHeight) {
              y = Math.max(10, rect.top - menuHeight);
            }
            setContextMenu({ type: 'group', id: group.id, x: rect.left, y });
          }}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 opacity-100 lg:opacity-0 lg:group-hover/grp:opacity-100 transition-opacity">

            <MoreHorizontal size={14} className="text-slate-500" />
          </button>
        </div>

        {showChildren && isExpanded &&
        <div data-ev-id="ev_91406e7728" className="ml-6 flex flex-col gap-1 mt-1">
            {groupLists.map((list) => renderListItem(list, true))}
            <button data-ev-id="ev_0837d0699c"
          onClick={() => {
            setNewListGroupId(group.id);
            setShowNewListInput(true);
          }}
          className="flex items-center gap-2 px-3 py-1.5 text-sky-600 dark:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs">

              <Plus size={14} />
              <span data-ev-id="ev_56d87ab4c6">Liste hinzufügen</span>
            </button>
          </div>
        }
      </div>);

  };

  // Section Header Component
  const SectionHeader = ({
    title,
    count,
    expanded,
    onToggle,
    icon: Icon






  }: {title: string;count: number;expanded: boolean;onToggle: () => void;icon: typeof Star;}) =>
  <button data-ev-id="ev_01d99ab3d4"
  onClick={onToggle}
  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">

      {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      <Icon size={14} />
      <span data-ev-id="ev_022c4091f9" className="flex-1 text-left">{title}</span>
      <span data-ev-id="ev_faf6d4e913" className="text-slate-400">({count})</span>
    </button>;


  return (
    <div data-ev-id="ev_eb04ca29ff" className="w-72 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-600 flex flex-col h-full max-h-screen overflow-y-auto">
      {/* Smart Lists */}
      <div data-ev-id="ev_928dc85547" className="p-3 flex flex-col gap-1">
        {SMART_LISTS.map(({ type, label, icon: Icon, color }) => {
          const count = getSmartListCount(type);
          return (
            <button data-ev-id="ev_37913f4aa9"
            key={type}
            onClick={() => onSelectSmartList(type)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
            selectedSmartList === type ?
            'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300' :
            'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'}`
            }>

              <Icon size={20} className={color} />
              <span data-ev-id="ev_f992fcc7c2" className="flex-1 font-medium">{label}</span>
              {count > 0 &&
              <span data-ev-id="ev_3b621116f5" className="text-sm text-slate-500 dark:text-slate-300">{count}</span>
              }
            </button>);

        })}
      </div>

      <div data-ev-id="ev_ca79bb7196" className="border-t border-slate-200 dark:border-slate-600 my-1" />

      {/* Sections */}
      <div data-ev-id="ev_bf1a4bb959" className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        
        {/* Favorites Section - Always visible */}
        <div data-ev-id="ev_36e5df1885">
          <SectionHeader
            title="Favoriten"
            count={favoriteLists.length + favoriteGroups.length}
            expanded={favoritesExpanded}
            onToggle={() => setFavoritesExpanded(!favoritesExpanded)}
            icon={Star} />

          {favoritesExpanded &&
          <div data-ev-id="ev_c69ef17932" className="ml-2 flex flex-col gap-1 mt-1">
              {favoriteGroups.length === 0 && favoriteLists.length === 0 ?
            <span data-ev-id="ev_dd51680998" className="text-xs text-slate-400 px-3 py-2 italic">
                  Rechtsklick auf Liste/Gruppe → "Zu Favoriten"
                </span> :

            <>
                  {favoriteGroups.length > 0 &&
              <>
                      <span data-ev-id="ev_ab23c54890" className="text-[10px] text-slate-400 uppercase tracking-wider px-3 pt-1">Gruppen</span>
                      {favoriteGroups.map((group) => renderGroupItem(group, false))}
                    </>
              }
                  {favoriteGroups.length > 0 && favoriteLists.length > 0 &&
              <div data-ev-id="ev_6c3d2bee5b" className="border-t border-slate-200 dark:border-slate-600 my-1 mx-2" />
              }
                  {favoriteLists.length > 0 &&
              <>
                      <span data-ev-id="ev_8c63c374f0" className="text-[10px] text-slate-400 uppercase tracking-wider px-3 pt-1">Listen</span>
                      {favoriteLists.map((list) => renderListItem(list))}
                    </>
              }
                </>
            }
            </div>
          }
        </div>

        {/* Groups Section */}
        {groups.length > 0 &&
        <div data-ev-id="ev_220b90e708">
            <SectionHeader
            title="Gruppen"
            count={groups.length}
            expanded={groupsExpanded}
            onToggle={() => setGroupsExpanded(!groupsExpanded)}
            icon={UsersRound} />

            {groupsExpanded &&
          <div data-ev-id="ev_03ae260a05" className="ml-2 flex flex-col gap-1 mt-1">
                {groups.map((group) => renderGroupItem(group, true))}
              </div>
          }
          </div>
        }

        {/* Lists Section (ungrouped) */}
        {ungroupedLists.length > 0 &&
        <div data-ev-id="ev_ae3a03bcd0">
            <SectionHeader
            title="Listen"
            count={ungroupedLists.length}
            expanded={listsExpanded}
            onToggle={() => setListsExpanded(!listsExpanded)}
            icon={List} />

            {listsExpanded &&
          <div data-ev-id="ev_503cb38e8d" className="ml-2 flex flex-col gap-1 mt-1">
                {ungroupedLists.map((list) => renderListItem(list))}
              </div>
          }
          </div>
        }

        {/* New List Input */}
        {showNewListInput &&
        <div data-ev-id="ev_1552532b10" className="flex items-center gap-2 px-3 py-2">
            <input data-ev-id="ev_bdec121c51"
          type="text"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
          placeholder="Listenname..."
          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
          autoFocus />

            <button data-ev-id="ev_a0037d457f"
          onClick={handleCreateList}
          className="px-3 py-2 bg-sky-600 text-white rounded-lg text-sm hover:bg-sky-700">

              OK
            </button>
            <button data-ev-id="ev_f4dcf811ce"
          onClick={() => {
            setShowNewListInput(false);
            setNewListName('');
            setNewListGroupId(undefined);
          }}
          className="px-3 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">

              ✕
            </button>
          </div>
        }

        {/* New Group Input */}
        {showNewGroupInput &&
        <div data-ev-id="ev_b1f3dc6893" className="flex items-center gap-2 px-3 py-2">
            <input data-ev-id="ev_b33e6ba4e3"
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
          placeholder="Gruppenname..."
          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
          autoFocus />

            <button data-ev-id="ev_012cee59e6"
          onClick={handleCreateGroup}
          className="px-3 py-2 bg-sky-600 text-white rounded-lg text-sm hover:bg-sky-700">

              OK
            </button>
            <button data-ev-id="ev_e96ad81157"
          onClick={() => {
            setShowNewGroupInput(false);
            setNewGroupName('');
          }}
          className="px-3 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">

              ✕
            </button>
          </div>
        }
      </div>

      {/* Footer Actions */}
      <div data-ev-id="ev_14edde2ea5" className="p-3 border-t border-slate-200 dark:border-slate-600 flex flex-col gap-2">
        <button data-ev-id="ev_f08b338a55"
        onClick={() => setShowNewListInput(true)}
        className="flex items-center gap-3 px-3 py-2.5 text-sky-600 dark:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">

          <Plus size={20} />
          <span data-ev-id="ev_76c97793de" className="font-medium">Neue Liste</span>
        </button>
        <button data-ev-id="ev_47a58f32ec"
        onClick={() => setShowNewGroupInput(true)}
        className="flex items-center gap-3 px-3 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">

          <FolderPlus size={20} />
          <span data-ev-id="ev_52fab6eba8" className="font-medium">Neue Gruppe</span>
        </button>
      </div>

      {/* Context Menu - Centered Modal */}
      {contextMenu &&
      <>
          <div data-ev-id="ev_ea8243b11c"
        className="fixed inset-0 z-[9998] bg-black/20"
        onClick={() => setContextMenu(null)} />

          <div data-ev-id="ev_acd774fdf8" className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
            <div data-ev-id="ev_541ae28f27" className="bg-white dark:bg-slate-700 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-600 w-full max-w-[280px] pointer-events-auto overflow-hidden">
              {/* Header */}
              <div data-ev-id="ev_514607ff2b" className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800">
                <div data-ev-id="ev_6ca7335ff8" className="flex items-center gap-2">
                  {contextMenu.type === 'group' ?
                <UsersRound size={18} className="text-sky-500" /> :

                <List size={18} className="text-sky-500" />
                }
                  <span data-ev-id="ev_63a2976a6b" className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[180px]">
                    {contextMenu.type === 'group' ?
                  groups.find((g) => g.id === contextMenu.id)?.name :
                  lists.find((l) => l.id === contextMenu.id)?.name}
                  </span>
                </div>
                <button data-ev-id="ev_8949b4d59d"
              onClick={() => setContextMenu(null)}
              className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600">

                  <X size={18} className="text-slate-500" />
                </button>
              </div>
              
              {/* Actions */}
              <div data-ev-id="ev_65d759fe52" className="py-1">
                <button data-ev-id="ev_7f4d4af46b"
              onClick={handleToggleFavorite}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300">

                  <Star
                  size={18}
                  className={isFavorite(contextMenu.type, contextMenu.id) ? 'text-amber-500 fill-amber-500' : 'text-slate-400'} />

                  <span data-ev-id="ev_4fb3fd34a9">
                    {isFavorite(contextMenu.type, contextMenu.id) ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                  </span>
                </button>
                
                <button data-ev-id="ev_c1d6aa53a0"
              onClick={handleRename}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300">

                  <Pencil size={18} className="text-slate-400" />
                  <span data-ev-id="ev_20d5611107">Umbenennen</span>
                </button>
                
                {(contextMenu?.type === 'list' && isListOwner(contextMenu.id) ||
              contextMenu?.type === 'group' && isGroupOwner(contextMenu.id)) &&
              <button data-ev-id="ev_fc3b10413b"
              onClick={handleShare}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300">

                    <Users size={18} className="text-slate-400" />
                    <span data-ev-id="ev_d63140ed94">Mitglieder verwalten</span>
                  </button>
              }
                
                <div data-ev-id="ev_f0f70fc877" className="border-t border-slate-200 dark:border-slate-600 my-1" />
                
                <button data-ev-id="ev_c69eff5fab"
              onClick={handleDelete}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400">

                  <Trash2 size={18} />
                  <span data-ev-id="ev_f6e3d531e1">Löschen</span>
                </button>
              </div>
            </div>
          </div>
        </>
      }
    </div>);

}