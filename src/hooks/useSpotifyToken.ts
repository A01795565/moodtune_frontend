import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { api } from '../api/client';
import { musicApi } from '../api/music';

const STORAGE_KEY = 'moodtune_spotify_token_data';

type SpotifyTokenData = {
  access_token: string;
  refresh_token: string | null;
  expires_at: string; // ISO timestamp
  token_id: string;
};

/**
 * Hook para gestionar tokens de Spotify con refresh automático
 *
 * Features:
 * - Verifica si existe token en BD para el usuario
 * - Usa endpoint backend para obtener token válido (con auto-refresh)
 * - Backend maneja descifrado y refresh de manera segura
 * - sessionStorage solo almacena metadata (no tokens sensibles)
 * - Proporciona función para obtener token válido
 */
export function useSpotifyToken() {
  const { user } = useAuth();
  const [tokenData, setTokenData] = useState<SpotifyTokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load token metadata from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored) as SpotifyTokenData;
        setTokenData(data);
      } catch (e) {
        console.error('Error parsing stored token data:', e);
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  /**
   * Verifica si el token está expirado o está a punto de expirar (dentro de 5 minutos)
   * Nota: Ahora solo se usa para UI, el backend maneja la verificación real
   */
  const isTokenExpired = useCallback((data: SpotifyTokenData | null): boolean => {
    if (!data) return true;
    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    // Consider expired if less than 5 minutes remaining
    const bufferMs = 5 * 60 * 1000;
    return expiresAt.getTime() - now.getTime() < bufferMs;
  }, []);

  /**
   * Elimina el token (logout de Spotify)
   */
  const clearToken = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setTokenData(null);
    setError(null);
  }, []);

  /**
   * Obtiene un access token válido desde el backend (con auto-refresh)
   *
   * El backend maneja:
   * - Descifrado del token almacenado
   * - Verificación de expiración
   * - Refresh automático si está expirado
   * - Actualización de la BD con el nuevo token
   */
  const getValidToken = useCallback(async (): Promise<string | null> => {
    if (!user?.user_id) {
      setError('Usuario no autenticado');
      return null;
    }

    if (!tokenData) {
      setError('No hay token de Spotify. Por favor conecta tu cuenta primero.');
      return null;
    }

    try {
      // Call backend endpoint that handles everything securely
      const response = await api.getValidToken(user.user_id, 'spotify');

      // Update local metadata if token was refreshed
      if (response.was_refreshed && response.expires_at) {
        const updatedData: SpotifyTokenData = {
          ...tokenData,
          expires_at: response.expires_at,
          access_token: response.access_token, // Only for UI purposes, not persisted
        };
        setTokenData(updatedData);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
      }

      setError(null);
      return response.access_token;
    } catch (e: any) {
      const errorMsg = e?.message || 'No se pudo obtener token válido';

      // Check if token not found (need to reconnect)
      if (errorMsg.includes('no encontrado') || errorMsg.includes('404')) {
        setError('Token no encontrado. Por favor reconecta tu cuenta de Spotify.');
        // Clear stale data
        clearToken();
      } else if (errorMsg.includes('refrescar') || errorMsg.includes('502')) {
        setError('No se pudo refrescar el token. Por favor reconecta tu cuenta.');
      } else {
        setError(errorMsg);
      }

      return null;
    }
  }, [user?.user_id, tokenData, clearToken]);

  /**
   * Guarda nuevos datos de token (después de OAuth)
   */
  const saveToken = useCallback((data: SpotifyTokenData) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setTokenData(data);
    setError(null);
  }, []);

  return {
    tokenData,
    accessToken: tokenData?.access_token || null,
    isConnected: !!tokenData,
    isExpired: isTokenExpired(tokenData),
    loading,
    error,
    getValidToken,
    saveToken,
    clearToken,
  };
}
