import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { OAuthToken, OAuthTokenUpsert, PaginatedOAuthTokens } from '../types/api';

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
    <div>
      <h2>OAuth Tokens</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <h3>Lista</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
            <label>limit <input type="number" value={limit} onChange={(e)=>setLimit(Number(e.target.value)||0)} style={{ width: 80 }} /></label>
            <label>offset <input type="number" value={offset} onChange={(e)=>setOffset(Number(e.target.value)||0)} style={{ width: 80 }} /></label>
            <label>user_id <input value={userFilter} onChange={(e)=>setUserFilter(e.target.value)} placeholder="uuid opcional" style={{ width: 200 }} /></label>
            <label>provider
              <select value={providerFilter} onChange={(e)=>setProviderFilter(e.target.value)}>
                <option value="">(todos)</option>
                <option value="spotify">spotify</option>
                <option value="apple_music">apple_music</option>
                <option value="amazon_music">amazon_music</option>
              </select>
            </label>
            <button onClick={fetchList} disabled={loading}>Refrescar</button>
          </div>
          {loading && <div>Cargando…</div>}
          {error && <div style={{ color: 'crimson' }}>{error}</div>}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th style={{textAlign:'left'}}>ID</th><th>Provider</th><th>User</th><th>Expira</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {list?.items?.map(t => (
                <tr key={t.token_id}>
                  <td style={{ fontFamily: 'monospace' }}>{t.token_id}</td>
                  <td>{t.provider}</td>
                  <td style={{ fontFamily: 'monospace' }}>{t.user_id}</td>
                  <td>{t.expires_at ? new Date(t.expires_at).toLocaleString() : '—'}</td>
                  <td>
                    <button onClick={() => onView(t.token_id)}>Ver</button>{' '}
                    <button onClick={() => onDelete(t.token_id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3>Upsert</h3>
          <form onSubmit={onUpsert} style={{ display: 'grid', gap: 8 }}>
            <label>token_id (opcional)<input value={form.token_id||''} onChange={(e)=>setForm(f=>({...f, token_id: e.target.value || undefined}))} /></label>
            <label>user_id <input value={form.user_id} onChange={(e)=>setForm(f=>({...f, user_id: e.target.value}))} required /></label>
            <label>provider
              <select value={form.provider} onChange={(e)=>setForm(f=>({...f, provider: e.target.value as any}))}>
                <option value="spotify">spotify</option>
                <option value="apple_music">apple_music</option>
                <option value="amazon_music">amazon_music</option>
              </select>
            </label>
            <label>access_cipher_b64 <input value={form.access_cipher_b64} onChange={(e)=>setForm(f=>({...f, access_cipher_b64: e.target.value}))} required /></label>
            <label>refresh_cipher_b64 <input value={form.refresh_cipher_b64||''} onChange={(e)=>setForm(f=>({...f, refresh_cipher_b64: e.target.value || undefined}))} /></label>
            <label>expires_at (ISO) <input value={form.expires_at||''} onChange={(e)=>setForm(f=>({...f, expires_at: e.target.value || undefined}))} /></label>
            <button type="submit" disabled={creating}>{creating ? 'Guardando…' : 'Guardar'}</button>
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

