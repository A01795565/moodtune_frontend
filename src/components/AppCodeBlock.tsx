import React from 'react';
import './AppCodeBlock.css';

type Props = {
  value: string;
  language?: 'json' | 'text';
  maxHeight?: number; // px
  ariaLabel?: string;
};

export default function AppCodeBlock({ value, language = 'json', maxHeight = 420, ariaLabel }: Props) {
  return (
    <div className="codeblock" style={{ maxHeight }} aria-label={ariaLabel || `Bloque ${language}`}>
      <pre className={`codeblock__pre lang-${language}`}>
        <code>{value}</code>
      </pre>
    </div>
  );
}
