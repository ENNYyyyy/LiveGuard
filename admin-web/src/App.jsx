import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AgenciesPage from './pages/AgenciesPage';
import AgencyFormPage from './pages/AgencyFormPage';
import AgencyDetailPage from './pages/AgencyDetailPage';
import AlertsPage from './pages/AlertsPage';
import AlertDetailPage from './pages/AlertDetailPage';
import UsersPage from './pages/UsersPage';
import NotificationsPage from './pages/NotificationsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

const App = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/agencies" element={<ProtectedRoute><AgenciesPage /></ProtectedRoute>} />
      <Route path="/agencies/new" element={<ProtectedRoute><AgencyFormPage /></ProtectedRoute>} />
      <Route path="/agencies/:agencyId" element={<ProtectedRoute><AgencyDetailPage /></ProtectedRoute>} />
      <Route path="/agencies/:agencyId/edit" element={<ProtectedRoute><AgencyFormPage /></ProtectedRoute>} />
      <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
      <Route path="/alerts/:alertId" element={<ProtectedRoute><AlertDetailPage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

      <Route
        path="*"
        element={<Navigate replace to={isAuthenticated ? '/dashboard' : '/login'} />}
      />
    </Routes>
  );
};

export default App;
