import { ShieldCheck } from "lucide-react";

export function Guarantee() {
  return (
    <section className="px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="animate-fade-up rounded-2xl border border-primary/20 bg-primary/[0.03] p-10 text-center sm:p-14">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            30-Day Money-Back Guarantee
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Not happy? Full refund within 30 days, no questions asked. We&apos;re
            confident BlitzQuote will pay for itself with your very first
            AI-booked job.
          </p>
        </div>
      </div>
    </section>
  );
}
