import type {
  LoginRequest,
  LoginResponse,
  HealthResponse,
  // Users
  User, UserCreate, UserUpdate, PaginatedUsers,
  // Sessions
  Session, SessionCreate as SessionCreateRequest, SessionUpdate, PaginatedSessions,
  // Inferences
  Inference, InferenceCreate, InferenceUpdate, PaginatedInferences,
  // Playlists
  Playlist, PlaylistCreate, PlaylistUpdate, PaginatedPlaylists,
  // Mood Map Rules
  MoodMapRule, MoodMapRuleCreate, MoodMapRuleUpdate, PaginatedMoodMapRules,
  // Audit Logs
  AuditLog, AuditLogCreate, AuditLogUpdate, PaginatedAuditLogs,
  // OAuth
  OAuthToken, OAuthTokenUpsert, OAuthTokenUpdate, PaginatedOAuthTokens, ValidTokenResponse,
  // Acks
  UpdateAck, DeleteAck,
} from '../types/api';

// Cliente HTTP simple para consumir los endpoints del API de MoodTune.
// Se apoya en una URL base definida vía variable de entorno de Vite y,
// en desarrollo, utiliza un proxy para evitar problemas de CORS.
const RAW_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
// Usar el proxy SOLO en desarrollo (Vite dev server). En producción usar la URL base real.
const BASE_URL = import.meta.env.DEV ? '/api-proxy' : RAW_BASE;

function authHeaders(): Record<string, string> {
  // Preferir token explícito de entorno si existe
  const explicit = (import.meta as any).env?.VITE_API_BEARER_TOKEN as string | undefined;
  if (explicit) return { Authorization: `Bearer ${explicit}` };
  // Como fallback, usar el session_id como bearer si existe en localStorage
  try {
    const raw = localStorage.getItem('moodtune_auth_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.sessionId) return { Authorization: `Bearer ${parsed.sessionId}` };
    }
  } catch {}
  return {};
}

// Pequeño envoltorio para fetch que maneja JSON y errores básicos.
async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    // Intentar extraer mensaje JSON del backend para mostrar acentos correctamente
    try {
      const data = await res.json();
      const msg = typeof (data as any)?.error === 'string' ? (data as any).error : undefined;
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
  // HEALTH
  health: () => http<HealthResponse>('/health'),

  // SESSIONS
  // POST /sessions/login (público)
  login: (body: LoginRequest) => http<LoginResponse>('/sessions/login', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  // POST /sessions (según el spec puede requerir JWT)
  createSession: (body: SessionCreateRequest) =>
    http<Session>('/sessions', { method: 'POST', body: JSON.stringify(body) }),
  // DELETE /sessions/{sessionId}
  deleteSession: (sessionId: string) =>
    http<DeleteAck>(`/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }),
  listSessions: (params?: { limit?: number; offset?: number }) =>
    http<PaginatedSessions>(`/sessions?${new URLSearchParams({
      limit: String(params?.limit ?? 20),
      offset: String(params?.offset ?? 0),
    })}`),
  getSession: (sessionId: string) => http<Session>(`/sessions/${encodeURIComponent(sessionId)}`),
  patchSession: (sessionId: string, body: SessionUpdate) =>
    http<UpdateAck>(`/sessions/${encodeURIComponent(sessionId)}`, { method: 'PATCH', body: JSON.stringify(body) }),

  // USERS
  createUser: (body: UserCreate) => http<User>('/users', { method: 'POST', body: JSON.stringify(body) }),
  listUsers: (params?: { limit?: number; offset?: number }) =>
    http<PaginatedUsers>(`/users?${new URLSearchParams({
      limit: String(params?.limit ?? 20),
      offset: String(params?.offset ?? 0),
    })}`),
  getUser: (userId: string) => http<User>(`/users/${encodeURIComponent(userId)}`),
  patchUser: (userId: string, body: UserUpdate) =>
    http<UpdateAck>(`/users/${encodeURIComponent(userId)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteUser: (userId: string) => http<DeleteAck>(`/users/${encodeURIComponent(userId)}`, { method: 'DELETE' }),

  // INFERENCES
  createInference: (body: InferenceCreate) => http<Inference>('/inferences', { method: 'POST', body: JSON.stringify(body) }),
  listInferences: (params?: { limit?: number; offset?: number; session_id?: string }) => {
    const qs = new URLSearchParams({
      limit: String(params?.limit ?? 20),
      offset: String(params?.offset ?? 0),
      ...(params?.session_id ? { session_id: params.session_id } : {}),
    });
    return http<PaginatedInferences>(`/inferences?${qs}`);
  },
  getInference: (id: string) => http<Inference>(`/inferences/${encodeURIComponent(id)}`),
  patchInference: (id: string, body: InferenceUpdate) =>
    http<UpdateAck>(`/inferences/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteInference: (id: string) => http<DeleteAck>(`/inferences/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // PLAYLISTS
  createPlaylist: (body: PlaylistCreate) => http<Playlist>('/playlists', { method: 'POST', body: JSON.stringify(body) }),
  listPlaylists: (params?: { limit?: number; offset?: number; user_id?: string }) => {
    const qs = new URLSearchParams({
      limit: String(params?.limit ?? 20),
      offset: String(params?.offset ?? 0),
      ...(params?.user_id ? { user_id: params.user_id } : {}),
    });
    return http<PaginatedPlaylists>(`/playlists?${qs}`);
  },
  getPlaylist: (id: string) => http<Playlist>(`/playlists/${encodeURIComponent(id)}`),
  patchPlaylist: (id: string, body: PlaylistUpdate) =>
    http<UpdateAck>(`/playlists/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deletePlaylist: (id: string) => http<DeleteAck>(`/playlists/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // MOOD MAP RULES
  createMoodMapRule: (body: MoodMapRuleCreate) => http<MoodMapRule>('/mood-map-rules', { method: 'POST', body: JSON.stringify(body) }),
  listMoodMapRules: (params?: { limit?: number; offset?: number; emotion?: string; intention?: string }) => {
    const qs = new URLSearchParams({
      limit: String(params?.limit ?? 20),
      offset: String(params?.offset ?? 0),
      ...(params?.emotion ? { emotion: params.emotion } : {}),
      ...(params?.intention ? { intention: params.intention } : {}),
    });
    return http<PaginatedMoodMapRules>(`/mood-map-rules?${qs}`);
  },
  getMoodMapRule: (id: string) => http<MoodMapRule>(`/mood-map-rules/${encodeURIComponent(id)}`),
  patchMoodMapRule: (id: string, body: MoodMapRuleUpdate) =>
    http<UpdateAck>(`/mood-map-rules/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteMoodMapRule: (id: string) => http<DeleteAck>(`/mood-map-rules/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // AUDIT LOGS
  createAuditLog: (body: AuditLogCreate) => http<AuditLog>('/audit-logs', { method: 'POST', body: JSON.stringify(body) }),
  listAuditLogs: (params?: { limit?: number; offset?: number }) =>
    http<PaginatedAuditLogs>(`/audit-logs?${new URLSearchParams({
      limit: String(params?.limit ?? 20),
      offset: String(params?.offset ?? 0),
    })}`),
  getAuditLog: (id: number | string) => http<AuditLog>(`/audit-logs/${encodeURIComponent(String(id))}`),
  patchAuditLog: (id: number | string, body: AuditLogUpdate) =>
    http<UpdateAck>(`/audit-logs/${encodeURIComponent(String(id))}`, { method: 'PATCH', body: JSON.stringify(body) }),

  // OAUTH TOKENS
  upsertOAuthToken: (body: OAuthTokenUpsert) => http<OAuthToken>('/oauth-tokens', { method: 'POST', body: JSON.stringify(body) }),
  listOAuthTokens: (params?: { limit?: number; offset?: number; user_id?: string; provider?: string }) => {
    const qs = new URLSearchParams({
      limit: String(params?.limit ?? 20),
      offset: String(params?.offset ?? 0),
      ...(params?.user_id ? { user_id: params.user_id } : {}),
      ...(params?.provider ? { provider: params.provider } : {}),
    });
    return http<PaginatedOAuthTokens>(`/oauth-tokens?${qs}`);
  },
  getOAuthToken: (id: string) => http<OAuthToken>(`/oauth-tokens/${encodeURIComponent(id)}`),
  patchOAuthToken: (id: string, body: OAuthTokenUpdate) =>
    http<UpdateAck>(`/oauth-tokens/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteOAuthToken: (id: string) => http<DeleteAck>(`/oauth-tokens/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  // Get valid token with automatic refresh (backend-managed)
  getValidToken: (userId: string, provider: string) =>
    http<ValidTokenResponse>(`/oauth-tokens/valid/${encodeURIComponent(userId)}/${encodeURIComponent(provider)}`),
};
