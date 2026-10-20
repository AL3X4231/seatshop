import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
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

function BootScreen() {
  useEffect(() => {
    const boot = document.getElementById('boot');
    if (!boot) return;
    const timer = window.setTimeout(() => {
      boot.style.transition = 'opacity 260ms ease';
      boot.style.opacity = '0';
      window.setTimeout(() => boot.remove(), 300);
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
            <Routes>
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
            <InstallSheet />
          </InstallProvider>
        </DataProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
