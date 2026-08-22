/**
 * ⚠️ ROUTING RULES:
 * - Define all routes here using <Routes> and <Route>
 * - NEVER use useRoutes() - not supported
 * - NEVER use React.lazy() - static imports only
 * - <BrowserRouter> is in main.tsx - don't add another one
 */
import { Routes, Route, Navigate, useParams } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';

import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Index from '@/pages/Index';
import Orders from '@/pages/Orders';
import NewOrder from '@/pages/NewOrder';
import OrderDetail from '@/pages/OrderDetail';
import Suppliers from '@/pages/Suppliers';
import SettingsNew from '@/pages/SettingsNew';
import Notifications from '@/pages/Notifications';
import UserManagement from '@/pages/UserManagement';
import OnlineUsers from '@/pages/OnlineUsers';
import Tasks from '@/pages/Tasks';
import KassierOverview from '@/pages/KassierOverview';
import VotingDemo from '@/pages/VotingDemo';
import Anleitung from '@/pages/Anleitung';
import Antragsformulare from '@/pages/Antragsformulare';
import MenuDemo from '@/pages/MenuDemo';
import IdeasPool from '@/pages/IdeasPool';
import DashboardDemo from '@/pages/DashboardDemo';
import Kommandobeschluesse from '@/pages/Kommandobeschluesse';
import Sitzungen from '@/pages/Sitzungen';
import SitzungDetail from '@/pages/SitzungDetail';
import Dokumentation from '@/pages/Dokumentation';
import Beschluesse from '@/pages/Beschluesse';
import MockupPreview from '@/pages/MockupPreview';
import SettingsMockup from '@/pages/SettingsMockup';
import TrainingPlan from '@/pages/TrainingPlan';


// Redirect component for old /order/:id links
function RedirectToBestellung() {
  const { id } = useParams();
  return <Navigate to={`/bestellungen/${id}`} replace />;
}

function ProtectedRoute({ children }: {children: React.ReactNode;}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div data-ev-id="ev_14f4998d1b" className="min-h-screen flex items-center justify-center bg-background">
        <div data-ev-id="ev_fcf4110d73" className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>);

  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Route that requires full access (not limited users)
function FullAccessRoute({ children }: {children: React.ReactNode;}) {
  const { user, loading, hasLimitedAccess } = useAuth();

  if (loading) {
    return (
      <div data-ev-id="ev_4e83015417" className="min-h-screen flex items-center justify-center bg-background">
        <div data-ev-id="ev_7893a60f5d" className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>);

  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Limited access users cannot access this route
  if (hasLimitedAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div data-ev-id="ev_bca7178952" className="min-h-screen flex items-center justify-center bg-background">
        <div data-ev-id="ev_4ebd9cf81d" className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>);

  }

  // Persönliche Startseite des Benutzers oder Standard
  const homePage = profile?.home_page || '/';

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homePage} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={homePage} replace /> : <Register />} />
      <Route path="/registrieren" element={user ? <Navigate to={homePage} replace /> : <Register />} />
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      {/* Routes requiring full access */}
      <Route path="/bestellungen" element={<FullAccessRoute><Orders /></FullAccessRoute>} />
      <Route path="/bestellungen/neu" element={<FullAccessRoute><NewOrder /></FullAccessRoute>} />
      <Route path="/bestellungen/:id" element={<FullAccessRoute><OrderDetail /></FullAccessRoute>} />
      {/* Redirect old /order/:id links to /bestellungen/:id */}
      <Route path="/order/:id" element={<RedirectToBestellung />} />
      <Route path="/lieferanten" element={<FullAccessRoute><Suppliers /></FullAccessRoute>} />
      <Route path="/aufgaben" element={<FullAccessRoute><Tasks /></FullAccessRoute>} />
      <Route path="/einstellungen" element={<FullAccessRoute><SettingsNew /></FullAccessRoute>} />
      <Route path="/benachrichtigungen" element={<FullAccessRoute><Notifications /></FullAccessRoute>} />
      <Route path="/benutzer" element={<FullAccessRoute><UserManagement /></FullAccessRoute>} />
      <Route path="/online-benutzer" element={<FullAccessRoute><OnlineUsers /></FullAccessRoute>} />
      <Route path="/kassier" element={<FullAccessRoute><KassierOverview /></FullAccessRoute>} />
      <Route path="/kommandobeschluesse" element={<FullAccessRoute><Kommandobeschluesse /></FullAccessRoute>} />
      <Route path="/beschluesse" element={<ProtectedRoute><Beschluesse /></ProtectedRoute>} />
      <Route path="/sitzungen" element={<FullAccessRoute><Sitzungen /></FullAccessRoute>} />
      <Route path="/sitzungen/:id" element={<FullAccessRoute><SitzungDetail /></FullAccessRoute>} />
      <Route path="/voting-demo" element={<FullAccessRoute><VotingDemo /></FullAccessRoute>} />
      <Route path="/menu-demo" element={<FullAccessRoute><MenuDemo /></FullAccessRoute>} />
      <Route path="/dashboard-demo" element={<FullAccessRoute><DashboardDemo /></FullAccessRoute>} />
      {/* Routes accessible for all users (including limited access) */}
      <Route path="/antragsformulare" element={<ProtectedRoute><Antragsformulare /></ProtectedRoute>} />
      <Route path="/anleitung" element={<ProtectedRoute><Anleitung /></ProtectedRoute>} />
      <Route path="/ideen" element={<ProtectedRoute><IdeasPool /></ProtectedRoute>} />
      <Route path="/dokumentation" element={<ProtectedRoute><Dokumentation /></ProtectedRoute>} />
      <Route path="/mockup-preview" element={<ProtectedRoute><MockupPreview /></ProtectedRoute>} />
      <Route path="/settings-mockup" element={<ProtectedRoute><SettingsMockup /></ProtectedRoute>} />
      <Route path="/uebungsplan" element={<ProtectedRoute><TrainingPlan /></ProtectedRoute>} />
    </Routes>);

}