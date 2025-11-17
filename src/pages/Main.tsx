import { useAuth } from '../hooks/useAuth';

import AppCard from '../components/AppCard';
import AppDescriptionList from '../components/AppDescriptionList';
import AppTile from '../components/AppTile';

import './Main.css';

export default function Main() {
  const { user, sessionId } = useAuth();

  const cards = [
    { to: '/detect', title: 'Detect', desc: 'Detectar emoción desde imagen' },
    { to: '/my-playlists', title: 'Mis Playlists', desc: 'Consulta y explora playlists guardados' },
    { to: '/create-playlist', title: 'Crear Playlist', desc: 'Genera playlists guiadas por emoción usando IA' },
    { to: '/explore', title: 'Explorar', desc: 'Descubre canciones según tu estado de ánimo' },        
    { to: '/connect-spotify', title: 'Conectar Spotify', desc: 'Vincula Spotify para guardar playlists' },
  ];

  return (
    <div className="main">
      <h2 className="main__title">Panel principal</h2>

      {user ? (
        <AppCard>
          <div className="main__user">
            <AppDescriptionList
              rows={[
                { label: 'Usuario:', value: user.display_name || user.user_id },
                { label: 'Email hash:', value: user.email_hash },
                { label: 'Session:', value: sessionId },
              ]}
            />
          </div>
        </AppCard>
      ) : null}

      <section className="main__grid" aria-label="Acciones rápidas">
        {cards.map((c) => (
          <AppTile key={c.to} to={c.to} title={c.title} desc={c.desc} />
        ))}
      </section>
    </div>
  );
}
