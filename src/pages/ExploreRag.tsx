// Página "Explorar" para buscar canciones por emoción vía servicio RAG.
// - Permite elegir una emoción y un mínimo de resultados.
// - Muestra carátula, título/autor, preview y link abierto en Spotify.
// - Usa utilidades de API y un helper para convertir URIs a enlaces.
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ragApi, type RagTrack, type RagSearchResponse } from '../api/rag';
import { linkInfoForTrack } from '../utils/links';
import { ProviderIcon } from '../components/ProviderIcon';

// Emociones soportadas (alineadas con el backend RAG)
type EmotionKey = 'happy' | 'sad' | 'angry' | 'relaxed';
// prettier-ignore
const EMOTIONS: { key: EmotionKey; label: string; emoji: string; hint: string }[] = [
  { key: 'happy', label: 'Feliz',    emoji: '😊', hint: 'positivo, energético' },
  { key: 'sad',   label: 'Triste',   emoji: '😢', hint: 'introspectivo, suave' },
  { key: 'angry', label: 'Intenso',  emoji: '😤', hint: 'alto pulso, potente' },
  { key: 'relaxed', label: 'Relajado', emoji: '😌', hint: 'tranquilo, chill' },
];

// Determina la mejor imagen de portada disponible para el track recibido.
// Usa campos provistos por el backend (sin inferir desde URIs externas).
function coverFromApi(t: RagTrack): string | null {
  // Tomar primero campos provistos por /rag/search si existen
  const candidates = [
    t.cover_url,
    t.image_url,
    t.thumbnail_url,
    t.artwork_url,
    (t as any).artworkUrl as string | undefined,
    t.artworkUrl100,
  ].filter(Boolean) as string[];
  if (!candidates.length) return null;
  let u = candidates[0];
  // iTunes suele devolver artworkUrl100 con patrón 100x100bb; se puede escalar a 300x300
  u = u.replace(/100x100bb\.(jpg|png)$/i, '300x300bb.$1');
  return u;
}

// Pequeño chip visual para mostrar una métrica (valence/energy) de 0..1 como porcentaje.
function Metric({ label, value }: { label: string; value?: number }) {
  const v = typeof value === 'number' ? Math.round(value * 100) : null;
  return (
    <span style={{
      fontSize: 12,
      color: '#444',
      background: '#f2f4f7',
      padding: '2px 6px',
      borderRadius: 8,
      marginRight: 6,
    }}>{label}: {v !== null ? `${v}` : '—'}</span>
  );
}

// Tarjeta de resultado para una pista: portada, título, artista, preview y enlace.
function TrackCard({ t }: { t: RagTrack }) {
  const apiCover = coverFromApi(t);
  const coverUrl = apiCover;
  // Convierte la pista (uri/provider/external_id) en un link navegable + tipo
  const link = useMemo(() => linkInfoForTrack(t as any), [t]);
  const linkA11y = useMemo(() => {
    if (!link) return null;
    const provider = link.kind === 'spotify' ? 'Spotify' : link.kind === 'itunes' ? 'Apple Music' : 'web';
    const base = `Abrir en ${provider}`;
    const title = [base, t.title, t.artist].filter(Boolean).join(' · ');
    return title;
  }, [link, t.title, t.artist]);
  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 12,
      background: 'white',
      display: 'grid',
      gap: 8,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr auto', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 64, height: 64, borderRadius: 8, background: '#f3f4f6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {coverUrl ? (
            <img src={coverUrl} alt="Carátula" loading="lazy" width={64} height={64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ fontSize: 12, color: '#888' }}>Sin carátula</div>
          )}
        </div>
        <div>
          <div style={{ fontWeight: 600 }}>{t.title || '—'}</div>
          <div style={{ color: '#555' }}>{t.artist || '—'}</div>
        </div>
        <div>
          {link && linkA11y && (
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              aria-label={linkA11y}
              title={linkA11y}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 9999,
                background: '#f3f4f6',
                color: '#111',
                textDecoration: 'none',
              }}
            >
              <ProviderIcon kind={link.kind} size={16} />
            </a>
          )}
        </div>
      </div>
      <div>
        {t.preview_url ? (
          <audio src={t.preview_url} controls style={{ width: '100%' }} />
        ) : (
          <div style={{ fontSize: 12, color: '#777' }}>Sin preview</div>
        )}
      </div>
      <div>
        <Metric label="Valence" value={t.valence} />
        <Metric label="Energy" value={t.energy} />
        {t.mood && <span style={{ fontSize: 12, color: '#333' }}>mood: {t.mood}</span>}
      </div>
    </div>
  );
}

// Vista principal: selector de emoción, cantidad mínima, submit y resultados.
export default function ExploreRag() {
  const [searchParams] = useSearchParams();
  const [emotion, setEmotion] = useState<EmotionKey>('happy');
  const [minTracks, setMinTracks] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RagSearchResponse | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setLoading(true); setData(null);
    try {
      const res = await ragApi.search({ emotion, min_tracks: minTracks });
      setData(res);
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  // Preseleccionar emoción desde ?emotion=happy|sad|angry|relaxed
  useEffect(() => {
    const q = (searchParams.get('emotion') || '').toLowerCase();
    const allowed: EmotionKey[] = ['happy','sad','angry','relaxed'];
    if (allowed.includes(q as EmotionKey)) setEmotion(q as EmotionKey);
  }, [searchParams]);

  return (
    <div>
      {/* Encabezado y ayuda breve */}
      <h2>Explorar música por emoción</h2>
      <p style={{ color: '#555', marginTop: 4 }}>Selecciona cómo te sientes y descubre canciones alineadas a ese estado.</p>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16, marginTop: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))', gap: 12 }}>
          {EMOTIONS.map((e) => {
            const active = e.key === emotion;
            return (
              <button
                key={e.key}
                type="button"
                onClick={() => setEmotion(e.key)}
                aria-pressed={active}
                style={{
                  border: active ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                  background: active ? '#eff6ff' : 'white',
                  borderRadius: 12,
                  padding: 12,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 22 }}>{e.emoji}</div>
                <div style={{ fontWeight: 600 }}>{e.label}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{e.hint}</div>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Cantidad mínima</span>
            <input type="range" min={10} max={60} value={minTracks}
              onChange={(e)=> setMinTracks(Number(e.target.value))} />
            <span style={{ width: 30, textAlign: 'right' }}>{minTracks}</span>
          </label>
          <button type="submit" disabled={loading} style={{ padding: '8px 14px' }}>
            {loading ? 'Buscando…' : 'Buscar canciones'}
          </button>
          <Link to="/detect" style={{ marginLeft: 'auto', fontSize: 14 }}>¿No sabes tu emoción? Detecta aquí</Link>
        </div>
      </form>

      {error && (
        <div style={{ color: 'crimson', marginTop: 12 }}>{error}</div>
      )}

      {data && (
        <div style={{ marginTop: 16 }}>
          {data.note && (
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', padding: 10, borderRadius: 8, marginBottom: 12 }}>
              {data.note}
            </div>
          )}
          <div style={{ color: '#555', marginBottom: 8 }}>
            Emoción “{data.emotion}”. Resultados: {data.returned}. Mostrando hasta {Math.max(data.requested_min * 2, 50)}.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {data.items?.map((t, idx) => (
              <TrackCard key={`${t.id || t.uri || idx}`} t={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
