"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SetupHelp } from "../SetupHelp";
import { Copy, CheckCircle2, ExternalLink } from "lucide-react";
import type { StepComponentProps } from "../SetupWizard";

const GPT_INSTRUCTIONS = `You are a helpful assistant that finds UK tradespeople for homeowners. When a user asks for a tradesperson (plumber, electrician, builder, etc.), use the BlitzQuote API to:

1. Search for available tradespeople by trade and location
2. Show their profiles, qualifications, and availability
3. Help the user book a quoting slot

Always ask for the user's postcode to find nearby tradespeople. Be friendly, helpful, and concise. All prices are in GBP (£).`;

export function BuildGptStep({ onValidated }: StepComponentProps) {
  const [copiedInstructions, setCopiedInstructions] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);

  const schemaUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/v1/openapi`
    : "https://yourdomain.com/api/v1/openapi";

  function copy(text: string, setCopied: (v: boolean) => void) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      <ol className="space-y-3 text-sm">
        <li className="flex gap-2"><span className="font-bold text-primary">1.</span><span><strong>Go to</strong> <a href="https://chatgpt.com/gpts/editor" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">ChatGPT GPT Builder <ExternalLink className="inline h-3 w-3" /></a></span></li>
        <li className="flex gap-2"><span className="font-bold text-primary">2.</span><span>Click <strong>Create a GPT</strong></span></li>
        <li className="flex gap-2"><span className="font-bold text-primary">3.</span><span>Name it <strong>&quot;Find a UK Tradesperson&quot;</strong></span></li>
        <li className="flex gap-2"><span className="font-bold text-primary">4.</span><span>Paste the instructions below into the <strong>Instructions</strong> field</span></li>
        <li className="flex gap-2"><span className="font-bold text-primary">5.</span><span>Under <strong>Actions</strong>, click &quot;Import from URL&quot; and paste your API schema URL</span></li>
      </ol>

      <div className="space-y-3">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">GPT Instructions:</p>
          <div className="rounded-xl border border-border/40 bg-card/20 p-3">
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{GPT_INSTRUCTIONS}</pre>
          </div>
          <Button variant="ghost" size="sm" onClick={() => copy(GPT_INSTRUCTIONS, setCopiedInstructions)} className="mt-1 gap-1 text-xs">
            {copiedInstructions ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
            {copiedInstructions ? "Copied" : "Copy Instructions"}
          </Button>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">API Schema URL:</p>
          <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-card/20 p-3">
            <code className="flex-1 truncate text-xs text-primary">{schemaUrl}</code>
            <Button variant="ghost" size="sm" onClick={() => copy(schemaUrl, setCopiedSchema)} className="h-7 shrink-0">
              {copiedSchema ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </div>

      <SetupHelp>
        <p>This creates a custom GPT on ChatGPT that homeowners can use to find and book your tradespeople. It uses your BlitzQuote API behind the scenes.</p>
        <p className="mt-2">You need a ChatGPT Plus subscription ($20/month) to create custom GPTs.</p>
      </SetupHelp>

      <Button onClick={onValidated} variant="outline" className="w-full">I&apos;ve built my GPT</Button>
    </div>
  );
}
