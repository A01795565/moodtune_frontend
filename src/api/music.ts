// Cliente ligero para el servicio moodtune_music encargado de crear playlists
// directamente en el proveedor (Spotify, Apple Music, etc.).

export type MusicPlaylistCreate = {
  provider?: string;
  provider_access_token?: string;
  title: string;
  description?: string;
  uris: string[];
};

export type MusicPlaylistResponse = {
  provider: string;
  external_playlist_id: string;
  deep_link_url: string;
  title: string;
  description?: string;
  tracks_added: number;
};

export type MoodtunePlaylistCreate = MusicPlaylistCreate & {
  user_id?: string;
  inference_id?: string;
  intention?: string;
  emotion?: string;
};

export type MusicPlaylistTrack = {
  id?: string;
  uri?: string;
  title?: string;
  artist?: string;
  album?: string;
  duration_ms?: number;
  preview_url?: string;
  image_url?: string;
  external_urls?: Record<string, string>;
  added_at?: string;
};

export type MusicPlaylistDetails = {
  provider: string;
  playlist_id: string;
  title?: string;
  description?: string;
  owner?: string;
  tracks_total?: number;
  tracks: MusicPlaylistTrack[];
  images?: { url?: string }[];
  external_url?: string;
};

const RAW_MUSIC_BASE = (import.meta as any).env?.VITE_MUSIC_BASE_URL || 'http://localhost:8020';
const MUSIC_BASE = import.meta.env.DEV ? '/music-proxy' : RAW_MUSIC_BASE;

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${MUSIC_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
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

export type SpotifyAuthUrlResponse = {
  authorize_url: string;
  state: string;
};

export type SpotifyTokenResponse = {
  provider: string;
  token_type: string;
  scope: string;
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

export const musicApi = {
  // Playlist operations
  createPlaylist: (body: MusicPlaylistCreate) =>
    http<MusicPlaylistResponse>('/playlists', { method: 'POST', body: JSON.stringify(body) }),
  createMoodtunePlaylist: (body: MoodtunePlaylistCreate) =>
    http<MusicPlaylistResponse>('/playlists/moodtune', { method: 'POST', body: JSON.stringify(body) }),
  fetchPlaylistContent: (body: { provider?: string; external_playlist_id: string; provider_access_token?: string }) =>
    http<MusicPlaylistDetails>('/playlists/content', { method: 'POST', body: JSON.stringify(body) }),

  // Spotify OAuth
  getSpotifyAuthUrl: (params?: { redirect_uri?: string; scope?: string; callback_url?: string }) => {
    const query = new URLSearchParams();
    if (params?.redirect_uri) query.set('redirect_uri', params.redirect_uri);
    if (params?.scope) query.set('scope', params.scope);
    if (params?.callback_url) query.set('callback_url', params.callback_url);
    return http<SpotifyAuthUrlResponse>(`/auth/spotify?${query.toString()}`);
  },
  exchangeSpotifyCode: (code: string, state: string, redirect_uri?: string) => {
    const query = new URLSearchParams({ code, state });
    if (redirect_uri) query.set('redirect_uri', redirect_uri);
    return http<SpotifyTokenResponse>(`/auth/spotify/callback?${query.toString()}`);
  },
  refreshSpotifyToken: (refresh_token: string) =>
    http<SpotifyTokenResponse>('/auth/spotify/refresh', { method: 'POST', body: JSON.stringify({ refresh_token }) }),

  effectiveBase(): string {
    return MUSIC_BASE;
  },
};
