import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Download,
  ExternalLink,
  LayoutDashboard,
  Settings,
  ShoppingBag,
  Sparkles,
  Ticket,
  Volume2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useInstall } from '../context/InstallContext';
import { useToast } from '../context/ToastContext';
import { playSaleSound } from '../lib/notifications';
import { Avatar } from './Avatar';
import { Logo } from './Logo';
import { ModePill } from './StatusPill';

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

function NavItem({
  to,
  icon: Icon,
  label,
  end,
  badge,
  badgeTone = 'green',
  onClick,
}: {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  end?: boolean;
  badge?: number;
  badgeTone?: 'green' | 'amber';
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
      onClick={onClick}
    >
      <Icon size={18} strokeWidth={1.9} className="nav-icon" />
      <span className="nav-label">{label}</span>
      {badge && badge > 0 ? (
        <span className={`nav-badge nav-badge-${badgeTone}`}>{badge > 99 ? '99+' : badge}</span>
      ) : null}
    </NavLink>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { mode, settings } = useAuth();
  const { sales, alerts, unreadCount, simulateSale } = useData();
  const { openInstall, installed } = useInstall();
  const { toast } = useToast();
  const [simulating, setSimulating] = useState(false);
  const awaiting = sales.filter((sale) => sale.status === 'awaiting_delivery').length;

  const onSimulate = async () => {
    setSimulating(true);
    try {
      await simulateSale();
    } finally {
      window.setTimeout(() => setSimulating(false), 350);
    }
  };

  const onTestSound = async () => {
    const played = await playSaleSound(settings.volume, true);
    toast({
      title: played ? 'Cha-ching !' : 'Son bloqué par le navigateur',
      message: played
        ? 'Le son de vente fonctionne.'
        : 'Touchez à nouveau l’écran, puis réessayez depuis les réglages.',
      tone: played ? 'success' : 'info',
    });
  };

  return (
    <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Navigation principale">
      <div className="sidebar-head">
        <Logo size={34} />
        <button type="button" className="sidebar-close" onClick={onClose} aria-label="Fermer le menu">
          <X size={20} />
        </button>
      </div>

      <NavLink to="/settings" className="store-card" onClick={onClose}>
        <Avatar name={settings.storeName || 'Ma boutique'} size={34} square />
        <div className="store-card-text">
          <div className="store-card-name">{settings.storeName || 'Ma boutique'}</div>
          <div className="store-card-meta">
            <ModePill mode={mode} />
            <span>Seatiks</span>
          </div>
        </div>
        <ChevronRight size={16} className="store-card-chevron" />
      </NavLink>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Vue d’ensemble</div>
        <NavItem to="/" end icon={LayoutDashboard} label="Tableau de bord" onClick={onClose} />
        <NavItem
          to="/sales"
          icon={ShoppingBag}
          label="Ventes"
          badge={awaiting}
          badgeTone="amber"
          onClick={onClose}
        />
        <NavItem to="/listings" icon={Ticket} label="Inventaire" onClick={onClose} />
        <NavItem to="/events" icon={CalendarDays} label="Événements" onClick={onClose} />

        <div className="nav-section-label nav-section-spaced">Notifications</div>
        <NavItem
          to="/alerts"
          icon={Bell}
          label="Alertes"
          badge={unreadCount || alerts.length}
          badgeTone="green"
          onClick={onClose}
        />
        <NavItem to="/settings" icon={Settings} label="Paramètres" onClick={onClose} />
      </nav>

      <div className="sidebar-spacer" />

      {mode === 'demo' ? (
        <button
          type="button"
          className={`sidebar-action sidebar-action-demo ${simulating ? 'is-loading' : ''}`}
          onClick={() => void onSimulate()}
          disabled={simulating}
        >
          <Sparkles size={17} />
          <span>
            <strong>{simulating ? 'Vente en cours…' : 'Simuler une vente'}</strong>
            <small>Teste le son et les alertes</small>
          </span>
        </button>
      ) : (
        <button type="button" className="sidebar-action" onClick={() => void onTestSound()}>
          <Volume2 size={17} />
          <span>
            <strong>Tester le son</strong>
            <small>Le cha-ching Shopify</small>
          </span>
        </button>
      )}

      {!installed ? (
        <button type="button" className="sidebar-install" onClick={openInstall}>
          <span className="sidebar-install-icon">
            <Download size={17} />
          </span>
          <span className="sidebar-install-text">
            <strong>Installer sur iPhone</strong>
            <small>Gratuit · notifications incluses</small>
          </span>
          <ChevronRight size={15} />
        </button>
      ) : null}

      <a
        className="sidebar-external"
        href="https://seatiks.com"
        target="_blank"
        rel="noreferrer"
      >
        <ExternalLink size={15} />
        Ouvrir Seatiks
      </a>

      <NavLink to="/settings" className="sidebar-account" onClick={onClose}>
        <Avatar name={settings.displayName || 'Compte Seatiks'} size={32} />
        <span className="sidebar-account-text">
          <strong>{settings.displayName || 'Compte Seatiks'}</strong>
          <small>{mode === 'demo' ? 'Mode démonstration' : 'Administrateur'}</small>
        </span>
        <Settings size={16} className="sidebar-account-gear" />
      </NavLink>
    </aside>
  );
}
