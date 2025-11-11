import React from 'react';
import './AppBadge.css';

type Props = {
  tone?: 'success' | 'neutral' | 'warning' | 'error';
  children: React.ReactNode;
  title?: string;
};

export default function AppBadge({ tone = 'neutral', children, title }: Props) {
  return (
    <span className={`badge badge--${tone}`} title={title}>
      {children}
    </span>
  );
}
