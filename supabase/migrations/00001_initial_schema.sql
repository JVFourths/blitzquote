-- BlitzQuote Initial Schema
-- Tables: trade_categories, profiles, services, availability, bookings, waitlist, api_keys, billing_events

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- =============================================================================
-- TRADE CATEGORIES
-- =============================================================================

create table public.trade_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  icon text, -- emoji or icon identifier
  created_at timestamptz not null default now()
);

comment on table public.trade_categories is 'Available trade categories (plumber, electrician, etc.)';

-- =============================================================================
-- PROFILES (extends auth.users)
-- =============================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  phone text,
  business_name text,
  bio text,
  profile_photo_url text,
  -- Location
  postcode text,
  latitude double precision,
  longitude double precision,
  service_radius_miles integer not null default 25,
  -- Status
  is_onboarded boolean not null default false,
  is_verified boolean not null default false,
  is_active boolean not null default true,
  -- Stripe
  stripe_customer_id text,
  subscription_plan text not null default 'pay_per_booking'
    check (subscription_plan in ('pay_per_booking', 'monthly', 'annual', 'investor')),
  -- Metadata
  portfolio_image_urls text[] default '{}',
  qualifications text[] default '{}',
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Tradesperson profiles extending Supabase auth.users';

create index idx_profiles_postcode on public.profiles(postcode);
create index idx_profiles_location on public.profiles(latitude, longitude);
create index idx_profiles_active on public.profiles(is_active) where is_active = true;

-- =============================================================================
-- SERVICES (many-to-many: profiles <-> trade_categories)
-- =============================================================================

create table public.services (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  trade_category_id uuid not null references public.trade_categories(id) on delete cascade,
  description text, -- optional custom description of what they do in this trade
  hourly_rate_pence integer, -- stored in pence for precision
  created_at timestamptz not null default now(),
  unique(profile_id, trade_category_id)
);

comment on table public.services is 'Services each tradesperson offers, linked to trade categories';

create index idx_services_profile on public.services(profile_id);
create index idx_services_category on public.services(trade_category_id);

-- =============================================================================
-- AVAILABILITY
-- =============================================================================

create type availability_type as enum ('recurring', 'one_off_available', 'one_off_blocked');

create table public.availability (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type availability_type not null,
  -- For recurring: day_of_week (0=Sunday..6=Saturday), start_time, end_time
  day_of_week integer check (day_of_week >= 0 and day_of_week <= 6),
  start_time time,
  end_time time,
  -- For one-off: specific date range
  start_date timestamptz,
  end_date timestamptz,
  -- Metadata
  created_at timestamptz not null default now(),
  -- Constraints
  constraint recurring_requires_day check (
    type != 'recurring' or (day_of_week is not null and start_time is not null and end_time is not null)
  ),
  constraint one_off_requires_dates check (
    type = 'recurring' or (start_date is not null and end_date is not null)
  )
);

comment on table public.availability is 'Recurring weekly slots and one-off availability/blocks';

create index idx_availability_profile on public.availability(profile_id);
create index idx_availability_type on public.availability(type);

-- =============================================================================
-- BOOKINGS
-- =============================================================================

create type booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- Customer info (not necessarily a registered user)
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  -- Job details
  job_description text not null,
  postcode text,
  latitude double precision,
  longitude double precision,
  -- Scheduling
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  -- Status
  status booking_status not null default 'pending',
  -- Tracking
  source text not null default 'direct', -- 'chatgpt', 'claude', 'siri', 'google_assistant', 'direct', 'api'
  source_metadata jsonb default '{}',
  -- Calendar
  google_calendar_event_id text,
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.bookings is 'Booking records created by AI agents or direct users';

create index idx_bookings_profile on public.bookings(profile_id);
create index idx_bookings_status on public.bookings(status);
create index idx_bookings_slot on public.bookings(slot_start, slot_end);
create index idx_bookings_source on public.bookings(source);

-- =============================================================================
-- WAITLIST
-- =============================================================================

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  trade text,
  preferred_plan text,
  -- Status
  is_invited boolean not null default false,
  invited_at timestamptz,
  -- Timestamps
  created_at timestamptz not null default now()
);

comment on table public.waitlist is 'Pre-launch waitlist signups';

create index idx_waitlist_email on public.waitlist(email);

-- =============================================================================
-- API KEYS (for future AI platform integrations)
-- =============================================================================

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_hash text not null unique, -- store hashed, never plain
  platform text, -- 'chatgpt', 'claude', etc.
  is_active boolean not null default true,
  rate_limit_per_minute integer not null default 60,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.api_keys is 'API keys for AI platform integrations';

-- =============================================================================
-- BILLING EVENTS
-- =============================================================================

create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  event_type text not null, -- 'booking_charge', 'subscription_payment', 'refund'
  amount_pence integer not null,
  currency text not null default 'gbp',
  stripe_event_id text,
  description text,
  created_at timestamptz not null default now()
);

comment on table public.billing_events is 'Tracks per-booking charges and subscription payments';

create index idx_billing_events_profile on public.billing_events(profile_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.trade_categories enable row level security;
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.availability enable row level security;
alter table public.bookings enable row level security;
alter table public.waitlist enable row level security;
alter table public.api_keys enable row level security;
alter table public.billing_events enable row level security;

-- Trade categories: readable by everyone
create policy "Trade categories are publicly readable"
  on public.trade_categories for select
  using (true);

-- Profiles: public read for active profiles, own profile for write
create policy "Active profiles are publicly readable"
  on public.profiles for select
  using (is_active = true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Services: public read, own write
create policy "Services are publicly readable"
  on public.services for select
  using (true);

create policy "Users can manage own services"
  on public.services for all
  using (auth.uid() = profile_id);

-- Availability: public read, own write
create policy "Availability is publicly readable"
  on public.availability for select
  using (true);

create policy "Users can manage own availability"
  on public.availability for all
  using (auth.uid() = profile_id);

-- Bookings: tradesperson sees own bookings, API can insert
create policy "Tradespeople can view own bookings"
  on public.bookings for select
  using (auth.uid() = profile_id);

create policy "Tradespeople can update own bookings"
  on public.bookings for update
  using (auth.uid() = profile_id);

create policy "Anyone can create bookings"
  on public.bookings for insert
  with check (true);

-- Waitlist: anyone can insert, no public read
create policy "Anyone can join waitlist"
  on public.waitlist for insert
  with check (true);

-- API keys: admin only (no public policies, use service role)

-- Billing events: own records only
create policy "Users can view own billing events"
  on public.billing_events for select
  using (auth.uid() = profile_id);

-- =============================================================================
-- TRIGGERS: auto-update updated_at
-- =============================================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- TRIGGER: auto-create profile on signup
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
