import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      typescript: true,
    });
  }
  return stripeInstance;
}

/**
 * Price IDs — reads from env vars first, falls back to app_config table.
 * The setup wizard stores generated price IDs in app_config automatically.
 */
export const STRIPE_PRICES = {
  pay_per_booking: null, // No subscription — metered usage
  monthly: process.env.STRIPE_PRICE_MONTHLY || null,
  annual: process.env.STRIPE_PRICE_ANNUAL || null,
  investor: null, // Handled manually
} as const;

/**
 * Get Stripe price IDs from app_config table (fallback to env vars).
 * Used by checkout route when env vars aren't set (wizard stored them in DB).
 */
export async function getStripePrices(): Promise<{ monthly: string | null; annual: string | null }> {
  // Try env vars first (backwards compatible)
  if (process.env.STRIPE_PRICE_MONTHLY && process.env.STRIPE_PRICE_ANNUAL) {
    return {
      monthly: process.env.STRIPE_PRICE_MONTHLY,
      annual: process.env.STRIPE_PRICE_ANNUAL,
    };
  }

  // Fallback: read from app_config table
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { monthly: null, annual: null };
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data } = await supabase
      .from("app_config")
      .select("key, value")
      .in("key", ["STRIPE_PRICE_MONTHLY", "STRIPE_PRICE_ANNUAL"]);

    const config = Object.fromEntries((data || []).map((r: { key: string; value: string }) => [r.key, r.value]));
    return {
      monthly: config.STRIPE_PRICE_MONTHLY || null,
      annual: config.STRIPE_PRICE_ANNUAL || null,
    };
  } catch {
    return { monthly: null, annual: null };
  }
}

export const PLAN_AMOUNTS_PENCE = {
  pay_per_booking: 100,  // £1 per booking
  monthly: 500,          // £5/month
  annual: 5000,          // £50/year
  investor: 150000,      // £1,500 one-time
} as const;
