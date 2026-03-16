import { NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const ENV_PATH = join(process.cwd(), ".env.local");

// Keys that are safe to manage via the admin panel
const MANAGED_KEYS = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_MONTHLY",
  "STRIPE_PRICE_ANNUAL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "RESEND_API_KEY",
  "FROM_EMAIL",
  "POSTCODES_IO_URL",
]);

function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function buildEnvFile(keys: Record<string, string>): string {
  const sections: Record<string, string[]> = {
    Supabase: [],
    Stripe: [],
    Google: [],
    Email: [],
    Other: [],
  };

  const keyCategories: Record<string, string> = {
    NEXT_PUBLIC_SUPABASE_URL: "Supabase",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "Supabase",
    SUPABASE_SERVICE_ROLE_KEY: "Supabase",
    STRIPE_SECRET_KEY: "Stripe",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "Stripe",
    STRIPE_WEBHOOK_SECRET: "Stripe",
    STRIPE_PRICE_MONTHLY: "Stripe",
    STRIPE_PRICE_ANNUAL: "Stripe",
    GOOGLE_CLIENT_ID: "Google",
    GOOGLE_CLIENT_SECRET: "Google",
    RESEND_API_KEY: "Email",
    FROM_EMAIL: "Email",
    POSTCODES_IO_URL: "Other",
  };

  for (const [key, value] of Object.entries(keys)) {
    if (!value) continue;
    const category = keyCategories[key] || "Other";
    // Quote values that contain spaces
    const formatted = value.includes(" ") ? `${key}="${value}"` : `${key}=${value}`;
    sections[category].push(formatted);
  }

  const lines: string[] = [];
  for (const [category, entries] of Object.entries(sections)) {
    if (entries.length === 0) continue;
    lines.push(`# ${category}`);
    lines.push(...entries);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * GET /api/admin/env
 * Read current env keys (values masked for non-public keys).
 */
export async function GET() {
  try {
    const content = await readFile(ENV_PATH, "utf-8");
    const parsed = parseEnvFile(content);

    // Only return managed keys, mask sensitive values
    const keys: Record<string, string> = {};
    for (const key of MANAGED_KEYS) {
      if (parsed[key]) {
        // Show full value for public keys and non-secret values
        if (key.startsWith("NEXT_PUBLIC_") || key === "FROM_EMAIL" || key === "POSTCODES_IO_URL") {
          keys[key] = parsed[key];
        } else {
          // Show first 8 chars + masked rest for secret keys
          const val = parsed[key];
          keys[key] = val.length > 12
            ? val.slice(0, 8) + "•".repeat(Math.min(val.length - 8, 20))
            : "•".repeat(val.length);
        }
      }
    }

    return NextResponse.json({ keys });
  } catch {
    // File doesn't exist yet
    return NextResponse.json({ keys: {} });
  }
}

/**
 * PUT /api/admin/env
 * Write env keys to .env.local file.
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { keys } = body;

    if (!keys || typeof keys !== "object") {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    // Read existing file to preserve any unmanaged keys
    let existing: Record<string, string> = {};
    try {
      const content = await readFile(ENV_PATH, "utf-8");
      existing = parseEnvFile(content);
    } catch {
      // File doesn't exist yet — that's fine
    }

    // Update only managed keys, preserve others
    const updated = { ...existing };
    for (const [key, value] of Object.entries(keys)) {
      if (!MANAGED_KEYS.has(key)) continue;
      const val = value as string;
      // Skip masked values (haven't been changed)
      if (val.includes("•")) continue;
      if (val) {
        updated[key] = val;
      } else {
        delete updated[key];
      }
    }

    const envContent = buildEnvFile(updated);
    await writeFile(ENV_PATH, envContent, "utf-8");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Admin Env] Error saving:", err);
    return NextResponse.json({ error: "Failed to save keys." }, { status: 500 });
  }
}
