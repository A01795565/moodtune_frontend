import { useEffect, useState } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Main from './pages/Main';
import Health from './pages/Health';
import DetectEmotion from './pages/DetectEmotion';
import ExploreRag from './pages/ExploreRag';
import Users from './pages/Users';
import Sessions from './pages/Sessions';
import Inferences from './pages/Inferences';
import Playlists from './pages/Playlists';
import UserPlaylists from './pages/UserPlaylists';
import CreateSpotifyPlaylist from './pages/CreateSpotifyPlaylist';
import ConnectSpotify from './pages/ConnectSpotify';
import MoodMapRules from './pages/MoodMapRules';
import AuditLogs from './pages/AuditLogs';
import OAuthTokens from './pages/OAuthTokens';
import Admin from './pages/Admin';
import { useAuth } from './hooks/useAuth';

import AppNavBar from './components/AppNavBar';
import { applyThemeToDocument, getInitialTheme, persistTheme, ThemeMode } from './utils/theme';

import './App.css';

// Componente de ruta protegida: redirige a /login si no hay autenticación.
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, loading } = useAuth();
  // Mientras está cargando, no redirigimos para evitar race condition
  if (loading) return null; // o <div>Cargando...</div> si prefieres mostrar algo
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const rawAuth = useAuth();
  const { isAuthenticated, loading } = rawAuth;
  // Solo consideramos autenticado cuando terminó de cargar
  const authed = !loading && isAuthenticated;

  useEffect(() => {
    applyThemeToDocument(theme);
    persistTheme(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="app">
      <AppNavBar
        brand="MoodTune"
        theme={theme}
        isAuthenticated={authed}
        onLogout={rawAuth.logout}
        onToggleTheme={handleToggleTheme}
        authedItems={[
          { to: '/detect', label: 'Detect' },
          { to: '/my-playlists', label: 'Mis Playlists' },
          { to: '/create-playlist', label: 'Crear Playlist' },
          { to: '/explore', label: 'Explorar' },
          { to: '/connect-spotify', label: 'Conectar Spotify' },
          { to: '/admin', label: 'Admin' },
        ]}
        publicItems={[{ to: '/login', label: 'Login' }]}
      />

      <main className="app__content">
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
          <Route path="/explore" element={<ProtectedRoute><ExploreRag /></ProtectedRoute>} />
          <Route path="/my-playlists" element={<ProtectedRoute><UserPlaylists /></ProtectedRoute>} />
          <Route path="/create-playlist" element={<ProtectedRoute><CreateSpotifyPlaylist /></ProtectedRoute>} />
          <Route path="/connect-spotify" element={<ProtectedRoute><ConnectSpotify /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
          <Route path="/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
          <Route path="/inferences" element={<ProtectedRoute><Inferences /></ProtectedRoute>} />
          <Route path="/playlists" element={<ProtectedRoute><Playlists /></ProtectedRoute>} />
          <Route path="/mood-map-rules" element={<ProtectedRoute><MoodMapRules /></ProtectedRoute>} />
          <Route path="/audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
          <Route path="/oauth-tokens" element={<ProtectedRoute><OAuthTokens /></ProtectedRoute>} />

          <Route path="*" element={loading ? null : <Navigate to={authed ? '/' : '/login'} replace />} />
        </Routes>
      </main>
    </div>
  );
}
