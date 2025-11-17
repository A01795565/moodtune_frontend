import { useAuth } from '../hooks/useAuth';

// Página protegida simple que muestra información básica de la sesión.
export default function Home() {
  const { user, sessionId } = useAuth();

  return (
    <div>
      <h2>Bienvenido</h2>
      {user ? (
        <div style={{ lineHeight: 1.8 }}>
          <div><strong>Usuario:</strong> {user.display_name || user.user_id}</div>
          <div><strong>Hash de email:</strong> {user.email_hash}</div>
          <div><strong>Sesión:</strong> {sessionId}</div>
        </div>
      ) : (
        <div>Sin usuario cargado</div>
      )}
      <p style={{ color: 'var(--muted)', marginTop: 12 }}>
        Estás autenticado. Usa el botón Logout en el encabezado para cerrar la sesión (/sessions/{'{'}session_id{'}'}).
      </p>
    </div>
  );
}
