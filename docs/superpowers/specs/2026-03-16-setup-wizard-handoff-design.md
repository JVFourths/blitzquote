# BlitzQuote Setup Wizard & Handoff — Design Spec

**Date:** 2026-03-16
**Author:** Johan Visser
**Status:** Approved (Rev 2 — post spec review)

## Problem

BlitzQuote is a fully-built Next.js + Supabase platform that needs to be handed off to Grant Sidwell, a non-technical user. Grant has played with Replit and Claude Code but has zero development experience. The handoff must be a clean break — no ongoing support from Johan.

## Solution

A one-click "Deploy to Vercel" button followed by an in-app Setup Wizard that walks Grant through connecting all third-party services in three milestone phases.

## Handoff Flow

1. Grant receives a GitHub repo link with a "Deploy to Vercel" button in the README
2. Clicking the button forks the repo to Grant's GitHub and deploys to Vercel (~2 minutes)
3. The deployed app detects no Supabase URL is configured and renders the Setup Wizard on all routes
4. Grant completes 3 phases to get the platform fully operational
5. Once Phase 1 is complete, the public site goes live and the wizard moves to `/admin/setup`

## First-Run Detection

| State | Public routes | `/admin/*` |
|-------|--------------|------------|
| No Supabase configured | Setup Wizard (fullscreen) | Setup Wizard (fullscreen) |
| Supabase connected, setup incomplete | Normal public site | Redirects to `/admin/setup` |
| Setup complete | Normal site | Normal admin (wizard accessible as "Setup Guide" in nav) |

**Detection logic:**
- **First-run mode:** `NEXT_PUBLIC_SUPABASE_URL` is not set or empty — middleware renders `/setup` for all routes
- **Setup incomplete:** Supabase is configured, middleware queries the `setup_status` table for a row with `phase=3, status='complete'`. If not found, `/admin/*` redirects to `/admin/setup`
- **Setup complete:** The `setup_status` table has a Phase 3 complete row (or all Phase 1+2 steps validated). Admin panel renders normally with "Setup Guide" link in nav

## Phase 1: "Go Live"

**Goal:** Working website with database, auth, and tradesperson profiles.

| Step | Grant does | App does automatically |
|------|-----------|----------------------|
| 1. Create Supabase account | Clicks link, signs up, creates project | Instructional only |
| 2. Set up database | Opens Supabase SQL Editor, clicks "Copy SQL" button in wizard, pastes and runs it in SQL Editor | Wizard provides a single combined SQL block (all migrations + seed data). Grant sees a "Copy All SQL" button and screenshot of where to paste it in Supabase. After running, wizard validates by querying for the `profiles` table. |
| 3. Add Supabase keys to Vercel | Copies Project URL + anon key + service role key from Supabase, pastes into Vercel Environment Variables (wizard shows exact variable names and where to find each value) | Instructional with format validation hints |
| 4. Redeploy on Vercel | Clicks "Redeploy" in Vercel dashboard (wizard shows exactly where) | App restarts with Supabase connected. Middleware detects Supabase configured + setup incomplete → redirects to `/admin/setup` |
| 5. Set admin credentials | Enters email + password on `/admin/setup` | Creates admin user in Supabase Auth, logs Grant in, persists wizard state to `setup_status` table |

**Phase 1 outcome:** Live platform. Landing page public. Tradespeople can register. AI API works. No payments, no email.

**Cost:** £0 (Supabase free tier + Vercel hobby for testing)

**Note on Supabase free tier:** The wizard warns Grant: "Supabase free projects pause after 7 days of inactivity. Once you have real users, upgrade to Supabase Pro (£20/month) to prevent this. You can upgrade from your Supabase dashboard anytime."

### Handling the Vercel Redeploy Transition (Step 4)

After Grant adds env vars to Vercel and clicks Redeploy:
1. The application rebuilds (~1-2 minutes). The wizard tells Grant: "Your site is rebuilding. This takes about 2 minutes. When it's done, refresh this page."
2. When Grant refreshes, the middleware detects: Supabase URL is set → check `setup_status` table → table exists but no "complete" row → redirect to `/admin/setup`
3. If the `setup_status` table doesn't exist yet (Grant hasn't run the SQL), the middleware catches the query error and renders `/admin/setup` with a message: "Database tables not found. Go back to Step 2 and make sure you ran the SQL in Supabase."
4. Grant continues the wizard from Step 5 (admin credentials) at `/admin/setup`

## Phase 2: "Start Earning"

**Goal:** Payments flowing. Email notifications working.

| Step | Grant does | App does automatically |
|------|-----------|----------------------|
| 6. Create Stripe account | Clicks link, signs up, completes identity verification | Instructional |
| 7. Paste Stripe keys | Copies `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` into 2 fields, then adds them to Vercel env vars | Validates keys server-side (keys sent in request body over HTTPS for validation only). Creates 2 subscription products via Stripe API: Monthly (£5/mo) and Annual (£50/yr). Stores generated price IDs in the `app_config` table. Pay-per-booking is NOT a subscription — it uses per-charge invoice items, no Stripe Product needed. |
| 8. Set up Stripe webhook | Wizard displays the webhook URL (dynamically generated from `window.location.origin` + `/api/stripe/webhook`). Grant copies this URL, pastes it into Stripe Dashboard → Webhooks → Add endpoint. Copies the webhook signing secret back. | Validates webhook by checking Stripe sends a test event. **Note:** Wizard warns "If you add a custom domain later (Phase 3), you'll need to update this webhook URL in Stripe." |
| 9. Create Resend account | Clicks link, signs up | Instructional |
| 10. Verify email domain | Adds DNS records shown by wizard (with registrar-specific screenshots for GoDaddy, Namecheap, Cloudflare) | Auto-checks DNS propagation, retries every 30 seconds. **This step can be skipped and returned to later** — DNS propagation can take up to 48 hours. Step 11 does not depend on Step 10 completing. |
| 11. Paste Resend key | Copies `RESEND_API_KEY` into 1 field, adds to Vercel env vars | Validates by sending test email to Grant's admin email. "Did you receive it? Yes / No / I skipped domain verification" |
| 12. Redeploy | Clicks Redeploy in Vercel to pick up new env vars | App restarts with Stripe + Resend configured |

**Phase 2 outcome:** Full business operations. Subscriptions work. Booking emails sent. Pay-per-booking charges tracked.

**Cost:** ~£37/month (Vercel Pro £16 + Supabase Pro £20 + domain £1). Wizard explains: "One monthly subscriber plus 12 bookings covers this."

### Setup API Routes — Keys-in-Request-Body Pattern

During setup, the wizard needs to validate keys and bootstrap services (Stripe products) before those keys are in Vercel's environment variables. The setup API routes handle this by accepting keys in the request body:

```
POST /api/setup/validate
Body: { step: "stripe", keys: { STRIPE_SECRET_KEY: "sk_test_..." } }

POST /api/setup/bootstrap-stripe
Body: { stripe_secret_key: "sk_test_..." }
```

**Security considerations:**
- These routes are only accessible when the app is in "setup incomplete" state (checked via middleware)
- Keys are transmitted over HTTPS
- Keys are NOT persisted server-side — Grant must add them to Vercel env vars separately
- Once setup is complete, these routes return 403

### Stripe Price ID Storage

Generated Stripe Price IDs (from product bootstrapping) are stored in an `app_config` table in Supabase:

```sql
create table public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
```

The app reads `STRIPE_PRICE_MONTHLY` and `STRIPE_PRICE_ANNUAL` from `app_config` at runtime, falling back to env vars if set. This avoids Grant needing to copy generated price IDs into Vercel manually.

## Phase 3: "Scale" (Optional)

**Goal:** Nice-to-haves that don't block revenue.

| Step | Grant does | App does automatically |
|------|-----------|----------------------|
| 13. Google Calendar | Sets up Google Cloud OAuth credentials, pastes client ID + secret | OAuth flow becomes available for tradespeople |
| 14. Custom domain | Adds domain in Vercel, updates DNS. **Wizard reminds:** "Update your Stripe webhook URL to use your new domain." | SSL auto-provisioned by Vercel |
| 15. Build your GPT | Follows step-by-step guide to create a custom GPT on OpenAI using BlitzQuote API | Provides exact GPT instructions and schema to paste |

**Phase 3 outcome:** Calendar sync, branded domain, ChatGPT presence.

## Screen Layout

Every wizard step uses the same fullscreen template:

- **Header:** Phase name, step progress bar (filled squares), step count
- **Context paragraph:** 2-3 sentences explaining what this service does in plain English
- **Instructions box:** Numbered steps with bold action verbs ("Go to...", "Click...", "Copy...")
- **Expandable screenshots:** "Show me exactly" accordion with annotated screenshots
- **Input fields:** Each with format hint text, client-side pattern validation, and eye-toggle for sensitive values
- **Test Connection button:** Prominent, runs live validation, shows green checkmarks or plain-English errors
- **Navigation:** Back and Continue buttons. No sidebar, no menu — fully linear.

No jargon without explanation:
- "API Key" → "API Key (a password that lets your website talk to this service)"
- "Webhook" → "Webhook (a URL where Stripe sends you updates when someone pays)"
- "DNS records" → "DNS records (settings you add at your domain provider so email works)"
- "Anon Key" → "Anon Key (the public one — this is NOT a password, it's safe to use)"

## Error Handling

Every validation failure has three layers:

**Layer 1 — What went wrong:** One plain-English sentence. Always visible.

**Layer 2 — What to check:** Numbered action steps. Always visible.

**Layer 3 — Common mistakes:** Pattern-matched diagnostics. Expandable.

Pattern-matched error examples:

| Error pattern | Message |
|--------------|---------|
| URL missing `.supabase.co` | "That URL doesn't look right. It should end with .supabase.co — check for extra characters or spaces." |
| Keys swapped (anon in service role field) | "It looks like you may have swapped the two keys. The anon key goes in the first field, the service role key in the second." |
| Stripe test key | "You're using a test key (starts with sk_test). That's fine for now — switch to live keys when you're ready for real payments." |
| DNS not propagated | "Your domain's DNS records haven't updated yet. This can take up to 48 hours. We'll keep checking — come back to this step later." |
| Network timeout | "We couldn't reach Supabase. This usually means the URL has a typo, or Supabase is temporarily down. Double-check and try again in a minute." |
| Supabase project paused (HTTP 503) | "Your Supabase project has been paused due to inactivity. Go to your Supabase dashboard and click 'Restore project.' This takes about 2 minutes." |
| `profiles` table not found after redeploy | "Database tables not found. Go back to Step 2 and make sure you ran the SQL in your Supabase SQL Editor." |

**No dead ends.** Every error has a "Try Again" button and self-help content. No "contact support" fallbacks — Grant is on his own.

## Phase Completion Celebrations

Each phase completion shows:
- What now works (bullet list)
- Running cost and break-even point
- What's next (with option to skip to admin dashboard)
- **Phase 1 includes a self-test:** "Open your site in a new tab, register as a test tradesperson, check your admin dashboard." This gives Grant confidence everything works before moving to payments.

## Wizard Afterlife

The wizard doesn't disappear after completion. It transforms into a "Setup Guide" in the admin nav. Each step shows current status:
- Green tick: connected and working
- Amber: needs attention (key expired, service disconnected, Supabase project paused)
- Red: broken (with fix instructions)

Grant has a permanent self-service reference for every integration.

## Database Setup

The Supabase REST API (PostgREST) does not support arbitrary DDL (CREATE TABLE, etc.). Therefore, migrations cannot be run programmatically via the service role key.

**Solution:** The wizard provides a "Copy All SQL" button that copies all migration SQL (schema + seed data + setup_status table + app_config table) as a single block. Grant pastes this into the Supabase SQL Editor and clicks "Run."

The wizard provides:
1. A "Copy All SQL" button (copies combined migrations to clipboard)
2. A screenshot showing: Supabase Dashboard → SQL Editor → New Query → Paste → Run
3. After Grant says "I've run it," the wizard validates by querying for the `profiles` table via the REST API

Grant runs one SQL paste. No CLI, no terminal, no migration commands.

## Stripe Product Bootstrapping

When Grant pastes valid Stripe keys:

1. Check if BlitzQuote products exist (search by metadata — idempotent)
2. If not: create 2 subscription products with prices via Stripe API:
   - Monthly: £5/month recurring
   - Annual: £50/year recurring
3. Store generated price IDs in the `app_config` table in Supabase
4. Grant sees: "Created your pricing plans: Monthly (£5/mo), Annual (£50/yr). Pay Per Booking (£1 each) works automatically — no Stripe product needed. You can change prices later in Stripe's dashboard."

Pay-per-booking is handled via individual Stripe invoice items (no subscription product needed).

## Wizard State Storage

Before Supabase connected (Steps 1-4): `localStorage` — tracks current step only.

After Supabase connected (Step 5+): `setup_status` table in Supabase. Transition from localStorage to database is invisible to Grant.

```sql
create table public.setup_status (
  id uuid primary key default gen_random_uuid(),
  phase integer not null,
  step integer not null,
  status text not null default 'pending',
  completed_at timestamptz,
  metadata jsonb default '{}',
  unique(phase, step)
);

alter table public.setup_status enable row level security;

-- No RLS policies needed — all setup operations use the service role key,
-- which bypasses RLS by default. The anon key cannot access these tables.

create table public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

-- No RLS policies — service role key only. This prevents any public/anon
-- access to configuration values (Stripe price IDs, admin email, etc.)
```

**Service role key usage:** All setup API routes (`/api/setup/*`) and middleware setup-status checks use the Supabase service role key, which bypasses RLS. The anon key (used by the public client) has zero access to `setup_status` and `app_config`. This is intentional — these are admin-only tables.

**Build-time variable note:** `NEXT_PUBLIC_SUPABASE_URL` is a Next.js build-time variable — it gets inlined during the build step, not read at runtime. This is why the spec requires a full Vercel **redeploy** (not just a restart) after adding env vars. The redeploy triggers a new build that inlines the updated value.

## Environment Variable Management

Grant pastes each key into Vercel's dashboard manually (Settings → Environment Variables). The wizard shows exact variable names and where to find them.

Each step that requires an env var shows:
1. The exact variable name to create in Vercel (e.g., `STRIPE_SECRET_KEY`)
2. The value to paste
3. A screenshot of the Vercel Environment Variables page
4. A reminder to redeploy after adding variables

**Note:** The existing `api/admin/env` route (which writes to `.env.local` on the filesystem) is disabled in production — Vercel's filesystem is read-only. This route is removed from the admin nav and only functions in local development.

## Admin Authentication

The `/admin/*` routes require authentication. The flow:

1. During first-run (no Supabase), `/setup` is unauthenticated — it's the only route that renders
2. After Phase 1 Step 5 (admin credentials), Grant is logged in and has an auth session
3. From that point on, `/admin/setup` requires the auth session (enforced by middleware)
4. The admin panel checks for an `is_admin` flag or a specific email match to restrict access

For the initial release, admin access is restricted to the email address Grant enters in Step 5. This is stored in `app_config` as `admin_email`.

## Technical Implementation

### New files

```
src/app/setup/                      # First-run wizard (renders when no Supabase URL)
  page.tsx                          # Wizard orchestrator
  layout.tsx                        # Fullscreen layout (no nav)
src/app/admin/setup/                # Post-first-run wizard (in admin)
  page.tsx                          # Same wizard, admin layout
src/components/setup-wizard/
  SetupWizard.tsx                   # Phase/step state machine
  SetupPhase.tsx                    # Phase header + progress
  SetupStep.tsx                     # Step container template
  SetupField.tsx                    # Input with hint, pattern, mask
  SetupValidation.tsx               # Validation result display
  SetupHelp.tsx                     # Expandable help accordion
  steps/
    SupabaseAccountStep.tsx         # Step 1 — instructional
    SupabaseSqlStep.tsx             # Step 2 — copy SQL + validate
    SupabaseKeysStep.tsx            # Step 3 — Vercel env var guide
    VercelRedeployStep.tsx          # Step 4 — manual redeploy guide
    AdminCredentialsStep.tsx        # Step 5 — email + password
    StripeAccountStep.tsx           # Step 6 — instructional
    StripeKeysStep.tsx              # Step 7 — 2 fields + product bootstrap
    StripeWebhookStep.tsx           # Step 8 — copy URL + paste secret
    ResendAccountStep.tsx           # Step 9 — instructional
    ResendDomainStep.tsx            # Step 10 — DNS records (skippable)
    ResendKeyStep.tsx               # Step 11 — 1 field + test email
    VercelRedeploy2Step.tsx         # Step 12 — second redeploy
    GoogleCalendarStep.tsx          # Step 13 — OAuth credentials
    CustomDomainStep.tsx            # Step 14 — Vercel domain setup
    BuildGptStep.tsx                # Step 15 — GPT creation guide
src/app/api/setup/
  validate/route.ts                 # POST — validate a step's inputs (keys in body)
  bootstrap-stripe/route.ts         # POST — create products/prices (key in body)
  status/route.ts                   # GET — current wizard state
  sql/route.ts                      # GET — returns combined SQL for copy button
```

### Middleware changes

Update `src/middleware.ts`:
- If `NEXT_PUBLIC_SUPABASE_URL` is empty → redirect all routes to `/setup`
- If Supabase configured → check `setup_status` for completion → redirect `/admin/*` to `/admin/setup` if incomplete
- `/admin/*` requires auth session (except during first-run)
- Setup API routes (`/api/setup/*`) return 403 if setup is already complete

### Existing code changes

- Remove `api/admin/env` route from admin nav (keep for local dev only)
- Add `app_config` table reads for Stripe price IDs (fallback to env vars)
- Add "Setup Guide" link to admin nav (post-setup)

## Deploy-to-Vercel README Section

```markdown
## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/OWNER/blitzquote&project-name=blitzquote&framework=nextjs)

Click the button above to deploy BlitzQuote to your own Vercel account.
Once deployed, open your new site — the Setup Wizard will guide you through
connecting your database, payments, and email step by step.

No coding required. The whole setup takes about an afternoon.
```

## Cost Summary

| Stage | Monthly cost | What's included |
|-------|-------------|-----------------|
| Testing (Phase 1) | £0 | Supabase free + Vercel hobby |
| Launch (Phase 2) | ~£37 | Vercel Pro (£16) + Supabase Pro (£20) + domain (£1) |
| Growth (50-500 users) | ~£37 | Same — tiers are generous |
| Scale (500+) | £37-80 | Potential usage overages |

Break-even: 8 pay-per-booking charges (£8) or 1 monthly subscriber (£5) + 3 bookings (£3).

## Success Criteria

Grant can:
1. Deploy the platform from a single button click
2. Complete Phase 1 (Go Live) in under 1 hour without external help
3. Complete Phase 2 (Start Earning) in under 2 hours without external help
4. Diagnose and fix any integration issue using only the wizard's built-in help
5. Revisit the Setup Guide months later to check or reconfigure integrations
