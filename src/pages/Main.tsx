import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Main() {
  const { user, sessionId } = useAuth();
  const cards = [
    { to: '/detect', title: 'Detect', desc: 'Detectar emoción desde imagen' },
  ];

  return (
    <div>
      <h2>Panel principal</h2>
      {user ? (
        <div style={{ lineHeight: 1.6, marginBottom: 12 }}>
          <div><strong>Usuario:</strong> {user.display_name || user.user_id}</div>
          <div><strong>Email hash:</strong> {user.email_hash}</div>
          <div><strong>Session:</strong> {sessionId}</div>
        </div>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        {cards.map((c) => (
          <Link key={c.to} to={c.to} style={{
            display: 'block', border: '1px solid #ddd', padding: 12, borderRadius: 8,
            textDecoration: 'none', color: '#222', background: '#fafafa'
          }}>
            <div style={{ fontWeight: 700 }}>{c.title}</div>
            <div style={{ color: '#666', fontSize: 13 }}>{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
