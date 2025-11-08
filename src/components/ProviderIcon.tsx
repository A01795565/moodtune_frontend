import type { LinkInfoKind } from '../utils/links';

type Props = {
  kind: LinkInfoKind;
  size?: number;
  title?: string;
  style?: React.CSSProperties;
};

// Iconos ligeros para proveedores: Spotify / Apple Music (iTunes) / genérico web.
export function ProviderIcon({ kind, size = 14, title, style }: Props) {
  if (kind === 'spotify') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        role="img"
        aria-label={title || 'Spotify'}
        style={style}
      >
        <circle cx="12" cy="12" r="10" fill="#1DB954" />
        <path d="M7 9.5c3.6-1 7.6-.8 10.8.6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity=".9" />
        <path d="M7.5 12.2c3-1 6.2-.7 9 .5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".9" />
        <path d="M7.8 14.8c2.6-.7 5-.4 7 .4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".9" />
      </svg>
    );
  }

  if (kind === 'itunes') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        role="img"
        aria-label={title || 'Apple Music'}
        style={style}
      >
        <circle cx="12" cy="12" r="10" fill="#FA2D48" />
        {/* Nota musical simple */}
        <path d="M10 7v7.2a2.2 2.2 0 1 1-1.4-2.1V8.2l7-1.6v6.6a2.2 2.2 0 1 1-1.4-2.1V7z" fill="#fff" />
      </svg>
    );
  }

  // Genérico web
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={title || 'Enlace web'}
      style={style}
    >
      <path d="M10 8h4m-8 4h12M8 16h8" stroke="#555" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

