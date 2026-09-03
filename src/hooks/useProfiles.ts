import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'nutzer' | 'mitglied' | 'admin' | 'bereichsleiter' | 'kommandant';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  functions: string[];
  default_bereichsleiter_id: string | null;
  substitute_id: string | null;
  is_absent: boolean;
  absent_until: string | null;
  absence_reason: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    if (!supabase) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });
    
    setProfiles((data as Profile[]) ?? []);
    setLoading(false);
  }

  async function updateRole(userId: string, role: UserRole) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);
    
    if (!error) fetchProfiles();
    return { error };
  }

  async function updateProfile(userId: string, data: { full_name?: string; functions?: string[] }) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', userId);
    
    if (!error) fetchProfiles();
    return { error };
  }

  async function updateDefaultBereichsleiter(userId: string, bereichsleiterId: string | null) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('profiles')
      .update({ default_bereichsleiter_id: bereichsleiterId })
      .eq('id', userId);
    
    if (!error) fetchProfiles();
    return { error };
  }

  async function updateSubstitute(userId: string, substituteId: string | null) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('profiles')
      .update({ substitute_id: substituteId })
      .eq('id', userId);
    
    if (!error) fetchProfiles();
    return { error };
  }

  async function setAbsence(userId: string, data: {
    is_absent: boolean;
    absent_until?: string | null;
    absence_reason?: string | null;
  }) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const updateData: Record<string, unknown> = {
      is_absent: data.is_absent,
    };
    
    if (data.is_absent) {
      updateData.absent_until = data.absent_until || null;
      updateData.absence_reason = data.absence_reason || null;
    } else {
      // Clear absence data when marking as present
      updateData.absent_until = null;
      updateData.absence_reason = null;
    }
    
    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);
    
    if (!error) fetchProfiles();
    return { error };
  }

  // Get the effective approver (considers substitutes)
  function getEffectiveApprover(userId: string): Profile | null {
    const user = profiles.find(p => p.id === userId);
    if (!user) return null;
    
    // If user is absent and has a substitute, return the substitute
    if (user.is_absent && user.substitute_id) {
      // Check if absence period is still valid
      if (user.absent_until) {
        const absentUntil = new Date(user.absent_until);
        if (absentUntil < new Date()) {
          // Absence period expired, return original user
          return user;
        }
      }
      
      const substitute = profiles.find(p => p.id === user.substitute_id);
      if (substitute && !substitute.is_absent) {
        return substitute;
      }
    }
    
    return user;
  }

  async function deleteUser(userId: string): Promise<{ error: Error | null }> {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { userId }
    });
    
    if (error) {
      return { error: new Error(error.message) };
    }
    
    if (data?.error) {
      return { error: new Error(data.error) };
    }
    
    // Refresh profiles list after deletion
    fetchProfiles();
    return { error: null };
  }

  async function toggleUserActive(userId: string, isActive: boolean) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId);
    
    if (!error) fetchProfiles();
    return { error };
  }

  async function resetPassword(userId: string): Promise<{ error: Error | null; emailSent?: boolean }> {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { data, error } = await supabase.functions.invoke('reset-password', {
      body: { userId }
    });
    
    if (error) {
      return { error: new Error(error.message) };
    }
    
    if (data?.error) {
      return { error: new Error(data.error) };
    }
    
    return { error: null, emailSent: data?.emailSent };
  }

  return {
    profiles,
    loading,
    updateRole,
    updateProfile,
    updateDefaultBereichsleiter,
    updateSubstitute,
    setAbsence,
    getEffectiveApprover,
    deleteUser,
    toggleUserActive,
    resetPassword,
    refetch: fetchProfiles
  };
}
