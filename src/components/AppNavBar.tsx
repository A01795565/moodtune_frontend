import { Link } from 'react-router-dom';
import AppButton from './AppButton';
import type { ThemeMode } from '../utils/theme';
import './AppNavBar.css';

type NavItem = { to: string; label: string };

type Props = {
  brand: string;
  theme: ThemeMode;
  isAuthenticated: boolean;
  onLogout: () => void;
  onToggleTheme: () => void;
  authedItems?: NavItem[];
  publicItems?: NavItem[];
};

export default function AppNavBar({
  brand,
  theme,
  isAuthenticated,
  onLogout,
  onToggleTheme,
  authedItems = [],
  publicItems = [],
}: Props) {
    const items = isAuthenticated ? authedItems : publicItems;

    return (
      <header className="nav">
        <div className="nav__inner">
          <Link to="/" className="nav__brand">{brand}</Link>
  
          <nav className="nav__menu" aria-label="Principal">
            {items.map(({ to, label }) => (
              <Link key={to} to={to} className="nav__link">
                {label}
              </Link>
            ))}
  
            <AppButton
              variant="ghost"
              size="sm"
              onClick={onToggleTheme}
              ariaLabel={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
              className="nav__theme-toggle"
              ariaPressed={theme === 'light'}
            >
              <span className="nav__theme-toggle-prefix">Tema</span>
              <span className="nav__theme-toggle-state">
                {theme === 'dark' ? 'Oscuro' : 'Claro'}
              </span>
            </AppButton>

            {isAuthenticated && (
              <AppButton variant="ghost" onClick={onLogout} ariaLabel="Cerrar sesión">
                Logout
              </AppButton>
            )}
          </nav>
        </div>
      </header>
    );
}
