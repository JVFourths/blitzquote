# Setup Wizard & Handoff Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an in-app Setup Wizard that guides a non-technical user (Grant) through deploying and configuring BlitzQuote via 3 milestone phases — Go Live, Start Earning, Scale.

**Architecture:** A client-side wizard state machine (`SetupWizard`) drives 15 steps across 3 phases. Steps 1-4 run on `/setup` (fullscreen, no auth). Steps 5-15 run on `/admin/setup` (within admin layout, auth required). Middleware detects first-run state (`NEXT_PUBLIC_SUPABASE_URL` empty) and setup-incomplete state (`setup_status` table check). Setup API routes accept keys in request body for validation/bootstrapping before env vars are configured.

**Tech Stack:** Next.js 16 App Router, Supabase (service role key for setup operations), Stripe API (product creation), Resend (test email), shadcn/ui components, localStorage → Supabase state migration.

**Spec:** `docs/superpowers/specs/2026-03-16-setup-wizard-handoff-design.md`

---

## Chunk 1: Foundation — Migration, API Routes, Middleware, Shared Components

### Task 1: Database Migration + Combined SQL Endpoint

**Files:**
- Create: `supabase/migrations/00004_setup_wizard.sql`
- Create: `src/app/api/setup/sql/route.ts`
- Create: `src/lib/setup/combined-sql.ts`

- [ ] **Step 1: Create the migration file**

Add `setup_status` and `app_config` tables to a new migration:

```sql
-- supabase/migrations/00004_setup_wizard.sql

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

-- App configuration (Stripe price IDs, admin email, etc.)
create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;
```

- [ ] **Step 2: Create the combined SQL helper**

`src/lib/setup/combined-sql.ts` — reads all migration files and concatenates them into a single SQL string. This is the SQL Grant pastes into the Supabase SQL Editor.

```typescript
// Concatenate all migration files in order.
// This is imported by the /api/setup/sql route and the wizard's Copy SQL button.
export function getCombinedSQL(): string {
  // Inline the SQL rather than reading files at runtime (works on Vercel's read-only FS)
  return `
-- BlitzQuote Database Setup
-- Paste this entire block into Supabase SQL Editor and click "Run"
-- ================================================================

${MIGRATION_00001}

${MIGRATION_00002}

${MIGRATION_00003}

${MIGRATION_00004}
  `.trim();
}
```

Each `MIGRATION_XXXXX` constant contains the full SQL from the corresponding migration file, inlined as a template literal string.

- [ ] **Step 3: Create the SQL API endpoint**

`src/app/api/setup/sql/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getCombinedSQL } from "@/lib/setup/combined-sql";

export async function GET() {
  return NextResponse.json({ sql: getCombinedSQL() });
}
```

- [ ] **Step 4: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: `✓ Compiled successfully`

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/00004_setup_wizard.sql src/lib/setup/combined-sql.ts src/app/api/setup/sql/route.ts
git commit -m "feat: add setup wizard migration and combined SQL endpoint"
```

---

### Task 2: Setup API Routes — Validate, Bootstrap Stripe, Status

**Files:**
- Create: `src/app/api/setup/validate/route.ts`
- Create: `src/app/api/setup/bootstrap-stripe/route.ts`
- Create: `src/app/api/setup/status/route.ts`
- Create: `src/lib/setup/guard.ts`

- [ ] **Step 1: Create the setup guard helper**

`src/lib/setup/guard.ts` — shared function to check if setup is complete and block access if so:

```typescript
import { createClient } from "@supabase/supabase-js";

export function getServiceClient(url: string, key: string) {
  return createClient(url, key);
}

export async function isSetupComplete(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;

  try {
    const supabase = getServiceClient(url, key);
    const { data } = await supabase
      .from("setup_status")
      .select("status")
      .eq("phase", 2)
      .eq("status", "complete")
      .maybeSingle();
    return !!data;
  } catch {
    return false; // Table doesn't exist yet
  }
}
```

Note: Phase 2 completion = minimum viable setup (database + payments + email). Phase 3 is optional. **Intentional deviation from spec:** The spec says to check Phase 3 completion, but since Phase 3 is explicitly optional ("Scale"), we check Phase 2 instead. This prevents the admin panel from being locked behind optional integrations like Google Calendar and custom domains.

- [ ] **Step 2: Create the validate route**

`src/app/api/setup/validate/route.ts` — accepts keys in request body, validates connectivity:

```typescript
// POST /api/setup/validate
// Body: { step: "supabase" | "stripe" | "resend", keys: Record<string, string> }
//
// Validates keys without persisting them.
// Returns: { valid: boolean, message: string, details?: string[] }
```

Validation logic per step:
- `supabase`: create temp client with provided URL + anon key, query for `profiles` table
- `stripe`: create temp Stripe instance with provided secret key, call `stripe.accounts.retrieve()`
- `resend`: create temp Resend instance, send test email to provided address

Implement the 7 pattern-matched error diagnostics from the spec:
- URL missing `.supabase.co` → specific URL format hint
- Keys swapped (anon in service role field or vice versa) → detect by trying both positions
- Stripe test key → info message (not error), note about switching to live later
- DNS not propagated → "can take up to 48 hours" message
- Network timeout → "check URL for typos" message
- Supabase project paused (HTTP 503) → "go to dashboard, click Restore project" message
- `profiles` table not found → "go back to Step 2, run the SQL" message

- [ ] **Step 3: Create the bootstrap-stripe route**

`src/app/api/setup/bootstrap-stripe/route.ts`:

```typescript
// POST /api/setup/bootstrap-stripe
// Body: { stripe_secret_key: string, supabase_url: string, supabase_service_key: string }
//
// Creates Monthly + Annual products/prices in Stripe.
// Stores generated price IDs in app_config table.
// Idempotent — checks for existing products by metadata before creating.
```

- [ ] **Step 4: Create the status route**

`src/app/api/setup/status/route.ts`:

```typescript
// GET /api/setup/status
// Returns current wizard state from setup_status table.
// If Supabase not configured, returns { configured: false }.
// If table doesn't exist, returns { configured: true, setup_complete: false, steps: [] }.
```

- [ ] **Step 5: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: `✓ Compiled successfully`

- [ ] **Step 6: Commit**

```bash
git add src/app/api/setup/ src/lib/setup/
git commit -m "feat: add setup API routes (validate, bootstrap-stripe, status)"
```

---

### Task 3: Middleware Updates — First-Run Detection + Admin Auth

**Files:**
- Modify: `src/middleware.ts`
- Modify: `src/lib/supabase/middleware.ts`

- [ ] **Step 1: Update middleware.ts with first-run detection**

Add three states to `src/middleware.ts`:

1. **No Supabase URL** → redirect everything to `/setup` (except `/setup` itself and static assets)
2. **Supabase configured, setup incomplete** → public site works normally, `/admin/*` redirects to `/admin/setup`
3. **Setup complete** → everything works normally

Key changes:
- Add `/setup` and `/api/setup` to allowed routes in first-run mode
- Add `/admin` to `PROTECTED_ROUTES`
- Add setup-complete check for admin routes (query `setup_status` via service role key)
- Catch query errors gracefully (table may not exist yet)

- [ ] **Step 2: Update supabase middleware helper**

The `updateSession` helper already skips when Supabase isn't configured (fixed earlier). No changes needed — verify it still has the early return guard.

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts src/lib/supabase/middleware.ts
git commit -m "feat: add first-run detection and admin auth to middleware"
```

---

### Task 4: Shared Wizard Components

**Files:**
- Create: `src/components/setup-wizard/SetupWizard.tsx`
- Create: `src/components/setup-wizard/SetupPhase.tsx`
- Create: `src/components/setup-wizard/SetupStep.tsx`
- Create: `src/components/setup-wizard/SetupField.tsx`
- Create: `src/components/setup-wizard/SetupValidation.tsx`
- Create: `src/components/setup-wizard/SetupHelp.tsx`
- Create: `src/lib/setup/types.ts`
- Create: `src/lib/setup/steps-config.ts`

- [ ] **Step 1: Define types**

`src/lib/setup/types.ts`:

```typescript
export type StepStatus = "pending" | "in-progress" | "validated" | "skipped";

export interface WizardStep {
  id: number;
  phase: 1 | 2 | 3;
  title: string;
  description: string;
  component: string; // Component name for dynamic rendering
  skippable: boolean;
  requiresAuth: boolean;
  envVars?: string[]; // Env vars this step configures (for Vercel guide)
}

export interface WizardState {
  currentPhase: number;
  currentStep: number;
  steps: Record<number, {
    status: StepStatus;
    completedAt?: string;
  }>;
}

export interface ValidationResult {
  valid: boolean;
  message: string;
  details?: string[];
  suggestions?: string[];
}

export interface FieldConfig {
  key: string;
  label: string;
  hint: string;
  pattern?: RegExp;
  patternError?: string;
  sensitive: boolean;
  placeholder: string;
}
```

- [ ] **Step 2: Define steps configuration**

`src/lib/setup/steps-config.ts` — the master list of all 15 steps with their metadata:

```typescript
import type { WizardStep } from "./types";

export const WIZARD_STEPS: WizardStep[] = [
  // Phase 1: Go Live
  { id: 1, phase: 1, title: "Create Supabase Account", description: "...", component: "SupabaseAccountStep", skippable: false, requiresAuth: false },
  { id: 2, phase: 1, title: "Set Up Database", description: "...", component: "SupabaseSqlStep", skippable: false, requiresAuth: false },
  // ... all 15 steps
];

export const PHASES = [
  { id: 1, name: "Go Live", description: "Get your platform running" },
  { id: 2, name: "Start Earning", description: "Turn on payments and email" },
  { id: 3, name: "Scale", description: "Optional extras as you grow" },
];
```

- [ ] **Step 3: Build SetupWizard (state machine)**

`src/components/setup-wizard/SetupWizard.tsx`:
- Client component (`"use client"`)
- Manages current step/phase state
- Before Supabase: persists state in localStorage
- After Supabase: persists to `setup_status` table via `/api/setup/status`
- Renders the current step's component dynamically
- Handles next/back/skip navigation
- Shows phase completion celebrations between phases

- [ ] **Step 4: Build SetupPhase (progress header)**

`src/components/setup-wizard/SetupPhase.tsx`:
- Shows phase name, progress bar (filled squares), step count
- Uses the amber gradient aesthetic from the existing design
- Highlights current phase, dims future phases

- [ ] **Step 5: Build SetupStep (step container)**

`src/components/setup-wizard/SetupStep.tsx`:
- Wraps each step with: title, description, instructions box
- Back/Continue/Skip buttons
- Uses existing Card component from shadcn/ui
- Adds `animate-fade-up` entrance animation

- [ ] **Step 6: Build SetupField (input with hints)**

`src/components/setup-wizard/SetupField.tsx`:
- Input field with: label, format hint text, pattern validation, eye-toggle for sensitive values
- Green checkmark when valid
- Red error message when pattern fails
- Uses existing Input component from shadcn/ui

- [ ] **Step 7: Build SetupValidation (result display)**

`src/components/setup-wizard/SetupValidation.tsx`:
- Shows validation results: green checks for success, red alerts for failure
- Three-layer error display (what went wrong, what to check, common mistakes)
- "Try Again" button
- Uses existing Alert patterns

- [ ] **Step 8: Build SetupHelp (expandable help)**

`src/components/setup-wizard/SetupHelp.tsx`:
- Expandable accordion with "Show me exactly" heading
- Renders screenshot placeholders (actual screenshots added later)
- Uses existing Accordion component from shadcn/ui

- [ ] **Step 9: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: `✓ Compiled successfully`

- [ ] **Step 10: Commit**

```bash
git add src/components/setup-wizard/ src/lib/setup/types.ts src/lib/setup/steps-config.ts
git commit -m "feat: add shared setup wizard components and configuration"
```

---

## Chunk 2: Step Components, Page Routes, Admin Integration

### Task 5: Phase 1 Step Components (Steps 1-5)

**Files:**
- Create: `src/components/setup-wizard/steps/SupabaseAccountStep.tsx`
- Create: `src/components/setup-wizard/steps/SupabaseSqlStep.tsx`
- Create: `src/components/setup-wizard/steps/SupabaseKeysStep.tsx`
- Create: `src/components/setup-wizard/steps/VercelRedeployStep.tsx`
- Create: `src/components/setup-wizard/steps/AdminCredentialsStep.tsx`

- [ ] **Step 1: Build SupabaseAccountStep (instructional)**

Instructional step — no fields. Shows:
- "What is Supabase?" explanation: "Supabase is your database — it stores everything about your tradespeople, bookings, and customers. It's free to start."
- Link to supabase.com with "Create Free Account" button
- Numbered instructions: sign up → create new project → name it "blitzquote" → choose region (EU West/London) → set a database password
- **Free tier warning:** "Supabase free projects pause after 7 days of inactivity. Once you have real users, upgrade to Supabase Pro (£20/month) to prevent this. You can upgrade from your Supabase dashboard anytime."
- "I've created my project" button to proceed

- [ ] **Step 2: Build SupabaseSqlStep (copy SQL + validate)**

- "Copy All SQL" button that copies combined SQL from `/api/setup/sql` to clipboard
- Instructions: open Supabase Dashboard → SQL Editor → New Query → paste → Run
- Screenshot placeholder for SQL Editor
- "I've run the SQL" button triggers validation: calls `/api/setup/validate` with step="supabase" and Supabase URL/anon key from fields (Grant enters them temporarily here for validation — the wizard explains they'll also need to go into Vercel)
- Three fields: Supabase URL, Anon Key, Service Role Key (with format hints from spec)
- Validation checks: can we query the `profiles` table? Shows green checks or error diagnostics

- [ ] **Step 3: Build SupabaseKeysStep (Vercel env var guide)**

Instructional step with key display. Shows:
- The three values Grant already entered in Step 2 (read from state)
- Exact Vercel env var names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Screenshot placeholder for Vercel Environment Variables page
- "Copy name" buttons next to each env var name
- Instructions: go to Vercel Dashboard → your project → Settings → Environment Variables → add each one

- [ ] **Step 4: Build VercelRedeployStep (redeploy guide)**

Instructional step. Shows:
- "Now redeploy your site so it picks up the new settings"
- Instructions: Vercel Dashboard → Deployments → click "..." on latest → Redeploy
- Screenshot placeholder
- "Your site will take about 2 minutes to rebuild. When it's done, click the button below."
- "I've redeployed — take me to the next step" button
- This button navigates to `/admin/setup` (the post-first-run wizard URL)
- Warning: "After you refresh, you'll see the normal website. Go to yourdomain.com/admin/setup to continue the wizard."

- [ ] **Step 5: Build AdminCredentialsStep (email + password)**

- Two fields: admin email, admin password (with confirm)
- "Create Admin Account" button
- Calls Supabase Auth `signUp` with the provided credentials
- Stores admin email in `app_config` table
- Logs Grant in automatically
- On success: persists wizard state to `setup_status` table
- Shows Phase 1 completion celebration:
  - "Your platform is live!"
  - What works: landing page, registration, AI API
  - Self-test prompt: "Open your site in a new tab, register as a test tradesperson"
  - "Continue to Phase 2" button

- [ ] **Step 6: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: `✓ Compiled successfully`

- [ ] **Step 7: Commit**

```bash
git add src/components/setup-wizard/steps/
git commit -m "feat: add Phase 1 setup wizard steps (Supabase + Vercel + admin)"
```

---

### Task 6: Phase 2 + Phase 3 Step Components (Steps 6-15)

**Files:**
- Create: `src/components/setup-wizard/steps/StripeAccountStep.tsx`
- Create: `src/components/setup-wizard/steps/StripeKeysStep.tsx`
- Create: `src/components/setup-wizard/steps/StripeWebhookStep.tsx`
- Create: `src/components/setup-wizard/steps/ResendAccountStep.tsx`
- Create: `src/components/setup-wizard/steps/ResendDomainStep.tsx`
- Create: `src/components/setup-wizard/steps/ResendKeyStep.tsx`
- Create: `src/components/setup-wizard/steps/VercelRedeploy2Step.tsx`
- Create: `src/components/setup-wizard/steps/GoogleCalendarStep.tsx`
- Create: `src/components/setup-wizard/steps/CustomDomainStep.tsx`
- Create: `src/components/setup-wizard/steps/BuildGptStep.tsx`

- [ ] **Step 1: Build StripeAccountStep (instructional)**

- "What is Stripe?" explanation
- Link to stripe.com, "Create Account" button
- Note about identity verification taking 10-15 minutes
- "I've created my Stripe account" button

- [ ] **Step 2: Build StripeKeysStep (2 fields + product bootstrap)**

- Two fields: `STRIPE_SECRET_KEY` (sensitive, pattern: `/^sk_(test|live)_/`), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pattern: `/^pk_(test|live)_/`)
- Link to Stripe Dashboard → Developers → API Keys
- "Test & Create Plans" button: calls `/api/setup/validate` then `/api/setup/bootstrap-stripe`
- Shows result: "Created Monthly (£5/mo) and Annual (£50/yr) plans"
- Note about test vs live keys
- Env var guide: tells Grant to add both keys to Vercel

- [ ] **Step 3: Build StripeWebhookStep (copy URL + paste secret)**

- Shows dynamic webhook URL: `${window.location.origin}/api/stripe/webhook`
- "Copy URL" button
- Instructions to paste in Stripe → Webhooks → Add endpoint
- Events to listen for: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
- One field: `STRIPE_WEBHOOK_SECRET` (pattern: `/^whsec_/`)
- Warning: "If you add a custom domain later, update this URL in Stripe"
- Env var guide: add `STRIPE_WEBHOOK_SECRET` to Vercel

- [ ] **Step 4: Build ResendAccountStep (instructional)**

- "What is Resend?" explanation
- Link to resend.com
- "I've created my Resend account" button

- [ ] **Step 5: Build ResendDomainStep (DNS records — skippable)**

- Shows DNS records Grant needs to add (placeholder — actual records come from Resend)
- Registrar-specific screenshots hint (GoDaddy, Namecheap, Cloudflare tabs)
- "Check DNS" button that polls for propagation
- **"Skip for now"** button — clearly marked as OK to skip, explains emails will work once domain is verified
- Status indicator: checking / propagating / verified

- [ ] **Step 6: Build ResendKeyStep (1 field + test email)**

- One field: `RESEND_API_KEY` (pattern: `/^re_/`)
- Link to Resend → API Keys
- "Send Test Email" button: calls `/api/setup/validate` with step="resend"
- "Did you receive it? Yes / No / I skipped domain verification"
- Env var guide: add `RESEND_API_KEY` to Vercel

- [ ] **Step 7: Build VercelRedeploy2Step (second redeploy)**

- Same pattern as Step 4 but for Phase 2 env vars
- Lists all Phase 2 env vars that should now be in Vercel
- "Redeploy" instructions
- Phase 2 completion celebration:
  - "You're in business!"
  - What works: subscriptions, booking emails, pay-per-booking
  - Cost breakdown: "~£37/month, covered by 1 subscriber + 12 bookings"
  - "Continue to Phase 3" or "Go to Admin Dashboard" buttons

- [ ] **Step 8: Build GoogleCalendarStep (OAuth credentials)**

- Detailed instructions for Google Cloud Console setup
- Two fields: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Link to Google Cloud Console → APIs → Credentials
- Instructions to enable Calendar API
- Env var guide: add both to Vercel
- Skippable — clearly marked optional

- [ ] **Step 9: Build CustomDomainStep (Vercel domain)**

- Instructions for adding domain in Vercel
- DNS nameserver instructions
- Reminder: "Update your Stripe webhook URL to use your new domain"
- Skippable

- [ ] **Step 10: Build BuildGptStep (GPT creation guide)**

- Step-by-step guide for creating a custom GPT on OpenAI
- "Copy GPT Instructions" button with pre-written prompt
- "Copy API Schema" button with the OpenAPI spec URL
- Link to ChatGPT GPT Builder
- Skippable
- Phase 3 completion: "BlitzQuote is fully configured!"

- [ ] **Step 11: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: `✓ Compiled successfully`

- [ ] **Step 12: Commit**

```bash
git add src/components/setup-wizard/steps/
git commit -m "feat: add Phase 2 + Phase 3 setup wizard steps"
```

---

### Task 7: Page Routes, Admin Integration, README

**Files:**
- Create: `src/app/setup/page.tsx`
- Create: `src/app/setup/layout.tsx`
- Create: `src/app/admin/setup/page.tsx`
- Modify: `src/components/admin/nav.tsx`
- Modify: `src/lib/stripe/client.ts`
- Modify: `README.md` (create if needed)

- [ ] **Step 1: Create first-run setup page**

`src/app/setup/layout.tsx` — fullscreen layout, no nav, no sidebar. Just the wizard centered on screen with the BlitzQuote logo.

`src/app/setup/page.tsx` — client component, renders `<SetupWizard />` with `mode="first-run"`. Only shows Phase 1 steps 1-4 (pre-Supabase steps).

- [ ] **Step 2: Create admin setup page**

`src/app/admin/setup/page.tsx` — client component, renders `<SetupWizard />` with `mode="admin"`. Shows all steps, starting from step 5 if Phase 1 steps 1-4 are done.

- [ ] **Step 3: Update admin nav**

Modify `src/components/admin/nav.tsx`:

1. **Remove** the `{ href: "/admin/api-keys", label: "API Keys", icon: Key }` nav item. The API Keys page wrote to `.env.local` which doesn't work on Vercel (read-only filesystem). The Setup Guide replaces it.

2. **Add** "Setup Guide" to the nav items array:

```typescript
{ href: "/admin/setup", label: "Setup Guide", icon: Compass },
```

Position it last in the nav items array. Use `Compass` icon from lucide-react.

- [ ] **Step 4: Update Stripe client for app_config fallback**

Modify `src/lib/stripe/client.ts` to read price IDs from `app_config` table when env vars aren't set:

```typescript
export async function getStripePrices() {
  // Try env vars first (backwards compatible)
  if (process.env.STRIPE_PRICE_MONTHLY && process.env.STRIPE_PRICE_ANNUAL) {
    return {
      monthly: process.env.STRIPE_PRICE_MONTHLY,
      annual: process.env.STRIPE_PRICE_ANNUAL,
    };
  }

  // Fallback: read from app_config table
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from("app_config")
    .select("key, value")
    .in("key", ["STRIPE_PRICE_MONTHLY", "STRIPE_PRICE_ANNUAL"]);

  const config = Object.fromEntries((data || []).map(r => [r.key, r.value]));
  return {
    monthly: config.STRIPE_PRICE_MONTHLY || null,
    annual: config.STRIPE_PRICE_ANNUAL || null,
  };
}
```

Update `src/app/api/stripe/checkout/route.ts` to use `getStripePrices()` instead of `STRIPE_PRICES[plan]`.

- [ ] **Step 5: Create README with Deploy button**

Create or update `README.md` at project root:

```markdown
# BlitzQuote

Quotes at the speed of AI. Connect UK tradespeople with homeowners via AI agent discovery.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/OWNER/blitzquote&project-name=blitzquote&framework=nextjs)

Click the button above to deploy BlitzQuote to your own Vercel account.
Once deployed, open your new site — the Setup Wizard will guide you through
connecting your database, payments, and email step by step.

No coding required. The whole setup takes about an afternoon.

## Local Development

\`\`\`bash
npm install
npm run dev    # http://localhost:3007
\`\`\`

## Tech Stack

- Next.js 16 (App Router)
- Supabase (Postgres + Auth)
- Stripe (Subscriptions + Metered Billing)
- Resend (Transactional Email)
- Tailwind CSS + shadcn/ui
```

(Replace `OWNER` with the actual GitHub username before handoff.)

- [ ] **Step 6: Final build verification**

Run: `npx next build 2>&1 | tail -10`
Expected: `✓ Compiled successfully` with all new routes registered:
- `/setup`
- `/admin/setup`
- `/api/setup/sql`
- `/api/setup/validate`
- `/api/setup/bootstrap-stripe`
- `/api/setup/status`

- [ ] **Step 7: Commit**

```bash
git add src/app/setup/ src/app/admin/setup/ src/components/admin/nav.tsx src/lib/stripe/client.ts README.md
git commit -m "feat: add setup wizard pages, admin integration, and deploy README"
```

---

## Implementation Notes

### What this plan does NOT include (by design):
- **Actual screenshots** — these are placeholders. Screenshots should be captured from real Supabase/Stripe/Vercel dashboards after the wizard is built and working.
- **Video walkthroughs** — these are referenced in the spec as an enhancement. Record after the wizard is functional.
- **Phase 3 step validation** — Google Calendar, custom domain, and GPT steps are instructional-only. Validation for these is deferred.

### Testing approach:
- Manual testing for wizard flow (client-heavy, state-machine driven)
- The setup API routes can be tested with curl once Supabase is connected
- Build verification (`npx next build`) after every task ensures no type errors

### Key patterns to follow:
- All setup API routes accept keys in request body (not from env vars)
- All setup API routes check `isSetupComplete()` and return 403 if true
- All step components use the shared `SetupStep` wrapper for consistent layout
- All input fields use `SetupField` for consistent validation UX
- Wizard state: localStorage before Step 5, Supabase after Step 5
- **No-jargon labels:** every technical term gets an inline plain-English gloss on first use. Follow the spec's glossary: "API Key (a password that lets your website talk to this service)", "Webhook (a URL where Stripe sends you updates when someone pays)", "DNS records (settings you add at your domain provider so email works)", "Anon Key (the public one — this is NOT a password, it's safe to use)"
- **Phase celebrations:** each phase completion includes a cost summary and what-works-now list per the spec (Phase 1: £0, Phase 2: ~£37/mo with break-even calc, Phase 3: "fully configured")
- **Investor plan backward compatibility:** keep `investor: null` in `STRIPE_PRICES` constant. The `getStripePrices()` function only returns monthly/annual — investor tier is handled manually as before

### Follow-up tasks (not in this plan):
- **Wizard Afterlife health indicators:** green/amber/red status per integration in the Setup Guide post-completion view. Defer to a separate task.
- **Screenshots and video walkthroughs:** capture from real dashboards after the wizard is functional
- **Phase 3 step validation:** Google Calendar, custom domain, GPT steps are instructional-only for now
