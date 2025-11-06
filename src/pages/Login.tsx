import { FormEvent, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

// Página de inicio de sesión: consume POST /sessions/login
export default function Login() {
  const { login, loggingIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login({ email, password });
    } catch (err: any) {
      setError(err?.message || 'No se pudo iniciar sesión');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '64px auto' }}>
      <h2>Iniciar sesión</h2>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          <div>Email</div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="usuario@ejemplo.com"
            style={{ width: '100%', padding: 8 }}
          />
        </label>
        <label>
          <div>Contraseña</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </label>
        <button type="submit" disabled={loggingIn} style={{ padding: '8px 12px' }}>
          {loggingIn ? 'Ingresando…' : 'Ingresar'}
        </button>
        {error && <div style={{ color: 'crimson' }}>{error}</div>}
      </form>
      <p style={{ color: '#666', marginTop: 12 }}>
        Utiliza /sessions/login definido en docs/openapi/moodtune.yaml
      </p>
    </div>
  );
}
