/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useProfiles } from '@/hooks/useProfiles';

interface SimulatedProfile {
  id: string;
  full_name: string | null;
  role: string | null;
  functions: string[] | null;
}

interface SimulationContextType {
  // Simulation state
  simulatedUserId: string | null;
  simulatedProfile: SimulatedProfile | null;
  isSimulationActive: boolean;
  
  // Actions
  setSimulatedUserId: (userId: string | null) => void;
  resetSimulation: () => void;
  
  // Real (non-simulated) values - use for write operations
  realIsAdmin: boolean;
  realIsKommandant: boolean;
  
  // Effective values (use these everywhere instead of real values)
  effectiveUserId: string | undefined;
  effectiveProfile: SimulatedProfile | null;
  effectiveIsAdmin: boolean;
  effectiveIsKommandant: boolean;
  effectiveIsBereichsleiter: boolean;
  effectiveIsMitglied: boolean;
  effectiveHasKassierFunction: boolean;
  effectiveHasKommandomitgliedFunction: boolean;
  effectiveHasSchriftfuehrerFunction: boolean;
  effectiveHasLieferantenErfassenFunction: boolean;
  effectiveFunctions: string[];
  
  // Permission helpers (use these for UI visibility)
  canViewAllOrders: boolean;
  canApproveOrders: boolean;
  canApproveApplications: boolean;
  canProcessPayments: boolean;
  canManageUsers: boolean;
  canManageSuppliers: boolean;
  canAccessSettings: boolean;
  canDeleteOrders: boolean;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const { user, profile, isAdmin, isKommandant, isBereichsleiter } = useAuth();
  const { profiles } = useProfiles();
  
  const [simulatedUserId, setSimulatedUserId] = useState<string | null>(null);
  
  // Find simulated profile
  const simulatedProfile = useMemo(() => {
    if (!simulatedUserId) return null;
    const found = profiles.find(p => p.id === simulatedUserId);
    if (!found) return null;
    return {
      id: found.id,
      full_name: found.full_name,
      role: found.role,
      functions: found.functions
    };
  }, [simulatedUserId, profiles]);
  
  const isSimulationActive = simulatedUserId !== null;
  
  // Reset function
  const resetSimulation = () => setSimulatedUserId(null);
  
  // Calculate effective values
  const effectiveUserId = isSimulationActive ? simulatedUserId! : user?.id;
  
  const effectiveProfile = isSimulationActive ? simulatedProfile : (profile ? {
    id: profile.id,
    full_name: profile.full_name,
    role: profile.role,
    functions: profile.functions || null
  } : null);
  
  const effectiveRole = effectiveProfile?.role;
  const effectiveFunctions = effectiveProfile?.functions || [];
  
  // Role checks
  const effectiveIsAdmin = isSimulationActive 
    ? effectiveRole === 'admin' 
    : isAdmin;
  const effectiveIsKommandant = isSimulationActive 
    ? effectiveRole === 'kommandant' 
    : isKommandant;
  const effectiveIsBereichsleiter = isSimulationActive 
    ? effectiveRole === 'bereichsleiter' 
    : isBereichsleiter;
  const effectiveIsMitglied = effectiveRole === 'mitglied';
  
  // Function checks - case-insensitive
  const effectiveFunctionsLower = effectiveFunctions.map(f => f.toLowerCase());
  const profileFunctionsLower = profile?.functions?.map(f => f.toLowerCase()) || [];
  
  const effectiveHasKassierFunction = isSimulationActive
    ? effectiveFunctionsLower.includes('kassier')
    : profileFunctionsLower.includes('kassier');
  const effectiveHasKommandomitgliedFunction = isSimulationActive
    ? effectiveFunctionsLower.includes('kommandomitglied')
    : profileFunctionsLower.includes('kommandomitglied');
  const effectiveHasSchriftfuehrerFunction = isSimulationActive
    ? effectiveFunctionsLower.includes('schriftfuehrer')
    : profileFunctionsLower.includes('schriftfuehrer');
  const effectiveHasLieferantenErfassenFunction = isSimulationActive
    ? effectiveFunctionsLower.includes('lieferanten_erfassen')
    : profileFunctionsLower.includes('lieferanten_erfassen');
  
  // Permission helpers
  const canViewAllOrders = effectiveIsAdmin || effectiveIsKommandant || effectiveHasKassierFunction;
  const canApproveOrders = effectiveIsKommandant || effectiveIsBereichsleiter;
  const canApproveApplications = effectiveIsKommandant || effectiveIsAdmin;
  const canProcessPayments = effectiveHasKassierFunction;
  const canManageUsers = effectiveIsAdmin || effectiveIsKommandant;
  const canManageSuppliers = effectiveIsAdmin || effectiveIsKommandant || effectiveHasLieferantenErfassenFunction;
  const canAccessSettings = effectiveIsAdmin || effectiveIsKommandant;
  const canDeleteOrders = effectiveIsAdmin || effectiveHasKassierFunction;
  
  const value: SimulationContextType = {
    simulatedUserId,
    simulatedProfile,
    isSimulationActive,
    setSimulatedUserId,
    resetSimulation,
    realIsAdmin: isAdmin,
    realIsKommandant: isKommandant,
    effectiveUserId,
    effectiveProfile,
    effectiveIsAdmin,
    effectiveIsKommandant,
    effectiveIsBereichsleiter,
    effectiveIsMitglied,
    effectiveHasKassierFunction,
    effectiveHasKommandomitgliedFunction,
    effectiveHasSchriftfuehrerFunction,
    effectiveHasLieferantenErfassenFunction,
    effectiveFunctions,
    canViewAllOrders,
    canApproveOrders,
    canApproveApplications,
    canProcessPayments,
    canManageUsers,
    canManageSuppliers,
    canAccessSettings,
    canDeleteOrders,
  };
  
  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
}
