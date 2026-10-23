import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  CloudOff,
  Download,
  Menu,
  RefreshCw,
  Search,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useInstall } from '../context/InstallContext';
import { useToast } from '../context/ToastContext';
import { timeAgo } from '../lib/format';
import { playSaleSound } from '../lib/notifications';
import { ActionMenu } from './ActionMenu';
import { Avatar } from './Avatar';
import { Logo } from './Logo';

type TopBarProps = {
  onOpenMenu: () => void;
  onOpenSearch: () => void;
};

export function TopBar({ onOpenMenu, onOpenSearch }: TopBarProps) {
  const navigate = useNavigate();
  const { settings, updateSettings, mode } = useAuth();
  const { sync, refreshAll, unreadCount, online } = useData();
  const { openInstall, installed } = useInstall();
  const { toast } = useToast();

  const toggleSound = async () => {
    const next = !settings.soundEnabled;
    updateSettings({ soundEnabled: next });
    if (next) {
      const played = await playSaleSound(settings.volume, true);
      toast({
        title: played ? 'Son activé' : 'Son activé — touchez l’écran',
        message: played ? 'Vous entendrez le cha-ching à chaque vente.' : undefined,
        tone: 'success',
        duration: 3500,
      });
    } else {
      toast({ title: 'Son désactivé', tone: 'info', duration: 2500 });
    }
  };

  const syncLabel = !online
    ? 'Hors ligne'
    : sync.refreshing
      ? 'Synchronisation…'
      : sync.lastSync
        ? `Synchronisé ${timeAgo(sync.lastSync)}`
        : 'En attente de synchronisation';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="icon-btn topbar-menu"
          onClick={onOpenMenu}
          aria-label="Ouvrir le menu"
        >
          <Menu size={20} />
        </button>

        <Link to="/" className="topbar-brand" aria-label="SeatShop — accueil">
          <Logo size={26} withText={false} />
          <span className="topbar-brand-text">
            <span className="topbar-brand-name">SeatShop</span>
            <span className="topbar-brand-sub">{settings.storeName || 'Seatiks Seller'}</span>
          </span>
        </Link>

        <div className={`topbar-sync ${sync.error ? 'is-error' : ''}`} title={sync.error || syncLabel}>
          {!online ? (
            <CloudOff size={13} />
          ) : (
            <span className="topbar-sync-dot" />
          )}
          <span>{syncLabel}</span>
        </div>
      </div>

      <div className="topbar-actions">
        <button type="button" className="topbar-search" onClick={onOpenSearch}>
          <Search size={16} />
          <span>Rechercher</span>
          <kbd>⌘K</kbd>
        </button>

        <button
          type="button"
          className="icon-btn topbar-icon-only-search"
          onClick={onOpenSearch}
          aria-label="Rechercher"
        >
          <Search size={19} />
        </button>

        <button
          type="button"
          className="icon-btn topbar-bell"
          onClick={() => navigate('/alerts')}
          aria-label={`Alertes${unreadCount ? `, ${unreadCount} non lues` : ''}`}
        >
          <Bell size={19} />
          {unreadCount > 0 ? (
            <span className="topbar-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          ) : null}
        </button>

        <ActionMenu
          label="Actions rapides"
          items={[
            {
              id: 'refresh',
              label: sync.refreshing ? 'Synchronisation…' : 'Actualiser les données',
              icon: RefreshCw,
              onSelect: () => void refreshAll(),
              disabled: mode === 'demo' || sync.refreshing,
            },
            {
              id: 'sound',
              label: settings.soundEnabled ? 'Son de vente activé' : 'Activer le son de vente',
              icon: settings.soundEnabled ? Volume2 : VolumeX,
              onSelect: () => void toggleSound(),
              checked: settings.soundEnabled,
            },
            ...(!installed
              ? [
                  {
                    id: 'install',
                    label: 'Installer l’application',
                    icon: Download,
                    onSelect: openInstall,
                  },
                ]
              : []),
          ]}
        />

        <button
          type="button"
          className="topbar-avatar"
          onClick={() => navigate('/settings')}
          aria-label="Ouvrir les paramètres"
        >
          <Avatar name={settings.displayName || settings.storeName || 'SeatShop'} size={32} />
        </button>
      </div>
    </header>
  );
}
