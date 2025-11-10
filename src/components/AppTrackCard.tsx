import React, { useMemo } from 'react';
import './AppTrackCard.css';
import { ProviderIcon } from '../components/ProviderIcon'; // ruta original indicada por ti
import type { RagTrack } from '../api/rag';
import AppMetricChip from './AppMetricChip';
import { linkInfoForTrack } from '../utils/links';

function coverFromApi(t: RagTrack): string | null {
  const candidates = [t.cover_url, t.image_url, t.thumbnail_url, t.artwork_url, (t as any).artworkUrl as string | undefined, t.artworkUrl100].filter(Boolean) as string[];
  if (!candidates.length) return null;
  let u = candidates[0];
  u = u.replace(/100x100bb\.(jpg|png)$/i, '300x300bb.$1');
  return u;
}

export default function AppTrackCard({ t }: { t: RagTrack }) {
  const coverUrl = coverFromApi(t);
  const link = useMemo(() => linkInfoForTrack(t as any), [t]);
  const linkA11y = useMemo(() => {
    if (!link) return null;
    const provider = link.kind === 'spotify' ? 'Spotify' : link.kind === 'itunes' ? 'Apple Music' : 'web';
    const base = `Abrir en ${provider}`;
    return [base, t.title, t.artist].filter(Boolean).join(' · ');
  }, [link, t.title, t.artist]);

  return (
    <article className="trackc">
      <div className="trackc__row">
        <div className="trackc__cover">
          {coverUrl ? (
            <img src={coverUrl} alt="Carátula" loading="lazy" width={64} height={64} />
          ) : (
            <div className="trackc__nocover">Sin carátula</div>
          )}
        </div>
        <div className="trackc__meta">
          <div className="trackc__title">{t.title || '—'}</div>
          <div className="trackc__artist">{t.artist || '—'}</div>
        </div>
        <div className="trackc__actions">
          {link && linkA11y && (
            <a className="trackc__link" href={link.url} target="_blank" rel="noreferrer" aria-label={linkA11y} title={linkA11y}>
              <ProviderIcon kind={link.kind} size={16} />
            </a>
          )}
        </div>
      </div>

      <div>
        {t.preview_url ? <audio src={t.preview_url} controls className="trackc__audio" /> : <div className="trackc__noprev">Sin preview</div>}
      </div>

      <div>
        <AppMetricChip label="Valence" value={t.valence} />
        <AppMetricChip label="Energy" value={t.energy} />
        {t.mood && <span className="trackc__mood">mood: {t.mood}</span>}
      </div>
    </article>
  );
}
