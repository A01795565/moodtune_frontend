import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSpotifyToken } from '../hooks/useSpotifyToken';
import { api } from '../api/client';
import { ferApi } from '../api/fer';
import { ragApi, type RagSearchResponse, type RagTrack } from '../api/rag';
import { musicApi } from '../api/music';
import type { Emotion, InferenceCreate } from '../types/api';

import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppAlert from '../components/AppAlert';
import AppBadge from '../components/AppBadge';
import AppFormField from '../components/AppFormField';
import AppTrackItem from '../components/AppTrackItem';
import { linkInfoForTrack } from '../utils/links';

import './DetectEmotion.css';
import AppFilePicker from '../components/AppFilePicker';

type DetectionResult = { emotion: Emotion; confidence: number; model_version?: string };

const trackKey = (track: RagTrack) => {
  const parts = [track.id, track.uri, track.title, track.artist].filter(Boolean);
  return parts.length ? parts.join('|') : `${track.cover_url || 'track'}-${track.preview_url || ''}`;
};

const MUSIC_PROVIDER: 'spotify' = 'spotify';

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
    }
  });
  return Array.from(uris);
};

export default function DetectEmotion() {
  const { sessionId, user } = useAuth();
  const { isConnected, error: tokenError, getValidToken } = useSpotifyToken();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [consent, setConsent] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [intention, setIntention] = useState<'maintain' | 'change' | ''>('');
  const [saved, setSaved] = useState<string | null>(null);
  const [ferStatus, setFerStatus] = useState<'checking' | 'ok' | 'error' | 'not_set'>('checking');
  const [ferError, setFerError] = useState<string | null>(null);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [tracksError, setTracksError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<RagSearchResponse | null>(null);
  const [showCount, setShowCount] = useState<number>(10);
  const tracksRef = useRef<HTMLDivElement | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<'happy' | 'sad' | 'angry'>('happy');
  const [selectedTracks, setSelectedTracks] = useState<Record<string, RagTrack>>({});
  const [playlistName, setPlaylistName] = useState('');
  const [savingPlaylist, setSavingPlaylist] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savedPlaylistUrl, setSavedPlaylistUrl] = useState<string | null>(null);
  const [inferenceConfidence, setInferenceConfidence] = useState(0.5);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  useEffect(() => { checkFerNow(); }, []);

  const checkFerNow = async () => {
    setFerStatus('checking');
    setFerError(null);
    try {
      const endpoint = ferApi.effectiveEndpoint() as string | null;
      if (!endpoint) { setFerStatus('not_set'); setFerError('VITE_FER_ENDPOINT_URL no definida'); return; }
      let healthUrl: string | null = null;
      if (endpoint.endsWith('/infer')) healthUrl = endpoint.replace(/\/infer$/, '/health');
      else {
        try { const u = new URL(endpoint); healthUrl = `${u.origin}/health`; } catch { healthUrl = null; }
      }
      if (!healthUrl) { setFerStatus('error'); setFerError('URL de FER inválida'); return; }
      if (typeof window !== 'undefined' && window.location?.protocol === 'https:' && healthUrl.startsWith('http://')) {
        setFerError('Posible bloqueo por contenido mixto (https → http).');
      }
      const res = await fetch(healthUrl, { method: 'GET' });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        setFerStatus('error');
        setFerError(`${res.status} ${res.statusText}${t ? ` - ${t}` : ''}`);
        return;
      }
      const data = await res.json().catch(() => ({} as any));
      if ((data as any)?.status === 'ok') { setFerStatus('ok'); setFerError(null); }
      else { setFerStatus('error'); setFerError('Respuesta inválida del health'); }
    } catch (e: any) {
      setFerStatus('error');
      setFerError(e?.message || 'Error de red al consultar FER');
    }
  };

  const resetAll = () => {
    setFile(null); setPreviewUrl(null); setResult(null); setError(null); setIntention(''); setSaved(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const toggleTrackSelection = (track: RagTrack) => {
    setSelectedTracks((prev) => {
      const key = trackKey(track);
      const next = { ...prev };
      if (next[key]) { delete next[key]; } else { next[key] = track; }
      return next;
    });
  };

  const clearSelection = () => setSelectedTracks({});
  const selectAllDisplayed = (tracksToSelect: RagTrack[]) => {
    const next: Record<string, RagTrack> = {};
    tracksToSelect.forEach((track) => { next[trackKey(track)] = track; });
    setSelectedTracks(next);
  };

  const handleTargetEmotionChange = (value: 'happy' | 'sad' | 'angry') => {
    setSelectedEmotion(value);
    setSaveError(null);
    setSaveMessage(null);
    setSavedPlaylistUrl(null);
    setSaved(null);
    if (intention === 'change') { fetchTracksForEmotion(value); }
  };

  const onFileChange = (f: File | null) => {
    setResult(null); setError(null); setSaved(null);
    setTracks(null); setTracksError(null);
    if (!f) { setFile(null); setPreviewUrl(null); return; }
    if (!/^image\//.test(f.type)) { setError('Selecciona una imagen valida.'); return; }
    if (f.size > 8 * 1024 * 1024) { setError('La imagen supera 8MB.'); return; }
    setFile(f); setPreviewUrl(URL.createObjectURL(f));
  };

  const localDetect = async (): Promise<DetectionResult> => {
    const img = imgRef.current; const canvas = canvasRef.current;
    if (!img || !canvas) throw new Error('Imagen no lista');
    const maxDim = 256;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.floor(img.naturalWidth * scale));
    const h = Math.max(1, Math.floor(img.naturalHeight * scale));
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas no soportado');
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    if (!data || data.length < 4) throw new Error('Imagen invalida');
    let sum = 0; let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const y = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      sum += y; count++;
    }
    const mean = sum / count / 255;
    let emotion: Emotion; let confidence: number;
    if (mean >= 0.66) { emotion = 'joy'; confidence = 0.85 + (mean - 0.66) * 0.15; }
    else if (mean <= 0.33) { emotion = 'sadness'; confidence = 0.85 + (0.33 - mean) * 0.15; }
    else { emotion = 'anger'; confidence = 0.75 + (0.5 - Math.abs(0.5 - mean)) * 0.25; }
    return { emotion, confidence: Math.min(0.99, Math.max(0.5, Number(confidence.toFixed(2)))) , model_version: 'local-fallback-0.1' };
  };

  const remoteDetect = async (signal: AbortSignal): Promise<DetectionResult> => {
    if (!file) throw new Error('Sin archivo');
    const t0 = performance.now();
    const data = await ferApi.infer(file, signal);
    const t1 = performance.now();
    const emotion = (data?.emotion || '').toLowerCase() as Emotion;
    if (!['joy','sadness','anger'].includes(emotion)) throw new Error('FER emocion no soportada');
    const conf = Number((data as any)?.confidence ?? 0);
    const latency = Math.round(t1 - t0);
    return { emotion, confidence: Math.min(0.99, Math.max(0.5, conf || 0.9)), model_version: (data as any)?.model_version || `remote-${latency}ms` } as DetectionResult;
  };

  const detect = async () => {
    setDetecting(true); setError(null); setResult(null); setSaved(null);
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort('timeout'), 5000);
    const tStart = performance.now();
    try {
      let r: DetectionResult;
      try { r = await remoteDetect(ac.signal); } catch (_) { r = await localDetect(); }
      const latency = Math.round(performance.now() - tStart);
      setResult({ ...r, model_version: r.model_version || `cu01-${latency}ms` });
    } catch (e: any) {
      if (String(e?.message || e).includes('timeout')) setError('La inferencia excedio 5s. Intenta nuevamente.');
      else setError(e?.message || 'Error de inferencia');
    } finally {
      clearTimeout(timeout); setDetecting(false);
    }
  };

  const RAG_EMOTIONS: { key: 'happy' | 'sad' | 'angry'; label: string; description: string }[] = [
    { key: 'happy', label: 'Feliz', description: 'Energía positiva y optimismo' },
    { key: 'sad', label: 'Triste', description: 'Introspectivo y melódico' },
    { key: 'angry', label: 'Intenso', description: 'Ritmos potentes y actitud' },
  ];

  const mapFerToRagEmotion = (e: Emotion): 'happy' | 'sad' | 'angry' => {
    if (e === 'joy') return 'happy';
    if (e === 'sadness') return 'sad';
    return 'angry';
  };

  const ragToInferenceEmotion: Record<'happy' | 'sad' | 'angry', Emotion> = {
    happy: 'joy',
    sad: 'sadness',
    angry: 'anger',
  };

  const coverFromApi = (t: RagTrack): string | null => {
    const candidates = [t.cover_url, t.image_url, t.thumbnail_url, t.artwork_url, (t as any).artworkUrl as string | undefined, t.artworkUrl100].filter(Boolean) as string[];
    if (!candidates.length) return null;
    let u = candidates[0];
    u = u.replace(/100x100bb\.(jpg|png)$/i, '300x300bb.$1');
    return u;
  };

  const fetchTracksForEmotion = async (overrideEmotion?: 'happy' | 'sad' | 'angry') => {
    const detectedEmotion = result?.emotion;
    if (!detectedEmotion && !overrideEmotion) return;
    const defaultEmotion = overrideEmotion ?? (intention === 'change' ? selectedEmotion : mapFerToRagEmotion(detectedEmotion!));
    if (!defaultEmotion) return;
    setSelectedEmotion(defaultEmotion);
    setTracksLoading(true); setTracksError(null); setTracks(null);
    try {
      const res = await ragApi.search({ emotion: defaultEmotion, min_tracks: 20 });
      setTracks(res);
    } catch (e: any) {
      setTracksError(e?.message || 'Error al buscar canciones');
    } finally {
      setTracksLoading(false);
    }
  };

  useEffect(() => {
    if (result?.emotion) {
      const mapped = mapFerToRagEmotion(result.emotion);
      setSelectedEmotion(mapped);
      if (typeof result.confidence === 'number') {
        setInferenceConfidence(result.confidence);
      }
      fetchTracksForEmotion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.emotion]);

  useEffect(() => {
    if (!tracks?.items?.length) { setSelectedTracks({}); return; }
    const limit = Math.max(1, showCount);
    const chunk = tracks.items.slice(0, limit);
    const selection: Record<string, RagTrack> = {};
    chunk.forEach((track) => { selection[trackKey(track)] = track; });
    setSelectedTracks(selection);
  }, [tracks, showCount]);

  useEffect(() => {
    if (!tracksLoading && tracks?.items?.length) {
      try { tracksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
    }
  }, [tracksLoading, tracks]);

  const savePlaylist = async () => {
    if (!sessionId || !user?.user_id) { setSaveError('Inicia sesión para guardar el playlist.'); return; }
    if (!result) { setSaveError('No hay resultado de FER para guardar.'); return; }
    if (!intention) { setSaveError('Selecciona una intención.'); return; }
    if (!playlistName.trim()) { setSaveError('Agrega un nombre para el playlist.'); return; }

    // Check if Spotify is connected
    if (!isConnected) {
      setSaveError('Necesitas conectar tu cuenta de Spotify primero.');
      return;
    }

    const tracksList = Object.values(selectedTracks);
    if (!tracksList.length) { setSaveError('Selecciona al menos una canción.'); return; }
    const providerUris = collectProviderUris(tracksList);
    if (!providerUris.length) { setSaveError('Las canciones seleccionadas no tienen URIs compatibles con Spotify.'); return; }
    setSaveError(null); setSaveMessage(null); setSavingPlaylist(true);
    try {
      // Get valid token (will refresh if expired)
      const spotifyAccessToken = await getValidToken();
      if (!spotifyAccessToken) {
        setSaveError('No se pudo obtener un token válido de Spotify. Por favor reconecta tu cuenta.');
        setSavingPlaylist(false);
        return;
      }

      const inferenceBody: InferenceCreate = {
        session_id: sessionId,
        emotion: intention === 'maintain' ? result.emotion : ragToInferenceEmotion[selectedEmotion],
        confidence: inferenceConfidence,
        intention,
        model_version: result.model_version,
      };
      const createdInference = await api.createInference(inferenceBody);
      const sampleTracks = tracksList.slice(0, 3).map(
        (track) => `${track.title || '(sin titulo)'} - ${track.artist || '(sin artista)'}`,
      );
      const description = [
        `Playlist creada con MoodTune (${intention === 'maintain' ? 'mantener' : 'cambiar'} estado de animo)`,
        `Canciones seleccionadas: ${tracksList.length}`,
        sampleTracks.length ? `Ejemplos: ${sampleTracks.join(' | ')}` : null,
      ].filter(Boolean).join('. ');
      const providerResult = await musicApi.createMoodtunePlaylist({
        provider: MUSIC_PROVIDER,
        provider_access_token: spotifyAccessToken,
        title: playlistName.trim(),
        description,
        uris: providerUris,
        user_id: user.user_id,
        inference_id: createdInference.inference_id,
        intention,
        emotion: inferenceBody.emotion,
      });

      // Save playlist reference in database
      await api.createPlaylist({
        user_id: user.user_id,
        provider: MUSIC_PROVIDER,
        external_playlist_id: providerResult.external_playlist_id,
        deep_link_url: providerResult.deep_link_url,
        title: providerResult.title,
        description: providerResult.description,
      });

      setSaveMessage(`Playlist creada en ${providerResult.provider} (${providerResult.tracks_added} canciones).`);
      setSavedPlaylistUrl(providerResult.deep_link_url);
      setSaved(createdInference.inference_id);
    } catch (e: any) {
      setSaveError(e?.message || 'No se pudo guardar el playlist');
    } finally {
      setSavingPlaylist(false);
    }
  };

  const displayedTracks = tracks?.items?.slice(0, Math.max(showCount, 1)) ?? [];
  const selectedCount = Object.keys(selectedTracks).length;
  const ragLinkEmotion = intention === 'change'
    ? selectedEmotion
    : (result ? mapFerToRagEmotion(result.emotion) : selectedEmotion);

  return (
    <div className="detect">
      <div className="detect__header">
        <div>
          <h2 className="detect__title">Detectar emoción y descubrir música</h2>
          <p className="detect__subtitle">Carga una imagen, detecta tu emoción y explora música personalizada</p>
        </div>
        <div
          className={`detect__fer-indicator ${ferStatus === 'ok' ? 'detect__fer-indicator--ok' : 'detect__fer-indicator--error'}`}
          title={
            ferStatus === 'ok'
              ? 'Servicio FER activo'
              : ferStatus === 'not_set'
              ? 'FER no configurado'
              : ferStatus === 'checking'
              ? 'Verificando FER...'
              : `FER no disponible${ferError ? ': ' + ferError : ''}`
          }
        >
          <span className="detect__fer-indicator__dot"></span>
          <span className="detect__fer-indicator__label">FER</span>
        </div>
      </div>

      {tokenError && <AppAlert tone="error">{tokenError}</AppAlert>}

      {!isConnected && (
        <AppAlert tone="warning">
          <strong>Conexión requerida:</strong> Necesitas conectar tu cuenta de Spotify para crear playlists.{' '}
          <Link to="/connect-spotify" style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
            Conectar Spotify ahora
          </Link>
        </AppAlert>
      )}

      {isConnected && (
        <>
          <AppAlert tone="success">
            Spotify conectado ✓
          </AppAlert>

          {/* Grid principal */}
          <div className="detect__grid">
        {/* Columna izquierda */}
        <div className="detect__uploader">
          <AppFilePicker
            file={file}
            previewUrl={previewUrl || undefined}
            onChange={(f) => onFileChange(f)}
            onClear={resetAll}
            accept="image/*"
            maxSizeMB={8}
            useDropzone
            errorText={error || null}
            label="Seleccionar imagen"
          />
          {previewUrl && (
            <div className="detect__preview">
              <img ref={imgRef} src={previewUrl} alt="preview" onLoad={() => setError(null)} onError={() => setError('Imagen invalida o corrupta')} />
            </div>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {/* Columna derecha */}
        <div className="detect__panel">
          <div className="detect__section">
            <h3 className="detect__section-title">1. Detectar emoción</h3>

            <label className="detect__consent">
              <input type="checkbox" checked={consent} onChange={(e)=>setConsent(e.target.checked)} />
              <span>Acepto que se procese mi imagen para detectar emociones</span>
            </label>

            <AppButton onClick={detect} disabled={!consent || !file || detecting} loading={detecting}>
              {detecting ? 'Detectando...' : 'Detectar emoción'}
            </AppButton>

            {error && <AppAlert tone="error">{error}</AppAlert>}

            {result && (
              <div className="detect__result">
                <div className="detect__result-item">
                  <span className="detect__result-label">Emoción:</span>
                  <span className="detect__result-value">{result.emotion}</span>
                </div>
                <div className="detect__result-item">
                  <span className="detect__result-label">Confianza:</span>
                  <span className="detect__result-value">{(result.confidence*100).toFixed(1)}%</span>
                </div>
                <div className="detect__result-item">
                  <span className="detect__result-label">Modelo:</span>
                  <span className="detect__result-value">{result.model_version || '-'}</span>
                </div>
              </div>
            )}
          </div>

          {result && (
            <div className="detect__section">
              <h3 className="detect__section-title">2. Descubrir música</h3>

              <div ref={tracksRef} className="detect__tracks">
                <div className="detect__tracks__toolbar">
                  <AppButton
                    type="button"
                    onClick={() => fetchTracksForEmotion(intention === 'change' ? selectedEmotion : undefined)}
                    disabled={tracksLoading}
                    loading={tracksLoading}
                  >
                    {tracksLoading ? 'Buscando...' : 'Descubrir canciones'}
                  </AppButton>

                <div className="detect__tracks__actions">
                  <AppFormField label="Mostrar">
                    <select className="select" value={showCount} onChange={(e)=>setShowCount(Number(e.target.value)||10)}>
                      {[5,10,15,20,30,50].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </AppFormField>

                  <Link to={`/explore?emotion=${ragLinkEmotion}`} className="muted" style={{ fontSize: 13 }}>
                    Ver más en Explorar ↗
                  </Link>
                </div>
              </div>

              {tracksError && <AppAlert tone="error">{tracksError}</AppAlert>}
              {tracks?.note && <div className="detect__note">{tracks.note}</div>}

              {!!displayedTracks.length && (
                <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                  <div className="detect__row" style={{ justifyContent: 'space-between' }}>
                    <div className="detect__tracks__summary">
                      Seleccionadas: <strong>{selectedCount}</strong> / {displayedTracks.length}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <AppButton type="button" variant="ghost" onClick={() => selectAllDisplayed(displayedTracks)}>Seleccionar todo</AppButton>
                      <AppButton type="button" variant="ghost" onClick={clearSelection}>Limpiar</AppButton>
                    </div>
                  </div>

                  <div className="detect__tracks__grid">
                    {displayedTracks.map((t, idx) => {
                      const cover = coverFromApi(t as RagTrack);
                      const linkInfo = linkInfoForTrack(t as any);
                      const providerLabel = linkInfo
                        ? linkInfo.kind === 'spotify'
                          ? 'Spotify'
                          : linkInfo.kind === 'itunes'
                            ? 'Apple Music'
                            : 'sitio web'
                        : null;
                      const linkA11y = linkInfo && providerLabel
                        ? ['Abrir en ' + providerLabel, t.title, t.artist].filter(Boolean).join(' - ')
                        : null;
                      const key = trackKey(t);
                      const checked = !!selectedTracks[key];
                      return (
                        <AppTrackItem
                          key={`${t.id || t.uri || idx}`}
                          checked={checked}
                          title={t.title}
                          artist={t.artist}
                          coverUrl={cover}
                          linkInfo={linkInfo ?? undefined}
                          linkLabel={linkA11y ?? undefined}
                          onToggle={() => toggleTrackSelection(t)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              </div>
            </div>
          )}

          {result && (
            <div className="detect__section">
              <h3 className="detect__section-title">3. Crear playlist</h3>

              <AppFormField label="Intención">
                <select className="select" value={intention} onChange={(e)=>{ setIntention(e.target.value as any); setSaveError(null); setSaveMessage(null); setSaved(null); }}>
                  <option value="">Selecciona...</option>
                  <option value="maintain">Mantener mi emoción actual</option>
                  <option value="change">Cambiar a otra emoción</option>
                </select>
              </AppFormField>

              {intention === 'change' && (
                <AppFormField
                  label="Emoción objetivo"
                  hint="Cambia la emoción y luego presiona 'Descubrir canciones' para actualizar."
                >
                  <select className="select" value={selectedEmotion} onChange={(e)=>handleTargetEmotionChange(e.target.value as 'happy' | 'sad' | 'angry')}>
                    {RAG_EMOTIONS.map((e) => (
                      <option key={e.key} value={e.key}>{e.label}</option>
                    ))}
                  </select>
                </AppFormField>
              )}

              <AppFormField label="Confianza para la inferencia" inline>
                <input
                  className="range"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={inferenceConfidence}
                  onChange={(e)=>setInferenceConfidence(Number(e.target.value))}
                />
                <span>{(inferenceConfidence * 100).toFixed(1)}%</span>
              </AppFormField>

              <AppFormField label="Nombre del playlist">
                <input
                  className="text"
                  value={playlistName}
                  onChange={(e)=>{ setPlaylistName(e.target.value); setSaveError(null); setSaveMessage(null); }}
                  placeholder="Ej. Roadtrip Chill"
                />
              </AppFormField>

              <AppButton
                type="button"
                onClick={savePlaylist}
                disabled={savingPlaylist || !playlistName.trim() || !selectedCount || !intention || !isConnected}
                loading={savingPlaylist}
              >
                {savingPlaylist ? 'Guardando...' : 'Guardar Playlist en Spotify'}
              </AppButton>

              {saveError && <AppAlert tone="error">{saveError}</AppAlert>}
              {saveMessage && (
                <AppAlert tone="success">
                  {saveMessage}{' '}
                  {savedPlaylistUrl && (
                    <a href={savedPlaylistUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
                      Abrir en Spotify
                    </a>
                  )}
                </AppAlert>
              )}
              {saved && <div className="muted" style={{ fontSize: 12 }}>Inferencia registrada: {saved}</div>}

              <div className="muted" style={{ fontSize: 13, marginTop: '8px' }}>
                Si no se detecta rostro o la imagen está borrosa, intenta con otra imagen.
              </div>
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
