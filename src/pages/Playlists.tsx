import { FormEvent, useEffect, useState } from 'react';
import AppAlert from '../components/AppAlert';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppCodeBlock from '../components/AppCodeBlock';
import { api } from '../api/client';
import type { PaginatedPlaylists, Playlist, PlaylistCreate } from '../types/api';

import './AdminShared.css';

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
    <div className="crud-page">
      <h2>Playlists</h2>
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
            <AppButton onClick={fetchList} disabled={loading} loading={loading} size="sm">
              Refrescar
            </AppButton>
          </div>
          {loading && <div className="crud-status">Cargando…</div>}

          <div className="crud-table-wrapper">
            <table className="crud-table">
              <thead>
                <tr><th>ID</th><th>Provider</th><th>Title</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {list?.items?.map(p => (
                  <tr key={p.playlist_id}>
                    <td style={{ fontFamily: 'monospace' }}>{p.playlist_id}</td>
                    <td>{p.provider}</td>
                    <td>{p.title}</td>
                    <td>
                      <div className="crud-actions">
                        <AppButton size="sm" variant="ghost" onClick={() => onView(p.playlist_id)}>Ver</AppButton>
                        <AppButton size="sm" variant="ghost" onClick={() => onDelete(p.playlist_id)}>Eliminar</AppButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AppCard>

        <AppCard title="Crear playlist" fullWidth>
          <form className="crud-form" onSubmit={onCreate}>
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
              <span>external_playlist_id</span>
              <input className="crud-input" value={form.external_playlist_id} onChange={(e)=>setForm(f=>({...f, external_playlist_id: e.target.value}))} required />
            </label>
            <label className="crud-field">
              <span>deep_link_url</span>
              <input className="crud-input" value={form.deep_link_url} onChange={(e)=>setForm(f=>({...f, deep_link_url: e.target.value}))} required />
            </label>
            <label className="crud-field">
              <span>title</span>
              <input className="crud-input" value={form.title||''} onChange={(e)=>setForm(f=>({...f, title: e.target.value || undefined}))} />
            </label>
            <label className="crud-field">
              <span>description</span>
              <input className="crud-input" value={form.description||''} onChange={(e)=>setForm(f=>({...f, description: e.target.value || undefined}))} />
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

