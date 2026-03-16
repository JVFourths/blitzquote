"use client";

import { Button } from "@/components/ui/button";
import { SetupHelp } from "../SetupHelp";
import { ExternalLink, AlertTriangle } from "lucide-react";
import type { StepComponentProps } from "../SetupWizard";

export function CustomDomainStep({ onValidated }: StepComponentProps) {
  return (
    <div className="space-y-5">
      <ol className="space-y-3 text-sm">
        <li className="flex gap-2"><span className="font-bold text-primary">1.</span><span><strong>Go to</strong> your <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Vercel project <ExternalLink className="inline h-3 w-3" /></a> → Settings → Domains</span></li>
        <li className="flex gap-2"><span className="font-bold text-primary">2.</span><span>Enter your domain (e.g. <code className="text-xs bg-muted px-1 rounded">blitzquote.co.uk</code>) and click <strong>Add</strong></span></li>
        <li className="flex gap-2"><span className="font-bold text-primary">3.</span><span>Follow Vercel&apos;s instructions to update your domain&apos;s nameservers or add DNS records</span></li>
        <li className="flex gap-2"><span className="font-bold text-primary">4.</span><span>SSL certificate is provisioned automatically — no action needed</span></li>
      </ol>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-xs text-amber-300/80"><strong>Important:</strong> After adding your custom domain, update your Stripe webhook URL to use the new domain (Stripe Dashboard → Webhooks → Edit endpoint).</p>
        </div>
      </div>

      <SetupHelp><p>DNS changes typically take 15 minutes to a few hours. Vercel will show a &quot;pending&quot; status until it verifies your domain.</p></SetupHelp>

      <Button onClick={onValidated} variant="outline" className="w-full">I&apos;ve added my domain</Button>
    </div>
  );
}
