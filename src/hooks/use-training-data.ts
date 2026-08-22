import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/helpers';

// Types
export interface TrainingCategory {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

export interface ScenarioTemplate {
  id: string;
  name: string;
  description: string | null;
  category_ids: string[];
  default_instructor: string | null;
  created_by: string;
}

export interface RecurrenceRule {
  id: string;
  name: string;
  description: string | null;
  scenario_template_id: string | null;
  interval_weeks: number;
  interval_type: string | null;
  week_of_period: number | null;
  day_of_week: number | null;
  created_by: string;
}

export interface TrainingPlan {
  id: string;
  name: string;
  year: number;
  period: string;
  sessions: TrainingSession[];
  created_by: string;
  created_at: string;
  creator_name?: string;
}

export interface TrainingSession {
  id: string;
  date: string;
  time: string;
  topic: string;
  categoryIds: string[];
  instructor: string;
  notes: string;
  isHoliday: boolean;
}

export interface Instructor {
  id: string;
  full_name: string;
  is_instructor: boolean;
}

// Hook for categories
export function useTrainingCategories() {
  const [categories, setCategories] = useState<TrainingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error: err } = await supabase
        .from('training_categories')
        .select('*')
        .order('sort_order');
      if (err) throw err;
      setCategories(data ?? []);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = async (name: string, color: string) => {
    if (!supabase) return;
    const maxOrder = Math.max(0, ...categories.map(c => c.sort_order));
    const { data, error: err } = await supabase
      .from('training_categories')
      .insert({ name, color, sort_order: maxOrder + 1 })
      .select()
      .single();
    if (err) throw err;
    if (data) setCategories(prev => [...prev, data]);
    return data;
  };

  const updateCategory = async (id: string, updates: Partial<TrainingCategory>) => {
    if (!supabase) return;
    const { error: err } = await supabase
      .from('training_categories')
      .update(updates)
      .eq('id', id);
    if (err) throw err;
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCategory = async (id: string) => {
    if (!supabase) return;
    const { error: err } = await supabase
      .from('training_categories')
      .delete()
      .eq('id', id);
    if (err) throw err;
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  return { categories, loading, error, fetchCategories, addCategory, updateCategory, deleteCategory };
}

// Hook for scenario templates
export function useScenarioTemplates() {
  const [templates, setTemplates] = useState<ScenarioTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error: err } = await supabase
        .from('training_scenario_templates')
        .select('*')
        .order('name');
      if (err) throw err;
      setTemplates((data ?? []).map(t => ({
        ...t,
        category_ids: t.category_ids ?? []
      })));
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const addTemplate = async (template: { name: string; description?: string; category_ids: string[]; default_instructor?: string }) => {
    if (!supabase) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    
    const { data, error: err } = await supabase
      .from('training_scenario_templates')
      .insert({
        name: template.name,
        description: template.description ?? null,
        category_ids: template.category_ids,
        default_instructor: template.default_instructor ?? null,
        created_by: userData.user.id
      })
      .select()
      .single();
    if (err) throw err;
    if (data) setTemplates(prev => [...prev, { ...data, category_ids: data.category_ids ?? [] }]);
    return data;
  };

  const deleteTemplate = async (id: string) => {
    if (!supabase) return;
    const { error: err } = await supabase
      .from('training_scenario_templates')
      .delete()
      .eq('id', id);
    if (err) throw err;
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  return { templates, loading, error, fetchTemplates, addTemplate, deleteTemplate };
}

// Hook for recurrence rules
export function useRecurrenceRules() {
  const [rules, setRules] = useState<RecurrenceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error: err } = await supabase
        .from('training_recurrence_rules')
        .select('*')
        .order('name');
      if (err) throw err;
      setRules(data ?? []);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const addRule = async (rule: { 
    name: string; 
    description?: string; 
    scenario_template_id?: string; 
    interval_type: 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannually' | 'yearly';
    week_of_period: number;
    day_of_week?: number;
  }) => {
    if (!supabase) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    
    const { data, error: err } = await supabase
      .from('training_recurrence_rules')
      .insert({
        name: rule.name,
        description: rule.description ?? null,
        scenario_template_id: rule.scenario_template_id ?? null,
        interval_weeks: rule.week_of_period,
        interval_type: rule.interval_type,
        week_of_period: rule.week_of_period,
        day_of_week: rule.day_of_week ?? 3,
        created_by: userData.user.id
      })
      .select()
      .single();
    if (err) throw err;
    if (data) setRules(prev => [...prev, data as RecurrenceRule]);
    return data;
  };

  const deleteRule = async (id: string) => {
    if (!supabase) return;
    const { error: err } = await supabase
      .from('training_recurrence_rules')
      .delete()
      .eq('id', id);
    if (err) throw err;
    setRules(prev => prev.filter(r => r.id !== id));
  };

  return { rules, loading, error, fetchRules, addRule, deleteRule };
}

// Hook for training plans
export function useTrainingPlans() {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    if (!supabase) return;
    try {
      // Fetch plans first
      const { data: plansData, error: err } = await supabase
        .from('training_plans')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      
      // Get unique creator IDs
      const creatorIds = [...new Set((plansData ?? []).map(p => p.created_by))];
      
      // Fetch creator names
      let creatorMap: Record<string, string> = {};
      if (creatorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', creatorIds);
        creatorMap = (profilesData ?? []).reduce((acc, p) => {
          acc[p.id] = p.full_name;
          return acc;
        }, {} as Record<string, string>);
      }
      
      setPlans((plansData ?? []).map(p => ({
        ...p,
        sessions: (p.sessions as TrainingSession[]) ?? [],
        creator_name: creatorMap[p.created_by] ?? 'Unbekannt'
      })));
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const savePlan = async (plan: { name: string; year: number; period: string; sessions: TrainingSession[] }) => {
    if (!supabase) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    
    const { data, error: err } = await supabase
      .from('training_plans')
      .insert({
        name: plan.name,
        year: plan.year,
        period: plan.period,
        sessions: plan.sessions as unknown as Record<string, unknown>,
        created_by: userData.user.id
      })
      .select('*')
      .single();
    if (err) throw err;
    if (data) {
      // Fetch creator name
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userData.user.id)
        .single();
      
      const newPlan: TrainingPlan = {
        ...data,
        sessions: (data.sessions as TrainingSession[]) ?? [],
        creator_name: profileData?.full_name ?? 'Unbekannt'
      };
      setPlans(prev => [newPlan, ...prev]);
    }
    return data;
  };

  const deletePlan = async (id: string) => {
    if (!supabase) return;
    const { error: err } = await supabase
      .from('training_plans')
      .delete()
      .eq('id', id);
    if (err) throw err;
    setPlans(prev => prev.filter(p => p.id !== id));
  };

  return { plans, loading, error, fetchPlans, savePlan, deletePlan };
}

// Hook for instructors (users with is_instructor = true)
export function useInstructors() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [allUsers, setAllUsers] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInstructors = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('id, full_name, is_instructor')
        .eq('is_active', true)
        .order('full_name');
      if (err) throw err;
      const users = (data ?? []).map(u => ({
        id: u.id,
        full_name: u.full_name,
        is_instructor: u.is_instructor ?? false
      }));
      setAllUsers(users);
      setInstructors(users.filter(u => u.is_instructor));
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstructors();
  }, [fetchInstructors]);

  const toggleInstructor = async (userId: string, isInstructor: boolean) => {
    if (!supabase) return;
    const { error: err } = await supabase
      .from('profiles')
      .update({ is_instructor: isInstructor })
      .eq('id', userId);
    if (err) throw err;
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, is_instructor: isInstructor } : u));
    if (isInstructor) {
      const user = allUsers.find(u => u.id === userId);
      if (user) setInstructors(prev => [...prev, { ...user, is_instructor: true }].sort((a, b) => a.full_name.localeCompare(b.full_name)));
    } else {
      setInstructors(prev => prev.filter(i => i.id !== userId));
    }
  };

  return { instructors, allUsers, loading, error, fetchInstructors, toggleInstructor };
}

// Types for permissions
export type PermissionLevel = 'none' | 'read' | 'edit' | 'admin';

export interface RolePermission {
  id: string;
  role_name: string;
  permission_level: PermissionLevel;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission_level: PermissionLevel;
  user_name?: string;
}

// Hook for training plan permissions
export function useTrainingPlanPermissions() {
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [currentUserPermission, setCurrentUserPermission] = useState<PermissionLevel>('none');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!supabase) return;
    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData.user?.id;

      // Fetch role permissions
      const { data: roleData, error: roleErr } = await supabase
        .from('training_plan_role_permissions')
        .select('*')
        .order('role_name');
      if (roleErr) throw roleErr;
      setRolePermissions(roleData ?? []);

      // Fetch user permissions with user names
      const { data: userPermsData, error: userErr } = await supabase
        .from('training_plan_user_permissions')
        .select(`
          *,
          profiles:user_id (full_name)
        `);
      if (userErr) throw userErr;
      setUserPermissions((userPermsData ?? []).map(p => ({
        ...p,
        user_name: (p.profiles as { full_name: string } | null)?.full_name ?? 'Unbekannt'
      })));

      // Determine current user's permission level
      if (currentUserId) {
        // Check user-specific permission first (override)
        const userPerm = (userPermsData ?? []).find(p => p.user_id === currentUserId);
        if (userPerm) {
          setCurrentUserPermission(userPerm.permission_level as PermissionLevel);
        } else {
          // Check role-based permissions
          const { data: profileData } = await supabase
            .from('profiles')
            .select('functions, role')
            .eq('id', currentUserId)
            .single();
          
          if (profileData?.role === 'admin') {
            setCurrentUserPermission('admin');
          } else if (profileData?.functions) {
            const userFunctions = profileData.functions as string[];
            let highestLevel: PermissionLevel = 'none';
            
            for (const fn of userFunctions) {
              const rolePerm = (roleData ?? []).find(r => 
                r.role_name.toLowerCase() === fn.toLowerCase()
              );
              if (rolePerm) {
                const levels: PermissionLevel[] = ['none', 'read', 'edit', 'admin'];
                const currentIndex = levels.indexOf(highestLevel);
                const newIndex = levels.indexOf(rolePerm.permission_level as PermissionLevel);
                if (newIndex > currentIndex) {
                  highestLevel = rolePerm.permission_level as PermissionLevel;
                }
              }
            }
            setCurrentUserPermission(highestLevel);
          }
        }
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const updateRolePermission = async (roleName: string, level: PermissionLevel) => {
    if (!supabase) return;
    const existing = rolePermissions.find(r => r.role_name === roleName);
    if (existing) {
      const { error: err } = await supabase
        .from('training_plan_role_permissions')
        .update({ permission_level: level })
        .eq('id', existing.id);
      if (err) throw err;
      setRolePermissions(prev => prev.map(r => r.id === existing.id ? { ...r, permission_level: level } : r));
    } else {
      const { data, error: err } = await supabase
        .from('training_plan_role_permissions')
        .insert({ role_name: roleName, permission_level: level })
        .select()
        .single();
      if (err) throw err;
      if (data) setRolePermissions(prev => [...prev, data]);
    }
  };

  const setUserPermission = async (userId: string, level: PermissionLevel) => {
    if (!supabase) return;
    const { data: userData } = await supabase.auth.getUser();
    const existing = userPermissions.find(u => u.user_id === userId);
    
    if (level === 'none' && existing) {
      // Remove permission
      const { error: err } = await supabase
        .from('training_plan_user_permissions')
        .delete()
        .eq('id', existing.id);
      if (err) throw err;
      setUserPermissions(prev => prev.filter(u => u.id !== existing.id));
    } else if (existing) {
      // Update existing
      const { error: err } = await supabase
        .from('training_plan_user_permissions')
        .update({ permission_level: level })
        .eq('id', existing.id);
      if (err) throw err;
      setUserPermissions(prev => prev.map(u => u.id === existing.id ? { ...u, permission_level: level } : u));
    } else if (level !== 'none') {
      // Insert new
      const { data, error: err } = await supabase
        .from('training_plan_user_permissions')
        .insert({ 
          user_id: userId, 
          permission_level: level,
          granted_by: userData.user?.id 
        })
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .single();
      if (err) throw err;
      if (data) {
        setUserPermissions(prev => [...prev, {
          ...data,
          user_name: (data.profiles as { full_name: string } | null)?.full_name ?? 'Unbekannt'
        }]);
      }
    }
  };

  const canRead = currentUserPermission !== 'none';
  const canEdit = currentUserPermission === 'edit' || currentUserPermission === 'admin';
  const isAdmin = currentUserPermission === 'admin';

  return { 
    rolePermissions, 
    userPermissions, 
    currentUserPermission,
    canRead,
    canEdit,
    isAdmin,
    loading, 
    error, 
    fetchPermissions, 
    updateRolePermission, 
    setUserPermission 
  };
}
