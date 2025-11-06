import { Route, Routes, Navigate, Link } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
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
              <Link to="/">Inicio</Link>
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
              <Home />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
      </Routes>
    </div>
  );
}
