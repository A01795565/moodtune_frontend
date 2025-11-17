import { FormEvent, useEffect, useState } from 'react';
import AppAlert from '../components/AppAlert';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppCodeBlock from '../components/AppCodeBlock';
import { api } from '../api/client';
import type { AuditLog, AuditLogCreate, PaginatedAuditLogs } from '../types/api';

import './AdminShared.css';

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
    <div className="crud-page">
      <h2>Audit Logs</h2>
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
                      <div className="crud-actions">
                        <AppButton size="sm" variant="ghost" onClick={() => onView(a.audit_id)}>Ver</AppButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AppCard>

        <AppCard title="Crear" fullWidth>
          <form className="crud-form" onSubmit={onCreate}>
            <label className="crud-field">
              <span>actor_type</span>
              <select className="crud-select" value={form.actor_type} onChange={(e)=>setForm(f=>({...f, actor_type: e.target.value as any}))}>
                <option value="system">system</option>
                <option value="user">user</option>
              </select>
            </label>
            <label className="crud-field">
              <span>actor_id</span>
              <input className="crud-input" value={form.actor_id||''} onChange={(e)=>setForm(f=>({...f, actor_id: e.target.value || undefined}))} />
            </label>
            <label className="crud-field">
              <span>action</span>
              <input className="crud-input" value={form.action} onChange={(e)=>setForm(f=>({...f, action: e.target.value}))} required />
            </label>
            <label className="crud-field">
              <span>entity_type</span>
              <input className="crud-input" value={form.entity_type||''} onChange={(e)=>setForm(f=>({...f, entity_type: e.target.value || undefined}))} />
            </label>
            <label className="crud-field">
              <span>entity_id</span>
              <input className="crud-input" value={form.entity_id||''} onChange={(e)=>setForm(f=>({...f, entity_id: e.target.value || undefined}))} />
            </label>
            <label className="crud-field">
              <span>payload_json</span>
              <textarea
                className="crud-textarea"
                value={JSON.stringify(form.payload_json||{}, null, 2)}
                onChange={(e)=>{
                  try { setForm(f=>({...f, payload_json: JSON.parse(e.target.value||'{}')})); } catch {}
                }}
                rows={6}
              />
            </label>
            <AppButton type="submit" disabled={creating} loading={creating}>
              {creating ? 'Creando…' : 'Crear'}
            </AppButton>
          </form>

          {selected && (
            <>
              <h4 className="crud-heading">Detalle</h4>
              <AppCodeBlock value={JSON.stringify(selected, null, 2)} language="json" />
            </>
          )}
        </AppCard>
      </div>
    </div>
  );
}

