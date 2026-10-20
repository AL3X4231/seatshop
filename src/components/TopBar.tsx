import { useLocation, useNavigate } from 'react-router-dom';
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
import { pageSection, pageTitle } from '../lib/nav';
import { playSaleSound } from '../lib/notifications';
import { Avatar } from './Avatar';
import { Logo } from './Logo';

type TopBarProps = {
  onOpenMenu: () => void;
  onOpenSearch: () => void;
};

export function TopBar({ onOpenMenu, onOpenSearch }: TopBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, updateSettings, mode } = useAuth();
  const { sync, refreshAll, unreadCount, online } = useData();
  const { openInstall, installed } = useInstall();
  const { toast } = useToast();

  const title = pageTitle(location.pathname);
  const section = pageSection(location.pathname);

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

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="icon-btn topbar-menu" onClick={onOpenMenu} aria-label="Ouvrir le menu">
          <Menu size={20} />
        </button>
        <div className="topbar-mobile-logo">
          <Logo size={28} withText={false} />
        </div>
        <div className="topbar-heading">
          <div className="topbar-breadcrumb">
            <span>SeatShop</span>
            <span className="topbar-slash">/</span>
            <span>{section}</span>
          </div>
          <div className="topbar-title">{title}</div>
        </div>
        <div className={`topbar-sync ${sync.error ? 'is-error' : ''}`} title={sync.error || undefined}>
          <span className="topbar-sync-dot" />
          {!online ? (
            <>
              <CloudOff size={13} /> Hors ligne
            </>
          ) : sync.refreshing ? (
            'Synchronisation…'
          ) : sync.lastSync ? (
            `Synchronisé ${timeAgo(sync.lastSync)}`
          ) : (
            'En attente de synchronisation'
          )}
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
          className={`icon-btn topbar-refresh ${sync.refreshing ? 'is-spinning' : ''}`}
          onClick={() => void refreshAll()}
          aria-label="Actualiser les données"
          title="Actualiser"
          disabled={mode === 'demo'}
        >
          <RefreshCw size={18} />
        </button>

        <button
          type="button"
          className={`icon-btn ${settings.soundEnabled ? 'is-active-soft' : ''}`}
          onClick={() => void toggleSound()}
          aria-label={settings.soundEnabled ? 'Désactiver le son' : 'Activer le son'}
          title={settings.soundEnabled ? 'Son activé' : 'Son désactivé'}
        >
          {settings.soundEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
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

        {!installed ? (
          <button
            type="button"
            className="btn btn-secondary topbar-install"
            onClick={openInstall}
          >
            <Download size={16} />
            <span>Installer</span>
          </button>
        ) : null}

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
