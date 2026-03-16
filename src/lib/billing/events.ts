import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Record a billing event for a pay-per-booking charge.
 * Called when a booking is created for a tradesperson on the pay_per_booking plan.
 *
 * Records to both the local billing_events table and (when configured)
 * reports metered usage to Stripe.
 */
export async function recordBookingCharge(
  profileId: string,
  bookingId: string
): Promise<void> {
  const supabase = getServiceClient();

  // Check tradesperson's plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_plan, stripe_customer_id")
    .eq("id", profileId)
    .single();

  if (!profile || profile.subscription_plan !== "pay_per_booking") {
    return; // No charge for subscription plans
  }

  // Record in local billing_events table
  const { error } = await supabase.from("billing_events").insert({
    profile_id: profileId,
    booking_id: bookingId,
    event_type: "booking_charge",
    amount_pence: 100, // £1 per booking
    currency: "gbp",
    description: `Pay-per-booking charge for booking ${bookingId}`,
  });

  if (error) {
    console.error("[Billing] Failed to record booking charge:", error);
    return;
  }

  console.log(
    `[Billing] Recorded £1.00 charge for profile ${profileId}, booking ${bookingId}`
  );

  // Report to Stripe metered usage if customer exists
  if (profile.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const { getStripe } = await import("@/lib/stripe/client");
      const stripe = getStripe();

      // Create an invoice item for the per-booking charge
      await stripe.invoiceItems.create({
        customer: profile.stripe_customer_id,
        amount: 100, // £1.00 in pence
        currency: "gbp",
        description: `BlitzQuote booking charge (${bookingId.slice(0, 8)})`,
      });

      console.log(`[Billing] Stripe invoice item created for customer ${profile.stripe_customer_id}`);
    } catch (err) {
      console.error("[Billing] Failed to create Stripe invoice item:", err);
    }
  }
}
