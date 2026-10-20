import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Globe2,
  Layers,
  MapPin,
  Search,
  Sparkles,
  Ticket,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { api, errorText } from '../lib/api';
import {
  countryName,
  eventDateParts,
  formatEventDate,
  formatMoney,
  formatNumber,
  startOfDay,
} from '../lib/format';
import type { EventDetail, EventSummary } from '../lib/types';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { EmptyState } from '../components/EmptyState';
import { Drawer } from '../components/Drawer';

const COUNTRIES = ['FR', 'ES', 'GB', 'US', 'IT', 'BE', 'DE', 'NL', 'PT', 'CH', 'MC', 'CA'];

function EventDetailView({
  event,
  loading,
  onClose,
}: {
  event: EventDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { listings, sales } = useData();
  const relatedListings = event ? listings.filter((listing) => listing.event.id === event.id) : [];
  const relatedSales = event ? sales.filter((sale) => sale.event.id === event.id) : [];
  const revenue = relatedSales.reduce((sum, sale) => sum + sale.payout.total_amount, 0);
  const currency = relatedSales[0]?.payout.currency || 'USD';
  const parts = event ? eventDateParts(event.start_date) : null;

  return (
    <Drawer
      open
      onClose={onClose}
      eyebrow={event ? `Événement ${event.id}` : 'Événement'}
      title={event ? event.name : loading ? 'Chargement de l’événement…' : 'Événement introuvable'}
      subtitle={
        event ? (
          <span className="drawer-subtitle-row">
            <StatusPill tone={event.listable ? 'green' : 'gray'} dot={false}>
              {event.listable ? 'Ouvert aux annonces' : 'Non listable'}
            </StatusPill>
            <span>{formatEventDate(event.start_date)}</span>
          </span>
        ) : null
      }
      footer={
        event ? (
          <div className="drawer-footer-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(`/sales?q=${encodeURIComponent(event.name)}`)}
            >
              Voir les ventes
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(`/listings?event=${event.id}`)}
            >
              <Ticket size={16} />
              Voir les annonces
            </button>
          </div>
        ) : null
      }
    >
      {loading && !event ? (
        <div className="drawer-skeleton">
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-block" />
          <div className="skeleton skeleton-line is-short" />
        </div>
      ) : !event ? (
        <EmptyState
          icon={CalendarDays}
          title="Cet événement est introuvable"
          description="Il a peut-être été retiré du catalogue Seatiks."
        />
      ) : (
        <div className="sale-detail">
          <div className="event-hero">
            <div className="event-hero-date">
              <span>{parts?.day}</span>
              <strong>{parts?.month}</strong>
              <small>{parts?.year}</small>
            </div>
            <div className="event-hero-text">
              <div className="event-hero-weekday">{parts?.weekday} · {parts?.time}</div>
              <strong>{event.name}</strong>
              <span>
                <MapPin size={14} /> {event.venue} · {event.city}, {countryName(event.country)}
              </span>
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-section-title">À propos</div>
            <div className="tag-list">
              {(event.categories || []).map((category) => (
                <span key={category} className="tag">
                  {category}
                </span>
              ))}
              <span className="tag">
                <Globe2 size={12} /> {countryName(event.country)}
              </span>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-box">
              <span className="detail-box-label">Annonces</span>
              <strong>{relatedListings.length}</strong>
            </div>
            <div className="detail-box">
              <span className="detail-box-label">Ventes</span>
              <strong>{relatedSales.length}</strong>
            </div>
            <div className="detail-box">
              <span className="detail-box-label">Billets vendus</span>
              <strong>{relatedSales.reduce((sum, sale) => sum + sale.quantity, 0)}</strong>
            </div>
            <div className="detail-box">
              <span className="detail-box-label">Chiffre d’affaires</span>
              <strong>{formatMoney(revenue, currency, { compact: revenue >= 10000 })}</strong>
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-section-title">
              Catalogue des sections
              <span className="detail-section-aside">{event.sections?.length || 0} sections</span>
            </div>
            {event.sections?.length ? (
              <div className="section-grid">
                {event.sections.map((section) => {
                  const count = relatedListings.filter(
                    (listing) => listing.section.key === section.key,
                  ).length;
                  return (
                    <div key={section.key} className="section-chip">
                      <span>{section.name}</span>
                      {section.category ? <small>{section.category}</small> : null}
                      {count > 0 ? <em>{count}</em> : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="detail-muted">Aucune section disponible.</div>
            )}
          </div>

          {relatedSales.length ? (
            <div className="detail-section">
              <div className="detail-section-title">Dernières ventes</div>
              <div className="event-sales">
                {relatedSales.slice(0, 4).map((sale) => (
                  <button
                    key={sale.id}
                    type="button"
                    className="event-sale-row"
                    onClick={() => navigate(`/sales/${sale.id}`)}
                  >
                    <span className="event-sale-marketplace">{sale.marketplace}</span>
                    <span className="event-sale-qty">{sale.quantity} billets</span>
                    <strong>{formatMoney(sale.payout.total_amount, sale.payout.currency)}</strong>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="detail-note">
            <Layers size={15} />
            <span>
              Les événements sont fournis par le catalogue Seatiks. Les annonces ne peuvent être
              créées que si l’événement est « listable ».
            </span>
          </div>
        </div>
      )}
    </Drawer>
  );
}

export function EventsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mode, apiKey } = useAuth();
  const { events: initialEvents, listings, sales, getEvent } = useData();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [country, setCountry] = useState('all');
  const [listableOnly, setListableOnly] = useState(true);
  const [items, setItems] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<EventDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (mode === 'demo') {
      const q = debounced.toLowerCase();
      const filtered = initialEvents
        .filter((event) => {
          if (listableOnly && !event.listable) return false;
          if (country !== 'all' && event.country !== country) return false;
          if (!q) return true;
          return `${event.name} ${event.venue} ${event.city}`.toLowerCase().includes(q);
        })
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
      setItems(filtered);
      setHasMore(false);
      setLoading(false);
      setError(null);
      return;
    }

    if (!apiKey) return;
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    api
      .events(apiKey, {
        q: debounced || undefined,
        country: country === 'all' ? undefined : country,
        listable: listableOnly || undefined,
        date_from: startOfDay(new Date()).toISOString(),
        limit: 30,
      })
      .then((result) => {
        if (currentRequest !== requestId.current) return;
        setItems(result.data || []);
        setHasMore(Boolean(result.has_more && result.next_cursor));
        setCursor(result.next_cursor || null);
      })
      .catch((requestError) => {
        if (currentRequest !== requestId.current) return;
        setError(errorText(requestError));
        setItems([]);
        setHasMore(false);
      })
      .finally(() => {
        if (currentRequest === requestId.current) setLoading(false);
      });
  }, [mode, apiKey, debounced, country, listableOnly, initialEvents, reloadToken]);

  const loadMore = async () => {
    if (!apiKey || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await api.events(apiKey, {
        q: debounced || undefined,
        country: country === 'all' ? undefined : country,
        listable: listableOnly || undefined,
        date_from: startOfDay(new Date()).toISOString(),
        cursor,
        limit: 30,
      });
      setItems((current) => {
        const ids = new Set(current.map((event) => event.id));
        return [...current, ...(result.data || []).filter((event) => !ids.has(event.id))];
      });
      setHasMore(Boolean(result.has_more && result.next_cursor));
      setCursor(result.next_cursor || null);
    } catch (requestError) {
      setError(errorText(requestError));
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setDetailEvent(null);
      setDetailLoading(false);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void getEvent(id).then((event) => {
      if (!cancelled) {
        setDetailEvent(event);
        setDetailLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, getEvent]);

  const aggregates = useMemo(() => {
    const listingMap = new Map<string, number>();
    const salesMap = new Map<string, { count: number; revenue: number }>();
    listings.forEach((listing) => {
      listingMap.set(listing.event.id, (listingMap.get(listing.event.id) || 0) + 1);
    });
    sales.forEach((sale) => {
      const current = salesMap.get(sale.event.id) || { count: 0, revenue: 0 };
      current.count += 1;
      current.revenue += sale.payout.total_amount;
      salesMap.set(sale.event.id, current);
    });
    return { listingMap, salesMap };
  }, [listings, sales]);

  return (
    <div className="page">
      <PageHeader
        title="Événements"
        subtitle={
          mode === 'demo'
            ? 'Catalogue de démonstration · les événements Seatiks à venir'
            : 'Catalogue Seatiks · événements ouverts aux annonces'
        }
        actions={
          mode === 'demo' ? (
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/listings')}>
              Voir l’inventaire
              <ArrowRight size={16} />
            </button>
          ) : null
        }
      />

      <div className="toolbar events-toolbar">
        <div className="search-field search-field-grow">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un événement, une salle, une ville…"
            aria-label="Rechercher un événement"
          />
          {search ? (
            <button type="button" className="search-clear" onClick={() => setSearch('')} aria-label="Effacer">
              <X size={14} />
            </button>
          ) : null}
        </div>
        <select
          className="select"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          aria-label="Pays"
        >
          <option value="all">Tous les pays</option>
          {COUNTRIES.map((code) => (
            <option key={code} value={code}>
              {countryName(code)}
            </option>
          ))}
        </select>
        <label className={`toggle ${listableOnly ? 'is-on' : ''}`}>
          <input
            type="checkbox"
            checked={listableOnly}
            onChange={(event) => setListableOnly(event.target.checked)}
          />
          <span className="toggle-track">
            <span className="toggle-thumb" />
          </span>
          <span>Listables uniquement</span>
        </label>
      </div>

      {loading ? (
        <div className="event-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="card event-card event-card-skeleton">
              <div className="skeleton skeleton-block" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line is-short" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card">
          <EmptyState
            icon={CalendarDays}
            title="Impossible de charger les événements"
            description={error}
            action={
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setReloadToken((token) => token + 1)}
              >
                Réessayer
              </button>
            }
          />
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Search}
            title="Aucun événement trouvé"
            description="Essayez un autre nom, un autre pays, ou désactivez le filtre « listables »."
            action={
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSearch('');
                  setCountry('all');
                  setListableOnly(false);
                }}
              >
                Réinitialiser les filtres
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="event-grid">
            {items.map((event) => {
              const parts = eventDateParts(event.start_date);
              const eventListings = aggregates.listingMap.get(event.id) || 0;
              const eventSales = aggregates.salesMap.get(event.id);
              return (
                <button
                  key={event.id}
                  type="button"
                  className="event-card card"
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  <div className="event-card-top">
                    <div className="event-date-block">
                      <span>{parts.day}</span>
                      <strong>{parts.month}</strong>
                      <small>{parts.year}</small>
                    </div>
                    <div className="event-card-badges">
                      {event.listable ? (
                        <StatusPill tone="green" dot={false}>
                          Listable
                        </StatusPill>
                      ) : (
                        <StatusPill tone="gray" dot={false}>
                          Fermé
                        </StatusPill>
                      )}
                      <span className="event-country">{event.country}</span>
                    </div>
                  </div>
                  <div className="event-card-name">{event.name}</div>
                  <div className="event-card-place">
                    <MapPin size={14} />
                    {event.venue} · {event.city}
                  </div>
                  <div className="event-card-time">
                    <CalendarDays size={14} />
                    {parts.weekday} {parts.day} {parts.month} · {parts.time}
                  </div>
                  <div className="event-card-tags">
                    {(event.categories || []).slice(0, 3).map((category) => (
                      <span key={category} className="tag tag-sm">
                        {category}
                      </span>
                    ))}
                  </div>
                  <div className="event-card-footer">
                    <span>
                      <Ticket size={14} />
                      {eventListings} annonce{eventListings > 1 ? 's' : ''}
                      {eventSales ? (
                        <>
                          {' '}
                          · {eventSales.count} vente{eventSales.count > 1 ? 's' : ''}
                        </>
                      ) : null}
                    </span>
                    <ChevronRight size={16} />
                  </div>
                </button>
              );
            })}
          </div>

          {hasMore ? (
            <div className="load-more">
              <button
                type="button"
                className={`btn btn-secondary ${loadingMore ? 'is-loading' : ''}`}
                onClick={() => void loadMore()}
                disabled={loadingMore}
              >
                <Sparkles size={16} />
                {loadingMore ? 'Chargement…' : 'Charger plus d’événements'}
              </button>
            </div>
          ) : (
            <div className="list-footnote">
              <Layers size={14} />
              {formatNumber(items.length)} événement{items.length > 1 ? 's' : ''} affiché
              {items.length > 1 ? 's' : ''}
            </div>
          )}
        </>
      )}

      {id ? (
        <EventDetailView event={detailEvent} loading={detailLoading} onClose={() => navigate('/events')} />
      ) : null}
    </div>
  );
}
