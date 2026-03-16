"use client";

import { UserPlus, MessageSquare, Calendar } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Create Your Profile",
    description:
      "Sign up, list your trade, set your service area and weekly availability. Takes less than 5 minutes.",
  },
  {
    icon: MessageSquare,
    step: "02",
    title: "AI Agents Discover You",
    description:
      "When a homeowner asks any AI assistant for a local tradesperson, our API serves your profile automatically.",
  },
  {
    icon: Calendar,
    step: "03",
    title: "Bookings Land in Your Calendar",
    description:
      "The AI books a quoting slot directly into your calendar. You get notified instantly — zero back-and-forth.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative px-5 py-28 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="animate-fade-up text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            How It Works
          </p>
          <h2
            className="animate-fade-up mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
            style={{ animationDelay: "0.1s" }}
          >
            Three steps to
            <span className="text-gradient-amber"> AI-powered </span>
            bookings
          </h2>
        </div>

        <div className="mt-20 grid gap-8 sm:gap-6 lg:grid-cols-3">
          {steps.map((step, i) => (
            <div
              key={step.step}
              className="animate-fade-up group relative rounded-2xl border border-border/40 bg-card/50 p-8 transition-all duration-300 hover:border-primary/30 hover:bg-card"
              style={{ animationDelay: `${0.2 + i * 0.15}s` }}
            >
              {/* Step number */}
              <span className="font-display text-5xl font-extrabold text-border/60 transition-colors group-hover:text-primary/20">
                {step.step}
              </span>

              {/* Icon */}
              <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-all group-hover:bg-primary/15 group-hover:glow-amber">
                <step.icon className="h-6 w-6 text-primary" />
              </div>

              <h3 className="mt-5 font-display text-lg font-bold">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>

              {/* Connector line on desktop */}
              {i < steps.length - 1 && (
                <div className="pointer-events-none absolute -right-3 top-1/2 hidden h-px w-6 bg-gradient-to-r from-border/60 to-transparent lg:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
