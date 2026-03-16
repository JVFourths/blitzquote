"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  CreditCard,
  Receipt,
  CheckCircle2,
  ArrowUpRight,
  XCircle,
} from "lucide-react";

interface BillingEvent {
  id: string;
  event_type: string;
  amount_pence: number;
  description: string | null;
  created_at: string;
}

const PLAN_DETAILS: Record<
  string,
  { name: string; price: string; description: string }
> = {
  pay_per_booking: {
    name: "Pay Per Booking",
    price: "£1 per booking",
    description: "You only pay when an AI agent books a job for you.",
  },
  monthly: {
    name: "Monthly",
    price: "£5 / month",
    description: "Unlimited bookings with priority listing.",
  },
  annual: {
    name: "Annual",
    price: "£50 / year",
    description: "Best value — save over 15% vs monthly.",
  },
  investor: {
    name: "Founding Investor",
    price: "£1,500 one-time",
    description: "Lifetime access with all perks.",
  },
};

export default function BillingPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <BillingPage />
    </Suspense>
  );
}

function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState("pay_per_booking");
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false);
  const [events, setEvents] = useState<BillingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const showSuccess = searchParams.get("success") === "true";
  const showCancelled = searchParams.get("cancelled") === "true";

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_plan, stripe_customer_id")
        .eq("id", user.id)
        .single();

      if (profile) {
        setPlan(profile.subscription_plan);
        setHasStripeCustomer(!!profile.stripe_customer_id);
      }

      const { data: billingEvents } = await supabase
        .from("billing_events")
        .select("id, event_type, amount_pence, description, created_at")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (billingEvents) setEvents(billingEvents as BillingEvent[]);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleUpgrade(targetPlan: string) {
    setUpgrading(targetPlan);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start checkout.");
        setUpgrading(null);
      }
    } catch {
      alert("Something went wrong. Please try again.");
      setUpgrading(null);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);

    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to open billing portal.");
        setPortalLoading(false);
      }
    } catch {
      alert("Something went wrong. Please try again.");
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const planInfo = PLAN_DETAILS[plan] ?? PLAN_DETAILS.pay_per_booking;
  const totalSpent = events.reduce((sum, e) => sum + e.amount_pence, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your plan, view invoices, and update payment methods.
        </p>
      </div>

      {/* Success/cancelled banners */}
      {showSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Subscription activated!</p>
            <p>Your plan has been upgraded. Enjoy unlimited AI-powered bookings.</p>
          </div>
        </div>
      )}
      {showCancelled && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <XCircle className="h-5 w-5 shrink-0" />
          <p>Checkout was cancelled. Your plan has not been changed.</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current plan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Plan
              </CardTitle>
              <Badge className="bg-amber-500 text-white">{planInfo.name}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-2xl font-bold">{planInfo.price}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {planInfo.description}
              </p>
            </div>

            {hasStripeCustomer && (
              <Button
                variant="outline"
                onClick={handleManageBilling}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                )}
                Manage Billing
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Total spent */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Total Spent
            </CardTitle>
            <CardDescription>All time billing total</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              £{(totalSpent / 100).toFixed(2)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {events.length} transaction{events.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade options */}
      {(plan === "pay_per_booking" || plan === "monthly") && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Your Plan</CardTitle>
            <CardDescription>
              Get unlimited bookings and priority listing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {plan === "pay_per_booking" && (
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold">Monthly</h3>
                  <p className="text-2xl font-bold">£5<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Unlimited bookings + priority listing
                  </p>
                  <Button
                    className="mt-4 w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
                    onClick={() => handleUpgrade("monthly")}
                    disabled={upgrading === "monthly"}
                  >
                    {upgrading === "monthly" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Upgrade to Monthly
                  </Button>
                </div>
              )}
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Annual</h3>
                  <Badge variant="secondary" className="text-xs">Save 15%+</Badge>
                </div>
                <p className="text-2xl font-bold">£50<span className="text-sm font-normal text-muted-foreground">/yr</span></p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Everything in Monthly + 2 months free
                </p>
                <Button
                  className="mt-4 w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
                  onClick={() => handleUpgrade("annual")}
                  disabled={upgrading === "annual"}
                >
                  {upgrading === "annual" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Upgrade to Annual
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing history */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No billing events yet.
            </p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {event.event_type.replace(/_/g, " ")}
                    </p>
                    {event.description && (
                      <p className="text-xs text-muted-foreground">
                        {event.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <p className="font-medium">
                    £{(event.amount_pence / 100).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
