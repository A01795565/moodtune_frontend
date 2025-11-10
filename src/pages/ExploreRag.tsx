import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ragApi, type RagSearchResponse } from '../api/rag';
import AppButton from '../components/AppButton';
import AppAlert from '../components/AppAlert';
import AppFormField from '../components/AppFormField';
import AppEmotionTile from '../components/AppEmotionTile';
import AppTrackCard from '../components/AppTrackCard';

import './ExploreRag.css';

type EmotionKey = 'happy' | 'sad' | 'angry' | 'relaxed';
const EMOTIONS: { key: EmotionKey; label: string; emoji: string; hint: string }[] = [
  { key: 'happy', label: 'Feliz',    emoji: '😊', hint: 'positivo, energético' },
  { key: 'sad',   label: 'Triste',   emoji: '😢', hint: 'introspectivo, suave' },
  { key: 'angry', label: 'Intenso',  emoji: '😤', hint: 'alto pulso, potente' },
  { key: 'relaxed', label: 'Relajado', emoji: '😌', hint: 'tranquilo, chill' },
];

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

  useEffect(() => {
    const q = (searchParams.get('emotion') || '').toLowerCase();
    const allowed: EmotionKey[] = ['happy','sad','angry','relaxed'];
    if (allowed.includes(q as EmotionKey)) setEmotion(q as EmotionKey);
  }, [searchParams]);

  return (
    <div className="explore">
      <h2 className="explore__title">Explorar música por emoción</h2>
      <p className="explore__subtitle">Selecciona cómo te sientes y descubre canciones alineadas a ese estado.</p>

      <form onSubmit={onSubmit} className="explore__form" noValidate>
        {/* Emociones */}
        <div className="explore__emogrid">
          {EMOTIONS.map((e) => (
            <AppEmotionTile
              key={e.key}
              emoji={e.emoji}
              label={e.label}
              hint={e.hint}
              active={e.key === emotion}
              onClick={() => setEmotion(e.key)}
            />
          ))}
        </div>

        {/* Controles */}
        <div className="explore__controls">
          <AppFormField label="Cantidad mínima" inline>
            <input
              className="range"
              type="range"
              min={10}
              max={60}
              value={minTracks}
              onChange={(evt)=> setMinTracks(Number(evt.target.value))}
            />
            <span style={{ width: 30, textAlign: 'right' }}>{minTracks}</span>
          </AppFormField>

          <AppButton type="submit" disabled={loading} loading={loading}>
            {loading ? 'Buscando…' : 'Buscar canciones'}
          </AppButton>

          <Link to="/detect" className="explore__spacer muted" style={{ fontSize: 14 }}>
            ¿No sabes tu emoción? Detecta aquí
          </Link>
        </div>
      </form>

      {error && <AppAlert tone="error">{error}</AppAlert>}

      {data && (
        <div style={{ marginTop: 4 }}>
          {data.note && <div className="explore__note">{data.note}</div>}

          <div className="explore__summary">
            Emoción “{data.emotion}”. Resultados: {data.returned}. Mostrando hasta {Math.max(data.requested_min * 2, 50)}.
          </div>

          <div className="explore__grid">
            {data.items?.map((t, idx) => (
              <AppTrackCard key={`${t.id || t.uri || idx}`} t={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
