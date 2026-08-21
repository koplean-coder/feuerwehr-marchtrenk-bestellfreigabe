import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CategoryOption } from '@/utils/generateEventSignupFormPdf';

export interface EventFormTemplate {
  id: string;
  name: string;
  event_name: string;
  description: string | null;
  location: string;
  date_time: string;
  vehicles: string | null;
  adjustment: string;
  adjustment_note: string | null;
  registration_deadline: string;
  categories: CategoryOption[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EventFormTemplateInsert {
  name: string;
  event_name: string;
  description?: string | null;
  location: string;
  date_time: string;
  vehicles?: string | null;
  adjustment: string;
  adjustment_note?: string | null;
  registration_deadline: string;
  categories?: CategoryOption[];
}

export function useEventFormTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<EventFormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async (silent = false) => {
    if (!supabase || !user) {
      if (!silent) setLoading(false);
      return;
    }

    try {
      if (!silent) setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('event_form_templates')
        .select('*')
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      // Parse categories from JSONB
      const parsedData = (data || []).map(template => ({
        ...template,
        categories: template.categories as CategoryOption[] || []
      }));
      
      setTemplates(parsedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Fehler beim Laden der Vorlagen');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (data: EventFormTemplateInsert): Promise<EventFormTemplate | null> => {
    if (!supabase || !user) return null;

    try {
      const { data: newTemplate, error: insertError } = await supabase
        .from('event_form_templates')
        .insert({
          ...data,
          categories: data.categories || [],
          created_by: user.id
        })
        .select()
        .single();

      if (insertError) throw insertError;
      
      await fetchTemplates(true);
      return {
        ...newTemplate,
        categories: newTemplate.categories as CategoryOption[] || []
      } as EventFormTemplate;
    } catch (err) {
      console.error('Error creating template:', err);
      throw err;
    }
  };

  const updateTemplate = async (id: string, data: Partial<EventFormTemplateInsert>): Promise<void> => {
    if (!supabase) return;

    try {
      const { error: updateError } = await supabase
        .from('event_form_templates')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;
      await fetchTemplates(true);
    } catch (err) {
      console.error('Error updating template:', err);
      throw err;
    }
  };

  const deleteTemplate = async (id: string): Promise<void> => {
    if (!supabase) return;

    try {
      const { error: deleteError } = await supabase
        .from('event_form_templates')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      await fetchTemplates(true);
    } catch (err) {
      console.error('Error deleting template:', err);
      throw err;
    }
  };

  const duplicateTemplate = async (template: EventFormTemplate): Promise<EventFormTemplate | null> => {
    return createTemplate({
      name: `${template.name} (Kopie)`,
      event_name: template.event_name,
      location: template.location,
      date_time: template.date_time,
      adjustment: template.adjustment,
      adjustment_note: template.adjustment_note,
      registration_deadline: template.registration_deadline,
      categories: template.categories
    });
  };

  return {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    refreshTemplates: fetchTemplates
  };
}
