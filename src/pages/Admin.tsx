import AppTileLink from '../components/AppTileLink';
import ServiceHealthCheck from '../components/ServiceHealthCheck';
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

  // Service endpoints from environment variables
  const services = [
    {
      name: 'MoodTune API',
      endpoint: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    },
    {
      name: 'MoodTune FER',
      endpoint: import.meta.env.VITE_FER_ENDPOINT_URL || null,
    },
    {
      name: 'MoodTune Music',
      endpoint: import.meta.env.VITE_MUSIC_BASE_URL || 'http://localhost:8020',
    },
    {
      name: 'MoodTune RAG',
      endpoint: import.meta.env.VITE_RAG_BASE_URL || 'http://localhost:8010',
    },
  ];

  return (
    <div className="admin">
      <h2 className="admin__title">Admin</h2>
      <p className="admin__subtitle">Menú de administración de MoodTune.</p>

      {/* Service Health Checks */}
      <div className="admin__section">
        <h3 className="admin__section-title">Estado de Servicios</h3>
        <div className="admin__health-grid">
          {services.map((service) => (
            <ServiceHealthCheck
              key={service.name}
              serviceName={service.name}
              endpoint={service.endpoint}
              autoCheck={false}
            />
          ))}
        </div>
      </div>

      {/* Admin Links */}
      <div className="admin__section">
        <h3 className="admin__section-title">Gestión de Datos</h3>
        <div className="admin__grid">
          {items.map((i) => (
            <AppTileLink key={i.to} to={i.to} title={i.title} desc={i.desc} />
          ))}
        </div>
      </div>
    </div>
  );
}
