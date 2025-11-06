// Tipos mínimos derivados de docs/openapi/moodtune.yaml

export type SessionId = string;

// Auth / Login
export interface LoginRequest {
  email: string;
  password: string;
  device_info?: string;
  ip_hash?: string;
}

export interface LoginResponse {
  session_id: SessionId;
  user: {
    user_id: string;
    display_name?: string;
    email_hash?: string;
  };
}

// Health
export interface HealthResponse { status: 'ok' | 'error'; }

// Users
export interface User {
  user_id: string;
  display_name?: string;
  email_hash?: string;
  created_at: string;
  updated_at: string;
}
export interface UserCreate { display_name?: string; email_hash?: string; }
export interface UserUpdate { display_name?: string; email_hash?: string; }
export interface PaginatedUsers { items: User[]; limit: number; offset: number; }

// Sessions
export interface SessionCreate { user_id?: string; device_info?: string; ip_hash?: string; }
export interface SessionUpdate { user_id?: string; device_info?: string; ip_hash?: string; end?: boolean; ended_at?: string | null; }
export interface Session {
  session_id: SessionId;
  user_id?: string;
  device_info?: string;
  ip_hash?: string;
  started_at: string;
  ended_at?: string | null;
}
export interface PaginatedSessions { items: Session[]; limit: number; offset: number; }

// Inferences
export type Emotion = 'joy' | 'sadness' | 'anger';
export type Intention = 'maintain' | 'change';
export interface Inference {
  inference_id: string;
  session_id: string;
  emotion: Emotion;
  confidence: number;
  intention?: Intention;
  latency_ms?: number;
  model_version?: string;
  created_at: string;
}
export interface InferenceCreate {
  session_id: string;
  emotion: Emotion;
  confidence: number;
  intention?: Intention;
  latency_ms?: number;
  model_version?: string;
}
export interface InferenceUpdate {
  emotion?: Emotion;
  confidence?: number;
  intention?: Intention;
  latency_ms?: number;
  model_version?: string;
}
export interface PaginatedInferences { items: Inference[]; limit: number; offset: number; }

// Playlists
export type MusicProvider = 'spotify' | 'apple_music' | 'amazon_music';
export interface Playlist {
  playlist_id: string;
  user_id?: string;
  provider?: MusicProvider;
  external_playlist_id?: string;
  deep_link_url?: string;
  title?: string;
  description?: string;
  created_at: string;
}
export interface PlaylistCreate {
  user_id: string;
  provider: MusicProvider;
  external_playlist_id: string;
  deep_link_url: string;
  title?: string;
  description?: string;
}
export interface PlaylistUpdate {
  provider?: MusicProvider;
  external_playlist_id?: string;
  deep_link_url?: string;
  title?: string;
  description?: string;
}
export interface PaginatedPlaylists { items: Playlist[]; limit: number; offset: number; }

// Mood Map Rules
export interface MoodMapRule {
  rule_id: string;
  emotion: Emotion;
  intention: Intention;
  version?: number;
  params_json?: Record<string, unknown>;
  is_active?: boolean;
  valid_from?: string;
  valid_to?: string | null;
  created_at: string;
}
export interface MoodMapRuleCreate {
  emotion: Emotion;
  intention: Intention;
  version?: number;
  params_json: Record<string, unknown>;
  is_active?: boolean;
  valid_from?: string;
  valid_to?: string | null;
}
export interface MoodMapRuleUpdate extends Partial<MoodMapRuleCreate> {}
export interface PaginatedMoodMapRules { items: MoodMapRule[]; limit: number; offset: number; }

// Audit Logs
export type ActorType = 'system' | 'user';
export interface AuditLog {
  audit_id: number;
  actor_type: ActorType;
  actor_id?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  payload_json?: Record<string, unknown> | null;
  created_at: string;
}
export interface AuditLogCreate {
  actor_type: ActorType;
  actor_id?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  payload_json?: Record<string, unknown> | null;
}
export interface AuditLogUpdate extends Partial<AuditLogCreate> {}
export interface PaginatedAuditLogs { items: AuditLog[]; limit: number; offset: number; }

// OAuth Tokens
export interface OAuthToken {
  token_id: string;
  user_id: string;
  provider: MusicProvider;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}
export interface OAuthTokenUpsert {
  token_id?: string;
  user_id: string;
  provider: MusicProvider;
  access_cipher_b64: string;
  refresh_cipher_b64?: string | null;
  expires_at?: string | null;
}
export interface OAuthTokenUpdate {
  provider?: MusicProvider;
  access_cipher_b64?: string;
  refresh_cipher_b64?: string | null;
  expires_at?: string | null;
}
export interface PaginatedOAuthTokens { items: OAuthToken[]; limit: number; offset: number; }

// Genéricos
export interface UpdateAck { updated: boolean; id?: string }
export interface DeleteAck { deleted: boolean; id?: string }

