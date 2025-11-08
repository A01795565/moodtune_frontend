// Cliente para el servicio MoodTune RAG (Flask).
// Provee endpoints para buscar canciones por emoción y crear playlists sugeridas.

export type RagTrack = {
  id?: string;
  title?: string;
  artist?: string;
  preview_url?: string;
  uri?: string; // e.g., music:track:...
  valence?: number;
  energy?: number;
  mood?: string;
  // Carátula opcional proporcionada por el backend (si disponible)
  cover_url?: string;
  image_url?: string;
  thumbnail_url?: string;
  artwork_url?: string;
  artworkUrl?: string;
  artworkUrl100?: string;
};

export type RagSearchResponse = {
  emotion: string;
  requested_min: number;
  returned: number;
  note?: string;
  items: RagTrack[];
};

export type RagPlaylistResponse = {
  emotion: string;
  title: string;
  description: string;
  returned: number;
  items: RagTrack[];
  uris: string[];
  note?: string;
};

const RAW_RAG_BASE = (import.meta as any).env?.VITE_RAG_BASE_URL || 'http://localhost:8010';
// En desarrollo, usar proxy para evitar CORS.
const RAG_BASE = import.meta.env.DEV ? '/rag-proxy' : RAW_RAG_BASE;

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${RAG_BASE}${path}`, {
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

export const ragApi = {
  // POST /rag/search { emotion, min_tracks? }
  search: (body: { emotion: string; min_tracks?: number }) =>
    http<RagSearchResponse>('/rag/search', { method: 'POST', body: JSON.stringify(body) }),

  // POST /rag/playlist { emotion, min_tracks? }
  playlist: (body: { emotion: string; min_tracks?: number }) =>
    http<RagPlaylistResponse>('/rag/playlist', { method: 'POST', body: JSON.stringify(body) }),

  effectiveBase(): string {
    return RAG_BASE;
  },
};
