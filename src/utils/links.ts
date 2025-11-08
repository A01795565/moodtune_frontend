// Convierte un identificador/URI de pista en un enlace clicable.
// - Si ya es una URL http(s), la devuelve tal cual.
// - Si es un URI de Spotify (p. ej. "spotify:track:ID"), genera
//   la URL pública correspondiente en open.spotify.com.
// - Para otros esquemas devuelve null (no enlazable en web).
export function linkForUri(raw?: string | null): string | null {
  const uri = (raw || '').trim();
  if (!uri) return null;
  // Already a web URL
  if (/^https?:\/\//i.test(uri)) return uri;

  // Spotify URI patterns
  const m = uri.match(/^spotify:(track|album|artist|playlist):([A-Za-z0-9]+)$/i);
  if (m) {
    const type = m[1].toLowerCase();
    const id = m[2];
    return `https://open.spotify.com/${type}/${id}`;
  }

  // Fallback: not mappable
  return null;
}

// Intenta construir un enlace web a partir de la información de una pista.
// - Primero usa `uri` (http o spotify:...)
// - Si no hay `uri` pero el proveedor es Spotify y hay `external_id`,
//   asume que es una canción (track) y genera el enlace público.
export function linkForTrack(t?: {
  uri?: string | null;
  provider?: string | null;
  external_id?: string | null;
}): string | null {
  if (!t) return null;
  const fromUri = linkForUri(t.uri || undefined);
  if (fromUri) return fromUri;
  if ((t.provider || '').toLowerCase() === 'spotify' && (t.external_id || '').trim()) {
    const id = (t.external_id as string).trim();
    return `https://open.spotify.com/track/${id}`;
  }
  return null;
}

// Igual que linkForTrack, pero devolviendo además el tipo de enlace detectado
// para poder mostrar un icono/etiqueta apropiados en UI.
export type LinkInfoKind = 'spotify' | 'itunes' | 'web';
export function linkInfoForTrack(t?: {
  uri?: string | null;
  provider?: string | null;
  external_id?: string | null;
}): { url: string; kind: LinkInfoKind } | null {
  if (!t) return null;

  const raw = (t.uri || '').trim();
  if (raw) {
    // http(s): clasificar por dominio
    if (/^https?:\/\//i.test(raw)) {
      const lower = raw.toLowerCase();
      if (lower.includes('open.spotify.com')) return { url: raw, kind: 'spotify' };
      if (lower.includes('itunes.apple.com') || lower.includes('music.apple.com')) return { url: raw, kind: 'itunes' };
      return { url: raw, kind: 'web' };
    }
    // spotify: URIs
    const mSp = raw.match(/^spotify:(track|album|artist|playlist):([A-Za-z0-9]+)$/i);
    if (mSp) {
      const type = mSp[1].toLowerCase();
      const id = mSp[2];
      return { url: `https://open.spotify.com/${type}/${id}`, kind: 'spotify' };
    }
    // itunes:track:ID (fallback a una URL genérica visible)
    const mIt = raw.match(/^itunes:track:([0-9]+)$/i);
    if (mIt) {
      const id = mIt[1];
      // Nota: sin datos de álbum es difícil construir la URL canónica de Apple Music.
      // Usamos el formato con parámetro ?i=ID que suele redirigir correctamente.
      return { url: `https://music.apple.com/us/album/unknown/?i=${id}`, kind: 'itunes' };
    }
  }

  // Por proveedor + external_id como último recurso
  const provider = (t.provider || '').toLowerCase();
  const eid = (t.external_id || '').trim();
  if (provider === 'spotify' && eid) return { url: `https://open.spotify.com/track/${eid}`, kind: 'spotify' };
  if (provider === 'itunes' && eid) return { url: `https://music.apple.com/us/album/unknown/?i=${eid}`, kind: 'itunes' };

  return null;
}
