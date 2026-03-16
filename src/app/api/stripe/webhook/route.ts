import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or webhook secret." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const supabase = getServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const profileId = session.metadata?.blitzquote_profile_id;
        const plan = session.metadata?.plan;

        if (profileId && plan) {
          await supabase
            .from("profiles")
            .update({
              subscription_plan: plan,
              stripe_customer_id: session.customer as string,
            })
            .eq("id", profileId);

          // Record billing event
          const amount = plan === "monthly" ? 500 : plan === "annual" ? 5000 : 0;
          if (amount > 0) {
            await supabase.from("billing_events").insert({
              profile_id: profileId,
              event_type: "subscription_payment",
              amount_pence: amount,
              currency: "gbp",
              stripe_event_id: event.id,
              description: `${plan} subscription activated`,
            });
          }

          console.log(`[Stripe Webhook] Profile ${profileId} upgraded to ${plan}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find profile by Stripe customer ID
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          if (subscription.status === "active") {
            // Subscription is active — plan is already set from checkout
            console.log(`[Stripe Webhook] Subscription active for profile ${profile.id}`);
          } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
            // Downgrade to pay-per-booking
            await supabase
              .from("profiles")
              .update({ subscription_plan: "pay_per_booking" })
              .eq("id", profile.id);

            console.log(`[Stripe Webhook] Profile ${profile.id} downgraded to pay_per_booking`);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          await supabase
            .from("profiles")
            .update({ subscription_plan: "pay_per_booking" })
            .eq("id", profile.id);

          console.log(`[Stripe Webhook] Subscription deleted — profile ${profile.id} downgraded`);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile && invoice.amount_paid > 0) {
          await supabase.from("billing_events").insert({
            profile_id: profile.id,
            event_type: "subscription_payment",
            amount_pence: invoice.amount_paid,
            currency: invoice.currency,
            stripe_event_id: event.id,
            description: `Invoice payment: ${invoice.number || event.id}`,
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, email")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          console.error(`[Stripe Webhook] Payment failed for profile ${profile.id} (${profile.email})`);
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, err);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
