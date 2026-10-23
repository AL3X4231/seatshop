import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellRing,
  CheckCheck,
  ChevronRight,
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
import { ActionMenu } from '../components/ActionMenu';
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
            {unreadCount > 0 ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={markAlertsRead}
              >
                <CheckCheck size={16} />
                Tout lire
              </button>
            ) : null}
            <ActionMenu
              label="Actions sur les alertes"
              items={[
                {
                  id: 'test',
                  label: mode === 'demo' ? 'Simuler une vente' : 'Tester le son',
                  icon: mode === 'demo' ? Sparkles : Volume2,
                  onSelect: () => void (mode === 'demo' ? onSimulate() : testSound()),
                  disabled: simulating,
                },
                {
                  id: 'clear',
                  label: 'Effacer les alertes',
                  icon: Trash2,
                  onSelect: clearAlerts,
                  destructive: true,
                  disabled: !alerts.length,
                },
              ]}
            />
          </>
        }
      />

      <div className="card alerts-settings">
        <div className="alerts-setting-row">
          <span className={`alerts-setting-icon ${settings.soundEnabled ? 'is-ok' : 'is-off'}`}>
            <Volume2 size={18} />
          </span>
          <div className="alerts-setting-text">
            <strong>Son de vente</strong>
            <span>{settings.soundEnabled ? 'Cha-ching activé' : 'Désactivé'}</span>
          </div>
          <label className="toggle" aria-label="Son de vente">
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(event) => {
                const next = event.target.checked;
                updateSettings({ soundEnabled: next });
                if (next) void testSound();
              }}
            />
            <span className="toggle-track">
              <span className="toggle-thumb" />
            </span>
          </label>
        </div>

        <button
          type="button"
          className="alerts-setting-row"
          onClick={() => {
            if (permission === 'default') void enableNotifications();
            else navigate('/settings#notifications');
          }}
        >
          <span className={`alerts-setting-icon ${permission === 'granted' ? 'is-ok' : 'is-off'}`}>
            {permission === 'granted' ? <BellRing size={18} /> : <Bell size={18} />}
          </span>
          <div className="alerts-setting-text">
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
          {permission === 'granted' ? (
            <StatusPill tone="green" dot={false}>
              Autorisées
            </StatusPill>
          ) : permission === 'unsupported' ? (
            <StatusPill tone="gray" dot={false}>
              Indisponible
            </StatusPill>
          ) : permission === 'denied' ? (
            <StatusPill tone="amber" dot={false}>
              Bloquées
            </StatusPill>
          ) : (
            <span className="alerts-setting-action">Autoriser</span>
          )}
          <ChevronRight size={16} className="alerts-setting-chevron" />
        </button>

        {!installed ? (
          <button type="button" className="alerts-setting-row" onClick={openInstall}>
            <img
              className="alerts-setting-app-icon"
              src={`${import.meta.env.BASE_URL}icons/icon-180.png`}
              alt=""
              width={34}
              height={34}
            />
            <div className="alerts-setting-text">
              <strong>Installer SeatShop</strong>
              <span>Ajoutez l’app à l’écran d’accueil pour les notifications push.</span>
            </div>
            <span className="alerts-setting-action">Installer</span>
            <ChevronRight size={16} className="alerts-setting-chevron" />
          </button>
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
