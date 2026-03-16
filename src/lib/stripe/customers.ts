import { createClient } from "@supabase/supabase-js";
import { getStripe } from "./client";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Get or create a Stripe customer for a tradesperson.
 */
export async function getOrCreateCustomer(
  profileId: string,
  email: string,
  name: string
): Promise<string> {
  const supabase = getServiceClient();

  // Check if customer already exists
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", profileId)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  // Create new Stripe customer
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      blitzquote_profile_id: profileId,
    },
  });

  // Store customer ID
  await supabase
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", profileId);

  return customer.id;
}
