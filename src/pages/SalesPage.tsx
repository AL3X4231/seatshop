import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  Ticket,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import {
  buyerName,
  downloadFile,
  formatDateTime,
  formatEventDate,
  formatMoney,
  inPeriod,
  periodLabel,
  saleStatus,
  timeAgo,
  toCsv,
  type Period,
} from '../lib/format';
import type { Sale } from '../lib/types';
import { PageHeader } from '../components/PageHeader';
import { ActionMenu } from '../components/ActionMenu';
import { StatusPill } from '../components/StatusPill';
import { MarketplaceAvatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { Drawer } from '../components/Drawer';

const STATUS_TABS = [
  { value: 'all', label: 'Toutes' },
  { value: 'awaiting_delivery', label: 'À livrer' },
  { value: 'delivered', label: 'Livrées' },
  { value: 'cancelled', label: 'Annulées' },
];

function SaleDetail({
  sale,
  loading,
  onClose,
}: {
  sale: Sale | null;
  loading: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const status = sale ? saleStatus(sale.status) : null;

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copié`, tone: 'success', duration: 2200 });
    } catch {
      toast({ title: 'Impossible de copier', tone: 'error' });
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      eyebrow={sale ? `Commande ${sale.short_id}` : 'Commande'}
      title={sale ? sale.event.name : loading ? 'Chargement de la vente…' : 'Vente introuvable'}
      subtitle={
        sale ? (
          <span className="drawer-subtitle-row">
            <StatusPill tone={status?.tone}>{status?.label}</StatusPill>
            <span>{formatDateTime(sale.created_at)}</span>
            <span className="drawer-subtitle-dot">·</span>
            <span>{timeAgo(sale.created_at)}</span>
          </span>
        ) : null
      }
      headerActions={
        sale ? (
          <button
            type="button"
            className="icon-btn"
            onClick={() => void copy(sale.short_id, 'Référence')}
            title="Copier la référence"
          >
            <Copy size={17} />
          </button>
        ) : null
      }
      footer={
        sale ? (
          <div className="drawer-footer-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(`/listings/${sale.listing_id}`)}
            >
              <Ticket size={16} />
              Voir l’annonce
            </button>
          </div>
        ) : null
      }
    >
      {loading && !sale ? (
        <div className="drawer-skeleton">
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-block" />
          <div className="skeleton skeleton-line is-short" />
        </div>
      ) : !sale ? (
        <EmptyState
          icon={ShoppingBag}
          title="Cette vente est introuvable"
          description="Elle a peut-être été supprimée ou la clé API n’y a pas accès."
        />
      ) : (
        <div className="sale-detail">
          <div className="sale-hero">
            <div>
              <div className="sale-hero-label">Montant net</div>
              <div className="sale-hero-amount">
                {formatMoney(sale.payout.total_amount, sale.payout.currency)}
              </div>
              <div className="sale-hero-meta">
                {sale.quantity} {sale.quantity > 1 ? 'billets' : 'billet'} · via {sale.marketplace}
              </div>
            </div>
            <MarketplaceAvatar name={sale.marketplace} size={46} />
          </div>

          <div className="detail-section">
            <div className="detail-section-title">Événement</div>
            <button
              type="button"
              className="detail-event"
              onClick={() => navigate(`/events/${sale.event.id}`)}
            >
              <span className="detail-event-date">
                <CalendarDays size={16} />
                {formatEventDate(sale.event.start_date)}
              </span>
              <strong>{sale.event.name}</strong>
              <span className="detail-event-place">
                <MapPin size={14} />
                {sale.event.venue} · {sale.event.city}
              </span>
              <ChevronRight size={16} className="detail-event-chevron" />
            </button>
          </div>

          <div className="detail-grid">
            <div className="detail-box">
              <span className="detail-box-label">Section</span>
              <strong>{sale.section || '—'}</strong>
            </div>
            <div className="detail-box">
              <span className="detail-box-label">Rang</span>
              <strong>{sale.row || '—'}</strong>
            </div>
            <div className="detail-box">
              <span className="detail-box-label">Premier siège</span>
              <strong>{sale.first_seat || '—'}</strong>
            </div>
            <div className="detail-box">
              <span className="detail-box-label">Quantité</span>
              <strong>
                {sale.quantity} {sale.quantity > 1 ? 'billets' : 'billet'}
              </strong>
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-section-title">Acheteurs</div>
            <div className="buyer-list">
              {sale.buyers.length ? (
                sale.buyers.map((buyer, index) => (
                  <div key={`${buyer.first_name}-${buyer.last_name}-${index}`} className="buyer">
                    <span className="buyer-avatar">
                      <UserRound size={16} />
                    </span>
                    <div className="buyer-main">
                      <strong>{buyerName(buyer) || `Acheteur ${index + 1}`}</strong>
                      <span className="buyer-contact">
                        {buyer.email ? (
                          <span>
                            <Mail size={12} /> {buyer.email}
                          </span>
                        ) : null}
                        {buyer.phone ? (
                          <span>
                            <Phone size={12} /> {buyer.phone}
                          </span>
                        ) : null}
                        {!buyer.email && !buyer.phone ? <span>Coordonnées non partagées</span> : null}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="detail-muted">Aucune coordonnée acheteur partagée.</div>
              )}
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-section-title">Paiement</div>
            <div className="detail-list">
              <div className="detail-line">
                <span>Prix unitaire net</span>
                <strong>{formatMoney(sale.payout.unit_amount, sale.payout.currency)}</strong>
              </div>
              <div className="detail-line">
                <span>Total net</span>
                <strong>{formatMoney(sale.payout.total_amount, sale.payout.currency)}</strong>
              </div>
              <div className="detail-line">
                <span>Valeur faciale</span>
                <span>{formatMoney(sale.face_value.amount, sale.face_value.currency)}</span>
              </div>
              <div className="detail-line">
                <span>Payé</span>
                <StatusPill tone={sale.is_paid ? 'green' : 'gray'} dot={false}>
                  {sale.is_paid ? 'Oui' : 'Non'}
                </StatusPill>
              </div>
              {sale.is_under_review ? (
                <div className="detail-line">
                  <span>Vérification</span>
                  <StatusPill tone="amber" dot={false}>
                    En revue
                  </StatusPill>
                </div>
              ) : null}
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-section-title">Livraison</div>
            <div className="detail-list">
              <div className="detail-line">
                <span>Méthode</span>
                <strong>{sale.transfer_method}</strong>
              </div>
              <div className="detail-line">
                <span>Statut</span>
                <StatusPill tone={status?.tone}>{status?.label}</StatusPill>
              </div>
              {sale.delivered_at ? (
                <div className="detail-line">
                  <span>Livrée le</span>
                  <span>{formatDateTime(sale.delivered_at)}</span>
                </div>
              ) : null}
              {sale.cancelled_at ? (
                <div className="detail-line">
                  <span>Annulée le</span>
                  <span>{formatDateTime(sale.cancelled_at)}</span>
                </div>
              ) : null}
            </div>
            <div className="detail-note">
              <Clock3 size={15} />
              <span>
                Cette clé API est en lecture seule. La livraison des billets se fait depuis votre
                tableau de bord Seatiks.
              </span>
            </div>
          </div>

          {sale.internal_note ? (
            <div className="detail-section">
              <div className="detail-section-title">Note interne</div>
              <div className="detail-note-box">{sale.internal_note}</div>
            </div>
          ) : null}

          <button
            type="button"
            className="detail-copy"
            onClick={() => void copy(sale.id, 'Identifiant')}
          >
            <Copy size={14} />
            Copier l’identifiant complet
          </button>
        </div>
      )}
    </Drawer>
  );
}

export function SalesPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { mode, apiKey } = useAuth();
  const { sales, sync, refreshAll, getSale } = useData();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [period, setPeriod] = useState<Period>('all');
  const [marketplace, setMarketplace] = useState('all');
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const status = searchParams.get('status') || 'all';
  const fromList = sales.find((sale) => sale.id === id);

  useEffect(() => {
    if (!id) {
      setDetailSale(null);
      setDetailLoading(false);
      return;
    }
    if (fromList) {
      setDetailSale(fromList);
      setDetailLoading(false);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void getSale(id).then((sale) => {
      if (!cancelled) {
        setDetailSale(sale);
        setDetailLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, fromList, getSale]);

  const marketplaces = useMemo(
    () => Array.from(new Set(sales.map((sale) => sale.marketplace))).sort((a, b) => a.localeCompare(b)),
    [sales],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter((sale) => {
      if (status !== 'all' && sale.status !== status) return false;
      if (marketplace !== 'all' && sale.marketplace !== marketplace) return false;
      if (!inPeriod(sale.created_at, period)) return false;
      if (!q) return true;
      const buyerText = sale.buyers
        .map((buyer) => `${buyer.first_name} ${buyer.last_name}`)
        .join(' ');
      return `${sale.short_id} ${sale.event.name} ${sale.marketplace} ${sale.section} ${sale.row} ${buyerText}`
        .toLowerCase()
        .includes(q);
    });
  }, [sales, status, marketplace, period, search]);

  const filteredRevenue = filtered.reduce((sum, sale) => sum + sale.payout.total_amount, 0);
  const currency =
    filtered[0]?.payout.currency ||
    sales[0]?.payout.currency ||
    'USD';

  const setStatus = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('status');
    else params.set('status', next);
    setSearchParams(params, { replace: true });
  };

  const closeDetail = () => {
    navigate({ pathname: '/sales', search: location.search });
  };

  const exportCsv = () => {
    const rows: Array<Array<string | number>> = [
      [
        'Référence',
        'Date',
        'Événement',
        'Marketplace',
        'Section',
        'Rang',
        'Quantité',
        'Montant net',
        'Devise',
        'Statut',
        'Acheteurs',
      ],
      ...filtered.map((sale) => [
        sale.short_id,
        sale.created_at,
        sale.event.name,
        sale.marketplace,
        sale.section,
        sale.row,
        sale.quantity,
        sale.payout.total_amount,
        sale.payout.currency,
        saleStatus(sale.status).label,
        sale.buyers.map((buyer) => buyerName(buyer)).join(', '),
      ]),
    ];
    downloadFile(`ventes-seatshop-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  const awaiting = sales.filter((sale) => sale.status === 'awaiting_delivery').length;

  return (
    <div className="page">
      <PageHeader
        title="Ventes"
        subtitle={
          <>
            {sales.length} commandes · {awaiting} à livrer · {filtered.length} affichées
          </>
        }
        actions={
          <ActionMenu
            label="Actions sur les ventes"
            items={[
              {
                id: 'export',
                label: 'Exporter en CSV',
                icon: Download,
                onSelect: exportCsv,
                disabled: !filtered.length,
              },
              {
                id: 'refresh',
                label: sync.refreshing ? 'Synchronisation…' : 'Actualiser les données',
                icon: RefreshCw,
                onSelect: () => void refreshAll(),
                disabled: mode === 'demo' || sync.refreshing,
              },
            ]}
          />
        }
      />

      <div className="sales-summary">
        <div className="sales-summary-item">
          <span>Volume filtré</span>
          <strong>{formatMoney(filteredRevenue, currency)}</strong>
        </div>
        <div className="sales-summary-item">
          <span>Commandes</span>
          <strong>{filtered.length}</strong>
        </div>
        <div className="sales-summary-item">
          <span>À livrer</span>
          <strong>{filtered.filter((sale) => sale.status === 'awaiting_delivery').length}</strong>
        </div>
        <div className="sales-summary-item">
          <span>Livrées</span>
          <strong>{filtered.filter((sale) => sale.status === 'delivered').length}</strong>
        </div>
      </div>

      <div className="toolbar">
        <div className="status-tabs" role="tablist" aria-label="Filtrer par statut">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.value === 'all'
                ? sales.length
                : sales.filter((sale) => sale.status === tab.value).length;
            return (
              <button
                key={tab.value}
                type="button"
                className={status === tab.value ? 'is-active' : ''}
                onClick={() => setStatus(tab.value)}
                role="tab"
                aria-selected={status === tab.value}
              >
                {tab.label}
                <span>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="toolbar-right">
          <div className="search-field">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Référence, événement, acheteur…"
              aria-label="Rechercher une vente"
            />
            {search ? (
              <button type="button" className="search-clear" onClick={() => setSearch('')} aria-label="Effacer">
                <X size={14} />
              </button>
            ) : null}
          </div>
          <select
            className="select"
            value={marketplace}
            onChange={(event) => setMarketplace(event.target.value)}
            aria-label="Marketplace"
          >
            <option value="all">Toutes les marketplaces</option>
            {marketplaces.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={period}
            onChange={(event) => setPeriod(event.target.value as Period)}
            aria-label="Période"
          >
            {(['all', 'today', '7d', '30d'] as Period[]).map((item) => (
              <option key={item} value={item}>
                {item === 'all' ? 'Toutes les dates' : periodLabel(item)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card table-card">
        {filtered.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Aucune vente ne correspond"
            description="Modifiez les filtres ou la recherche pour retrouver vos commandes."
            action={
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSearch('');
                  setMarketplace('all');
                  setPeriod('all');
                  setStatus('all');
                }}
              >
                Réinitialiser les filtres
              </button>
            }
          />
        ) : (
          <>
            <div className="table-wrap sales-table-wrap">
              <table className="data-table sales-table">
                <thead>
                  <tr>
                    <th>Commande</th>
                    <th>Événement</th>
                    <th>Marketplace</th>
                    <th className="is-right">Billets</th>
                    <th className="is-right">Net</th>
                    <th>Statut</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sale) => {
                    const saleStat = saleStatus(sale.status);
                    return (
                      <tr key={sale.id} onClick={() => navigate(`/sales/${sale.id}`)}>
                        <td>
                          <div className="table-primary">{sale.short_id}</div>
                          <div className="table-secondary">{timeAgo(sale.created_at)}</div>
                        </td>
                        <td>
                          <div className="table-primary table-event-name">{sale.event.name}</div>
                          <div className="table-secondary">
                            Section {sale.section} · Rang {sale.row} · {formatEventDate(sale.event.start_date)}
                          </div>
                        </td>
                        <td>
                          <div className="table-marketplace">
                            <MarketplaceAvatar name={sale.marketplace} size={24} />
                            <span>{sale.marketplace}</span>
                          </div>
                        </td>
                        <td className="is-right">
                          <div className="table-primary">{sale.quantity}</div>
                        </td>
                        <td className="is-right">
                          <div className="table-primary">
                            {formatMoney(sale.payout.total_amount, sale.payout.currency)}
                          </div>
                          <div className="table-secondary">
                            {formatMoney(sale.payout.unit_amount, sale.payout.currency)} / billet
                          </div>
                        </td>
                        <td>
                          <StatusPill tone={saleStat.tone}>{saleStat.label}</StatusPill>
                        </td>
                        <td className="is-chevron">
                          <ChevronRight size={16} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="sales-cards">
              {filtered.map((sale) => {
                const saleStat = saleStatus(sale.status);
                return (
                  <button
                    key={sale.id}
                    type="button"
                    className="sale-card"
                    onClick={() => navigate(`/sales/${sale.id}`)}
                  >
                    <div className="sale-card-top">
                      <span className="sale-card-id">{sale.short_id}</span>
                      <StatusPill tone={saleStat.tone}>{saleStat.label}</StatusPill>
                    </div>
                    <div className="sale-card-event">{sale.event.name}</div>
                    <div className="sale-card-meta">
                      <span>
                        <CalendarDays size={13} /> {formatEventDate(sale.event.start_date)}
                      </span>
                      <span>
                        <Ticket size={13} /> {sale.quantity} · {sale.section} / {sale.row}
                      </span>
                    </div>
                    <div className="sale-card-bottom">
                      <span className="sale-card-marketplace">
                        <MarketplaceAvatar name={sale.marketplace} size={22} />
                        {sale.marketplace}
                      </span>
                      <strong>{formatMoney(sale.payout.total_amount, sale.payout.currency)}</strong>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {id ? <SaleDetail sale={detailSale} loading={detailLoading} onClose={closeDetail} /> : null}
    </div>
  );
}
