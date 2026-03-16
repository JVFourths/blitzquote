"use client";

import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import type { StepComponentProps } from "../SetupWizard";

export function ResendAccountStep({ onValidated }: StepComponentProps) {
  return (
    <div className="space-y-5">
      <ol className="space-y-3 text-sm">
        <li className="flex gap-2">
          <span className="font-bold text-primary">1.</span>
          <span><strong>Go to</strong> <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">resend.com <ExternalLink className="inline h-3 w-3" /></a> and sign up</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">2.</span>
          <span>Resend has a <strong>free tier</strong> (3,000 emails/month) — more than enough to start</span>
        </li>
      </ol>
      <Button onClick={onValidated} variant="outline" className="w-full">I&apos;ve created my Resend account</Button>
    </div>
  );
}
