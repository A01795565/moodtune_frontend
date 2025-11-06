import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { PaginatedSessions, Session } from '../types/api';

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
    <div>
      <h2>Sessions</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <h3>Lista</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <label>limit <input type="number" value={limit} onChange={(e)=>setLimit(Number(e.target.value)||0)} style={{ width: 80 }} /></label>
            <label>offset <input type="number" value={offset} onChange={(e)=>setOffset(Number(e.target.value)||0)} style={{ width: 80 }} /></label>
            <button onClick={fetchList} disabled={loading}>Refrescar</button>
          </div>
          {loading && <div>Cargando…</div>}
          {error && <div style={{ color: 'crimson' }}>{error}</div>}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th style={{textAlign:'left'}}>ID</th><th>User</th><th>Inicio</th><th>Fin</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {list?.items?.map(s => (
                <tr key={s.session_id}>
                  <td style={{ fontFamily: 'monospace' }}>{s.session_id}</td>
                  <td style={{ fontFamily: 'monospace' }}>{s.user_id}</td>
                  <td>{new Date(s.started_at).toLocaleString()}</td>
                  <td>{s.ended_at ? new Date(s.ended_at).toLocaleString() : '—'}</td>
                  <td>
                    <button onClick={() => onView(s.session_id)}>Ver</button>{' '}
                    <button onClick={() => onEnd(s.session_id)}>Terminar</button>{' '}
                    <button onClick={() => onDelete(s.session_id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3>Detalle</h3>
          {selected ? (
            <pre style={{ background: '#f6f8fa', padding: 12, borderRadius: 8 }}>{JSON.stringify(selected, null, 2)}</pre>
          ) : (
            <div>Selecciona una sesión para ver detalle.</div>
          )}
        </div>
      </div>
    </div>
  );
}

