import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AuditLog, AuditLogCreate, PaginatedAuditLogs } from '../types/api';

export default function AuditLogs() {
  const [list, setList] = useState<PaginatedAuditLogs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<AuditLogCreate>({ actor_type: 'system', action: '' });
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const fetchList = async () => {
    setLoading(true); setError(null);
    try { setList(await api.listAuditLogs({ limit, offset })); } catch (e: any) { setError(e?.message || 'Error'); } finally { setLoading(false); }
  };
  useEffect(() => { fetchList(); }, [limit, offset]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault(); setCreating(true); setError(null);
    try { const created = await api.createAuditLog(form); setSelected(created); await fetchList(); }
    catch (e: any) { setError(e?.message || 'Error'); } finally { setCreating(false); }
  };

  const onView = async (id: number) => {
    setError(null);
    try { setSelected(await api.getAuditLog(id)); } catch (e: any) { setError(e?.message || 'Error'); }
  };

  return (
    <div>
      <h2>Audit Logs</h2>
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
              <tr><th>ID</th><th>Actor</th><th>Action</th><th>Fecha</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {list?.items?.map(a => (
                <tr key={a.audit_id}>
                  <td>{a.audit_id}</td>
                  <td>{a.actor_type}</td>
                  <td>{a.action}</td>
                  <td>{new Date(a.created_at).toLocaleString()}</td>
                  <td>
                    <button onClick={() => onView(a.audit_id)}>Ver</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3>Crear</h3>
          <form onSubmit={onCreate} style={{ display: 'grid', gap: 8 }}>
            <label>actor_type
              <select value={form.actor_type} onChange={(e)=>setForm(f=>({...f, actor_type: e.target.value as any}))}>
                <option value="system">system</option>
                <option value="user">user</option>
              </select>
            </label>
            <label>actor_id <input value={form.actor_id||''} onChange={(e)=>setForm(f=>({...f, actor_id: e.target.value || undefined}))} /></label>
            <label>action <input value={form.action} onChange={(e)=>setForm(f=>({...f, action: e.target.value}))} required /></label>
            <label>entity_type <input value={form.entity_type||''} onChange={(e)=>setForm(f=>({...f, entity_type: e.target.value || undefined}))} /></label>
            <label>entity_id <input value={form.entity_id||''} onChange={(e)=>setForm(f=>({...f, entity_id: e.target.value || undefined}))} /></label>
            <label>payload_json
              <textarea value={JSON.stringify(form.payload_json||{}, null, 2)} onChange={(e)=>{
                try { setForm(f=>({...f, payload_json: JSON.parse(e.target.value||'{}')})); } catch {}
              }} rows={6} />
            </label>
            <button type="submit" disabled={creating}>{creating ? 'Creando…' : 'Crear'}</button>
          </form>
          {selected && (
            <div style={{ marginTop: 16 }}>
              <h3>Detalle</h3>
              <pre style={{ background: '#f6f8fa', padding: 12, borderRadius: 8 }}>{JSON.stringify(selected, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

