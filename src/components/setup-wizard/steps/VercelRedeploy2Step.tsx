"use client";

import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw } from "lucide-react";
import type { StepComponentProps } from "../SetupWizard";

export function VercelRedeploy2Step({ onValidated }: StepComponentProps) {
  return (
    <div className="space-y-5">
      <p className="text-sm">You&apos;ve added several new environment variables in Phase 2. Redeploy to activate them all:</p>

      <div className="rounded-xl border border-border/40 bg-card/20 p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground mb-2">Variables that should be in Vercel:</p>
        <ul className="space-y-1">
          <li>STRIPE_SECRET_KEY</li>
          <li>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</li>
          <li>STRIPE_WEBHOOK_SECRET</li>
          <li>RESEND_API_KEY</li>
        </ul>
      </div>

      <ol className="space-y-2 text-sm">
        <li className="flex gap-2">
          <span className="font-bold text-primary">1.</span>
          <span><strong>Go to</strong> <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Vercel Dashboard <ExternalLink className="inline h-3 w-3" /></a> → your project → Deployments</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">2.</span>
          <span>Click <strong>...</strong> → <strong>Redeploy</strong></span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">3.</span>
          <span>Wait ~2 minutes for the build</span>
        </li>
      </ol>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-2">
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs text-muted-foreground">After this redeploy, payments and email notifications will be fully active.</p>
        </div>
      </div>

      <Button onClick={onValidated} variant="outline" className="w-full">I&apos;ve redeployed</Button>
    </div>
  );
}
