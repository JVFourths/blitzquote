"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SetupField } from "../SetupField";
import { SetupValidation } from "../SetupValidation";
import { SetupHelp } from "../SetupHelp";
import { ExternalLink } from "lucide-react";
import type { StepComponentProps } from "../SetupWizard";
import type { ValidationResult } from "@/lib/setup/types";

export function StripeKeysStep({ onValidated, wizardData, setWizardData }: StepComponentProps) {
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  async function validate() {
    setValidating(true);
    setResult(null);

    try {
      // Validate keys
      const valRes = await fetch("/api/setup/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "stripe",
          keys: {
            STRIPE_SECRET_KEY: wizardData.STRIPE_SECRET_KEY || "",
            NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: wizardData.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
          },
        }),
      });
      const valData = await valRes.json();

      if (!valData.valid) {
        setResult(valData);
        setValidating(false);
        return;
      }

      // Bootstrap Stripe products
      const bootRes = await fetch("/api/setup/bootstrap-stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stripe_secret_key: wizardData.STRIPE_SECRET_KEY,
          supabase_url: wizardData.NEXT_PUBLIC_SUPABASE_URL,
          supabase_service_key: wizardData.SUPABASE_SERVICE_ROLE_KEY,
        }),
      });
      const bootData = await bootRes.json();

      if (bootData.success) {
        setResult({
          valid: true,
          message: bootData.message,
          details: [
            ...bootData.plans.map((p: { name: string; price: string }) => `${p.name}: ${p.price}`),
            bootData.note,
          ],
        });
        onValidated();
      } else {
        setResult({ valid: false, message: bootData.error || "Failed to create plans." });
      }
    } catch {
      setResult({ valid: false, message: "Network error." });
    }
    setValidating(false);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm">Find your API keys at <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Stripe Dashboard → Developers → API Keys <ExternalLink className="inline h-3 w-3" /></a></p>

      <div className="space-y-4">
        <SetupField
          config={{ key: "STRIPE_SECRET_KEY", label: "Secret Key", hint: "Starts with sk_test_ or sk_live_", pattern: /^sk_(test|live)_/, patternError: "Should start with 'sk_test_' or 'sk_live_'", sensitive: true, placeholder: "sk_test_..." }}
          value={wizardData.STRIPE_SECRET_KEY || ""}
          onChange={(v) => setWizardData({ STRIPE_SECRET_KEY: v })}
        />
        <SetupField
          config={{ key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", label: "Publishable Key", hint: "Starts with pk_test_ or pk_live_", pattern: /^pk_(test|live)_/, patternError: "Should start with 'pk_test_' or 'pk_live_'", sensitive: false, placeholder: "pk_test_..." }}
          value={wizardData.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""}
          onChange={(v) => setWizardData({ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: v })}
        />
      </div>

      <SetupHelp>
        <p>After testing, you&apos;ll also need to add these as environment variables in Vercel (same as you did for Supabase). The variable names are <code>STRIPE_SECRET_KEY</code> and <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>.</p>
      </SetupHelp>

      <Button onClick={validate} disabled={validating || !wizardData.STRIPE_SECRET_KEY} className="w-full bg-primary font-display font-semibold text-primary-foreground">
        Test & Create Plans
      </Button>
      <SetupValidation result={result} loading={validating} onRetry={validate} />
    </div>
  );
}
