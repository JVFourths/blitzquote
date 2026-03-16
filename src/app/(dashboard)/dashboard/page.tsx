import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarCheck,
  Clock,
  TrendingUp,
  Zap,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");
  if (!profile.is_onboarded) redirect("/onboarding");

  // Fetch booking stats
  const { count: totalBookings } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id);

  const { count: pendingBookings } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("status", "pending");

  const { count: completedBookings } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("status", "completed");

  // Fetch recent bookings
  const { data: recentBookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const stats = [
    {
      title: "Total Bookings",
      value: totalBookings ?? 0,
      icon: CalendarCheck,
      description: "All time",
    },
    {
      title: "Pending",
      value: pendingBookings ?? 0,
      icon: Clock,
      description: "Awaiting confirmation",
    },
    {
      title: "Completed",
      value: completedBookings ?? 0,
      icon: TrendingUp,
      description: "Successfully completed",
    },
    {
      title: "Plan",
      value: profile.subscription_plan.replace(/_/g, " "),
      icon: Zap,
      description: "Current plan",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {profile.full_name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s what&apos;s happening with your BlitzQuote profile.
        </p>
      </div>

      {/* Stats grid */}
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
              <p className="text-2xl font-bold capitalize">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentBookings || recentBookings.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <CalendarCheck className="mx-auto mb-3 h-8 w-8" />
              <p>No bookings yet.</p>
              <p className="mt-1 text-sm">
                Once AI agents start discovering your profile, bookings will
                appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{booking.customer_name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {booking.job_description}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(booking.slot_start).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" via "}
                      <span className="capitalize">{booking.source}</span>
                    </p>
                  </div>
                  <Badge
                    variant={
                      booking.status === "confirmed"
                        ? "default"
                        : booking.status === "pending"
                          ? "secondary"
                          : booking.status === "completed"
                            ? "outline"
                            : "destructive"
                    }
                  >
                    {booking.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
