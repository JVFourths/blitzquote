import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarCheck, ClipboardList, PoundSterling } from "lucide-react";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const supabase = getClient();

  const [
    { count: totalTradespeople },
    { count: activeTradespeople },
    { count: totalBookings },
    { count: pendingBookings },
    { count: waitlistCount },
    { data: revenueData },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("bookings").select("*", { count: "exact", head: true }),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("waitlist").select("*", { count: "exact", head: true }),
    supabase.from("billing_events").select("amount_pence"),
  ]);

  const totalRevenuePence = (revenueData || []).reduce(
    (sum, e) => sum + (e.amount_pence || 0),
    0
  );

  const stats = [
    {
      title: "Total Tradespeople",
      value: totalTradespeople ?? 0,
      sub: `${activeTradespeople ?? 0} active`,
      icon: Users,
    },
    {
      title: "Total Bookings",
      value: totalBookings ?? 0,
      sub: `${pendingBookings ?? 0} pending`,
      icon: CalendarCheck,
    },
    {
      title: "Waitlist Signups",
      value: waitlistCount ?? 0,
      sub: "Pre-launch interest",
      icon: ClipboardList,
    },
    {
      title: "Total Revenue",
      value: `£${(totalRevenuePence / 100).toFixed(2)}`,
      sub: "All time",
      icon: PoundSterling,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          BlitzQuote platform overview.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
