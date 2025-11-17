import { useEffect, useState } from 'react';
import AppAlert from '../components/AppAlert';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppCodeBlock from '../components/AppCodeBlock';
import { api } from '../api/client';
import type { PaginatedSessions, Session } from '../types/api';

import './AdminShared.css';

export default function Sessions() {
  const [list, setList] = useState<PaginatedSessions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Session | null>(null);

  const fetchList = async () => {
    setLoading(true); setError(null);
    try { setList(await api.listSessions({ limit, offset })); } catch (e: any) { setError(e?.message || 'Error'); } finally { setLoading(false); }
  };
  useEffect(() => { fetchList(); }, [limit, offset]);

  const onView = async (id: string) => {
    setError(null);
    try { setSelected(await api.getSession(id)); } catch (e: any) { setError(e?.message || 'Error'); }
  };
  const onEnd = async (id: string) => {
    if (!confirm('¿Marcar sesión como terminada?')) return;
    setError(null);
    try { await api.patchSession(id, { end: true }); await fetchList(); if (selected?.session_id === id) setSelected(await api.getSession(id)); } catch (e: any) { setError(e?.message || 'Error'); }
  };
  const onDelete = async (id: string) => {
    if (!confirm('¿Eliminar sesión?')) return;
    setError(null);
    try { await api.deleteSession(id); await fetchList(); if (selected?.session_id === id) setSelected(null); } catch (e: any) { setError(e?.message || 'Error'); }
  };

  return (
    <div className="crud-page">
      <h2>Sessions</h2>
      {error && <AppAlert tone="error">{error}</AppAlert>}

      <div className="crud-page__grid crud-page__grid--two">
        <AppCard title="Lista" fullWidth>
          <div className="crud-toolbar">
            <label className="crud-field">
              <span>limit</span>
              <input className="crud-input" type="number" value={limit} onChange={(e)=>setLimit(Number(e.target.value)||0)} />
            </label>
            <label className="crud-field">
              <span>offset</span>
              <input className="crud-input" type="number" value={offset} onChange={(e)=>setOffset(Number(e.target.value)||0)} />
            </label>
            <AppButton onClick={fetchList} disabled={loading} loading={loading} size="sm">
              Refrescar
            </AppButton>
          </div>

          {loading && <div className="crud-status">Cargando…</div>}
          <div className="crud-table-wrapper">
            <table className="crud-table">
              <thead>
                <tr><th>ID</th><th>User</th><th>Inicio</th><th>Fin</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {list?.items?.map(s => (
                  <tr key={s.session_id}>
                    <td style={{ fontFamily: 'monospace' }}>{s.session_id}</td>
                    <td style={{ fontFamily: 'monospace' }}>{s.user_id}</td>
                    <td>{new Date(s.started_at).toLocaleString()}</td>
                    <td>{s.ended_at ? new Date(s.ended_at).toLocaleString() : '—'}</td>
                    <td>
                      <div className="crud-actions">
                        <AppButton size="sm" variant="ghost" onClick={() => onView(s.session_id)}>Ver</AppButton>
                        <AppButton size="sm" variant="ghost" onClick={() => onEnd(s.session_id)}>Terminar</AppButton>
                        <AppButton size="sm" variant="ghost" onClick={() => onDelete(s.session_id)}>Eliminar</AppButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AppCard>

        <AppCard title="Detalle" fullWidth>
          {selected ? (
            <AppCodeBlock value={JSON.stringify(selected, null, 2)} language="json" />
          ) : (
            <div className="crud-empty">Selecciona una sesión para ver detalle.</div>
          )}
        </AppCard>
      </div>
    </div>
  );
}

