"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import type { FieldConfig } from "@/lib/setup/types";

interface SetupFieldProps {
  config: FieldConfig;
  value: string;
  onChange: (value: string) => void;
}

export function SetupField({ config, value, onChange }: SetupFieldProps) {
  const [visible, setVisible] = useState(!config.sensitive);

  const patternValid = !config.pattern || !value || config.pattern.test(value);
  const hasValue = value.length > 0;

  return (
    <div className="space-y-2">
      <Label htmlFor={config.key} className="text-sm font-medium">
        {config.label}
      </Label>
      <p className="text-xs text-muted-foreground">{config.hint}</p>
      <div className="relative">
        <Input
          id={config.key}
          type={config.sensitive && !visible ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config.placeholder}
          className="pr-16 rounded-xl border-border/40 bg-background/50 font-mono text-sm placeholder:text-muted-foreground/40 focus:border-primary/50"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {hasValue && patternValid && (
            <CheckCircle2 className="h-4 w-4 text-green-400" />
          )}
          {hasValue && !patternValid && (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
          {config.sensitive && (
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              className="text-muted-foreground hover:text-foreground"
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
      {hasValue && !patternValid && config.patternError && (
        <p className="text-xs text-destructive">{config.patternError}</p>
      )}
    </div>
  );
}
