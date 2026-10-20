import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CornerDownLeft,
  LayoutDashboard,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Ticket,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { formatMoney } from '../lib/format';
import { Modal } from './Modal';

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
};

type ResultItem = {
  id: string;
  label: string;
  sub?: string;
  to?: string;
  group: string;
  icon: typeof Search;
  action?: () => void;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { mode, settings } = useAuth();
  const { sales, listings, events, simulateSale } = useData();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  const items = useMemo<ResultItem[]>(() => {
    const q = normalize(query.trim());
    const pages: ResultItem[] = [
      { id: 'page-dashboard', label: 'Tableau de bord', group: 'Pages', to: '/', icon: LayoutDashboard },
      { id: 'page-sales', label: 'Ventes', group: 'Pages', to: '/sales', icon: ShoppingBag },
      { id: 'page-listings', label: 'Inventaire', group: 'Pages', to: '/listings', icon: Ticket },
      { id: 'page-events', label: 'Événements', group: 'Pages', to: '/events', icon: CalendarDays },
      { id: 'page-alerts', label: 'Alertes', group: 'Pages', to: '/alerts', icon: Bell },
      { id: 'page-settings', label: 'Paramètres', group: 'Pages', to: '/settings', icon: Settings },
    ].filter((item) => !q || normalize(item.label).includes(q));

    if (!q) {
      const recent: ResultItem[] = sales.slice(0, 3).map((sale) => ({
        id: `sale-${sale.id}`,
        label: `${sale.quantity} × ${sale.event.name}`,
        sub: `${sale.short_id} · ${sale.marketplace} · ${formatMoney(
          sale.payout.total_amount,
          sale.payout.currency,
        )}`,
        to: `/sales/${sale.id}`,
        group: 'Ventes récentes',
        icon: ShoppingBag,
      }));

      const actions: ResultItem[] = [];
      if (mode === 'demo') {
        actions.push({
          id: 'action-simulate',
          label: 'Simuler une vente',
          sub: 'Teste le son et la notification',
          group: 'Actions rapides',
          icon: Sparkles,
          action: () => void simulateSale(),
        });
      }
      return [...pages, ...recent, ...actions];
    }

    const saleResults: ResultItem[] = sales
      .filter((sale) => {
        const buyerText = sale.buyers
          .map((buyer) => `${buyer.first_name} ${buyer.last_name}`)
          .join(' ');
        return normalize(
          `${sale.short_id} ${sale.event.name} ${sale.marketplace} ${sale.section} ${sale.row} ${buyerText}`,
        ).includes(q);
      })
      .slice(0, 5)
      .map((sale) => ({
        id: `sale-${sale.id}`,
        label: `${sale.quantity} × ${sale.event.name}`,
        sub: `${sale.short_id} · ${sale.marketplace} · ${formatMoney(
          sale.payout.total_amount,
          sale.payout.currency,
        )}`,
        to: `/sales/${sale.id}`,
        group: 'Ventes',
        icon: ShoppingBag,
      }));

    const listingResults: ResultItem[] = listings
      .filter((listing) =>
        normalize(
          `${listing.short_id} ${listing.event.name} ${listing.section.name} ${listing.row}`,
        ).includes(q),
      )
      .slice(0, 5)
      .map((listing) => ({
        id: `listing-${listing.id}`,
        label: `${listing.quantity} × ${listing.event.name}`,
        sub: `${listing.short_id} · ${listing.section.name} · Rang ${listing.row} · ${formatMoney(
          listing.price.amount,
          listing.price.currency,
        )}`,
        to: `/listings/${listing.id}`,
        group: 'Inventaire',
        icon: Ticket,
      }));

    const eventResults: ResultItem[] = events
      .filter((event) => normalize(`${event.name} ${event.venue} ${event.city}`).includes(q))
      .slice(0, 5)
      .map((event) => ({
        id: `event-${event.id}`,
        label: event.name,
        sub: `${event.venue} · ${event.city}`,
        to: `/events/${event.id}`,
        group: 'Événements',
        icon: CalendarDays,
      }));

    return [...pages, ...saleResults, ...listingResults, ...eventResults];
  }, [query, sales, listings, events, mode, simulateSale]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const select = (item: ResultItem) => {
    onClose();
    if (item.to) navigate(item.to);
    item.action?.();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(items.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = items[activeIndex];
      if (item) select(item);
    }
  };

  return (
    <Modal open={open} onClose={onClose} className="command-modal" size="md">
      <div className="command-search">
        <Search size={19} />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ventes, annonces, événements…"
          aria-label="Rechercher"
          autoComplete="off"
          spellCheck={false}
        />
        <kbd>ESC</kbd>
      </div>

      <div className="command-results">
        {items.length === 0 ? (
          <div className="command-empty">
            <Search size={22} />
            <div>Aucun résultat pour « {query} »</div>
            <span>Essayez un nom d’événement, une référence ou une marketplace.</span>
          </div>
        ) : (
          items.map((item, index) => {
            const Icon = item.icon;
            const showGroup = index === 0 || items[index - 1].group !== item.group;
            return (
              <div key={item.id}>
                {showGroup ? <div className="command-group">{item.group}</div> : null}
                <button
                  type="button"
                  className={`command-item ${activeIndex === index ? 'is-active' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => select(item)}
                >
                  <span className="command-item-icon">
                    <Icon size={17} />
                  </span>
                  <span className="command-item-text">
                    <strong>{item.label}</strong>
                    {item.sub ? <small>{item.sub}</small> : null}
                  </span>
                  <ArrowRight size={15} className="command-item-arrow" />
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="command-footer">
        <span>
          <kbd>↑</kbd><kbd>↓</kbd> naviguer
        </span>
        <span>
          <kbd>
            <CornerDownLeft size={11} />
          </kbd>{' '}
          ouvrir
        </span>
        <span className="command-footer-brand">{mode === 'demo' ? 'Démo' : settings.storeName}</span>
      </div>
    </Modal>
  );
}
