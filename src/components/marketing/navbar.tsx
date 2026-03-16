"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Menu, X } from "lucide-react";

const navLinks = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-border/50 bg-background/90 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-5 sm:px-8">
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 transition-all group-hover:bg-primary/20">
            <Zap className="h-4 w-4 text-primary" />
            <div className="absolute inset-0 rounded-lg opacity-0 transition-opacity group-hover:opacity-100 glow-amber" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">
            Blitz<span className="text-primary">Quote</span>
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 sm:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
          <Button
            size="sm"
            className="rounded-full bg-primary px-5 font-display text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 animate-pulse-glow"
            onClick={() =>
              document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Join Waitlist
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          className="rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl px-5 pb-5 pt-3 sm:hidden animate-fade-in">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Button
              className="mt-3 w-full rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground"
              onClick={() => {
                document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
                setMobileOpen(false);
              }}
            >
              Join Waitlist
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
