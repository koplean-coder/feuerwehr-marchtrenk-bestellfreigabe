import { useState } from 'react';
import { Bug, X, RotateCcw, User, Check } from 'lucide-react';
import { useSimulation } from '@/contexts/SimulationContext';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';

export function SandboxSwitcher() {
  const { profile } = useAuth();
  const { profiles } = useProfiles();
  const {
    simulatedUserId,
    setSimulatedUserId,
    simulatedProfile,
    isSimulationActive,
    resetSimulation
  } = useSimulation();

  const [showPanel, setShowPanel] = useState(false);

  // Role colors for display
  const roleColors: Record<string, string> = {
    admin: 'bg-red-100 text-red-700',
    kommandant: 'bg-orange-100 text-orange-700',
    bereichsleiter: 'bg-green-100 text-green-700',
    mitglied: 'bg-blue-100 text-blue-700'
  };

  return (
    <div data-ev-id="ev_1b615fee29" className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button data-ev-id="ev_09869ded09"
      onClick={() => setShowPanel(!showPanel)}
      className={`p-3 rounded-full shadow-lg transition-all ${
      isSimulationActive ?
      'bg-amber-500 text-white animate-pulse' :
      'bg-gray-800 text-white hover:bg-gray-700'}`
      }
      title="Sandbox Benutzer-Simulation">

        <Bug className="w-5 h-5" />
      </button>

      {/* Panel */}
      {showPanel &&
      <div data-ev-id="ev_05a01e5531" className="absolute bottom-14 right-0 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
          <div data-ev-id="ev_05fd518523" className="px-4 py-3 bg-gray-800 text-white flex items-center justify-between">
            <div data-ev-id="ev_440cf16acc" className="flex items-center gap-2">
              <Bug className="w-4 h-4" />
              <span data-ev-id="ev_5a04646887" className="font-medium text-sm">Sandbox Benutzer-Test</span>
            </div>
            <button data-ev-id="ev_dcc1f6804b" onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div data-ev-id="ev_aa910efd70" className="p-4">
            {/* Echte Identität */}
            <div data-ev-id="ev_ae84a5bce4" className="mb-4 p-2 bg-muted rounded-lg text-xs">
              <span data-ev-id="ev_b81d78c161" className="text-muted-foreground">Eingeloggt als: </span>
              <span data-ev-id="ev_e9db8e927c" className="font-medium text-foreground">{profile?.full_name || 'Unbekannt'}</span>
              <span data-ev-id="ev_8433ddbe71" className="text-muted-foreground"> ({profile?.role || 'Keine Rolle'})</span>
            </div>

            {/* Reset Button */}
            {isSimulationActive &&
          <button data-ev-id="ev_074ea87fa1"
          onClick={resetSimulation}
          className="w-full mb-4 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center justify-center gap-2">

                <RotateCcw className="w-4 h-4" />
                Zurücksetzen (Simulation beenden)
              </button>
          }

            {/* Benutzer-Auswahl */}
            <div data-ev-id="ev_2dfc1d611b" className="mb-2">
              <label data-ev-id="ev_85894f9edb" className="text-xs font-medium text-muted-foreground mb-2 block">Als Benutzer ansehen:</label>
              <div data-ev-id="ev_13d6abd7bd" className="max-h-64 overflow-y-auto flex flex-col gap-1">
                {/* Echte Ansicht Option */}
                <button data-ev-id="ev_51c2b71b2e"
              onClick={() => setSimulatedUserId(null)}
              className={`px-3 py-2 rounded-lg text-left text-sm transition-all flex items-center justify-between ${
              !isSimulationActive ?
              'bg-gray-100 border-2 border-primary font-medium' :
              'bg-muted/50 hover:bg-muted border-2 border-transparent'}`
              }>

                  <div data-ev-id="ev_c07b55098d" className="flex items-center gap-2">
                    <div data-ev-id="ev_9f05f3c1f0" className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                    <div data-ev-id="ev_84133efd40">
                      <p data-ev-id="ev_7cd3b126ac" className="font-medium">Eigene Ansicht</p>
                      <p data-ev-id="ev_06375d30f8" className="text-xs text-muted-foreground">Keine Simulation</p>
                    </div>
                  </div>
                  {!isSimulationActive && <Check className="w-4 h-4 text-primary" />}
                </button>

                {/* Alle Benutzer */}
                {profiles.
              sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')).
              map((p) => {
                const roleColor = roleColors[p.role || ''] || 'bg-gray-100 text-gray-700';
                const isSelected = simulatedUserId === p.id;

                return (
                  <button data-ev-id="ev_94bb1ff814"
                  key={p.id}
                  onClick={() => setSimulatedUserId(p.id)}
                  className={`px-3 py-2 rounded-lg text-left text-sm transition-all flex items-center justify-between ${
                  isSelected ?
                  `${roleColor.replace('100', '200')} border-2 border-primary font-medium` :
                  'bg-muted/50 hover:bg-muted border-2 border-transparent'}`
                  }>

                        <div data-ev-id="ev_dfe6d31644" className="flex items-center gap-2 min-w-0">
                          <div data-ev-id="ev_33e7bf6d4c" className={`w-8 h-8 rounded-full ${roleColor.split(' ')[0]} flex items-center justify-center flex-shrink-0`}>
                            <span data-ev-id="ev_8068a1db53" className="text-xs font-bold">
                              {(p.full_name || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div data-ev-id="ev_7fea0e09fc" className="min-w-0">
                            <p data-ev-id="ev_6abce09427" className="font-medium truncate">{p.full_name || 'Unbekannt'}</p>
                            <p data-ev-id="ev_fb0c4d5c5d" className="text-xs text-muted-foreground">
                              {p.role || 'Keine Rolle'}
                              {p.functions && p.functions.length > 0 && ` · ${p.functions.join(', ')}`}
                            </p>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                      </button>);

              })}
              </div>
            </div>

            {/* Aktive Simulation Anzeige */}
            {isSimulationActive && simulatedProfile &&
          <div data-ev-id="ev_f4597e534d" className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p data-ev-id="ev_f6a773685e" className="text-xs text-amber-800 font-medium mb-1">🔍 Aktive Simulation</p>
                <p data-ev-id="ev_f77b346393" className="text-sm text-amber-900">
                  Du siehst die App als <strong data-ev-id="ev_82272bb0bb">{simulatedProfile.full_name}</strong>
                </p>
                <p data-ev-id="ev_04e33ec274" className="text-xs text-amber-700 mt-1">
                  Rolle: {simulatedProfile.role}
                  {simulatedProfile.functions && simulatedProfile.functions.length > 0 &&
              ` · ${simulatedProfile.functions.join(', ')}`
              }
                </p>
              </div>
          }
          </div>
        </div>
      }
    </div>);

}