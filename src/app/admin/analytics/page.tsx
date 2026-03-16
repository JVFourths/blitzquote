import { createClient } from "@supabase/supabase-js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const supabase = getClient();

  // Booking sources breakdown
  const { data: bookings } = await supabase
    .from("bookings")
    .select("source, status, created_at");

  const sourceBreakdown: Record<string, number> = {};
  const statusBreakdown: Record<string, number> = {};
  const bookingsByMonth: Record<string, number> = {};

  (bookings || []).forEach((b) => {
    // Source
    sourceBreakdown[b.source] = (sourceBreakdown[b.source] || 0) + 1;
    // Status
    statusBreakdown[b.status] = (statusBreakdown[b.status] || 0) + 1;
    // Monthly
    const month = new Date(b.created_at).toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    });
    bookingsByMonth[month] = (bookingsByMonth[month] || 0) + 1;
  });

  // Plan breakdown
  const { data: profiles } = await supabase
    .from("profiles")
    .select("subscription_plan");

  const planBreakdown: Record<string, number> = {};
  (profiles || []).forEach((p) => {
    planBreakdown[p.subscription_plan] =
      (planBreakdown[p.subscription_plan] || 0) + 1;
  });

  // Waitlist signups over time
  const { data: waitlist } = await supabase
    .from("waitlist")
    .select("created_at");

  const waitlistByMonth: Record<string, number> = {};
  (waitlist || []).forEach((w) => {
    const month = new Date(w.created_at).toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    });
    waitlistByMonth[month] = (waitlistByMonth[month] || 0) + 1;
  });

  // Revenue
  const { data: billing } = await supabase
    .from("billing_events")
    .select("amount_pence, created_at");

  const revenueByMonth: Record<string, number> = {};
  (billing || []).forEach((b) => {
    const month = new Date(b.created_at).toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    });
    revenueByMonth[month] = (revenueByMonth[month] || 0) + b.amount_pence;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Platform metrics and breakdowns.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Booking Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(sourceBreakdown).length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookings yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(sourceBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{source}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 rounded-full bg-amber-500" style={{ width: `${Math.max(20, (count / (bookings?.length || 1)) * 200)}px` }} />
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking Status */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Status</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(statusBreakdown).length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookings yet.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {Object.entries(statusBreakdown).map(([status, count]) => (
                  <div key={status} className="rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold">{count}</p>
                    <Badge
                      variant={
                        status === "confirmed"
                          ? "default"
                          : status === "pending"
                            ? "secondary"
                            : status === "completed"
                              ? "outline"
                              : "destructive"
                      }
                      className="mt-1"
                    >
                      {status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(planBreakdown).length === 0 ? (
              <p className="text-sm text-muted-foreground">No users yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(planBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([plan, count]) => (
                    <div key={plan} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {plan.replace(/_/g, " ")}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 rounded-full bg-orange-500" style={{ width: `${Math.max(20, (count / (profiles?.length || 1)) * 200)}px` }} />
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Signups Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Waitlist Signups Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(waitlistByMonth).length === 0 ? (
              <p className="text-sm text-muted-foreground">No signups yet.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(waitlistByMonth).map(([month, count]) => (
                  <div key={month} className="flex items-center justify-between">
                    <span className="text-sm">{month}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded-full bg-amber-400" style={{ width: `${Math.max(20, count * 10)}px` }} />
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Over Time */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(revenueByMonth).length === 0 ? (
              <p className="text-sm text-muted-foreground">No revenue yet.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(revenueByMonth).map(([month, pence]) => (
                  <div key={month} className="flex items-center justify-between">
                    <span className="text-sm">{month}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded-full bg-green-500" style={{ width: `${Math.max(20, (pence / 100) * 5)}px` }} />
                      <span className="text-sm font-medium">£{(pence / 100).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
