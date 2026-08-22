import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ModulePermission {
  id: string;
  role: string;
  module_key: string;
  module_label: string;
  has_access: boolean;
}

// Define all available modules with their categories
export const MODULE_DEFINITIONS = {
  navigation: [
    { key: 'bestellungen', label: 'Bestellungen', description: 'Bestellverwaltung' },
    { key: 'lieferanten', label: 'Lieferanten', description: 'Lieferantenverwaltung' },
    { key: 'formulare', label: 'Formulare', description: 'Zugang zur Formulare-Seite' },
    { key: 'freigaben', label: 'Übersicht Freigaben', description: 'Freigabenübersicht' },
    { key: 'aufgaben', label: 'Aufgaben', description: 'Aufgabenverwaltung' },
    { key: 'beschluesse', label: 'Beschlüsse', description: 'Kommandobeschlüsse' },
    { key: 'benutzer', label: 'Benutzer', description: 'Benutzerverwaltung' },
    { key: 'einstellungen', label: 'Einstellungen', description: 'Systemeinstellungen' },
    { key: 'ideen_pool', label: 'Ideen-Pool', description: 'Ideensammlung' },
    { key: 'uebungsplan', label: 'Übungsplan', description: 'Übungsplan-Generator' },
  ],
  formulare: [
    { key: 'teilnahme_veranstaltung', label: 'Teilnahme Veranstaltung', description: 'Veranstaltungsteilnahme erfassen' },
    { key: 'formulargenerator', label: 'Formulargenerator', description: 'Dynamische Formulare erstellen' },
    { key: 'leihvertraege', label: 'Leihverträge', description: 'Leihverträge erstellen' },
    { key: 'ausgabenabrechnung', label: 'Ausgaben-Abrechnung', description: 'Ausgaben abrechnen' },
    // Auszahlungsanweisungen & Kommandoabstimmung haben eigene Rollen-Anforderungen (Kassier/Kommandomitglied)
  ]
};

export function useModulePermissions() {
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!supabase) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('module_permissions')
      .select('*')
      .eq('role', 'nutzer')
      .order('module_key');
    
    if (!error && data) {
      setPermissions(data as ModulePermission[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const updatePermission = async (moduleKey: string, hasAccess: boolean) => {
    if (!supabase) return { error: new Error('Supabase not initialized') };
    
    const { error } = await supabase
      .from('module_permissions')
      .update({ has_access: hasAccess, updated_at: new Date().toISOString() })
      .eq('role', 'nutzer')
      .eq('module_key', moduleKey);
    
    if (!error) {
      setPermissions(prev => 
        prev.map(p => p.module_key === moduleKey ? { ...p, has_access: hasAccess } : p)
      );
    }
    
    return { error };
  };

  const hasModuleAccess = (moduleKey: string): boolean => {
    const permission = permissions.find(p => p.module_key === moduleKey);
    return permission?.has_access ?? false;
  };

  return {
    permissions,
    loading,
    updatePermission,
    hasModuleAccess,
    refetch: fetchPermissions
  };
}
