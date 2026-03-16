"use client";

import { Button } from "@/components/ui/button";
import { Zap, ArrowDown } from "lucide-react";

export function Hero() {
  const scrollToWaitlist = () => {
    document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden px-5 pt-36 pb-28 sm:px-8 sm:pt-44 sm:pb-36">
      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {/* Grid */}
        <div className="absolute inset-0 bg-grid opacity-40" />
        {/* Radial gradient from center */}
        <div className="absolute top-0 left-1/2 h-[800px] w-[1000px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-[radial-gradient(ellipse,oklch(0.82_0.16_75/0.08)_0%,transparent_70%)]" />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
        {/* Grain */}
        <div className="absolute inset-0 grain" />
      </div>

      <div className="relative mx-auto max-w-5xl">
        {/* Badge */}
        <div
          className="animate-fade-up mb-8 flex justify-center"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-primary font-medium">Now accepting early access</span>
          </div>
        </div>

        {/* Headline */}
        <h1
          className="animate-fade-up text-center font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl xl:text-8xl"
          style={{ animationDelay: "0.2s" }}
        >
          Let AI Agents
          <br />
          <span className="text-gradient-amber text-glow">
            Find & Book
          </span>
          <br />
          Your Next Job
        </h1>

        {/* Subtext */}
        <p
          className="animate-fade-up mx-auto mt-8 max-w-2xl text-center text-lg text-muted-foreground sm:text-xl leading-relaxed"
          style={{ animationDelay: "0.35s" }}
        >
          Publish your profile once. ChatGPT, Claude, Siri, and Google Assistant
          discover you and book quoting slots{" "}
          <span className="text-foreground font-medium">directly into your calendar.</span>
        </p>

        {/* CTAs */}
        <div
          className="animate-fade-up mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          style={{ animationDelay: "0.5s" }}
        >
          <Button
            size="lg"
            className="w-full rounded-full bg-primary px-8 py-6 font-display text-base font-semibold text-primary-foreground transition-all hover:bg-primary/90 glow-amber-strong sm:w-auto"
            onClick={scrollToWaitlist}
          >
            <Zap className="mr-2 h-4 w-4" />
            Join the Waitlist
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full rounded-full border-border/50 px-8 py-6 font-display text-base font-medium transition-all hover:border-primary/30 hover:bg-primary/5 sm:w-auto"
            onClick={() =>
              document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            See How It Works
            <ArrowDown className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Trust line */}
        <p
          className="animate-fade-up mt-8 text-center text-sm text-muted-foreground/60"
          style={{ animationDelay: "0.65s" }}
        >
          Free to join &middot; No credit card &middot; UK tradespeople only
        </p>

        {/* Decorative lightning bolt lines */}
        <div className="pointer-events-none absolute -left-20 top-1/3 hidden h-px w-40 bg-gradient-to-r from-transparent via-primary/30 to-transparent lg:block" />
        <div className="pointer-events-none absolute -right-20 top-2/3 hidden h-px w-40 bg-gradient-to-r from-transparent via-primary/20 to-transparent lg:block" />
      </div>
    </section>
  );
}
