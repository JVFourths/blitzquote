/**
 * Returns all BlitzQuote migration SQL as a single block.
 * Grant pastes this into the Supabase SQL Editor during setup.
 *
 * IMPORTANT: This is inlined (not read from files) because Vercel's
 * filesystem is read-only — we can't read migration files at runtime.
 */
export function getCombinedSQL(): string {
  return `
-- ================================================================
-- BlitzQuote — Complete Database Setup
-- ================================================================
-- Paste this entire block into your Supabase SQL Editor and click "Run".
-- It will create all tables, security rules, and seed data.
-- This is safe to run multiple times (uses IF NOT EXISTS).
-- ================================================================

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ================================================================
-- TABLES
-- ================================================================

create table if not exists public.trade_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  icon text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  phone text,
  business_name text,
  bio text,
  profile_photo_url text,
  postcode text,
  latitude double precision,
  longitude double precision,
  service_radius_miles integer not null default 25,
  is_onboarded boolean not null default false,
  is_verified boolean not null default false,
  is_active boolean not null default true,
  stripe_customer_id text,
  subscription_plan text not null default 'pay_per_booking'
    check (subscription_plan in ('pay_per_booking', 'monthly', 'annual', 'investor')),
  portfolio_image_urls text[] default '{}',
  qualifications text[] default '{}',
  google_calendar_refresh_token text,
  google_calendar_connected boolean not null default false,
  google_calendar_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_postcode on public.profiles(postcode);
create index if not exists idx_profiles_location on public.profiles(latitude, longitude);
create index if not exists idx_profiles_active on public.profiles(is_active) where is_active = true;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  trade_category_id uuid not null references public.trade_categories(id) on delete cascade,
  description text,
  hourly_rate_pence integer,
  created_at timestamptz not null default now(),
  unique(profile_id, trade_category_id)
);

create index if not exists idx_services_profile on public.services(profile_id);
create index if not exists idx_services_category on public.services(trade_category_id);

DO $$ BEGIN
  CREATE TYPE availability_type AS ENUM ('recurring', 'one_off_available', 'one_off_blocked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type availability_type not null,
  day_of_week integer check (day_of_week >= 0 and day_of_week <= 6),
  start_time time,
  end_time time,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz not null default now(),
  constraint recurring_requires_day check (
    type != 'recurring' or (day_of_week is not null and start_time is not null and end_time is not null)
  ),
  constraint one_off_requires_dates check (
    type = 'recurring' or (start_date is not null and end_date is not null)
  )
);

create index if not exists idx_availability_profile on public.availability(profile_id);
create index if not exists idx_availability_type on public.availability(type);

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  job_description text not null,
  postcode text,
  latitude double precision,
  longitude double precision,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  status booking_status not null default 'pending',
  source text not null default 'direct',
  source_metadata jsonb default '{}',
  google_calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bookings_profile on public.bookings(profile_id);
create index if not exists idx_bookings_status on public.bookings(status);
create index if not exists idx_bookings_slot on public.bookings(slot_start, slot_end);
create index if not exists idx_bookings_source on public.bookings(source);

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  trade text,
  preferred_plan text,
  is_invited boolean not null default false,
  invited_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_waitlist_email on public.waitlist(email);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_hash text not null unique,
  platform text,
  is_active boolean not null default true,
  rate_limit_per_minute integer not null default 60,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  event_type text not null,
  amount_pence integer not null,
  currency text not null default 'gbp',
  stripe_event_id text,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_billing_events_profile on public.billing_events(profile_id);

create table if not exists public.setup_status (
  id uuid primary key default gen_random_uuid(),
  phase integer not null,
  step integer not null,
  status text not null default 'pending',
  completed_at timestamptz,
  metadata jsonb default '{}',
  unique(phase, step)
);

create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

alter table public.trade_categories enable row level security;
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.availability enable row level security;
alter table public.bookings enable row level security;
alter table public.waitlist enable row level security;
alter table public.api_keys enable row level security;
alter table public.billing_events enable row level security;
alter table public.setup_status enable row level security;
alter table public.app_config enable row level security;

-- Trade categories: public read
DO $$ BEGIN
  CREATE POLICY "Trade categories are publicly readable" ON public.trade_categories FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Profiles: public read active, own write
DO $$ BEGIN
  CREATE POLICY "Active profiles are publicly readable" ON public.profiles FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Services
DO $$ BEGIN
  CREATE POLICY "Services are publicly readable" ON public.services FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can manage own services" ON public.services FOR ALL USING (auth.uid() = profile_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Availability
DO $$ BEGIN
  CREATE POLICY "Availability is publicly readable" ON public.availability FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can manage own availability" ON public.availability FOR ALL USING (auth.uid() = profile_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Bookings
DO $$ BEGIN
  CREATE POLICY "Tradespeople can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = profile_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Tradespeople can update own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = profile_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can create bookings" ON public.bookings FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Waitlist
DO $$ BEGIN
  CREATE POLICY "Anyone can join waitlist" ON public.waitlist FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Billing events
DO $$ BEGIN
  CREATE POLICY "Users can view own billing events" ON public.billing_events FOR SELECT USING (auth.uid() = profile_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- setup_status and app_config: no policies (service role key only)

-- ================================================================
-- TRIGGERS
-- ================================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

DROP TRIGGER IF EXISTS bookings_updated_at ON public.bookings;
create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function public.handle_updated_at();

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ================================================================
-- SEED DATA: 20 UK Trade Categories
-- ================================================================

insert into public.trade_categories (name, slug, description, icon) values
  ('Plumber', 'plumber', 'General plumbing, pipe fitting, bathroom installation', '🔧'),
  ('Electrician', 'electrician', 'Electrical installations, rewiring, fault finding', '⚡'),
  ('Gas Engineer', 'gas-engineer', 'Boiler installation, servicing, gas safety checks', '🔥'),
  ('Carpenter', 'carpenter', 'Joinery, fitted furniture, door and window fitting', '🪚'),
  ('Roofer', 'roofer', 'Roof repairs, re-roofing, guttering, fascias', '🏠'),
  ('Plasterer', 'plasterer', 'Plastering, rendering, skimming, coving', '🧱'),
  ('Painter & Decorator', 'painter-decorator', 'Interior and exterior painting, wallpapering', '🎨'),
  ('Locksmith', 'locksmith', 'Lock fitting, emergency entry, security upgrades', '🔑'),
  ('Landscaper', 'landscaper', 'Garden design, fencing, decking, driveways', '🌿'),
  ('Builder', 'builder', 'Extensions, renovations, structural work', '🏗️'),
  ('Tiler', 'tiler', 'Wall and floor tiling, bathroom and kitchen tiling', '🔲'),
  ('Handyman', 'handyman', 'General repairs, odd jobs, flat-pack assembly', '🛠️'),
  ('Kitchen Fitter', 'kitchen-fitter', 'Kitchen design and installation', '🍳'),
  ('Bathroom Fitter', 'bathroom-fitter', 'Bathroom design, installation, wet rooms', '🚿'),
  ('Window Fitter', 'window-fitter', 'Double glazing, window and door installation', '🪟'),
  ('Heating Engineer', 'heating-engineer', 'Central heating, underfloor heating, radiators', '🌡️'),
  ('Damp Proofing', 'damp-proofing', 'Damp surveys, treatment, tanking', '💧'),
  ('Pest Control', 'pest-control', 'Rodent, insect, and bird control', '🐀'),
  ('Drainage Engineer', 'drainage-engineer', 'Blocked drains, CCTV surveys, drain repairs', '🕳️'),
  ('Scaffolder', 'scaffolder', 'Scaffolding erection and dismantling', '🪜')
on conflict (slug) do nothing;

-- ================================================================
-- DONE! Your database is ready.
-- ================================================================
`.trim();
}
