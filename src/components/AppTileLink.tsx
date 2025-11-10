import React from 'react';
import { Link } from 'react-router-dom';
import './AppTileLink.css';

type Props = {
  to: string;
  title: string;
  desc?: string;
  rightAddon?: React.ReactNode; // opcional (chip/contador/icono)
};

export default function AppTileLink({ to, title, desc, rightAddon }: Props) {
  return (
    <Link to={to} className="atile">
      <div className="atile__row">
        <div className="atile__title">{title}</div>
        {rightAddon ? <div className="atile__addon">{rightAddon}</div> : null}
      </div>
      {desc && <div className="atile__desc">{desc}</div>}
    </Link>
  );
}
