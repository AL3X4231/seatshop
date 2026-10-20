import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellRing,
  CheckCheck,
  ChevronRight,
  Clock3,
  Settings,
  ShoppingBag,
  Sparkles,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useInstall } from '../context/InstallContext';
import { useToast } from '../context/ToastContext';
import {
  dayKey,
  formatDate,
  formatMoney,
  formatTime,
  timeAgo,
} from '../lib/format';
import {
  currentPushSubscription,
  notificationPermission,
  playSaleSound,
  requestNotificationPermission,
  showSystemNotification,
} from '../lib/notifications';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { StatusPill } from '../components/StatusPill';

function groupLabel(key: string): string {
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - 86400000));
  if (key === today) return "Aujourd'hui";
  if (key === yesterday) return 'Hier';
  return formatDate(key);
}

export function AlertsPage() {
  const navigate = useNavigate();
  const { mode, settings, updateSettings } = useAuth();
  const { alerts, unreadCount, markAlertsRead, markAlertRead, clearAlerts, simulateSale } =
    useData();
  const { installed, openInstall } = useInstall();
  const { toast } = useToast();
  const [permission, setPermission] = useState(() => notificationPermission());
  const [pushActive, setPushActive] = useState(false);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    void currentPushSubscription().then((subscription) => setPushActive(Boolean(subscription)));
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, typeof alerts>();
    alerts.forEach((alert) => {
      const key = dayKey(alert.createdAt);
      const list = map.get(key) || [];
      list.push(alert);
      map.set(key, list);
    });
    return Array.from(map.entries());
  }, [alerts]);

  const enableNotifications = async () => {
    const next = await requestNotificationPermission();
    setPermission(next);
    if (next === 'granted') {
      const played = await playSaleSound(settings.volume, true);
      await showSystemNotification({
        title: 'SeatShop',
        body: 'Les notifications fonctionnent. Vous serez prévenu à chaque vente.',
        tag: 'seatshop-welcome',
        url: `${window.location.origin}${import.meta.env.BASE_URL}#/alerts`,
      });
      toast({
        title: 'Notifications activées',
        message: played ? 'Le son et les alertes système sont prêts.' : 'Les alertes système sont prêtes.',
        tone: 'success',
      });
    } else if (next === 'denied') {
      toast({
        title: 'Notifications refusées',
        message: 'Autorisez SeatShop dans les réglages de votre téléphone.',
        tone: 'error',
      });
    }
  };

  const testSound = async () => {
    const played = await playSaleSound(settings.volume, true);
    toast({
      title: played ? 'Cha-ching !' : 'Son bloqué',
      message: played ? 'Le son de vente Shopify fonctionne.' : 'Touchez à nouveau l’écran puis réessayez.',
      tone: played ? 'success' : 'info',
    });
  };

  const onSimulate = async () => {
    setSimulating(true);
    try {
      await simulateSale();
    } finally {
      window.setTimeout(() => setSimulating(false), 500);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Alertes"
        subtitle={
          <>
            {alerts.length} alerte{alerts.length > 1 ? 's' : ''} · {unreadCount} non lue
            {unreadCount > 1 ? 's' : ''}
          </>
        }
        actions={
          <>
            {mode === 'demo' ? (
              <button type="button" className="btn btn-secondary" onClick={() => void onSimulate()} disabled={simulating}>
                <Sparkles size={16} />
                {simulating ? 'Vente…' : 'Simuler une vente'}
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={() => void testSound()}>
                <Volume2 size={16} />
                Tester le son
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={markAlertsRead}
              disabled={!unreadCount}
            >
              <CheckCheck size={16} />
              Tout lire
            </button>
          </>
        }
      />

      <div className="alerts-status-grid">
        <div className={`card alerts-status-card ${settings.soundEnabled ? 'is-ok' : 'is-off'}`}>
          <span className="alerts-status-icon">
            <Volume2 size={19} />
          </span>
          <div className="alerts-status-text">
            <strong>Son de vente</strong>
            <span>{settings.soundEnabled ? 'Cha-ching activé' : 'Désactivé'}</span>
          </div>
          <button
            type="button"
            className={`btn btn-sm ${settings.soundEnabled ? 'btn-ghost' : 'btn-primary'}`}
            onClick={() => {
              const next = !settings.soundEnabled;
              updateSettings({ soundEnabled: next });
              if (next) void testSound();
            }}
          >
            {settings.soundEnabled ? 'Désactiver' : 'Activer'}
          </button>
        </div>

        <div className={`card alerts-status-card ${permission === 'granted' ? 'is-ok' : 'is-off'}`}>
          <span className="alerts-status-icon">
            {permission === 'granted' ? <BellRing size={19} /> : <Bell size={19} />}
          </span>
          <div className="alerts-status-text">
            <strong>Notifications système</strong>
            <span>
              {permission === 'granted'
                ? pushActive
                  ? 'Push arrière-plan actif'
                  : 'Autorisées · push à configurer'
                : permission === 'denied'
                  ? 'Bloquées dans les réglages'
                  : permission === 'unsupported'
                    ? 'Non disponibles sur ce navigateur'
                    : 'Non autorisées'}
            </span>
          </div>
          {permission !== 'granted' && permission !== 'unsupported' ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void enableNotifications()}>
              Activer
            </button>
          ) : (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/settings')}>
              <Settings size={14} />
              Gérer
            </button>
          )}
        </div>

        {!installed ? (
          <div className="card alerts-status-card alerts-status-install">
            <img src={`${import.meta.env.BASE_URL}icons/icon-180.png`} alt="" width={34} height={34} />
            <div className="alerts-status-text">
              <strong>Sur iPhone ?</strong>
              <span>Installez SeatShop pour les notifications push iOS.</span>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={openInstall}>
              Installer
            </button>
          </div>
        ) : null}
      </div>

      {alerts.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Bell}
            title="Aucune alerte pour le moment"
            description="Dès qu’une vente est détectée, elle apparaît ici avec le son « cha-ching » et une notification."
            action={
              mode === 'demo' ? (
                <button type="button" className="btn btn-primary" onClick={() => void onSimulate()}>
                  <Sparkles size={16} />
                  Simuler une vente
                </button>
              ) : (
                <button type="button" className="btn btn-secondary" onClick={() => void testSound()}>
                  <Volume2 size={16} />
                  Tester le son
                </button>
              )
            }
          />
        </div>
      ) : (
        <>
          <div className="alerts-toolbar">
            <span className="alerts-toolbar-note">
              <Clock3 size={14} />
              Les alertes sont conservées sur cet appareil.
            </span>
            <button type="button" className="btn btn-ghost btn-sm btn-danger-ghost" onClick={clearAlerts}>
              <Trash2 size={14} />
              Effacer les alertes
            </button>
          </div>

          <div className="alerts-list">
            {groups.map(([key, group]) => (
              <section key={key} className="alerts-group">
                <div className="alerts-group-title">{groupLabel(key)}</div>
                <div className="card alerts-card">
                  {group.map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      className={`alert-row ${alert.read ? 'is-read' : 'is-unread'}`}
                      onClick={() => {
                        if (!alert.read) {
                          markAlertRead(alert.id);
                        }
                        navigate(`/sales/${alert.saleId}`);
                      }}
                    >
                      <span className={`alert-icon ${alert.read ? '' : 'is-unread'}`}>
                        <ShoppingBag size={18} />
                        {!alert.read ? <span className="alert-unread-dot" /> : null}
                      </span>
                      <span className="alert-main">
                        <span className="alert-title-row">
                          <strong>{alert.title}</strong>
                          <StatusPill tone="green" dot={false}>
                            {formatMoney(alert.amount, alert.currency)}
                          </StatusPill>
                        </span>
                        <span className="alert-body">{alert.body}</span>
                        <span className="alert-meta">
                          {formatTime(alert.createdAt)} · {timeAgo(alert.createdAt)}
                          {alert.demo ? ' · démo' : ''}
                        </span>
                      </span>
                      <ChevronRight size={16} className="alert-chevron" />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
