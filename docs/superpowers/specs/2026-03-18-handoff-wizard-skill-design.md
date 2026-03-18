# Handoff Wizard Skill — Design Spec

**Date:** 2026-03-18
**Status:** Draft
**Author:** Johan Visser + Claude

## Overview

A Claude Code skill that analyses any Next.js App Router project, detects its service dependencies, and generates a complete setup wizard for non-technical users to deploy and configure the application without touching a terminal.

The pattern is proven — BlitzQuote's setup wizard successfully enabled a non-technical platform owner (Grant Sidwell) to deploy and configure a full SaaS application (Supabase + Stripe + Resend + Google Calendar) through a browser-only guided experience.

## Problem

Every time Johan builds a project for a non-technical stakeholder, the handoff requires:
- A custom setup wizard tailored to that project's services
- Validation logic for each service's API keys
- Middleware for first-run detection
- Plain-English error handling with pattern-matched diagnostics
- Progressive phased onboarding

This is 2,000-3,000 lines of repetitive but project-specific code. The pattern is consistent; the details change per project.

## Solution

A skill (`handoff-wizard`) installed at `~/.claude/skills/handoff-wizard/` that:

1. Scans the project to build a service dependency map
2. Presents the map for confirmation
3. Generates a complete, tailored setup wizard

## Constraints

- **Framework:** Next.js App Router only (v13+ with `app/` directory)
- **Target user:** Non-technical (no terminal, no CLI, no code editing)
- **Deployment:** Vercel (Deploy button, env vars via dashboard, redeploy workflow)
- **Database:** Supabase assumed when detected (SQL copy-paste via SQL Editor)
- **Generated code:** Must follow the project's existing conventions (styling, file naming, component structure)

## Service Detection Engine

### Detection Sources (ordered by confidence)

| Priority | Source | What It Reveals |
|----------|--------|-----------------|
| 1 | `.env.example` / `.env.local.example` | Required env var names and groupings |
| 2 | `package.json` dependencies | Which service SDKs are installed |
| 3 | `process.env.*` / `import.meta.env.*` references | Env vars actually used in code |
| 4 | Config files (`supabase/`, `vercel.json`, etc.) | Service-specific configuration |
| 5 | Migration files (`supabase/migrations/*.sql`) | Database schema presence |

### Known Service Templates

Each detected service maps to a wizard recipe with: account creation steps, key input fields, validation logic, and bootstrap actions.

| Service | Detection Signals | Wizard Steps |
|---------|-------------------|--------------|
| **Supabase** | `@supabase/supabase-js`, `SUPABASE_URL` | Create account, run combined SQL, add 3 keys (URL, anon, service role), redeploy |
| **Stripe** | `stripe` package, `STRIPE_SECRET_KEY` | Create account, add keys, bootstrap products (create via API), add webhook secret |
| **Resend** | `resend` package, `RESEND_API_KEY` | Create account, add DNS records (skippable), add API key, send test email |
| **Google Calendar** | `googleapis` + calendar scope references | Create OAuth credentials, add client ID + secret |
| **Google OAuth** | `@google-cloud/*`, OAuth env vars | Create project, configure consent screen, add credentials |
| **OpenAI** | `openai` package, `OPENAI_API_KEY` | Create account, add API key |
| **Vercel Blob** | `@vercel/blob`, `BLOB_READ_WRITE_TOKEN` | Enable in Vercel dashboard, add token |
| **Cloudflare** | `wrangler`, `CF_API_TOKEN` | Create account, add API token |
| **Unknown env var** | Any `process.env.X` not matched above | Generic step: "Add [VAR_NAME] to Vercel environment variables" with the var name as label |

The fallback ensures no env var is silently skipped. Unknown vars get a generic "paste this key" step.

### Detection Script

`scripts/detect-services.js` — a deterministic Node.js script that:

1. Reads `.env.example` (if exists) and extracts var names
2. Reads `package.json` and matches dependencies against known service patterns
3. Greps `src/` for `process.env.*` references
4. Checks for config directories (`supabase/`, `firebase/`, etc.)
5. Outputs structured JSON:

```json
{
  "framework": "nextjs-app-router",
  "services": [
    {
      "id": "supabase",
      "name": "Supabase",
      "detected_via": ["package.json", ".env.example", "supabase/migrations/"],
      "env_vars": [
        { "name": "NEXT_PUBLIC_SUPABASE_URL", "required": true, "public": true },
        { "name": "NEXT_PUBLIC_SUPABASE_ANON_KEY", "required": true, "public": true },
        { "name": "SUPABASE_SERVICE_ROLE_KEY", "required": true, "public": false }
      ],
      "has_migrations": true,
      "migration_files": ["00001_init.sql", "00002_categories.sql"]
    },
    {
      "id": "stripe",
      "name": "Stripe",
      "detected_via": ["package.json", ".env.example"],
      "env_vars": [
        { "name": "STRIPE_SECRET_KEY", "required": true, "public": false },
        { "name": "STRIPE_WEBHOOK_SECRET", "required": true, "public": false },
        { "name": "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "required": true, "public": true }
      ],
      "has_migrations": false,
      "bootstrap_actions": ["create_products"]
    }
  ],
  "unknown_vars": [
    { "name": "CUSTOM_API_TOKEN", "found_in": ["src/lib/api.ts:14"] }
  ],
  "project_structure": {
    "components_dir": "src/components",
    "lib_dir": "src/lib",
    "app_dir": "src/app",
    "admin_path": "admin",
    "uses_tailwind": true,
    "uses_shadcn": true,
    "styling_approach": "tailwind"
  }
}
```

Claude reads this JSON, presents it for confirmation, adjusts if needed, then generates code.

### Detection Script Requirements

- **Runtime:** Node.js 18+ (uses `fs/promises`, `path`, `JSON.parse` — stdlib only)
- **Dependencies:** Zero — no npm install required. Pure Node.js stdlib.
- **Execution:** Claude runs it via `node ~/.claude/skills/handoff-wizard/scripts/detect-services.js [project-root]`
- **Error handling:** on failure, outputs `{ "error": "description", "partial": {...} }` — partial results are still usable
- **Scope:** Developer tooling only. This script is NOT shipped with the generated project. It lives in the skill directory and runs on the developer's machine during generation.

### Service Deduplication

Some services share env vars or are subsets of each other:

- **Google Calendar** subsumes **Google OAuth** — if Calendar is detected, OAuth steps are folded into the Calendar wizard steps (one "Create Google OAuth credentials" step serves both)
- **Supabase Auth** is part of **Supabase** — not a separate service. Auth setup (admin account creation) is a step within the Supabase phase.

The detection script outputs deduplicated services. If both Calendar and OAuth are detected, only Calendar appears in the service list with a note that it includes OAuth setup.

### Phase Assignment Rules

Services are assigned to phases by category, not by detection order:

| Category | Phase | Examples |
|----------|-------|---------|
| Database + infrastructure | 1 (Go Live) | Supabase, PlanetScale, hosting config |
| Authentication | 1 (Go Live) | Admin account, OAuth providers |
| Payments | 2 (Start Earning) | Stripe, PayPal, Paystack |
| Email / notifications | 2 (Start Earning) | Resend, SendGrid, Twilio |
| Webhooks | 2 (Start Earning) | Stripe webhooks, service callbacks |
| Storage | 3 (Scale) | Vercel Blob, Cloudflare R2, S3 |
| Calendar / scheduling | 3 (Scale) | Google Calendar |
| AI / ML | 3 (Scale) | OpenAI, Anthropic |
| Custom domain | 3 (Scale) | Always Phase 3 |
| Unknown services | 3 (Scale) | Default for unrecognised env vars |

During the confirmation step (Invocation Flow step 4), the developer can override any service's phase assignment.

## Wizard Architecture

### Phase System

Every wizard has three phases. Services are auto-sorted by type:

| Phase | Name | Purpose | Service Types |
|-------|------|---------|---------------|
| 1 | **Go Live** | Public site functional | Database, auth, hosting config, admin account |
| 2 | **Start Earning** | Revenue + communications | Payments, email, webhooks, notifications |
| 3 | **Scale** | Optional integrations | Calendar, storage, AI/ML, custom domain, third-party APIs |

Phase 2 completion = setup complete. Phase 3 is always optional.

### Step Types

Each wizard step is one of two types:

| Type | UX | Example |
|------|-----|---------|
| **Instructional** | Link + numbered instructions + "I've done this" button | "Create a Stripe account" |
| **Validation** | Input fields + API call + 3-layer error display | "Paste your Stripe keys" |

### First-Run Detection (Middleware)

The generated middleware modifies the project's existing `middleware.ts` (or creates one):

```
Request arrives
  → Is core env var set? (e.g., NEXT_PUBLIC_SUPABASE_URL)
    → NO: redirect all routes to /setup (except /setup and /api/setup)
    → YES: Is setup complete? (query setup_status table)
      → NO: redirect /admin/* to /admin/setup
      → YES: pass through normally
```

The "core env var" is the first required env var from the highest-priority detected service (typically Supabase URL).

### Middleware Integration Strategy

Modifying an existing `middleware.ts` is high-risk — projects may already have auth, i18n, or session middleware. The skill uses an **insertion strategy**, not a replacement:

1. **Detect existing middleware** — read `middleware.ts` (or `src/middleware.ts`) and identify the pattern:
   - Supabase `updateSession` wrapper → insert first-run guard before the `updateSession` call
   - Clerk `clerkMiddleware` wrapper → wrap the Clerk export with a first-run check
   - `next-intl` `createMiddleware` → insert guard before locale routing
   - No existing middleware → generate a new one from scratch
2. **Insert, don't replace** — the first-run guard is a short block at the top of the middleware function. If the core env var is missing, redirect to `/setup` and return early (skip all other middleware). If it is set, fall through to the existing middleware logic unchanged.
3. **Merge `config.matcher`** — add `/setup` and `/api/setup/:path*` to the existing matcher's exclusion list. If no matcher exists, generate one that excludes `_next/static`, `_next/image`, `favicon.ico`, and the setup routes.
4. **Preserve imports** — never remove existing imports. Add only what the guard needs (typically `NextResponse` if not already imported).

The guard block is clearly commented (`// --- Handoff Wizard: First-run detection ---`) so it can be identified and removed later.

### Wizard Modes

The same `SetupWizard` component operates in two modes:

| Mode | Route | Auth Required | Database Available | Steps Shown |
|------|-------|---------------|-------------------|-------------|
| `first-run` | `/setup` | No | No | Only pre-config steps (account creation, SQL, env var guidance) |
| `admin` | `/[admin_path]/setup` | Yes | Yes | All steps, starting from first incomplete |

**Transition:** After the user adds env vars and redeploys, middleware detects the core env var is now set → stops redirecting to `/setup` → redirects `/admin/*` to `/admin/setup` instead. The user refreshes and lands in admin mode. The wizard reads completion state from `setup_status` table and resumes at the correct step.

**Post-completion:** The wizard remains accessible from the admin nav as "Setup Guide". The user can revisit any step to check integration status or reconfigure. All validation endpoints still work but bootstrap endpoints return 403 if already completed.

### Security Model

The setup API routes (`/api/setup/*`) handle sensitive data (API keys in request bodies). Security measures:

1. **Completion guard** — after Phase 2 is marked complete, all `/api/setup/*` routes except `/status` return 403. This is checked via `isSetupComplete()` query on every request.
2. **Pre-database phase** — before Supabase is configured, the completion guard cannot query the database. During this window:
   - The `/api/setup/validate` endpoint only accepts Supabase keys (the only service configurable before the database exists)
   - The `/api/setup/bootstrap` and `/api/setup/sql` endpoints are not called until after database setup
   - Keys are validated and returned to the client — they are **never stored server-side** (the user pastes them into Vercel's dashboard)
3. **Rate limiting** — all setup endpoints enforce a basic rate limit (e.g., 10 requests per minute per IP) to prevent abuse during the open pre-database window
4. **CORS** — setup endpoints only accept requests from the same origin (no cross-origin API calls)
5. **No key storage** — the validation API tests keys and returns pass/fail. It never persists keys to the database or filesystem. Keys only exist in the request body during validation.
6. **Post-setup cleanup** — the generated README includes a note recommending removal of `/api/setup/*` routes before production if the stakeholder wants to lock down the deployment. This is optional since the completion guard already blocks access.

### Validation API Pattern

`POST /api/setup/validate` accepts:

```json
{
  "service": "supabase" | "stripe" | "resend" | ...,
  "keys": { "SUPABASE_URL": "https://...", "SUPABASE_ANON_KEY": "eyJ..." }
}
```

Keys are passed **in the request body**, not read from env vars. This solves the chicken-and-egg problem: the wizard needs to validate keys before the user adds them to Vercel.

Each service has validation logic:
- **Supabase:** Test connectivity, check URL format, detect swapped keys, verify tables exist
- **Stripe:** Test account access, detect test vs. live keys, verify key type matches
- **Resend:** Validate key format, send test email to admin address
- **Generic:** Check that the value is non-empty and matches expected format (if known)

### Validation Response (3-Layer Error Pattern)

Every validation returns:

```json
{
  "valid": false,
  "message": "That URL doesn't look right. It should end with .supabase.co",
  "steps": [
    "Copy from Supabase Settings > API",
    "Make sure there are no extra spaces"
  ],
  "suggestions": [
    "If you swapped the Anon Key and Service Role Key, try swapping them back"
  ]
}
```

- **Layer 1 (`message`):** Plain English, one sentence, always visible
- **Layer 2 (`steps`):** Numbered fix instructions
- **Layer 3 (`suggestions`):** Pattern-matched diagnostics, expandable

All error text is non-technical. No status codes, no stack traces, no jargon.

### State Persistence

| Phase | Storage | Reason |
|-------|---------|--------|
| Pre-config (Steps 1-4 typically) | `localStorage` only | Database not yet available |
| Post-config (remaining steps) | `localStorage` + `setup_status` table | Survives redeploys |

The `setup_status` table and `app_config` table are included in the generated combined SQL:

```sql
CREATE TABLE IF NOT EXISTS setup_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phase INTEGER NOT NULL,
  step INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  UNIQUE(phase, step)
);

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Status Values

The `setup_status.status` column uses these canonical values:

| Value | Meaning | Set When |
|-------|---------|----------|
| `pending` | Step not started | Default on table creation |
| `complete` | Step finished and validated | Step validation passes or instructional step acknowledged |
| `skipped` | Step explicitly skipped by user | User clicks "Skip" on optional steps |

Client-side, the wizard component tracks additional UI states (`in-progress`, `validated`) that are not persisted to the database — they reset on page reload. Only `pending`, `complete`, and `skipped` are written to `setup_status`.

Phase completion is derived, not stored separately: a phase is complete when all required (non-skippable) steps in that phase have `status = 'complete'`.

### `app_config` Usage

The `app_config` table stores runtime configuration generated during setup:

| Key | Set By | Used For |
|-----|--------|----------|
| `admin_email` | Admin account step | Booking notification recipient, test email target |
| `STRIPE_PRICE_MONTHLY` | Stripe bootstrap | Subscription price ID (fallback when env var not set) |
| `STRIPE_PRICE_ANNUAL` | Stripe bootstrap | Subscription price ID (fallback when env var not set) |
| `setup_completed_at` | Phase 2 completion | Timestamp for audit/display |

This table exists because some config values are generated during setup (e.g., Stripe creates price IDs dynamically) and cannot be known ahead of time as env vars.

### Recovery and Rollback

Non-technical users will get stuck. The wizard must handle partial completion gracefully:

1. **Step-level retry** — every validation step has a "Try Again" button that re-runs validation. No dead ends. If a step fails, the user stays on that step until it passes or they go back.
2. **Phase-level reset** — the admin wizard includes a "Restart Phase" option (behind a confirmation dialog) that sets all steps in that phase back to `pending`. This allows a complete do-over without affecting other phases.
3. **Bootstrap idempotency** — Stripe product creation checks for existing products by metadata before creating. If products exist with wrong config, the bootstrap endpoint updates them rather than creating duplicates.
4. **SQL re-run safety** — all generated SQL uses `IF NOT EXISTS` for tables, indexes, and types. `INSERT` seed data uses `ON CONFLICT DO NOTHING`. The user can safely paste and run the SQL multiple times.
5. **Stuck state guidance** — if a user has been on the same step for more than 3 validation attempts, the wizard shows an expanded help panel with: (a) a "start fresh" option for that step, (b) a link to email the developer (Johan) for help, (c) the exact error for the developer to diagnose remotely.

### Bootstrap Actions

Some services need resources created during setup (not just key validation):

| Service | Bootstrap Action | API Route |
|---------|-----------------|-----------|
| Stripe | Create subscription products + prices | `POST /api/setup/bootstrap` |
| Supabase | Run combined SQL (manual, via SQL Editor) | `GET /api/setup/sql` |

Bootstrap is idempotent — running it twice checks for existing resources before creating.

### Combined SQL Generation

If Supabase is detected, the skill:

1. Reads all files in `supabase/migrations/` in alphabetical order
2. Concatenates them into a single SQL block
3. Adds the `setup_status` and `app_config` tables
4. **Analyses each statement for idempotency** — Claude reviews the SQL during generation and:
   - Adds `IF NOT EXISTS` to `CREATE TABLE`, `CREATE INDEX`, `CREATE TYPE` statements that lack it
   - Wraps `ALTER TABLE` in `DO $$ BEGIN ... EXCEPTION WHEN duplicate_column THEN NULL; END $$` guards
   - Converts `INSERT` seed data to use `ON CONFLICT DO NOTHING` or `ON CONFLICT DO UPDATE`
   - Wraps `CREATE POLICY` in existence checks
   - Flags any statements it cannot make idempotent and asks the developer to review
5. Stores as an inline constant (Vercel's read-only filesystem can't read files at runtime)
6. Serves via `GET /api/setup/sql`

**Migration compatibility requirement:** the skill warns the developer if any migration contains statements that cannot be safely made idempotent (e.g., destructive `DROP` statements, complex `ALTER` sequences). These must be reviewed manually before the wizard is shipped.

### Phase Celebration Screens

After the last step of each phase, the wizard shows:
- Checkmarks: what now works
- Cost breakdown: monthly running cost at this phase
- Break-even: how much revenue to cover costs (if Phase 2)
- Self-test: suggested manual test to verify it works
- "Continue to Phase N" or "Go to dashboard" buttons

Cost data must be provided by the developer (Johan) during generation — the skill prompts for it as an explicit step (see Invocation Flow step 5).

### Redeploy Verification

Redeploy steps are the riskiest point in the wizard — the user might click "I've done this" without actually redeploying. The wizard mitigates this:

1. **Health probe** — after the user clicks "I've done this" on a redeploy step, the wizard calls `GET /api/setup/status` with a cache-busting query param. If the response fails (app not yet redeployed) or returns that expected env vars are missing, the wizard shows: "It looks like the redeploy hasn't finished yet. Give it another minute and try again."
2. **Env var presence check** — the `/api/setup/status` endpoint returns which core env vars are set at runtime (`{ configured: ["NEXT_PUBLIC_SUPABASE_URL", ...], missing: ["STRIPE_SECRET_KEY", ...] }`). The wizard uses this to confirm the redeploy actually picked up the new vars.
3. **Graceful wait** — if the probe fails, the wizard shows a spinner with "Waiting for your site to come back online..." and retries every 10 seconds for up to 3 minutes before showing manual instructions.

## Generated File Structure

The skill respects the project's existing conventions. Given detection output:

```
[project root]
├── [app_dir]/setup/
│   ├── page.tsx                  # First-run wizard
│   └── layout.tsx                # Fullscreen layout, no nav
├── [app_dir]/[admin_path]/setup/
│   └── page.tsx                  # Admin wizard (post-config)
├── [app_dir]/api/setup/
│   ├── validate/route.ts         # Service key validation
│   ├── bootstrap/route.ts        # Resource creation (Stripe products, etc.)
│   ├── sql/route.ts              # Combined SQL endpoint (if Supabase)
│   └── status/route.ts           # Wizard state query
├── [components_dir]/setup-wizard/
│   ├── SetupWizard.tsx           # State machine orchestrator
│   ├── SetupPhase.tsx            # Phase progress bar
│   ├── SetupStep.tsx             # Step container template
│   ├── SetupField.tsx            # Input with validation + visibility toggle
│   ├── SetupValidation.tsx       # 3-layer error display
│   ├── PhaseComplete.tsx         # Celebration with costs
│   └── steps/                    # One component per detected step
│       ├── [ServiceName]AccountStep.tsx    # Instructional
│       ├── [ServiceName]KeysStep.tsx       # Validation
│       └── ...
├── [lib_dir]/setup/
│   ├── types.ts                  # WizardStep, StepStatus, ValidationResult
│   ├── steps-config.ts           # Generated step definitions from service map
│   ├── guard.ts                  # isSetupComplete(), markStepComplete()
│   └── combined-sql.ts           # Concatenated migrations (if Supabase)
├── middleware.ts                  # Modified — first-run redirect added
└── README.md                     # Modified — Deploy button + handoff section added
```

## Skill File Structure

```
~/.claude/skills/handoff-wizard/
├── SKILL.md                      # Trigger + orchestration instructions
├── references/
│   ├── service-templates.md      # Detection rules + wizard recipes per service
│   ├── component-patterns.md     # Reusable component code (adapted to project style)
│   └── validation-patterns.md    # API validation logic per service type
└── scripts/
    └── detect-services.js        # Project scanner → service map JSON
```

## Skill Invocation Flow

```
1.  User invokes: /handoff-wizard (or skill triggers on context match)
2.  Skill runs detect-services.js → outputs service map JSON
3.  Claude presents service map: "I detected [services]. Here's the wizard I'd generate: [step list by phase]. Confirm?"
4.  User confirms or adjusts (can move services between phases, remove services, add manual ones)
5.  Claude prompts for cost + celebration data per phase:
    - Phase 1: monthly cost, what works after completion, self-test instructions
    - Phase 2: monthly cost, break-even calculation, what works after completion
    - Phase 3: (optional, no cost data needed)
6.  Claude generates all files, following project conventions
7.  Claude modifies middleware.ts using insertion strategy (see Middleware Integration Strategy)
8.  Claude updates README.md with Deploy button and handoff instructions
9.  Claude runs build to verify no errors
10. Claude presents summary: files created, steps generated, next actions for developer
11. Done — project is ready for handoff
```

## Trigger Description

```
Generate a complete setup wizard for handing off a Next.js App Router project to a non-technical
user. Scans the codebase for service dependencies (Supabase, Stripe, Resend, etc.), then generates
phased wizard UI, key validation APIs, first-run middleware, and deploy instructions.

Invoke via /handoff-wizard or when the user says "generate setup wizard", "prepare handoff",
"deploy wizard for [person]", or "make this deployable by a non-technical user" — but only
when the current directory is a Next.js App Router project (has app/ directory and next.config.*).
```

## Out of Scope (v1)

- Non-Next.js frameworks (Vite, Python, etc.)
- Non-Vercel deployment targets (Netlify, Railway, etc.)
- Non-Supabase databases (Firebase, PlanetScale, etc.)
- Automated screenshot generation for instructional steps
- Internationalisation of wizard text
- Wizard theme customisation (uses project's existing design)

## Success Criteria

- Skill generates a working wizard from a cold scan of any Next.js + Supabase project
- Generated wizard builds without errors
- A non-technical user can deploy the project and complete setup with zero terminal usage
- Every detected env var has a corresponding wizard step
- All validation APIs correctly test service connectivity
- Wizard state persists across redeploys
