import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSpotifyToken } from '../hooks/useSpotifyToken';
import { api } from '../api/client';
import { musicApi } from '../api/music';
import { ragApi, type RagPlaylistResponse, type RagTrack } from '../api/rag';
import AppCard from '../components/AppCard';
import AppButton from '../components/AppButton';
import AppAlert from '../components/AppAlert';
import AppFormField from '../components/AppFormField';
import AppTrackItem from '../components/AppTrackItem';
import { linkInfoForTrack } from '../utils/links';

import './CreateSpotifyPlaylist.css';

const trackKey = (track: RagTrack, fallbackIndex?: number) => {
  const parts = [track.uri, track.id, track.title, track.artist].filter(Boolean);
  if (parts.length) {
    return parts.join('|');
  }
  const fallback = [
    track.cover_url,
    track.image_url,
    track.thumbnail_url,
    track.preview_url,
    fallbackIndex,
  ]
    .filter(Boolean)
    .map((p) => String(p))
    .join('|');
  return fallback || `track-${fallbackIndex ?? 'unknown'}`;
};

const normalizeSpotifyTrackUri = (raw?: string | null): string | null => {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  if (/^spotify:track:/i.test(value)) return value;
  if (/^spotify:[^:]+:[^:]+/i.test(value)) {
    const parts = value.split(':');
    if (parts[1]?.toLowerCase() === 'track' && parts[2]) {
      return `spotify:track:${parts[2]}`;
    }
  }
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.hostname.toLowerCase().includes('spotify.com')) {
        const segments = url.pathname.split('/').filter(Boolean);
        const idx = segments.findIndex((seg) => seg.toLowerCase() === 'track');
        if (idx >= 0 && segments[idx + 1]) {
          return `spotify:track:${segments[idx + 1]}`;
        }
      }
    } catch {}
  }
  if (/^[A-Za-z0-9]{10,}$/.test(value)) {
    return `spotify:track:${value}`;
  }
  return null;
};

const collectProviderUris = (tracksList: RagTrack[]): string[] => {
  const uris = new Set<string>();
  tracksList.forEach((track) => {
    const candidate = normalizeSpotifyTrackUri(track.uri);
    if (candidate) {
      uris.add(candidate);
    } else if (track.uri) {
      uris.add(track.uri);
    }
  });
  return Array.from(uris);
};

const coverFromTrack = (track: RagTrack): string | null => {
  const candidates = [
    track.cover_url,
    track.image_url,
    track.thumbnail_url,
    track.artwork_url,
    (track as any).artworkUrl,
    track.artworkUrl100,
  ].filter(Boolean) as string[];
  if (!candidates.length) return null;
  let url = candidates[0];
  url = url.replace(/100x100bb\.(jpg|png)$/i, '300x300bb.$1');
  return url;
};

const EMOTION_OPTIONS = [
  { value: 'happy', label: 'Feliz / Happy', emoji: '😊' },
  { value: 'sad', label: 'Triste / Sad', emoji: '😢' },
  { value: 'angry', label: 'Enojado / Angry', emoji: '😠' },
  { value: 'calm', label: 'Calmado / Calm', emoji: '😌' },
  { value: 'relaxed', label: 'Relajado / Relaxed', emoji: '😴' },
  { value: 'energetic', label: 'Energético / Energetic', emoji: '⚡' },
];

export default function CreateSpotifyPlaylist() {
  const { user } = useAuth();
  const {
    isConnected,
    isExpired,
    loading: tokenLoading,
    error: tokenError,
    getValidToken,
  } = useSpotifyToken();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savedPlaylistUrl, setSavedPlaylistUrl] = useState<string | null>(null);

  // RAG suggestion state
  const [selectedEmotion, setSelectedEmotion] = useState<string>('happy');
  const [minTracks, setMinTracks] = useState<number>(15);
  const [ragSuggestion, setRagSuggestion] = useState<RagPlaylistResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedTracks, setSelectedTracks] = useState<Record<string, RagTrack>>({});
  const [showCount, setShowCount] = useState(10);
  const displayedTracks = ragSuggestion ? ragSuggestion.items.slice(0, showCount) : [];
  const selectedCount = Object.keys(selectedTracks).length;

  const toggleTrackSelection = (track: RagTrack, fallbackIndex?: number) => {
    const key = trackKey(track, fallbackIndex);
    setSelectedTracks((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = track;
      }
      return next;
    });
  };

  const selectAllDisplayed = () => {
    const next: Record<string, RagTrack> = {};
    displayedTracks.forEach((track, idx) => {
      next[trackKey(track, idx)] = track;
    });
    setSelectedTracks(next);
  };

  const clearSelection = () => setSelectedTracks({});

  const generateSuggestion = async () => {
    // Validate form
    setValidationError(null);
    if (minTracks < 5 || minTracks > 50) {
      setValidationError('La cantidad de canciones debe estar entre 5 y 50');
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(null);
    setSavedPlaylistUrl(null);

    try {
      const suggestion = await ragApi.playlist({
        emotion: selectedEmotion,
        min_tracks: minTracks,
      });

      setRagSuggestion(suggestion);
      setSelectedTracks({});
      setShowCount(10);
      setValidationError(null);
    } catch (e: any) {
      const errorMessage = e?.message || 'Error al generar sugerencia de playlist';
      setError(errorMessage);
      console.error('Error generating playlist suggestion:', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePlaylist = async () => {
    if (!ragSuggestion) return;

    const tracksForSave = selectedCount ? Object.values(selectedTracks) : ragSuggestion.items;
    const selectedUris = collectProviderUris(tracksForSave);
    if (selectedCount && !selectedUris.length) {
      setError('Las canciones seleccionadas no tienen URIs compatibles con Spotify.');
      return;
    }
    const playlistUris = selectedUris.length ? selectedUris : ragSuggestion.uris;
    if (!playlistUris.length) {
      setError('No se encontraron URIs para guardar la playlist.');
      return;
    }

    setCreating(true);
    setError(null);
    setSuccess(null);
    setSavedPlaylistUrl(null);

    try {
      // Get valid token (will refresh if expired)
      const accessToken = await getValidToken();
      if (!accessToken) {
        setError('No se pudo obtener un token válido de Spotify. Por favor reconecta tu cuenta.');
        setCreating(false);
        return;
      }

      // Create playlist via music service
      const playlistResponse = await musicApi.createMoodtunePlaylist({
        provider: 'spotify',
        provider_access_token: accessToken,
        title: ragSuggestion.title,
        description: ragSuggestion.description,
        uris: playlistUris,
        user_id: user?.user_id,
      });

      // Store playlist metadata in database
      await api.createPlaylist({
        user_id: user?.user_id || '',
        provider: 'spotify',
        external_playlist_id: playlistResponse.external_playlist_id,
        deep_link_url: playlistResponse.deep_link_url,
        title: playlistResponse.title,
        description: playlistResponse.description,
      });

      setSuccess(`Playlist "${playlistResponse.title}" creado exitosamente! ${playlistResponse.tracks_added} tracks agregados.`);
      setSavedPlaylistUrl(playlistResponse.deep_link_url);

      // Clear suggestion after saving
      setTimeout(() => {
        setRagSuggestion(null);
        setSelectedTracks({});
        setShowCount(10);
      }, 2000);
    } catch (e: any) {
      const errorMessage = e?.message || 'Error al crear playlist';
      setError(errorMessage);
      console.error('Error creating playlist:', e);
    } finally {
      setCreating(false);
    }
  };

  if (!user) {
    return (
      <div className="create-spotify-playlist__container">
        <AppAlert tone="info">Inicia sesión para usar esta función.</AppAlert>
      </div>
    );
  }

  return (
    <div className="create-spotify-playlist__container">
      <div className="create-spotify-playlist__header">
        <h1>Crear Playlist con IA</h1>
        <p className="create-spotify-playlist__subtitle">
          Genera playlists personalizadas basadas en emociones usando inteligencia artificial.
        </p>
      </div>

      {/* Alerts */}
      {error && <AppAlert tone="error">{error}</AppAlert>}
      {tokenError && <AppAlert tone="error">{tokenError}</AppAlert>}
      {validationError && <AppAlert tone="warning">{validationError}</AppAlert>}
      {success && (
        <AppAlert tone="success">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span>{success}</span>
            {savedPlaylistUrl && (
              <div>
                <a
                  href={savedPlaylistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    textDecoration: 'underline',
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  Abrir en Spotify →
                </a>
              </div>
            )}
          </div>
        </AppAlert>
      )}

      {/* Spotify connection warning */}
      {!isConnected && !tokenLoading && (
        <AppAlert tone="warning">
          <strong>Conexión requerida:</strong> Necesitas conectar tu cuenta de Spotify para crear playlists.{' '}
          <Link to="/connect-spotify" style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
            Conectar Spotify ahora
          </Link>
        </AppAlert>
      )}

      {tokenLoading && (
        <AppCard>
          <div style={{ padding: '1rem', textAlign: 'center' }}>
            <p>Verificando conexión con Spotify...</p>
          </div>
        </AppCard>
      )}

      {isConnected && !tokenLoading && (
        <AppAlert tone={isExpired ? 'warning' : 'success'}>
          {isExpired
            ? '✓ Spotify conectado (el token se refrescará automáticamente al usarlo)'
            : '✓ Spotify conectado y listo para crear playlists'}
        </AppAlert>
      )}

      {/* Generate suggestion form */}
      {isConnected && !ragSuggestion && !generating && (
        <div className="create-spotify-playlist__card">
          <AppCard>
            <h2>Generar Playlist Sugerida</h2>
            <p className="create-spotify-playlist__form-description">
              Selecciona una emoción y la cantidad de canciones que deseas incluir. Nuestra IA generará un playlist personalizado.
            </p>
            <div className="create-spotify-playlist__form">
              <AppFormField label="Selecciona una emoción">
                <select
                  value={selectedEmotion}
                  onChange={(e) => setSelectedEmotion(e.target.value)}
                  className="select"
                  aria-label="Seleccionar emoción"
                >
                  {EMOTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.emoji} {option.label}
                    </option>
                  ))}
                </select>
              </AppFormField>

              <AppFormField
                label="Cantidad de canciones"
                hint="Entre 5 y 50 canciones"
              >
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={minTracks}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 15;
                    setMinTracks(Math.max(5, Math.min(50, value)));
                    setValidationError(null);
                  }}
                  aria-label="Cantidad de canciones"
                  aria-describedby="track-count-hint"
                />
              </AppFormField>

              <div className="create-spotify-playlist__form-actions">
                <AppButton
                  onClick={generateSuggestion}
                  disabled={generating || !!validationError}
                  loading={generating}
                  fullWidth
                >
                  {generating ? 'Generando playlist...' : 'Generar Playlist'}
                </AppButton>
              </div>
            </div>
          </AppCard>
        </div>
      )}

      {/* Generating state */}
      {isConnected && generating && (
        <div className="create-spotify-playlist__card">
          <AppCard>
            <div className="create-spotify-playlist__generating">
              <div className="create-spotify-playlist__generating-icon">🎵</div>
              <h3>Generando tu playlist...</h3>
              <p>Nuestra IA está buscando las mejores canciones para tu emoción seleccionada.</p>
            </div>
          </AppCard>
        </div>
      )}

      {/* Display suggestion */}
      {ragSuggestion && !creating && (
        <div className="create-spotify-playlist__card">
          <AppCard>
            <div className="create-spotify-playlist__suggestion-header">
              <h2>Tu Playlist Generada</h2>
            </div>

            <div className="create-spotify-playlist__suggestion">
              <div className="create-spotify-playlist__suggestion-meta">
                <h3>{ragSuggestion.title}</h3>
                <p className="create-spotify-playlist__description">{ragSuggestion.description}</p>
                <div className="create-spotify-playlist__stats">
                  <span className="create-spotify-playlist__stat">
                    <strong>Emoción:</strong> {EMOTION_OPTIONS.find(e => e.value === ragSuggestion.emotion)?.emoji} {ragSuggestion.emotion}
                  </span>
                  <span className="create-spotify-playlist__stat">
                    <strong>Canciones:</strong> {ragSuggestion.returned}
                  </span>
                </div>
                {ragSuggestion.note && (
                  <AppAlert tone="info">{ragSuggestion.note}</AppAlert>
                )}
              </div>

              <div className="create-spotify-playlist__suggestion-tracks">
                <div className="create-spotify-playlist__tracks-toolbar">
                  <h4>Canciones incluidas:</h4>
                  <div className="create-spotify-playlist__tracks-toolbar-actions">
                    <AppFormField label="Mostrar">
                      <select
                        className="select"
                        value={showCount}
                        onChange={(e) => {
                          const value = Number(e.target.value) || 10;
                          setShowCount(Math.max(5, value));
                        }}
                      >
                        {[5, 10, 15, 20, 30, 50].map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </AppFormField>
                  </div>
                </div>

                {displayedTracks.length ? (
                  <>
                    <div className="create-spotify-playlist__tracks-summary">
                      <span>
                        Canciones seleccionadas: <strong>{selectedCount}</strong> / {displayedTracks.length}
                      </span>
                      <div className="create-spotify-playlist__tracks-summary-actions">
                        <AppButton type="button" variant="ghost" onClick={selectAllDisplayed}>
                          Seleccionar todo
                        </AppButton>
                        <AppButton type="button" variant="ghost" onClick={clearSelection}>
                          Limpiar
                        </AppButton>
                      </div>
                    </div>

                    <div className="create-spotify-playlist__tracks-list">
                      {displayedTracks.map((track, idx) => {
                        const key = trackKey(track, idx);
                        const cover = coverFromTrack(track);
                        return (
                          <AppTrackItem
                            key={key}
                            checked={!!selectedTracks[key]}
                            title={track.title}
                            artist={track.artist}
                            coverUrl={cover}
                            linkInfo={linkInfoForTrack(track) ?? undefined}
                            onToggle={() => toggleTrackSelection(track, idx)}
                          />
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="create-spotify-playlist__tracks-empty">
                    No se encontraron canciones para mostrar.
                  </p>
                )}

                {ragSuggestion.items.length > showCount && (
                  <p className="create-spotify-playlist__more-tracks">
                    ...y {ragSuggestion.items.length - showCount} {ragSuggestion.items.length - showCount === 1 ? 'canción más' : 'canciones más'}
                  </p>
                )}
              </div>
              <div className="create-spotify-playlist__suggestion-actions">
                <AppButton
                  onClick={handleSavePlaylist}
                  disabled={creating}
                  loading={creating}
                  fullWidth
                >
                  {creating ? 'Guardando en Spotify...' : 'Guardar Playlist en Spotify'}
                </AppButton>
                <AppButton
                  variant="ghost"
                  onClick={generateSuggestion}
                  disabled={creating || generating}
                  fullWidth
                >
                  Generar Nueva Sugerencia
                </AppButton>
              </div>
            </div>
          </AppCard>
        </div>
      )}

      {/* Creating state */}
      {creating && (
        <div className="create-spotify-playlist__card">
          <AppCard>
            <div className="create-spotify-playlist__creating">
              <div className="create-spotify-playlist__creating-icon">💾</div>
              <h3>Guardando playlist en Spotify...</h3>
              <p>Estamos creando tu playlist y agregando todas las canciones.</p>
            </div>
          </AppCard>
        </div>
      )}
    </div>
  );
}
