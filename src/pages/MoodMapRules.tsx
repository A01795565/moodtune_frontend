import { FormEvent, useEffect, useState } from 'react';
import AppAlert from '../components/AppAlert';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppCodeBlock from '../components/AppCodeBlock';
import { api } from '../api/client';
import type { MoodMapRule, MoodMapRuleCreate, PaginatedMoodMapRules } from '../types/api';

import './AdminShared.css';

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
    <div className="crud-page">
      <h2>Mood Map Rules</h2>
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
            <label className="crud-field">
              <span>emotion</span>
              <select className="crud-select" value={emotionFilter} onChange={(e)=>setEmotionFilter(e.target.value)}>
                <option value="">(todas)</option>
                <option value="joy">joy</option>
                <option value="sadness">sadness</option>
                <option value="anger">anger</option>
              </select>
            </label>
            <label className="crud-field">
              <span>intention</span>
              <select className="crud-select" value={intentionFilter} onChange={(e)=>setIntentionFilter(e.target.value)}>
                <option value="">(todas)</option>
                <option value="maintain">maintain</option>
                <option value="change">change</option>
              </select>
            </label>
            <AppButton onClick={fetchList} disabled={loading} loading={loading} size="sm">
              Refrescar
            </AppButton>
          </div>
          {loading && <div className="crud-status">Cargando…</div>}

          <div className="crud-table-wrapper">
            <table className="crud-table">
              <thead>
                <tr><th>ID</th><th>Emoción</th><th>Intention</th><th>Active</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {list?.items?.map(r => (
                  <tr key={r.rule_id}>
                    <td style={{ fontFamily: 'monospace' }}>{r.rule_id}</td>
                    <td>{r.emotion}</td>
                    <td>{r.intention}</td>
                    <td>{String(r.is_active)}</td>
                    <td>
                      <div className="crud-actions">
                        <AppButton size="sm" variant="ghost" onClick={() => onView(r.rule_id)}>Ver</AppButton>
                        <AppButton size="sm" variant="ghost" onClick={() => onDelete(r.rule_id)}>Eliminar</AppButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AppCard>

        <AppCard title="Crear regla" fullWidth>
          <form className="crud-form" onSubmit={onCreate}>
            <label className="crud-field">
              <span>emotion</span>
              <select className="crud-select" value={form.emotion} onChange={(e)=>setForm(f=>({...f, emotion: e.target.value as any}))}>
                <option value="joy">joy</option>
                <option value="sadness">sadness</option>
                <option value="anger">anger</option>
              </select>
            </label>
            <label className="crud-field">
              <span>intention</span>
              <select className="crud-select" value={form.intention} onChange={(e)=>setForm(f=>({...f, intention: e.target.value as any}))}>
                <option value="maintain">maintain</option>
                <option value="change">change</option>
              </select>
            </label>
            <label className="crud-field">
              <span>version</span>
              <input className="crud-input" type="number" value={form.version||1} onChange={(e)=>setForm(f=>({...f, version: Number(e.target.value)||1}))} />
            </label>
            <label className="crud-field crud-field--inline">
              <span>is_active</span>
              <input type="checkbox" checked={!!form.is_active} onChange={(e)=>setForm(f=>({...f, is_active: e.target.checked}))} />
            </label>
            <label className="crud-field">
              <span>params_json</span>
              <textarea
                className="crud-textarea"
                value={JSON.stringify(form.params_json||{}, null, 2)}
                onChange={(e)=>{
                  try { setForm(f=>({...f, params_json: JSON.parse(e.target.value||'{}')})); } catch {}
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

