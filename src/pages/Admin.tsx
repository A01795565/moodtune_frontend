import AppTileLink from '../components/AppTileLink';
import './Admin.css';

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
    <div className="admin">
      <h2 className="admin__title">Admin</h2>
      <p className="admin__subtitle">Menú de administración de MoodTune.</p>

      <div className="admin__grid">
        {items.map((i) => (
          <AppTileLink key={i.to} to={i.to} title={i.title} desc={i.desc} />
        ))}
      </div>
    </div>
  );
}
