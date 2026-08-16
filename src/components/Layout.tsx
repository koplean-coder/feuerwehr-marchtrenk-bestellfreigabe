import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { useCanViewOnlineUsers } from '@/hooks/usePresence';
import { useTasks } from '@/hooks/useTasks';
import { useSettings } from '@/hooks/useSettings';
import { useModulePermissions } from '@/hooks/useModulePermissions';
import { useMenuFavorites } from '@/hooks/useMenuFavorites';
import { useMeetings } from '@/hooks/useMeetings';
import { supabase } from '@/integrations/supabase/client';
import { SandboxSwitcher } from '@/components/SandboxSwitcher';
import { MegaMenu, type MenuCategory } from '@/components/MegaMenu';
import logoImage from '@/assets/uploads/logo.png';
import {
  ShoppingCart,
  Truck,
  Settings,
  LogOut,
  Bell,
  User,
  Users,
  Key,
  ChevronDown,
  X,
  Eye,
  ListTodo,
  Receipt,
  Briefcase,
  Smartphone,
  BookOpen,
  Home,
  UserCheck,
  Calendar,
  Save,
  FileText,
  Check,
  Lightbulb,
  Vote,
  CalendarCheck,
  Grid3X3,
  Star } from
'lucide-react';
import { useFunctions } from '@/hooks/useFunctions';
import { useProfiles } from '@/hooks/useProfiles';
import { PushNotificationSettings } from '@/components/PushNotificationSettings';
import { SubstituteModal } from '@/components/SubstituteModal';
import { ProblemReportButton } from '@/components/ProblemReportButton';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut, user, refetchProfile, hasLimitedAccess } = useAuth();
  const { profiles, updateSubstitute, setAbsence, refetch: refetchProfiles } = useProfiles();
  const { unreadCount } = useNotifications();
  const { canView: canViewOnlineUsers } = useCanViewOnlineUsers();
  const { tasks } = useTasks();
  const location = useLocation();

  // Use simulation context for effective permissions
  const {
    effectiveUserId,
    effectiveIsAdmin,
    effectiveIsKommandant,
    effectiveIsBereichsleiter,
    effectiveHasKassierFunction,
    canManageUsers,
    canAccessSettings,
    isSimulationActive,
    effectiveProfile
  } = useSimulation();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPushModal, setShowPushModal] = useState(false);
  const [showSubstituteModal, setShowSubstituteModal] = useState(false);
  const [showMegaMenu, setShowMegaMenu] = useState(false);

  // Menü-Favoriten
  const { favorites: menuFavorites, toggleFavorite, resetToDefault: resetMenuFavorites, reorderFavorites, saving: savingFavorites } = useMenuFavorites();
  const [savingHomePage, setSavingHomePage] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Check if user has any meeting invitations (for menu visibility)
  const { invitedMeetings } = useMeetings();
  const hasMeetingInvitations = invitedMeetings.length > 0;

  // Count tasks assigned to effective user that are not completed
  const myOpenTasks = tasks.filter(
    (task) => task.assigned_to === effectiveUserId && task.status !== 'completed' && task.status !== 'cancelled'
  );

  // Count steps assigned to effective user that are not completed
  const myOpenSteps = tasks.flatMap((task) => task.steps || []).filter(
    (step) => step.assigned_to === effectiveUserId && !step.completed
  );

  const myTaskCount = myOpenTasks.length + myOpenSteps.length;

  // Show Aufgaben for all full-access users (non-nutzer roles)
  // Admins, Kommandanten, Bereichsleiter und normale Mitglieder sehen Aufgaben immer
  // Nutzer-Rolle wird separat über Modul-Berechtigungen gesteuert
  const showAufgaben = true;

  // Check if effective user has kassier function
  const isKassier = effectiveHasKassierFunction;

  // Check if user can view ALL Freigaben (Kassier, Admin, Kommandant, KDT-Stellvertreter) - use effective values
  const { freigabenViewUsers, ideasPoolViewUsers, antragsformulareViewUsers, rentalItemsAdminUsers, sitzungenViewRoles, beschlussRegisterViewRoles } = useSettings();
  const { functions: functionOptions } = useFunctions();

  // Kommandant-Stellvertreter prüfen
  const isKdtStellvertreter = effectiveUserId ? profiles.find((p) => p.id === effectiveUserId)?.functions?.includes('kommandant_stellvertreter') : false;

  // Kann ALLE Freigaben sehen (nicht nur eigene)
  const canViewAllFreigaben = isKassier || effectiveIsAdmin || effectiveIsKommandant || isKdtStellvertreter || effectiveUserId && freigabenViewUsers.includes(effectiveUserId);

  // Check if user can view Ideas Pool (Admin, Kommandant, or in ideasPoolViewUsers list) - use effective values
  const canViewIdeasPool = effectiveIsAdmin || effectiveIsKommandant || effectiveUserId && ideasPoolViewUsers.includes(effectiveUserId);

  // Check if user can administer rental items (Admin, Kommandant, or in rentalItemsAdminUsers list) - use effective values
  const canAdminRentalItems = effectiveIsAdmin || effectiveIsKommandant || effectiveUserId && rentalItemsAdminUsers.includes(effectiveUserId);

  // Verfügbare Startseiten - nur Seiten anzeigen, die der Benutzer sehen darf (use effective values)
  const homePageOptions = [
  { value: '/', label: 'Dashboard', allowed: true },
  { value: '/bestellungen', label: 'Bestellungen', allowed: true },
  { value: '/lieferanten', label: 'Lieferanten', allowed: true },
  { value: '/kassier', label: 'Übersicht Freigaben', allowed: true },
  { value: '/aufgaben', label: 'Aufgaben', allowed: showAufgaben },
  { value: '/benutzer', label: 'Benutzer', allowed: canManageUsers },
  { value: '/einstellungen', label: 'Einstellungen', allowed: canAccessSettings },
  { value: '/benachrichtigungen', label: 'Benachrichtigungen', allowed: true },
  { value: '/ideen', label: 'Ideen-Pool', allowed: canViewIdeasPool }].
  filter((option) => option.allowed);

  // Startseite speichern
  async function saveHomePage(newHomePage: string) {
    if (!supabase || !user) return;
    setSavingHomePage(true);

    await supabase.
    from('profiles').
    update({ home_page: newHomePage }).
    eq('id', user.id);

    // Profil aktualisieren durch Neuladen der Seite
    window.location.reload();
  }

  // Module permissions for 'nutzer' role
  const { permissions: modulePermissions, hasModuleAccess } = useModulePermissions();

  // Check if user has 'nutzer' role - module permissions apply to them (mit Simulation)
  const isNutzerRole = effectiveProfile?.role === 'nutzer';

  // For nutzer role users, show only modules they have permission for
  // navItems now include category for MegaMenu grouping
  const navItems: MenuItem[] = [];

  if (isNutzerRole) {
    // Nutzer role: check module permissions matrix
    navItems.push({ path: '/', label: 'Dashboard', icon: Home, category: 'arbeit' });

    // Only show modules the user has access to
    if (hasModuleAccess('bestellungen')) {
      navItems.push({ path: '/bestellungen', label: 'Bestellungen', icon: ShoppingCart, category: 'arbeit' });
    }
    if (hasModuleAccess('lieferanten')) {
      navItems.push({ path: '/lieferanten', label: 'Lieferanten', icon: Truck, category: 'verwaltung' });
    }
    if (hasModuleAccess('formulare')) {
      navItems.push({ path: '/antragsformulare', label: 'Formulare', icon: FileText, category: 'arbeit' });
    }
    if (hasModuleAccess('freigaben')) {
      navItems.push({ path: '/kassier', label: 'Übersicht Freigaben', icon: Receipt, category: 'arbeit' });
    }
    if (hasModuleAccess('aufgaben')) {
      navItems.push({ path: '/aufgaben', label: 'Aufgaben', icon: ListTodo, category: 'arbeit' });
    }
    if (hasModuleAccess('beschluesse')) {
      navItems.push({ path: '/kommandobeschluesse', label: 'Beschlüsse', icon: Vote, category: 'verwaltung' });
    }
    // Beschluss-Register für Nutzer wenn in Settings freigeschaltet
    if (beschlussRegisterViewRoles.includes('nutzer')) {
      navItems.push({ path: '/beschluesse', label: 'Beschluss-Register', icon: FileText, category: 'verwaltung' });
    }
    if (hasModuleAccess('ideen_pool')) {
      navItems.push({ path: '/ideen', label: 'Ideen-Pool', icon: Lightbulb, category: 'system' });
    }

    // Anleitung always available
    navItems.push({ path: '/anleitung', label: 'Anleitung', icon: BookOpen, category: 'system' });
  } else {
    // Full access: show all modules based on permissions
    // Kategorie 'arbeit' - Tägliche Arbeit
    navItems.push({ path: '/', label: 'Dashboard', icon: Home, category: 'arbeit' });
    navItems.push({ path: '/bestellungen', label: 'Bestellungen', icon: ShoppingCart, category: 'arbeit' });

    // Antragsformulare für genehmigte Benutzer (approved), Kassier-Funktion, Kommandant, Admin, oder konfigurierte Benutzer (use effective values)
    const effectiveApproved = isSimulationActive ? profiles.find((p) => p.id === effectiveUserId)?.approved ?? false : profile?.approved;
    const canAccessForms = effectiveApproved || isKassier || effectiveIsKommandant || effectiveIsAdmin || effectiveUserId && antragsformulareViewUsers.includes(effectiveUserId);
    if (canAccessForms) {
      navItems.push({ path: '/antragsformulare', label: 'Formulare', icon: FileText, category: 'arbeit' });
    }

    // Übersicht Freigaben - für ALLE sichtbar (Filter erfolgt auf der Seite selbst)
    navItems.push({ path: '/kassier', label: 'Übersicht Freigaben', icon: Receipt, category: 'arbeit' });

    // Aufgaben für Admin, Kommandant, Bereichsleiter, oder Benutzer mit zugewiesenen Aufgaben
    if (showAufgaben) {
      navItems.push({ path: '/aufgaben', label: 'Aufgaben', icon: ListTodo, category: 'arbeit' });
    }

    // Kategorie 'verwaltung' - Verwaltung & Organisation
    navItems.push({ path: '/lieferanten', label: 'Lieferanten', icon: Truck, category: 'verwaltung' });

    // Kommandobeschlüsse für Kommandomitglieder, Kommandant und Admin (use effective values)
    const canViewKommandobeschluesse = effectiveIsAdmin || effectiveIsKommandant || effectiveProfile?.functions?.includes('kommandomitglied');
    if (canViewKommandobeschluesse) {
      navItems.push({ path: '/kommandobeschluesse', label: 'Umlaufbeschlüsse', icon: Vote, category: 'verwaltung' });
    }

    // Sitzungen basierend auf Settings und Rollen/Funktionen ODER Einladungen
    const userRoleForSitzungen = effectiveProfile?.role || profile?.role;
    const userFunctionsForSitzungen = effectiveProfile?.functions || profile?.functions || [];
    // Case-insensitive comparison for functions
    const sitzungenViewRolesLower = sitzungenViewRoles.map(r => r.toLowerCase());
    const hasRoleBasedSitzungenAccess = effectiveIsAdmin || effectiveIsKommandant ||
      (userRoleForSitzungen && sitzungenViewRolesLower.includes(userRoleForSitzungen.toLowerCase())) ||
      userFunctionsForSitzungen.some(f => sitzungenViewRolesLower.includes(f.toLowerCase()));
    // Also show menu if user has any meeting invitations
    const canViewSitzungen = hasRoleBasedSitzungenAccess || hasMeetingInvitations;
    if (canViewSitzungen) {
      navItems.push({ path: '/sitzungen', label: 'Sitzungen', icon: CalendarCheck, category: 'verwaltung' });
    }

    // Beschluss-Register basierend auf Settings und Rollen
    const userRole = effectiveProfile?.role || profile?.role;
    const canViewBeschlussRegister = effectiveIsAdmin || effectiveIsKommandant || 
      (userRole && beschlussRegisterViewRoles.includes(userRole)) ||
      effectiveProfile?.functions?.includes('kommandomitglied') ||
      effectiveProfile?.functions?.includes('erweitertes_kommando');
    if (canViewBeschlussRegister) {
      navItems.push({ path: '/beschluesse', label: 'Beschluss-Register', icon: FileText, category: 'verwaltung' });
    }

    // Benutzerverwaltung nur für Admin und Kommandant (use effective values)
    if (canManageUsers) {
      navItems.push({ path: '/benutzer', label: 'Benutzer', icon: Users, category: 'verwaltung' });
    }

    // Kategorie 'system' - System & Hilfe
    // Einstellungen nur für Admin, Kommandant, oder Leihgeräte-Admin (use effective values)
    if (canAccessSettings || canAdminRentalItems) {
      navItems.push({ path: '/einstellungen', label: 'Einstellungen', icon: Settings, category: 'system' });
    }

    // Ideen-Pool für Admin, Kommandant oder konfigurierte Benutzer
    if (canViewIdeasPool) {
      navItems.push({ path: '/ideen', label: 'Ideen-Pool', icon: Lightbulb, category: 'system' });
    }

    // Anleitung für alle Benutzer
    navItems.push({ path: '/anleitung', label: 'Anleitung', icon: BookOpen, category: 'system' });

    // Dokumentation (PDF-Export) für Admin, Kommandant und Kassier (mit Simulation)
    if (effectiveIsAdmin || effectiveIsKommandant || effectiveProfile?.role === 'kassier') {
      navItems.push({ path: '/dokumentation', label: 'Dokumentation', icon: FileText, category: 'system' });
    }
  }

  // Favoriten-Items in der vom User definierten Reihenfolge (nur Items die der User auch sehen darf)
  const favoriteItems = menuFavorites
    .map(path => navItems.find(item => item.path === path))
    .filter((item): item is MenuItem => item !== undefined);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':return 'bg-purple-100 text-purple-800';
      case 'bereichsleiter':return 'bg-blue-100 text-blue-800';
      case 'kommandant':return 'bg-red-100 text-red-800';
      case 'nutzer':return 'bg-green-100 text-green-800';
      default:return 'bg-gray-100 text-gray-800';
    }
  };

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Die Passwörter stimmen nicht überein.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    setPasswordLoading(true);

    if (!supabase) {
      setPasswordError('Datenbank nicht verbunden.');
      setPasswordLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
      }, 2000);
    }

    setPasswordLoading(false);
  }

  function closePasswordModal() {
    setShowPasswordModal(false);
    setPasswordError('');
    setPasswordSuccess(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':return 'Admin';
      case 'bereichsleiter':return 'Bereichsleiter';
      case 'kommandant':return 'Kommandant';
      case 'nutzer':return 'Nutzer';
      default:return 'Mitglied';
    }
  };

  return (
    <div data-ev-id="ev_ad18899549" className="min-h-screen bg-background">
      {/* Simulation Banner - am Anfang, nicht fixed */}
      {isSimulationActive && effectiveProfile &&
      <div data-ev-id="ev_f0e1913334" className="bg-amber-500 text-amber-950 text-center py-1.5 text-sm font-medium">
          🔍 Simulation aktiv: Du siehst die App als <strong data-ev-id="ev_9186919bc3">{effectiveProfile.full_name}</strong> ({effectiveProfile.role})
        </div>
      }
      
      {/* Header - Pill Navigation Design */}
      <header data-ev-id="ev_2fdda3c345" className="bg-primary sticky top-0 z-50">
        <div data-ev-id="ev_e1a903d350" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div data-ev-id="ev_8e6765a6d3" className="flex items-center justify-between min-h-16 py-2">
            {/* Logo */}
            <Link to="/" className="flex items-center flex-shrink-0 relative z-[100] group">
              <div
                data-ev-id="ev_f9cb603a07"
                className="bg-white rounded p-1 flex items-center justify-center transition-all duration-300 group-hover:scale-110">


                <img data-ev-id="ev_c8aa1e1c20"
                src={logoImage}
                alt="BANF System Logo"
                className="h-10 w-auto block"
                style={{ maxHeight: '40px' }} />
              </div>
            </Link>

            {/* Desktop Navigation - Favoriten + Alle Module Button */}
            <nav data-ev-id="ev_3697895821" className="hidden md:flex items-center justify-center gap-2 flex-1 mx-4">
              {/* Favoriten-Items */}
              {favoriteItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                    isActive ?
                    'text-primary scale-105' :
                    'text-white/70 hover:text-white hover:bg-white/15 hover:scale-103'}`
                    }
                    style={{
                      background: isActive ? 'linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)' : 'transparent',
                      boxShadow: isActive ? '0 4px 20px rgba(255,255,255,0.4), 0 0 30px rgba(200,16,46,0.4)' : 'none'
                    }}>

                    <item.icon
                      className="w-4 h-4 transition-transform duration-300"
                      style={{
                        filter: isActive ? 'drop-shadow(0 2px 4px rgba(200,16,46,0.5))' : 'none'
                      }} />

                    {item.label}
                  </Link>);
              })}
              
              {/* Alle Module Button */}
              <button data-ev-id="ev_7ef86bd652"
              onClick={() => setShowMegaMenu(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap text-white/70 hover:text-white hover:bg-white/15 border border-white/20 hover:border-white/40">

                <Grid3X3 className="w-4 h-4" />
                Alle Module
              </button>
            </nav>

            {/* Rechte Icons */}
            <div data-ev-id="ev_9e89268558" className="flex items-center gap-3 flex-shrink-0">
              {/* Online Users Icon - only visible to authorized users */}
              {canViewOnlineUsers &&
              <Link
                to="/online-benutzer"
                className="relative p-2.5 rounded-full transition-all duration-300 hover:scale-110 hover:bg-white/10"
                title="Online Benutzer">
                  <Eye className="w-5 h-5 text-white/80" />
                </Link>
              }

              <Link
                to="/benachrichtigungen"
                className="relative p-2.5 rounded-full transition-all duration-300 hover:scale-110"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  boxShadow: unreadCount > 0 ? '0 0 20px rgba(250, 204, 21, 0.3)' : 'none'
                }}>
                <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-yellow-400' : 'text-white'}`} />
                {unreadCount > 0 &&
                <span
                  data-ev-id="ev_e476d11f9f"
                  className="absolute -top-0.5 -right-0.5 w-5 h-5 text-xs rounded-full flex items-center justify-center font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    color: '#78350f',
                    boxShadow: '0 0 15px rgba(251, 191, 36, 0.6)',
                    animation: 'pulse 2s infinite'
                  }}>

                    {unreadCount}
                  </span>
                }
              </Link>

              <div data-ev-id="ev_a1a6b9ed09" className="relative flex items-center gap-3 pl-4 border-l border-white/20">
                <button data-ev-id="ev_9d83b85575"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 hover:bg-white/10 rounded-lg px-2 py-1 transition-all duration-300">

                  <div data-ev-id="ev_fd463f5b57" className="text-right hidden sm:block">
                    <p data-ev-id="ev_e58b4d186d" className="text-sm font-medium text-white">
                      {profile?.full_name || profile?.email}
                    </p>
                    <span
                      data-ev-id="ev_6e3abd5aa0"
                      className="inline-block px-2 py-0.5 text-xs rounded-full font-medium"
                      style={{
                        background: 'linear-gradient(135deg, rgba(232,53,74,0.4) 0%, rgba(200,16,46,0.4) 100%)',
                        color: '#fff',
                        border: '1px solid rgba(232,53,74,0.6)'
                      }}>

                      {getRoleLabel(profile?.role || '')}
                    </span>
                    {profile?.functions && profile.functions.length > 0 &&
                    <div data-ev-id="ev_475515dd84" className="flex flex-col items-end gap-0.5 mt-1">
                        {profile.functions.map((funcName) => {
                        const func = functionOptions.find((f) => f.name === funcName);
                        return func ?
                        <span data-ev-id="ev_0c1fdb52a7"
                        key={funcName}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded bg-amber-100 text-amber-800">
                              <Briefcase className="w-2.5 h-2.5" />
                              {func.label}
                            </span> :
                        null;
                      })}
                      </div>
                    }
                  </div>
                  <ChevronDown className={`w-4 h-4 text-white/80 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>
                
                {/* User Dropdown Menu */}
                {showUserMenu &&
                <>
                    <div data-ev-id="ev_b2c6aabdf9" className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div data-ev-id="ev_c763518bae" className="absolute right-0 top-full mt-2 w-56 bg-card rounded-lg shadow-lg border border-border z-50 py-1">
                      {/* Persönliche Startseite */}
                      <div data-ev-id="ev_3d6981a33e" className="px-4 py-2">
                        <label data-ev-id="ev_ba1d1c1d9d" className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1.5">
                          <Home className="w-3.5 h-3.5" />
                          Pers. Startseite
                        </label>
                        <select data-ev-id="ev_b08fc684b6"
                      value={profile?.home_page || '/'}
                      onChange={(e) => saveHomePage(e.target.value)}
                      disabled={savingHomePage}
                      className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50">

                          {homePageOptions.map((option) =>
                        <option data-ev-id="ev_9f75747250" key={option.value} value={option.value}>
                              {option.label}
                            </option>
                        )}
                        </select>
                      </div>
                      <hr data-ev-id="ev_5914040b9d" className="my-1 border-border" />
                      <button data-ev-id="ev_981e3aa221"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowPasswordModal(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors">

                        <Key className="w-4 h-4" />
                        Passwort ändern
                      </button>
                      <button data-ev-id="ev_099a22fb97"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowPushModal(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors">

                        <Smartphone className="w-4 h-4" />
                        Push-Benachrichtigungen
                      </button>
                      <button data-ev-id="ev_56ee11d741"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowSubstituteModal(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                        <UserCheck className="w-4 h-4" />
                        Meine Vertretung
                        {profile?.is_absent &&
                      <span data-ev-id="ev_bbef5d96f3" className="ml-auto px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">Abwesend</span>
                      }
                      </button>
                      <hr data-ev-id="ev_0543e06721" className="my-1 border-border" />
                      <button data-ev-id="ev_055476637e"
                    onClick={() => {
                      setShowUserMenu(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-muted transition-colors">

                        <LogOut className="w-4 h-4" />
                        Abmelden
                      </button>
                    </div>
                  </>
                }
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation - Favoriten + Alle Module */}
        <nav data-ev-id="ev_8f4063402b" className="md:hidden border-t border-white/10 px-4 py-2 flex gap-2 overflow-x-auto">
          {/* Favoriten-Items */}
          {favoriteItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                isActive ?
                'text-primary' :
                'text-white/70 hover:bg-white/15'}`
                }
                style={{
                  background: isActive ? 'linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)' : 'transparent',
                  boxShadow: isActive ? '0 4px 15px rgba(255,255,255,0.3)' : 'none'
                }}>

                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>);
          })}
          
          {/* Alle Module Button */}
          <button data-ev-id="ev_41b5ef8385"
          onClick={() => setShowMegaMenu(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap text-white/70 hover:bg-white/15 border border-white/20">

            <Grid3X3 className="w-4 h-4" />
            Alle
          </button>
        </nav>
      </header>

      {/* MegaMenu Overlay */}
      <MegaMenu
        isOpen={showMegaMenu}
        onClose={() => setShowMegaMenu(false)}
        menuItems={navItems}
        favorites={menuFavorites}
        onToggleFavorite={toggleFavorite}
        onResetFavorites={resetMenuFavorites}
        onReorderFavorites={reorderFavorites}
        saving={savingFavorites} />


      {/* Password Change Modal */}
      {showPasswordModal &&
      <div data-ev-id="ev_5e26611e8f" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div data-ev-id="ev_fe412dcd41" className="bg-card rounded-xl border border-border p-6 w-full max-w-md">
            <div data-ev-id="ev_83f5e5769f" className="flex items-center justify-between mb-6">
              <h3 data-ev-id="ev_a07a4ce4ba" className="text-lg font-semibold text-foreground">Passwort ändern</h3>
              <button data-ev-id="ev_30b4118d7a"
            onClick={closePasswordModal}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">

                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordSuccess ?
          <div data-ev-id="ev_deab6ecda2" className="text-center py-8">
                <div data-ev-id="ev_8a1a512ba9" className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Key className="w-8 h-8 text-green-600" />
                </div>
                <p data-ev-id="ev_379cff93e7" className="text-lg font-medium text-foreground">Passwort erfolgreich geändert!</p>
              </div> :

          <form data-ev-id="ev_458300c477" onSubmit={handleChangePassword} className="flex flex-col gap-4">
                {passwordError &&
            <div data-ev-id="ev_7ff78d6772" className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                    {passwordError}
                  </div>
            }

                <div data-ev-id="ev_90ad6725a0">
                  <label data-ev-id="ev_ed326c7183" className="block text-sm font-medium text-foreground mb-1.5">
                    Neues Passwort *
                  </label>
                  <input data-ev-id="ev_08d10a9f04"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mindestens 6 Zeichen"
              className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              required
              minLength={6} />

                </div>

                <div data-ev-id="ev_c9ab8a9ab9">
                  <label data-ev-id="ev_1bd1904e93" className="block text-sm font-medium text-foreground mb-1.5">
                    Passwort bestätigen *
                  </label>
                  <input data-ev-id="ev_2011c6bdbb"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Passwort wiederholen"
              className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              required />

                </div>

                <div data-ev-id="ev_a83342e2c1" className="flex gap-3 mt-2">
                  <button data-ev-id="ev_c375c74802"
              type="button"
              onClick={closePasswordModal}
              className="flex-1 px-4 py-2.5 border border-input rounded-lg font-medium hover:bg-muted transition-colors">

                    Abbrechen
                  </button>
                  <button data-ev-id="ev_bf7ad7e86b"
              type="submit"
              disabled={passwordLoading}
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">

                    {passwordLoading ? 'Speichern...' : 'Passwort ändern'}
                  </button>
                </div>
              </form>
          }
          </div>
        </div>
      }

      {/* Push Notifications Modal */}
      {showPushModal &&
      <div data-ev-id="ev_4d749b1bcc" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div data-ev-id="ev_287a996081" className="bg-card rounded-xl border border-border p-6 w-full max-w-lg">
            <div data-ev-id="ev_dc9adcb399" className="flex items-center justify-between mb-6">
              <h3 data-ev-id="ev_889b7faeec" className="text-lg font-semibold text-foreground">Push-Benachrichtigungen</h3>
              <button data-ev-id="ev_32b1ca3674"
            onClick={() => setShowPushModal(false)}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">

                <X className="w-5 h-5" />
              </button>
            </div>
            
            {user && <PushNotificationSettings userId={user.id} />}
          </div>
        </div>
      }

      {/* Substitute/Absence Modal */}
      {showSubstituteModal && profile &&
      <SubstituteModal
        profile={profile}
        profiles={profiles}
        onClose={() => setShowSubstituteModal(false)}
        onUpdateSubstitute={async (substituteId) => {
          await updateSubstitute(profile.id, substituteId);
          await refetchProfile();
          refetchProfiles();
        }}
        onSetAbsence={async (data) => {
          await setAbsence(profile.id, data);
          await refetchProfile();
          refetchProfiles();
        }} />

      }

      {/* Main Content */}
      <main data-ev-id="ev_8563817ca6" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      
      {/* Sandbox Role Switcher */}
      <SandboxSwitcher />
      
      {/* Problem Report Button */}
      <ProblemReportButton />
    </div>);

}