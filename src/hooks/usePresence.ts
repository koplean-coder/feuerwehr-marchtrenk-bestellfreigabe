import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OnlineUser {
  id: string;
  user_id: string;
  last_seen: string | null;
  profile?: {
    full_name: string;
    email: string;
    role: string;
  };
}

const PRESENCE_UPDATE_INTERVAL = 30000; // 30 seconds
const ONLINE_THRESHOLD_MINUTES = 5; // Users seen within last 5 minutes are considered online

export function usePresence() {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [recentlyOfflineUsers, setRecentlyOfflineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Placeholder callback to maintain hook count (presence is now handled in AuthContext)
  const _placeholderCallback = useCallback(() => {
    // No-op - presence updates moved to AuthContext
  }, []);
  void _placeholderCallback; // Verhindert unused-Warnung

  // Fetch online and recently offline users
  const fetchOnlineUsers = useCallback(async () => {
    if (!supabase) return;

    const onlineThreshold = new Date();
    onlineThreshold.setMinutes(onlineThreshold.getMinutes() - ONLINE_THRESHOLD_MINUTES);

    // Fetch ALL profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .order('full_name', { ascending: true });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      setLoading(false);
      return;
    }

    // Fetch ALL presence records
    const { data: presenceData, error: presenceError } = await supabase
      .from('user_presence')
      .select('id, user_id, last_seen')
      .order('last_seen', { ascending: false });

    if (presenceError) {
      console.error('Error fetching presence:', presenceError);
      setLoading(false);
      return;
    }

    // Combine profiles with presence data
    const allUsers: OnlineUser[] = (profiles || []).map(profile => {
      const presence = presenceData?.find(p => p.user_id === profile.id);
      return {
        id: presence?.id || profile.id,
        user_id: profile.id,
        last_seen: presence?.last_seen || null,
        profile: {
          full_name: profile.full_name,
          email: profile.email,
          role: profile.role
        }
      };
    });

    // Split into online (within 5 min threshold) and offline (everyone else)
    const online = allUsers.filter(u => 
      u.last_seen && new Date(u.last_seen) >= onlineThreshold
    );
    
    // Offline: users with last_seen older than 5 min OR users without any presence record
    // Sort by last_seen descending, users without last_seen at the end
    const offline = allUsers
      .filter(u => !u.last_seen || new Date(u.last_seen) < onlineThreshold)
      .sort((a, b) => {
        if (!a.last_seen && !b.last_seen) return 0;
        if (!a.last_seen) return 1;
        if (!b.last_seen) return -1;
        return new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime();
      });

    setOnlineUsers(online);
    setRecentlyOfflineUsers(offline);
    setLoading(false);
  }, []);

  // Placeholder effect to maintain hook count
  useEffect(() => {
    // No-op - presence updates moved to AuthContext
  }, [user, _placeholderCallback]);

  // Fetch online users on mount and periodically
  useEffect(() => {
    fetchOnlineUsers();

    // Refresh online users list every 30 seconds
    const interval = setInterval(fetchOnlineUsers, PRESENCE_UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchOnlineUsers]);

  // Keep hook count stable
  useEffect(() => {
    // No-op placeholder
  }, [user]);

  return {
    onlineUsers,
    recentlyOfflineUsers,
    loading,
    onlineCount: onlineUsers.length,
    refetch: fetchOnlineUsers
  };
}

// Hook to check if current user can view online users
export function useCanViewOnlineUsers() {
  const { user } = useAuth();
  const [canView, setCanView] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      if (!supabase || !user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'online_view_users')
        .single();

      if (data) {
        try {
          const allowedUsers = JSON.parse(data.value) as string[];
          setCanView(allowedUsers.includes(user.id));
        } catch {
          setCanView(false);
        }
      }
      setLoading(false);
    }

    checkAccess();
  }, [user]);

  return { canView, loading };
}
