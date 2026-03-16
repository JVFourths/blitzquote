import { Zap } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/30 px-5 py-14 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-display text-base font-bold tracking-tight">
              Blitz<span className="text-primary">Quote</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground/50">
            &copy; {new Date().getFullYear()} BlitzQuote. All rights reserved.
            Quotes at the speed of AI.
          </p>
        </div>
      </div>
    </footer>
  );
}
