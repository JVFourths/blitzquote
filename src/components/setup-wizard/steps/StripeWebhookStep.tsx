"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SetupField } from "../SetupField";
import { SetupHelp } from "../SetupHelp";
import { Copy, CheckCircle2, ExternalLink, AlertTriangle } from "lucide-react";
import type { StepComponentProps } from "../SetupWizard";

export function StripeWebhookStep({ onValidated, wizardData, setWizardData }: StepComponentProps) {
  const [copied, setCopied] = useState(false);
  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/stripe/webhook` : "/api/stripe/webhook";

  function copyUrl() {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const hasSecret = (wizardData.STRIPE_WEBHOOK_SECRET || "").startsWith("whsec_");

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium">Your webhook URL:</p>
        <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-card/20 p-3">
          <code className="flex-1 truncate text-xs text-primary">{webhookUrl}</code>
          <Button variant="ghost" size="sm" onClick={copyUrl} className="h-7 shrink-0">
            {copied ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      <ol className="space-y-2 text-sm">
        <li className="flex gap-2">
          <span className="font-bold text-primary">1.</span>
          <span><strong>Go to</strong> <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Stripe → Webhooks <ExternalLink className="inline h-3 w-3" /></a></span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">2.</span>
          <span>Click <strong>Add endpoint</strong></span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">3.</span>
          <span><strong>Paste the URL</strong> above</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">4.</span>
          <span>Under &quot;Select events&quot;, choose: <code className="text-xs bg-muted px-1 rounded">checkout.session.completed</code>, <code className="text-xs bg-muted px-1 rounded">customer.subscription.*</code>, <code className="text-xs bg-muted px-1 rounded">invoice.*</code></span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">5.</span>
          <span>Click <strong>Add endpoint</strong>, then copy the <strong>Signing secret</strong> that appears</span>
        </li>
      </ol>

      <SetupField
        config={{ key: "STRIPE_WEBHOOK_SECRET", label: "Webhook Signing Secret", hint: "Starts with whsec_", pattern: /^whsec_/, patternError: "Should start with 'whsec_'", sensitive: true, placeholder: "whsec_..." }}
        value={wizardData.STRIPE_WEBHOOK_SECRET || ""}
        onChange={(v) => setWizardData({ STRIPE_WEBHOOK_SECRET: v })}
      />

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-xs text-amber-300/80">If you add a custom domain later (Phase 3), you&apos;ll need to update this webhook URL in Stripe to use your new domain.</p>
        </div>
      </div>

      <SetupHelp>
        <p>Also add <code>STRIPE_WEBHOOK_SECRET</code> to your Vercel environment variables (same process as before).</p>
      </SetupHelp>

      <Button onClick={onValidated} disabled={!hasSecret} variant="outline" className="w-full">
        I&apos;ve set up the webhook and added the secret to Vercel
      </Button>
    </div>
  );
}
