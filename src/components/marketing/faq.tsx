"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is BlitzQuote?",
    answer:
      "BlitzQuote connects UK tradespeople with homeowners through AI assistants. When someone asks ChatGPT, Claude, Siri, or Google Assistant to find a local plumber (or any tradesperson), our API serves your profile and availability, and the AI can book a quoting slot directly into your calendar.",
  },
  {
    question: "How do AI agents find me?",
    answer:
      "We provide a public API that follows the OpenAI plugin standard. AI platforms can automatically discover and use our API to search for tradespeople by trade, location, and availability. You don't need to do anything — just keep your profile and availability up to date.",
  },
  {
    question: "What trades are supported?",
    answer:
      "We support all major UK trades including plumbers, electricians, gas engineers, carpenters, roofers, plasterers, painters & decorators, locksmiths, landscapers, builders, tilers, handymen, kitchen fitters, bathroom fitters, and more.",
  },
  {
    question: "How much does it cost?",
    answer:
      "We offer flexible pricing: Pay Per Booking at £1 per booking, Monthly at £5/month for unlimited bookings, or Annual at £50/year (saving over 15%). There's also a Founding Investor tier at £1,500 for lifetime access.",
  },
  {
    question: "How does calendar sync work?",
    answer:
      "Connect your Google Calendar and we'll automatically sync your availability. When an AI books a slot, it appears in your calendar instantly. If a time is blocked in your calendar, it won't show as available to AI agents.",
  },
  {
    question: "Is my data safe?",
    answer:
      "Absolutely. We use Supabase (built on PostgreSQL) with row-level security. Your personal data is never shared with AI agents — only your public profile, trade, and available time slots are visible through the API.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes, all plans can be cancelled at any time. We also offer a 30-day money-back guarantee on all paid plans. If you're on Pay Per Booking, you only ever pay for actual bookings received.",
  },
  {
    question: "When does BlitzQuote launch?",
    answer:
      "We're currently in pre-launch and accepting waitlist signups. Early members will get first access and help shape the platform. Join the waitlist to be notified when we go live.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="px-5 py-28 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="animate-fade-up text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            FAQ
          </p>
          <h2
            className="animate-fade-up mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ animationDelay: "0.1s" }}
          >
            Frequently asked questions
          </h2>
        </div>

        <Accordion className="mt-14 space-y-3">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="rounded-xl border border-border/40 bg-card/20 px-6 transition-colors hover:bg-card/40 data-[state=open]:bg-card/40"
            >
              <AccordionTrigger className="py-5 text-left font-display text-base font-semibold hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
