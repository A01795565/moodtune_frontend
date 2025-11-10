import React from 'react';
import './AppFormField.css';

type Props = {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  inline?: boolean;
};

export default function AppFormField({ label, hint, children, inline = false }: Props) {
  return (
    <label className={`ff ${inline ? 'ff--inline' : ''}`}>
      <span className="ff__label">{label}</span>
      <div className="ff__control">{children}</div>
      {hint && <small className="ff__hint">{hint}</small>}
    </label>
  );
}
