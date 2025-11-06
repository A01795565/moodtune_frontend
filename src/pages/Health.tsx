import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { HealthResponse } from '../types/api';

export default function Health() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true); setError(null);
    try { setData(await api.health()); } catch (e: any) { setError(e?.message || 'Error'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchHealth(); }, []);

  return (
    <div>
      <h2>Health</h2>
      <button onClick={fetchHealth} disabled={loading} style={{ padding: '6px 10px', marginBottom: 10 }}>Refrescar</button>
      {loading && <div>Cargando…</div>}
      {error && <div style={{ color: 'crimson' }}>{error}</div>}
      {data && (
        <pre style={{ background: '#f6f8fa', padding: 12, borderRadius: 8 }}>{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  );
}

