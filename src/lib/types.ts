export type Money = {
  amount: number;
  currency: string;
};

export type Me = {
  object: string;
  seller_id: string;
  key_id: string;
  mode: 'live' | 'test' | string;
  scopes: string[];
  team_member: boolean;
  kyc_status: string;
  default_currency: string;
};

export type EventSummary = {
  id: string;
  name: string;
  start_date: string;
  performer?: string | null;
  categories?: string[];
  venue: string;
  city: string;
  country: string;
  timezone?: string;
  currency?: string | null;
  listable?: boolean;
};

export type EventSection = {
  key: string;
  category?: string;
  name: string;
};

export type EventDetail = EventSummary & {
  sections?: EventSection[];
};

export type Member = {
  id: string;
  role: string;
};

export type Listing = {
  object: string;
  id: string;
  short_id: string;
  mode: string;
  member?: Member;
  event: EventSummary;
  section: { key: string; name: string };
  row: string;
  first_seat: string;
  hide_seats: boolean;
  hide_row: boolean;
  quantity: number;
  max_display_quantity: number | null;
  instant_delivery: boolean;
  on_hold_quantity: number;
  price: Money;
  face_value: Money;
  split_type: string;
  transfer_method: string;
  fan_allocation: string;
  platforms: string[];
  restrictions: string[];
  features: string[];
  benefits: string[];
  other_attributes: Record<string, unknown> | null;
  internal_note: string | null;
  status: string;
  publish_status: string | null;
  inventory_version: number;
  distribution: {
    published_count: number;
    error_count: number;
  };
  created_at: string;
  marketplaces: Array<{
    id: string;
    name: string;
    price: Money | null;
  }>;
};

export type Buyer = {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
};

export type Sale = {
  object: string;
  id: string;
  short_id: string;
  mode: string;
  member?: Member;
  marketplace: string;
  status: string;
  listing_id: string;
  event: EventSummary;
  section: string;
  row: string;
  first_seat: string;
  quantity: number;
  transfer_method: string;
  face_value: Money;
  internal_note: string | null;
  payout: {
    unit_amount: number;
    total_amount: number;
    currency: string;
  };
  buyers: Buyer[];
  is_paid: boolean;
  is_under_review: boolean;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
};

export type ListResponse<T> = {
  object: 'list';
  data: T[];
  has_more: boolean;
  next_cursor: string | null;
};

export type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  request_id?: string;
};

export type Mode = 'live' | 'demo';

export type AppSettings = {
  storeName: string;
  displayName: string;
  soundEnabled: boolean;
  volume: number;
  pollInterval: number;
  pushServerUrl: string;
  pushToken: string;
  installBannerDismissed: boolean;
};

export type SaleAlert = {
  id: string;
  saleId: string;
  title: string;
  body: string;
  amount: number;
  currency: string;
  createdAt: string;
  read: boolean;
  demo?: boolean;
};

export type SyncState = {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastSync: string | null;
  fromCache: boolean;
};

export type PushStatus =
  | 'unsupported'
  | 'permission-denied'
  | 'not-subscribed'
  | 'subscribed'
  | 'checking'
  | 'error';
