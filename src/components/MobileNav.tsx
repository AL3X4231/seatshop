import { NavLink } from 'react-router-dom';
import { Bell, Home, Settings, ShoppingBag, Ticket } from 'lucide-react';
import { useData } from '../context/DataContext';

const items = [
  { to: '/', icon: Home, label: 'Accueil', end: true },
  { to: '/sales', icon: ShoppingBag, label: 'Ventes' },
  { to: '/listings', icon: Ticket, label: 'Inventaire' },
  { to: '/alerts', icon: Bell, label: 'Alertes' },
  { to: '/settings', icon: Settings, label: 'Réglages' },
];

export function MobileNav() {
  const { sales, unreadCount } = useData();
  const awaiting = sales.filter((sale) => sale.status === 'awaiting_delivery').length;

  return (
    <nav className="mobile-nav" aria-label="Navigation mobile">
      {items.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'is-active' : ''}`}
        >
          <span className="mobile-nav-icon">
            <Icon size={21} strokeWidth={1.9} />
            {to === '/sales' && awaiting > 0 ? (
              <span className="mobile-nav-badge">{awaiting > 9 ? '9+' : awaiting}</span>
            ) : null}
            {to === '/alerts' && unreadCount > 0 ? (
              <span className="mobile-nav-badge mobile-nav-badge-alert">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </span>
          <span className="mobile-nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
