# BlitzQuote — Full Build Prompt

## Project Overview

Build **BlitzQuote** (blitzquote.co.uk), a platform that connects UK tradespeople with homeowners via AI agent discovery. The core concept: tradespeople publish their profile and availability once, and AI assistants (ChatGPT, Claude, Siri, Google Assistant, etc.) can discover them via an API and book quoting slots directly into their calendar. Tagline: **"Quotes at the speed of AI."**

This is a real product for a real user (Grant Sidwell). It needs to be production-quality, not a prototype.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** Supabase (Postgres + Auth + Realtime)
- **Styling:** Tailwind CSS + shadcn/ui
- **Payments:** Stripe (subscriptions + per-booking metered billing)
- **Calendar:** Google Calendar API integration (primary), with iCal fallback
- **AI API:** OpenAPI 3.1 spec designed for LLM tool-use / function-calling
- **Deployment:** Vercel
- **Port:** 3007 (dev server)

## Core Features to Build

### 1. Marketing / Landing Page (`/`)

Rebuild the existing Replit landing page properly. Include:

- Hero section with clear value prop: "Let AI Agents Find & Book Your Next Job"
- How it works (3-step flow)
- Pricing cards (4 tiers: Pay Per Booking £1, Monthly £5, Annual £50, Investor £1,500)
- Money-back guarantee section
- Waiting list signup form (name, email, trade, preferred plan)
- FAQ accordion
- Social proof / waitlist counter
- Mobile responsive, fast, professional

### 2. Auth System (`/login`, `/register`, `/onboarding`)

- Supabase Auth (email/password + magic link)
- Registration flow that captures: name, email, phone, trade category, business name, service area (postcodes/radius), brief bio
- Onboarding wizard after first login (3-4 steps to complete profile)

### 3. Tradesperson Dashboard (`/dashboard`)

- **Profile Management** — Edit business info, services offered, service area, profile photo, portfolio images, qualifications/certifications
- **Availability Calendar** — Weekly recurring availability slots + ability to block specific dates. Visual calendar UI. Sync with Google Calendar.
- **Bookings Feed** — List of incoming bookings with status (pending, confirmed, completed, cancelled). Each booking shows: customer name, job description, date/time, location, how they found you (which AI agent)
- **Earnings / Billing** — Current plan, usage this month, invoices, upgrade/downgrade plan
- **Settings** — Notification preferences, calendar sync, account management

### 4. AI Discovery API (`/api/v1/...`)

This is the core product differentiator. Build a RESTful API with full OpenAPI 3.1 spec that AI agents can call:

```
GET  /api/v1/trades                    — List available trade categories
GET  /api/v1/search                    — Search tradespeople by trade, location, availability
     ?trade=plumber&postcode=M1+1AA&date=2026-03-20
GET  /api/v1/tradesperson/:id          — Get full profile + availability slots
POST /api/v1/bookings                  — Create a booking (requires customer name, contact, job description, selected slot)
GET  /api/v1/bookings/:id              — Check booking status
GET  /api/v1/availability/:id          — Get available slots for a specific tradesperson
```

**Critical:** The API must return structured JSON that is optimised for LLM consumption. Include an `/.well-known/ai-plugin.json` manifest and OpenAPI spec at `/api/v1/openapi.json` so AI platforms can auto-discover the API (following the ChatGPT plugin / OpenAI actions pattern).

Each API response should include:
- Clear, descriptive field names (no abbreviations)
- Human-readable descriptions in the schema
- Availability as ISO 8601 timestamps
- Distance calculations from the requested postcode
- Ratings/review summary if available

### 5. Booking Flow

When an AI agent (or direct user) creates a booking:

1. Check the requested slot is still available (race condition safe — use Supabase row-level locking)
2. Create booking record with status "pending"
3. Send notification to tradesperson (email + in-app)
4. If tradesperson has Google Calendar connected, create a calendar event
5. Send confirmation to the customer (email with booking details)
6. Track the booking source (which AI agent/platform made the request)
7. If on pay-per-booking plan, record a metered billing event in Stripe

### 6. Admin Panel (`/admin`) — Basic

- View all registered tradespeople
- View all bookings
- Waitlist management (approve, invite, export)
- Basic analytics (signups over time, bookings over time, revenue)

## Database Schema (Supabase)

Design tables for:

- `profiles` — tradesperson profiles (extends Supabase auth.users)
- `services` — what services each tradesperson offers (many-to-many with trade categories)
- `trade_categories` — plumber, electrician, carpenter, roofer, etc.
- `availability` — recurring weekly slots + one-off blocks
- `bookings` — the core booking records
- `waitlist` — pre-launch signups
- `api_keys` — for AI platform integrations (future)
- `billing_events` — tracks per-booking charges

Use Row Level Security (RLS) policies throughout.

## Key Design Decisions

- **Location search**: Use UK postcodes. Store lat/lng via a postcode lookup API (postcodes.io — free). Search by radius.
- **Calendar sync**: Google Calendar OAuth2 flow. Store refresh tokens securely. Two-way sync (BlitzQuote availability ↔ Google Calendar).
- **Pricing logic**: Stripe Customer per tradesperson. Three products: metered (pay-per-booking), monthly subscription, annual subscription. Investor tier handled manually.
- **API authentication**: Public read endpoints for search/discovery (rate-limited). Write endpoints (create booking) require an API key or are open with rate limiting + CAPTCHA-equivalent for AI agents.
- **AI-friendly**: The entire API should be designed with the assumption that the caller is an LLM, not a human. Responses should be self-describing and include natural language summaries alongside structured data.

## Project Structure

```
blitzquote/
├── src/
│   ├── app/
│   │   ├── (marketing)/        # Landing page, pricing, about
│   │   ├── (auth)/             # Login, register, onboarding
│   │   ├── (dashboard)/        # Tradesperson dashboard
│   │   ├── admin/              # Admin panel
│   │   └── api/
│   │       └── v1/             # AI Discovery API routes
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── marketing/          # Landing page components
│   │   ├── dashboard/          # Dashboard components
│   │   └── booking/            # Booking flow components
│   ├── lib/
│   │   ├── supabase/           # Client, server, middleware helpers
│   │   ├── stripe/             # Stripe helpers
│   │   ├── calendar/           # Google Calendar integration
│   │   ├── geo/                # Postcode lookup, distance calc
│   │   └── utils.ts
│   └── types/
├── supabase/
│   └── migrations/             # SQL migrations
├── public/
│   └── .well-known/
│       └── ai-plugin.json      # AI plugin manifest
├── package.json
└── .env.local.example
```

## Environment Variables Needed

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
POSTCODES_IO_URL=https://api.postcodes.io
```

## Priority Order

Build in this order:

1. Project scaffold + database schema + Supabase setup
2. Landing page with waitlist form (functional — saves to `waitlist` table)
3. Auth flow (register, login, onboarding)
4. Tradesperson dashboard (profile + availability)
5. AI Discovery API (search + availability endpoints)
6. Booking flow (create booking, notifications, calendar event)
7. Stripe billing integration
8. Admin panel
9. Google Calendar sync
10. Polish, error handling, loading states, mobile responsiveness

## Notes

- This is for Grant Sidwell — he's non-technical, so the admin/dashboard UX needs to be dead simple
- UK market only — use £, UK postcodes, UK-appropriate trade categories
- The AI API is the key differentiator — spend extra time making it excellent and well-documented
- Include seed data for trade categories (plumber, electrician, gas engineer, carpenter, roofer, plasterer, painter & decorator, locksmith, landscaper, builder, tiler, handyman, etc.)
