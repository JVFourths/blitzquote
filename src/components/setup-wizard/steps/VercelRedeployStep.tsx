"use client";

import { Button } from "@/components/ui/button";
import { SetupHelp } from "../SetupHelp";
import { ExternalLink, RefreshCw } from "lucide-react";
import type { StepComponentProps } from "../SetupWizard";

export function VercelRedeployStep({ onValidated }: StepComponentProps) {
  return (
    <div className="space-y-5">
      <ol className="space-y-3 text-sm">
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
          <span>Click <strong>Deployments</strong> in the top menu</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">4.</span>
          <span>Click the <strong>...</strong> menu on the latest deployment and choose <strong>Redeploy</strong></span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">5.</span>
          <span>Wait about <strong>2 minutes</strong> for the build to finish</span>
        </li>
      </ol>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-2">
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground">After redeploying:</p>
            <p className="mt-1">Your website will restart with the database connected. Go to <strong>yourdomain.com/admin/setup</strong> to continue the wizard.</p>
          </div>
        </div>
      </div>

      <SetupHelp>
        <p>A &quot;redeploy&quot; rebuilds your website with the new settings. It&apos;s like restarting an app after changing its settings. Your website will be briefly unavailable during the rebuild (about 2 minutes).</p>
      </SetupHelp>

      <Button onClick={onValidated} variant="outline" className="w-full">
        I&apos;ve redeployed — take me to the next step
      </Button>
    </div>
  );
}
