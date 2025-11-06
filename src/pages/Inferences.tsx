import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Inference, InferenceCreate, PaginatedInferences } from '../types/api';

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
    <div>
      <h2>Inferences</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <h3>Lista</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <label>limit <input type="number" value={limit} onChange={(e)=>setLimit(Number(e.target.value)||0)} style={{ width: 80 }} /></label>
            <label>offset <input type="number" value={offset} onChange={(e)=>setOffset(Number(e.target.value)||0)} style={{ width: 80 }} /></label>
            <label>session_id <input value={sessionFilter} onChange={(e)=>setSessionFilter(e.target.value)} placeholder="uuid opcional" style={{ width: 200 }} /></label>
            <button onClick={fetchList} disabled={loading}>Refrescar</button>
          </div>
          {loading && <div>Cargando…</div>}
          {error && <div style={{ color: 'crimson' }}>{error}</div>}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th style={{textAlign:'left'}}>ID</th><th>Session</th><th>Emotion</th><th>Conf.</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {list?.items?.map(x => (
                <tr key={x.inference_id}>
                  <td style={{ fontFamily: 'monospace' }}>{x.inference_id}</td>
                  <td style={{ fontFamily: 'monospace' }}>{x.session_id}</td>
                  <td>{x.emotion}</td>
                  <td>{x.confidence}</td>
                  <td>
                    <button onClick={() => onView(x.inference_id)}>Ver</button>{' '}
                    <button onClick={() => onDelete(x.inference_id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3>Crear inferencia</h3>
          <form onSubmit={onCreate} style={{ display: 'grid', gap: 8 }}>
            <label>session_id <input value={form.session_id} onChange={(e)=>setForm(f=>({...f, session_id: e.target.value}))} required /></label>
            <label>emotion
              <select value={form.emotion} onChange={(e)=>setForm(f=>({...f, emotion: e.target.value as any}))}>
                <option value="joy">joy</option>
                <option value="sadness">sadness</option>
                <option value="anger">anger</option>
              </select>
            </label>
            <label>confidence <input type="number" step="0.01" min="0" max="1" value={form.confidence} onChange={(e)=>setForm(f=>({...f, confidence: Number(e.target.value)}))} required /></label>
            <label>intention
              <select value={form.intention||''} onChange={(e)=>setForm(f=>({...f, intention: (e.target.value||undefined) as any}))}>
                <option value="">(opcional)</option>
                <option value="maintain">maintain</option>
                <option value="change">change</option>
              </select>
            </label>
            <label>latency_ms <input type="number" value={form.latency_ms||'' as any} onChange={(e)=>setForm(f=>({...f, latency_ms: e.target.value? Number(e.target.value): undefined}))} /></label>
            <label>model_version <input value={form.model_version||''} onChange={(e)=>setForm(f=>({...f, model_version: e.target.value || undefined}))} /></label>
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

