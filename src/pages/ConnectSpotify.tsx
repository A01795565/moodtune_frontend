import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSpotifyToken } from '../hooks/useSpotifyToken';
import { api } from '../api/client';
import { musicApi } from '../api/music';
import AppCard from '../components/AppCard';
import AppButton from '../components/AppButton';
import AppAlert from '../components/AppAlert';

import './ConnectSpotify.css';

export default function ConnectSpotify() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const {
    isConnected,
    isExpired,
    loading: tokenLoading,
    error: tokenError,
    saveToken,
    clearToken,
  } = useSpotifyToken();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const callbackProcessedRef = useRef(false);

  // OAuth callback handling - check URL hash for tokens
  useEffect(() => {
    // Prevent double processing in React Strict Mode
    if (callbackProcessedRef.current) return;

    // Check for error in query params
    const queryParams = new URLSearchParams(window.location.search);
    const errorParam = queryParams.get('error');

    if (errorParam) {
      setError(`Error de autenticación: ${errorParam}`);
      callbackProcessedRef.current = true;
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Check for tokens in URL hash
    const hash = window.location.hash.substring(1);
    if (hash) {
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const expiresIn = params.get('expires_in');
      const state = params.get('state');

      if (accessToken && state) {
        callbackProcessedRef.current = true;
        handleOAuthCallback(accessToken, refreshToken, expiresIn, state);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleConnectSpotify = async () => {
    setLoading(true);
    setError(null);
    try {
      // Clean up any previous OAuth state before starting new flow
      sessionStorage.removeItem('spotify_oauth_state');

      // Get authorization URL from music service (simple callback URL without query params)
      const callbackUrl = `${window.location.origin}/connect-spotify`;
      const result = await musicApi.getSpotifyAuthUrl({ callback_url: callbackUrl });

      // Store state for verification
      sessionStorage.setItem('spotify_oauth_state', result.state);

      // Redirect to Spotify authorization
      window.location.href = result.authorize_url;
    } catch (e: any) {
      console.error('Error iniciando OAuth:', e);
      setError(`Error al iniciar conexión con Spotify: ${e?.message || 'Error desconocido'}`);
      setLoading(false);
    }
  };

  const handleOAuthCallback = async (
    accessToken: string,
    refreshToken: string | null,
    expiresIn: string | null,
    state: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      // Verify state matches what we stored
      const storedState = sessionStorage.getItem('spotify_oauth_state');

      if (storedState !== state) {
        console.error('OAuth state mismatch:', { expected: storedState, received: state });
        sessionStorage.removeItem('spotify_oauth_state');
        setError('Error de autenticación: el estado OAuth no coincide. Por favor, intenta conectar de nuevo.');
        return;
      }

      if (!user?.user_id) {
        console.error('OAuth Error: Usuario no autenticado');
        setError('Usuario no autenticado');
        return;
      }

      // Calculate expires_at in MySQL-compatible format
      const expiresInSeconds = expiresIn ? parseInt(expiresIn) : 3600;
      const expiresDate = new Date(Date.now() + expiresInSeconds * 1000);
      // Convert to MySQL datetime format: YYYY-MM-DD HH:MM:SS
      const expiresAt = expiresDate.toISOString()
        .replace('T', ' ')
        .replace(/\.\d{3}Z$/, '');

      // Simple base64 encoding (Spotify tokens are ASCII-safe)
      const encodeToken = (token: string): string => {
        try {
          return btoa(token);
        } catch (err) {
          console.error('Error encoding token:', err);
          throw new Error('Error al codificar token');
        }
      };

      const tokenData = {
        user_id: user.user_id,
        provider: 'spotify' as const,
        access_cipher_b64: encodeToken(accessToken),
        refresh_cipher_b64: refreshToken ? encodeToken(refreshToken) : null,
        expires_at: expiresAt,
      };

      // Store encrypted tokens in database
      const result = await api.upsertOAuthToken(tokenData);

      // Save token data in hook (sessionStorage + state)
      saveToken({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        token_id: result.token_id,
      });

      // Clean up OAuth state
      sessionStorage.removeItem('spotify_oauth_state');

      // Show success message - user stays on this page
      setSuccess('¡Conexión exitosa! Tu cuenta de Spotify está conectada. Ahora puedes crear playlists personalizadas.');
    } catch (e: any) {
      console.error('OAuth Callback Error:', e);
      const errorMsg = e?.message || 'Error al conectar Spotify';
      setError(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('¿Estás seguro de que deseas desconectar tu cuenta de Spotify?')) {
      clearToken();
      setSuccess(null);
      setError(null);
    }
  };

  if (!user) {
    return (
      <div className="connect-spotify">
        <AppCard>
          <AppAlert tone="info">Inicia sesión para conectar tu cuenta de Spotify.</AppAlert>
        </AppCard>
      </div>
    );
  }

  return (
    <div className="connect-spotify">
      <div className="connect-spotify__header">
        <h1>Conectar Spotify</h1>
        <p className="connect-spotify__subtitle">
          Conecta tu cuenta de Spotify para crear y gestionar playlists personalizadas basadas en tus emociones.
        </p>
      </div>

      {error && <AppAlert tone="error">{error}</AppAlert>}
      {tokenError && <AppAlert tone="error">{tokenError}</AppAlert>}
      {success && <AppAlert tone="success">{success}</AppAlert>}

      {tokenLoading && (
        <AppCard>
          <p>Verificando conexión con Spotify...</p>
        </AppCard>
      )}

      {!tokenLoading && !isConnected && (
        <AppCard>
          <div className="connect-spotify__info">
            <h2>¿Por qué conectar Spotify?</h2>
            <ul className="connect-spotify__benefits">
              <li>
                <strong>Crea playlists personalizadas:</strong> Genera listas de reproducción basadas en tus emociones
                directamente en tu cuenta de Spotify.
              </li>
              <li>
                <strong>Guarda tus descubrimientos:</strong> Todos los playlists que crees se guardarán en tu biblioteca de Spotify.
              </li>
              <li>
                <strong>Gestiona tus playlists:</strong> Ve todos los playlists que has creado con MoodTune.
              </li>
              <li>
                <strong>Seguro y privado:</strong> Solo solicitamos los permisos necesarios para crear playlists. Tu información está protegida.
              </li>
            </ul>

            <div className="connect-spotify__permissions">
              <h3>Permisos requeridos:</h3>
              <ul>
                <li>Crear y modificar playlists públicos</li>
                <li>Crear y modificar playlists privados</li>
              </ul>
              <p className="connect-spotify__note">
                MoodTune no accederá a tus datos personales más allá de lo necesario para crear playlists.
              </p>
            </div>

            <div className="connect-spotify__actions">
              <AppButton onClick={handleConnectSpotify} disabled={loading} loading={loading}>
                {loading ? 'Conectando...' : 'Conectar con Spotify'}
              </AppButton>
            </div>
          </div>
        </AppCard>
      )}

      {!tokenLoading && isConnected && (
        <AppCard>
          <div className="connect-spotify__connected">
            <div className="connect-spotify__status">
              <div className="connect-spotify__status-icon">✓</div>
              <div>
                <h2>Cuenta de Spotify conectada</h2>
                <p className="connect-spotify__status-text">
                  {isExpired
                    ? 'Token expirado (se refrescará automáticamente al usarlo)'
                    : 'Tu cuenta está activa y lista para usar'}
                </p>
              </div>
            </div>

            <div className="connect-spotify__next-steps">
              <h3>¿Qué puedes hacer ahora?</h3>
              <div className="connect-spotify__actions-grid">
                <Link to="/detect" className="connect-spotify__action-card">
                  <div className="connect-spotify__action-icon">📸</div>
                  <div className="connect-spotify__action-content">
                    <h4>Detectar Emoción</h4>
                    <p>Analiza tu estado de ánimo con una foto y recibe recomendaciones personalizadas</p>
                  </div>
                </Link>
                <Link to="/create-playlist" className="connect-spotify__action-card">
                  <div className="connect-spotify__action-icon">🎵</div>
                  <div className="connect-spotify__action-content">
                    <h4>Crear Playlist</h4>
                    <p>Genera playlists con IA basadas en emociones específicas</p>
                  </div>
                </Link>
                <Link to="/explore" className="connect-spotify__action-card">
                  <div className="connect-spotify__action-icon">🔍</div>
                  <div className="connect-spotify__action-content">
                    <h4>Explorar Música</h4>
                    <p>Descubre canciones perfectas para tu estado de ánimo</p>
                  </div>
                </Link>
                <Link to="/my-playlists" className="connect-spotify__action-card">
                  <div className="connect-spotify__action-icon">📝</div>
                  <div className="connect-spotify__action-content">
                    <h4>Mis Playlists</h4>
                    <p>Revisa todos los playlists que has creado con MoodTune</p>
                  </div>
                </Link>
              </div>
            </div>

            <div className="connect-spotify__disconnect">
              <AppButton variant="ghost" onClick={handleDisconnect}>
                Desconectar Spotify
              </AppButton>
            </div>
          </div>
        </AppCard>
      )}
    </div>
  );
}
