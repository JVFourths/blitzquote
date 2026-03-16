"use client";

import { Button } from "@/components/ui/button";
import { Check, Zap } from "lucide-react";

const plans = [
  {
    name: "Pay Per Booking",
    price: "£1",
    period: "per booking",
    description: "Only pay when AI brings you work.",
    features: [
      "Full profile listing",
      "AI agent discovery",
      "Calendar integration",
      "Email notifications",
    ],
    popular: false,
  },
  {
    name: "Monthly",
    price: "£5",
    period: "per month",
    description: "Unlimited bookings. Priority listing.",
    features: [
      "Everything in Pay Per Booking",
      "Unlimited bookings",
      "Priority in search results",
      "Booking analytics",
      "Phone notifications",
    ],
    popular: true,
  },
  {
    name: "Annual",
    price: "£50",
    period: "per year",
    description: "Best value — save over 15%.",
    features: [
      "Everything in Monthly",
      "2 months free",
      "Featured profile badge",
      "Priority support",
      "Early feature access",
    ],
    popular: false,
  },
  {
    name: "Investor",
    price: "£1,500",
    period: "one-time",
    description: "Founding investor. Lifetime access.",
    features: [
      "Lifetime unlimited access",
      "Founding investor badge",
      "Revenue share opportunity",
      "Direct feature input",
      "VIP support forever",
    ],
    popular: false,
  },
];

export function Pricing() {
  const scrollToWaitlist = () => {
    document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="pricing" className="relative px-5 py-28 sm:px-8">
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid opacity-15" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="animate-fade-up text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Pricing
          </p>
          <h2
            className="animate-fade-up mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
            style={{ animationDelay: "0.1s" }}
          >
            Simple, transparent pricing
          </h2>
          <p
            className="animate-fade-up mt-4 text-lg text-muted-foreground"
            style={{ animationDelay: "0.2s" }}
          >
            Start free. Only pay when AI brings you real work.
          </p>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              className={`animate-fade-up group relative flex flex-col rounded-2xl border p-6 transition-all duration-300 ${
                plan.popular
                  ? "border-primary/40 bg-primary/[0.03] glow-amber"
                  : "border-border/40 bg-card/30 hover:border-border/60 hover:bg-card/50"
              }`}
              style={{ animationDelay: `${0.15 + i * 0.1}s` }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    <Zap className="h-3 w-3" />
                    Most Popular
                  </span>
                </div>
              )}

              <div>
                <h3 className="font-display text-base font-bold">{plan.name}</h3>
                <div className="mt-3">
                  <span className="font-display text-3xl font-extrabold">
                    {plan.price}
                  </span>
                  <span className="ml-1.5 text-sm text-muted-foreground">
                    {plan.period}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`mt-6 w-full rounded-full font-display font-semibold transition-all ${
                  plan.popular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
                onClick={scrollToWaitlist}
              >
                {plan.name === "Investor" ? "Express Interest" : "Join Waitlist"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
