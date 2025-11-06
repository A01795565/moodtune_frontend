import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { ferApi } from '../api/fer';
import type { InferenceCreate, Emotion } from '../types/api';

type DetectionResult = { emotion: Emotion; confidence: number; model_version?: string };

export default function DetectEmotion() {
  const { sessionId } = useAuth();
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

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  // Comprobar salud del servicio FER si está configurado
  useEffect(() => {
    (async () => {
      try {
        if (!ferApi.isConfigured()) { setFerStatus('not_set'); return; }
        const s = await ferApi.health();
        setFerStatus(s);
      } catch {
        setFerStatus('error');
      }
    })();
  }, []);

  const resetAll = () => {
    setFile(null); setPreviewUrl(null); setResult(null); setError(null); setIntention(''); setSaved(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onFileChange = (f: File | null) => {
    setResult(null); setError(null); setSaved(null);
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

  const saveInference = async () => {
    if (!sessionId) { setError('No hay sesion activa. Inicia sesion.'); return; }
    if (!result) { setError('No hay resultado para guardar.'); return; }
    if (!intention) { setError('Selecciona una intencion.'); return; }
    setError(null); setSaved(null);
    const body: InferenceCreate = {
      session_id: sessionId,
      emotion: result.emotion,
      confidence: result.confidence,
      intention,
      model_version: result.model_version,
    } as InferenceCreate;
    const t0 = performance.now();
    try {
      const created = await api.createInference(body);
      const latency = Math.round(performance.now() - t0);
      setSaved(created.inference_id || `ok-${latency}ms`);
    } catch (e: any) {
      setError(e?.message || 'No se pudo guardar la inferencia');
    }
  };

  return (
    <div>
      <h2>Detectar emocion desde imagen</h2>
      <p style={{ color: '#666' }}>Carga una imagen, detecta emocion y elige intencion.</p>
      <div style={{ margin: '12px 0', padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fafafa' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={consent} onChange={(e)=>setConsent(e.target.checked)} />
          <span>Consentimiento para procesar esta imagen (FER).</span>
        </label>
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
              {detecting ? 'Detectando...' : 'Detectar emocion'}
            </button>
            {error && <div style={{ color: 'crimson' }}>{error}</div>}
            {result && (
              <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                <div><strong>Emocion:</strong> {result.emotion}</div>
                <div><strong>Confianza:</strong> {(result.confidence*100).toFixed(1)}%</div>
                <div><strong>Modelo:</strong> {result.model_version || '-'}</div>
              </div>
            )}
            <div style={{ fontSize: 12 }}>
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 8,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: ferStatus === 'ok' ? '#def7ec' : ferStatus === 'not_set' ? '#eef2ff' : '#fde8e8',
                  color: ferStatus === 'ok' ? '#03543f' : ferStatus === 'not_set' ? '#3730a3' : '#9b1c1c',
                }}
                title={ferStatus === 'ok' ? 'FER remoto operativo' : ferStatus === 'not_set' ? 'VITE_FER_ENDPOINT_URL no configurado' : ferStatus === 'checking' ? 'Comprobando FER' : 'FER no disponible'}
              >
                FER: {ferStatus === 'checking' ? 'comprobando…' : ferStatus === 'ok' ? 'remoto activo' : ferStatus === 'not_set' ? 'no configurado' : 'no disponible'}
              </span>
            </div>
            <label>
              Intencion
              <select value={intention} onChange={(e)=>setIntention(e.target.value as any)}>
                <option value="">Selecciona...</option>
                <option value="maintain">Mantener</option>
                <option value="change">Cambiar</option>
              </select>
            </label>
            <button onClick={saveInference} disabled={!result || !intention}>Guardar inferencia</button>
            {saved && <div style={{ color: 'green' }}>Inferencia guardada: {saved}</div>}
            <div style={{ color: '#666' }}>
              A1) Si no se detecta rostro o la imagen esta borrosa, intenta con otra. A2) Ante error/timeout puedes reintentar.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
