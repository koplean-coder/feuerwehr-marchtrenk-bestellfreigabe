import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FunctionOption {
  id: string;
  name: string;
  label: string;
  created_at: string;
}

export function useFunctions() {
  const [functions, setFunctions] = useState<FunctionOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFunctions();
  }, []);

  async function fetchFunctions() {
    if (!supabase) return;
    
    const { data } = await supabase
      .from('functions')
      .select('*')
      .order('label', { ascending: true });
    
    setFunctions((data as FunctionOption[]) ?? []);
    setLoading(false);
  }

  async function addFunction(name: string, label: string) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    // Name normalisieren (lowercase, underscores statt spaces, Umlaute ersetzen, Bindestriche entfernen)
    const normalizedName = name
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/\s+/g, '_')
      .replace(/-/g, '')
      .replace(/[^a-z0-9_]/g, '');
    
    console.log('[addFunction] Adding function:', { name, normalizedName, label });
    
    const { data, error } = await supabase
      .from('functions')
      .insert({ name: normalizedName, label })
      .select();
    
    if (error) {
      console.error('[addFunction] Error:', error);
      // Check for specific error types
      if (error.code === '42501') {
        return { error: new Error('Keine Berechtigung. Nur Admin oder Kommandant können Funktionen anlegen.') };
      }
      if (error.code === '23505') {
        return { error: new Error(`Funktion "${normalizedName}" existiert bereits.`) };
      }
      return { error: new Error(error.message || 'Unbekannter Fehler') };
    }
    
    console.log('[addFunction] Success:', data);
    await fetchFunctions();
    return { error: null };
  }

  async function updateFunction(id: string, label: string) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('functions')
      .update({ label })
      .eq('id', id);
    
    if (!error) fetchFunctions();
    return { error };
  }

  async function deleteFunction(id: string) {
    if (!supabase) return { error: new Error('Database not connected') };
    
    const { error } = await supabase
      .from('functions')
      .delete()
      .eq('id', id);
    
    if (!error) fetchFunctions();
    return { error };
  }

  return {
    functions,
    loading,
    addFunction,
    updateFunction,
    deleteFunction,
    refetch: fetchFunctions
  };
}
