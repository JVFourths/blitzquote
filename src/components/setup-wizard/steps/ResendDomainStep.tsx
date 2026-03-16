"use client";

import { SetupHelp } from "../SetupHelp";
import { ExternalLink, Clock } from "lucide-react";
import type { StepComponentProps } from "../SetupWizard";

export function ResendDomainStep({}: StepComponentProps) {
  return (
    <div className="space-y-5">
      <ol className="space-y-3 text-sm">
        <li className="flex gap-2">
          <span className="font-bold text-primary">1.</span>
          <span><strong>Go to</strong> <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Resend → Domains <ExternalLink className="inline h-3 w-3" /></a></span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">2.</span>
          <span>Click <strong>Add Domain</strong> and enter your domain (e.g. blitzquote.co.uk)</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">3.</span>
          <span>Resend will show you <strong>DNS records</strong> (settings you add at your domain provider so email works) to add</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">4.</span>
          <span>Add those records at your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)</span>
        </li>
      </ol>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs text-muted-foreground">
            DNS changes can take <strong>up to 48 hours</strong> to take effect. You can skip this step and come back later — email will still work once your domain is verified.
          </p>
        </div>
      </div>

      <SetupHelp title="Where do I add DNS records?">
        <ul className="space-y-2">
          <li><strong>GoDaddy:</strong> My Products → DNS → Manage → Add Record</li>
          <li><strong>Namecheap:</strong> Domain List → Manage → Advanced DNS</li>
          <li><strong>Cloudflare:</strong> Select site → DNS → Add Record</li>
        </ul>
        <p className="mt-2">Each registrar looks different, but you&apos;re adding the same records Resend shows you.</p>
      </SetupHelp>
    </div>
  );
}
