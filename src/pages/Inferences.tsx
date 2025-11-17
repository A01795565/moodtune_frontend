import { FormEvent, useEffect, useState } from 'react';
import AppAlert from '../components/AppAlert';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppCodeBlock from '../components/AppCodeBlock';
import { api } from '../api/client';
import type { Inference, InferenceCreate, PaginatedInferences } from '../types/api';

import './AdminShared.css';

export default function Inferences() {
  const [list, setList] = useState<PaginatedInferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [sessionFilter, setSessionFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<InferenceCreate>({ session_id: '', emotion: 'joy', confidence: 0.9 });
  const [selected, setSelected] = useState<Inference | null>(null);

  const fetchList = async () => {
    setLoading(true); setError(null);
    try {
      setList(await api.listInferences({ limit, offset, session_id: sessionFilter || undefined }));
    } catch (e: any) { setError(e?.message || 'Error'); } finally { setLoading(false); }
  };
  useEffect(() => { fetchList(); }, [limit, offset, sessionFilter]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault(); setCreating(true); setError(null);
    try { const created = await api.createInference(form); setSelected(created); setForm(f=>({ ...f, latency_ms: undefined, model_version: undefined })); await fetchList(); }
    catch (e: any) { setError(e?.message || 'Error'); } finally { setCreating(false); }
  };

  const onView = async (id: string) => {
    setError(null);
    try { setSelected(await api.getInference(id)); } catch (e: any) { setError(e?.message || 'Error'); }
  };
  const onDelete = async (id: string) => {
    if (!confirm('¿Eliminar inferencia?')) return;
    setError(null);
    try { await api.deleteInference(id); await fetchList(); if (selected?.inference_id === id) setSelected(null); } catch (e: any) { setError(e?.message || 'Error'); }
  };

  return (
    <div className="crud-page">
      <h2>Inferences</h2>
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
            <label className="crud-field" style={{ minWidth: 220 }}>
              <span>session_id</span>
              <input className="crud-input" value={sessionFilter} onChange={(e)=>setSessionFilter(e.target.value)} placeholder="uuid opcional" />
            </label>
            <AppButton onClick={fetchList} disabled={loading} loading={loading} size="sm">
              Refrescar
            </AppButton>
          </div>
          {loading && <div className="crud-status">Cargando…</div>}

          <div className="crud-table-wrapper">
            <table className="crud-table">
              <thead>
                <tr><th>ID</th><th>Session</th><th>Emotion</th><th>Conf.</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {list?.items?.map(x => (
                  <tr key={x.inference_id}>
                    <td style={{ fontFamily: 'monospace' }}>{x.inference_id}</td>
                    <td style={{ fontFamily: 'monospace' }}>{x.session_id}</td>
                    <td>{x.emotion}</td>
                    <td>{x.confidence}</td>
                    <td>
                      <div className="crud-actions">
                        <AppButton size="sm" variant="ghost" onClick={() => onView(x.inference_id)}>Ver</AppButton>
                        <AppButton size="sm" variant="ghost" onClick={() => onDelete(x.inference_id)}>Eliminar</AppButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AppCard>

        <AppCard title="Crear inferencia" fullWidth>
          <form className="crud-form" onSubmit={onCreate}>
            <label className="crud-field">
              <span>session_id</span>
              <input className="crud-input" value={form.session_id} onChange={(e)=>setForm(f=>({...f, session_id: e.target.value}))} required />
            </label>
            <label className="crud-field">
              <span>emotion</span>
              <select className="crud-select" value={form.emotion} onChange={(e)=>setForm(f=>({...f, emotion: e.target.value as any}))}>
                <option value="joy">joy</option>
                <option value="sadness">sadness</option>
                <option value="anger">anger</option>
              </select>
            </label>
            <label className="crud-field">
              <span>confidence</span>
              <input className="crud-input" type="number" step="0.01" min="0" max="1" value={form.confidence} onChange={(e)=>setForm(f=>({...f, confidence: Number(e.target.value)}))} required />
            </label>
            <label className="crud-field">
              <span>intention</span>
              <select className="crud-select" value={form.intention||''} onChange={(e)=>setForm(f=>({...f, intention: (e.target.value||undefined) as any}))}>
                <option value="">(opcional)</option>
                <option value="maintain">maintain</option>
                <option value="change">change</option>
              </select>
            </label>
            <label className="crud-field">
              <span>latency_ms</span>
              <input className="crud-input" type="number" value={form.latency_ms||'' as any} onChange={(e)=>setForm(f=>({...f, latency_ms: e.target.value? Number(e.target.value): undefined}))} />
            </label>
            <label className="crud-field">
              <span>model_version</span>
              <input className="crud-input" value={form.model_version||''} onChange={(e)=>setForm(f=>({...f, model_version: e.target.value || undefined}))} />
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

