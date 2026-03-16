"use client";

import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ValidationResult } from "@/lib/setup/types";

interface SetupValidationProps {
  result: ValidationResult | null;
  loading: boolean;
  onRetry: () => void;
}

export function SetupValidation({ result, loading, onRetry }: SetupValidationProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-card/30 p-4 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-muted-foreground">Testing connection...</span>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div
      className={`rounded-xl border p-4 text-sm ${
        result.valid
          ? "border-green-500/30 bg-green-500/5"
          : "border-destructive/30 bg-destructive/5"
      }`}
    >
      <div className="flex items-start gap-2">
        {result.valid ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
        ) : (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        )}
        <div className="flex-1">
          <p className={result.valid ? "text-green-300" : "text-destructive"}>
            {result.message}
          </p>

          {result.details && result.details.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.details.map((detail, i) => (
                <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {result.valid ? (
                    <CheckCircle2 className="h-3 w-3 text-green-400" />
                  ) : (
                    <span className="font-medium">{i + 1}.</span>
                  )}
                  {detail}
                </li>
              ))}
            </ul>
          )}

          {!result.valid && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="mt-3 text-xs"
            >
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
