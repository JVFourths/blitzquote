-- Setup wizard progress tracking
create table if not exists public.setup_status (
  id uuid primary key default gen_random_uuid(),
  phase integer not null,
  step integer not null,
  status text not null default 'pending',
  completed_at timestamptz,
  metadata jsonb default '{}',
  unique(phase, step)
);

alter table public.setup_status enable row level security;
-- No RLS policies — service role key only (bypasses RLS by default)

-- App configuration (Stripe price IDs, admin email, etc.)
create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;
-- No RLS policies — service role key only
