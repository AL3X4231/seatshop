import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AlertCircle, CloudOff, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { pageTitle } from '../lib/nav';
import { CommandPalette } from './CommandPalette';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { sync, online, refreshAll } = useData();
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.title = `${pageTitle(location.pathname)} · SeatShop`;
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app-shell">
      <ScrollToTop />
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      {menuOpen ? (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Fermer le menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <div className="app-main">
        <TopBar onOpenMenu={() => setMenuOpen(true)} onOpenSearch={() => setSearchOpen(true)} />

        {!online ? (
          <div className="status-banner status-banner-offline">
            <CloudOff size={15} />
            Vous êtes hors ligne. SeatShop affiche les dernières données enregistrées.
          </div>
        ) : null}

        {sync.error ? (
          <div className="status-banner status-banner-error">
            <AlertCircle size={15} />
            <span>{sync.error}</span>
            <button type="button" className="status-banner-action" onClick={() => void refreshAll()}>
              <RefreshCw size={13} />
              Réessayer
            </button>
          </div>
        ) : null}

        {sync.fromCache && !sync.error && online ? (
          <div className="status-banner status-banner-cache">
            <RefreshCw size={14} className={sync.refreshing ? 'spin' : ''} />
            {sync.refreshing
              ? 'Mise à jour des données Seatiks…'
              : 'Données chargées depuis le cache de l’appareil.'}
          </div>
        ) : null}

        <main className="content">
          <Outlet />
          <footer className="app-footer">
            <span>SeatShop · administration de vente non officielle</span>
            <span>API Seatiks · lecture seule</span>
          </footer>
        </main>
      </div>

      <MobileNav />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
