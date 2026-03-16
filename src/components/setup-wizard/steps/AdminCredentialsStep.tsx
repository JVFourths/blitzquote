"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SetupValidation } from "../SetupValidation";
import { Loader2 } from "lucide-react";
import type { StepComponentProps } from "../SetupWizard";
import type { ValidationResult } from "@/lib/setup/types";

export function AdminCredentialsStep({ onValidated }: StepComponentProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  async function handleCreate() {
    if (password !== confirm) {
      setResult({ valid: false, message: "Passwords don't match." });
      return;
    }
    if (password.length < 8) {
      setResult({ valid: false, message: "Password must be at least 8 characters." });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Create the admin user via Supabase Auth
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: "Admin", is_admin: true },
        },
      });

      if (error) {
        setResult({ valid: false, message: error.message });
        setLoading(false);
        return;
      }

      // Sign in immediately
      await supabase.auth.signInWithPassword({ email, password });

      setResult({ valid: true, message: "Admin account created and signed in!" });
      onValidated();
    } catch (err) {
      setResult({
        valid: false,
        message: err instanceof Error ? err.message : "Failed to create account.",
      });
    }

    setLoading(false);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        This will be your login for the admin dashboard. Use an email you check regularly — booking notifications will be sent here too.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="admin-email" className="text-sm font-medium">Email Address</Label>
          <Input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="grant@example.co.uk"
            className="rounded-xl border-border/40 bg-background/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-password" className="text-sm font-medium">Password</Label>
          <Input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="rounded-xl border-border/40 bg-background/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-confirm" className="text-sm font-medium">Confirm Password</Label>
          <Input
            id="admin-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat your password"
            className="rounded-xl border-border/40 bg-background/50"
          />
        </div>
      </div>

      <Button
        onClick={handleCreate}
        disabled={loading || !email || !password || !confirm}
        className="w-full gap-2 bg-primary font-display font-semibold text-primary-foreground"
      >
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : "Create Admin Account"}
      </Button>

      <SetupValidation result={result} loading={false} onRetry={handleCreate} />
    </div>
  );
}
