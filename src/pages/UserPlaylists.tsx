import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { musicApi, type MusicPlaylistDetails, type MusicPlaylistTrack } from '../api/music';
import { useAuth } from '../hooks/useAuth';
import { useSpotifyToken } from '../hooks/useSpotifyToken';
import type { Playlist } from '../types/api';

import AppCard from '../components/AppCard';
import AppButton from '../components/AppButton';
import AppAlert from '../components/AppAlert';

import './UserPlaylists.css';

const formatDuration = (ms?: number) => {
  if (typeof ms !== 'number' || Number.isNaN(ms)) return '--:--';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default function UserPlaylists() {
  const { user } = useAuth();
  const { getValidToken, isConnected, error: tokenError } = useSpotifyToken();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Playlist | null>(null);
  const [content, setContent] = useState<MusicPlaylistDetails | null>(null);

  const loadPlaylists = async () => {
    if (!user?.user_id) return;
    setListLoading(true);
    setListError(null);
    try {
      const data = await api.listPlaylists({ user_id: user.user_id, limit: 50, offset: 0 });
      setPlaylists(data.items || []);
    } catch (e: any) {
      setListError(e?.message || 'Error al cargar playlists');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => { loadPlaylists(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.user_id]);

  const fetchContent = async (playlist: Playlist) => {
    if (!playlist) return;
    setSelected(playlist);
    setContent(null);
    setContentError(null);
    setContentLoading(true);
    try {
      const provider = playlist.provider || 'spotify';

      // Get valid Spotify token (with auto-refresh)
      const accessToken = await getValidToken();
      if (!accessToken) {
        setContentError('No se pudo obtener un token válido de Spotify. Por favor reconecta tu cuenta.');
        setContentLoading(false);
        return;
      }

      const externalId = playlist.external_playlist_id || playlist.playlist_id;
      const details = await musicApi.fetchPlaylistContent({
        provider,
        external_playlist_id: externalId,
        provider_access_token: accessToken
      });
      setContent(details);
    } catch (e: any) {
      setContentError(e?.message || 'No se pudo obtener el contenido del playlist');
    } finally {
      setContentLoading(false);
    }
  };

  const playlistTracks: MusicPlaylistTrack[] = useMemo(() => content?.tracks || [], [content]);

  return (
    <div className="userplaylists">
      <div className="userplaylists__page-header">
        <h1 className="userplaylists__page-title">Mis Playlists</h1>
        <p className="userplaylists__page-subtitle">
          Gestiona y explora todos los playlists que has creado con MoodTune.
        </p>
      </div>

      <div className="userplaylists__column">
        <AppCard>
          <div className="userplaylists__header">
            <h2>Tus playlists ({playlists.length})</h2>
            <AppButton variant="ghost" onClick={loadPlaylists} disabled={listLoading}>
              {listLoading ? 'Cargando...' : 'Refrescar'}
            </AppButton>
          </div>
          {tokenError && <AppAlert tone="error">{tokenError}</AppAlert>}
          {!isConnected && user?.user_id && (
            <AppAlert tone="warning">
              <strong>Conexión requerida:</strong> Conecta tu cuenta de Spotify para ver los detalles de los playlists.{' '}
              <Link to="/connect-spotify" style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
                Conectar Spotify ahora
              </Link>
            </AppAlert>
          )}
          {listError && <div className="userplaylists__error">{listError}</div>}
          {!user?.user_id && (
            <div className="userplaylists__hint">Inicia sesión para ver tus playlists registrados.</div>
          )}
          <div className="userplaylists__list" role="list">
            {playlists.map((playlist) => (
              <button
                key={playlist.playlist_id}
                type="button"
                className={`userplaylists__item${selected?.playlist_id === playlist.playlist_id ? ' is-selected' : ''}`}
                onClick={() => fetchContent(playlist)}
                disabled={contentLoading && selected?.playlist_id === playlist.playlist_id}
              >
                <div className="userplaylists__item-title">{playlist.title || '(sin título)'}</div>
                <div className="userplaylists__item-meta">
                  <span>{playlist.provider}</span>
                  {playlist.description && <span className="muted">{playlist.description.slice(0, 40)}</span>}
                </div>
              </button>
            ))}
            {!listLoading && !playlists.length && user?.user_id && (
              <div className="userplaylists__empty-state">
                <div className="userplaylists__empty-icon">🎵</div>
                <h3>No hay playlists aún</h3>
                <p>Crea tu primer playlist basado en tus emociones.</p>
                <div style={{ marginTop: '1rem' }}>
                  <Link to="/create-playlist">
                    <AppButton>Crear Playlist</AppButton>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </AppCard>
      </div>

      <div className="userplaylists__column">
        <AppCard>
          <div className="userplaylists__header">
            <h2>Detalles del Playlist</h2>
            {content && content.external_url && (
              <a href={content.external_url} target="_blank" rel="noreferrer" className="userplaylists__external-link">
                Abrir en {content.provider}
              </a>
            )}
          </div>
          {contentError && <div className="userplaylists__error">{contentError}</div>}
          {!selected && (
            <div className="userplaylists__empty-state userplaylists__empty-state--small">
              <div className="userplaylists__empty-icon">👈</div>
              <p>Selecciona un playlist de la lista para ver su contenido.</p>
            </div>
          )}
          {selected && !content && contentLoading && (
            <div className="userplaylists__hint">Consultando playlist en el proveedor...</div>
          )}
          {content && (
            <div className="userplaylists__details">
              <div className="userplaylists__meta">
                <h3>{content.title || '(sin título)'}</h3>
                <p className="muted">{content.description}</p>
                <div className="userplaylists__meta-row">
                  <span>Proveedor: <strong>{content.provider}</strong></span>
                  {content.owner && <span>Propietario: <strong>{content.owner}</strong></span>}
                  {typeof content.tracks_total === 'number' && (
                    <span>Total: <strong>{content.tracks_total}</strong></span>
                  )}
                </div>
              </div>
              <div className="userplaylists__tracks">
                {playlistTracks.map((track) => (
                  <div key={`${track.id || track.uri}-${track.added_at}`} className="userplaylists__track">
                    {track.image_url ? (
                      <img src={track.image_url} alt="Cover" width={48} height={48} />
                    ) : (
                      <div className="userplaylists__track-placeholder" />
                    )}
                    <div className="userplaylists__track-info">
                      <div className="userplaylists__track-title">{track.title || '(sin título)'}</div>
                      <div className="userplaylists__track-meta">
                        <span>{track.artist || 'Desconocido'}</span>
                        {track.album && <span> · {track.album}</span>}
                      </div>
                    </div>
                    <div className="userplaylists__track-duration">{formatDuration(track.duration_ms)}</div>
                  </div>
                ))}
                {!playlistTracks.length && (
                  <div className="userplaylists__hint">El playlist no contiene canciones visibles.</div>
                )}
              </div>
            </div>
          )}
        </AppCard>
      </div>
    </div>
  );
}
