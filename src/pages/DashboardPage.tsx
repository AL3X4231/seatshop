import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  PackageCheck,
  ShoppingBag,
  Sparkles,
  Ticket,
  TrendingUp,
  Volume2,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useInstall } from '../context/InstallContext';
import { useToast } from '../context/ToastContext';
import {
  addDays,
  dayKey,
  formatDateLong,
  formatMoney,
  formatNumber,
  inPeriod,
  periodLabel,
  periodStart,
  saleStatus,
  startOfDay,
  timeAgo,
  type Period,
} from '../lib/format';
import {
  notificationPermission,
  playSaleSound,
  requestNotificationPermission,
} from '../lib/notifications';
import { PageHeader } from '../components/PageHeader';
import { RevenueChart, type RevenuePoint } from '../components/RevenueChart';
import { Sparkline } from '../components/Sparkline';
import { StatusPill } from '../components/StatusPill';
import { Avatar, MarketplaceAvatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';

type ChartRange = '7d' | '30d';

function changePercent(current: number, previous: number): number | null {
  if (!previous) return current > 0 ? 1 : null;
  return (current - previous) / previous;
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="kpi-delta is-neutral">—</span>;
  const positive = value >= 0;
  return (
    <span className={`kpi-delta ${positive ? 'is-up' : 'is-down'}`}>
      {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {new Intl.NumberFormat('fr-FR', {
        style: 'percent',
        maximumFractionDigits: 1,
        signDisplay: 'always',
      }).format(value)}
    </span>
  );
}

function KpiCard({
  label,
  value,
  sub,
  delta,
  icon: Icon,
  spark,
  tone = 'green',
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
  icon: typeof Wallet;
  spark?: number[];
  tone?: 'green' | 'blue' | 'violet' | 'amber';
}) {
  return (
    <div className={`card kpi-card kpi-${tone}`}>
      <div className="kpi-top">
        <span className="kpi-icon">
          <Icon size={18} />
        </span>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-value-row">
        <div className="kpi-value">{value}</div>
        {spark ? <Sparkline data={spark} color={tone === 'blue' ? '#2c6ecb' : tone === 'violet' ? '#7b5cf0' : tone === 'amber' ? '#b98900' : '#008060'} /> : null}
      </div>
      <div className="kpi-bottom">
        {delta !== undefined ? <Delta value={delta} /> : null}
        {sub ? <span className="kpi-sub">{sub}</span> : null}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { mode, settings, updateSettings } = useAuth();
  const { sales, listings, events, sync, simulateSale, me } = useData();
  const { installed, openInstall } = useInstall();
  const { toast } = useToast();
  const [period, setPeriod] = useState<Period>('7d');
  const [chartRange, setChartRange] = useState<ChartRange>('7d');
  const [simulating, setSimulating] = useState(false);
  const [notifPermission, setNotifPermission] = useState(() => notificationPermission());

  const periodSales = useMemo(
    () => sales.filter((sale) => inPeriod(sale.created_at, period)),
    [sales, period],
  );

  const previousSales = useMemo(() => {
    if (period === 'all') return [];
    const start = periodStart(period);
    if (!start) return [];
    const days = period === 'today' ? 1 : period === '7d' ? 7 : 30;
    const previousStart = startOfDay(addDays(start, -days));
    return sales.filter((sale) => {
      const date = new Date(sale.created_at);
      return date >= previousStart && date < start;
    });
  }, [sales, period]);

  const revenue = periodSales.reduce((sum, sale) => sum + sale.payout.total_amount, 0);
  const previousRevenue = previousSales.reduce((sum, sale) => sum + sale.payout.total_amount, 0);
  const tickets = periodSales.reduce((sum, sale) => sum + sale.quantity, 0);
  const previousTickets = previousSales.reduce((sum, sale) => sum + sale.quantity, 0);
  const average = periodSales.length ? revenue / periodSales.length : 0;
  const previousAverage = previousSales.length ? previousRevenue / previousSales.length : 0;
  const currency = periodSales[0]?.payout.currency || me?.default_currency || 'USD';

  const awaiting = sales.filter((sale) => sale.status === 'awaiting_delivery');
  const underReview = sales.filter((sale) => sale.is_under_review);
  const activeListings = listings.filter((listing) => listing.status === 'published');
  const ticketsListed = activeListings.reduce((sum, listing) => sum + listing.quantity, 0);
  const listingErrors = listings.reduce(
    (sum, listing) => sum + (listing.distribution?.error_count || 0),
    0,
  );

  const dailySeries = useMemo(() => {
    const days = chartRange === '7d' ? 7 : 30;
    const today = startOfDay(new Date());
    return Array.from({ length: days }, (_, index) => {
      const date = addDays(today, -(days - 1 - index));
      const key = dayKey(date);
      const daySales = sales.filter((sale) => dayKey(sale.created_at) === key);
      const value = daySales.reduce((sum, sale) => sum + sale.payout.total_amount, 0);
      return {
        key,
        date,
        value,
        count: daySales.length,
        label: new Intl.DateTimeFormat('fr-FR', {
          day: '2-digit',
          ...(chartRange === '30d' ? {} : { weekday: 'short' }),
        })
          .format(date)
          .replace('.', ''),
        fullLabel: new Intl.DateTimeFormat('fr-FR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }).format(date),
      };
    });
  }, [sales, chartRange]);

  const chartData: RevenuePoint[] = dailySeries.map((point) => ({
    key: point.key,
    label: point.label,
    fullLabel: point.fullLabel,
    value: point.value,
  }));

  const sparkRevenue = dailySeries.slice(-7).map((point) => point.value);
  const sparkSales = dailySeries.slice(-7).map((point) => point.count);
  const sparkTickets = dailySeries.slice(-7).map((point) => {
    const day = point.key;
    return sales
      .filter((sale) => dayKey(sale.created_at) === day)
      .reduce((sum, sale) => sum + sale.quantity, 0);
  });
  const sparkAverage = dailySeries.slice(-7).map((point) => {
    const daySales = sales.filter((sale) => dayKey(sale.created_at) === point.key);
    return daySales.length
      ? daySales.reduce((sum, sale) => sum + sale.payout.total_amount, 0) / daySales.length
      : 0;
  });

  const recentSales = sales.slice(0, 6);

  const topEvents = useMemo(() => {
    const map = new Map<string, { id: string; name: string; revenue: number; tickets: number; count: number }>();
    periodSales.forEach((sale) => {
      const current = map.get(sale.event.id) || {
        id: sale.event.id,
        name: sale.event.name,
        revenue: 0,
        tickets: 0,
        count: 0,
      };
      current.revenue += sale.payout.total_amount;
      current.tickets += sale.quantity;
      current.count += 1;
      map.set(sale.event.id, current);
    });
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 4);
  }, [periodSales]);
  const maxEventRevenue = Math.max(...topEvents.map((event) => event.revenue), 1);

  const enableSound = async () => {
    updateSettings({ soundEnabled: true });
    const played = await playSaleSound(settings.volume, true);
    toast({
      title: played ? 'Son activé' : 'Touchez l’écran pour activer le son',
      message: played ? 'Le cha-ching retentira à chaque vente.' : undefined,
      tone: played ? 'success' : 'info',
    });
  };

  const enableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotifPermission(permission);
    if (permission === 'granted') {
      toast({ title: 'Notifications activées', message: 'Vous serez alerté des nouvelles ventes.', tone: 'success' });
    } else if (permission === 'denied') {
      toast({
        title: 'Notifications bloquées',
        message: 'Autorisez-les dans Réglages → SeatShop → Notifications.',
        tone: 'error',
      });
    }
  };

  const onSimulate = async () => {
    setSimulating(true);
    try {
      await simulateSale();
    } finally {
      window.setTimeout(() => setSimulating(false), 500);
    }
  };

  const showInstallBanner = !installed && !settings.installBannerDismissed && mode === 'live';

  return (
    <div className="page">
      <PageHeader
        eyebrow={
          <>
            <span className="eyebrow-dot" />
            {mode === 'demo' ? 'Mode démonstration' : 'Boutique connectée'}
          </>
        }
        title={settings.displayName ? `Bonjour, ${settings.displayName}` : 'Bonjour 👋'}
        subtitle={
          <>
            {formatDateLong(new Date())} · Voici ce qui se passe dans votre boutique.
            {sync.lastSync ? <span className="header-sync"> Dernière synchro {timeAgo(sync.lastSync)}.</span> : null}
          </>
        }
        actions={
          <>
            {mode === 'demo' ? (
              <button type="button" className="btn btn-secondary" onClick={() => void onSimulate()} disabled={simulating}>
                <Sparkles size={16} />
                {simulating ? 'Vente…' : 'Simuler une vente'}
              </button>
            ) : null}
            <Link to="/sales" className="btn btn-primary">
              Voir les ventes
              <ArrowRight size={16} />
            </Link>
          </>
        }
      />

      {showInstallBanner ? (
        <div className="install-banner">
          <div className="install-banner-icon">
            <img src={`${import.meta.env.BASE_URL}icons/icon-180.png`} alt="" width={42} height={42} />
          </div>
          <div className="install-banner-text">
            <strong>Emportez votre boutique dans votre poche</strong>
            <span>
              Installez SeatShop sur votre iPhone — notifications iOS et son de vente inclus.
            </span>
          </div>
          <div className="install-banner-actions">
            <button type="button" className="btn btn-light" onClick={openInstall}>
              <Download size={16} />
              Installer
            </button>
            <button
              type="button"
              className="install-banner-dismiss"
              aria-label="Masquer"
              onClick={() => updateSettings({ installBannerDismissed: true })}
            >
              <X size={17} />
            </button>
          </div>
        </div>
      ) : null}

      {!settings.soundEnabled || notifPermission !== 'granted' ? (
        <div className="alert-strip">
          <span className="alert-strip-icon">
            {!settings.soundEnabled ? <Volume2 size={18} /> : <BellRing size={18} />}
          </span>
          <div className="alert-strip-text">
            <strong>
              {!settings.soundEnabled
                ? 'Le son de vente est désactivé'
                : 'Ne manquez plus une vente'}
            </strong>
            <span>
              {!settings.soundEnabled
                ? 'Réactivez le cha-ching pour être prévenu à chaque commande.'
                : 'Autorisez les notifications pour recevoir les alertes de vente.'}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void (!settings.soundEnabled ? enableSound() : enableNotifications())}
          >
            {!settings.soundEnabled ? 'Activer le son' : 'Activer les alertes'}
          </button>
        </div>
      ) : null}

      <div className="period-bar">
        <div className="segmented" role="tablist" aria-label="Période">
          {(['today', '7d', '30d', 'all'] as Period[]).map((item) => (
            <button
              key={item}
              type="button"
              className={period === item ? 'is-active' : ''}
              onClick={() => setPeriod(item)}
              role="tab"
              aria-selected={period === item}
            >
              {periodLabel(item)}
            </button>
          ))}
        </div>
        <span className="period-note">
          {periodSales.length} {periodSales.length > 1 ? 'ventes' : 'vente'} sur la période
        </span>
      </div>

      <div className="kpi-grid">
        <KpiCard
          label="Chiffre d’affaires"
          value={formatMoney(revenue, currency, { compact: revenue >= 10000 })}
          delta={changePercent(revenue, previousRevenue)}
          sub={period === 'today' ? 'vs hier' : 'vs période précédente'}
          icon={Wallet}
          spark={sparkRevenue}
          tone="green"
        />
        <KpiCard
          label="Ventes"
          value={formatNumber(periodSales.length)}
          delta={changePercent(periodSales.length, previousSales.length)}
          sub={period === 'today' ? 'vs hier' : 'vs période précédente'}
          icon={ShoppingBag}
          spark={sparkSales}
          tone="blue"
        />
        <KpiCard
          label="Billets vendus"
          value={formatNumber(tickets)}
          delta={changePercent(tickets, previousTickets)}
          sub={`${formatNumber(ticketsListed)} en ligne`}
          icon={Ticket}
          spark={sparkTickets}
          tone="violet"
        />
        <KpiCard
          label="Panier moyen"
          value={formatMoney(average, currency)}
          delta={changePercent(average, previousAverage)}
          sub={period === 'today' ? 'vs hier' : 'vs période précédente'}
          icon={TrendingUp}
          spark={sparkAverage}
          tone="amber"
        />
      </div>

      <div className="dashboard-grid dashboard-grid-main">
        <section className="card chart-card">
          <div className="card-header">
            <div>
              <div className="card-title">Chiffre d’affaires</div>
              <div className="card-subtitle">
                {chartRange === '7d' ? '7 derniers jours' : '30 derniers jours'} · paiements Seatiks
              </div>
            </div>
            <div className="segmented segmented-sm">
              <button
                type="button"
                className={chartRange === '7d' ? 'is-active' : ''}
                onClick={() => setChartRange('7d')}
              >
                7 j
              </button>
              <button
                type="button"
                className={chartRange === '30d' ? 'is-active' : ''}
                onClick={() => setChartRange('30d')}
              >
                30 j
              </button>
            </div>
          </div>
          <div className="card-body">
            <RevenueChart data={chartData} currency={currency} />
          </div>
        </section>

        <section className="card todo-card">
          <div className="card-header">
            <div>
              <div className="card-title">À traiter</div>
              <div className="card-subtitle">Les commandes qui demandent votre attention</div>
            </div>
            <span className="count-badge count-badge-amber">{awaiting.length + underReview.length}</span>
          </div>
          <div className="card-body todo-body">
            <Link to="/sales?status=awaiting_delivery" className="todo-row">
              <span className="todo-icon todo-icon-amber">
                <Clock3 size={18} />
              </span>
              <span className="todo-text">
                <strong>{awaiting.length} à livrer</strong>
                <small>Commandes en attente de billets</small>
              </span>
              <ChevronRight size={16} />
            </Link>
            <Link to="/sales" className="todo-row">
              <span className="todo-icon todo-icon-blue">
                <PackageCheck size={18} />
              </span>
              <span className="todo-text">
                <strong>{sales.filter((sale) => sale.status === 'delivered').length} livrées</strong>
                <small>Billets transmis aux acheteurs</small>
              </span>
              <ChevronRight size={16} />
            </Link>
            <Link to="/listings" className="todo-row">
              <span className="todo-icon todo-icon-green">
                <CheckCircle2 size={18} />
              </span>
              <span className="todo-text">
                <strong>{activeListings.length} annonces en ligne</strong>
                <small>{formatNumber(ticketsListed)} billets publiés</small>
              </span>
              <ChevronRight size={16} />
            </Link>
            {listingErrors > 0 ? (
              <Link to="/listings" className="todo-row">
                <span className="todo-icon todo-icon-red">
                  <BellRing size={18} />
                </span>
                <span className="todo-text">
                  <strong>{listingErrors} erreurs de diffusion</strong>
                  <small>Certaines marketplaces sont en échec</small>
                </span>
                <ChevronRight size={16} />
              </Link>
            ) : null}

            {awaiting.length > 0 ? (
              <div className="todo-preview">
                <div className="todo-preview-label">Dernière à livrer</div>
                {awaiting.slice(0, 1).map((sale) => (
                  <Link key={sale.id} to={`/sales/${sale.id}`} className="todo-preview-sale">
                    <MarketplaceAvatar name={sale.marketplace} size={26} />
                    <span>
                      <strong>{sale.event.name}</strong>
                      <small>
                        {sale.quantity} billets · {sale.marketplace} · {timeAgo(sale.created_at)}
                      </small>
                    </span>
                    <span className="todo-preview-amount">
                      {formatMoney(sale.payout.total_amount, sale.payout.currency)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="dashboard-grid dashboard-grid-secondary">
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Ventes récentes</div>
              <div className="card-subtitle">Les dernières commandes reçues</div>
            </div>
            <Link to="/sales" className="card-link">
              Tout voir <ChevronRight size={14} />
            </Link>
          </div>
          {recentSales.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="Aucune vente pour le moment"
              description="Les nouvelles commandes apparaîtront ici avec une alerte sonore."
            />
          ) : (
            <div className="recent-sales">
              {recentSales.map((sale) => {
                const status = saleStatus(sale.status);
                return (
                  <button
                    key={sale.id}
                    type="button"
                    className="recent-sale"
                    onClick={() => navigate(`/sales/${sale.id}`)}
                  >
                    <MarketplaceAvatar name={sale.marketplace} size={34} />
                    <span className="recent-sale-main">
                      <span className="recent-sale-title">{sale.event.name}</span>
                      <span className="recent-sale-meta">
                        {sale.quantity} {sale.quantity > 1 ? 'billets' : 'billet'} · {sale.marketplace} ·{' '}
                        {timeAgo(sale.created_at)}
                      </span>
                    </span>
                    <span className="recent-sale-right">
                      <strong>{formatMoney(sale.payout.total_amount, sale.payout.currency)}</strong>
                      <StatusPill tone={status.tone}>{status.label}</StatusPill>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Top événements</div>
              <div className="card-subtitle">{periodLabel(period)}</div>
            </div>
            <Link to="/events" className="card-link">
              Explorer <ChevronRight size={14} />
            </Link>
          </div>
          {topEvents.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Pas encore de ventes"
              description="Vos meilleurs événements apparaîtront ici."
              compact
            />
          ) : (
            <div className="top-events">
              {topEvents.map((event, index) => (
                <Link key={event.id} to={`/events/${event.id}`} className="top-event">
                  <span className="top-event-rank">{index + 1}</span>
                  <span className="top-event-main">
                    <span className="top-event-name">{event.name}</span>
                    <span className="top-event-meta">
                      {event.count} {event.count > 1 ? 'ventes' : 'vente'} · {event.tickets} billets
                    </span>
                    <span className="top-event-bar">
                      <span style={{ width: `${(event.revenue / maxEventRevenue) * 100}%` }} />
                    </span>
                  </span>
                  <span className="top-event-amount">
                    {formatMoney(event.revenue, currency, { compact: true })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="dashboard-footnote">
        <Avatar name={settings.storeName || 'SeatShop'} size={30} />
        <span>
          {mode === 'demo'
            ? 'Vous êtes en démonstration. Les ventes sont fictives et stockées sur cet appareil.'
            : `Connecté à Seatiks en lecture seule · ${me?.kyc_status === 'approved' ? 'compte vérifié' : 'compte en cours de vérification'}.`}
        </span>
        {me ? <span className="dashboard-footnote-key">Clé {me.key_id.slice(0, 8)}…</span> : null}
      </section>
    </div>
  );
}
