import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { MoodMapRule, MoodMapRuleCreate, PaginatedMoodMapRules } from '../types/api';

export default function MoodMapRules() {
  const [list, setList] = useState<PaginatedMoodMapRules | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [emotionFilter, setEmotionFilter] = useState('');
  const [intentionFilter, setIntentionFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<MoodMapRuleCreate>({ emotion: 'joy', intention: 'maintain', params_json: {}, version: 1, is_active: true });
  const [selected, setSelected] = useState<MoodMapRule | null>(null);

  const fetchList = async () => {
    setLoading(true); setError(null);
    try {
      setList(await api.listMoodMapRules({ limit, offset, emotion: emotionFilter || undefined, intention: intentionFilter || undefined }));
    } catch (e: any) { setError(e?.message || 'Error'); } finally { setLoading(false); }
  };
  useEffect(() => { fetchList(); }, [limit, offset, emotionFilter, intentionFilter]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault(); setCreating(true); setError(null);
    try { const created = await api.createMoodMapRule(form); setSelected(created); await fetchList(); }
    catch (e: any) { setError(e?.message || 'Error'); } finally { setCreating(false); }
  };

  const onView = async (id: string) => {
    setError(null);
    try { setSelected(await api.getMoodMapRule(id)); } catch (e: any) { setError(e?.message || 'Error'); }
  };
  const onDelete = async (id: string) => {
    if (!confirm('¿Eliminar regla?')) return;
    setError(null);
    try { await api.deleteMoodMapRule(id); await fetchList(); if (selected?.rule_id === id) setSelected(null); } catch (e: any) { setError(e?.message || 'Error'); }
  };

  return (
    <div>
      <h2>Mood Map Rules</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <h3>Lista</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
            <label>limit <input type="number" value={limit} onChange={(e)=>setLimit(Number(e.target.value)||0)} style={{ width: 80 }} /></label>
            <label>offset <input type="number" value={offset} onChange={(e)=>setOffset(Number(e.target.value)||0)} style={{ width: 80 }} /></label>
            <label>emotion
              <select value={emotionFilter} onChange={(e)=>setEmotionFilter(e.target.value)}>
                <option value="">(todas)</option>
                <option value="joy">joy</option>
                <option value="sadness">sadness</option>
                <option value="anger">anger</option>
              </select>
            </label>
            <label>intention
              <select value={intentionFilter} onChange={(e)=>setIntentionFilter(e.target.value)}>
                <option value="">(todas)</option>
                <option value="maintain">maintain</option>
                <option value="change">change</option>
              </select>
            </label>
            <button onClick={fetchList} disabled={loading}>Refrescar</button>
          </div>
          {loading && <div>Cargando…</div>}
          {error && <div style={{ color: 'crimson' }}>{error}</div>}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th style={{textAlign:'left'}}>ID</th><th>Emoción</th><th>Intention</th><th>Active</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {list?.items?.map(r => (
                <tr key={r.rule_id}>
                  <td style={{ fontFamily: 'monospace' }}>{r.rule_id}</td>
                  <td>{r.emotion}</td>
                  <td>{r.intention}</td>
                  <td>{String(r.is_active)}</td>
                  <td>
                    <button onClick={() => onView(r.rule_id)}>Ver</button>{' '}
                    <button onClick={() => onDelete(r.rule_id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3>Crear regla</h3>
          <form onSubmit={onCreate} style={{ display: 'grid', gap: 8 }}>
            <label>emotion
              <select value={form.emotion} onChange={(e)=>setForm(f=>({...f, emotion: e.target.value as any}))}>
                <option value="joy">joy</option>
                <option value="sadness">sadness</option>
                <option value="anger">anger</option>
              </select>
            </label>
            <label>intention
              <select value={form.intention} onChange={(e)=>setForm(f=>({...f, intention: e.target.value as any}))}>
                <option value="maintain">maintain</option>
                <option value="change">change</option>
              </select>
            </label>
            <label>version <input type="number" value={form.version||1} onChange={(e)=>setForm(f=>({...f, version: Number(e.target.value)||1}))} /></label>
            <label>is_active
              <input type="checkbox" checked={!!form.is_active} onChange={(e)=>setForm(f=>({...f, is_active: e.target.checked}))} />
            </label>
            <label>params_json
              <textarea value={JSON.stringify(form.params_json||{}, null, 2)} onChange={(e)=>{
                try { setForm(f=>({...f, params_json: JSON.parse(e.target.value||'{}')})); } catch {}
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

