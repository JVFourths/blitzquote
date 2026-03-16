"use client";

import { Button } from "@/components/ui/button";
import { SetupField } from "../SetupField";
import { SetupHelp } from "../SetupHelp";
import { ExternalLink } from "lucide-react";
import type { StepComponentProps } from "../SetupWizard";

export function GoogleCalendarStep({ onValidated, wizardData, setWizardData }: StepComponentProps) {
  return (
    <div className="space-y-5">
      <ol className="space-y-3 text-sm">
        <li className="flex gap-2"><span className="font-bold text-primary">1.</span><span><strong>Go to</strong> <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Google Cloud Console <ExternalLink className="inline h-3 w-3" /></a></span></li>
        <li className="flex gap-2"><span className="font-bold text-primary">2.</span><span>Create a new project or select an existing one</span></li>
        <li className="flex gap-2"><span className="font-bold text-primary">3.</span><span>Enable the <strong>Google Calendar API</strong></span></li>
        <li className="flex gap-2"><span className="font-bold text-primary">4.</span><span>Go to <strong>Credentials → Create Credentials → OAuth Client ID</strong></span></li>
        <li className="flex gap-2"><span className="font-bold text-primary">5.</span><span>Set application type to <strong>Web application</strong></span></li>
        <li className="flex gap-2"><span className="font-bold text-primary">6.</span><span>Add your site URL as an authorized redirect URI: <code className="text-xs bg-muted px-1 rounded">{typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com"}/api/calendar/callback</code></span></li>
      </ol>

      <div className="space-y-4">
        <SetupField config={{ key: "GOOGLE_CLIENT_ID", label: "Client ID", hint: "Ends with .apps.googleusercontent.com", sensitive: false, placeholder: "123456789-abc.apps.googleusercontent.com" }} value={wizardData.GOOGLE_CLIENT_ID || ""} onChange={(v) => setWizardData({ GOOGLE_CLIENT_ID: v })} />
        <SetupField config={{ key: "GOOGLE_CLIENT_SECRET", label: "Client Secret", hint: "Starts with GOCSPX-", sensitive: true, placeholder: "GOCSPX-..." }} value={wizardData.GOOGLE_CLIENT_SECRET || ""} onChange={(v) => setWizardData({ GOOGLE_CLIENT_SECRET: v })} />
      </div>

      <SetupHelp><p>Add both as Vercel environment variables: <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code>. Redeploy after adding.</p></SetupHelp>

      <Button onClick={onValidated} variant="outline" className="w-full">I&apos;ve set up Google Calendar</Button>
    </div>
  );
}
