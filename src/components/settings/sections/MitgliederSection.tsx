import { useState } from 'react';
import { Users, UserPlus, Search, Edit2, Check, X, ChevronDown, ChevronUp, Key } from 'lucide-react';
import { SectionHeader, SectionCard } from '../SettingsContent';
import type { UserRole } from '@/hooks/useProfiles';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  functions?: string[];
  default_bereichsleiter?: string | null;
}

interface FunctionDef {
  id: string;
  name: string;
  label: string;
}

interface MitgliederSectionProps {
  profiles: Profile[];
  currentProfile: Profile | null;
  updateRole: (userId: string, role: UserRole) => Promise<{error: Error | null;}>;
  updateProfile: (userId: string, data: Partial<Profile>) => Promise<{error: Error | null;}>;
  updateDefaultBereichsleiter: (userId: string, bereichsleiterId: string | null) => Promise<{error: Error | null;}>;
  createUser: (email: string, password: string, fullName: string) => Promise<{error: Error | null;}>;
  resetPassword: (userId: string) => Promise<{error: Error | null;emailSent?: boolean;}>;
  refetchProfiles: () => Promise<void>;
  functions: FunctionDef[];
  isAdmin: boolean;
  isKommandant: boolean;
}

const roleOptions: {value: UserRole;label: string;color: string;}[] = [
{ value: 'nutzer', label: 'Nutzer', color: 'bg-green-100 text-green-700' },
{ value: 'mitglied', label: 'Mitglied', color: 'bg-gray-100 text-gray-700' },
{ value: 'bereichsleiter', label: 'Bereichsleiter', color: 'bg-blue-100 text-blue-700' },
{ value: 'kommandant', label: 'Kommandant', color: 'bg-amber-100 text-amber-700' },
{ value: 'admin', label: 'Admin', color: 'bg-purple-100 text-purple-700' }];


export function MitgliederSection({
  profiles,
  currentProfile,
  updateRole,
  updateProfile,
  updateDefaultBereichsleiter,
  createUser,
  resetPassword,
  refetchProfiles,
  functions,
  isAdmin,
  isKommandant
}: MitgliederSectionProps) {
  const [search, setSearch] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', fullName: '' });
  const [creating, setCreating] = useState(false);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const filteredProfiles = profiles.filter(
    (p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  const bereichsleiter = profiles.filter((p) => p.role === 'bereichsleiter');

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.fullName) return;
    setCreating(true);
    const { error } = await createUser(newUser.email, newUser.password, newUser.fullName);
    if (!error) {
      setNewUser({ email: '', password: '', fullName: '' });
      setShowNewUserForm(false);
      await refetchProfiles();
    }
    setCreating(false);
  };

  const handleFunctionToggle = async (userId: string, funcName: string, currentFunctions: string[]) => {
    const newFunctions = currentFunctions.includes(funcName) ?
    currentFunctions.filter((f) => f !== funcName) :
    [...currentFunctions, funcName];
    await updateProfile(userId, { functions: newFunctions });
    await refetchProfiles();
  };

  const handleResetPassword = async (userId: string) => {
    setResettingPassword(userId);
    setResetSuccess(null);
    const { error } = await resetPassword(userId);
    setResettingPassword(null);
    if (!error) {
      setResetSuccess(userId);
      setTimeout(() => setResetSuccess(null), 3000);
    }
  };

  return (
    <div data-ev-id="ev_86d0d74480">
      <SectionHeader
        icon={Users}
        title="Mitglieder"
        description="Benutzer verwalten, Rollen und Funktionen zuweisen." />


      {/* Search & Add User */}
      <div data-ev-id="ev_399349b15d" className="flex flex-col sm:flex-row gap-3 mb-4">
        <div data-ev-id="ev_aab2c620b3" className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input data-ev-id="ev_6b7942319f"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mitglied suchen..."
          className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary/20" />

        </div>
        {(isAdmin || isKommandant) &&
        <button data-ev-id="ev_e1dc6d37f8"
        onClick={() => setShowNewUserForm(!showNewUserForm)}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2">

            <UserPlus className="w-4 h-4" />
            Neuer Benutzer
          </button>
        }
      </div>

      {/* New User Form */}
      {showNewUserForm &&
      <SectionCard className="mb-4">
          <h3 data-ev-id="ev_802db84ed1" className="font-semibold mb-3">Neuen Benutzer anlegen</h3>
          <div data-ev-id="ev_39600abab7" className="grid gap-3 sm:grid-cols-3">
            <input data-ev-id="ev_92f75dc3c1"
          type="text"
          value={newUser.fullName}
          onChange={(e) => setNewUser((prev) => ({ ...prev, fullName: e.target.value }))}
          placeholder="Vollständiger Name"
          className="px-3 py-2 border border-input rounded-lg" />

            <input data-ev-id="ev_70c4644a9c"
          type="email"
          value={newUser.email}
          onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
          placeholder="E-Mail"
          className="px-3 py-2 border border-input rounded-lg" />

            <input data-ev-id="ev_b1c011a69c"
          type="password"
          value={newUser.password}
          onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
          placeholder="Passwort"
          className="px-3 py-2 border border-input rounded-lg" />

          </div>
          <div data-ev-id="ev_38555d7a42" className="flex gap-2 mt-3">
            <button data-ev-id="ev_8eb7be74c0"
          onClick={handleCreateUser}
          disabled={creating || !newUser.email || !newUser.password || !newUser.fullName}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">

              <Check className="w-4 h-4" />
              Anlegen
            </button>
            <button data-ev-id="ev_bcc47dc07b"
          onClick={() => setShowNewUserForm(false)}
          className="px-4 py-2 border border-input rounded-lg hover:bg-muted">

              Abbrechen
            </button>
          </div>
        </SectionCard>
      }

      {/* Users List */}
      <div data-ev-id="ev_6a6db682d0" className="bg-card border border-border rounded-lg overflow-hidden">
        <div data-ev-id="ev_28d00e95b4" className="grid grid-cols-[1fr,auto,auto] gap-4 p-3 bg-muted/50 text-sm font-medium text-muted-foreground border-b">
          <span data-ev-id="ev_112e6a5dcb">Name / E-Mail</span>
          <span data-ev-id="ev_0889b36c89">Rolle</span>
          <span data-ev-id="ev_5f30d16ed2" className="w-10"></span>
        </div>

        <div data-ev-id="ev_13badebc5c" className="divide-y divide-border max-h-[500px] overflow-y-auto">
          {filteredProfiles.map((profile) =>
          <div data-ev-id="ev_f10fa5d032" key={profile.id}>
              <div data-ev-id="ev_c473a5a4e3"
            className="grid grid-cols-[1fr,auto,auto] gap-4 items-center p-3 hover:bg-muted/30 cursor-pointer"
            onClick={() => setExpandedUser(expandedUser === profile.id ? null : profile.id)}>

                <div data-ev-id="ev_dcf4b7b049">
                  <p data-ev-id="ev_628b54d4f7" className="font-medium text-foreground">{profile.full_name}</p>
                  <p data-ev-id="ev_3763b02274" className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
                <select data-ev-id="ev_cdca5ffd1c"
              value={profile.role}
              onChange={async (e) => {
                e.stopPropagation();
                await updateRole(profile.id, e.target.value as UserRole);
                await refetchProfiles();
              }}
              disabled={profile.id === currentProfile?.id}
              onClick={(e) => e.stopPropagation()}
              className={`px-3 py-1 rounded-lg text-sm font-medium border-0 focus:ring-2 focus:ring-primary/20 ${
              roleOptions.find((r) => r.value === profile.role)?.color || ''}`
              }>

                  {roleOptions.map((opt) =>
                <option data-ev-id="ev_351e7a87c0" key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                )}
                </select>
                {expandedUser === profile.id ?
              <ChevronUp className="w-5 h-5 text-muted-foreground" /> :

              <ChevronDown className="w-5 h-5 text-muted-foreground" />
              }
              </div>

              {/* Expanded Details */}
              {expandedUser === profile.id &&
            <div data-ev-id="ev_ecf69b6581" className="px-4 pb-4 bg-muted/20 space-y-4">
                  {/* Default Bereichsleiter */}
                  {profile.role === 'mitglied' &&
              <div data-ev-id="ev_b85d6ebd98" className="flex items-center gap-3">
                      <span data-ev-id="ev_d678c49c3a" className="text-sm text-muted-foreground w-40">Standard-Bereichsleiter:</span>
                      <select data-ev-id="ev_5a88f1b915"
                value={profile.default_bereichsleiter || ''}
                onChange={async (e) => {
                  await updateDefaultBereichsleiter(profile.id, e.target.value || null);
                  await refetchProfiles();
                }}
                className="flex-1 px-3 py-1.5 border border-input rounded-lg text-sm">

                        <option data-ev-id="ev_ba1f97e42e" value="">Keiner</option>
                        {bereichsleiter.map((bl) =>
                  <option data-ev-id="ev_5a3be56586" key={bl.id} value={bl.id}>
                            {bl.full_name}
                          </option>
                  )}
                      </select>
                    </div>
              }

                  {/* Functions */}
                  <div data-ev-id="ev_01cbc332f8">
                    <span data-ev-id="ev_d4ec663f3b" className="text-sm text-muted-foreground block mb-2">Funktionen:</span>
                    <div data-ev-id="ev_4728e5084a" className="flex flex-wrap gap-2">
                      {functions.map((func) =>
                  <label data-ev-id="ev_73f443f19d"
                  key={func.id}
                  className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${
                  (profile.functions || []).includes(func.name) ?
                  'bg-primary text-primary-foreground' :
                  'bg-muted text-muted-foreground hover:bg-muted/80'}`
                  }>

                          <input data-ev-id="ev_64e1f240c1"
                    type="checkbox"
                    checked={(profile.functions || []).includes(func.name)}
                    onChange={() => handleFunctionToggle(profile.id, func.name, profile.functions || [])}
                    className="sr-only" />

                          {func.label}
                        </label>
                  )}
                    </div>
                  </div>

                  {/* Password Reset */}
                  {(isAdmin || isKommandant) && profile.id !== currentProfile?.id &&
              <div data-ev-id="ev_d0e8473a50" className="pt-2 border-t border-border">
                      <div data-ev-id="ev_9401212c93" className="flex items-center justify-between">
                        <div data-ev-id="ev_3ebeefdc1d">
                          <span data-ev-id="ev_b3fae75aac" className="text-sm font-medium text-foreground">Passwort zurücksetzen</span>
                          <p data-ev-id="ev_8f36c04b60" className="text-xs text-muted-foreground">Setzt das Passwort auf "123456" zurück</p>
                        </div>
                        {resetSuccess === profile.id ?
                  <span data-ev-id="ev_80dd339899" className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            Zurückgesetzt!
                          </span> :

                  <button data-ev-id="ev_de0903cf97"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetPassword(profile.id);
                  }}
                  disabled={resettingPassword === profile.id}
                  className="px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
                            {resettingPassword === profile.id ?
                    <span data-ev-id="ev_982102866b" className="w-4 h-4 border-2 border-amber-700/30 border-t-amber-700 rounded-full animate-spin" /> :

                    <Key className="w-4 h-4" />
                    }
                            Zurücksetzen
                          </button>
                  }
                      </div>
                    </div>
              }
                </div>
            }
            </div>
          )}
        </div>
      </div>

      <p data-ev-id="ev_6f7120ba41" className="text-sm text-muted-foreground mt-3">
        {filteredProfiles.length} von {profiles.length} Mitgliedern
      </p>
    </div>);

}