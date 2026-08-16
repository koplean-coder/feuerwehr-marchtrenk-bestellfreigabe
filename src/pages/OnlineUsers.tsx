import { Layout } from '@/components/Layout';
import { usePresence, useCanViewOnlineUsers } from '@/hooks/usePresence';
import { Navigate, useNavigate } from 'react-router';
import { Users, Clock, Shield, RefreshCw, MessageSquare, Send } from 'lucide-react';

export default function OnlineUsers() {
  const { canView, loading: accessLoading } = useCanViewOnlineUsers();
  const { onlineUsers, recentlyOfflineUsers, loading, onlineCount, refetch } = usePresence();
  const navigate = useNavigate();

  if (accessLoading) {
    return (
      <Layout>
        <div data-ev-id="ev_5681344f8d" className="flex items-center justify-center min-h-[400px]">
          <div data-ev-id="ev_b133f6abcc" className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </Layout>);

  }

  if (!canView) {
    return <Navigate to="/" replace />;
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':return 'bg-purple-100 text-purple-800';
      case 'bereichsleiter':return 'bg-blue-100 text-blue-800';
      case 'kommandant':return 'bg-red-100 text-red-800';
      case 'nutzer':return 'bg-green-100 text-green-800';
      default:return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':return 'Admin';
      case 'bereichsleiter':return 'Bereichsleiter';
      case 'kommandant':return 'Kommandant';
      case 'nutzer':return 'Nutzer';
      default:return 'Mitglied';
    }
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return 'gerade eben';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'gerade eben';
    if (diffMins === 1) return 'vor 1 Minute';
    if (diffMins < 60) return `vor ${diffMins} Minuten`;

    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateTime = (lastSeen: string | null) => {
    if (!lastSeen) return 'Noch nie angemeldet';
    const date = new Date(lastSeen);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout>
      <div data-ev-id="ev_590000afaa" className="max-w-4xl mx-auto">
        {/* Page Header Card */}
        <div data-ev-id="ev_a1f47003a6" className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-xl p-5 text-white shadow-lg mb-6">
          <div data-ev-id="ev_8db0423d53" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div data-ev-id="ev_639ce389d9" className="flex items-center gap-4">
              <div data-ev-id="ev_ca2103be70" className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div data-ev-id="ev_41a19cd622">
                <h1 data-ev-id="ev_31fb4d99a9" className="text-xl font-bold">Online Benutzer</h1>
                <p data-ev-id="ev_a07b932693" className="text-sm text-white/80">
                  {onlineCount} {onlineCount === 1 ? 'Benutzer' : 'Benutzer'} online
                </p>
              </div>
            </div>
            <div data-ev-id="ev_08a9ec3872" className="flex items-center gap-2">
              <button data-ev-id="ev_edf5e81dd2"
              onClick={() => navigate('/?compose=true')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition-colors border border-white/30">
                <MessageSquare className="w-4 h-4" />
                <span data-ev-id="ev_9bfb470728" className="hidden sm:inline">Neue Nachricht</span>
                <span data-ev-id="ev_3f86d7a5b6" className="sm:hidden">Nachricht</span>
              </button>
              <button data-ev-id="ev_4ee05f81b8"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-green-600 rounded-xl font-medium hover:bg-white/90 transition-colors shadow-lg group">
                <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                <span data-ev-id="ev_d29d7c1861" className="hidden sm:inline">Aktualisieren</span>
              </button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div data-ev-id="ev_9cb062c364" className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6">
          <div data-ev-id="ev_bc2ca30578" className="flex items-start gap-3">
            <div data-ev-id="ev_2950842b54" className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-green-600" />
            </div>
            <div data-ev-id="ev_863decd2cb">
              <p data-ev-id="ev_3fd6065d2a" className="text-sm text-green-800">
                Diese Ansicht zeigt alle Benutzer, die in den letzten 5 Minuten aktiv waren.
                Der Status wird automatisch alle 30 Sekunden aktualisiert.
              </p>
            </div>
          </div>
        </div>

        {/* Online User List */}
        {loading ?
        <div data-ev-id="ev_7118b7bdae" className="flex items-center justify-center py-12">
            <div data-ev-id="ev_408c921f47" className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div> :
        onlineUsers.length === 0 ?
        <div data-ev-id="ev_4747c258d9" className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-8 sm:p-12 text-center mb-8">
            <div data-ev-id="ev_39b461cb65" className="flex flex-col items-center">
              <div data-ev-id="ev_eb80c39f3b" className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center mb-5 relative">
                <Users className="w-10 h-10 text-green-400" />
                <div data-ev-id="ev_ec08352349" className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center border-2 border-white">
                  <span data-ev-id="ev_aa13be16a3" className="text-xs text-white font-bold">0</span>
                </div>
              </div>
              <h3 data-ev-id="ev_34d0c836ec" className="text-lg font-semibold text-green-700 mb-2">Aktuell niemand online</h3>
              <p data-ev-id="ev_76d49ff358" className="text-green-600/80 text-sm max-w-xs">
                Derzeit sind keine anderen Benutzer aktiv. Schauen Sie später noch einmal vorbei!
              </p>
            </div>
          </div> :

        <div data-ev-id="ev_e84b7fb33c" className="bg-card border border-border rounded-xl overflow-hidden mb-8 shadow-sm">
            <div data-ev-id="ev_header_online" className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
              <div data-ev-id="ev_55e738df0b" className="flex items-center gap-2">
                <div data-ev-id="ev_a80035f090" className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span data-ev-id="ev_3e0fdeefb3" className="font-medium text-sm text-green-700">Jetzt online</span>
                <span data-ev-id="ev_9bcc3f3d44" className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  {onlineUsers.length}
                </span>
              </div>
            </div>
            <div data-ev-id="ev_afd6e5dc82" className="divide-y divide-border">
              {onlineUsers.map((onlineUser) =>
            <div data-ev-id="ev_895b6f4c62"
            key={onlineUser.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/50 transition-colors gap-3">

                  <div data-ev-id="ev_aa34566756" className="flex items-center gap-4">
                    {/* Online Indicator */}
                    <div data-ev-id="ev_8ef183fd5a" className="relative">
                      <div data-ev-id="ev_875d89e244" className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                        <span data-ev-id="ev_e5a9754708" className="text-lg font-bold text-green-600">
                          {onlineUser.profile?.full_name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div data-ev-id="ev_68a46de971" className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-card rounded-full flex items-center justify-center">
                        <div data-ev-id="ev_c9fd92e931" className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      </div>
                    </div>

                    {/* User Info */}
                    <div data-ev-id="ev_d0c6993ffb">
                      <p data-ev-id="ev_e805148191" className="font-semibold text-foreground">
                        {onlineUser.profile?.full_name || 'Unbekannter Benutzer'}
                      </p>
                      <p data-ev-id="ev_71d7540ade" className="text-sm text-muted-foreground">
                        {onlineUser.profile?.email}
                      </p>
                    </div>
                  </div>

                  <div data-ev-id="ev_a0f4b049c0" className="flex items-center gap-2 sm:gap-3 ml-16 sm:ml-0">
                    {/* Message Button */}
                    <button data-ev-id="ev_0b1d678854"
                onClick={() => navigate(`/?compose=true&recipient=${onlineUser.user_id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors"
                title={`Nachricht an ${onlineUser.profile?.full_name} senden`}>
                      <Send className="w-3.5 h-3.5" />
                      <span data-ev-id="ev_69ff50adfe" className="hidden sm:inline">Nachricht</span>
                    </button>

                    {/* Role Badge */}
                    <span data-ev-id="ev_918f6ce2b6" className={`px-2.5 py-1 text-xs font-medium rounded-lg ${getRoleBadgeColor(onlineUser.profile?.role || '')} hidden sm:inline-flex`}>
                      {getRoleLabel(onlineUser.profile?.role || '')}
                    </span>

                    {/* Last Seen */}
                    <div data-ev-id="ev_dbdb749771" className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg">
                      <Clock className="w-3.5 h-3.5" />
                      <span data-ev-id="ev_91554efdb7">{formatLastSeen(onlineUser.last_seen)}</span>
                    </div>
                  </div>
                </div>
            )}
            </div>
          </div>
        }

        {/* Recently Offline Users */}
        {!loading && recentlyOfflineUsers.length > 0 &&
        <div data-ev-id="ev_5139743324" className="mt-8">
            <div data-ev-id="ev_040719002f" className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div data-ev-id="ev_header_offline" className="px-4 py-3 bg-muted/50 border-b border-border">
                <div data-ev-id="ev_e779adf878" className="flex items-center gap-3">
                  <div data-ev-id="ev_88c42fa33a" className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-gray-600" />
                  </div>
                  <div data-ev-id="ev_f4bc87c9e2">
                    <h2 data-ev-id="ev_97d3f9118b" className="font-medium text-sm text-foreground">Alle Benutzer</h2>
                    <p data-ev-id="ev_7c8c22bcdb" className="text-xs text-muted-foreground">Letzter Login</p>
                  </div>
                  <span data-ev-id="ev_93ae1b5e6e" className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                    {recentlyOfflineUsers.length}
                  </span>
                </div>
              </div>
              <div data-ev-id="ev_8c724af9ff" className="divide-y divide-border">
                {recentlyOfflineUsers.map((offlineUser) =>
              <div data-ev-id="ev_a7df890afa"
              key={offlineUser.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/50 transition-colors gap-3">

                    <div data-ev-id="ev_969c1924a0" className="flex items-center gap-4">
                      {/* Offline Indicator */}
                      <div data-ev-id="ev_1d70a098e8" className="relative">
                        <div data-ev-id="ev_ba49b778eb" className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                          <span data-ev-id="ev_eb14366f09" className="text-lg font-bold text-gray-400">
                            {offlineUser.profile?.full_name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div data-ev-id="ev_d58739b012" className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gray-300 border-2 border-card rounded-full" />
                      </div>

                      {/* User Info */}
                      <div data-ev-id="ev_9ac1870618">
                        <p data-ev-id="ev_b829ec58bc" className="font-semibold text-foreground">
                          {offlineUser.profile?.full_name || 'Unbekannter Benutzer'}
                        </p>
                        <p data-ev-id="ev_6979bda687" className="text-sm text-muted-foreground">
                          {offlineUser.profile?.email}
                        </p>
                      </div>
                    </div>

                    <div data-ev-id="ev_67e68ce6da" className="flex items-center gap-3 ml-16 sm:ml-0">
                      {/* Role Badge */}
                      <span data-ev-id="ev_0c4a04fada" className={`px-2.5 py-1 text-xs font-medium rounded-lg ${getRoleBadgeColor(offlineUser.profile?.role || '')}`}>
                        {getRoleLabel(offlineUser.profile?.role || '')}
                      </span>

                      {/* Last Seen Date/Time */}
                      <div data-ev-id="ev_7c562479c9" className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg">
                        <Clock className="w-3.5 h-3.5" />
                        <span data-ev-id="ev_7eb45ce2f0" className="hidden sm:inline">{formatDateTime(offlineUser.last_seen)}</span>
                        <span data-ev-id="ev_mobile_date" className="sm:hidden">{formatLastSeen(offlineUser.last_seen)}</span>
                      </div>
                    </div>
                  </div>
              )}
              </div>
            </div>
          </div>
        }
      </div>
    </Layout>);

}