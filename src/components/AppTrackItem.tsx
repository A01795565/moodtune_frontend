import './AppTrackItem.css';
import { ProviderIcon } from './ProviderIcon';
import type { LinkInfoKind } from '../utils/links';

type TrackLinkInfo = {
  url: string;
  kind: LinkInfoKind;
};

type Props = {
  checked: boolean;
  title?: string | null;
  artist?: string | null;
  coverUrl?: string | null;
  linkInfo?: TrackLinkInfo;
  linkLabel?: string;
  onToggle: () => void;
};

export default function AppTrackItem({
  checked,
  title,
  artist,
  coverUrl,
  linkInfo,
  linkLabel,
  onToggle,
}: Props) {
  const providerLabel = linkInfo
    ? linkInfo.kind === 'spotify'
      ? 'Spotify'
      : linkInfo.kind === 'itunes'
        ? 'Apple Music'
        : 'sitio web'
    : undefined;
  const fallbackLabel = providerLabel ? `Abrir en ${providerLabel}` : undefined;
  const ariaLabel = linkLabel || fallbackLabel;
  return (
    <label className="track">
      <input className="track__check" type="checkbox" checked={checked} onChange={onToggle} />
      <div className="track__cover">
        {coverUrl ? (
          <img src={coverUrl} alt="Carátula" width={48} height={48} />
        ) : (
          <div className="track__noimg">Sin<br/>carátula</div>
        )}
      </div>
      <div className="track__meta">
        <div className="track__title">{title || '—'}</div>
        <div className="track__artist">{artist || '—'}</div>
      </div>
      <div className="track__actions">
        {linkInfo && (
          <a
            className="track__link"
            href={linkInfo.url}
            target="_blank"
            rel="noreferrer"
            aria-label={ariaLabel}
            title={ariaLabel}
          >
            <ProviderIcon kind={linkInfo.kind} size={18} />
          </a>
        )}
      </div>
    </label>
  );
}
