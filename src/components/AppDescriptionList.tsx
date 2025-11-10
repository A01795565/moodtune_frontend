import React from 'react';
import './AppDescriptionList.css';

type Row = { label: string; value: React.ReactNode };

type Props = {
  rows: Row[];
};

export default function AppDescriptionList({ rows }: Props) {
  return (
    <dl className="dl">
      {rows.map((r, idx) => (
        <div className="dl__row" key={idx}>
          <dt className="dl__term">{r.label}</dt>
          <dd className="dl__desc">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
