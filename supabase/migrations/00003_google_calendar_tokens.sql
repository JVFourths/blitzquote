-- Google Calendar OAuth tokens stored per profile

alter table public.profiles
  add column if not exists google_calendar_refresh_token text,
  add column if not exists google_calendar_connected boolean not null default false,
  add column if not exists google_calendar_email text;

comment on column public.profiles.google_calendar_refresh_token is 'Encrypted OAuth2 refresh token for Google Calendar';
comment on column public.profiles.google_calendar_connected is 'Whether Google Calendar sync is active';
comment on column public.profiles.google_calendar_email is 'Google account email used for calendar sync';
