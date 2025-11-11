import React from 'react';
import './AppCard.css';

type CardProps = {
  title?: string;
  subtitle?: string;
  headerSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
};

export default function AppCard({
  title,
  subtitle,
  headerSlot,
  footerSlot,
  children,
  as: Tag = 'section',
}: CardProps) {
  return (
    <Tag className="card">
      {(title || subtitle || headerSlot) && (
        <header className="card__header">
          {headerSlot}
          {title && <h2 className="card__title">{title}</h2>}
          {subtitle && <p className="card__subtitle">{subtitle}</p>}
        </header>
      )}
      <div className="card__body">{children}</div>
      {footerSlot && <footer className="card__footer">{footerSlot}</footer>}
    </Tag>
  );
}
