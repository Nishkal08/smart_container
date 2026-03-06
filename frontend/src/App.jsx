import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { useEffect } from 'react';

// Layouts
import MainLayout from './components/layout/MainLayout';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import Dashboard from './pages/dashboard';
import Containers from './pages/containers';
import Insights from './pages/insights';
import Jobs from './pages/jobs';
import UploadData from './pages/upload';
import AdminSettings from './pages/admin';
import Predictions from './pages/predictions';
import ContainerDetail from './pages/containers/detail';

// Protected Route Wrapper
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

// RBAC Route Guard
function RoleRoute({ roles, children }) {
  const user = useAuthStore((state) => state.user);
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}

function App() {
  const initTheme = useThemeStore((state) => state.initTheme);
  useEffect(() => { initTheme(); }, [initTheme]);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="containers" element={<Containers />} />
          <Route path="containers/:id" element={<ContainerDetail />} />
          <Route path="predictions" element={<Predictions />} />
          <Route path="insights" element={<Insights />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="upload" element={
            <RoleRoute roles={['ADMIN', 'ANALYST']}>
              <UploadData />
            </RoleRoute>
          } />
          <Route path="admin" element={
            <RoleRoute roles={['ADMIN']}>
              <AdminSettings />
            </RoleRoute>
          } />
        </Route>

        {/* Fallback routing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
