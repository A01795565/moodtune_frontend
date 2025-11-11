import './AppTrackItem.css';

type Props = {
  checked: boolean;
  title?: string | null;
  artist?: string | null;
  coverUrl?: string | null;
  linkUrl?: string | null;
  onToggle: () => void;
};

export default function AppTrackItem({ checked, title, artist, coverUrl, linkUrl, onToggle }: Props) {
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
        {linkUrl && (
          <a className="track__link" href={linkUrl} target="_blank" rel="noreferrer">Abrir ↗</a>
        )}
      </div>
    </label>
  );
}
