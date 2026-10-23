import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BellRing,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Download,
  Eye,
  EyeOff,
  Github,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  Send,
  Server,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Volume2,
  Wallet,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useInstall } from '../context/InstallContext';
import { useToast } from '../context/ToastContext';
import {
  clearCache,
  loadPushEndpoint,
  savePushEndpoint,
} from '../lib/storage';
import {
  currentPushSubscription,
  fetchPushServerStatus,
  notificationPermission,
  notifyLatestSale,
  playSaleSound,
  requestNotificationPermission,
  sendTestPush,
  subscribeToPush,
  unsubscribeFromPush,
  type PushServerStatus,
} from '../lib/notifications';
import { formatDateTime } from '../lib/format';
import { PageHeader } from '../components/PageHeader';
import { ActionMenu } from '../components/ActionMenu';
import { StatusPill } from '../components/StatusPill';
import { Modal } from '../components/Modal';

const REPO_URL = import.meta.env.VITE_REPO_URL || 'https://github.com/AL3X4231/seatshop';
const WORKER_URL = `${REPO_URL}/tree/main/push-worker`;

const SETTINGS_SECTIONS = [
  { id: 'compte', label: 'Compte Seatiks' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'installation', label: 'Installation' },
  { id: 'application', label: 'Application' },
  { id: 'donnees', label: 'Données' },
  { id: 'apropos', label: 'À propos' },
];

function scrollToSettingsSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function Section({
  id,
  title,
  description,
  children,
  icon: Icon,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  icon: typeof Settings2;
}) {
  return (
    <section className="card settings-section" id={id}>
      <div className="settings-section-head">
        <span className="settings-section-icon">
          <Icon size={19} />
        </span>
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      <div className="settings-section-body">{children}</div>
    </section>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="setting-row">
      <div className="setting-row-text">
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
      </div>
      <div className="setting-row-control">{children}</div>
    </div>
  );
}

function LinkRow({
  icon: Icon,
  title,
  description,
  onClick,
  destructive = false,
}: {
  icon: typeof Settings2;
  title: string;
  description?: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      className={`settings-link-row ${destructive ? 'is-destructive' : ''}`}
      onClick={onClick}
    >
      <span className="settings-link-icon">
        <Icon size={17} strokeWidth={1.9} />
      </span>
      <span className="settings-link-text">
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
      </span>
      <ChevronRight size={17} className="settings-link-chevron" />
    </button>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { mode, apiKey, settings, updateSettings, signOut, resetApp } = useAuth();
  const { me, sales, alerts, sync, refreshAll, resetDemo } = useData();
  const { installed, openInstall, canInstall, promptInstall } = useInstall();
  const { toast } = useToast();

  const [showKey, setShowKey] = useState(false);
  const [storeName, setStoreName] = useState(settings.storeName);
  const [displayName, setDisplayName] = useState(settings.displayName);
  const [pushServer, setPushServer] = useState(settings.pushServerUrl);
  const [pushToken, setPushToken] = useState(settings.pushToken);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [serverStatus, setServerStatus] = useState<PushServerStatus | null>(null);
  const [permission, setPermission] = useState(() => notificationPermission());
  const [showPushHelp, setShowPushHelp] = useState(false);
  const [confirmResend, setConfirmResend] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const storageUsed = useMemo(() => {
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key?.startsWith('seatshop.')) {
          total += (localStorage.getItem(key) || '').length;
        }
      }
      return total;
    } catch {
      return 0;
    }
  }, [sales.length, alerts.length, settings]);

  useEffect(() => {
    setStoreName(settings.storeName);
    setDisplayName(settings.displayName);
    setPushServer(settings.pushServerUrl);
    setPushToken(settings.pushToken);
  }, [settings]);

  useEffect(() => {
    let cancelled = false;
    void currentPushSubscription().then((subscription) => {
      if (!cancelled) {
        setPushSubscribed(Boolean(subscription));
        if (subscription) savePushEndpoint(subscription.endpoint);
        else if (!loadPushEndpoint()) savePushEndpoint(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshServerStatus = async (url = settings.pushServerUrl, token = settings.pushToken) => {
    if (!url) return;
    try {
      const status = await fetchPushServerStatus(url, token);
      setServerStatus(status);
    } catch (error) {
      setServerStatus({ ok: false, lastError: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  useEffect(() => {
    if (settings.pushServerUrl) void refreshServerStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copié`, tone: 'success', duration: 2200 });
    } catch {
      toast({ title: 'Impossible de copier', tone: 'error' });
    }
  };

  const saveProfile = () => {
    updateSettings({ storeName: storeName.trim() || 'Ma boutique', displayName: displayName.trim() });
    toast({ title: 'Profil enregistré', tone: 'success' });
  };

  const testSound = async () => {
    const played = await playSaleSound(settings.volume, true);
    toast({
      title: played ? 'Cha-ching !' : 'Son bloqué',
      message: played ? 'Le son de vente fonctionne.' : 'Touchez l’écran et réessayez.',
      tone: played ? 'success' : 'info',
    });
  };

  const enablePermission = async () => {
    const next = await requestNotificationPermission();
    setPermission(next);
    if (next === 'granted') {
      toast({ title: 'Notifications autorisées', tone: 'success' });
    } else if (next === 'denied') {
      toast({ title: 'Notifications refusées', message: 'Modifiez les réglages iOS.', tone: 'error' });
    }
  };

  const connectPush = async () => {
    setPushError(null);
    if (!pushServer.trim()) {
      setPushError('Collez l’URL de votre Worker Cloudflare.');
      return;
    }
    if (!pushServer.startsWith('https://')) {
      setPushError('L’URL doit commencer par https:// (les notifications push exigent HTTPS).');
      return;
    }
    setPushBusy(true);
    try {
      updateSettings({ pushServerUrl: pushServer.trim().replace(/\/+$/, ''), pushToken: pushToken.trim() });
      await subscribeToPush(pushServer.trim().replace(/\/+$/, ''), pushToken.trim() || undefined);
      setPushSubscribed(true);
      setPermission(notificationPermission());
      await refreshServerStatus(pushServer.trim(), pushToken.trim());
      toast({
        title: 'Notifications push activées',
        message: 'Cet appareil recevra les nouvelles ventes, même app fermée.',
        tone: 'success',
      });
    } catch (error) {
      setPushError(error instanceof Error ? error.message : 'Impossible de s’abonner.');
    } finally {
      setPushBusy(false);
    }
  };

  const disconnectPush = async () => {
    setPushBusy(true);
    try {
      if (settings.pushServerUrl) {
        await unsubscribeFromPush(settings.pushServerUrl, settings.pushToken || undefined);
      }
      setPushSubscribed(false);
      savePushEndpoint(null);
      toast({ title: 'Push désactivé sur cet appareil', tone: 'info' });
    } catch (error) {
      setPushError(error instanceof Error ? error.message : 'Impossible de se désabonner.');
    } finally {
      setPushBusy(false);
    }
  };

  const testPush = async () => {
    setPushBusy(true);
    setPushError(null);
    try {
      const result = await sendTestPush(
        settings.pushServerUrl,
        settings.pushToken || undefined,
      );
      toast({
        title: 'Notification de test envoyée',
        message: `${result.sent || 0} appareil(s) contacté(s). Elle peut prendre quelques secondes.`,
        tone: 'success',
      });
      await refreshServerStatus();
    } catch (error) {
      setPushError(error instanceof Error ? error.message : 'Le test a échoué.');
    } finally {
      setPushBusy(false);
    }
  };

  const resendLatest = async () => {
    setConfirmResend(false);
    setPushBusy(true);
    setPushError(null);
    try {
      const result = await notifyLatestSale(
        settings.pushServerUrl,
        settings.pushToken || undefined,
      );
      const sent = result.sent || 0;
      toast({
        title: sent ? 'Dernière vente renvoyée' : 'Aucun appareil abonné',
        message: sent
          ? `Notification envoyée à ${sent} appareil(s).`
          : result.message || 'Aucun appareil n’est encore abonné au push.',
        tone: sent ? 'success' : 'info',
      });
      await refreshServerStatus();
    } catch (error) {
      setPushError(
        error instanceof Error ? error.message : 'Impossible de renvoyer la dernière vente.',
      );
    } finally {
      setPushBusy(false);
    }
  };

  const onClearCache = () => {
    clearCache(mode);
    if (mode === 'demo') {
      resetDemo();
    } else {
      void refreshAll();
    }
    toast({ title: 'Cache vidé', message: 'Les données vont être rechargées.', tone: 'success' });
  };

  const onResetApp = () => {
    resetApp();
    navigate('/login', { replace: true });
  };

  const scopes = me?.scopes || [];
  const maskedKey = apiKey
    ? showKey
      ? apiKey
      : `${apiKey.slice(0, 12)}${'•'.repeat(Math.max(8, apiKey.length - 16))}${apiKey.slice(-4)}`
    : '—';

  return (
    <div className="page">
      <PageHeader title="Paramètres" />

      <div className="settings-jump-wrap">
        <select
          className="select settings-jump"
          defaultValue=""
          aria-label="Aller à une section des réglages"
          onChange={(event) => {
            const section = event.target.value;
            if (section) scrollToSettingsSection(section);
            event.target.value = '';
          }}
        >
          <option value="" disabled>
            Aller à une section
          </option>
          {SETTINGS_SECTIONS.map((section) => (
            <option key={section.id} value={section.id}>
              {section.label}
            </option>
          ))}
        </select>
      </div>

      <div className="settings-layout">
        <aside className="settings-nav">
          {SETTINGS_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSettingsSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </aside>

        <div className="settings-content">
          <Section
            id="compte"
            icon={KeyRound}
            title="Compte Seatiks"
            description="La connexion utilisée par cette application."
          >
            <div className="account-summary">
              <div className={`account-avatar ${mode === 'demo' ? 'is-demo' : ''}`}>
                <Wallet size={22} />
              </div>
              <div className="account-main">
                <div className="account-name">
                  {settings.storeName || 'Ma boutique'}
                  <StatusPill tone={mode === 'demo' ? 'amber' : 'green'} dot={false}>
                    {mode === 'demo' ? 'DÉMO' : 'LIVE'}
                  </StatusPill>
                </div>
                <div className="account-meta">
                  {mode === 'demo'
                    ? 'Données fictives stockées sur cet appareil'
                    : `Seller ${me?.seller_id?.slice(0, 8) || '…'}… · ${me?.team_member ? 'Membre d’équipe' : 'Propriétaire'}`}
                </div>
              </div>
              <div className="account-kyc">
                {me?.kyc_status === 'approved' ? (
                  <StatusPill tone="green" dot={false}>
                    <ShieldCheck size={12} /> Vérifié
                  </StatusPill>
                ) : (
                  <StatusPill tone="amber" dot={false}>
                    KYC {me?.kyc_status || 'inconnu'}
                  </StatusPill>
                )}
              </div>
            </div>

            {mode === 'live' ? (
              <>
                <div className="api-key-box">
                  <div className="api-key-head">
                    <span>Clé API</span>
                    <div className="api-key-actions">
                      <button type="button" className="icon-btn icon-btn-sm" onClick={() => setShowKey((visible) => !visible)} aria-label={showKey ? 'Masquer' : 'Afficher'}>
                        {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button type="button" className="icon-btn icon-btn-sm" onClick={() => apiKey && void copy(apiKey, 'Clé API')} aria-label="Copier">
                        <Copy size={15} />
                      </button>
                    </div>
                  </div>
                  <code className="api-key-value">{maskedKey}</code>
                </div>

                <div className="scope-block">
                  <div className="scope-block-label">Scopes de cette clé</div>
                  <div className="scope-list">
                    {(scopes.length ? scopes : ['events:read', 'listings:read', 'sales:read']).map((scope) => (
                      <span key={scope}>
                        <CheckCircle2 size={13} /> {scope}
                      </span>
                    ))}
                    {!scopes.includes('wallet:read') ? (
                      <span className="scope-missing">
                        <LockKeyhole size={13} /> wallet:read
                      </span>
                    ) : null}
                  </div>
                  <p className="settings-hint">
                    Cette application est en lecture seule. Pour livrer des billets ou modifier des
                    annonces, utilisez votre tableau de bord Seatiks.
                  </p>
                </div>

                <div className="settings-link-list">
                  <LinkRow
                    icon={KeyRound}
                    title="Changer de clé API"
                    description="Se déconnecter puis utiliser une autre clé Seatiks."
                    onClick={() => {
                      signOut();
                      navigate('/login', { replace: true });
                    }}
                  />
                  <LinkRow
                    icon={Trash2}
                    title="Réinitialiser l’application"
                    description="Supprime la clé, les préférences, le cache et les alertes."
                    onClick={() => setConfirmReset(true)}
                    destructive
                  />
                </div>
              </>
            ) : (
              <div className="demo-account-actions">
                <p className="settings-hint">
                  Vous explorez la démonstration. Aucune clé API n’est utilisée. Les ventes simulées
                  restent sur cet appareil.
                </p>
                <div className="settings-link-list">
                  <LinkRow
                    icon={RotateCcw}
                    title="Réinitialiser la démo"
                    description="Restaure les ventes et alertes de démonstration."
                    onClick={() => resetDemo()}
                  />
                  <LinkRow
                    icon={KeyRound}
                    title="Connecter mon compte"
                    description="Utiliser une clé API Seatiks en lecture seule."
                    onClick={() => {
                      signOut();
                      navigate('/login', { replace: true });
                    }}
                  />
                </div>
              </div>
            )}
          </Section>

          <Section
            id="notifications"
            icon={BellRing}
            title="Notifications"
            description="Le son Shopify au premier plan, et les alertes push optionnelles en arrière-plan."
          >
            <SettingRow
              title="Son de vente"
              description="Joue le vrai son « cha-ching » à chaque nouvelle vente détectée."
            >
              <label className={`toggle ${settings.soundEnabled ? 'is-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(event) => {
                    updateSettings({ soundEnabled: event.target.checked });
                    if (event.target.checked) void testSound();
                  }}
                />
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
              </label>
            </SettingRow>

            <SettingRow title="Volume" description="Ajustez le volume du son de vente.">
              <div className="volume-control">
                <Volume2 size={16} />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.volume}
                  onChange={(event) => updateSettings({ volume: Number(event.target.value) })}
                  aria-label="Volume du son"
                />
                <span>{Math.round(settings.volume * 100)} %</span>
              </div>
            </SettingRow>

            <div className="settings-actions-row settings-actions-tight">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void testSound()}>
                <Volume2 size={15} />
                Tester le son
              </button>
              <span className="settings-inline-note">
                Astuce : le son ne peut démarrer qu’après un premier toucher sur l’écran.
              </span>
            </div>

            <div className="settings-divider" />

            <SettingRow
              title="Notifications système"
              description={
                permission === 'granted'
                  ? 'SeatShop est autorisé à afficher des notifications.'
                  : permission === 'denied'
                    ? 'Bloquées. Autorisez-les dans les réglages du téléphone.'
                    : 'Autorisez les alertes pour être prévenu hors de l’application.'
              }
            >
              {permission === 'granted' ? (
                <StatusPill tone="green" dot={false}>
                  <Check size={12} /> Autorisées
                </StatusPill>
              ) : permission === 'unsupported' ? (
                <StatusPill tone="gray" dot={false}>
                  Non disponible
                </StatusPill>
              ) : (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => void enablePermission()}>
                  Autoriser
                </button>
              )}
            </SettingRow>

            <div className={`push-card ${pushSubscribed ? 'is-active' : ''}`} id="push">
              <div className="push-card-head">
                <span className="push-card-icon">
                  <Server size={19} />
                </span>
                <div>
                  <strong>Notifications push en arrière-plan</strong>
                  <span>
                    Reçoit les ventes quand l’application est fermée, via un Worker Cloudflare gratuit.
                  </span>
                </div>
                {pushSubscribed ? (
                  <StatusPill tone="green" dot={false}>
                    <Wifi size={12} /> Actif
                  </StatusPill>
                ) : (
                  <StatusPill tone="gray" dot={false}>
                    <WifiOff size={12} /> Inactif
                  </StatusPill>
                )}
              </div>

              <div className="push-form">
                <label>
                  URL du Worker
                  <input
                    className="input"
                    value={pushServer}
                    onChange={(event) => setPushServer(event.target.value)}
                    placeholder="https://seatshop-push.votre-compte.workers.dev"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
                <label>
                  Jeton d’abonnement <span className="label-optional">(optionnel)</span>
                  <input
                    className="input"
                    value={pushToken}
                    onChange={(event) => setPushToken(event.target.value)}
                    placeholder="Si vous avez défini SUBSCRIBE_TOKEN"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
                <div className="push-form-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void connectPush()}
                    disabled={pushBusy}
                  >
                    {pushBusy ? <span className="spinner" /> : <Server size={16} />}
                    {pushSubscribed ? 'Mettre à jour' : 'Connecter'}
                  </button>
                  <ActionMenu
                    label="Actions des notifications push"
                    items={[
                      ...(pushSubscribed
                        ? [
                            {
                              id: 'test-push',
                              label: 'Envoyer une notification de test',
                              icon: BellRing,
                              onSelect: () => void testPush(),
                              disabled: pushBusy,
                            },
                          ]
                        : []),
                      ...(settings.pushServerUrl
                        ? [
                            {
                              id: 'resend',
                              label: 'Renvoyer la dernière vente',
                              icon: Send,
                              onSelect: () => setConfirmResend(true),
                              disabled: pushBusy,
                            },
                          ]
                        : []),
                      ...(pushSubscribed
                        ? [
                            {
                              id: 'disconnect',
                              label: 'Déconnecter cet appareil',
                              icon: WifiOff,
                              onSelect: () => void disconnectPush(),
                              destructive: true,
                              disabled: pushBusy,
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
                {pushError ? <div className="form-error">{pushError}</div> : null}
              </div>

              {serverStatus ? (
                <div className="push-status-grid">
                  <div>
                    <span>Appareils abonnés</span>
                    <strong>{serverStatus.subscriptions ?? '—'}</strong>
                  </div>
                  <div>
                    <span>Dernière vérification</span>
                    <strong>
                      {serverStatus.lastCheck ? formatDateTime(serverStatus.lastCheck) : '—'}
                    </strong>
                  </div>
                  <div>
                    <span>Dernier événement</span>
                    <strong>{serverStatus.lastSaleAt ? formatDateTime(serverStatus.lastSaleAt) : '—'}</strong>
                  </div>
                  <div>
                    <span>État</span>
                    <strong className={serverStatus.lastError ? 'text-danger' : 'text-success'}>
                      {serverStatus.lastError ? 'Erreur' : 'OK'}
                    </strong>
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                className="push-help-toggle"
                onClick={() => setShowPushHelp((visible) => !visible)}
              >
                Comment activer le push gratuitement ?
                <ChevronRight size={15} className={showPushHelp ? 'is-rotated' : ''} />
              </button>

              {showPushHelp ? (
                <div className="push-help">
                  <div className="push-help-step">
                    <span>1</span>
                    <div>
                      <strong>Déployez le Worker gratuit</strong>
                      <p>
                        Le dossier <code>push-worker</code> contient un Worker Cloudflare prêt à
                        l’emploi. Il vérifie les ventes chaque minute et envoie les notifications.
                      </p>
                      <a href={WORKER_URL} target="_blank" rel="noreferrer" className="text-link">
                        <Github size={14} /> Voir le guide et le code
                      </a>
                    </div>
                  </div>
                  <div className="push-help-step">
                    <span>2</span>
                    <div>
                      <strong>Configurez l’URL de l’application</strong>
                      <p>
                        Dans <code>wrangler.toml</code>, remplacez <code>APP_URL</code> par l’URL
                        exacte de cette PWA, puis déployez avec <code>npx wrangler deploy</code>.
                      </p>
                    </div>
                  </div>
                  <div className="push-help-step">
                    <span>3</span>
                    <div>
                      <strong>Collez l’URL du Worker ci-dessus</strong>
                      <p>
                        Cliquez sur « Connecter ». La clé VAPID est générée automatiquement par le
                        Worker. Aucun compte Apple nécessaire.
                      </p>
                    </div>
                  </div>
                  <div className="push-help-step">
                    <span>4</span>
                    <div>
                      <strong>Installez la PWA sur l’écran d’accueil</strong>
                      <p>
                        Sur iPhone, les notifications push iOS exigent une PWA installée depuis
                        Safari (iOS 16.4 ou plus).
                      </p>
                    </div>
                  </div>
                  <div className="push-help-note">
                    <LockKeyhole size={14} />
                    Votre clé API Seatiks n’est jamais envoyée au Worker : elle est stockée comme
                    secret Cloudflare, côté serveur.
                  </div>
                </div>
              ) : null}
            </div>
          </Section>

          <Section
            id="installation"
            icon={Smartphone}
            title="Installation"
            description="Une vraie PWA, gratuite, sans App Store."
          >
            <div className={`install-setting ${installed ? 'is-installed' : ''}`}>
              <img src={`${import.meta.env.BASE_URL}icons/icon-180.png`} alt="" width={52} height={52} />
              <div>
                <strong>{installed ? 'SeatShop est installée sur cet appareil' : 'Installer SeatShop'}</strong>
                <span>
                  {installed
                    ? 'L’application s’ouvre en plein écran et peut recevoir des notifications.'
                    : 'Sur iPhone : Safari → Partager → Sur l’écran d’accueil.'}
                </span>
              </div>
              {installed ? (
                <StatusPill tone="green" dot={false}>
                  <Check size={12} /> Installée
                </StatusPill>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => (canInstall ? void promptInstall() : openInstall())}
                >
                  <Download size={15} />
                  Installer
                </button>
              )}
            </div>
            <div className="install-tips">
              <div>
                <Smartphone size={16} />
                <span>
                  <strong>iPhone</strong> Safari → bouton Partager → « Sur l’écran d’accueil ».
                </span>
              </div>
              <div>
                <Download size={16} />
                <span>
                  <strong>Android</strong> Chrome → menu → « Installer l’application ».
                </span>
              </div>
              <div>
                <BellRing size={16} />
                <span>
                  <strong>Notifications</strong> ouvrez l’app installée, puis autorisez les alertes.
                </span>
              </div>
            </div>
          </Section>

          <Section
            id="application"
            icon={Settings2}
            title="Application"
            description="Personnalisez l’affichage et la fréquence de synchronisation."
          >
            <div className="settings-form-grid">
              <label>
                Nom de la boutique
                <input
                  className="input"
                  value={storeName}
                  onChange={(event) => setStoreName(event.target.value)}
                  placeholder="Ma boutique"
                />
              </label>
              <label>
                Votre prénom
                <input
                  className="input"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Alex"
                />
              </label>
            </div>
            <div className="settings-actions-row settings-actions-tight">
              <button type="button" className="btn btn-primary btn-sm" onClick={saveProfile}>
                <Check size={15} />
                Enregistrer
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setStoreName('Ma boutique');
                  setDisplayName('');
                  updateSettings({ storeName: 'Ma boutique', displayName: '' });
                }}
              >
                Réinitialiser
              </button>
            </div>

            <div className="settings-divider" />

            <SettingRow
              title="Fréquence de vérification"
              description="Intervalle de détection des nouvelles ventes quand l’application est ouverte."
            >
              <select
                className="select"
                value={settings.pollInterval}
                onChange={(event) => updateSettings({ pollInterval: Number(event.target.value) })}
              >
                <option value={15}>Toutes les 15 secondes</option>
                <option value={30}>Toutes les 30 secondes</option>
                <option value={60}>Chaque minute</option>
                <option value={120}>Toutes les 2 minutes</option>
              </select>
            </SettingRow>

            <SettingRow
              title="Partager SeatShop"
              description="Envoyez le lien d’installation à un collègue."
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                  const url = window.location.origin + import.meta.env.BASE_URL;
                  if (navigator.share) {
                    try {
                      await navigator.share({ title: 'SeatShop', url });
                    } catch {
                      /* cancelled */
                    }
                  } else {
                    await copy(url, 'Lien');
                  }
                }}
              >
                Partager
              </button>
            </SettingRow>
          </Section>

          <Section
            id="donnees"
            icon={RotateCcw}
            title="Données"
            description="Tout est stocké localement sur cet appareil."
          >
            <div className="data-stats">
              <div>
                <span>Ventes en mémoire</span>
                <strong>{sales.length}</strong>
              </div>
              <div>
                <span>Alertes</span>
                <strong>{alerts.length}</strong>
              </div>
              <div>
                <span>Stockage local</span>
                <strong>{storageUsed > 1024 ? `${Math.round(storageUsed / 1024)} Ko` : `${storageUsed} o`}</strong>
              </div>
              <div>
                <span>Dernière synchro</span>
                <strong>{sync.lastSync ? formatDateTime(sync.lastSync) : '—'}</strong>
              </div>
            </div>

            <div className="settings-link-list">
              <LinkRow
                icon={RefreshCw}
                title="Vider le cache"
                description="Recharge les données depuis Seatiks ou la démo."
                onClick={onClearCache}
              />
              {mode === 'demo' ? (
                <LinkRow
                  icon={RotateCcw}
                  title="Réinitialiser la démo"
                  description="Restaure les ventes et alertes fictives."
                  onClick={() => resetDemo()}
                />
              ) : null}
              <LinkRow
                icon={Trash2}
                title="Tout effacer sur cet appareil"
                description="Clé API, préférences, cache et alertes."
                onClick={() => setConfirmReset(true)}
                destructive
              />
            </div>

            <p className="settings-hint">
              SeatShop ne stocke rien sur un serveur. Votre clé API, vos préférences et les alertes
              restent dans le stockage local du navigateur. Vider les données du site dans Safari
              les supprime aussi.
            </p>
          </Section>

          <Section
            id="apropos"
            icon={Sparkles}
            title="À propos"
            description="SeatShop, une PWA de vente non officielle pour Seatiks."
          >
            <div className="about-grid">
              <div className="about-brand">
                <img src={`${import.meta.env.BASE_URL}icons/icon-180.png`} alt="" width={56} height={56} />
                <div>
                  <strong>SeatShop</strong>
                  <span>Version 1.0.0 · PWA</span>
                </div>
              </div>
              <div className="about-list">
                <div>
                  <span>API</span>
                  <strong>Seatiks Seller API v1</strong>
                </div>
                <div>
                  <span>Icône</span>
                  <strong>Seatiks</strong>
                </div>
                <div>
                  <span>Son</span>
                  <strong>Shopify sale sound</strong>
                </div>
                <div>
                  <span>Mode</span>
                  <strong>{mode === 'demo' ? 'Démonstration' : 'Live'}</strong>
                </div>
              </div>
            </div>
            <p className="settings-hint">
              SeatShop n’est pas affilié à Shopify ni à Seatiks. Les marques et le son appartiennent à
              leurs propriétaires. Application destinée à un usage personnel de gestion de vos
              propres ventes.
            </p>
            <div className="about-links">
              <a href="https://seatiks.com" target="_blank" rel="noreferrer" className="text-link">
                Seatiks <ChevronRight size={13} />
              </a>
              <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-link">
                <Github size={14} /> Code source
              </a>
              <button
                type="button"
                className="text-link"
                onClick={() => void copy(window.location.origin + import.meta.env.BASE_URL, 'Lien')}
              >
                <Copy size={14} /> Copier le lien
              </button>
            </div>
          </Section>
        </div>
      </div>

      <Modal
        open={confirmResend}
        onClose={() => setConfirmResend(false)}
        title="Renvoyer la dernière vente ?"
        subtitle="Tous les appareils abonnés au push recevront la notification de la dernière vente enregistrée dans Seatiks."
        size="sm"
        footer={
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmResend(false)}>
              Annuler
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void resendLatest()}>
              <Send size={15} />
              Renvoyer
            </button>
          </div>
        }
      >
        <div className="confirm-box">
          <BellRing size={22} />
          <p>
            Utile après une coupure ou pour rattraper une vente manquée. Chaque appareil abonné ne
            recevra qu’une seule notification pour cette vente.
          </p>
        </div>
      </Modal>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Tout réinitialiser ?"
        subtitle="Cette action supprime la clé API, les préférences, le cache et les alertes de cet appareil."
        size="sm"
        footer={
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmReset(false)}>
              Annuler
            </button>
            <button type="button" className="btn btn-danger" onClick={onResetApp}>
              <Trash2 size={15} />
              Réinitialiser
            </button>
          </div>
        }
      >
        <div className="confirm-box">
          <AlertTriangle size={22} />
          <p>
            Vous devrez recollez votre clé API Seatiks pour vous reconnecter. Les données Seatiks
            elles-mêmes ne sont pas modifiées.
          </p>
        </div>
      </Modal>
    </div>
  );
}
