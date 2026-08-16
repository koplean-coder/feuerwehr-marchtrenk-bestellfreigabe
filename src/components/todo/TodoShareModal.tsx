import { useState } from 'react';
import { X, Users, Search, UserPlus, Trash2, Check } from 'lucide-react';
import type { TodoListShare, TodoGroupShare } from '@/hooks/useTodoLists';
import type { Profile } from '@/hooks/useProfiles';

type ShareItem = TodoListShare | TodoGroupShare;

interface TodoShareModalProps {
  listName: string;
  shares: ShareItem[];
  profiles: Profile[];
  currentUserId: string;
  onClose: () => void;
  onShare: (userId: string, permission: 'view' | 'edit') => void;
  onUnshare: (userId: string) => void;
  onUpdatePermission: (userId: string, permission: 'view' | 'edit') => void;
}

export function TodoShareModal({
  listName,
  shares,
  profiles,
  currentUserId,
  onClose,
  onShare,
  onUnshare,
  onUpdatePermission
}: TodoShareModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<'view' | 'edit'>('edit');

  const sharedUserIds = new Set(shares.map((s) => s.user_id));

  const availableProfiles = profiles.filter((p) =>
  p.id !== currentUserId &&
  !sharedUserIds.has(p.id) && (
  searchQuery === '' ||
  p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
  p.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sharedProfiles = shares.map((share) => ({
    ...share,
    profile: profiles.find((p) => p.id === share.user_id)
  }));

  const handleShare = (userId: string) => {
    onShare(userId, selectedPermission);
    setSearchQuery('');
  };

  return (
    <div data-ev-id="ev_01a4a3b6de" className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div data-ev-id="ev_0f55ce2f82" className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Modal */}
      <div data-ev-id="ev_780378be78" className="relative bg-white dark:bg-slate-700 rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div data-ev-id="ev_516e76b195" className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div data-ev-id="ev_7809fe82f4" className="flex items-center gap-3">
            <Users className="text-blue-500" size={24} />
            <div data-ev-id="ev_85cf72897d">
              <h2 data-ev-id="ev_5f3e03dfc6" className="text-lg font-semibold text-slate-900 dark:text-white">Liste teilen</h2>
              <p data-ev-id="ev_20830939f0" className="text-sm text-slate-500 dark:text-slate-300">{listName}</p>
            </div>
          </div>
          <button data-ev-id="ev_a9f8b78e20"
          onClick={onClose}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">

            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Search & Add */}
        <div data-ev-id="ev_7cb1105c52" className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div data-ev-id="ev_e4db70a3b8" className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input data-ev-id="ev_848984c3ef"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Person suchen..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-700 border-none rounded-lg text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500" />

          </div>

          {/* Permission selector */}
          <div data-ev-id="ev_970d3cfb69" className="flex gap-2 mt-3">
            <button data-ev-id="ev_6a8357d02d"
            onClick={() => setSelectedPermission('edit')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedPermission === 'edit' ?
            'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
            'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`
            }>

              Bearbeiten
            </button>
            <button data-ev-id="ev_40b5b8ab1e"
            onClick={() => setSelectedPermission('view')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedPermission === 'view' ?
            'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
            'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`
            }>

              Nur ansehen
            </button>
          </div>

          {/* Search Results */}
          {searchQuery && availableProfiles.length > 0 &&
          <div data-ev-id="ev_1463234ad2" className="mt-3 max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-lg">
              {availableProfiles.map((profile) =>
            <button data-ev-id="ev_a7cdb39581"
            key={profile.id}
            onClick={() => handleShare(profile.id)}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-left">

                  <div data-ev-id="ev_6381220dc3" className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-medium">
                    {profile.full_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div data-ev-id="ev_e3c5054bf6" className="flex-1 min-w-0">
                    <p data-ev-id="ev_5f345e98b1" className="font-medium text-slate-900 dark:text-white truncate">{profile.full_name}</p>
                    <p data-ev-id="ev_bd0f787ef0" className="text-sm text-slate-500 dark:text-slate-300 truncate">{profile.email}</p>
                  </div>
                  <UserPlus size={18} className="text-blue-500 flex-shrink-0" />
                </button>
            )}
            </div>
          }

          {searchQuery && availableProfiles.length === 0 &&
          <p data-ev-id="ev_8fe9afa57a" className="mt-3 text-sm text-slate-500 dark:text-slate-300 text-center py-4">
              Keine passenden Personen gefunden
            </p>
          }
        </div>

        {/* Shared with */}
        <div data-ev-id="ev_ed3855f470" className="p-4 max-h-64 overflow-y-auto">
          <h3 data-ev-id="ev_14fdfcd9bd" className="text-sm font-medium text-slate-500 dark:text-slate-300 mb-3">
            Geteilt mit ({shares.length})
          </h3>

          {sharedProfiles.length === 0 ?
          <p data-ev-id="ev_b96c30809d" className="text-sm text-slate-400 text-center py-8">
              Diese Liste ist noch mit niemandem geteilt
            </p> :

          <div data-ev-id="ev_df67882937" className="flex flex-col gap-2">
              {sharedProfiles.map(({ user_id, permission, profile }) =>
            <div data-ev-id="ev_64763fea4b" key={user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
                  <div data-ev-id="ev_2da54178cb" className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-300 font-medium">
                    {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div data-ev-id="ev_7882a58872" className="flex-1 min-w-0">
                    <p data-ev-id="ev_84de906dae" className="font-medium text-slate-900 dark:text-white truncate">
                      {profile?.full_name ?? 'Unbekannt'}
                    </p>
                    <p data-ev-id="ev_48783fb227" className="text-sm text-slate-500 dark:text-slate-300 truncate">
                      {profile?.email}
                    </p>
                  </div>
                  <select data-ev-id="ev_27c7fd2734"
              value={permission}
              onChange={(e) => onUpdatePermission(user_id, e.target.value as 'view' | 'edit')}
              className="px-2 py-1 text-sm bg-slate-100 dark:bg-slate-600 border-none rounded text-slate-700 dark:text-slate-300">

                    <option data-ev-id="ev_ce1be63dc4" value="edit">Bearbeiten</option>
                    <option data-ev-id="ev_2a40fa5d15" value="view">Nur ansehen</option>
                  </select>
                  <button data-ev-id="ev_ba403da7f0"
              onClick={() => onUnshare(user_id)}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">

                    <Trash2 size={16} />
                  </button>
                </div>
            )}
            </div>
          }
        </div>

        {/* Footer */}
        <div data-ev-id="ev_3f928a4657" className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button data-ev-id="ev_c95002dd6e"
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">

            Fertig
          </button>
        </div>
      </div>
    </div>);

}