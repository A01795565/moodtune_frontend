import { FormEvent, useEffect, useState } from 'react';
import AppAlert from '../components/AppAlert';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppCodeBlock from '../components/AppCodeBlock';
import { api } from '../api/client';
import type { OAuthToken, OAuthTokenUpsert, PaginatedOAuthTokens } from '../types/api';

import './AdminShared.css';

export default function OAuthTokens() {
  const [list, setList] = useState<PaginatedOAuthTokens | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [userFilter, setUserFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<OAuthTokenUpsert>({ user_id: '', provider: 'spotify', access_cipher_b64: '' });
  const [selected, setSelected] = useState<OAuthToken | null>(null);

  const fetchList = async () => {
    setLoading(true); setError(null);
    try {
      setList(await api.listOAuthTokens({ limit, offset, user_id: userFilter || undefined, provider: providerFilter || undefined }));
    } catch (e: any) { setError(e?.message || 'Error'); } finally { setLoading(false); }
  };
  useEffect(() => { fetchList(); }, [limit, offset, userFilter, providerFilter]);

  const onUpsert = async (e: FormEvent) => {
    e.preventDefault(); setCreating(true); setError(null);
    try { const saved = await api.upsertOAuthToken(form); setSelected(saved); await fetchList(); }
    catch (e: any) { setError(e?.message || 'Error'); } finally { setCreating(false); }
  };

  const onView = async (id: string) => {
    setError(null);
    try { setSelected(await api.getOAuthToken(id)); } catch (e: any) { setError(e?.message || 'Error'); }
  };
  const onDelete = async (id: string) => {
    if (!confirm('¿Eliminar token?')) return;
    setError(null);
    try { await api.deleteOAuthToken(id); await fetchList(); if (selected?.token_id === id) setSelected(null); } catch (e: any) { setError(e?.message || 'Error'); }
  };

  return (
    <div className="crud-page">
      <h2>OAuth Tokens</h2>
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
              <span>user_id</span>
              <input className="crud-input" value={userFilter} onChange={(e)=>setUserFilter(e.target.value)} placeholder="uuid opcional" />
            </label>
            <label className="crud-field">
              <span>provider</span>
              <select className="crud-select" value={providerFilter} onChange={(e)=>setProviderFilter(e.target.value)}>
                <option value="">(todos)</option>
                <option value="spotify">spotify</option>
                <option value="apple_music">apple_music</option>
                <option value="amazon_music">amazon_music</option>
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
                <tr><th>ID</th><th>Provider</th><th>User</th><th>Expira</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {list?.items?.map(t => (
                  <tr key={t.token_id}>
                    <td style={{ fontFamily: 'monospace' }}>{t.token_id}</td>
                    <td>{t.provider}</td>
                    <td style={{ fontFamily: 'monospace' }}>{t.user_id}</td>
                    <td>{t.expires_at ? new Date(t.expires_at).toLocaleString() : '—'}</td>
                    <td>
                      <div className="crud-actions">
                        <AppButton size="sm" variant="ghost" onClick={() => onView(t.token_id)}>Ver</AppButton>
                        <AppButton size="sm" variant="ghost" onClick={() => onDelete(t.token_id)}>Eliminar</AppButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AppCard>

        <AppCard title="Upsert" fullWidth>
          <form className="crud-form" onSubmit={onUpsert}>
            <label className="crud-field">
              <span>token_id (opcional)</span>
              <input className="crud-input" value={form.token_id||''} onChange={(e)=>setForm(f=>({...f, token_id: e.target.value || undefined}))} />
            </label>
            <label className="crud-field">
              <span>user_id</span>
              <input className="crud-input" value={form.user_id} onChange={(e)=>setForm(f=>({...f, user_id: e.target.value}))} required />
            </label>
            <label className="crud-field">
              <span>provider</span>
              <select className="crud-select" value={form.provider} onChange={(e)=>setForm(f=>({...f, provider: e.target.value as any}))}>
                <option value="spotify">spotify</option>
                <option value="apple_music">apple_music</option>
                <option value="amazon_music">amazon_music</option>
              </select>
            </label>
            <label className="crud-field">
              <span>access_cipher_b64</span>
              <input className="crud-input" value={form.access_cipher_b64} onChange={(e)=>setForm(f=>({...f, access_cipher_b64: e.target.value}))} required />
            </label>
            <label className="crud-field">
              <span>refresh_cipher_b64</span>
              <input className="crud-input" value={form.refresh_cipher_b64||''} onChange={(e)=>setForm(f=>({...f, refresh_cipher_b64: e.target.value || undefined}))} />
            </label>
            <label className="crud-field">
              <span>expires_at (ISO)</span>
              <input className="crud-input" value={form.expires_at||''} onChange={(e)=>setForm(f=>({...f, expires_at: e.target.value || undefined}))} />
            </label>
            <AppButton type="submit" disabled={creating} loading={creating}>
              {creating ? 'Guardando…' : 'Guardar'}
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

