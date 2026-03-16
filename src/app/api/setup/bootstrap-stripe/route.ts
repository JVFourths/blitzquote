import { NextResponse } from "next/server";
import { isSetupComplete, getServiceClient, markStepComplete } from "@/lib/setup/guard";
import Stripe from "stripe";

/**
 * POST /api/setup/bootstrap-stripe
 * Creates Monthly + Annual subscription products in Stripe.
 * Stores generated price IDs in app_config table.
 * Idempotent — checks for existing products before creating.
 *
 * Body: { stripe_secret_key: string, supabase_url: string, supabase_service_key: string }
 */
export async function POST(request: Request) {
  if (await isSetupComplete()) {
    return NextResponse.json({ error: "Setup is already complete." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { stripe_secret_key, supabase_url, supabase_service_key } = body;

    if (!stripe_secret_key || !supabase_url || !supabase_service_key) {
      return NextResponse.json(
        { error: "Missing required keys: stripe_secret_key, supabase_url, supabase_service_key" },
        { status: 400 }
      );
    }

    const stripe = new Stripe(stripe_secret_key);
    const supabase = getServiceClient(supabase_url, supabase_service_key);

    // Check for existing BlitzQuote products (idempotent)
    const existingProducts = await stripe.products.search({
      query: "metadata['blitzquote']:'true'",
    });

    let monthlyPriceId: string;
    let annualPriceId: string;

    if (existingProducts.data.length > 0) {
      // Products exist — fetch their prices
      const prices = await stripe.prices.list({ limit: 10, active: true });
      const monthlyPrice = prices.data.find(
        (p) => p.recurring?.interval === "month" && p.unit_amount === 500 && p.currency === "gbp"
      );
      const annualPrice = prices.data.find(
        (p) => p.recurring?.interval === "year" && p.unit_amount === 5000 && p.currency === "gbp"
      );

      monthlyPriceId = monthlyPrice?.id || "";
      annualPriceId = annualPrice?.id || "";

      if (!monthlyPriceId || !annualPriceId) {
        // Products exist but prices are missing/different — create them
        const product = existingProducts.data[0];

        if (!monthlyPriceId) {
          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: 500,
            currency: "gbp",
            recurring: { interval: "month" },
          });
          monthlyPriceId = price.id;
        }

        if (!annualPriceId) {
          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: 5000,
            currency: "gbp",
            recurring: { interval: "year" },
          });
          annualPriceId = price.id;
        }
      }
    } else {
      // Create the product
      const product = await stripe.products.create({
        name: "BlitzQuote Subscription",
        description: "AI-powered tradesperson booking platform subscription",
        metadata: { blitzquote: "true" },
      });

      // Create monthly price (£5/month)
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: 500,
        currency: "gbp",
        recurring: { interval: "month" },
        metadata: { plan: "monthly" },
      });

      // Create annual price (£50/year)
      const annualPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: 5000,
        currency: "gbp",
        recurring: { interval: "year" },
        metadata: { plan: "annual" },
      });

      monthlyPriceId = monthlyPrice.id;
      annualPriceId = annualPrice.id;
    }

    // Store price IDs in app_config
    await supabase.from("app_config").upsert([
      { key: "STRIPE_PRICE_MONTHLY", value: monthlyPriceId, updated_at: new Date().toISOString() },
      { key: "STRIPE_PRICE_ANNUAL", value: annualPriceId, updated_at: new Date().toISOString() },
    ]);

    // Mark step complete
    await markStepComplete(supabase_url, supabase_service_key, 2, 7, {
      monthly_price_id: monthlyPriceId,
      annual_price_id: annualPriceId,
    });

    const isTest = stripe_secret_key.startsWith("sk_test_");

    return NextResponse.json({
      success: true,
      message: `Created your pricing plans${isTest ? " (test mode)" : ""}:`,
      plans: [
        { name: "Monthly", price: "£5/month", price_id: monthlyPriceId },
        { name: "Annual", price: "£50/year", price_id: annualPriceId },
      ],
      note: "Pay Per Booking (£1 each) works automatically — no Stripe product needed. You can change prices later in Stripe's dashboard.",
    });
  } catch (err) {
    console.error("[Bootstrap Stripe] Error:", err);
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create Stripe products.", details: errorMsg },
      { status: 500 }
    );
  }
}
