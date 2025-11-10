import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { ferApi } from '../api/fer';
import { ragApi, type RagSearchResponse, type RagTrack } from '../api/rag';
import type { Emotion, InferenceCreate, PlaylistCreate } from '../types/api';

type DetectionResult = { emotion: Emotion; confidence: number; model_version?: string };

const trackKey = (track: RagTrack) => {
  const parts = [track.id, track.uri, track.title, track.artist].filter(Boolean);
  return parts.length ? parts.join('|') : `${track.cover_url || 'track'}-${track.preview_url || ''}`;
};

const generatePlaylistId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
};

export default function DetectEmotion() {
  const { sessionId, user } = useAuth();
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
  // Sugerencias desde RAG
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
  const [inferenceConfidence, setInferenceConfidence] = useState(0.5);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  // Comprobar salud del servicio FER si está configurado
  useEffect(() => {
    checkFerNow();
  }, []);

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
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = track;
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedTracks({});

  const selectAllDisplayed = (tracksToSelect: RagTrack[]) => {
    const next: Record<string, RagTrack> = {};
    tracksToSelect.forEach((track) => {
      next[trackKey(track)] = track;
    });
    setSelectedTracks(next);
  };

  const handleTargetEmotionChange = (value: 'happy' | 'sad' | 'angry') => {
    setSelectedEmotion(value);
    setSaveError(null);
    setSaveMessage(null);
    setSaved(null);
    if (intention === 'change') {
      fetchTracksForEmotion(value);
    }
  };

  const onFileChange = (f: File | null) => {
    setResult(null); setError(null); setSaved(null);
    setTracks(null); setTracksError(null);
    if (!f) { setFile(null); setPreviewUrl(null); return; }
    if (!/^image\//.test(f.type)) { setError('Selecciona una imagen valida.'); return; }
    if (f.size > 8 * 1024 * 1024) { setError('La imagen supera 8MB.'); return; }
    setFile(f); setPreviewUrl(URL.createObjectURL(f));
  };

  // Fallback local: calcula brillo medio y deriva emocion
  const localDetect = async (): Promise<DetectionResult> => {
    const img = imgRef.current; const canvas = canvasRef.current;
    if (!img || !canvas) throw new Error('Imagen no lista');
    const maxDim = 256; // limitar para rendimiento
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
    const mean = sum / count / 255; // 0..1
    let emotion: Emotion; let confidence: number;
    if (mean >= 0.66) { emotion = 'joy'; confidence = 0.85 + (mean - 0.66) * 0.15; }
    else if (mean <= 0.33) { emotion = 'sadness'; confidence = 0.85 + (0.33 - mean) * 0.15; }
    else { emotion = 'anger'; confidence = 0.75 + (0.5 - Math.abs(0.5 - mean)) * 0.25; }
    return { emotion, confidence: Math.min(0.99, Math.max(0.5, Number(confidence.toFixed(2)))) , model_version: 'local-fallback-0.1' };
  };

  // Remoto via ferApi: usa VITE_FER_ENDPOINT_URL
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
      try {
        r = await remoteDetect(ac.signal);
      } catch (_) {
        r = await localDetect();
      }
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

  // Helpers de presentación para tracks
  const coverFromApi = (t: RagTrack): string | null => {
    const candidates = [t.cover_url, t.image_url, t.thumbnail_url, t.artwork_url, (t as any).artworkUrl as string | undefined, t.artworkUrl100].filter(Boolean) as string[];
    if (!candidates.length) return null;
    let u = candidates[0];
    u = u.replace(/100x100bb\.(jpg|png)$/i, '300x300bb.$1');
    return u;
  };
  const httpLinkFromUri = (u?: string | null): string | null => {
    const x = (u || '').trim();
    return /^https?:\/\//i.test(x) ? x : null;
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

  // Auto-buscar canciones cuando haya resultado de emoción
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
    if (!tracks?.items?.length) {
      setSelectedTracks({});
      return;
    }
    const limit = Math.max(1, showCount);
    const chunk = tracks.items.slice(0, limit);
    const selection: Record<string, RagTrack> = {};
    chunk.forEach((track) => {
      selection[trackKey(track)] = track;
    });
    setSelectedTracks(selection);
  }, [tracks, showCount]);

  // Auto scroll a la lista cuando llega
  useEffect(() => {
    if (!tracksLoading && tracks?.items?.length) {
      try { tracksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
    }
  }, [tracksLoading, tracks]);

  const savePlaylist = async () => {
    if (!sessionId || !user?.user_id) {
      setSaveError('Inicia sesión para guardar el playlist.');
      return;
    }
    if (!result) {
      setSaveError('No hay resultado de FER para guardar.');
      return;
    }
    if (!intention) {
      setSaveError('Selecciona una intención.');
      return;
    }
    if (!playlistName.trim()) {
      setSaveError('Agrega un nombre para el playlist.');
      return;
    }
    const tracksList = Object.values(selectedTracks);
    if (!tracksList.length) {
      setSaveError('Selecciona al menos una canción.');
      return;
    }
    setSaveError(null);
    setSaveMessage(null);
    setSavingPlaylist(true);
    try {
      const inferenceBody: InferenceCreate = {
        session_id: sessionId,
        emotion: intention === 'maintain' ? result.emotion : ragToInferenceEmotion[selectedEmotion],
        confidence: inferenceConfidence,
        intention,
        model_version: result.model_version,
      };
      const createdInference = await api.createInference(inferenceBody);
      const playlistId = generatePlaylistId();
      const summary = {
        count: tracksList.length,
        inference_id: createdInference.inference_id,
        intention,
        tracks: tracksList.slice(0, 3).map((track) => `${track.title || '—'} — ${track.artist || '—'}`),
      };
      const playlistBody: PlaylistCreate = {
        user_id: user.user_id,
        provider: 'spotify',
        external_playlist_id: playlistId,
        deep_link_url: `https://open.spotify.com/playlist/${playlistId}`,
        title: playlistName.trim(),
        description: JSON.stringify(summary),
      };
      await api.createPlaylist(playlistBody);
      setSaveMessage(`Playlist guardada con ${tracksList.length} canciones y la inferencia ${createdInference.inference_id}.`);
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
    <div>
      <h2>Detectar emoción y descubrir música</h2>
      <p style={{ color: '#666' }}>1) Carga una imagen. 2) Detecta tu emoción. 3) Explora canciones alineadas.</p>
      <div style={{ margin: '12px 0', padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={consent} onChange={(e)=>setConsent(e.target.checked)} />
            <span>Consentimiento para procesar esta imagen (FER).</span>
          </label>
          <div style={{ display: 'grid', gap: 6, justifyItems: 'end', minWidth: 260, flex: '1 1 260px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: 12,
                  background: ferStatus === 'ok' ? '#def7ec' : ferStatus === 'not_set' ? '#eef2ff' : '#fde8e8',
                  color: ferStatus === 'ok' ? '#03543f' : ferStatus === 'not_set' ? '#3730a3' : '#9b1c1c',
                  fontSize: 13,
                }}
                title={
                  ferStatus === 'ok'
                    ? 'FER remoto operativo'
                    : ferStatus === 'not_set'
                    ? 'VITE_FER_ENDPOINT_URL no configurado'
                    : ferStatus === 'checking'
                    ? 'Comprobando FER'
                    : 'FER no disponible'
                }
              >
                FER: {ferStatus === 'checking' ? 'comprobando…' : ferStatus === 'ok' ? 'remoto activo' : ferStatus === 'not_set' ? 'no configurado' : 'no disponible'}
              </span>
              <button onClick={checkFerNow} disabled={ferStatus === 'checking'} style={{ padding: '6px 10px' }}>
                Check Status
              </button>
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.4, color: ferStatus === 'error' ? '#9b1c1c' : '#475569', textAlign: 'right' }}>
              <div>
                Endpoint: {import.meta.env.VITE_FER_ENDPOINT_URL || 'no definido'}
                {ferError ? ` — Error: ${ferError}` : ''}
              </div>
              <div>
                Endpoint efectivo: {ferApi.effectiveEndpoint() || 'no definido'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        <div>
          <div style={{ marginBottom: 8 }}>
            <input ref={inputRef} type="file" accept="image/*" onChange={(e)=>onFileChange(e.target.files?.[0] || null)} />
            <button onClick={resetAll} style={{ marginLeft: 8 }}>Limpiar</button>
          </div>
          {previewUrl && (
            <div>
              <img ref={imgRef} src={previewUrl} alt="preview" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #eee' }} onLoad={() => setError(null)} onError={() => setError('Imagen invalida o corrupta')} />
            </div>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
        <div>
          <div style={{ display: 'grid', gap: 10 }}>
            <button onClick={detect} disabled={!consent || !file || detecting} style={{ padding: '8px 12px' }}>
              {detecting ? 'Detectando…' : 'Detectar emoción'}
            </button>
            {error && <div style={{ color: 'crimson' }}>{error}</div>}
            {result && (
              <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                <div><strong>Emoción:</strong> {result.emotion}</div>
                <div><strong>Confianza:</strong> {(result.confidence*100).toFixed(1)}%</div>
                <div><strong>Modelo:</strong> {result.model_version || '-'}</div>
              </div>
            )}
            {result && (

              <div ref={tracksRef} style={{ border: '1px dashed #cbd5e1', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => fetchTracksForEmotion(intention === 'change' ? selectedEmotion : undefined)}
                    disabled={tracksLoading}
                    style={{ padding: '6px 10px' }}
                  >
                    {tracksLoading ? 'Buscando canciones…' : 'Descubrir canciones para esta emoción'}
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                    <label style={{ fontSize: 13 }}>Mostrar
                      <select value={showCount} onChange={(e)=>setShowCount(Number(e.target.value)||10)} style={{ marginLeft: 6 }}>
                        {[5,10,15,20,30,50].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </label>
                    <Link to={`/explore?emotion=${ragLinkEmotion}`} style={{ fontSize: 13 }}>Ver más en Explorar ↗</Link>
                  </div>
                </div>
                {tracksError && <div style={{ color: 'crimson', marginTop: 8 }}>{tracksError}</div>}
                {tracks?.note && (
                  <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', padding: 8, borderRadius: 6, marginTop: 8 }}>
                    {tracks.note}
                  </div>
                )}
                {displayedTracks.length ? (
                  <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ fontSize: 13, color: '#334155' }}>
                        Seleccionadas: <strong>{selectedCount}</strong> / {displayedTracks.length}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" onClick={() => selectAllDisplayed(displayedTracks)} style={{ fontSize: 12, padding: '4px 10px' }}>Seleccionar todo</button>
                        <button type="button" onClick={clearSelection} style={{ fontSize: 12, padding: '4px 10px' }}>Limpiar</button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                      {displayedTracks.map((t, idx) => {
                        const cover = coverFromApi(t as RagTrack);
                        const link = httpLinkFromUri(t.uri);
                        const key = trackKey(t);
                        const checked = !!selectedTracks[key];
                        return (
                          <label key={`${t.id || t.uri || idx}`} style={{ display: 'grid', gridTemplateColumns: '30px 56px 1fr auto', gap: 10, alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: 10, padding: 8, background: '#fff' }}>
                            <input type="checkbox" checked={checked} onChange={() => toggleTrackSelection(t)} style={{ justifySelf: 'center' }} />
                            <div style={{ width: 48, height: 48, borderRadius: 6, overflow: 'hidden', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {cover ? (
                                <img src={cover} alt="Carátula" width={48} height={48} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ fontSize: 10, color: '#888' }}>Sin<br/>carátula</div>
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, lineHeight: 1.2 }}>{t.title || '—'}</div>
                              <div style={{ color: '#555', fontSize: 13 }}>{t.artist || '—'}</div>
                            </div>
                            <div>
                              {link && <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>Abrir ↗</a>}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
            {/* Estado FER movido a barra superior */}
            <label>
              Intención
              <select value={intention} onChange={(e)=>{ setIntention(e.target.value as any); setSaveError(null); setSaveMessage(null); setSaved(null); }}>
                <option value="">Selecciona...</option>
                <option value="maintain">Mantener</option>
                <option value="change">Cambiar</option>
              </select>
            </label>
            {intention === 'change' && (
              <label>
                Emoción objetivo
                <select value={selectedEmotion} onChange={(e)=>handleTargetEmotionChange(e.target.value as 'happy' | 'sad' | 'angry')}>
                  {RAG_EMOTIONS.map((e) => (
                    <option key={e.key} value={e.key}>{e.label}</option>
                  ))}
                </select>
                <small style={{ color: '#475569' }}>Cambia la emoción y luego presiona "Descubrir canciones" para actualizar.</small>
              </label>
            )}
            <label style={{ display: 'grid', gap: 4 }}>
              Confianza para la inferencia
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="range" min={0} max={1} step={0.01} value={inferenceConfidence} onChange={(e)=>setInferenceConfidence(Number(e.target.value))} style={{ flex: 1 }} />
                <span>{(inferenceConfidence * 100).toFixed(1)}%</span>
              </div>
            </label>
            <label>
              Nombre del playlist
              <input value={playlistName} onChange={(e)=>{ setPlaylistName(e.target.value); setSaveError(null); setSaveMessage(null); }} placeholder="Ej. Roadtrip Chill" />
            </label>
            <button type="button" onClick={savePlaylist} disabled={savingPlaylist || !playlistName.trim() || !selectedCount || !intention} style={{ padding: '10px 14px' }}>
              {savingPlaylist ? 'Guardando Playlist…' : 'Guardar Playlist'}
            </button>
            {saveError && <div style={{ color: 'crimson' }}>{saveError}</div>}
            {saveMessage && <div style={{ color: 'green' }}>{saveMessage}</div>}
            {saved && <div style={{ fontSize: 12, color: '#334155' }}>Inferencia registrada: {saved}</div>}
            <div style={{ color: '#666' }}>
              1). Si no se detecta rostro o la imagen está borrosa, intenta con otra. 2). Ante error/timeout puedes reintentar.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
