import { useState } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles, type UserRole } from '@/hooks/useProfiles';
import { useFunctions } from '@/hooks/useFunctions';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import {
  Users,
  Plus,
  X,
  Shield,
  User,
  Mail,
  Lock,
  UserPlus,
  Search,
  Trash2,
  Calendar,
  Send,
  Edit2,
  Check,
  Briefcase,
  Key } from
'lucide-react';

export default function UserManagement() {
  const { canCreateUsers, profile: currentProfile, createUser } = useAuth();
  const { profiles, updateRole, updateProfile, deleteUser, toggleUserActive, resetPassword, loading: profilesLoading, refetch: refetchProfiles } = useProfiles();
  const { functions: functionOptions, loading: functionsLoading } = useFunctions();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [sendingCredentials, setSendingCredentials] = useState<string | null>(null);

  // Modal für neuen Benutzer
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('mitglied');
  const [newUserLoading, setNewUserLoading] = useState(false);
  const [newUserError, setNewUserError] = useState('');
  const [newUserSuccess, setNewUserSuccess] = useState('');

  // Modal für Benutzer bearbeiten
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<{id: string;email: string;full_name: string;role: UserRole;functions: string[];} | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('mitglied');
  const [editFunctions, setEditFunctions] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Modal für Benutzer löschen
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<{id: string;full_name: string;email: string;} | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Modal für Passwort zurücksetzen
  const [showResetModal, setShowResetModal] = useState(false);
  const [resettingUser, setResettingUser] = useState<{id: string;full_name: string;email: string;} | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Nur Admin und Kommandant haben Zugriff
  if (!canCreateUsers) {
    return <Navigate to="/" replace />;
  }

  const roleOptions: {value: UserRole;label: string;}[] = [
  { value: 'nutzer', label: 'Nutzer' },
  { value: 'mitglied', label: 'Mitglied' },
  { value: 'bereichsleiter', label: 'Bereichsleiter' },
  { value: 'kommandant', label: 'Kommandant' },
  { value: 'admin', label: 'Admin' }];

  function openEditModal(profile: {id: string;email: string;full_name: string;role: UserRole;functions: string[];}) {
    setEditingUser(profile);
    setEditName(profile.full_name || '');
    setEditRole(profile.role);
    setEditFunctions(profile.functions || []);
    setEditError('');
    setShowEditModal(true);
  }

  function closeEditModal() {
    setShowEditModal(false);
    setEditingUser(null);
    setEditName('');
    setEditFunctions([]);
    setEditError('');
  }

  function openDeleteModal(profile: {id: string;full_name: string;email: string;}) {
    setDeletingUser(profile);
    setDeleteError('');
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    setShowDeleteModal(false);
    setDeletingUser(null);
    setDeleteError('');
  }

  async function handleDeleteUser() {
    if (!deletingUser) return;

    setDeleteLoading(true);
    setDeleteError('');

    const { error } = await deleteUser(deletingUser.id);

    if (error) {
      setDeleteError(error.message);
      setDeleteLoading(false);
      return;
    }

    setDeleteLoading(false);
    closeDeleteModal();
  }

  function openResetModal(profile: {id: string;full_name: string;email: string;}) {
    setResettingUser(profile);
    setResetError('');
    setResetSuccess(false);
    setShowResetModal(true);
  }

  function closeResetModal() {
    setShowResetModal(false);
    setResettingUser(null);
    setResetError('');
    setResetSuccess(false);
  }

  async function handleResetPassword() {
    if (!resettingUser) return;

    setResetLoading(true);
    setResetError('');

    const { error, emailSent } = await resetPassword(resettingUser.id);

    if (error) {
      setResetError(error.message);
      setResetLoading(false);
      return;
    }

    setResetLoading(false);
    setResetSuccess(true);

    // Modal nach 2 Sekunden automatisch schließen
    setTimeout(() => {
      closeResetModal();
    }, 2000);
  }

  function toggleFunction(functionId: string) {
    setEditFunctions((prev) =>
    prev.includes(functionId) ?
    prev.filter((f) => f !== functionId) :
    [...prev, functionId]
    );
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;

    setEditError('');
    setEditLoading(true);

    // Name und Funktionen aktualisieren
    const { error: profileError } = await updateProfile(editingUser.id, {
      full_name: editName,
      functions: editFunctions
    });

    if (profileError) {
      setEditError(profileError.message);
      setEditLoading(false);
      return;
    }

    // Rolle aktualisieren (falls geändert)
    if (editRole !== editingUser.role) {
      const { error: roleError } = await updateRole(editingUser.id, editRole);
      if (roleError) {
        setEditError(roleError.message);
        setEditLoading(false);
        return;
      }
    }

    setEditLoading(false);
    closeEditModal();
    refetchProfiles();
  }

  async function sendCredentialsEmail(email: string, password: string, name: string, role: string, userId?: string) {
    if (!supabase) return { error: new Error('Datenbank nicht verbunden') };

    const { data, error } = await supabase.functions.invoke('send-credentials', {
      body: { email, password, name, role, userId }
    });

    if (error) {
      console.error('Error sending credentials:', error);
      return { error };
    }

    return { data };
  }

  async function handleSendCredentials(profile: {id: string;email: string;full_name: string;role: string;}) {
    setSendingCredentials(profile.id);

    // Generiere ein neues temporäres Passwort
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();

    const { error } = await sendCredentialsEmail(
      profile.email,
      tempPassword,
      profile.full_name,
      profile.role,
      profile.id // userId mitsenden, damit das Passwort geändert wird
    );

    if (error) {
      alert('Fehler beim Senden der E-Mail: ' + (error as Error).message);
    } else {
      alert(`Anmeldedaten wurden an ${profile.email} gesendet.\n\nDas neue Passwort wurde gesetzt und per E-Mail versendet.`);
    }

    setSendingCredentials(null);
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':return 'bg-purple-100 text-purple-800';
      case 'bereichsleiter':return 'bg-blue-100 text-blue-800';
      case 'kommandant':return 'bg-red-100 text-red-800';
      case 'nutzer':return 'bg-green-100 text-green-800';
      default:return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredProfiles = profiles.filter((profile) => {
    const matchesSearch =
    profile.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    profile.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || profile.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  async function handleRoleChange(userId: string, newRole: UserRole) {
    await updateRole(userId, newRole);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setNewUserError('');
    setNewUserSuccess('');
    setNewUserLoading(true);

    const { error } = await createUser(newUserEmail, newUserPassword, newUserName, newUserRole);

    if (error) {
      setNewUserError(error.message);
    } else {
      // E-Mail mit Anmeldedaten senden
      const { error: emailError } = await sendCredentialsEmail(
        newUserEmail,
        newUserPassword,
        newUserName,
        newUserRole
      );

      if (emailError) {
        setNewUserSuccess(`Benutzer ${newUserEmail} wurde angelegt, aber die E-Mail konnte nicht gesendet werden.`);
      } else {
        setNewUserSuccess(`Benutzer ${newUserEmail} wurde erfolgreich angelegt. Anmeldedaten wurden per E-Mail gesendet.`);
      }

      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserRole('mitglied');
      refetchProfiles();
      setTimeout(() => {
        setShowNewUserModal(false);
        setNewUserSuccess('');
      }, 3000);
    }
    setNewUserLoading(false);
  }

  function closeModal() {
    setShowNewUserModal(false);
    setNewUserError('');
    setNewUserSuccess('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserName('');
    setNewUserRole('mitglied');
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Statistiken
  const stats = {
    total: profiles.length,
    admins: profiles.filter((p) => p.role === 'admin').length,
    kommandanten: profiles.filter((p) => p.role === 'kommandant').length,
    bereichsleiter: profiles.filter((p) => p.role === 'bereichsleiter').length,
    mitglieder: profiles.filter((p) => p.role === 'mitglied').length
  };

  if (profilesLoading || functionsLoading) {
    return (
      <Layout>
        <div data-ev-id="ev_4461054e55" className="flex items-center justify-center min-h-[400px]">
          <div data-ev-id="ev_a5e72d857d" className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </Layout>);

  }

  return (
    <Layout>
      <div data-ev-id="ev_680a64f6ec" className="max-w-6xl mx-auto">
        {/* Header Card */}
        <div data-ev-id="ev_e7cf24c8f8" className="bg-gradient-to-r from-purple-600 to-purple-500 rounded-xl p-5 text-white shadow-lg mb-6">
          <div data-ev-id="ev_cda31ced04" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div data-ev-id="ev_b672e487a3" className="flex items-center gap-4">
              <div data-ev-id="ev_742338ccd0" className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div data-ev-id="ev_b58434ce52">
                <h1 data-ev-id="ev_867cb368f8" className="text-xl font-bold">Benutzerverwaltung</h1>
                <p data-ev-id="ev_5138c29068" className="text-sm text-white/80">
                  {profiles.length} Benutzer insgesamt
                </p>
              </div>
            </div>
            <button data-ev-id="ev_8eef844351"
            onClick={() => setShowNewUserModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-purple-600 rounded-xl font-medium hover:bg-white/90 transition-colors shadow-lg group">
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              Neuer Benutzer
            </button>
          </div>
        </div>

        {/* Statistik-Karten */}
        <div data-ev-id="ev_48592d8e78" className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div data-ev-id="ev_3813aebd6c" className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
            <div data-ev-id="ev_bfa3607cd7" className="flex items-center gap-3">
              <div data-ev-id="ev_433aa5f1d7" className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
              <div data-ev-id="ev_f07fde203c">
                <p data-ev-id="ev_d846de6a0a" className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p data-ev-id="ev_dd85fc6e16" className="text-xs text-muted-foreground">Gesamt</p>
              </div>
            </div>
          </div>
          <div data-ev-id="ev_d01a480418" className="bg-card rounded-xl border border-purple-200 p-4 hover:shadow-md transition-shadow">
            <div data-ev-id="ev_a8d17edd99" className="flex items-center gap-3">
              <div data-ev-id="ev_dc37a82e44" className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div data-ev-id="ev_b77cf8e187">
                <p data-ev-id="ev_3c6f345cea" className="text-2xl font-bold text-purple-700">{stats.admins}</p>
                <p data-ev-id="ev_a583254752" className="text-xs text-purple-600">Admins</p>
              </div>
            </div>
          </div>
          <div data-ev-id="ev_c6c2c0d104" className="bg-card rounded-xl border border-red-200 p-4 hover:shadow-md transition-shadow">
            <div data-ev-id="ev_2c28d1ca86" className="flex items-center gap-3">
              <div data-ev-id="ev_2d6a27a318" className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-red-600" />
              </div>
              <div data-ev-id="ev_41c6142998">
                <p data-ev-id="ev_8e1c942eff" className="text-2xl font-bold text-red-700">{stats.kommandanten}</p>
                <p data-ev-id="ev_3595d33dc4" className="text-xs text-red-600">Kommandanten</p>
              </div>
            </div>
          </div>
          <div data-ev-id="ev_c4cc09d5be" className="bg-card rounded-xl border border-blue-200 p-4 hover:shadow-md transition-shadow">
            <div data-ev-id="ev_8ddb4986c8" className="flex items-center gap-3">
              <div data-ev-id="ev_18e84a6a16" className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div data-ev-id="ev_8b2ebaea10">
                <p data-ev-id="ev_f1a67f95f5" className="text-2xl font-bold text-blue-700">{stats.bereichsleiter}</p>
                <p data-ev-id="ev_c8654c164f" className="text-xs text-blue-600">Bereichsleiter</p>
              </div>
            </div>
          </div>
          <div data-ev-id="ev_dc2eeb6ff4" className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
            <div data-ev-id="ev_7ec8e953b1" className="flex items-center gap-3">
              <div data-ev-id="ev_a2bf24aeb6" className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div data-ev-id="ev_31c1a9732c">
                <p data-ev-id="ev_554cfea058" className="text-2xl font-bold text-foreground">{stats.mitglieder}</p>
                <p data-ev-id="ev_1b37cd6567" className="text-xs text-muted-foreground">Mitglieder</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div data-ev-id="ev_9a7647c7e7" className="bg-card rounded-xl border border-border p-4 mb-6">
          <div data-ev-id="ev_952cd31ff7" className="flex flex-col sm:flex-row gap-3">
            <div data-ev-id="ev_b954257702" className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input data-ev-id="ev_67d291ecbd"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Benutzer suchen..."
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            </div>
            <select data-ev-id="ev_ff7bca9d47"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
            className="px-4 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-w-[160px]">
              <option data-ev-id="ev_d1c5e02571" value="all">Alle Rollen</option>
              {roleOptions.map((option) =>
              <option data-ev-id="ev_f27c1281b0" key={option.value} value={option.value}>{option.label}</option>
              )}
            </select>
          </div>
        </div>

        {/* Benutzerliste */}
        <div data-ev-id="ev_fe4e25d180" className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <div data-ev-id="ev_076c5c29a1">
            <table data-ev-id="ev_789ed613ae" className="w-full">
              <thead data-ev-id="ev_a6d1a514fe" className="bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-100">
                <tr data-ev-id="ev_69b600bb00">
                  <th data-ev-id="ev_2dfbef38e1" className="text-left px-3 py-3 text-sm font-medium text-muted-foreground">Benutzer</th>
                  <th data-ev-id="ev_c854ee09ce" className="text-left px-3 py-3 text-sm font-medium text-muted-foreground hidden xl:table-cell">E-Mail</th>
                  <th data-ev-id="ev_960134c59a" className="text-left px-3 py-3 text-sm font-medium text-muted-foreground hidden lg:table-cell">Rolle</th>
                  <th data-ev-id="ev_status_col" className="text-center px-3 py-3 text-sm font-medium text-muted-foreground hidden lg:table-cell">Status</th>
                  <th data-ev-id="ev_2542408cf4" className="text-right px-3 py-3 text-sm font-medium text-muted-foreground">Aktionen</th>
                </tr>
              </thead>
              <tbody data-ev-id="ev_53779b261a" className="divide-y divide-border">
                {filteredProfiles.length === 0 ?
                <tr data-ev-id="ev_009c932f72">
                    <td data-ev-id="ev_2eb4cdf440" colSpan={5} className="px-4 py-12 sm:py-16">
                      <div data-ev-id="ev_8804fb3ea6" className="flex flex-col items-center text-center">
                        <div data-ev-id="ev_35970cc792" className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl flex items-center justify-center mb-5">
                          <Search className="w-10 h-10 text-purple-400" />
                        </div>
                        <h3 data-ev-id="ev_1ec433ff7b" className="text-lg font-semibold text-purple-700 mb-2">Keine Ergebnisse</h3>
                        <p data-ev-id="ev_aae731de2a" className="text-purple-600/80 text-sm max-w-xs">
                          Keine Benutzer gefunden. Versuchen Sie einen anderen Suchbegriff.
                        </p>
                      </div>
                    </td>
                  </tr> :

                filteredProfiles.map((profile) =>
                <tr data-ev-id="ev_3a59183aae" key={profile.id} className="hover:bg-muted/50 transition-colors">
                      <td data-ev-id="ev_3443932634" className="px-3 py-2">
                        <div data-ev-id="ev_ee48740eb5" className="flex items-center gap-2">
                          <div data-ev-id="ev_39da1c3780" className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div data-ev-id="ev_24f0532274" className="min-w-0">
                            <p data-ev-id="ev_2d01b0010e" className="font-medium text-foreground text-sm truncate">
                              {profile.full_name || 'Ohne Name'}
                              {profile.id === currentProfile?.id &&
                          <span data-ev-id="ev_169d489445" className="ml-1 text-xs text-muted-foreground">(Sie)</span>
                          }
                            </p>
                            {profile.functions && profile.functions.length > 0 &&
                        <div data-ev-id="ev_cfc687f380" className="flex flex-wrap gap-0.5 mt-0.5">
                                {profile.functions.slice(0, 2).map((funcName) => {
                            const func = functionOptions.find((f) => f.name === funcName);
                            return func ?
                            <span data-ev-id="ev_7ff8066e1e" key={funcName} className="inline-flex items-center px-1 py-0 bg-amber-100 text-amber-800 rounded text-[10px]">
                                      {func.label.length > 12 ? func.label.slice(0, 10) + '..' : func.label}
                                    </span> :
                            null;
                          })}
                          {profile.functions.length > 2 &&
                          <span data-ev-id="ev_fd910d019c" className="text-[10px] text-muted-foreground">+{profile.functions.length - 2}</span>
                          }
                              </div>
                        }
                            <p data-ev-id="ev_c50cd06a0c" className="text-xs text-muted-foreground xl:hidden truncate">{profile.email}</p>
                          </div>
                        </div>
                      </td>
                      <td data-ev-id="ev_44c9c24960" className="px-3 py-2 text-sm text-muted-foreground hidden xl:table-cell">
                        <span data-ev-id="ev_738488844c" className="truncate block">{profile.email}</span>
                      </td>
                      <td data-ev-id="ev_c48556267a" className="px-3 py-2 hidden lg:table-cell">
                        <select data-ev-id="ev_3c479f8bbc"
                    value={profile.role}
                    onChange={(e) => handleRoleChange(profile.id, e.target.value as UserRole)}
                    disabled={profile.id === currentProfile?.id}
                    className={`px-1.5 py-1 rounded border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring ${
                    profile.id === currentProfile?.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`
                    }>

                          {roleOptions.map((option) =>
                      <option data-ev-id="ev_e2528b6c80" key={option.value} value={option.value}>
                              {option.label}
                            </option>
                      )}
                        </select>
                      </td>
                      <td data-ev-id="ev_status_cell" className="px-3 py-2 text-center hidden lg:table-cell">
                        <button data-ev-id="ev_3d78750090"
                    onClick={() => toggleUserActive(profile.id, !profile.is_active)}
                    disabled={profile.id === currentProfile?.id}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    profile.id === currentProfile?.id ?
                    'opacity-50 cursor-not-allowed' :
                    'cursor-pointer'} ${
                    profile.is_active !== false ? 'bg-green-500' : 'bg-gray-300'}`}
                    title={profile.is_active !== false ? 'Aktiv' : 'Inaktiv'}>

                          <span data-ev-id="ev_293b2b635f"
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-lg transition-transform ${
                      profile.is_active !== false ? 'translate-x-5' : 'translate-x-0.5'}`
                      } />

                        </button>
                      </td>
                      <td data-ev-id="ev_23d8de9373" className="px-2 py-2 text-right">
                        <div data-ev-id="ev_0ffed0aa8e" className="flex items-center justify-end gap-1">
                          {/* Mobile/Tablet: Show role and status */}
                          <div data-ev-id="ev_mobile_info" className="lg:hidden flex items-center gap-1 mr-2">
                            <span data-ev-id="ev_866617281e" className={`text-[10px] px-1.5 py-0.5 rounded ${getRoleBadgeColor(profile.role)}`}>
                              {roleOptions.find((r) => r.value === profile.role)?.label}
                            </span>
                            <div data-ev-id="ev_e750751096" className={`w-2 h-2 rounded-full ${profile.is_active !== false ? 'bg-green-500' : 'bg-gray-300'}`} />
                          </div>
                          
                          {/* Action Buttons - always visible */}
                          <button data-ev-id="ev_15822e113b"
                      onClick={() => openEditModal(profile)}
                      disabled={profile.id === currentProfile?.id}
                      className={`p-2 rounded-lg transition-colors ${
                      profile.id === currentProfile?.id ?
                      'opacity-30 cursor-not-allowed' :
                      'hover:bg-blue-100 text-blue-600 hover:text-blue-700 bg-blue-50'}`
                      }
                      title="Bearbeiten">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button data-ev-id="ev_6b2b686386"
                      onClick={() => openResetModal(profile)}
                      disabled={profile.id === currentProfile?.id}
                      className={`p-2 rounded-lg transition-colors ${
                      profile.id === currentProfile?.id ?
                      'opacity-30 cursor-not-allowed' :
                      'hover:bg-amber-100 text-amber-600 hover:text-amber-700 bg-amber-50'}`
                      }
                      title="Passwort zurücksetzen">
                            <Key className="w-4 h-4" />
                          </button>
                          <button data-ev-id="ev_50567ddf85"
                      onClick={() => openDeleteModal(profile)}
                      disabled={profile.id === currentProfile?.id}
                      className={`p-2 rounded-lg transition-colors ${
                      profile.id === currentProfile?.id ?
                      'opacity-30 cursor-not-allowed' :
                      'hover:bg-red-100 text-red-600 hover:text-red-700 bg-red-50'}`
                      }
                      title="Löschen">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                )
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Hinweis */}
        <div data-ev-id="ev_6e41fdda21" className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100">
          <div data-ev-id="ev_fd400b4062" className="flex items-start gap-3">
            <div data-ev-id="ev_5c7bfc2e58" className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-purple-600" />
            </div>
            <p data-ev-id="ev_7122eea322" className="text-sm text-muted-foreground">
              <strong data-ev-id="ev_5fb7fc8bdf" className="text-foreground">Hinweis:</strong> Sie können Ihre eigene Rolle nicht ändern. Neue Benutzer können sich nicht selbst registrieren - sie müssen von einem Admin oder Kommandanten angelegt werden.
            </p>
          </div>
        </div>
      </div>

      {/* Modal: Neuer Benutzer */}
      {showNewUserModal &&
      <div data-ev-id="ev_bc4d34aa12" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div data-ev-id="ev_6051a594b7" className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl overflow-hidden">
            {/* Gradient Header */}
            <div data-ev-id="ev_54d735b944" className="bg-gradient-to-r from-purple-600 to-purple-500 p-5">
              <div data-ev-id="ev_ae8147a092" className="flex items-center justify-between">
                <div data-ev-id="ev_3b129c3af4" className="flex items-center gap-3">
                  <div data-ev-id="ev_3e10c7128b" className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <div data-ev-id="ev_7c93e7ab63">
                    <h3 data-ev-id="ev_3a82edbb5e" className="text-lg font-semibold text-white">Neuer Benutzer</h3>
                    <p data-ev-id="ev_43ae3a9ed1" className="text-sm text-white/70">Benutzer anlegen & einladen</p>
                  </div>
                </div>
                <button data-ev-id="ev_4cf1117e48"
              onClick={closeModal}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors text-white/80 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div data-ev-id="ev_de123fcea4" className="p-6">
              {newUserError &&
            <div data-ev-id="ev_a029ec6765" className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {newUserError}
                </div>
            }

              {newUserSuccess &&
            <div data-ev-id="ev_7f9b68243e" className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 text-sm">
                  {newUserSuccess}
                </div>
            }

              <form data-ev-id="ev_2c9ac4b4d1" onSubmit={handleCreateUser} onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }} className="flex flex-col gap-4">
              <div data-ev-id="ev_04030da7c2">
                <label data-ev-id="ev_ce6939ed72" className="block text-sm font-medium text-foreground mb-1.5">
                  Name *
                </label>
                <div data-ev-id="ev_2e9ddc07bd" className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input data-ev-id="ev_fad5fd4249"
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Max Mustermann"
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  required />

                </div>
              </div>

              <div data-ev-id="ev_31c1a9732c">
                <label data-ev-id="ev_2b88e296e8" className="block text-sm font-medium text-foreground mb-1.5">
                  E-Mail *
                </label>
                <div data-ev-id="ev_9d5d106be4" className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input data-ev-id="ev_52a9d491a0"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="email@beispiel.de"
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  required />

                </div>
              </div>

              <div data-ev-id="ev_cef4ad5838">
                <label data-ev-id="ev_00017a3e8e" className="block text-sm font-medium text-foreground mb-1.5">
                  Passwort *
                </label>
                <div data-ev-id="ev_a0cb1f496b" className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input data-ev-id="ev_6362dca985"
                  type="text"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Initiales Passwort"
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                  minLength={6} />

                </div>
                <p data-ev-id="ev_3d30012788" className="text-xs text-muted-foreground mt-1">
                  Mindestens 6 Zeichen. Der Benutzer kann es später ändern.
                </p>
              </div>

              <div data-ev-id="ev_3fe2d52d88">
                <label data-ev-id="ev_0cb25f9f03" className="block text-sm font-medium text-foreground mb-1.5">
                  Rolle *
                </label>
                <select data-ev-id="ev_f7722a7ceb"
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring">

                  {roleOptions.map((option) =>
                  <option data-ev-id="ev_7f48a4a857" key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  )}
                </select>
              </div>

              <div data-ev-id="ev_f7f4995805" className="flex gap-3 mt-2">
                <button data-ev-id="ev_dad9a221e9"
                type="button"
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 border border-input rounded-xl font-medium hover:bg-muted transition-colors">
                  Abbrechen
                </button>
                <button data-ev-id="ev_3e8c6d0b95"
                type="submit"
                disabled={newUserLoading}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl font-medium hover:from-purple-700 hover:to-purple-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25">
                  {newUserLoading ?
                  <span data-ev-id="ev_4018a140c7" className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
                  <>
                      <UserPlus className="w-5 h-5" />
                      Anlegen
                    </>
                  }
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      }

      {/* Modal: Benutzer bearbeiten */}
      {showEditModal && editingUser &&
      <div data-ev-id="ev_daa5983ff8" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div data-ev-id="ev_a163c6e8e3" className="bg-card rounded-2xl border border-border w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Gradient Header */}
            <div data-ev-id="ev_3fbcd5586f" className="bg-gradient-to-r from-blue-600 to-blue-500 p-5">
              <div data-ev-id="ev_4cc50b523e" className="flex items-center justify-between">
                <div data-ev-id="ev_13c4a96330" className="flex items-center gap-3">
                  <div data-ev-id="ev_6ee527bc28" className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Edit2 className="w-5 h-5 text-white" />
                  </div>
                  <div data-ev-id="ev_1c7cf6713f">
                    <h3 data-ev-id="ev_216e16d283" className="text-lg font-semibold text-white">Benutzer bearbeiten</h3>
                    <p data-ev-id="ev_2972a54bef" className="text-sm text-white/70">{editingUser.email}</p>
                  </div>
                </div>
                <button data-ev-id="ev_900869103a"
              onClick={closeEditModal}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors text-white/80 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div data-ev-id="ev_b6533d17dd" className="flex-1 overflow-y-auto p-6">
            {editError &&
            <div data-ev-id="ev_f4700cbd0c" className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                {editError}
              </div>
            }

            <form data-ev-id="ev_44eec9b8d2" onSubmit={handleEditUser} onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }} className="flex flex-col gap-4">
              <div data-ev-id="ev_462505a224">
                <label data-ev-id="ev_8959605b1d" className="block text-sm font-medium text-foreground mb-1.5">
                  E-Mail
                </label>
                <div data-ev-id="ev_0dc5753990" className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input data-ev-id="ev_8a6388bb75"
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 bg-muted border border-input rounded-lg text-muted-foreground cursor-not-allowed" />

                </div>
                <p data-ev-id="ev_4c28898b87" className="text-xs text-muted-foreground mt-1">
                  Die E-Mail-Adresse kann nicht geändert werden.
                </p>
              </div>

              <div data-ev-id="ev_2547eb567b">
                <label data-ev-id="ev_d54c5678d9" className="block text-sm font-medium text-foreground mb-1.5">
                  Name *
                </label>
                <div data-ev-id="ev_cee52a1e8c" className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input data-ev-id="ev_3c92a5a12b"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Vollständiger Name"
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  required />

                </div>
              </div>

              <div data-ev-id="ev_94fc6aba62">
                <label data-ev-id="ev_65f603201b" className="block text-sm font-medium text-foreground mb-1.5">
                  Rolle *
                </label>
                <select data-ev-id="ev_bc0a0cc416"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring">

                  {roleOptions.map((option) =>
                  <option data-ev-id="ev_fd390d42d6" key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  )}
                </select>
              </div>

              <div data-ev-id="ev_10458bdc6b">
                <label data-ev-id="ev_4f027db063" className="block text-sm font-medium text-foreground mb-1.5">
                  Funktionen
                </label>
                <div data-ev-id="ev_efad3c8940" className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-background border border-input rounded-lg">
                  {functionOptions.map((func) =>
                  <button data-ev-id="ev_9393d900d3"
                  key={func.name}
                  type="button"
                  onClick={() => toggleFunction(func.name)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  editFunctions.includes(func.name) ?
                  'bg-primary text-primary-foreground' :
                  'bg-muted hover:bg-muted/80 text-foreground'}`
                  }>

                      {editFunctions.includes(func.name) && <Check className="w-4 h-4 flex-shrink-0" />}
                      <span data-ev-id="ev_83ee9c87e9" className="truncate">{func.label}</span>
                    </button>
                  )}
                </div>
                <p data-ev-id="ev_d6acb63232" className="text-xs text-muted-foreground mt-1">
                  Klicke auf die Funktionen, um sie zuzuweisen.
                </p>
              </div>

              <div data-ev-id="ev_3bacd325f5" className="flex gap-3 mt-4">
                <button data-ev-id="ev_04a51459ef"
                type="button"
                onClick={closeEditModal}
                className="flex-1 px-4 py-2.5 border border-input rounded-xl font-medium hover:bg-muted transition-colors">
                  Abbrechen
                </button>
                <button data-ev-id="ev_05f75b84b8"
                type="submit"
                disabled={editLoading}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25">
                  {editLoading ?
                  <span data-ev-id="ev_4cf44e39cf" className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
                  <>
                      <Check className="w-5 h-5" />
                      Speichern
                    </>
                  }
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      }

      {/* Modal: Benutzer löschen */}
      {showDeleteModal && deletingUser &&
      <div data-ev-id="ev_86ad6086a1" className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div data-ev-id="ev_e9ce39113b" className="bg-background rounded-2xl shadow-xl w-full max-w-md border border-border">
            <div data-ev-id="ev_11db95e6bb" className="p-5 border-b border-border">
              <div data-ev-id="ev_f4c76cef8f" className="flex items-center justify-between">
                <div data-ev-id="ev_f020b92459" className="flex items-center gap-3">
                  <div data-ev-id="ev_9f0211a648" className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 data-ev-id="ev_4d824d4c1d" className="text-lg font-semibold">Benutzer löschen</h2>
                </div>
                <button data-ev-id="ev_62db53eb44" onClick={closeDeleteModal} className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div data-ev-id="ev_11f372e3ac" className="p-5">
              <p data-ev-id="ev_09314ff80b" className="text-muted-foreground mb-4">
                Möchten Sie den Benutzer <strong data-ev-id="ev_afd7486594" className="text-foreground">{deletingUser.full_name || deletingUser.email}</strong> wirklich löschen?
              </p>
              <p data-ev-id="ev_b7db25724f" className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">
                ⚠️ Diese Aktion kann nicht rückgängig gemacht werden. Alle Daten des Benutzers werden unwiderruflich gelöscht.
              </p>
              
              {deleteError &&
            <div data-ev-id="ev_883e28bb59" className="p-3 bg-red-100 text-red-700 rounded-lg text-sm mb-4">
                  {deleteError}
                </div>
            }
              
              <div data-ev-id="ev_88533b1448" className="flex gap-3">
                <button data-ev-id="ev_ce7592e54c"
              type="button"
              onClick={closeDeleteModal}
              disabled={deleteLoading}
              className="flex-1 px-4 py-2.5 border border-input rounded-xl font-medium hover:bg-muted transition-colors disabled:opacity-50">
                  Abbrechen
                </button>
                <button data-ev-id="ev_13d9a7072f"
              type="button"
              onClick={handleDeleteUser}
              disabled={deleteLoading}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {deleteLoading ?
                <span data-ev-id="ev_d836166af6" className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
                <>
                      <Trash2 className="w-5 h-5" />
                      Endgültig löschen
                    </>
                }
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      {/* Modal: Passwort zurücksetzen */}
      {showResetModal && resettingUser &&
      <div data-ev-id="ev_75b604e20c" className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div data-ev-id="ev_18240f7f12" className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md overflow-hidden">
            <div data-ev-id="ev_c15ebdb7fb" className="p-5 border-b border-border">
              <div data-ev-id="ev_586b67f66e" className="flex items-center justify-between">
                <div data-ev-id="ev_e7cf549c83" className="flex items-center gap-3">
                  <div data-ev-id="ev_26c397ab3c" className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Key className="w-5 h-5 text-amber-600" />
                  </div>
                  <h2 data-ev-id="ev_07baf347d3" className="text-lg font-semibold">Passwort zurücksetzen</h2>
                </div>
                <button data-ev-id="ev_773e4d193c" onClick={closeResetModal} className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div data-ev-id="ev_4861e2278d" className="p-5">
              {resetSuccess ?
            <div data-ev-id="ev_b11372cb1e" className="text-center py-4">
                  <div data-ev-id="ev_e9f4b4b1a3" className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 data-ev-id="ev_e0e80e9ae7" className="text-lg font-semibold text-foreground mb-2">Passwort zurückgesetzt!</h3>
                  <p data-ev-id="ev_3849561b8d" className="text-muted-foreground text-sm">
                    Das Passwort wurde auf <strong data-ev-id="ev_684bf4c409" className="font-mono">123456</strong> zurückgesetzt.
                  </p>
                </div> :

            <>
                  <p data-ev-id="ev_bbf2a39e3f" className="text-muted-foreground mb-4">
                    Möchten Sie das Passwort von <strong data-ev-id="ev_a2646921df" className="text-foreground">{resettingUser.full_name || resettingUser.email}</strong> auf das Standardpasswort zurücksetzen?
                  </p>
                  <div data-ev-id="ev_2950a8401c" className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                    <p data-ev-id="ev_17e11632cb" className="text-sm text-amber-800">
                      <strong data-ev-id="ev_3246ba644f">Neues Passwort:</strong> <span data-ev-id="ev_775468ea5f" className="font-mono">123456</span>
                    </p>
                    <p data-ev-id="ev_876741f212" className="text-xs text-amber-600 mt-1">
                      Der Benutzer erhält eine E-Mail mit dem neuen Passwort.
                    </p>
                  </div>
                  
                  {resetError &&
              <div data-ev-id="ev_47260fb775" className="p-3 bg-red-100 text-red-700 rounded-lg text-sm mb-4">
                      {resetError}
                    </div>
              }
                  
                  <div data-ev-id="ev_94e8fbdf3a" className="flex gap-3">
                    <button data-ev-id="ev_a19f73776d"
                type="button"
                onClick={closeResetModal}
                disabled={resetLoading}
                className="flex-1 px-4 py-2.5 border border-input rounded-xl font-medium hover:bg-muted transition-colors disabled:opacity-50">
                      Abbrechen
                    </button>
                    <button data-ev-id="ev_7426c0ef5f"
                type="button"
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                      {resetLoading ?
                  <span data-ev-id="ev_362f87a74c" className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
                  <>
                          <Key className="w-5 h-5" />
                          Zurücksetzen
                        </>
                  }
                    </button>
                  </div>
                </>
            }
            </div>
          </div>
        </div>
      }
    </Layout>);

}