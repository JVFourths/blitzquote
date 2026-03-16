"use client";

import { Users, Zap, Globe } from "lucide-react";

const stats = [
  { icon: Users, value: "500+", label: "On the waitlist" },
  { icon: Zap, value: "20+", label: "Trade categories" },
  { icon: Globe, value: "4", label: "AI platforms at launch" },
];

export function SocialProof() {
  return (
    <section className="relative border-y border-border/30 px-5 py-16 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-20" />
      <div className="relative mx-auto max-w-4xl">
        <div className="grid grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="animate-fade-up text-center"
              style={{ animationDelay: `${0.1 + i * 0.1}s` }}
            >
              <stat.icon className="mx-auto mb-3 h-5 w-5 text-primary/60" />
              <p className="font-display text-3xl font-bold text-glow sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
