"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  Shield,
} from "lucide-react";

interface ApiKeyConfig {
  key: string;
  label: string;
  description: string;
  required: boolean;
  docsUrl: string;
  docsLabel: string;
  placeholder: string;
  category: string;
}

const API_KEY_CONFIGS: ApiKeyConfig[] = [
  // Supabase
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    label: "Supabase URL",
    description: "Your Supabase project URL (e.g. https://abc.supabase.co)",
    required: true,
    docsUrl: "https://supabase.com/dashboard/project/_/settings/api",
    docsLabel: "Supabase Dashboard → Settings → API",
    placeholder: "https://your-project.supabase.co",
    category: "Supabase",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    label: "Supabase Anon Key",
    description: "Public anon/public key for client-side access (safe to expose)",
    required: true,
    docsUrl: "https://supabase.com/dashboard/project/_/settings/api",
    docsLabel: "Supabase Dashboard → Settings → API → anon public",
    placeholder: "eyJhbGciOiJIUzI1NiIs...",
    category: "Supabase",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    label: "Supabase Service Role Key",
    description: "Server-side key that bypasses RLS. Never expose to the client.",
    required: true,
    docsUrl: "https://supabase.com/dashboard/project/_/settings/api",
    docsLabel: "Supabase Dashboard → Settings → API → service_role secret",
    placeholder: "eyJhbGciOiJIUzI1NiIs...",
    category: "Supabase",
  },

  // Stripe
  {
    key: "STRIPE_SECRET_KEY",
    label: "Stripe Secret Key",
    description: "Server-side API key for creating charges, subscriptions, etc.",
    required: true,
    docsUrl: "https://dashboard.stripe.com/apikeys",
    docsLabel: "Stripe Dashboard → Developers → API Keys",
    placeholder: "sk_live_... or sk_test_...",
    category: "Stripe",
  },
  {
    key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    label: "Stripe Publishable Key",
    description: "Client-side key for Stripe.js (safe to expose)",
    required: true,
    docsUrl: "https://dashboard.stripe.com/apikeys",
    docsLabel: "Stripe Dashboard → Developers → API Keys",
    placeholder: "pk_live_... or pk_test_...",
    category: "Stripe",
  },
  {
    key: "STRIPE_WEBHOOK_SECRET",
    label: "Stripe Webhook Secret",
    description: "Used to verify webhook event signatures from Stripe",
    required: true,
    docsUrl: "https://dashboard.stripe.com/webhooks",
    docsLabel: "Stripe Dashboard → Developers → Webhooks → Add endpoint",
    placeholder: "whsec_...",
    category: "Stripe",
  },
  {
    key: "STRIPE_PRICE_MONTHLY",
    label: "Stripe Monthly Price ID",
    description: "Price ID for the £5/month subscription product",
    required: false,
    docsUrl: "https://dashboard.stripe.com/products",
    docsLabel: "Stripe Dashboard → Products → Create product → Copy Price ID",
    placeholder: "price_...",
    category: "Stripe",
  },
  {
    key: "STRIPE_PRICE_ANNUAL",
    label: "Stripe Annual Price ID",
    description: "Price ID for the £50/year subscription product",
    required: false,
    docsUrl: "https://dashboard.stripe.com/products",
    docsLabel: "Stripe Dashboard → Products → Create product → Copy Price ID",
    placeholder: "price_...",
    category: "Stripe",
  },

  // Google Calendar
  {
    key: "GOOGLE_CLIENT_ID",
    label: "Google Client ID",
    description: "OAuth2 client ID for Google Calendar integration",
    required: false,
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    docsLabel: "Google Cloud Console → APIs & Services → Credentials → Create OAuth Client",
    placeholder: "123456789-abc.apps.googleusercontent.com",
    category: "Google",
  },
  {
    key: "GOOGLE_CLIENT_SECRET",
    label: "Google Client Secret",
    description: "OAuth2 client secret for Google Calendar",
    required: false,
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    docsLabel: "Google Cloud Console → APIs & Services → Credentials",
    placeholder: "GOCSPX-...",
    category: "Google",
  },

  // Email
  {
    key: "RESEND_API_KEY",
    label: "Resend API Key",
    description: "API key for sending transactional emails (booking notifications)",
    required: false,
    docsUrl: "https://resend.com/api-keys",
    docsLabel: "Resend Dashboard → API Keys → Create API Key",
    placeholder: "re_...",
    category: "Email",
  },
  {
    key: "FROM_EMAIL",
    label: "From Email Address",
    description: "Sender address for all outgoing emails",
    required: false,
    docsUrl: "https://resend.com/domains",
    docsLabel: "Resend Dashboard → Domains → Verify your domain first",
    placeholder: "BlitzQuote <noreply@blitzquote.co.uk>",
    category: "Email",
  },
];

export default function AdminApiKeysPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/env");
      if (res.ok) {
        const data = await res.json();
        setValues(data.keys || {});
      }
    } catch {
      // Keys not loadable — start blank
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  function updateValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleVisibility(key: string) {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/env", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: values }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "API keys saved. Restart the server for changes to take effect." });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error." });
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group configs by category
  const categories = API_KEY_CONFIGS.reduce<Record<string, ApiKeyConfig[]>>(
    (acc, config) => {
      if (!acc[config.category]) acc[config.category] = [];
      acc[config.category].push(config);
      return acc;
    },
    {}
  );

  const categoryIcons: Record<string, string> = {
    Supabase: "🟢",
    Stripe: "💳",
    Google: "📅",
    Email: "✉️",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6" />
            API Keys & Configuration
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your third-party service credentials. Keys are saved to
            your <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code> file.
          </p>
        </div>
      </div>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="flex items-start gap-3 pt-6">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">Security Notice</p>
            <p className="mt-1 text-amber-700">
              API keys are stored in your server&apos;s <code>.env.local</code> file
              and are never sent to the client. Always use test keys during development.
              Never commit <code>.env.local</code> to version control.
            </p>
          </div>
        </CardContent>
      </Card>

      {Object.entries(categories).map(([category, configs]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>{categoryIcons[category] || "🔑"}</span>
              {category}
            </CardTitle>
            <CardDescription>
              {category === "Supabase" && "Database and authentication — required for the app to function."}
              {category === "Stripe" && "Payments, subscriptions, and billing."}
              {category === "Google" && "Calendar sync for booking events."}
              {category === "Email" && "Transactional email notifications via Resend."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {configs.map((config, i) => (
              <div key={config.key}>
                {i > 0 && <Separator className="mb-6" />}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={config.key} className="font-medium">
                      {config.label}
                    </Label>
                    {config.required && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        Required
                      </Badge>
                    )}
                    {!config.required && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Optional
                      </Badge>
                    )}
                    {values[config.key] && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {config.description}
                  </p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id={config.key}
                        type={visibleKeys.has(config.key) ? "text" : "password"}
                        value={values[config.key] || ""}
                        onChange={(e) => updateValue(config.key, e.target.value)}
                        placeholder={config.placeholder}
                        className="pr-10 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => toggleVisibility(config.key)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {visibleKeys.has(config.key) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <a
                    href={config.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {config.docsLabel}
                  </a>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {message && (
        <div
          className={`flex items-center gap-2 rounded-md p-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={saving}
        className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
      >
        {saving ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
        ) : (
          <><Save className="mr-2 h-4 w-4" /> Save All Keys</>
        )}
      </Button>
    </div>
  );
}
