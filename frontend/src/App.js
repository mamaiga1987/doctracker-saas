import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage        from './pages/LandingPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import DashboardLayout    from './pages/DashboardLayout';
import DashboardHome      from './pages/DashboardHome';
import DocumentsPage      from './pages/DocumentsPage';
import MembersPage        from './pages/MembersPage';
import AlertsPage         from './pages/AlertsPage';
import EventsPage         from './pages/EventsPage';
import DevicesPage        from './pages/DevicesPage';
import SettingsPage       from './pages/SettingsPage';
import RiskPage           from './pages/RiskPage';
import MapPage            from './pages/MapPage';
import LivePage           from './pages/LivePage';
import HeatmapPage        from './pages/HeatmapPage';
import AICenterPage       from './pages/AICenterPage';
import NotificationsPage  from './pages/NotificationsPage';
import SessionsPage       from './pages/SessionsPage';
import ImportPage         from './pages/ImportPage';
import BehaviorPage       from './pages/BehaviorPage';
import NotifyPage         from './pages/NotifyPage';
import ViewerPage         from './pages/ViewerPage';
import ViewerPageV2       from './pages/ViewerPageV2';
import SendLinksPage      from './pages/SendLinksPage';
import { AlertsPage as AlertsExtraPage, EventsPage as EventsExtraPage, SharesPage, TeamPage } from './pages/ExtraPages';
import { HistoryPage, LiveSessionPage, SuspiciousPage, RiskScorePage } from './pages/AdvancedPages';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#9ca3af',fontFamily:'sans-serif'}}>Chargement...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

          {/* Viewer */}
          <Route path="/view/:token"  element={<ViewerPage />} />
          <Route path="/view2/:token" element={<ViewerPageV2 />} />

          {/* Dashboard - routes sans /dashboard prefix comme l'original */}
          <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
            <Route index              element={<DashboardHome />} />
            <Route path="documents"   element={<DocumentsPage />} />
            <Route path="members"     element={<MembersPage />} />
            <Route path="alerts"      element={<AlertsPage />} />
            <Route path="events"      element={<EventsPage />} />
            <Route path="devices"     element={<DevicesPage />} />
            <Route path="settings"    element={<SettingsPage />} />
            <Route path="risk"        element={<RiskPage />} />
            <Route path="map"         element={<MapPage />} />
            <Route path="live"        element={<LivePage />} />
            <Route path="heatmap"     element={<HeatmapPage />} />
            <Route path="ai-center"   element={<AICenterPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="sessions"    element={<SessionsPage />} />
            <Route path="import"      element={<ImportPage />} />
            <Route path="behavior"    element={<BehaviorPage />} />
            <Route path="notify"      element={<NotifyPage />} />
            <Route path="send"        element={<SendLinksPage />} />
            <Route path="shares"      element={<SharesPage />} />
            <Route path="team"        element={<TeamPage />} />
            <Route path="history"     element={<HistoryPage />} />
            <Route path="suspicious"  element={<SuspiciousPage />} />
          </Route>

          {/* Landing page séparée */}
          <Route path="/landing" element={<LandingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
