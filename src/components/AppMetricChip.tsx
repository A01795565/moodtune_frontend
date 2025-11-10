import React from 'react';
import './AppMetricChip.css';

export default function AppMetricChip({ label, value }: { label: string; value?: number }) {
  const v = typeof value === 'number' ? Math.round(value * 100) : null;
  return <span className="chip">{label}: {v !== null ? v : '—'}</span>;
}
