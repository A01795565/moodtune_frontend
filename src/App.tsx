import { Route, Routes, Navigate, Link } from 'react-router-dom';
import Login from './pages/Login';
import Main from './pages/Main';
import Health from './pages/Health';
import DetectEmotion from './pages/DetectEmotion';
import Users from './pages/Users';
import Sessions from './pages/Sessions';
import Inferences from './pages/Inferences';
import Playlists from './pages/Playlists';
import MoodMapRules from './pages/MoodMapRules';
import AuditLogs from './pages/AuditLogs';
import OAuthTokens from './pages/OAuthTokens';
import Admin from './pages/Admin';
import { useAuth } from './hooks/useAuth';

// Componente de ruta protegida: redirige a /login si no hay autenticación.
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const { isAuthenticated, logout } = useAuth();
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link to="/" style={{ textDecoration: 'none', color: '#222', fontWeight: 700 }}>MoodTune</Link>
        <nav style={{ display: 'flex', gap: 10 }}>
          {isAuthenticated ? (
            <>
              <Link to="/">Main</Link>
              <Link to="/detect">Detect</Link>
              <Link to="/admin">Admin</Link>
              <button onClick={logout} style={{ padding: '6px 10px' }}>Logout</button>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </nav>
      </header>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Main />
            </ProtectedRoute>
          }
        />
        <Route path="/health" element={<ProtectedRoute><Health /></ProtectedRoute>} />
        <Route path="/detect" element={<ProtectedRoute><DetectEmotion /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
        <Route path="/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
        <Route path="/inferences" element={<ProtectedRoute><Inferences /></ProtectedRoute>} />
        <Route path="/playlists" element={<ProtectedRoute><Playlists /></ProtectedRoute>} />
        <Route path="/mood-map-rules" element={<ProtectedRoute><MoodMapRules /></ProtectedRoute>} />
        <Route path="/audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
        <Route path="/oauth-tokens" element={<ProtectedRoute><OAuthTokens /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
      </Routes>
    </div>
  );
}
