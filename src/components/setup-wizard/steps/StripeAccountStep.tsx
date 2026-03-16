"use client";

import { Button } from "@/components/ui/button";
import { SetupHelp } from "../SetupHelp";
import { ExternalLink } from "lucide-react";
import type { StepComponentProps } from "../SetupWizard";

export function StripeAccountStep({ onValidated }: StepComponentProps) {
  return (
    <div className="space-y-5">
      <ol className="space-y-3 text-sm">
        <li className="flex gap-2">
          <span className="font-bold text-primary">1.</span>
          <span><strong>Go to</strong> <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">stripe.com <ExternalLink className="inline h-3 w-3" /></a> and create an account</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">2.</span>
          <span><strong>Complete identity verification</strong> — Stripe needs to verify who you are before you can accept payments. This takes 10-15 minutes.</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">3.</span>
          <span>You can start with <strong>test mode</strong> and switch to live mode later when you&apos;re ready for real payments.</span>
        </li>
      </ol>
      <SetupHelp>
        <p>Stripe is the industry standard for online payments. They handle all the complex payment processing, security, and compliance so you don&apos;t have to.</p>
      </SetupHelp>
      <Button onClick={onValidated} variant="outline" className="w-full">I&apos;ve created my Stripe account</Button>
    </div>
  );
}
