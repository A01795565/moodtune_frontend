import { Link } from 'react-router-dom';

export default function Admin() {
  const items = [
    { to: '/health', title: 'Health', desc: 'Estado del servicio' },
    { to: '/users', title: 'Users', desc: 'Gestión de usuarios' },
    { to: '/sessions', title: 'Sessions', desc: 'Sesiones y estado' },
    { to: '/inferences', title: 'Inferences', desc: 'Registros de FER' },
    { to: '/playlists', title: 'Playlists', desc: 'Listas musicales' },
    { to: '/mood-map-rules', title: 'MoodMapRules', desc: 'Reglas emoción→música' },
    { to: '/audit-logs', title: 'AuditLogs', desc: 'Auditoría' },
    { to: '/oauth-tokens', title: 'OAuthTokens', desc: 'Tokens de proveedores' },
  ];

  return (
    <div>
      <h2>Admin</h2>
      <p style={{ color: '#666' }}>Menú de administración de MoodTune.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {items.map(i => (
          <Link key={i.to} to={i.to} style={{
            display: 'block', border: '1px solid #ddd', padding: 12, borderRadius: 8,
            textDecoration: 'none', color: '#222', background: '#fafafa'
          }}>
            <div style={{ fontWeight: 700 }}>{i.title}</div>
            <div style={{ color: '#666', fontSize: 13 }}>{i.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

