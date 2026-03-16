"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SetupHelp } from "../SetupHelp";
import { Copy, CheckCircle2, ExternalLink } from "lucide-react";
import type { StepComponentProps } from "../SetupWizard";

export function SupabaseKeysStep({ onValidated, wizardData }: StepComponentProps) {
  const envVars = [
    { name: "NEXT_PUBLIC_SUPABASE_URL", value: wizardData.NEXT_PUBLIC_SUPABASE_URL || "" },
    { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: wizardData.NEXT_PUBLIC_SUPABASE_ANON_KEY || "" },
    { name: "SUPABASE_SERVICE_ROLE_KEY", value: wizardData.SUPABASE_SERVICE_ROLE_KEY || "" },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm">Add these three values to your Vercel project&apos;s Environment Variables:</p>

      <ol className="space-y-2 text-sm">
        <li className="flex gap-2">
          <span className="font-bold text-primary">1.</span>
          <span>
            <strong>Go to</strong> your{" "}
            <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
              Vercel Dashboard <ExternalLink className="inline h-3 w-3" />
            </a>
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">2.</span>
          <span>Click on your <strong>blitzquote</strong> project</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">3.</span>
          <span>Go to <strong>Settings → Environment Variables</strong></span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">4.</span>
          <span>For each row below, add a new variable with the exact name and value:</span>
        </li>
      </ol>

      <div className="space-y-3">
        {envVars.map((env) => (
          <EnvVarRow key={env.name} name={env.name} value={env.value} />
        ))}
      </div>

      <SetupHelp>
        <p>Make sure each variable is set for <strong>all environments</strong> (Production, Preview, Development). Vercel shows checkboxes for this when you add the variable.</p>
      </SetupHelp>

      <Button onClick={onValidated} variant="outline" className="w-full">
        I&apos;ve added all three to Vercel
      </Button>
    </div>
  );
}

function EnvVarRow({ name, value }: { name: string; value: string }) {
  const [copiedName, setCopiedName] = useState(false);
  const [copiedValue, setCopiedValue] = useState(false);

  function copyText(text: string, setCopied: (v: boolean) => void) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card/20 p-3">
      <div className="flex items-center justify-between">
        <code className="text-xs font-bold text-primary">{name}</code>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyText(name, setCopiedName)}
          className="h-7 text-xs"
        >
          {copiedName ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          <span className="ml-1">{copiedName ? "Copied" : "Copy name"}</span>
        </Button>
      </div>
      {value && (
        <div className="mt-1 flex items-center justify-between">
          <code className="truncate text-xs text-muted-foreground">{value.slice(0, 30)}...</code>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyText(value, setCopiedValue)}
            className="h-7 text-xs"
          >
            {copiedValue ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
            <span className="ml-1">{copiedValue ? "Copied" : "Copy value"}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
