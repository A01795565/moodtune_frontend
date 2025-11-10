import { Link } from 'react-router-dom';
import AppButton from './AppButton';
import './AppNavBar.css';

type NavItem = { to: string; label: string };

type Props = {
  brand: string;
  isAuthenticated: boolean;
  onLogout: () => void;
  authedItems?: NavItem[];
  publicItems?: NavItem[];
};

export default function AppNavBar({
  brand,
  isAuthenticated,
  onLogout,
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
