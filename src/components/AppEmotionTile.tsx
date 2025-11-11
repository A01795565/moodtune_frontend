import React from 'react';
import './AppEmotionTile.css';

type Props = {
  emoji: string;
  label: string;
  hint: string;
  active?: boolean;
  onClick?: () => void;
};

export default function AppEmotionTile({ emoji, label, hint, active = false, onClick }: Props) {
  return (
    <button
      type="button"
      className={`emo ${active ? 'is-active' : ''}`}
      aria-pressed={active}
      onClick={onClick}
    >
      <div className="emo__emoji" aria-hidden>{emoji}</div>
      <div className="emo__label">{label}</div>
      <div className="emo__hint">{hint}</div>
    </button>
  );
}
