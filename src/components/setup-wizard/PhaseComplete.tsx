"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, ExternalLink } from "lucide-react";

interface PhaseCompleteProps {
  phase: number;
  onContinue: () => void;
}

const PHASE_CONTENT = {
  1: {
    title: "Your platform is live!",
    items: [
      "Landing page is public — anyone can visit",
      "Tradespeople can register and create profiles",
      "AI Discovery API is active",
      "20 trade categories seeded and ready",
    ],
    cost: "Current cost: £0 (free tier)",
    costNote: "Supabase free projects pause after 7 days of inactivity. Upgrade to Supabase Pro (£20/month) before you have real users.",
    selfTest: "Try it now: open your site in a new tab, register as a test tradesperson, then check the admin dashboard.",
    nextLabel: "Continue to Phase 2: Start Earning",
  },
  2: {
    title: "You're in business!",
    items: [
      "Tradespeople can sign up and pay for subscriptions",
      "Booking emails are sent to customers automatically",
      "Pay-per-booking charges (£1 each) are tracked",
      "Monthly (£5) and Annual (£50) plans are live",
    ],
    cost: "Running cost: ~£37/month (Vercel Pro £16 + Supabase Pro £20 + domain £1)",
    costNote: "Break-even: 1 monthly subscriber (£5) plus 12 bookings (£12) covers your costs.",
    selfTest: null,
    nextLabel: "Continue to Phase 3: Scale (Optional)",
  },
  3: {
    title: "BlitzQuote is fully configured!",
    items: [
      "Calendar sync available for tradespeople",
      "Custom domain configured",
      "Your own GPT on ChatGPT can find and book tradespeople",
    ],
    cost: null,
    costNote: null,
    selfTest: null,
    nextLabel: "Go to Admin Dashboard",
  },
};

export function PhaseComplete({ phase, onContinue }: PhaseCompleteProps) {
  const content = PHASE_CONTENT[phase as keyof typeof PHASE_CONTENT];
  if (!content) return null;

  return (
    <div className="animate-fade-up text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 glow-amber-strong">
        <CheckCircle2 className="h-10 w-10 text-green-400" />
      </div>

      <h2 className="font-display text-3xl font-bold">{content.title}</h2>

      <ul className="mt-6 space-y-2 text-left">
        {content.items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
            <span className="text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>

      {content.cost && (
        <div className="mt-6 rounded-xl border border-border/40 bg-card/30 p-4 text-left">
          <p className="text-sm font-medium">{content.cost}</p>
          {content.costNote && (
            <p className="mt-1 text-xs text-muted-foreground">{content.costNote}</p>
          )}
        </div>
      )}

      {content.selfTest && (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-left">
          <p className="text-sm text-primary">{content.selfTest}</p>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          onClick={onContinue}
          className="gap-1 bg-primary font-display font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {content.nextLabel} <ArrowRight className="h-4 w-4" />
        </Button>
        {phase < 3 && (
          <a href="/admin">
            <Button variant="outline" className="w-full gap-1 sm:w-auto">
              <ExternalLink className="h-4 w-4" /> Go to Admin Dashboard
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
