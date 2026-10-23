import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Copy,
  Download,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  Ticket,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import {
  downloadFile,
  formatDateTime,
  formatEventDate,
  formatMoney,
  formatNumber,
  listingStatus,
  timeAgo,
  toCsv,
} from '../lib/format';
import type { Listing } from '../lib/types';
import { PageHeader } from '../components/PageHeader';
import { ActionMenu } from '../components/ActionMenu';
import { StatusPill } from '../components/StatusPill';
import { MarketplaceAvatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { Drawer } from '../components/Drawer';

const STATUS_TABS = [
  { value: 'all', label: 'Toutes' },
  { value: 'published', label: 'En ligne' },
  { value: 'unpublished', label: 'Hors ligne' },
];

function ListingDetail({
  listing,
  loading,
  onClose,
}: {
  listing: Listing | null;
  loading: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sales } = useData();
  const status = listing ? listingStatus(listing.status) : null;
  const relatedSales = listing ? sales.filter((sale) => sale.listing_id === listing.id) : [];
  const relatedRevenue = relatedSales.reduce((sum, sale) => sum + sale.payout.total_amount, 0);
  const relatedCurrency = relatedSales[0]?.payout.currency || 'USD';

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: 'Identifiant copié', tone: 'success', duration: 2200 });
    } catch {
      toast({ title: 'Impossible de copier', tone: 'error' });
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      eyebrow={listing ? `Annonce ${listing.short_id}` : 'Annonce'}
      title={listing ? listing.event.name : loading ? 'Chargement de l’annonce…' : 'Annonce introuvable'}
      subtitle={
        listing ? (
          <span className="drawer-subtitle-row">
            <StatusPill tone={status?.tone}>{status?.label}</StatusPill>
            <span>{formatDateTime(listing.created_at)}</span>
            <span className="drawer-subtitle-dot">·</span>
            <span>{timeAgo(listing.created_at)}</span>
          </span>
        ) : null
      }
      headerActions={
        listing ? (
          <button
            type="button"
            className="icon-btn"
            onClick={() => void copy(listing.id)}
            title="Copier l’identifiant"
          >
            <Copy size={17} />
          </button>
        ) : null
      }
      footer={
        listing ? (
          <div className="drawer-footer-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(`/events/${listing.event.id}`)}
            >
              <CalendarDays size={16} />
              Voir l’événement
            </button>
          </div>
        ) : null
      }
    >
      {loading && !listing ? (
        <div className="drawer-skeleton">
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-block" />
          <div className="skeleton skeleton-line is-short" />
        </div>
      ) : !listing ? (
        <EmptyState
          icon={Ticket}
          title="Cette annonce est introuvable"
          description="Elle a peut-être été supprimée ou la clé API n’y a pas accès."
        />
      ) : (
        <div className="sale-detail">
          <div className="sale-hero listing-hero">
            <div>
              <div className="sale-hero-label">Prix de vente</div>
              <div className="sale-hero-amount">
                {formatMoney(listing.price.amount, listing.price.currency)}
              </div>
              <div className="sale-hero-meta">
                {listing.quantity} {listing.quantity > 1 ? 'billets' : 'billet'} ·{' '}
                {formatMoney(listing.face_value.amount, listing.face_value.currency)} de valeur faciale
              </div>
            </div>
            <span className="listing-hero-icon">
              <Ticket size={26} />
            </span>
          </div>

          <div className="detail-section">
            <div className="detail-section-title">Événement</div>
            <button
              type="button"
              className="detail-event"
              onClick={() => navigate(`/events/${listing.event.id}`)}
            >
              <span className="detail-event-date">
                <CalendarDays size={16} />
                {formatEventDate(listing.event.start_date)}
              </span>
              <strong>{listing.event.name}</strong>
              <span className="detail-event-place">
                <MapPin size={14} />
                {listing.event.venue} · {listing.event.city}
              </span>
              <ChevronRight size={16} className="detail-event-chevron" />
            </button>
          </div>

          <div className="detail-grid">
            <div className="detail-box">
              <span className="detail-box-label">Section</span>
              <strong>{listing.section.name || '—'}</strong>
            </div>
            <div className="detail-box">
              <span className="detail-box-label">Rang</span>
              <strong>{listing.row || '—'}</strong>
            </div>
            <div className="detail-box">
              <span className="detail-box-label">Premier siège</span>
              <strong>{listing.first_seat || '—'}</strong>
            </div>
            <div className="detail-box">
              <span className="detail-box-label">Quantité</span>
              <strong>
                {listing.quantity} {listing.quantity > 1 ? 'billets' : 'billet'}
              </strong>
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-section-title">Réglages de l’annonce</div>
            <div className="detail-list">
              <div className="detail-line">
                <span>Type de split</span>
                <strong>{listing.split_type}</strong>
              </div>
              <div className="detail-line">
                <span>Livraison</span>
                <strong>{listing.transfer_method}</strong>
              </div>
              <div className="detail-line">
                <span>Livraison instantanée</span>
                <StatusPill tone={listing.instant_delivery ? 'green' : 'gray'} dot={false}>
                  {listing.instant_delivery ? 'Activée' : 'Non'}
                </StatusPill>
              </div>
              <div className="detail-line">
                <span>Sièges masqués</span>
                <span>{listing.hide_seats ? 'Oui' : 'Non'}</span>
              </div>
              <div className="detail-line">
                <span>Rang masqué</span>
                <span>{listing.hide_row ? 'Oui' : 'Non'}</span>
              </div>
              <div className="detail-line">
                <span>Version inventaire</span>
                <span>{listing.inventory_version}</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-section-title">
              Diffusion
              <span className="detail-section-aside">
                {listing.distribution.published_count} publiées ·{' '}
                {(listing.distribution.error_count || 0) > 0 ? (
                  <span className="text-danger">{listing.distribution.error_count} erreurs</span>
                ) : (
                  '0 erreur'
                )}
              </span>
            </div>
            <div className="distribution-bar">
              <span
                className="distribution-bar-ok"
                style={{
                  width: `${
                    (listing.distribution.published_count /
                      Math.max(
                        listing.distribution.published_count + listing.distribution.error_count,
                        1,
                      )) *
                    100
                  }%`,
                }}
              />
              <span
                className="distribution-bar-error"
                style={{
                  width: `${
                    (listing.distribution.error_count /
                      Math.max(
                        listing.distribution.published_count + listing.distribution.error_count,
                        1,
                      )) *
                    100
                  }%`,
                }}
              />
            </div>
            <div className="marketplace-list">
              {listing.marketplaces.length ? (
                listing.marketplaces.map((marketplace) => (
                  <div key={marketplace.id} className="marketplace-row">
                    <MarketplaceAvatar name={marketplace.name} size={28} />
                    <span className="marketplace-name">{marketplace.name}</span>
                    <span className={`marketplace-price ${marketplace.price ? '' : 'is-muted'}`}>
                      {marketplace.price
                        ? formatMoney(marketplace.price.amount, marketplace.price.currency)
                        : 'Non publié'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="detail-muted">Aucune marketplace configurée.</div>
              )}
            </div>
          </div>

          {listing.platforms.length ? (
            <div className="detail-section">
              <div className="detail-section-title">Plateformes autorisées</div>
              <div className="tag-list">
                {listing.platforms.map((platform) => (
                  <span key={platform} className="tag">
                    {platform.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="detail-section">
            <div className="detail-section-title">Performance</div>
            <div className="detail-list">
              <div className="detail-line">
                <span>Ventes liées</span>
                <strong>
                  {relatedSales.length} {relatedSales.length > 1 ? 'ventes' : 'vente'}
                </strong>
              </div>
              <div className="detail-line">
                <span>Chiffre d’affaires</span>
                <strong>{formatMoney(relatedRevenue, relatedCurrency)}</strong>
              </div>
            </div>
          </div>

          {listing.internal_note ? (
            <div className="detail-section">
              <div className="detail-section-title">Note interne</div>
              <div className="detail-note-box">{listing.internal_note}</div>
            </div>
          ) : null}

          <div className="detail-note">
            <AlertTriangle size={15} />
            <span>
              Cette clé API est en lecture seule. La modification et la publication se font depuis
              votre tableau de bord Seatiks.
            </span>
          </div>
        </div>
      )}
    </Drawer>
  );
}

export function ListingsPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { mode } = useAuth();
  const { listings, sales, sync, refreshAll, getListing, hasMoreListings } = useData();
  const [search, setSearch] = useState('');
  const [marketplace, setMarketplace] = useState('all');
  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const status = searchParams.get('status') || 'all';
  const eventFilter = searchParams.get('event') || 'all';
  const fromList = listings.find((listing) => listing.id === id);

  useEffect(() => {
    if (!id) {
      setDetailListing(null);
      setDetailLoading(false);
      return;
    }
    if (fromList) {
      setDetailListing(fromList);
      setDetailLoading(false);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void getListing(id).then((listing) => {
      if (!cancelled) {
        setDetailListing(listing);
        setDetailLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, fromList, getListing]);

  const marketplaces = useMemo(() => {
    const names = new Set<string>();
    listings.forEach((listing) => listing.marketplaces.forEach((item) => names.add(item.name)));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [listings]);

  const eventOptions = useMemo(() => {
    const map = new Map<string, string>();
    listings.forEach((listing) => map.set(listing.event.id, listing.event.name));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [listings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return listings.filter((listing) => {
      if (status !== 'all' && listing.status !== status) return false;
      if (eventFilter !== 'all' && listing.event.id !== eventFilter) return false;
      if (marketplace !== 'all' && !listing.marketplaces.some((item) => item.name === marketplace))
        return false;
      if (!q) return true;
      return `${listing.short_id} ${listing.event.name} ${listing.section.name} ${listing.row} ${listing.price.amount}`
        .toLowerCase()
        .includes(q);
    });
  }, [listings, status, eventFilter, marketplace, search]);

  const active = listings.filter((listing) => listing.status === 'published');
  const ticketsListed = active.reduce((sum, listing) => sum + listing.quantity, 0);
  const errors = listings.reduce((sum, listing) => sum + (listing.distribution?.error_count || 0), 0);
  const currency = listings[0]?.price.currency || 'EUR';
  const inventoryValue = active.reduce((sum, listing) => sum + listing.price.amount * listing.quantity, 0);
  const salesByListing = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach((sale) => map.set(sale.listing_id, (map.get(sale.listing_id) || 0) + 1));
    return map;
  }, [sales]);

  const setStatus = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('status');
    else params.set('status', next);
    setSearchParams(params, { replace: true });
  };

  const closeDetail = () => {
    navigate({ pathname: '/listings', search: location.search });
  };

  const exportCsv = () => {
    const rows: Array<Array<string | number>> = [
      [
        'Référence',
        'Événement',
        'Date événement',
        'Section',
        'Rang',
        'Premier siège',
        'Quantité',
        'Prix',
        'Devise',
        'Statut',
        'Publiées',
        'Erreurs',
        'Créée le',
      ],
      ...filtered.map((listing) => [
        listing.short_id,
        listing.event.name,
        listing.event.start_date,
        listing.section.name,
        listing.row,
        listing.first_seat,
        listing.quantity,
        listing.price.amount,
        listing.price.currency,
        listingStatus(listing.status).label,
        listing.distribution.published_count,
        listing.distribution.error_count,
        listing.created_at,
      ]),
    ];
    downloadFile(`inventaire-seatshop-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  return (
    <div className="page">
      <PageHeader
        title="Inventaire"
        subtitle={
          <>
            {active.length} annonces en ligne · {formatNumber(ticketsListed)} billets publiés
            {errors > 0 ? <span className="text-danger"> · {errors} erreurs de diffusion</span> : null}
          </>
        }
        actions={
          <ActionMenu
            label="Actions sur l’inventaire"
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

      <div className="kpi-grid kpi-grid-4 inventory-kpis">
        <div className="card mini-kpi">
          <span className="mini-kpi-icon mini-kpi-green">
            <Store size={17} />
          </span>
          <div>
            <span>Annonces en ligne</span>
            <strong key={active.length}>{active.length}</strong>
          </div>
        </div>
        <div className="card mini-kpi">
          <span className="mini-kpi-icon mini-kpi-blue">
            <Ticket size={17} />
          </span>
          <div>
            <span>Billets listés</span>
            <strong key={ticketsListed}>{formatNumber(ticketsListed)}</strong>
          </div>
        </div>
        <div className="card mini-kpi">
          <span className="mini-kpi-icon mini-kpi-violet">
            <Layers size={17} />
          </span>
          <div>
            <span>Valeur catalogue</span>
            <strong key={inventoryValue}>
              {formatMoney(inventoryValue, currency, { compact: inventoryValue >= 10000 })}
            </strong>
          </div>
        </div>
        <div className={`card mini-kpi ${errors > 0 ? 'mini-kpi-has-error' : ''}`}>
          <span className={`mini-kpi-icon ${errors > 0 ? 'mini-kpi-red' : 'mini-kpi-green'}`}>
            <AlertTriangle size={17} />
          </span>
          <div>
            <span>Erreurs de diffusion</span>
            <strong key={errors}>{errors}</strong>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="status-tabs" role="tablist" aria-label="Filtrer par statut">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.value === 'all'
                ? listings.length
                : listings.filter((listing) => listing.status === tab.value).length;
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
              placeholder="Référence, événement, section…"
              aria-label="Rechercher une annonce"
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
            className="select select-wide"
            value={eventFilter}
            onChange={(event) => {
              const params = new URLSearchParams(searchParams);
              if (event.target.value === 'all') params.delete('event');
              else params.set('event', event.target.value);
              setSearchParams(params, { replace: true });
            }}
            aria-label="Événement"
          >
            <option value="all">Tous les événements</option>
            {eventOptions.map(([eventId, name]) => (
              <option key={eventId} value={eventId}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card table-card">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="Aucune annonce ne correspond"
            description="Modifiez les filtres ou la recherche pour retrouver votre inventaire."
            action={
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSearch('');
                  setMarketplace('all');
                  setStatus('all');
                  const params = new URLSearchParams(searchParams);
                  params.delete('event');
                  setSearchParams(params, { replace: true });
                }}
              >
                Réinitialiser les filtres
              </button>
            }
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table listings-table">
                <thead>
                  <tr>
                    <th>Annonce</th>
                    <th>Événement</th>
                    <th>Emplacement</th>
                    <th className="is-right">Qté</th>
                    <th className="is-right">Prix</th>
                    <th>Diffusion</th>
                    <th>Statut</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((listing) => {
                    const listingStat = listingStatus(listing.status);
                    return (
                      <tr key={listing.id} onClick={() => navigate(`/listings/${listing.id}`)}>
                        <td>
                          <div className="table-primary">{listing.short_id}</div>
                          <div className="table-secondary">{timeAgo(listing.created_at)}</div>
                        </td>
                        <td>
                          <div className="table-primary table-event-name">{listing.event.name}</div>
                          <div className="table-secondary">
                            {formatEventDate(listing.event.start_date)} · {listing.event.city}
                          </div>
                        </td>
                        <td>
                          <div className="table-primary">
                            {listing.section.name} · Rang {listing.row}
                          </div>
                          <div className="table-secondary">
                            Siège {listing.first_seat}
                            {salesByListing.get(listing.id)
                              ? ` · ${salesByListing.get(listing.id)} vente(s)`
                              : ''}
                          </div>
                        </td>
                        <td className="is-right">
                          <div className="table-primary">{listing.quantity}</div>
                        </td>
                        <td className="is-right">
                          <div className="table-primary">
                            {formatMoney(listing.price.amount, listing.price.currency)}
                          </div>
                          <div className="table-secondary">
                            {formatMoney(
                              listing.price.amount * listing.quantity,
                              listing.price.currency,
                            )}{' '}
                            total
                          </div>
                        </td>
                        <td>
                          <div className="distribution-cell">
                            <span className="distribution-count">
                              {listing.distribution.published_count}
                            </span>
                            {listing.distribution.error_count > 0 ? (
                              <span className="distribution-errors">
                                {listing.distribution.error_count} erreur(s)
                              </span>
                            ) : (
                              <span className="distribution-ok">OK</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <StatusPill tone={listingStat.tone}>{listingStat.label}</StatusPill>
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

            <div className="listing-cards">
              {filtered.map((listing) => {
                const listingStat = listingStatus(listing.status);
                return (
                  <button
                    key={listing.id}
                    type="button"
                    className="sale-card"
                    onClick={() => navigate(`/listings/${listing.id}`)}
                  >
                    <div className="sale-card-top">
                      <span className="sale-card-id">{listing.short_id}</span>
                      <StatusPill tone={listingStat.tone}>{listingStat.label}</StatusPill>
                    </div>
                    <div className="sale-card-event">{listing.event.name}</div>
                    <div className="sale-card-meta">
                      <span>
                        <CalendarDays size={13} /> {formatEventDate(listing.event.start_date)}
                      </span>
                      <span>
                        <Ticket size={13} /> {listing.quantity} · {listing.section.name} / {listing.row}
                      </span>
                    </div>
                    <div className="sale-card-bottom">
                      <span className="sale-card-marketplace">
                        <Store size={14} />
                        {listing.distribution.published_count} publiées
                        {listing.distribution.error_count > 0
                          ? ` · ${listing.distribution.error_count} erreurs`
                          : ''}
                      </span>
                      <strong>{formatMoney(listing.price.amount, listing.price.currency)}</strong>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
        {hasMoreListings ? (
          <div className="table-footnote">
            <ShoppingBag size={14} />
            Seules les 1 000 annonces les plus récentes sont chargées dans cette vue.
          </div>
        ) : null}
      </div>

      {id ? <ListingDetail listing={detailListing} loading={detailLoading} onClose={closeDetail} /> : null}
    </div>
  );
}
