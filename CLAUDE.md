# BlitzQuote

AI-powered tradesperson discovery and booking platform for the UK market.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database:** Supabase (Postgres + Auth + RLS)
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Payments:** Stripe (subscriptions + metered billing)
- **Calendar:** Google Calendar API (OAuth2)
- **Email:** Resend (transactional)
- **Geo:** postcodes.io (free UK postcode lookup)
- **Deployment:** Vercel
- **Dev Port:** 3333

## Commands

```bash
npm run dev          # Start dev server on port 3007
npm run build        # Production build
npm run lint         # ESLint
```

## Project Structure

```
src/app/
  (marketing)/       # Landing page (/)
  (auth)/            # Login, register, onboarding
  (dashboard)/       # Tradesperson dashboard
  admin/             # Admin panel
  api/v1/            # Public AI Discovery API
  api/stripe/        # Stripe checkout/portal/webhook
  api/calendar/      # Google Calendar OAuth
  api/bookings/      # Internal booking management
  api/admin/         # Admin API (env management)
  auth/              # Auth callback + signout

src/lib/
  supabase/          # Client, server, middleware helpers
  stripe/            # Stripe client + customer management
  calendar/          # Google Calendar OAuth + events
  notifications/     # Email notifications (Resend)
  billing/           # Billing event recording
  geo/               # Postcode lookup + haversine distance
  api/               # CORS headers

supabase/migrations/ # SQL migrations (run in order)
```

## Key Design Decisions

- API responses include `summary` fields for LLM consumption
- All dates are ISO 8601, prices in pence (GBP)
- Supabase client helpers are untyped (no Database generic) — types in `src/types/database.ts` for reference
- Google Calendar tokens stored per profile, refresh on each use
- Email notifications are fire-and-forget (don't block API responses)
- Admin panel has no auth gate yet — add before production
