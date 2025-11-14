import { FormEvent, SetStateAction, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

import './Login.css';
import AppAlert from '../components/AppAlert';
import AppButton from '../components/AppButton';
import { AppInput, PasswordInput } from '../components/AppInput';
import AppCard from '../components/AppCard';

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
    <main className="auth">
      <div className="auth__bg" aria-hidden />
      <AppCard
        title="Iniciar sesión"
        subtitle="Accede con tu correo y contraseña"
        footerSlot={
          <div className="page-hint">
            Utiliza <code>/sessions/login</code> definido en <code>docs/openapi/moodtune.yaml</code>
          </div>
        }
      >
        {error && <AppAlert tone="error">{error}</AppAlert>}

        <form onSubmit={onSubmit} noValidate>
          <div style={{ display: 'grid', gap: 14 }}>
            <AppInput
              label="Email"
              type="email"
              placeholder="usuario@ejemplo.com"
              value={email}
              onChange={(e: { target: { value: SetStateAction<string>; }; }) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <PasswordInput
              label="Contraseña"
              value={password}
              onChange={(e: { target: { value: SetStateAction<string>; }; }) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <AppButton type="submit" variant="primary" loading={loggingIn} disabled={loggingIn} fullWidth>
              Ingresar
            </AppButton>
          </div>
        </form>
      </AppCard>
    </main>
  );
}
