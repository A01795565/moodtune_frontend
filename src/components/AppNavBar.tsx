import { Link } from 'react-router-dom';
import AppButton from './AppButton';
import type { ThemeMode } from '../utils/theme';
import './AppNavBar.css';

const SunIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none">
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
    <line x1="12" y1="2" x2="12" y2="4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="12" y1="20" x2="12" y2="22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="2" y1="12" x2="4" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="20" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3a.5.5 0 0 0-.46.75A7 7 0 0 0 20.25 14.96a.5.5 0 0 0 .75-.46Z" />
  </svg>
);

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
  
            <button
              type="button"
              className={`nav__theme-toggle nav__theme-toggle--${theme}`}
              onClick={onToggleTheme}
              aria-label={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
              aria-pressed={theme === 'dark'}
            >
              {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
            </button>

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
