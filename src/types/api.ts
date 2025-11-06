// Tipos mínimos derivados de docs/openapi/moodtune.yaml para Sesiones

export type SessionId = string;

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

export interface SessionCreateRequest {
  user_id?: string;
  device_info?: string;
  ip_hash?: string;
}

export interface Session {
  session_id: SessionId;
  user_id?: string;
  device_info?: string;
  ip_hash?: string;
  started_at: string;
  ended_at?: string | null;
}
