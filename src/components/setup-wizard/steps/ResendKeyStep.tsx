"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SetupField } from "../SetupField";
import { SetupValidation } from "../SetupValidation";
import { ExternalLink } from "lucide-react";
import type { StepComponentProps } from "../SetupWizard";
import type { ValidationResult } from "@/lib/setup/types";

export function ResendKeyStep({ onValidated, wizardData, setWizardData }: StepComponentProps) {
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  async function validate() {
    setValidating(true);
    try {
      const res = await fetch("/api/setup/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "resend",
          keys: {
            RESEND_API_KEY: wizardData.RESEND_API_KEY || "",
            test_email: wizardData.admin_email || "",
          },
        }),
      });
      const data = await res.json();
      setResult(data);
      if (data.valid) onValidated();
    } catch {
      setResult({ valid: false, message: "Network error." });
    }
    setValidating(false);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm">Find your API key at <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Resend → API Keys <ExternalLink className="inline h-3 w-3" /></a></p>

      <SetupField
        config={{ key: "RESEND_API_KEY", label: "Resend API Key (a password that lets your website send emails through Resend)", hint: "Starts with re_", pattern: /^re_/, patternError: "Should start with 're_'", sensitive: true, placeholder: "re_..." }}
        value={wizardData.RESEND_API_KEY || ""}
        onChange={(v) => setWizardData({ RESEND_API_KEY: v })}
      />

      <Button onClick={validate} disabled={validating || !(wizardData.RESEND_API_KEY || "").startsWith("re_")} className="w-full bg-primary font-display font-semibold text-primary-foreground">
        Send Test Email
      </Button>
      <SetupValidation result={result} loading={validating} onRetry={validate} />

      <p className="text-xs text-muted-foreground">Also add <code>RESEND_API_KEY</code> to your Vercel environment variables.</p>
    </div>
  );
}
