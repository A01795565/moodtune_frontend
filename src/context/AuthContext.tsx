import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { LoginRequest, LoginResponse } from '../types/api';

// Tipos derivados de la respuesta de login del API.
type UserInfo = LoginResponse['user'];

// Firma del contexto de autenticación a exponer a la app.
type AuthContextValue = {
  isAuthenticated: boolean;
  user: UserInfo | null;
  sessionId: string | null;
  loggingIn: boolean;
  login: (params: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'moodtune_auth_v1';

// Proveedor de autenticación: gestiona estado, persistencia simple y navegación.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Hidrata estado desde localStorage al cargar la app.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setUser(parsed.user ?? null);
        setSessionId(parsed.sessionId ?? null);
      }
    } catch {}
  }, []);

  // Persiste estado mínimo de auth para mantener sesión tras recarga.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user, sessionId })
      );
    } catch {}
  }, [user, sessionId]);

  // Inicia sesión llamando al endpoint público /sessions/login
  const login = useCallback(async ({ email, password }: LoginRequest) => {
    setLoggingIn(true);
    try {
      const device_info = `${navigator.userAgent}`.slice(0, 180);
      const ip_hash = undefined; // Opcional: calcular hash del IP en cliente.
      const res = await api.login({ email, password, device_info, ip_hash });
      setUser(res.user);
      setSessionId(res.session_id);
      // Nota: /sessions/login ya crea una sesión en el backend.
      // No es necesario invocar POST /sessions adicionalmente.
      navigate('/', { replace: true });
    } finally {
      setLoggingIn(false);
    }
  }, [navigate]);

  // Cierra sesión borrando estado local y notificando al backend.
  const logout = useCallback(async () => {
    const sid = sessionId;
    setUser(null);
    setSessionId(null);
    try {
      if (sid) {
        await api.deleteSession(sid);
      }
    } catch {
      // Ignorar errores en logout; el estado local ya se limpió.
    } finally {
      navigate('/login', { replace: true });
    }
  }, [navigate, sessionId]);

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated: !!sessionId, user, sessionId, loggingIn, login, logout }),
    [sessionId, user, loggingIn, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
