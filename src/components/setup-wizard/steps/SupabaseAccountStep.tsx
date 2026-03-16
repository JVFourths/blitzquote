"use client";

import { Button } from "@/components/ui/button";
import { SetupHelp } from "../SetupHelp";
import { ExternalLink, AlertTriangle } from "lucide-react";
import type { StepComponentProps } from "../SetupWizard";

export function SupabaseAccountStep({ onValidated }: StepComponentProps) {
  return (
    <div className="space-y-5">
      <ol className="space-y-3 text-sm">
        <li className="flex gap-2">
          <span className="font-bold text-primary">1.</span>
          <span>
            <strong>Go to</strong>{" "}
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
              supabase.com <ExternalLink className="inline h-3 w-3" />
            </a>{" "}
            and click <strong>&quot;Start your project&quot;</strong>
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">2.</span>
          <span><strong>Sign up</strong> with your email or GitHub account</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">3.</span>
          <span><strong>Create a new project</strong> — name it <code className="rounded bg-muted px-1.5 py-0.5 text-xs">blitzquote</code></span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">4.</span>
          <span><strong>Choose region:</strong> EU West (London) for best UK performance</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">5.</span>
          <span><strong>Set a database password</strong> — save it somewhere safe (you won&apos;t need it in BlitzQuote, but keep it for Supabase)</span>
        </li>
      </ol>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-xs text-amber-300/80">
            <strong>Free tier note:</strong> Supabase free projects pause after 7 days of inactivity.
            Once you have real users, upgrade to Supabase Pro (£20/month) to prevent this.
            You can upgrade from your Supabase dashboard anytime.
          </p>
        </div>
      </div>

      <SetupHelp>
        <p>After creating your project, Supabase will spend about 2 minutes setting things up. Wait until you see the project dashboard before continuing.</p>
      </SetupHelp>

      <Button onClick={onValidated} variant="outline" className="w-full">
        I&apos;ve created my Supabase project
      </Button>
    </div>
  );
}
