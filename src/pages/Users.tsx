import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { PaginatedUsers, User, UserCreate } from '../types/api';

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
    try { await api.createUser(form); setForm({ display_name: '', email_hash: '' }); await fetchList(); } catch (e: any) { setError(e?.message || 'Error'); } finally { setCreating(false); }
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
    <div>
      <h2>Users</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <h3>Lista</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <label>limit <input type="number" value={limit} onChange={(e)=>setLimit(Number(e.target.value)||0)} style={{ width: 80 }} /></label>
            <label>offset <input type="number" value={offset} onChange={(e)=>setOffset(Number(e.target.value)||0)} style={{ width: 80 }} /></label>
            <button onClick={fetchList} disabled={loading}>Refrescar</button>
          </div>
          {loading && <div>Cargando…</div>}
          {error && <div style={{ color: 'crimson' }}>{error}</div>}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th style={{textAlign:'left'}}>ID</th><th>Nombre</th><th>Email hash</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {list?.items?.map(u => (
                <tr key={u.user_id}>
                  <td style={{ fontFamily: 'monospace' }}>{u.user_id}</td>
                  <td>{u.display_name}</td>
                  <td style={{ fontFamily: 'monospace' }}>{u.email_hash}</td>
                  <td>
                    <button onClick={() => onView(u.user_id)}>Ver</button>{' '}
                    <button onClick={() => onDelete(u.user_id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3>Crear usuario</h3>
          <form onSubmit={onCreate} style={{ display: 'grid', gap: 8 }}>
            <label>
              Nombre visible
              <input value={form.display_name||''} onChange={(e)=>setForm(f=>({...f, display_name: e.target.value}))} />
            </label>
            <label>
              Email hash
              <input value={form.email_hash||''} onChange={(e)=>setForm(f=>({...f, email_hash: e.target.value}))} />
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

