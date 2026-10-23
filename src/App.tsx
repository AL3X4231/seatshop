import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { InstallProvider } from './context/InstallContext';
import { ToastProvider } from './context/ToastContext';
import { InstallSheet } from './components/InstallSheet';
import { Layout, RequireAuth } from './components/Layout';
import { AlertsPage } from './pages/AlertsPage';
import { DashboardPage } from './pages/DashboardPage';
import { EventsPage } from './pages/EventsPage';
import { ListingsPage } from './pages/ListingsPage';
import { LoginPage } from './pages/LoginPage';
import { SalesPage } from './pages/SalesPage';
import { SettingsPage } from './pages/SettingsPage';

type ViewTransitionHandle = {
  finished: Promise<void>;
  skipTransition: () => void;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionHandle;
};

const SECTION_ORDER: Record<string, number> = {
  '/login': -1,
  '/': 0,
  '/sales': 1,
  '/listings': 2,
  '/events': 3,
  '/alerts': 4,
  '/settings': 5,
};

function sectionOf(pathname: string) {
  const segment = pathname.split('/').filter(Boolean)[0];
  return segment ? `/${segment}` : '/';
}

function orderOf(pathname: string) {
  return SECTION_ORDER[sectionOf(pathname)] ?? 0;
}

/**
 * Transition de navigation façon iOS.
 * Le contenu des pages glisse dans la direction de la navigation pendant que
 * la topbar, la sidebar et la barre d’onglets restent parfaitement stables.
 */
function AnimatedRoutes() {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const transitionRef = useRef<ViewTransitionHandle | null>(null);
  const transitionIdRef = useRef(0);

  useEffect(() => {
    if (location.pathname === displayLocation.pathname) {
      if (location.search !== displayLocation.search || location.hash !== displayLocation.hash) {
        setDisplayLocation(location);
      }
      return;
    }

    const doc = document as ViewTransitionDocument;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fromSection = sectionOf(displayLocation.pathname);
    const toSection = sectionOf(location.pathname);

    if (transitionRef.current) {
      transitionRef.current.skipTransition();
      transitionRef.current = null;
      document.documentElement.classList.remove('is-view-transition');
      delete document.documentElement.dataset.navDirection;
    }

    if (fromSection === toSection || !doc.startViewTransition || reduce) {
      setDisplayLocation(location);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      return;
    }

    const id = ++transitionIdRef.current;
    const root = document.documentElement;
    const direction = orderOf(location.pathname) >= orderOf(displayLocation.pathname) ? 'forward' : 'back';

    root.dataset.navDirection = direction;
    root.classList.add('view-transitions-enabled', 'is-view-transition');

    const transition = (() => {
      try {
        return doc.startViewTransition!(() => {
          flushSync(() => setDisplayLocation(location));
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        });
      } catch {
        root.classList.remove('is-view-transition');
        delete root.dataset.navDirection;
        setDisplayLocation(location);
        return null;
      }
    })();

    if (!transition) return;

    transitionRef.current = transition;
    void transition.finished
      .catch(() => {
        /* Transition interrompue par une navigation plus récente. */
      })
      .finally(() => {
        if (transitionIdRef.current !== id) return;
        transitionRef.current = null;
        root.classList.remove('is-view-transition');
        delete root.dataset.navDirection;
      });
  }, [location, displayLocation]);

  useEffect(
    () => () => {
      transitionRef.current?.skipTransition();
      document.documentElement.classList.remove('is-view-transition');
      delete document.documentElement.dataset.navDirection;
    },
    [],
  );

  return (
    <Routes location={displayLocation}>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="sales/:id" element={<SalesPage />} />
        <Route path="listings" element={<ListingsPage />} />
        <Route path="listings/:id" element={<ListingsPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/:id" element={<EventsPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function BootScreen() {
  useEffect(() => {
    const boot = document.getElementById('boot');
    if (!boot) return;
    const timer = window.setTimeout(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      boot.style.transition = reduce
        ? 'opacity 260ms ease'
        : 'opacity 320ms ease, transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1), filter 320ms ease';
      boot.style.opacity = '0';
      if (!reduce) {
        boot.style.transform = 'scale(1.04)';
        boot.style.filter = 'blur(3px)';
      }
      window.setTimeout(() => boot.remove(), reduce ? 300 : 440);
    }, 120);
    return () => window.clearTimeout(timer);
  }, []);
  return null;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <DataProvider>
          <InstallProvider>
            <BootScreen />
            <AnimatedRoutes />
            <InstallSheet />
          </InstallProvider>
        </DataProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
