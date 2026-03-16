"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle, Zap } from "lucide-react";

const TRADE_OPTIONS = [
  "Plumber", "Electrician", "Gas Engineer", "Carpenter", "Roofer",
  "Plasterer", "Painter & Decorator", "Locksmith", "Landscaper",
  "Builder", "Tiler", "Handyman", "Kitchen Fitter", "Bathroom Fitter", "Other",
];

const PLAN_OPTIONS = [
  { value: "pay_per_booking", label: "Pay Per Booking (£1/booking)" },
  { value: "monthly", label: "Monthly (£5/mo)" },
  { value: "annual", label: "Annual (£50/yr)" },
  { value: "investor", label: "Investor (£1,500)" },
];

type FormState = "idle" | "submitting" | "success" | "error";

export function WaitlistForm() {
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState("submitting");
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      trade: formData.get("trade") as string,
      preferred_plan: formData.get("preferred_plan") as string,
    };

    try {
      const res = await fetch("/api/v1/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormState("error");
        setErrorMessage(data.error || "Something went wrong.");
        return;
      }

      setFormState("success");
    } catch {
      setFormState("error");
      setErrorMessage("Network error. Please try again.");
    }
  }

  if (formState === "success") {
    return (
      <section id="waitlist" className="px-5 py-28 sm:px-8">
        <div className="mx-auto max-w-lg text-center">
          <div className="animate-fade-up">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 glow-amber-strong">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h2 className="font-display text-3xl font-bold">You&apos;re on the list!</h2>
            <p className="mt-3 text-lg text-muted-foreground">
              We&apos;ll notify you the moment BlitzQuote launches. Get ready for
              AI-powered bookings.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="waitlist" className="relative px-5 py-28 sm:px-8">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid opacity-15" />
        <div className="absolute top-1/2 left-1/2 h-[500px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,oklch(0.82_0.16_75/0.05)_0%,transparent_70%)]" />
      </div>

      <div className="mx-auto max-w-lg">
        <div className="text-center">
          <p className="animate-fade-up text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Early Access
          </p>
          <h2
            className="animate-fade-up mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ animationDelay: "0.1s" }}
          >
            Join the Waitlist
          </h2>
          <p
            className="animate-fade-up mt-4 text-muted-foreground"
            style={{ animationDelay: "0.2s" }}
          >
            Be among the first tradespeople to get AI-powered bookings.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="animate-fade-up mt-10 space-y-5 rounded-2xl border border-border/40 bg-card/30 p-8 backdrop-blur-sm"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">Full Name *</Label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Grant Sidwell"
              className="rounded-xl border-border/40 bg-background/50 placeholder:text-muted-foreground/40 focus:border-primary/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email Address *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="grant@example.co.uk"
              className="rounded-xl border-border/40 bg-background/50 placeholder:text-muted-foreground/40 focus:border-primary/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trade" className="text-sm font-medium">Your Trade</Label>
            <select
              id="trade"
              name="trade"
              className="flex h-10 w-full rounded-xl border border-border/40 bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select your trade...</option>
              {TRADE_OPTIONS.map((trade) => (
                <option key={trade} value={trade}>{trade}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferred_plan" className="text-sm font-medium">Preferred Plan</Label>
            <select
              id="preferred_plan"
              name="preferred_plan"
              className="flex h-10 w-full rounded-xl border border-border/40 bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Choose a plan...</option>
              {PLAN_OPTIONS.map((plan) => (
                <option key={plan.value} value={plan.value}>{plan.label}</option>
              ))}
            </select>
          </div>

          {formState === "error" && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errorMessage}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full rounded-full bg-primary py-6 font-display text-base font-semibold text-primary-foreground transition-all hover:bg-primary/90 glow-amber"
            disabled={formState === "submitting"}
          >
            {formState === "submitting" ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Joining...</>
            ) : (
              <><Zap className="mr-2 h-4 w-4" /> Join the Waitlist</>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground/50">
            No spam, ever. We&apos;ll only email you about your BlitzQuote account.
          </p>
        </form>
      </div>
    </section>
  );
}
