import React from 'react';
import './AppAlert.css';

type AlertProps = {
  tone?: 'info' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
};

export default function AppAlert({ tone = 'info', children }: AlertProps) {
  return (
    <div className={`alert alert--${tone}`} role="alert">
      <svg className="alert__icon" viewBox="0 0 24 24" aria-hidden>
        {tone === 'success' && <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />}
        {tone === 'info' && <path d="M11 7h2v2h-2zm0 4h2v6h-2z" />}
        {tone === 'warning' && <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />}
        {tone === 'error' && <path d="M11 7h2v6h-2zm0 8h2v2h-2z" />}
      </svg>
      <span className="alert__text">{children}</span>
    </div>
  );
}
