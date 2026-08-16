/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

type UserRole = 'nutzer' | 'mitglied' | 'admin' | 'bereichsleiter' | 'kommandant';

type AccessLevel = 'full' | 'limited';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  functions?: string[];
  home_page?: string;
  substitute_id?: string | null;
  is_absent?: boolean;
  absent_until?: string | null;
  absence_reason?: string | null;
  approved?: boolean;
  is_active?: boolean;
  access_level?: AccessLevel;
  menu_favorites?: string[];
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  createUser: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ error: Error | null }>;
  refetchProfile: () => Promise<void>;
  isAdmin: boolean;
  isBereichsleiter: boolean;
  isKommandant: boolean;
  canManageSuppliers: boolean;
  canEditOrderFields: boolean;
  canAccessSettings: boolean;
  canCreateUsers: boolean;
  canViewPdf: boolean;
  canViewAllOrders: boolean;
  canEditDiscountFields: boolean;
  hasLimitedAccess: boolean;
  hasFullAccess: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Update user presence when they are active
async function updateUserPresence(userId: string) {
  if (!supabase) return;
  
  console.log('[Presence] Updating presence for user:', userId);
  
  const { error } = await supabase
    .from('user_presence')
    .upsert(
      { 
        user_id: userId, 
        last_seen: new Date().toISOString() 
      },
      { onConflict: 'user_id' }
    );
  
  if (error) {
    console.error('[Presence] Error updating presence:', error);
  } else {
    console.log('[Presence] Successfully updated presence at:', new Date().toISOString());
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchProfile(user.id);
        // Update presence when user is detected
        updateUserPresence(user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        // Update presence on login or session refresh
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          updateUserPresence(session.user.id);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Periodically update presence while user is active
  useEffect(() => {
    if (!user) return;

    // Update presence every 30 seconds while the app is open
    const interval = setInterval(() => {
      updateUserPresence(user.id);
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  async function fetchProfile(userId: string) {
    if (!supabase) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) {
      // Check if user is deactivated
      if (data.is_active === false) {
        // User is deactivated - sign them out
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        setLoading(false);
        return;
      }
      setProfile(data as Profile);
    }
    setLoading(false);
  }

  async function refetchProfile() {
    if (!supabase || !user) return;
    await fetchProfile(user.id);
  }

  async function signIn(email: string, password: string) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  // Benutzer erstellen (nur für Admin/Kommandant)
  async function createUser(email: string, password: string, fullName: string, role: UserRole) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    // Aktuellen Session Token speichern
    const { data: sessionData } = await supabase.auth.getSession();
    const currentSession = sessionData.session;
    
    // Neuen Benutzer registrieren
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });
    
    if (error) {
      return { error: error as Error };
    }
    
    // Wenn der neue Benutzer erstellt wurde, Rolle aktualisieren
    if (data.user) {
      // Warte kurz, damit der Trigger das Profil erstellen kann
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Rolle aktualisieren
      await supabase
        .from('profiles')
        .update({ role, full_name: fullName })
        .eq('id', data.user.id);
    }
    
    // Ursprüngliche Session wiederherstellen
    if (currentSession) {
      await supabase.auth.setSession({
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token
      });
    }
    
    return { error: null };
  }

  const isAdmin = profile?.role === 'admin';
  const isBereichsleiter = profile?.role === 'bereichsleiter';
  const isKommandant = profile?.role === 'kommandant';
  
  // Case-insensitive function checks
  const profileFunctionsLower = profile?.functions?.map(f => f.toLowerCase()) || [];
  
  // Lieferanten erfassen: Admin, Bereichsleiter, Kommandant ODER Benutzer mit Funktion 'lieferanten_erfassen'
  const hasLieferantenErfassenFunction = profileFunctionsLower.includes('lieferanten_erfassen');
  const canManageSuppliers = isAdmin || isBereichsleiter || isKommandant || hasLieferantenErfassenFunction;
  
  const canAccessSettings = isAdmin || isKommandant;
  const canCreateUsers = isAdmin || isKommandant;
  
  // Kassier, Schriftführer und Kommandant dürfen PDF immer herunterladen
  const hasKassierFunction = profileFunctionsLower.includes('kassier');
  const hasSchriftfuehrerFunction = profileFunctionsLower.includes('schriftfuehrer');
  const canViewPdf = isKommandant || hasKassierFunction || hasSchriftfuehrerFunction;
  
  // Admin, Kommandant und Kassier dürfen Mindestbestellwert und Bestelltage bearbeiten
  const canEditOrderFields = isAdmin || isKommandant || hasKassierFunction;
  
  // Admin, Kommandant und Kommandomitglieder dürfen alle Bestellungen sehen
  const hasKommandomitgliedFunction = profileFunctionsLower.includes('kommandomitglied');
  const canViewAllOrders = isAdmin || isKommandant || hasKommandomitgliedFunction;
  
  // Admin, Kommandant und Kassier dürfen Rabatte & Konditionen bearbeiten
  const canEditDiscountFields = isAdmin || isKommandant || hasKassierFunction;

  // Access level checks for self-registered users
  const hasLimitedAccess = profile?.access_level === 'limited';
  const hasFullAccess = !hasLimitedAccess; // Either 'full' or undefined (existing users)

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signIn,
      signOut,
      createUser,
      refetchProfile,
      isAdmin,
      isBereichsleiter,
      isKommandant,
      canManageSuppliers,
      canEditOrderFields,
      canAccessSettings,
      canCreateUsers,
      canViewPdf,
      canViewAllOrders,
      canEditDiscountFields,
      hasLimitedAccess,
      hasFullAccess
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
