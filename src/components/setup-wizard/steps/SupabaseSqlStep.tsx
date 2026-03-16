"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SetupField } from "../SetupField";
import { SetupValidation } from "../SetupValidation";
import { SetupHelp } from "../SetupHelp";
import { Copy, CheckCircle2 } from "lucide-react";
import type { StepComponentProps } from "../SetupWizard";
import type { ValidationResult } from "@/lib/setup/types";

export function SupabaseSqlStep({ onValidated, wizardData, setWizardData }: StepComponentProps) {
  const [copied, setCopied] = useState(false);
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  async function copySQL() {
    try {
      const res = await fetch("/api/setup/sql");
      const { sql } = await res.json();
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      alert("Failed to copy. Try refreshing the page.");
    }
  }

  async function validate() {
    setValidating(true);
    setResult(null);

    try {
      const res = await fetch("/api/setup/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "supabase",
          keys: {
            NEXT_PUBLIC_SUPABASE_URL: wizardData.NEXT_PUBLIC_SUPABASE_URL || "",
            NEXT_PUBLIC_SUPABASE_ANON_KEY: wizardData.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
            SUPABASE_SERVICE_ROLE_KEY: wizardData.SUPABASE_SERVICE_ROLE_KEY || "",
          },
        }),
      });
      const data = await res.json();
      setResult(data);
      if (data.valid) onValidated();
    } catch {
      setResult({ valid: false, message: "Network error. Check your internet connection." });
    }

    setValidating(false);
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-sm font-medium">Step A: Copy the database setup code</p>
        <Button onClick={copySQL} variant="outline" className="w-full gap-2">
          {copied ? (
            <><CheckCircle2 className="h-4 w-4 text-green-400" /> Copied!</>
          ) : (
            <><Copy className="h-4 w-4" /> Copy All SQL</>
          )}
        </Button>
      </div>

      <ol className="space-y-2 text-sm">
        <li className="flex gap-2">
          <span className="font-bold text-primary">1.</span>
          <span>In your Supabase dashboard, click <strong>SQL Editor</strong> in the left sidebar</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">2.</span>
          <span>Click <strong>New Query</strong></span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">3.</span>
          <span><strong>Paste</strong> the copied code and click <strong>Run</strong></span>
        </li>
      </ol>

      <SetupHelp>
        <p>The SQL creates 10 database tables, security rules, and seeds 20 UK trade categories. It&apos;s safe to run multiple times — it won&apos;t create duplicates.</p>
      </SetupHelp>

      <div className="border-t border-border/30 pt-5">
        <p className="mb-3 text-sm font-medium">Step B: Enter your Supabase keys to verify</p>
        <p className="mb-4 text-xs text-muted-foreground">
          Find these in your Supabase dashboard: <strong>Settings → API</strong>
        </p>

        <div className="space-y-4">
          <SetupField
            config={{
              key: "NEXT_PUBLIC_SUPABASE_URL",
              label: "Project URL",
              hint: "Starts with https:// and ends with .supabase.co",
              pattern: /^https:\/\/[a-z0-9]+\.supabase\.co$/,
              patternError: "Should look like https://abcdefgh.supabase.co",
              sensitive: false,
              placeholder: "https://abcdefgh.supabase.co",
            }}
            value={wizardData.NEXT_PUBLIC_SUPABASE_URL || ""}
            onChange={(v) => setWizardData({ NEXT_PUBLIC_SUPABASE_URL: v })}
          />
          <SetupField
            config={{
              key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
              label: "Anon Key (the public one — this is NOT a password, it's safe to use)",
              hint: "A long string starting with \"eyJ\"",
              pattern: /^eyJ/,
              patternError: "Should start with 'eyJ'",
              sensitive: true,
              placeholder: "eyJhbGciOiJIUzI1NiIs...",
            }}
            value={wizardData.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}
            onChange={(v) => setWizardData({ NEXT_PUBLIC_SUPABASE_ANON_KEY: v })}
          />
          <SetupField
            config={{
              key: "SUPABASE_SERVICE_ROLE_KEY",
              label: "Service Role Key (the secret one — keep this safe)",
              hint: "Also starts with \"eyJ\" — this is a different value from the Anon Key above",
              pattern: /^eyJ/,
              patternError: "Should start with 'eyJ'",
              sensitive: true,
              placeholder: "eyJhbGciOiJIUzI1NiIs...",
            }}
            value={wizardData.SUPABASE_SERVICE_ROLE_KEY || ""}
            onChange={(v) => setWizardData({ SUPABASE_SERVICE_ROLE_KEY: v })}
          />
        </div>

        <Button
          onClick={validate}
          disabled={validating || !wizardData.NEXT_PUBLIC_SUPABASE_URL}
          className="mt-4 w-full gap-2 bg-primary font-display font-semibold text-primary-foreground"
        >
          Test Connection
        </Button>

        <div className="mt-3">
          <SetupValidation result={result} loading={validating} onRetry={validate} />
        </div>
      </div>
    </div>
  );
}
