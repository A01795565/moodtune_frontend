import type { LoginRequest, LoginResponse, Session, SessionCreateRequest } from '../types/api';

// Cliente HTTP simple para consumir los endpoints del API de MoodTune.
// Se apoya en una URL base definida vía variable de entorno de Vite y,
// en desarrollo, utiliza un proxy para evitar problemas de CORS.
const RAW_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
// Usar el proxy SOLO en desarrollo (Vite dev server). En producción usar la URL base real.
const BASE_URL = import.meta.env.DEV ? '/api-proxy' : RAW_BASE;

// Pequeño envoltorio para fetch que maneja JSON y errores básicos.
async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    // Intentar extraer mensaje JSON del backend para mostrar acentos correctamente
    try {
      const data = await res.json();
      const msg = typeof data?.error === 'string' ? data.error : undefined;
      throw new Error(msg || `${res.status} ${res.statusText}`);
    } catch (_) {
      const msg = await res.text().catch(() => '');
      throw new Error(msg || `${res.status} ${res.statusText}`);
    }
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export const api = {
  // POST /sessions/login (público)
  login: (body: LoginRequest) => http<LoginResponse>('/sessions/login', {
    method: 'POST',
    body: JSON.stringify(body),
  }),

  // POST /sessions (según el spec puede requerir JWT; se intenta y se ignora si falla)
  createSession: (body: SessionCreateRequest) =>
    http<Session>('/sessions', { method: 'POST', body: JSON.stringify(body) }),

  // DELETE /sessions/{sessionId} (cierre de sesión)
  deleteSession: (sessionId: string) =>
    http<{ deleted: boolean; id?: string }>(`/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    }),
};
