import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, getStripePrices } from "@/lib/stripe/client";
import { getOrCreateCustomer } from "@/lib/stripe/customers";

/**
 * POST /api/stripe/checkout
 * Create a Stripe Checkout session for plan subscription.
 *
 * Body: { plan: "monthly" | "annual" }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plan } = body;

    if (!plan || !["monthly", "annual"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan. Choose 'monthly' or 'annual'." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    const prices = await getStripePrices();
    const priceId = prices[plan as keyof typeof prices];
    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe price not configured for this plan. Complete the Setup Wizard first." },
        { status: 500 }
      );
    }

    const customerId = await getOrCreateCustomer(user.id, profile.email, profile.full_name);
    const stripe = getStripe();

    const { origin } = new URL(request.url);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/billing?success=true`,
      cancel_url: `${origin}/dashboard/billing?cancelled=true`,
      metadata: {
        blitzquote_profile_id: user.id,
        plan,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[Stripe Checkout] Error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 }
    );
  }
}
