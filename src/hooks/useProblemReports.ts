import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';

export interface ProblemReport {
  id: string;
  created_by: string | null;
  title: string;
  description: string;
  screenshot_url: string | null;
  page_url: string | null;
  browser_info: string | null;
  console_logs: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'wont_fix';
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  creator_name?: string;
  resolver_name?: string;
}

export interface CreateProblemReportData {
  title: string;
  description: string;
  screenshot_url?: string;
  page_url?: string;
  browser_info?: string;
  console_logs?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export function useProblemReports() {
  const { user } = useAuth();
  const { effectiveIsAdmin, effectiveIsKommandant } = useSimulation();
  const isAdmin = effectiveIsAdmin;
  const isKommandant = effectiveIsKommandant;
  const [reports, setReports] = useState<ProblemReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManageReports = isAdmin || isKommandant;

  const fetchReports = useCallback(async (silent = false) => {
    if (!supabase || !user) return;

    if (!silent) setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('problem_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Lade Profile separat für Creator/Resolver Namen
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name');
      
      const profilesMap = new Map((profilesData || []).map(p => [p.id, p.full_name]));

      const formattedReports: ProblemReport[] = (data || []).map((report) => ({
        ...report,
        creator_name: profilesMap.get(report.created_by || '') || 'Unbekannt',
        resolver_name: report.resolved_by ? profilesMap.get(report.resolved_by) || undefined : undefined,
      }));

      setReports(formattedReports);
    } catch (err) {
      console.error('Error fetching problem reports:', err);
      setError('Fehler beim Laden der Problemmeldungen');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const createReport = async (data: CreateProblemReportData): Promise<{ success: boolean; error?: string }> => {
    if (!supabase || !user) {
      return { success: false, error: 'Nicht angemeldet' };
    }

    try {
      const { error: insertError } = await supabase
        .from('problem_reports')
        .insert({
          created_by: user.id,
          title: data.title,
          description: data.description,
          screenshot_url: data.screenshot_url || null,
          page_url: data.page_url || window.location.href,
          browser_info: data.browser_info || getBrowserInfo(),
          console_logs: data.console_logs || null,
          priority: data.priority || 'medium',
          status: 'open',
        });

      if (insertError) throw insertError;

      await fetchReports(true);
      return { success: true };
    } catch (err) {
      console.error('Error creating problem report:', err);
      return { success: false, error: 'Fehler beim Erstellen der Meldung' };
    }
  };

  const updateReport = async (
    reportId: string,
    updates: Partial<Pick<ProblemReport, 'status' | 'admin_notes' | 'priority'>>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!supabase || !user || !canManageReports) {
      return { success: false, error: 'Keine Berechtigung' };
    }

    try {
      // Get the report first to know the creator
      const { data: existingReport } = await supabase
        .from('problem_reports')
        .select('created_by, title, status')
        .eq('id', reportId)
        .single();

      const updateData: Record<string, unknown> = { ...updates };

      // If marking as resolved, set resolver info
      if (updates.status === 'resolved' || updates.status === 'wont_fix') {
        updateData.resolved_by = user.id;
        updateData.resolved_at = new Date().toISOString();
      } else if (updates.status === 'open' || updates.status === 'in_progress') {
        updateData.resolved_by = null;
        updateData.resolved_at = null;
      }

      const { error: updateError } = await supabase
        .from('problem_reports')
        .update(updateData)
        .eq('id', reportId);

      if (updateError) throw updateError;

      // Send notification to creator when status changes to resolved
      if ((updates.status === 'resolved' || updates.status === 'wont_fix') && existingReport?.created_by && existingReport.status !== updates.status) {
        const statusText = updates.status === 'resolved' ? 'behoben' : 'nicht behoben';
        const message = `Deine Problemmeldung "${existingReport.title}" wurde als ${statusText} markiert.`;
        
        // Mark associated tasks as completed in BOTH tables (old and new task systems)
        const taskTitlePattern = `%Problem: ${existingReport.title}%`;
        
        // Update todo_tasks (new system)
        const { error: todoTaskError } = await supabase
          .from('todo_tasks')
          .update({ 
            is_completed: true,
            completed_at: new Date().toISOString()
          })
          .ilike('title', taskTitlePattern);
        
        if (todoTaskError) {
          console.warn('Could not update associated todo_task:', todoTaskError);
        }
        
        // Update tasks (old system) - mark as completed
        const { error: oldTaskError } = await supabase
          .from('tasks')
          .update({ 
            status: 'completed',
            progress: 100
          })
          .ilike('title', taskTitlePattern);
        
        if (oldTaskError) {
          console.warn('Could not update associated task:', oldTaskError);
        }
        
        // Create in-app notification
        await supabase
          .from('notifications')
          .insert({
            user_id: existingReport.created_by,
            message,
            notification_type: 'problem_report',
            is_read: false,
          });

        // Try to send push notification
        try {
          await supabase.functions.invoke('send-push', {
            body: {
              userId: existingReport.created_by,
              title: updates.status === 'resolved' ? 'Problemmeldung behoben' : 'Problemmeldung geschlossen',
              body: message,
              data: { type: 'problem_report', reportId },
            },
          });
        } catch (pushErr) {
          // Push is optional, don't fail the whole operation
          console.warn('Push notification failed:', pushErr);
        }
      }

      await fetchReports(true);
      return { success: true };
    } catch (err) {
      console.error('Error updating problem report:', err);
      return { success: false, error: 'Fehler beim Aktualisieren' };
    }
  };

  return {
    reports,
    loading,
    error,
    canManageReports,
    createReport,
    updateReport,
    refetch: fetchReports,
  };
}

// Helper function to get browser info
function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  const screenInfo = `${window.screen.width}x${window.screen.height}`;
  const viewportInfo = `${window.innerWidth}x${window.innerHeight}`;
  
  return `UA: ${ua}\nBildschirm: ${screenInfo}\nViewport: ${viewportInfo}`;
}
