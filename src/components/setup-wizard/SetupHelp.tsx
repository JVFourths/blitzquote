"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface SetupHelpProps {
  title?: string;
  children: React.ReactNode;
}

export function SetupHelp({ title = "Show me exactly", children }: SetupHelpProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border/30 bg-card/20">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        {title}
      </button>
      {open && (
        <div className="border-t border-border/30 px-4 py-3 text-sm text-muted-foreground animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}
