import { addDays, startOfDay } from './format';
import { loadCache, saveCache, clearModeData } from './storage';
import type { EventDetail, EventSummary, Listing, Me, Sale } from './types';

type DemoData = {
  me: Me;
  sales: Sale[];
  listings: Listing[];
  events: EventSummary[];
  generatedAt: string;
};

const DEMO_VERSION = 3;

const EVENTS: Array<{
  name: string;
  venue: string;
  city: string;
  country: string;
  categories: string[];
  sections: string[];
  days: number;
}> = [
  {
    name: 'Champions League — Atlético Madrid vs Bayern Munich',
    venue: 'Riyadh Air Metropolitano',
    city: 'Madrid',
    country: 'ES',
    categories: ['SPORT', 'Football'],
    sections: ['420', '118', '234', 'Fondo Sur'],
    days: 14,
  },
  {
    name: 'Valencia CF vs Real Madrid',
    venue: 'Mestalla',
    city: 'Valence',
    country: 'ES',
    categories: ['SPORT', 'Football'],
    sections: ['533', '453', '128', 'Grada Joven'],
    days: 32,
  },
  {
    name: 'LOSC Lille vs Galatasaray SK',
    venue: 'Decathlon Arena',
    city: 'Lille',
    country: 'FR',
    categories: ['SPORT', 'Football'],
    sections: ['J02', 'L24', 'K15', 'Rang 1'],
    days: 3,
  },
  {
    name: 'Arsenal vs Liverpool — Premier League',
    venue: 'Emirates Stadium',
    city: 'Londres',
    country: 'GB',
    categories: ['SPORT', 'Football'],
    sections: ['Block 12', 'Block 45', 'Club Level'],
    days: 21,
  },
  {
    name: 'NBA — Lakers vs Golden State Warriors',
    venue: 'Crypto.com Arena',
    city: 'Los Angeles',
    country: 'US',
    categories: ['SPORT', 'Basketball'],
    sections: ['101', '214', 'PR10', 'Suite 12'],
    days: 9,
  },
  {
    name: 'Coldplay — Music of the Spheres World Tour',
    venue: 'Wembley Stadium',
    city: 'Londres',
    country: 'GB',
    categories: ['CONCERT', 'Pop'],
    sections: ['GA', 'A2', 'B12', 'VIP'],
    days: 48,
  },
  {
    name: 'Roland-Garros — Finale dames',
    venue: 'Court Philippe-Chatrier',
    city: 'Paris',
    country: 'FR',
    categories: ['SPORT', 'Tennis'],
    sections: ['Cat 1', 'Cat 2', 'Loge A'],
    days: 62,
  },
  {
    name: 'Tomorrowland — Week-end 2',
    venue: 'De Schorre',
    city: 'Boom',
    country: 'BE',
    categories: ['FESTIVAL', 'Electronic'],
    sections: ['Full Madness', 'Day Pass', 'Dreamville'],
    days: 120,
  },
  {
    name: 'Real Madrid vs FC Barcelona — El Clásico',
    venue: 'Santiago Bernabéu',
    city: 'Madrid',
    country: 'ES',
    categories: ['SPORT', 'Football'],
    sections: ['Fondo Norte', 'Lateral Este', 'Palco'],
    days: 75,
  },
  {
    name: 'PSG vs Olympique de Marseille',
    venue: 'Parc des Princes',
    city: 'Paris',
    country: 'FR',
    categories: ['SPORT', 'Football'],
    sections: ['Virage Auteuil', 'Borelli', 'Paris'],
    days: 18,
  },
  {
    name: 'The Weeknd — After Hours til Dawn',
    venue: 'Accor Arena',
    city: 'Paris',
    country: 'FR',
    categories: ['CONCERT', 'R&B'],
    sections: ['Fosse', 'Gradins', 'Carré Or'],
    days: 27,
  },
  {
    name: 'Six Nations — France vs Angleterre',
    venue: 'Stade de France',
    city: 'Saint-Denis',
    country: 'FR',
    categories: ['SPORT', 'Rugby'],
    sections: ['Tribune Est', 'Tribune Ouest', 'Prestige'],
    days: 40,
  },
  {
    name: 'AS Roma vs Inter Milan',
    venue: 'Stadio Olimpico',
    city: 'Rome',
    country: 'IT',
    categories: ['SPORT', 'Football'],
    sections: ['Curva Nord', 'Tribuna Tevere', 'Monte Mario'],
    days: 11,
  },
  {
    name: 'Formula 1 — Grand Prix de Monaco',
    venue: 'Circuit de Monaco',
    city: 'Monaco',
    country: 'MC',
    categories: ['SPORT', 'Motorsport'],
    sections: ['Tribune K', 'Tribune T', 'Hospitality'],
    days: 88,
  },
  {
    name: 'Taylor Swift — The Eras Tour',
    venue: 'Stade de France',
    city: 'Saint-Denis',
    country: 'FR',
    categories: ['CONCERT', 'Pop'],
    sections: ['Pelouse Or', 'Pelouse', 'Tribune'],
    days: 55,
  },
  {
    name: 'Champions League — Manchester City vs PSG',
    venue: 'Etihad Stadium',
    city: 'Manchester',
    country: 'GB',
    categories: ['SPORT', 'Football'],
    sections: ['Colin Bell', 'East Stand', 'Hospitality'],
    days: 24,
  },
  {
    name: 'Festival Les Vieilles Charrues — Pass 4 jours',
    venue: 'Kerampuilh',
    city: 'Carhaix',
    country: 'FR',
    categories: ['FESTIVAL', 'Musique'],
    sections: ['Pass 4 jours', 'Pass 1 jour', 'Camping'],
    days: 270,
  },
  {
    name: 'Opéra de Paris — La Traviata',
    venue: 'Opéra Garnier',
    city: 'Paris',
    country: 'FR',
    categories: ['CULTURE', 'Opéra'],
    sections: ['Orchestre', 'Balcon', 'Loge'],
    days: 34,
  },
];

const MARKETPLACES = [
  'Venuor',
  'StubHub',
  'FootballTicketsNet',
  'Vividseats',
  'SeatGeek',
  'HelloTickets',
  'Gigsberg',
  'Ticombo',
  'Seatsnet',
  'Fanpass',
];

const FIRST_NAMES = [
  'Chamagne',
  'Daniel',
  'Lucas',
  'Emma',
  'Noah',
  'Léa',
  'Hugo',
  'Sofia',
  'Gabriel',
  'Alice',
  'Arthur',
  'Mila',
  'Louis',
  'Jade',
  'Jules',
  'Louise',
  'Adam',
  'Ambre',
  'Raphaël',
  'Inès',
];

const LAST_NAMES = [
  'Heuser',
  'Martin',
  'Bernard',
  'Dubois',
  'Thomas',
  'Robert',
  'Richard',
  'Petit',
  'Durand',
  'Leroy',
  'Moreau',
  'Simon',
  'Laurent',
  'Lefebvre',
  'Michel',
  'Garcia',
  'David',
  'Bertrand',
  'Roux',
  'Vincent',
];

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: () => number, items: T[]): T {
  return items[Math.floor(random() * items.length)];
}

function int(random: () => number, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function money(amount: number, currency: string) {
  return { amount: round(amount), currency };
}

function makeEvents(now: Date): EventSummary[] {
  return EVENTS.map((event, index) => ({
    id: `demo-event-${index + 1}`,
    name: event.name,
    start_date: addDays(now, event.days).toISOString(),
    performer: event.name,
    categories: event.categories,
    venue: event.venue,
    city: event.city,
    country: event.country,
    timezone: 'Europe/Paris',
    currency: 'EUR',
    listable: true,
  }));
}

function makeListings(events: EventSummary[], now: Date): Listing[] {
  const random = mulberry32(20261020);
  const listings: Listing[] = [];

  for (let index = 0; index < 34; index += 1) {
    const event = events[index % events.length];
    const eventSpec = EVENTS[index % EVENTS.length];
    const section = pick(random, eventSpec.sections);
    const quantity = int(random, 1, 4);
    const row = String(int(random, 1, 42));
    const firstSeat = String(int(random, 1, 28));
    const basePrice = int(random, 55, 380);
    const published = random() > 0.14;
    const errorCount = random() > 0.72 ? int(random, 1, 3) : 0;
    const publishedCount = int(random, 3, 20);
    const marketplaceList = MARKETPLACES.slice(0, int(random, 4, 9)).map((name) => ({
      id: name.toLowerCase().replace(/[^a-z]/g, '_'),
      name,
      price: random() > 0.18 ? money(basePrice * (0.95 + random() * 0.35), 'EUR') : null,
    }));

    listings.push({
      object: 'listing',
      id: `demo-listing-${index + 1}`,
      short_id: `LHA${String(3761 + index).padStart(4, '0')}`,
      mode: 'live',
      member: { id: 'demo-member-1', role: 'member' },
      event,
      section: { key: `${index}:${section}`, name: section },
      row,
      first_seat: firstSeat,
      hide_seats: random() > 0.8,
      hide_row: random() > 0.85,
      quantity,
      max_display_quantity: null,
      instant_delivery: random() > 0.64,
      on_hold_quantity: 0,
      price: money(basePrice, 'EUR'),
      face_value: money(basePrice * (0.45 + random() * 0.15), 'EUR'),
      split_type: random() > 0.5 ? 'Avoid leaving one' : 'Any split',
      transfer_method: random() > 0.2 ? 'E-ticket' : 'Mobile Link/PKPASS',
      fan_allocation: 'neutral',
      platforms: marketplaceList.map((marketplace) => marketplace.id),
      restrictions: [],
      features: random() > 0.7 ? ['instant_delivery'] : [],
      benefits: [],
      other_attributes: null,
      internal_note: `${int(random, 100000, 999999)}`,
      status: published ? 'published' : 'unpublished',
      publish_status: null,
      inventory_version: int(random, 0, 3),
      distribution: {
        published_count: published ? publishedCount : 0,
        error_count: errorCount,
      },
      created_at: addDays(now, -int(random, 1, 24)).toISOString(),
      marketplaces: marketplaceList,
    });
  }

  return listings;
}

function makeSales(events: EventSummary[], listings: Listing[], now: Date): Sale[] {
  const random = mulberry32(424242);
  const sales: Sale[] = [];
  const today = startOfDay(now);

  for (let index = 0; index < 58; index += 1) {
    const listing = pick(random, listings);
    const event = events.find((item) => item.id === listing.event.id) || listing.event;
    const todaySale = index < 4;
    const daysAgo = todaySale ? 0 : int(random, 1, 29);
    const created = addDays(today, -daysAgo);
    created.setHours(todaySale ? Math.max(0, now.getHours() - index) : int(random, 8, 22), int(random, 0, 59), int(random, 0, 59), 0);
    const quantity = int(random, 1, 4);
    const unit = int(random, 55, 260) + random();
    const total = round(unit * quantity);
    const statusRoll = random();
    const status = statusRoll < 0.52 ? 'awaiting_delivery' : statusRoll < 0.94 ? 'delivered' : 'cancelled';
    const marketplace = pick(random, MARKETPLACES);
    const buyerCount = quantity > 1 && random() > 0.5 ? int(random, 1, quantity) : quantity;
    const buyers = Array.from({ length: buyerCount }, () => {
      const firstName = pick(random, FIRST_NAMES);
      const lastName = pick(random, LAST_NAMES);
      return {
        first_name: firstName,
        last_name: lastName,
        email: random() > 0.5 ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com` : null,
        phone: random() > 0.6 ? `+33 6 ${int(random, 10, 99)} ${int(random, 10, 99)} ${int(random, 10, 99)} ${int(random, 10, 99)}` : null,
      };
    });

    sales.push({
      object: 'sale',
      id: `demo-sale-${index + 1}`,
      short_id: `D35B${String(6490 + index * 37).padStart(4, '0')}`,
      mode: 'live',
      member: { id: 'demo-member-1', role: 'member' },
      marketplace,
      status,
      listing_id: listing.id,
      event,
      section: listing.section.name,
      row: listing.row,
      first_seat: listing.first_seat,
      quantity,
      transfer_method: listing.transfer_method,
      face_value: money(unit * 0.52, 'USD'),
      internal_note: `${int(random, 100000, 999999)}`,
      payout: {
        unit_amount: unit,
        total_amount: total,
        currency: 'USD',
      },
      buyers,
      is_paid: status === 'delivered',
      is_under_review: false,
      delivered_at:
        status === 'delivered'
          ? new Date(created.getTime() + int(random, 20, 220) * 60000).toISOString()
          : null,
      cancelled_at:
        status === 'cancelled'
          ? new Date(created.getTime() + int(random, 30, 500) * 60000).toISOString()
          : null,
      created_at: created.toISOString(),
    });
  }

  return sales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function buildDemoData(): DemoData {
  const now = new Date();
  const me: Me = {
    object: 'api_key_context',
    seller_id: 'demo-seller-2026',
    key_id: 'demo-key-2026',
    mode: 'live',
    scopes: ['events:read', 'listings:read', 'sales:read'],
    team_member: true,
    kyc_status: 'approved',
    default_currency: 'USD',
  };
  const events = makeEvents(now);
  const listings = makeListings(events, now);
  const sales = makeSales(events, listings, now);

  return {
    me,
    sales,
    listings,
    events,
    generatedAt: now.toISOString(),
  };
}

export function getDemoData(): DemoData {
  const cached = loadCache<DemoData & { version?: number }>('demo', 'seed');
  if (cached?.data && cached.data.sales?.length && (cached.data as { version?: number }).version === DEMO_VERSION) {
    return cached.data;
  }
  const data = { ...buildDemoData(), version: DEMO_VERSION };
  saveCache('demo', 'seed', data);
  return data;
}

export function saveDemoData(data: DemoData): void {
  saveCache('demo', 'seed', { ...data, version: DEMO_VERSION });
}

export function resetDemoData(): DemoData {
  clearModeData('demo');
  const data = { ...buildDemoData(), version: DEMO_VERSION };
  saveCache('demo', 'seed', data);
  return data;
}

export function simulateDemoSale(data: DemoData): { sale: Sale; data: DemoData } {
  const random = mulberry32(Date.now() % 1000000007);
  const listing = pick(random, data.listings);
  const event = data.listings.find((item) => item.id === listing.id)?.event || data.events[0];
  const quantity = int(random, 1, 3);
  const unit = int(random, 65, 320) + 0.57;
  const total = round(unit * quantity);
  const marketplace = pick(random, MARKETPLACES);
  const status = random() > 0.35 ? 'awaiting_delivery' : 'delivered';
  const now = new Date();
  const buyers = Array.from({ length: quantity }, () => {
    const firstName = pick(random, FIRST_NAMES);
    const lastName = pick(random, LAST_NAMES);
    return {
      first_name: firstName,
      last_name: lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      phone: null,
    };
  });

  const sale: Sale = {
    object: 'sale',
    id: `demo-sale-${Date.now()}`,
    short_id: `D${String(Date.now()).slice(-7)}`,
    mode: 'live',
    member: { id: 'demo-member-1', role: 'member' },
    marketplace,
    status,
    listing_id: listing.id,
    event,
    section: listing.section.name,
    row: listing.row,
    first_seat: listing.first_seat,
    quantity,
    transfer_method: listing.transfer_method,
    face_value: money(unit * 0.52, 'USD'),
    internal_note: `${int(random, 100000, 999999)}`,
    payout: {
      unit_amount: unit,
      total_amount: total,
      currency: 'USD',
    },
    buyers,
    is_paid: status === 'delivered',
    is_under_review: false,
    delivered_at: status === 'delivered' ? now.toISOString() : null,
    cancelled_at: null,
    created_at: now.toISOString(),
  };

  const nextData = { ...data, sales: [sale, ...data.sales] };
  saveDemoData(nextData);
  return { sale, data: nextData };
}

export function demoEventDetail(event: EventSummary): EventDetail {
  const spec = EVENTS.find((item) => item.name === event.name);
  return {
    ...event,
    sections: (spec?.sections || ['A', 'B', 'C']).map((name, index) => ({
      key: `demo-section-${index + 1}`,
      name,
      category: index === 0 ? 'CENTER' : 'SIDE',
    })),
  };
}
