import type { WizardStep } from "./types";

export const WIZARD_STEPS: WizardStep[] = [
  // Phase 1: Go Live
  {
    id: 1, phase: 1,
    title: "Create Supabase Account",
    description: "Supabase is your database — it stores everything about your tradespeople, bookings, and customers. It's free to start.",
    skippable: false, requiresAuth: false,
  },
  {
    id: 2, phase: 1,
    title: "Set Up Database",
    description: "Create the tables and security rules your platform needs. You'll paste a block of code into Supabase — it takes one click.",
    skippable: false, requiresAuth: false,
  },
  {
    id: 3, phase: 1,
    title: "Add Supabase Keys to Vercel",
    description: "Tell your website where to find your database by adding three settings to Vercel.",
    skippable: false, requiresAuth: false,
    envVars: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
  },
  {
    id: 4, phase: 1,
    title: "Redeploy on Vercel",
    description: "Restart your website so it picks up the new database settings. Takes about 2 minutes.",
    skippable: false, requiresAuth: false,
  },
  {
    id: 5, phase: 1,
    title: "Create Admin Account",
    description: "Set up your login so you can manage the platform.",
    skippable: false, requiresAuth: false,
  },

  // Phase 2: Start Earning
  {
    id: 6, phase: 2,
    title: "Create Stripe Account",
    description: "Stripe handles payments — when tradespeople pay for subscriptions or bookings, the money goes to your Stripe account.",
    skippable: false, requiresAuth: true,
  },
  {
    id: 7, phase: 2,
    title: "Connect Stripe",
    description: "Add your Stripe keys so the platform can process payments. We'll also set up your pricing plans automatically.",
    skippable: false, requiresAuth: true,
    envVars: ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
  },
  {
    id: 8, phase: 2,
    title: "Set Up Stripe Webhook",
    description: "A webhook (a URL where Stripe sends you updates when someone pays) lets your platform know about new payments in real-time.",
    skippable: false, requiresAuth: true,
    envVars: ["STRIPE_WEBHOOK_SECRET"],
  },
  {
    id: 9, phase: 2,
    title: "Create Resend Account",
    description: "Resend sends emails on your behalf — booking confirmations, notifications, and updates to tradespeople and customers.",
    skippable: false, requiresAuth: true,
  },
  {
    id: 10, phase: 2,
    title: "Verify Email Domain",
    description: "DNS records (settings you add at your domain provider so email works) prove you own the domain emails are sent from.",
    skippable: true, requiresAuth: true,
  },
  {
    id: 11, phase: 2,
    title: "Connect Resend",
    description: "Add your Resend API key (a password that lets your website send emails through Resend).",
    skippable: false, requiresAuth: true,
    envVars: ["RESEND_API_KEY"],
  },
  {
    id: 12, phase: 2,
    title: "Redeploy on Vercel",
    description: "Restart your website one more time to activate payments and email.",
    skippable: false, requiresAuth: true,
  },

  // Phase 3: Scale (Optional)
  {
    id: 13, phase: 3,
    title: "Google Calendar (Optional)",
    description: "Let tradespeople sync their availability with Google Calendar. Bookings appear automatically.",
    skippable: true, requiresAuth: true,
    envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  },
  {
    id: 14, phase: 3,
    title: "Custom Domain (Optional)",
    description: "Use your own domain (like blitzquote.co.uk) instead of the default Vercel URL.",
    skippable: true, requiresAuth: true,
  },
  {
    id: 15, phase: 3,
    title: "Build Your GPT (Optional)",
    description: "Create a custom ChatGPT that uses your platform to find and book tradespeople.",
    skippable: true, requiresAuth: true,
  },
];

export const PHASES = [
  { id: 1, name: "Go Live", description: "Get your platform running", stepCount: 5 },
  { id: 2, name: "Start Earning", description: "Turn on payments and email", stepCount: 7 },
  { id: 3, name: "Scale", description: "Optional extras as you grow", stepCount: 3 },
];

export function getStepsForPhase(phase: number): WizardStep[] {
  return WIZARD_STEPS.filter((s) => s.phase === phase);
}

export function getStepById(id: number): WizardStep | undefined {
  return WIZARD_STEPS.find((s) => s.id === id);
}
