import { FormEvent, useEffect, useState } from 'react';
import AppAlert from '../components/AppAlert';
import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppCodeBlock from '../components/AppCodeBlock';
import { api } from '../api/client';
import type { PaginatedUsers, User, UserCreate } from '../types/api';

import './AdminShared.css';

export default function Users() {
  const [list, setList] = useState<PaginatedUsers | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<UserCreate>({ display_name: '', email_hash: '' });
  const [selected, setSelected] = useState<User | null>(null);

  const fetchList = async () => {
    setLoading(true); setError(null);
    try { setList(await api.listUsers({ limit, offset })); } catch (e: any) { setError(e?.message || 'Error'); } finally { setLoading(false); }
  };
  useEffect(() => { fetchList(); }, [limit, offset]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault(); setCreating(true); setError(null);
    try { await api.createUser(form); setForm({ display_name: '', email_hash: '' }); await fetchList(); }
    catch (e: any) { setError(e?.message || 'Error'); } finally { setCreating(false); }
  };

  const onView = async (id: string) => {
    setError(null); setSelected(null);
    try { setSelected(await api.getUser(id)); } catch (e: any) { setError(e?.message || 'Error'); }
  };
  const onDelete = async (id: string) => {
    if (!confirm('¿Eliminar usuario?')) return;
    setError(null);
    try { await api.deleteUser(id); await fetchList(); if (selected?.user_id === id) setSelected(null); } catch (e: any) { setError(e?.message || 'Error'); }
  };

  return (
    <div className="crud-page">
      <h2>Users</h2>
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
                <tr><th>ID</th><th>Nombre</th><th>Email hash</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {list?.items?.map(u => (
                  <tr key={u.user_id}>
                    <td style={{ fontFamily: 'monospace' }}>{u.user_id}</td>
                    <td>{u.display_name}</td>
                    <td style={{ fontFamily: 'monospace' }}>{u.email_hash}</td>
                    <td>
                      <div className="crud-actions">
                        <AppButton size="sm" variant="ghost" onClick={() => onView(u.user_id)}>Ver</AppButton>
                        <AppButton size="sm" variant="ghost" onClick={() => onDelete(u.user_id)}>Eliminar</AppButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AppCard>

        <AppCard title="Crear usuario" fullWidth>
          <form className="crud-form" onSubmit={onCreate}>
            <label className="crud-field">
              <span>Nombre visible</span>
              <input className="crud-input" value={form.display_name||''} onChange={(e)=>setForm(f=>({...f, display_name: e.target.value}))} />
            </label>
            <label className="crud-field">
              <span>Email hash</span>
              <input className="crud-input" value={form.email_hash||''} onChange={(e)=>setForm(f=>({...f, email_hash: e.target.value}))} />
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

