import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ragApi, type RagSearchResponse } from '../api/rag';
import AppButton from '../components/AppButton';
import AppAlert from '../components/AppAlert';
import AppFormField from '../components/AppFormField';
import AppEmotionTile from '../components/AppEmotionTile';
import AppTrackCard from '../components/AppTrackCard';
import AppCard from '../components/AppCard';

import './ExploreRag.css';

type EmotionKey = 'happy' | 'sad' | 'angry' | 'relaxed';
const EMOTIONS: { key: EmotionKey; label: string; emoji: string; hint: string; description: string }[] = [
  { key: 'happy', label: 'Feliz', emoji: '😊', hint: 'positivo, energético', description: 'Canciones alegres y optimistas' },
  { key: 'sad', label: 'Triste', emoji: '😢', hint: 'introspectivo, suave', description: 'Canciones melancólicas y emotivas' },
  { key: 'angry', label: 'Intenso', emoji: '😤', hint: 'alto pulso, potente', description: 'Canciones potentes y energéticas' },
  { key: 'relaxed', label: 'Relajado', emoji: '😌', hint: 'tranquilo, chill', description: 'Canciones suaves y calmantes' },
];

export default function ExploreRag() {
  const [searchParams] = useSearchParams();
  const [emotion, setEmotion] = useState<EmotionKey>('happy');
  const [minTracks, setMinTracks] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RagSearchResponse | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate form
    setValidationError(null);
    if (minTracks < 10 || minTracks > 60) {
      setValidationError('La cantidad debe estar entre 10 y 60');
      return;
    }

    setError(null);
    setLoading(true);
    setData(null);

    try {
      const res = await ragApi.search({ emotion, min_tracks: minTracks });
      setData(res);
      setValidationError(null);
    } catch (e: any) {
      const errorMessage = e?.message || 'Error al buscar canciones';
      setError(errorMessage);
      console.error('Error searching tracks:', e);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setData(null);
    setError(null);
    setValidationError(null);
  };

  useEffect(() => {
    const q = (searchParams.get('emotion') || '').toLowerCase();
    const allowed: EmotionKey[] = ['happy','sad','angry','relaxed'];
    if (allowed.includes(q as EmotionKey)) setEmotion(q as EmotionKey);
  }, [searchParams]);

  const selectedEmotion = EMOTIONS.find(e => e.key === emotion);

  return (
    <div className="explore">
      <div className="explore__header">
        <h1 className="explore__title">Explorar Música por Emoción</h1>
        <p className="explore__subtitle">
          Selecciona cómo te sientes y descubre canciones perfectas para tu estado de ánimo.
        </p>
      </div>

      <AppCard fullWidth>
        <form onSubmit={onSubmit} className="explore__form" noValidate>
          {/* Selected emotion info */}
          {selectedEmotion && (
            <div className="explore__selected-emotion">
              <div className="explore__selected-emotion-icon">{selectedEmotion.emoji}</div>
              <div className="explore__selected-emotion-info">
                <h3>Emoción seleccionada: {selectedEmotion.label}</h3>
                <p>{selectedEmotion.description}</p>
              </div>
            </div>
          )}

          {/* Emociones */}
          <div className="explore__section">
            <h4 className="explore__section-title">Selecciona tu emoción</h4>
            <div className="explore__emogrid">
              {EMOTIONS.map((e) => (
                <AppEmotionTile
                  key={e.key}
                  emoji={e.emoji}
                  label={e.label}
                  hint={e.hint}
                  active={e.key === emotion}
                  onClick={() => {
                    setEmotion(e.key);
                    setValidationError(null);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Controles */}
          <div className="explore__section">
            <h4 className="explore__section-title">Configuración de búsqueda</h4>
            <div className="explore__controls">
              <AppFormField label="Cantidad mínima de canciones" hint={`Seleccionado: ${minTracks} canciones`}>
                <input
                  className="range"
                  type="range"
                  min={10}
                  max={60}
                  value={minTracks}
                  onChange={(evt) => {
                    setMinTracks(Number(evt.target.value));
                    setValidationError(null);
                  }}
                  aria-label="Cantidad mínima de canciones"
                />
              </AppFormField>

              <div className="explore__actions">
                <AppButton type="submit" disabled={loading || !!validationError} loading={loading}>
                  {loading ? 'Buscando...' : 'Buscar Canciones'}
                </AppButton>
                {data && (
                  <AppButton type="button" variant="ghost" onClick={clearResults} disabled={loading}>
                    Limpiar Resultados
                  </AppButton>
                )}
              </div>

              <Link to="/detect" className="explore__detect-link">
                ¿No sabes tu emoción? <strong>Detecta aquí →</strong>
              </Link>
            </div>
          </div>
        </form>
      </AppCard>

      {/* Alerts */}
      {validationError && <AppAlert tone="warning">{validationError}</AppAlert>}
      {error && <AppAlert tone="error">{error}</AppAlert>}

      {/* Loading state */}
      {loading && (
        <AppCard>
          <div className="explore__loading">
            <div className="explore__loading-icon">🎵</div>
            <h3>Buscando canciones perfectas...</h3>
            <p>Estamos explorando nuestro catálogo para encontrar las mejores canciones para tu emoción.</p>
          </div>
        </AppCard>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="explore__results">
          {data.note && <AppAlert tone="info">{data.note}</AppAlert>}

          <AppCard fullWidth>
            <div className="explore__results-header">
              <div className="explore__results-title">
                <h2>Resultados para "{data.emotion}"</h2>
                <div className="explore__results-stats">
                  <span className="explore__results-stat">
                    <strong>{data.returned}</strong> {data.returned === 1 ? 'canción encontrada' : 'canciones encontradas'}
                  </span>
                  {data.requested_min && (
                    <span className="explore__results-stat">
                      Mostrando hasta {Math.max(data.requested_min * 2, 50)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {data.items && data.items.length > 0 ? (
              <div className="explore__grid">
                {data.items.map((t, idx) => (
                  <AppTrackCard key={`${t.id || t.uri || idx}`} t={t} />
                ))}
              </div>
            ) : (
              <div className="explore__empty">
                <div className="explore__empty-icon">🎵</div>
                <h3>No se encontraron canciones</h3>
                <p>Intenta ajustar tu búsqueda o selecciona una emoción diferente.</p>
              </div>
            )}
          </AppCard>
        </div>
      )}
    </div>
  );
}
