import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { PaginatedPlaylists, Playlist, PlaylistCreate } from '../types/api';

export default function Playlists() {
  const [list, setList] = useState<PaginatedPlaylists | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [userFilter, setUserFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<PlaylistCreate>({ user_id: '', provider: 'spotify', external_playlist_id: '', deep_link_url: '' });
  const [selected, setSelected] = useState<Playlist | null>(null);

  const fetchList = async () => {
    setLoading(true); setError(null);
    try {
      setList(await api.listPlaylists({ limit, offset, user_id: userFilter || undefined }));
    } catch (e: any) { setError(e?.message || 'Error'); } finally { setLoading(false); }
  };
  useEffect(() => { fetchList(); }, [limit, offset, userFilter]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault(); setCreating(true); setError(null);
    try { const created = await api.createPlaylist(form); setSelected(created); await fetchList(); }
    catch (e: any) { setError(e?.message || 'Error'); } finally { setCreating(false); }
  };

  const onView = async (id: string) => {
    setError(null);
    try { setSelected(await api.getPlaylist(id)); } catch (e: any) { setError(e?.message || 'Error'); }
  };
  const onDelete = async (id: string) => {
    if (!confirm('¿Eliminar playlist?')) return;
    setError(null);
    try { await api.deletePlaylist(id); await fetchList(); if (selected?.playlist_id === id) setSelected(null); } catch (e: any) { setError(e?.message || 'Error'); }
  };

  return (
    <div>
      <h2>Playlists</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <h3>Lista</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <label>limit <input type="number" value={limit} onChange={(e)=>setLimit(Number(e.target.value)||0)} style={{ width: 80 }} /></label>
            <label>offset <input type="number" value={offset} onChange={(e)=>setOffset(Number(e.target.value)||0)} style={{ width: 80 }} /></label>
            <label>user_id <input value={userFilter} onChange={(e)=>setUserFilter(e.target.value)} placeholder="uuid opcional" style={{ width: 200 }} /></label>
            <button onClick={fetchList} disabled={loading}>Refrescar</button>
          </div>
          {loading && <div>Cargando…</div>}
          {error && <div style={{ color: 'crimson' }}>{error}</div>}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th style={{textAlign:'left'}}>ID</th><th>Provider</th><th>Title</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {list?.items?.map(p => (
                <tr key={p.playlist_id}>
                  <td style={{ fontFamily: 'monospace' }}>{p.playlist_id}</td>
                  <td>{p.provider}</td>
                  <td>{p.title}</td>
                  <td>
                    <button onClick={() => onView(p.playlist_id)}>Ver</button>{' '}
                    <button onClick={() => onDelete(p.playlist_id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3>Crear playlist</h3>
          <form onSubmit={onCreate} style={{ display: 'grid', gap: 8 }}>
            <label>user_id <input value={form.user_id} onChange={(e)=>setForm(f=>({...f, user_id: e.target.value}))} required /></label>
            <label>provider
              <select value={form.provider} onChange={(e)=>setForm(f=>({...f, provider: e.target.value as any}))}>
                <option value="spotify">spotify</option>
                <option value="apple_music">apple_music</option>
                <option value="amazon_music">amazon_music</option>
              </select>
            </label>
            <label>external_playlist_id <input value={form.external_playlist_id} onChange={(e)=>setForm(f=>({...f, external_playlist_id: e.target.value}))} required /></label>
            <label>deep_link_url <input value={form.deep_link_url} onChange={(e)=>setForm(f=>({...f, deep_link_url: e.target.value}))} required /></label>
            <label>title <input value={form.title||''} onChange={(e)=>setForm(f=>({...f, title: e.target.value || undefined}))} /></label>
            <label>description <input value={form.description||''} onChange={(e)=>setForm(f=>({...f, description: e.target.value || undefined}))} /></label>
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

