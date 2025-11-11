import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { HealthResponse } from '../types/api';

import AppButton from '../components/AppButton';
import AppAlert from '../components/AppAlert';
import AppCard from '../components/AppCard';
import AppCodeBlock from '../components/AppCodeBlock';

import './Health.css';

export default function Health() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true); setError(null);
    try { setData(await api.health()); }
    catch (e: any) { setError(e?.message || 'Error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHealth(); }, []);

  return (
    <div className="health">
      <h2 className="health__title">Health</h2>

      <div className="health__toolbar">
        <AppButton onClick={fetchHealth} disabled={loading} loading={loading}>
          Refrescar
        </AppButton>

        {/* Texto auxiliar opcional (no cambia lógica) */}
        <div className="health__status">
          {loading ? 'Cargando…' : data ? 'Último resultado cargado' : 'Sin datos aún'}
        </div>
      </div>

      {error && <AppAlert tone="error">{error}</AppAlert>}

      {data && (
        <div className="health__content">
          <AppCard>
            <AppCodeBlock
              value={JSON.stringify(data, null, 2)}
              language="json"
              ariaLabel="Respuesta de /health en formato JSON"
            />
          </AppCard>
        </div>
      )}
    </div>
  );
}
